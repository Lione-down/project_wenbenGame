# Agnes HTTPS Proxy 部署

TapTap 只托管静态 H5。这个容器用于把现有 `/api/status`、`/api/fate`、`/api/fate/stream` 与 `/api/resolution` 部署为独立 HTTPS 服务，并在服务端保管 Agnes Secret。

## 安全边界

- `AGNES_API_KEY` 只能由部署平台的 Secret / environment variable 注入，不写进 image、源码、H5 ZIP 或浏览器请求。
- `AGNES_ALLOWED_ORIGINS` 必须填写 TapTap 实际游戏 Origin；多个 Origin 用英文逗号分隔，禁止使用 `*`。
- 对公网提供的最终地址必须是 HTTPS。开发机 loopback HTTP 只用于本地跨源 QA。
- TapTap ZIP 不包含本目录、`server.mjs`、`.env*`、测试或文档。

## 构建与配置

在项目根目录执行：

```powershell
docker build -f deploy/agnes-proxy/Dockerfile -t tianming-agnes-proxy .
```

在部署平台配置以下 environment variables / Secrets：

| 名称 | 用途 |
| --- | --- |
| `AGNES_API_KEY` | Agnes Secret，必填 |
| `AGNES_BASE_URL` | Agnes API base，默认使用项目既有地址 |
| `AGNES_ALLOWED_ORIGINS` | TapTap 实际 HTTPS Origin，精确匹配，必填 |
| `HOST` | 容器监听地址，默认 `0.0.0.0` |
| `PORT` | 容器监听端口，默认 `4173` |

部署完成后，先从允许的 Origin 检查 `GET /api/status`，再把公网 HTTPS 地址写入静态包：

```powershell
npm run package:taptap -- --api-base-url=https://your-proxy.example --build-id=release1
```

如果尚未取得真实公网 HTTPS 地址，可先省略 `--api-base-url` 生成 fail-closed 的 proxy-ready 包；它会明确使用本地命簿引擎，不会退回 TapTap 同源 `/api`，因此不会重新触发 405。
