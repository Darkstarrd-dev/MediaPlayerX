# MediaPlayerX

本仓库用于开发本地优先的综合媒体浏览器（图片 + 视频）。

当前版本：`0.75`

当前阶段：**Electron 实用化 + 质量收敛阶段**。

- 已接入真实文件系统扫描、SQLite 持久化、媒体协议白名单与导入任务队列。
- 已完成外部元数据链路：支持 nhentai/ehentai 检索、解析保存、外部元数据持久化与节点封面落盘，并在 Sidebar/主区提供节点浏览态展示。
- 已移除历史 3D 空间漫游能力与相关设置项，当前版本聚焦 2D 浏览、管理与元数据链路。
- 已完成本轮 P1 质量修复：`lint` 告警清零、`madge --circular` 归零、Vite circular chunk 警告消除。

## 待执行计划

- [ ] 用户行为偏好分析（User Behavior Preference Analysis）与基于用户行为偏好的作品推荐（Behavior-Based Content Recommendation）：完成指标消费、推荐策略定义与前端推荐结果展示链路。
  - 参考文档：`docs/ref/Xpanalysis.md`、`docs/preference-metrics-spec-v1.md`。

## 当前质量快照（v12）

- 质量门禁：`npm run lint` 0 warning，`npm run build` 通过，`npm run test:coverage` 通过。
- 结构健康：`npx madge --circular src electron` 0 循环依赖。
- 依赖风险：`npm audit --audit-level=high` 为 high/critical 0，moderate 持续跟踪。
- 详细评估见：`docs/project-evaluation-report-v12.md`。

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

## 打包 Windows 安装包

```bash
# 未签名包（内测/调试）
npm run desktop:pack:unsigned

# 签名包（正式发布，需先配置证书环境变量）
npm run desktop:pack:signed
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
- `docs/DOCS_INDEX.md`
- `docs/requirements-v1.md`
- `docs/architecture-v1.md`
- `docs/interaction-v1.md`
- `docs/backend-integration-guardrails.md`
- `docs/i18n-aria-guardrails.md`
- `docs/music-visualizer-shader-entry.md`
- `docs/music-visualizer-shader-migration-playbook.md`
- `docs/theme-system-v2.md`
- `docs/theme-brainstorm-entry.md`
- `docs/ui_definition.md`
- `docs/token_design.md`
- `docs/windows-release-signing-runbook.md`
- `docs/offline-auto-subtitle-implementation-plan.md`
- `docs/project-evaluation-report-v12.md`
- `docs/preference-metrics-spec-v1.md`
- `docs/ref/Xpanalysis.md`
- `docs/dependency-risk-register.md`
- `docs/archive/README.md`
- `docs/perf/2026-02-07-scan-benchmark.md`
- `docs/perf/2026-02-08-ui-perf-benchmark-plan.md`
- `docs/perf/2026-02-08-streaming-ingest-benchmark-plan.md`
- `docs/ui/theme-playground.html`

文档为当前阶段单一事实源（SSOT）；历史资料统一归档到 `docs/archive/`。

UI 主题重构必须同时遵循两张表：

- 槽位定义：`docs/ui_definition.md`
- 槽位到 token 前缀映射：`docs/token_design.md`

当发生新增、修改、删除时，必须同步更新两张表；禁止只改代码不改表，或只改其中一张表。

Shader 与 Theme 开发请优先阅读：`docs/music-visualizer-shader-entry.md`、`docs/music-visualizer-shader-migration-playbook.md`、`docs/theme-system-v2.md`、`docs/theme-brainstorm-entry.md`。

## 质量基线

```bash
npm run format:check
npm run lint
npm run test
npm run test:coverage
npm run build
```
