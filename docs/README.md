# MediaPlayer 文档

本目录用于维护 MediaPlayer 当前版本的需求、架构、交互与工程约束。

## 核心文档（SSOT）

- `requirements-v1.md`：需求范围与行为边界。
- `architecture-v1.md`：运行时架构、模块边界、数据流。
- `interaction-v1.md`：界面结构、交互规则、快捷键行为。
- `music-visualizer-shader-migration-playbook.md`：音乐可视化 Shader 迁移流程、排障与验收清单。
- `backend-integration-guardrails.md`：后端接入强约束与门禁。
- `windows-release-signing-runbook.md`：Windows 发布签名与 CI 打包流程。
- `开发启动清单.md`：跨机器拉取后的一次性启动流程。

## 质量与稳定性

- `stability-note-2026-02-12-sidebar-switch-crash.md`：Sidebar 高频切换稳定性问题与修复记录。
- `project-evaluation-report-v6.md`：项目评估（当前保留版本）。

## 主题与 UI

- `ui/theme-system-v2.md`：主题系统 V2 规范（主文档）。
- `ui/theme-system-v1.md`：主题系统 V1 历史文档（仅追溯）。
- `ui/instruction.md`：主题/样式开发说明。
- `ui/theme-playground.html`：主题调试页。
- `ui/theme-mock.html`：主题要素预览页。
- `ui/header-control-base.html`：Header 控件图标化探索 mock（v1 变体池）。
- `ui/header-control-base-v2.html`：Header 控件图标/文字主题切换与软拟态分组 mock（v2 定型稿）。
- `ui/startup-splash-mock.html`：启动页可视化调参 mock（由 `npm run mock:splash` 生成）。

## 性能文档

- `perf/2026-02-07-scan-benchmark.md`：扫描/重处理基准报告。
- `perf/2026-02-08-ui-perf-benchmark-plan.md`：UI 性能测试方案与指标口径。
- `perf/2026-02-08-streaming-ingest-benchmark-plan.md`：流式导入性能测试方案。

## 当前状态

- 历史空间漫游功能及相关设置项已从产品与实现中移除。
- 设置面板当前仅保留界面、AI 模型、数据库、快捷键分组。
- 音乐模式可视化已接入（默认 Shader `Default`，来源 Shadertoy `McsSzB`），支持 GPU/CPU 双后端、全屏显示与 FPS 调试信息。
- 文档目录已清理历史空间漫游方案、过期评估与已完成实施计划。

## 待办

1. 视频元数据获取实施：按 `docs/ref/video-metadata-scraper/` 参考文档落地抓取流程、字段映射与数据入库链路。
2. 广告审核运行态联动：进入广告审核任务后，Header `idle/busy` 状态强制切到 `busy`，直到审核任务结束（`review/completed/failed/cancelled`）再恢复。
3. 广告审核后台持续执行：审核启动后允许用户切换模式与常规看图操作，审核任务在后台持续执行并可回到面板查看进度。
4. 广告审核结果 Sidebar 输入：审核完成后将疑似广告结果集映射为独立 Sidebar 视图输入，仅显示该结果集内容。
5. 广告审核 Focus/Return 切换：在广告审核面板右侧新增 `focus` 按钮（复用“设为根”图标），`focus/return` 两态切换“结果 Sidebar”与“常规 Sidebar”；结果集执行删除后自动销毁该临时 Sidebar 视图。
6. 缩略图与元数据联动：在缩略图中点击图片时，元数据面板自动切换到“原图模式”。

## 文档维护约定

- 需求变化：同步更新 `requirements-v1.md`。
- 架构变化：同步更新 `architecture-v1.md`。
- 交互变化：同步更新 `interaction-v1.md`。
- 后端链路变化：同步更新 `backend-integration-guardrails.md`。
- 代码与文档不一致时，以当前代码行为为准，文档需在同一迭代内修正。
