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
- `offline-auto-subtitle-implementation-plan.md`：离线自动字幕实施方案（可选安装、模型按需下载、DirectML/CPU 自动回退、分 Phase 门禁）。
- `offline-auto-subtitle-phase0-report.md`：离线自动字幕 Phase 0 执行记录（探针脚本、阻塞项、风险清单）。
- `offline-auto-subtitle-phase1-report.md`：离线自动字幕 Phase 1 执行记录（可选安装组件与运行时探测）。
- `offline-auto-subtitle-phase2-report.md`：离线自动字幕 Phase 2 执行记录（设置项、模型目录与基础 UI）。

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

1. 基于 `docs/aria-regression-checklist.md` 执行全量回归签收（zh-CN / en-US、键盘流、屏幕阅读器）。
2. 基于 `docs/copy-review-checklist.md` 执行文案统一审校，补齐边角错误文案与术语一致性。
3. Theme brainstorm 迭代入口：使用 `docs/ui/theme-brainstorm-entry.md` 作为新对话提示词，限制读取范围并执行 screenshot gallery 流程。
4. Shader 开发入口落地：新建 Shader 相关任务默认使用 `docs/music-visualizer-shader-entry.md` 作为首个提示词入口，并持续维护最小读取范围。
5. 继续 UI 界面的文字按钮重构为图形按钮。
6. 补齐剩余未图标化按钮（见 `docs/ui/Soft-Skeuomorphic-icon_design.md`）：
   - MetadataAdReviewSection：审核模式（广告/封面）、策略切换、启动/暂停、焦点切换。
   - Legacy 管理面板（若保留）：策略切换、启动/暂停。
7. Tooltip/帮助覆盖层二期：继续优化覆盖层密度布局，避免重叠与越界；为每个说明文本框增加可调整指针（leader line）以保证指向关系清晰。
8. Fullscreen 缩放待修复：zoom 滑条当前无法放大超过 100，且鼠标缩放事件失效（需排查输入同步与事件绑定链路）。
9. 完善未定义按钮 tooltip：补齐缺失文案 key 与挂载点，保证 icon-only 按钮 hover/focus 都能给出说明。
10. 调整 tooltip 容器样式以适配 day/night 双模式（含对比度、边框、阴影和背景透明度）。
11. 将 tooltip 字体大小配置接入设置面板，并纳入 theme token 与持久化设置。
12. 按 `docs/offline-auto-subtitle-implementation-plan.md` 执行离线自动字幕实施；研究依据保留 `docs/ref/subtitle.md`。
13. 参考 `https://idc.xpzsd.codes/` 的背景特效和边框特效方案。
14. 基于 tags 的近似推荐系统。
15. 基于用户 stars 评分的 random 推荐系统。
16. 基于作品 tags 的用户 xp 分析系统。

## 文档维护约定

- 需求变化：同步更新 `requirements-v1.md`。
- 架构变化：同步更新 `architecture-v1.md`。
- 交互变化：同步更新 `interaction-v1.md`。
- 后端链路变化：同步更新 `backend-integration-guardrails.md`。
- 代码与文档不一致时，以当前代码行为为准，文档需在同一迭代内修正。
