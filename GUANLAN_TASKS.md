# 观澜融入开发任务书（马原知识宇宙 V2）

> 日期：2026-10-03 ｜ 状态：观澜侧契约已确认，本文档为子项目开发依据。
> 观澜工程：`D:\code_files\观澜｜考研政治知识库 - 副本\guanlan`（Nuxt 3 前端 + Hyperf 3.1/PHP 后端 + MySQL）
> 本文替代此前 `docs/guanlan-integration.md` 中"接入前确认"的开放问题；以本文为准。

## 一、架构决策（已定，不得变更）

**融入模式：同域部署 + Bearer 直通（方案 A）。**

- 马原部署在观澜同域：`https://<guanlan-domain>/mayuan/`（前端）、`https://<guanlan-domain>/api/v2/`（马原后端 API）。
- 不实现一次性授权码交接（原需求文档 §3.3 作废，由本方案替代）。不实现独立服务身份/OAuth。
- 身份验证：马原前端读观澜 Cookie `guanlan.token`，调马原 API 时放 `Authorization: Bearer <token>` 头；马原后端拿该 token **内网调用观澜 `GET /api/v1/auth/me`** 验证身份（带短 TTL 缓存，60s）。
- 用户标识：观澜 `users.id`（int）为唯一权威身份，马原侧沿用现有 `guanlan:<id>` 前缀格式。
- 收藏/笔记/学习进度：权威存储在观澜，马原前端直接调观澜 `/api/v1/study/*` 接口。
- 详细学习记录（自评/回忆/练习明细/复习计划）：权威存储在马原（保持现状）。
- 学习摘要：马原后端 outbox 推送到观澜摘要端点（见 §四）。

## 二、观澜侧已确认的接口契约

### 2.1 身份验证（已存在，可直接用）

```
GET {GUANLAN_API}/api/v1/auth/me
Authorization: Bearer <guanlan.token>
```

成功响应（`{data}` 包络，camelCase）：

```json
{ "data": { "user": {
  "id": 3, "email": "...", "displayName": "...",
  "role": "user|admin", "status": "active",
  "userGroup": "...", "features": ["..."]
} } }
```

失败：HTTP 401 `{"message":"未登录或登录已失效"}`。

**开发要求**：
- 判定无效的条件：`status !== 'active'` 或非 200。
- token 校验失败一律清马原会话并要求重新登录。
- 内网地址用环境变量 `GUANLAN_API_INTERNAL_BASE`（默认 `http://api:9501/api/v1`，容器内网），不要写死生产域名。
- 缓存 60s：同一 token 60s 内不重复调观澜；用户停用/退出的生效延迟上限即 60s，可接受。

### 2.2 收藏（观澜权威，马原直接调用）

现有接口（`{data}` 包络）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/study/favorites?targetType=mayuan_concept` | 列表，可按类型过滤 |
| POST | `/api/v1/study/favorites` | **切换语义**（重复调用会取消），重试不安全 |
| PUT | `/api/v1/study/favorites` | **幂等**（观澜将新增）：body `{targetType, targetId, title, url, favorited: bool}`，按目标状态设置，重试安全 |
| DELETE | `/api/v1/study/favorites/{id}` | 按记录 id 删除 |

**马原对象类型（观澜白名单将加入，共 4 类）**：
`mayuan_concept`、`mayuan_relation`、`mayuan_comparison`、`mayuan_experiment`

**开发要求**：
- 写收藏**一律用 PUT 幂等接口**，不用 POST 切换接口（网络重试会误取消）。
- `targetId` 用马原稳定对象 ID（节点/关系/辨析/实验的 id，不随标题变化），长度 ≤191。
- `url` 传站内路径 `/mayuan/concept/{id}`（相对路径，不带域名），观澜收藏列表用它跳转。
- `title` 传对象当前标题（≤191），仅作展示快照，不作为标识。

### 2.3 笔记（观澜权威，马原直接调用）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/study/notes?targetType=&targetId=` | 列表 |
| POST | `/api/v1/study/notes` | 新建：`{targetType, targetId, title, content}`，content ≤20000 字 |
| PATCH | `/api/v1/study/notes/{id}` | **编辑**（观澜将新增）：`{content}` |
| DELETE | `/api/v1/study/notes/{id}` | 删除 |

**开发要求**：
- 笔记类型同收藏 4 类。
- 编辑用 PATCH，不重建。本地可缓存，但观澜为权威；冲突时以观澜 updatedAt 新者为准（v1 简化：不做自动合并，编辑前重新拉取）。

### 2.4 学习摘要（马原 → 观澜推送，观澜将新建）

```
PUT {GUANLAN_API}/api/v1/integrations/mayuan/summary
Authorization: Bearer <guanlan.token>   ← 复用该用户的人态 token，非服务身份
Content-Type: application/json
```

