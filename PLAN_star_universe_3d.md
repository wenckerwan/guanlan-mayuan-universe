# 知识星球 3D 升级方案（Three.js 真 3D，对标单词宇宙）

> 日期：2026-10-03 ｜ 状态：用户已选定方案 B（Three.js 真 3D），本文档为施工依据。
> 参考站：`https://www.worduniverse.net/?ui=standard`（用户提供截图）。
> 涉及代码：`v2/apps/web/app/components/`（新增）、`v2/apps/web/app/app.vue`（view = `stars`）、`v2/apps/web/package.json`（加依赖）。
> 前置方案：`PLAN_star_universe_visual.md`（方案 A 纯 SVG/CSS，本文档在其 §三选定 B 后展开）。

## 一、目标与决策确认

把 view = `stars` 升级为 **Three.js 渲染的真 3D 宇宙**：深空星云、可拖转的 3D 球体星球、环绕卫星概念、自由旋转/缩放/飞行聚焦，对标 worduniverse 的沉浸感。

**已定决策（不得变更）**：
- 技术路线 = **Three.js 真 3D**（用户明确选定，放弃方案 A 纯 SVG 与方案 C Canvas）。
- **只升级 view = `stars` 一个视图**；view = `map`（现有 SVG 知识地图）保持不变，作为结构化对照视图与 3D 不可用时的**降级**。
- 数据模型、学习记录、`GUANLAN_TASKS.md` 观澜融入逻辑**零改动**。
- 3D 是增强层：知识数据（7 模块/101 概念/126 关系）与 mastery 状态来自现有 `content` / `state`，只读不写。

## 二、技术选型与依赖

| 项 | 选择 | 理由 |
|---|---|---|
| 渲染库 | `three`（npm，最新稳定） | 唯一新增运行时依赖 |
| 集成方式 | Nuxt **客户端组件**（`<ClientOnly>` 包裹） | 项目 `ssr:false`，Three 依赖 DOM/WebGL，必须客户端挂载 |
| 交互 | Three `OrbitControls`（旋转/缩放/阻尼） | 官方 addons，免自写拖转 |
| 文字标签 | CSS2DRenderer（HTML 标签投影到 3D 坐标） | 文字可选中/可访问，优于 Canvas 贴图文字 |
| 星云/辉光 | 大球体内表面贴渐变纹理 + 少量 Sprite 光点 + UnrealBloom（可选后期） | 见 §四性能取舍 |

**依赖变更**：`v2/apps/web/package.json` dependencies 增加 `"three": "^0.1xx"`；无需 `three/examples` 额外包（addons 内含 OrbitControls/CSS2DRenderer/UnrealBloom）。`npm install` 后 `npm run build` 验证 bundle。

**环境要求**：浏览器支持 WebGL。启动器/文档注明 Node 22 不变（构建侧）。

## 三、架构与组件划分

```
view = 'stars'
└─ <ClientOnly>
    └─ UniverseScene.vue            新增：Three 画布容器 + 生命周期
        ├─ lib/universe/scene.mjs   新增：场景/相机/渲染器/灯光/控制器
        ├─ lib/universe/background.mjs  新增：星云球 + 星点 + （可选）Bloom
        ├─ lib/universe/planets.mjs 新增：星球/卫星/轨道/引力线 网格构建
        ├─ lib/universe/layout.mjs  新增：模块星系定位 + 概念环绕布局
        └─ lib/universe/interaction.mjs 新增：射线拾取(点选/hover)、飞行聚焦、标签渲染
```

- `UniverseScene.vue` 负责：挂载/销毁 Three、`requestAnimationFrame` 循环、把 `content/state/chapter/selected` 等 props 变化转成场景更新、把 Three 的点选/hover 事件转成与现有 `open/relation/chapter` 一致的 emit（**复用 app.vue 现有处理函数，业务逻辑零改动**）。
- `app.vue` 仅改 `stars` 分支：用 `<ClientOnly><UniverseScene .../></ClientOnly>` 替换现有 `<KnowledgeGraph ... :star="true">`，并加 WebGL 失败回退（见 §七）。
- 数据流向：`content.nodes/relations/modules` → `layout.mjs` 计算 3D 坐标 → `planets.mjs` 建网格；`state.nodes` 的 mastery → 星球亮度/标记。

## 四、视觉实现（对标参考站逐项）

