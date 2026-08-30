# 天命之外

《天命之外》是一款移动端优先的玄幻文字人生模拟 H5 游戏。玩家以普通武者身份进入一个会自行变化的世界，经历武魂觉醒、修炼、关系、伤势、寿命与死亡。

## 运行

要求 Node.js 20.12 或更高版本，无第三方运行时依赖。

```powershell
npm start
```

浏览器打开 `http://127.0.0.1:4173`。

## 本地 Node 模式配置 Agnes 2.5 Flash

在项目根目录的 `.env.local` 中填写：

```dotenv
AGNES_API_KEY=你的真实Key
AGNES_BASE_URL=https://api.agnes-ai.cn/v1
```

服务端通过统一 `AgnesProvider` 调用 OpenAI Compatible Chat Completions endpoint `https://api.agnes-ai.cn/v1/chat/completions`，模型固定为 `agnes-2.5-flash`。活跃主线使用 `/api/agent/stream`：Decision 阶段非流式调用原生 Tools，本地 RuleEngine 验证并原子提交 GameState，Narrative 阶段以单次 JSON、`stream:false` 描写已确定事实且不携带状态修改 Tool；TapTap H5 player-key 模式显式使用 `browser.fetch`，同样保持非流式。`/api/fate*` 只保留旧客户端兼容，不是活跃 fallback。Key 只由 Node 服务或玩家本次浏览器会话读取，不会进入存档、日志或发布包；`.env.local` 已被 `.gitignore` 忽略。

配置完成后重启 `npm start`。首页右上角显示“Agnes 2.5 Flash 可用”即表示服务读取到了 Key，这只证明已配置，不等于真实 Provider 调用已经成功。

## 测试

```powershell
node --test --test-concurrency=1 tests/player-agnes-settings.test.mjs tests/player-agnes-settings-ui.test.mjs tests/root-entry.test.mjs tests/taptap-proxy-package.test.mjs
```

测试命令显式列出文件并固定使用 `--test-concurrency=1`。更大范围回归也应显式列出 test files，并遵守项目的 timeout、资源监控与进程回收规则，不要直接运行裸 `npm test`。

页面使用 `100svh` / `100dvh`、safe area 与 panel 内部滚动，覆盖常见竖屏手机和横屏。离线命簿与 Agnes 共用 `public/world-canon.mjs`，其中包含角色、势力、功法、武技与术炼传承资源。

## 存档

- 自动存档：浏览器 `localStorage`。
- 导出：游戏右上角“藏”打开命簿藏室，导出 JSON。
- 导入：在命簿藏室选择以前导出的 JSON。
- 清除：命簿藏室中的“准备重开”需要二次确认。

## Provider 边界

- 未配置 Key 时，明确运行“命簿引擎”离线事件库。
- Agnes 401/403、429、超时或无效 JSON 都会显示真实错误。
- Provider Streaming 被明确拒绝且尚未输出 token 时，服务端可回退同模型的非流式 Chat 请求；已经输出 token 后不自动重试。
- Provider 失败时不会自动换模型，也不会自动改用离线事件。玩家可手动选择“改用命簿引擎继续”。
- 自动化测试不证明 Agnes 在线调用成功；真实 Provider 验收应单独记录，真实 Key 仍只保存在未跟踪的 `.env.local`。

## TapTap H5 打包

TapTap ZIP 必须解压为一个产品文件夹，且该文件夹直接包含 `index.html`。不要直接把整个项目目录压缩；使用 manifest-driven builder 只收集浏览器 runtime：

玩家自持 Key 是当前推荐的 TapTap 方案。生成包时不会读取 `.env.local`，也不会把开发者 Key 写入源码、ZIP 或 manifest：

```powershell
npm run package:taptap -- --player-key-settings --build-id=release2
```

玩家可从首页或游戏内命簿藏室进入“Agnes 设置”。Key 默认遮蔽，未勾选“在此设备记住”时只保存在 `sessionStorage`；明确勾选后才保存到 `localStorage`。保存只代表本机已填写，连接成功必须由玩家手动点击“测试连接”确认，页面加载不会自动调用 Provider。清空会删除两处 storage，游戏存档与导出不包含 Key。

“测试连接”只验证一次最低成本 Chat Completion 是否成功到达正确模型；`max_tokens=1` 可能返回 `length` 或空正文，这不再被误报为连接失败。正式 fate/resolution 仍要求完整 Streaming 与严格游戏合同。Provider 只在边界层修复缺失 effects 为无状态效果并截断超出 UI budget 的文本，危险字段、战斗、时间、死亡连续性和未知状态仍会进入只读原文，不会直接结算。

该 Key 会从玩家浏览器直接发送到 Agnes 公网 API，不经过 TapTap 同源 `/api/*`。浏览器 storage 不是加密存储，不要在公共设备选择记住，也不要分享导出的浏览器数据。真实 Provider 验收需要玩家在运行时自行填写自己的 Key。

如果希望改用独立 HTTPS proxy，可生成既有的 offline-safe/proxy-ready 包：

```powershell
npm run package:taptap -- --offline-safe --build-id=release1
```

输出位于 `output/taptap/`，ZIP 根只有 `tianming-zhiwai/`。proxy-ready 包不配置远端 API，会明确使用离线命簿，不会向 TapTap 同源 `/api/*` 发请求。

真实 Agnes 需要先把现有 Node proxy 独立部署到公网 HTTPS，并在部署平台以 Secret 注入 `AGNES_API_KEY`，同时把 TapTap 实际 Origin 写入 `AGNES_ALLOWED_ORIGINS`。部署说明见 `deploy/agnes-proxy/README.md`。取得公网地址后重新生成 online 包：

```powershell
npm run package:taptap -- --api-base-url=https://your-proxy.example --build-id=release1
```

H5 ZIP 不包含 `.env*`、预置 Key、`server.mjs`、deploy、tests、docs 或其他源码材料。`public/index.html` 继续作为本地 Node server 入口；根 `index.html` 使用 package-relative `./public/...` 资源路径。可用以下命令验证玩家设置、入口、代理协议、CORS 和包结构：

```powershell
node --test --test-concurrency=1 tests/player-agnes-settings.test.mjs tests/player-agnes-settings-ui.test.mjs tests/root-entry.test.mjs tests/taptap-proxy-package.test.mjs
```
