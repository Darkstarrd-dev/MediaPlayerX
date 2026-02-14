# MediaPlayerX

本仓库用于开发本地优先的综合媒体浏览器（图片 + 视频）。

当前版本：`0.66`

当前阶段：**Electron 实用化阶段**。

- 已接入真实文件系统扫描、SQLite 持久化、媒体协议白名单与导入任务队列。
- 已完成外部元数据链路：支持 nhentai/ehentai 检索、解析保存、外部元数据持久化与节点封面落盘，并在 Sidebar/主区提供节点浏览态展示。
- 已移除历史 3D 空间漫游能力与相关设置项，当前版本聚焦 2D 浏览、管理与元数据链路。

## 运行项目

```bash
npm install
npm run dev
```

## 运行桌面版（Electron）

```bash
npm run dev:desktop
```

若需要代理（如 `socks5://127.0.0.1:2080`），可在启动前设置：

```bash
MEDIA_PLAYERX_PROXY_SERVER=socks5://127.0.0.1:2080
MEDIA_PLAYERX_PROXY_BYPASS=localhost,127.0.0.1,::1
```

## 构建并启动桌面版

```bash
npm run desktop:start
```

## 启动画面可视化调参

```bash
npm run mock:splash
```

执行后会生成 `docs/ui/startup-splash-mock.html`，可直接在浏览器打开并调整启动页 token。

若需在桌面版里观察启动页完整动画，可设置最短展示时长（毫秒）：

```bash
MEDIA_PLAYERX_SPLASH_MIN_DURATION_MS=2000 npm run dev:desktop
```

## 运行测试

```bash
npm run test
```

## 文档入口

- `docs/README.md`
- `docs/requirements-v1.md`
- `docs/architecture-v1.md`
- `docs/interaction-v1.md`
- `docs/music-visualizer-shader-migration-playbook.md`
- `docs/backend-integration-guardrails.md`
- `docs/stability-note-2026-02-12-sidebar-switch-crash.md`
- `docs/project-evaluation-report-v3.md`
- `docs/perf/2026-02-07-scan-benchmark.md`
- `docs/perf/2026-02-08-ui-perf-benchmark-plan.md`
- `docs/perf/2026-02-08-streaming-ingest-benchmark-plan.md`
- `docs/ui/theme-system-v2.md`
- `docs/ui/theme-playground.html`

文档为当前阶段单一事实源（SSOT）。

## 质量基线

```bash
npm run lint
npm run test
npm run build
```