| 参考站特征 | Three.js 实现 |
|---|---|
| 深空多色星云 | 一个很大的反向球（`BackSide`），内表面贴"程序生成星云纹理"（Canvas 2D 画多色径向渐变 + 噪点 → `CanvasTexture`）；或分层多个半透明 `Sprite`。粉紫/青蓝/暖金多色。 |
| 远景星点 | `Points` + `PointsMaterial`（圆点贴图），1500-3000 颗随机分布在远处球壳，2-3 层大小/亮度；近层用 `AdditiveBlending` 微闪。 |
| 中央大星球 | `SphereGeometry` + `MeshStandardMaterial`（模块色 + `roughness/metalness`），表面**程序纹理**（Canvas 画网格/经纬/噪点 → `map`），`emissiveMap` 提供自发光；叠加一层略大的 `MeshBasicMaterial`（`AdditiveBlending`、透明）做大气辉光。 |
| 环绕卫星 | 小球 `SphereGeometry`，同色系弱化材质；沿**椭圆轨道**（`EllipseCurve`）排布，可加缓慢公转（每帧更新角度）。已掌握卫星更亮/变色。 |
| 七章总览 | 7 个模块 = 7 个大星球，各用 `modules[].color`，分布在一个大圆上，相机拉远总览；点击进入该星系（镜头飞行）。 |
| 引力线/关系 | `Line`（`LineBasicMaterial`，`AdditiveBlending`）或细 `TubeGeometry` 连接两端星球，颜色取两端模块色混合；可加沿线的移动光点表示方向。 |
| 顶部胶囊条 / 底部导航 / 右下缩放 | **复用现有 HTML/Vue**（不进 Three 画布），样式对标参考站（圆角胶囊、图标按钮）。 |

**光源**：1 个主平行光（定明暗面）+ 环境光 + 各星球 `emissive` 自发光。

## 五、布局算法（`layout.mjs`）

- **星系（模块）**：7 个模块放在半径 R 的水平圆上（`i/7 * 2π`），各自成一个"星系团"。总览时相机在圆心上方俯视。
- **概念环绕**：进入某星系后，该模块的概念作为卫星，按现有 `conceptLayout` 的"双环"思路（内环 8 个半径 r1、其余外环 r2）映射到 3D 椭圆轨道（给每个卫星随机/按索引的轨道倾角与相位，避免全在同一平面显得呆板）。
- **聚焦**：选中概念 → 该球飞到视野中心，其相邻节点（现有 `focusLayout` 的邻居集合）环绕成卫星环。
- 坐标全部确定性生成（基于 id hash 或 index），保证同一内容每次渲染布局一致（便于测试与截图回归）。

## 六、交互设计

| 交互 | 实现 |
|---|---|
| 旋转 | OrbitControls 拖动（阻尼开启） |
| 缩放 | OrbitControls 滚轮/双指捏合 |
| 点选概念 | `Raycaster` 拾取星球 → emit `open`（弹出现有知识卡） |
| 点选关系 | 拾取引力线 → emit `relation` |
| 进入星系 | 总览点大星球 → emit `chapter`，相机飞行（lerp 相机位置/目标）到该星系 |
| 聚焦飞行 | 选中后相机平滑移动 + 目标点过渡（`gsap` 或自写 lerp；**为省依赖用自写 rAF 缓动**） |
| 公转 | 卫星沿轨道缓慢公转（可选，尊重减少动效） |
| 悬停 | hover 高亮 + 标签放大（Raycaster mousemove，节流） |
| 键盘/无障碍 | Three 画布外保留"列表视图"按钮（复用现有列表面板）与键盘可达的操作入口；3D 内不可达的操作用 HTML 覆盖层补齐（见 §七） |

## 七、性能、降级与无障碍（硬要求）

1. **WebGL 检测**：挂载时检测，不支持/创建失败 → 回退到现有 `<KnowledgeGraph :star="true">`（SVG star 模式保留不删），并提示"已切换为简化视图"。
2. **减少动效**：`prefers-reduced-motion` 或用户关闭 → 停公转/星云漂移/Bloom，相机不自动飞行（瞬间切换）。
3. **性能预算**：
   - 节点 101 + 关系 126，网格数量小；星球用**共享几何体/材质**（同模块同尺寸复用），卫星用 `InstancedMesh`（同模块一批实例）进一步降 draw call。
   - 纹理程序生成一次缓存复用；星云纹理 1024² 即可。
   - **Bloom 后期可选且默认关**（UnrealBloom 在低端机/移动端明显耗 GPU）；先无光晕后期，用材质自发光 + 透明壳模拟辉光，不够再开。
   - 移动端：降 `pixelRatio`（`Math.min(devicePixelRatio, 2)`）、减星点数、关 Bloom。
