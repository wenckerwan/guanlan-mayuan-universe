# 观澜适配入口（默认关闭）

独立前端不读取宿主 CSS，不根据查询参数自动启用连接。无远程请求，无真实观澜域名、账号或接口。当前只是可测试的消息协议和页面 API；真实登录及后端同步需要在观澜端适配。

## 子项目 API

```js
// 由可信初始化代码显式执行；替换为真实宿主来源。
window.MayuanApp.connectGuanlan({
  origin: 'https://guanlan.example',
  hostWindow: window.parent
});
window.MayuanApp.disconnectGuanlan();
window.MayuanApp.navigate('practice');
const snapshot = window.MayuanApp.getProgress();
```

origin 必须是精确 HTTPS origin，无路径或通配符；本机开发允许 localhost / 127.0.0.1 / [::1] 的 HTTP origin。收到的消息必须同时匹配 origin、source、channel 和 version。断开后移除监听器并停止发送。接入代码不复制观澜前端设计。

## 消息格式

```js
{ channel: 'mayuan-guanlan', version: 1, type: 'request-progress' }
{ channel: 'mayuan-guanlan', version: 1, type: 'navigate', nodeId: 'practice' }
{ channel: 'mayuan-guanlan', version: 1, type: 'import-progress', progress: snapshot }
```

宿主用明确的子项目 origin 调用 iframe.contentWindow.postMessage。子项目连接成功发送 ready（包含 app 与 capabilities）；请求进度或本地进度变更发送 progress；导入成功发送 imported，格式无效发送 error / INVALID_PROGRESS。

进度导入按版本与已知知识点校验，旧本地记录与传入记录合并；同一回答 token 去重，较新的 masteryUpdatedAt 决定自评掌握状态（答题时间单独记录）。旧v1文件缺少自评时间时迁移为0，不将答题时间当作自评时间；同时间优先保留已有自评。当前数据没有用户身份字段。真实多账号接入时应先实现按账号隔离本地存储，并在账号切换时断开旧宿主连接，再连接新上下文；当前独立版只有一个本地学习者。

如果未来以独立路由接入，观澜可调用 navigate/getProgress 并选择自己负责持久化；如果使用 iframe，须由可信子项目启动逻辑配置精确 origin。跨域宿主不能直接调用 iframe 内的 JS，需在部署配置中显式提供可信宿主来源，不能把任意 URL 参数当作授权。
