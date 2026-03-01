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
  - 参考文档：`docs/ref/Xpanalysis.md`、`docs/16-preference-metrics-spec-v1.md`。

## 当前质量快照（v12）

- 质量门禁：`npm run lint` 0 warning，`npm run build` 通过，`npm run test:coverage` 通过。
- 结构健康：`npx madge --circular src electron` 0 循环依赖。
- 依赖风险：`npm audit --audit-level=high` 为 high/critical 0，moderate 持续跟踪。
- 详细评估见：`docs/14-project-evaluation-report-v17.md`。

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

## 性能调参

设置面板 → Performance 分页提供缩略图管线与加载性能相关参数，可根据硬件配置手动调整或使用一键预设。

### 参数说明

| 参数 | 范围 | 默认值 | 说明 |
|------|------|--------|------|
| `thumbnailAdaptiveResolution` | `true/false` | `true` | 缩略图自适应分辨率，根据视口动态选择最优尺寸 |
| `thumbnailQueueSize` | 16–256 | `64` | 缩略图生成任务队列容量，队列满时丢弃最旧任务 |
| `cpuTokenLimit` | 1–16 | `2` | 全局 CPU 密集任务并发令牌数 |
| `thumbnailGenerationConcurrency` | 1–16 | `6` | 缩略图生成并发数 |
| `thumbnailResolveConcurrency` | 1–32 | `8` | 缩略图 URL 解析并发数 |
| `thumbnailQuality` | 1–100 | `40` | 缩略图 JPEG 质量 |
| `thumbnailWarmupRadius` | 0–3 | `1` | 相邻页预热范围（0 = 关闭） |
| `thumbnailWarmupConcurrency` | 1–4 | `2` | 预热批量级别 |
| `fullscreenPrefetchRadius` | 2–12 | `6` | 全屏模式预取深度 |
| `fullscreenDecodeCacheSize` | 4–16 | `10` | 全屏解码缓存数 |

### 预设推荐值

缩略图管线组顶部提供三档预设下拉菜单，选择后一次性覆写全部参数：

| 参数 | Normal (4核/8G) | Performance (8核/16G) | Ultra (16核/32G) |
|------|:---:|:---:|:---:|
| `thumbnailAdaptiveResolution` | `true` | `true` | `true` |
| `thumbnailQueueSize` | 64 | 128 | 256 |
| `cpuTokenLimit` | 2 | 4 | 8 |
| `thumbnailGenerationConcurrency` | 4 | 8 | 12 |
| `thumbnailResolveConcurrency` | 8 | 12 | 16 |
| `thumbnailQuality` | 40 | 35 | 35 |
| `thumbnailWarmupRadius` | 1 | 1 | 2 |
| `thumbnailWarmupConcurrency` | 2 | 2 | 2 |
| `fullscreenPrefetchRadius` | 6 | 8 | 10 |
| `fullscreenDecodeCacheSize` | 10 | 12 | 16 |

## 文档入口

- `docs/01-README.md`
- `docs/02-DOCS_INDEX.md`
- `docs/03-requirements-v1.md`
- `docs/04-architecture-v1.md`
- `docs/05-interaction-v1.md`
- `docs/06-backend-integration-guardrails.md`
- `docs/07-i18n-aria-guardrails.md`
- `docs/12-music-visualizer-shader-entry.md`
- `docs/13-music-visualizer-shader-migration-playbook.md`
- `docs/08-theme-system-v2.md`
- `docs/09-theme-brainstorm-entry.md`
- `docs/10-ui_definition.md`
- `docs/11-token_design.md`
- `docs/25-windows-release-signing-runbook.md`
- `docs/27-Tips.md`
- `docs/18-offline-auto-subtitle-implementation-plan.md`
- `docs/14-project-evaluation-report-v17.md`
- `docs/16-preference-metrics-spec-v1.md`
- `docs/ref/Xpanalysis.md`
- `docs/15-dependency-risk-register.md`
- `docs/archive/README.md`
- `docs/perf/2026-02-07-scan-benchmark.md`
- `docs/perf/2026-02-08-ui-perf-benchmark-plan.md`
- `docs/perf/2026-02-08-streaming-ingest-benchmark-plan.md`
- `docs/ui/theme-playground.html`

文档为当前阶段单一事实源（SSOT）；历史资料统一归档到 `docs/archive/`。

UI 主题重构必须同时遵循两张表：

- 槽位定义：`docs/10-ui_definition.md`
- 槽位到 token 前缀映射：`docs/11-token_design.md`

当发生新增、修改、删除时，必须同步更新两张表；禁止只改代码不改表，或只改其中一张表。

Shader 与 Theme 开发请优先阅读：`docs/12-music-visualizer-shader-entry.md`、`docs/13-music-visualizer-shader-migration-playbook.md`、`docs/08-theme-system-v2.md`、`docs/09-theme-brainstorm-entry.md`。

## 质量基线

```bash
npm run format:check
npm run lint
npm run test
npm run test:coverage
npm run build
```