4. **可访问性**：CSS2DRenderer 标签是 HTML，文字可选；星球可点区大；列表视图兜底；文字对比度 ≥4.5:1；关键操作（切换章节/打开概念/读关系）都有 HTML 等价入口。
5. **内存**：组件 `unmount` 时 `renderer.dispose()`、几何体/材质 `dispose()`、移除事件监听、取消 rAF，防泄漏。
6. **bundle**：three 按需 `import { ... } from 'three'`；构建后检查 chunk，three 单独分包懒加载（`stars` 视图进入时才加载）。

## 八、开发任务拆分（按依赖排序）

| # | 任务 | 内容 | 验收 |
|---|---|---|---|
| 1 | 依赖与骨架 | 装 three；建 `UniverseScene.vue` + `scene.mjs`（渲染器/相机/灯光/OrbitControls/rAF/销毁）；WebGL 检测回退 | 黑屏深空背景渲染、可拖转缩放、`npm run build` 过 |
| 2 | 背景 | 星云球（程序纹理）+ 星点 Points | 视觉接近参考站背景氛围 |
| 3 | 布局 | `layout.mjs` 七章总览 + 单星系概念环绕坐标 | 7 色大星球就位、点进星系见概念环 |
| 4 | 星球网格 | `planets.mjs` 球体（程序纹理+自发光+辉光壳）、卫星 InstancedMesh、mastery 亮度 | 球有 3D 明暗与纹理，已掌握可辨 |
| 5 | 关系线 | 引力线 + 可选流动光点 | 概念间连线可见、可点 |
| 6 | 交互 | 射线拾取(open/relation/chapter)、相机飞行聚焦、公转 | 与现有 `open/relation/chapter` 事件打通，知识卡照常弹出 |
| 7 | 标签与 chrome | CSS2D 标签、顶部胶囊条/底部导航/右下缩放（HTML） | 对标参考站布局 |
| 8 | 性能与降级 | InstancedMesh、移动端降配、减少动效、内存释放 | 移动端流畅、降级可用 |
| 9 | 测试与文档 | 布局/拾取逻辑单测（`tests/`）、README/本方案勾验 | `npm test` 绿 |

## 九、测试策略

- **纯逻辑单测**（`v2/apps/web/tests/` 现有 node:test 模式）：`layout.mjs` 坐标确定性、七章分布、双环数量；拾取 id 映射。Three 对象用最小桩或只测纯函数部分。
- **不强制 WebGL 单测**：渲染效果靠人工截图核对（对标参考站）。
- `npm test`、`npm run build` 必须全绿；构建产物 bundle 大小记录，three 分包懒加载生效。

## 十、明确不做

- ❌ 不改 view=`map`（保留为降级与结构对照）。
- ❌ 不改知识数据/学习记录/观澜融入（`GUANLAN_TASKS.md` 全部）。
- ❌ 不引入 three 以外的重型依赖（不装 gsap/postprocessing 单包，Bloom 用 three 自带 addons）。
- ❌ 不做"星球表面真实地形物理"（只做视觉纹理）。
- ❌ 不把 3D 用于辨析/实验/回忆等其他视图（本期只做 stars）。

## 十一、验收清单

- [ ] view=`stars` 呈现深空星云 + 7 色 3D 大星球总览，可自由拖转/缩放。
- [ ] 进入星系见概念卫星环绕，点球弹出现有知识卡，点关系线弹出现有关系说明。
- [ ] 已掌握概念在 3D 中可辨（亮度/标记）。
- [ ] WebGL 不可用时自动回退 SVG star 视图并提示。
- [ ] `prefers-reduced-motion` 下公转/飞行动画静止。
- [ ] 移动端可拖转/捏合、不卡不烫（降配生效）。
- [ ] 列表视图兜底可用；关键操作键盘可达；文字可选中、对比度达标。
- [ ] three 按需分包懒加载；`npm test` 与 `npm run build` 全绿。
- [ ] 数据/记录/观澜融入逻辑零回归。

## 十二、给开发对话的一句话任务

在马原 V2 `stars` 视图中，按本方案用 Three.js 实现深空宇宙 3D 星球：新增 `UniverseScene.vue` + `lib/universe/*`（场景/背景/布局/星球/交互），7 模块为大星球、概念为环绕卫星、关系为引力线，复用现有 `content`/`state` 数据与 `open/relation/chapter` 事件，WebGL 失败回退现有 SVG star 视图，InstancedMesh + 移动端降配保性能，尊重 `prefers-reduced-motion`，`npm test` 与 `npm run build` 全绿；数据模型与观澜融入逻辑零改动。
