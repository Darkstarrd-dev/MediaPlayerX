# MediaPlayerX

本仓库用于开发本地优先的综合媒体浏览器（图片 + 视频）。

当前阶段：**Electron 实用化阶段（向量检索/特征检索除外）**。

- 已接入真实文件系统扫描、SQLite 持久化、媒体协议白名单与导入任务队列。
- 向量检索与特征检索仍保留为后续能力，不计入当前可用集。

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

## 运行测试

```bash
npm run test
```

## 文档入口

- `docs/README.md`
- `docs/requirements-v1.md`
- `docs/architecture-v1.md`
- `docs/interaction-v1.md`
- `docs/vector-retrieval-plan-v1.md`
- `docs/ref/虚拟UI阶段说明.md`（历史参考）
- `docs/ui/theme-playground.html`（主题开发调试页）
- `docs/project-evaluation-report.md`（项目评估报告·初版）
- `docs/project-evaluation-report-v2.md`（项目评估报告·整改后第二版）

文档为当前阶段单一事实源（SSOT）。

## 计划待办

- [x] 拆分 `useAppDisplayAndEffects`（477 行）为 2-3 个职责更明确的子 hook
- [x] 为非显而易见的设计决策补充 why 注释（归档规范化策略、Token TTL 取值、安全守卫白名单规则等）
- [x] 为各特性模块添加 barrel export（`index.ts`）
- [ ] 重命名 `ReadonlyMediaRepository` 或拆分为独立的读/写接口

> 以上待办事项来源于项目评估报告，详见 `docs/project-evaluation-report-v2.md` 第 8 节。