**重要变更**：因方案 A 砍掉了服务身份，摘要推送用**该用户自己的人态 token**（outbox 事件已带 `subject: guanlan:<id>`，推送时从马原会话/安全存储取该用户 token）。观澜端点从认证上下文确定用户归属，**请求体不得携带 userId**；若观澜返回的归属与 outbox 事件 subject 不一致，观澜会拒绝。

请求体（沿用马原 `Application::save()` 已生成的 outbox payload，字段勿改）：

```json
{
  "schemaVersion": 1,
  "eventId": "mayuan:<hash>:<revision>",
  "revision": 12,
  "contentVersion": "mayuan-published-...",
  "generatedAt": "2026-10-03T08:00:00+00:00",
  "visitedConceptCount": 20,
  "selfAssessedMasteredCount": 8,
  "practiceAttemptCount": 15,
  "practiceCorrectCount": 10,
  "dueReviewCount": 4,
  "lastActivityAt": "2026-10-03T07:50:00+00:00",
  "resumeTarget": {"view": "map", "nodeId": "..."}
}
```

成功响应（观澜契约，outbox 据此标记 sent）：

```json
{ "data": { "revision": 12 } }
```

失败语义（观澜契约）：
- `401/403`：身份失效 → outbox 标记 paused，处理权限问题。
- `409`：`revision` 不比服务端新（旧版本覆盖新版本被拒绝）→ 视为 superseded，不再重试该 revision。
- `422`：字段校验失败（计数为负/正确数>作答数/revision 非 int/eventId 非法）→ 永久错误，不无限重试。
- `429`：限流 → 遵守 `Retry-After`。

**开发要求**：
- 观澜已承诺响应 `data.revision` 等于被接受的 revision；outbox 现有确认逻辑（`revision_acknowledgment_mismatch`）保持不变即可。
- 环境变量契约（观澜侧部署时提供）：
  - `GUANLAN_SUMMARY_PROTOCOL=mayuan-summary-v1`
  - `GUANLAN_SUMMARY_URL=https://<guanlan-domain>/api/v1/integrations/mayuan/summary`
  - `GUANLAN_SERVICE_TOKEN` **不再使用**（方案 A 废弃），推送改用人态 token；马原 `GuanlanAdapter::sendSummary()` 需要改造（见 §三任务 4）。
- 自评掌握数与练习正确率在观澜展示时分开标注，不得把自评包装成客观"掌握率"（观澜侧负责，马原只要保证字段语义不变）。

### 2.5 马原摘要读取（观澜将新建，用于马原前端回显/调试用）

```
GET {GUANLAN_API}/api/v1/study/mayuan/summary
Authorization: Bearer <guanlan.token>
→ { "data": { ...摘要字段, "updatedAt": "..." } }
```

马原前端可用它做"观澜已同步到第几版"的提示，不是必须。

## 三、马原侧开发内容（按依赖排序）

### 任务 1：观澜登录入口（前端）｜优先级 P0

现状：`app.vue` 只有 dev-login，无观澜登录。新增：

1. 读 Cookie `guanlan.token`（`document.cookie` 解析，同域可读）。
2. 有 token：POST `/api/v2/guanlan/validate`（已存在）→ 建立马原会话 → 加载 `/state`。
3. 无 token：显示"使用观澜账号登录"按钮，跳转 `https://<guanlan-domain>/login?redirect=/mayuan/<当前路径>`。
4. 观澜登出（token 失效）时：马原 API 返回 401 → 清会话 → 引导重新登录；保留当前未同步操作，重新登录后继续。
5. 界面明确标注当前为观澜身份（显示 displayName），开发模式的"模拟身份"标注保留且不与观澜身份混淆。

**约束**：token 不出现在 URL、页面消息、日志中。

### 任务 2：身份验证改造（后端）｜优先级 P0

`GuanlanAdapter::verifyToken()` 已基本可用，需改：

1. `GUANLAN_BASE_URL` 允许内网 HTTP（当前强制 `https://` 开头，容器内网 `http://api:9501` 会被拒）。改为：生产浏览器侧仍要求 HTTPS，但**内网 API 基址**允许 `http://`（用单独环境变量 `GUANLAN_API_INTERNAL_BASE` 区分）。
2. 加 60s 验证缓存（键 = token 的 sha256），避免每请求一次内网调用。
3. 身份映射保持 `guanlan:<id>`，role 映射 `admin→admin / 其他→learner`（现状已对）。

### 任务 3：收藏/笔记切到观澜（前端为主）｜优先级 P0

现状：收藏/笔记写在马原本地 state（`apply()` 的 `favorite`/`note` 事件）。改造：

1. 收藏/笔记操作改为**调观澜接口**（§2.2/§2.3），不再写入马原详细 state。
2. 马原 `state.favorites`/`state.notes` 保留为**展示缓存**：页面加载时从观澜 `GET /favorites?targetType=mayuan_*` 拉取填充；离线时只读。
3. 知识点下线时：观澜收藏照常展示，跳转落地马原后由马原处理"内容已调整"映射（马原前端职责）。
4. 首次接入的迁移：马原本地已有收藏/笔记 → 提供一次性导入，调观澜接口逐条写入（带确认预览），导入后清空本地并标记已迁移（防重复）。

