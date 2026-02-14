# MediaPlayer 文档

本目录用于维护 MediaPlayer 当前版本的需求、架构、交互与工程约束。

## 核心文档（SSOT）

- `requirements-v1.md`：需求范围与行为边界。
- `architecture-v1.md`：运行时架构、模块边界、数据流。
- `interaction-v1.md`：界面结构、交互规则、快捷键行为。
- `backend-integration-guardrails.md`：后端接入强约束与门禁。
- `开发启动清单.md`：跨机器拉取后的一次性启动流程。

## 质量与稳定性

- `stability-note-2026-02-12-sidebar-switch-crash.md`：Sidebar 高频切换稳定性问题与修复记录。
- `project-evaluation-report-v3.md`：项目评估（当前保留版本）。

## 主题与 UI

- `ui/theme-system-v2.md`：主题系统 V2 规范（主文档）。
- `ui/theme-system-v1.md`：主题系统 V1 历史文档（仅追溯）。
- `ui/instruction.md`：主题/样式开发说明。
- `ui/theme-playground.html`：主题调试页。
- `ui/theme-mock.html`：主题要素预览页。
- `ui/startup-splash-mock.html`：启动页可视化调参 mock（由 `npm run mock:splash` 生成）。

## 性能文档

- `perf/2026-02-07-scan-benchmark.md`：扫描/重处理基准报告。
- `perf/2026-02-08-ui-perf-benchmark-plan.md`：UI 性能测试方案与指标口径。
- `perf/2026-02-08-streaming-ingest-benchmark-plan.md`：流式导入性能测试方案。

## 当前状态

- 历史空间漫游功能及相关设置项已从产品与实现中移除。
- 设置面板当前仅保留界面、AI 模型、数据库、快捷键分组。
- 音乐模式可视化已接入（Shadertoy `McsSzB`），支持 GPU/CPU 双后端、全屏显示与 FPS 调试信息。
- 文档目录已清理历史空间漫游方案、过期评估与已完成实施计划。

## 待办

1. 视频元数据获取实施：按 `docs/ref/video-metadata-scraper/` 参考文档落地抓取流程、字段映射与数据入库链路。

## 文档维护约定

- 需求变化：同步更新 `requirements-v1.md`。
- 架构变化：同步更新 `architecture-v1.md`。
- 交互变化：同步更新 `interaction-v1.md`。
- 后端链路变化：同步更新 `backend-integration-guardrails.md`。
- 代码与文档不一致时，以当前代码行为为准，文档需在同一迭代内修正。
