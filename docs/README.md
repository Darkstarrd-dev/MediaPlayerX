# MediaPlayer 文档

本目录用于维护 MediaPlayer 当前版本的需求、架构、交互与工程约束。

## 核心文档（SSOT）

- `requirements-v1.md`：需求范围与行为边界。
- `architecture-v1.md`：运行时架构、模块边界、数据流。
- `interaction-v1.md`：界面结构、交互规则、快捷键行为。
- `music-visualizer-shader-entry.md`：Shader 开发新对话极简入口（提示词模板 + 最小读取范围）。
- `music-visualizer-shader-migration-playbook.md`：音乐可视化 Shader 迁移流程、排障与验收清单。
- `backend-integration-guardrails.md`：后端接入强约束与门禁。
- `i18n-aria-guardrails.md`：i18n 与 aria 长期开发约束（key 分层、a11y-id、门禁）。
- `windows-release-signing-runbook.md`：Windows 发布签名与 CI 打包流程。
- `开发启动清单.md`：跨机器拉取后的一次性启动流程。

## 质量与稳定性

- `stability-note-2026-02-12-sidebar-switch-crash.md`：Sidebar 高频切换稳定性问题与修复记录。
- `stability-note-2026-02-16-dev-desktop-loading-csp.md`：`dev:desktop` 持久“加载中”问题排查与 CSP 修复记录。
- `project-evaluation-report-v6.md`：项目评估（当前保留版本）。

## 当前实施计划

- `ad-review-audit-mode-fix-implementation-plan.md`：广告审核模式 5 项问题修复计划（分 Phase、最小读取、测试门禁、提交推送门禁）。

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

1. Theme brainstorm 迭代入口：使用 `docs/ui/theme-brainstorm-entry.md` 作为新对话提示词，限制读取范围并执行 screenshot gallery 流程。
2. Shader 开发入口落地：新建 Shader 相关任务默认使用 `docs/music-visualizer-shader-entry.md` 作为首个提示词入口，并持续维护最小读取范围。
3. 基于 `docs/aria-regression-checklist.md` 执行全量回归签收（zh-CN / en-US、键盘流、屏幕阅读器）。
4. 文件管理模式 G/M 回归：覆盖跨盘移动（EXDEV fallback）、目标重名冲突、非法分组名、部分成功部分失败提示与 sqlite 快照路径同步验证。
5. 继续UI界面的文字按钮重构为图形按钮
6. tooltip的模式和样式设计（是否纳入theme系统管理，tooltip时用覆盖全屏的模式还是单个按钮单个位置的模式）
7. https://idc.xpzsd.codes/ 供参考的背景特效和边框特效
10. 基于tags的近似推荐系统
11. 基于用户自己的stars评分的random推荐系统
12. 基于作品tags的用户xp分析系统
13. 基于 `docs/copy-review-checklist.md` 执行文案统一审校，补齐边角错误文案与术语一致性。
16.全屏模式下软萌风格的control控件修正

## 文档维护约定

- 需求变化：同步更新 `requirements-v1.md`。
- 架构变化：同步更新 `architecture-v1.md`。
- 交互变化：同步更新 `interaction-v1.md`。
- 后端链路变化：同步更新 `backend-integration-guardrails.md`。
- 代码与文档不一致时，以当前代码行为为准，文档需在同一迭代内修正。