### 任务 4：摘要推送改造（后端 outbox）｜优先级 P0

`GuanlanAdapter::sendSummary()` 当前用 `GUANLAN_SERVICE_TOKEN`。改为：

1. 推送凭证改为**该用户人态 token**：outbox 事件已含 `subject: guanlan:<id>`；需要一个安全方式让 outbox worker 拿到该用户当前有效 token。
   - 推荐做法：马原在用户会话存续期间，把 token（加密或不落日志地）存于马原服务端的会话存储；outbox 推送时按 subject 查该用户最近会话的 token。token 失效 → 观澜 401 → outbox paused，待用户下次登录后恢复。
   - **禁止**：把 token 写进 outbox payload、事件日志或备份导出。
2. `status()` 判定改为依赖 `GUANLAN_SUMMARY_PROTOCOL` + `GUANLAN_SUMMARY_URL` 已配置（不再要求 SERVICE_TOKEN）。
3. 409 响应映射为 superseded（现逻辑把 409 当永久错误 failed，需单独处理）。

### 任务 5：部署与路径（运维配合）｜优先级 P1

1. 前端 `nuxt.config.ts`：`ssr:false` 保持，`runtimeConfig.public` 增加 `guanlanBase`（观澜站点基址，用于登录跳转）。
2. `compose.yml` 并入观澜部署：马原 web/api 作为新 service 进观澜 compose；nginx 加：
   ```
   location /mayuan/ { proxy_pass http://mayuan-web:3000/; }
   location /api/v2/ { proxy_pass http://mayuan-api:9501; }
   ```
   （注意马原 API 是 `/api/v2/`，与观澜 `/api/v1/` 路径前缀不同，nginx 按前缀分流即可，不冲突。）
3. 数据库：生产用 MySQL（compose 已备），库名 `mayuan`，与观澜库同实例不同 schema。
4. 修复 compose 现有 bug：`NUXT_API_BASE` 现为 `http://api:9501`（与观澜同端口同名 service 冲突），马原 service 需改名（如 `mayuan-api`）并区分端口/内网地址。

### 任务 6：回归与联调｜优先级 P0（随各任务）

- `npm test`（后端 + HTTP 集成 + 启动器）保持全绿。
- 新增联调用例：观澜 token 有效/失效/停用三态；收藏重试不取消；笔记编辑不重复；摘要 409/429/确认版本。
- 真实双账号验证：A 看不到 B 的收藏/笔记/摘要；切账号不串数据。

## 四、不做的事（明确边界）

- ❌ 不实现授权码/OAuth/OIDC。
- ❌ 不建马原独立账号/注册/找回密码。
- ❌ 不把详细学习记录搬到观澜（只推摘要）。
- ❌ 不把原创题标为真题；马原练习记录**不写入**观澜 `/study/attempts`（避免污染真题统计，观澜已确认）。
- ❌ 不要求观澜复制马原前端视觉；马原保留独立设计。

## 五、验收清单（融入专项）

- [ ] 观澜登录用户在 `/mayuan/` 直接以其身份学习，无需二次登录。
- [ ] 无观澜 token 访问 `/mayuan/` 被引导至观澜登录，登录后回到原目标页。
- [ ] token 失效后：写操作停止并保留待同步操作，重新登录后继续。
- [ ] 收藏重试/刷新不产生意外取消；笔记编辑不产生重复记录。
- [ ] 两个观澜账号互相看不到对方收藏/笔记/摘要；切换账号数据不串。
- [ ] 摘要推送：重试不重复累计、旧 revision 不覆盖新、观澜确认版本匹配才标记 sent。
- [ ] 管理员在马原的内容管理权限由服务端按观澜 role=admin 校验，不凭前端缓存角色放行。
- [ ] V1 本地记录导入需预览确认归属，指纹去重，历史记录保留未验证标识。
- [ ] `npm test` 全绿；真实观澜环境完成双账号联调后才可宣称"已接入"。

## 六、关键文件索引（开发时对照）

| 内容 | 文件 |
|---|---|
| 身份验证适配 | `apps/api/src/GuanlanAdapter.php` |
| 路由入口 | `apps/api/src/HttpKernel.php`（`/guanlan/validate` 已存在） |
| 摘要生成 | `apps/api/src/Application.php`（`save()` 的 outbox payload） |
| 推送重试 | `apps/api/src/Outbox.php`、`apps/api/bin/outbox.php` |
| 前端登录/会话 | `apps/web/app/app.vue`（`load()`/`login()`/`api()`） |
| 部署 | `compose.yml`、`apps/web/nuxt.config.ts` |
| 观澜契约来源 | `guanlan/docs/mayuan-compatibility-requirements.md`（本文 §一已替代其 §3.3） |
