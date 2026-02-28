# MediaPlayerX 文档目录

## 文档策略

- `docs/` 根目录仅保留 SSOT 与当前迭代必用文档。
- 历史文档统一迁移到 `docs/archive/`。

## 快速入口

- 总索引：`DOCS_INDEX.md`
- 需求：`requirements-v1.md`
- 架构：`architecture-v1.md`
- 交互：`interaction-v1.md`
- 后端约束：`backend-integration-guardrails.md`
- i18n/a11y 约束：`i18n-aria-guardrails.md`
- Shader 开发入口：`music-visualizer-shader-entry.md`
- Shader 实施手册：`music-visualizer-shader-migration-playbook.md`
- Theme 规范（SSOT）：`theme-system-v2.md`
- Theme 迭代入口：`theme-brainstorm-entry.md`
- 疑难点记录：`Tips.md`
- UI 稳定路径表：`ui_definition.md`
- UI 槽位 Token 前缀表：`token_design.md`
- 当前评估：`project-evaluation-report-v12.md`
- 风险台账：`dependency-risk-register.md`
- 性能实施计划：`thumb_acceleration_implementation_plan.md`
- 音频增强与转码计划：`mpv-增强模式与转码实施计划-v1.md`
- 音频增强发布说明：`audio-enhanced-mode-release-notes-v1.md`
- 音频增强长稳测试手册：`audio-enhanced-mode-longrun-test-runbook-v1.md`
- 音频增强专家咨询申请：`mpv-增强模式专家咨询申请-2026-02-27.md`
- 全屏重采样 SSOT 草案：`fullscreen_resampling_ssot_draft.md`
- 高优化需求项目表：`high-optimization-demand-table.md`
- 视频节点浏览实现记录：`video-node-browse-implementation-log-2026-02-27.md`

## 待办

- [ ] FunASR 参数调优执行计划（高效版）：`funasr-parameter-tuning-execution-plan.md`

## 当前进展（样式统一）

- [x] 已完成按钮模板化（Button Template）基础收敛：统一 `idle / hover / active / pressed` 状态语义，修复 `aria-pressed` 视觉延后问题。
- [x] 已完成多处触发器语义对齐：面板打开态按钮统一补齐 `aria-pressed`，并与 `aria-expanded` 协同。
- [x] 已完成部分浮层内容结构原语沉淀：新增并落地一批 `mpx-overlay-*` 共通样式类，减少重复样式实现。
- [ ] 待完成：各 Panel / Dialog 的统一样式修订（全量收口）。
  - 修订原则：凡是结构与交互可复用的位置，优先使用共通样式（Called Common Styles / `mpx-overlay-*`），仅在确有差异时追加局部样式。
  - 目标：降低样式分叉与覆盖冲突，保证跨面板视觉与状态表现一致。

## SSOT 同步提醒

- 当实现“高级分页 / 加载性能”相关交互或默认值调整时，必须同步更新：
  - `interaction-v1.md`（交互、分组、参数语义、Tooltip 用途）
  - `thumb_acceleration_implementation_plan.md`（阶段、验收、回滚策略）

## UI 表维护约束

- 新增 UI 槽位：同时新增 `ui_definition.md` 与 `token_design.md` 条目。
- 修改 UI 槽位：两张表同步修改。
- 删除 UI 槽位：两张表同步删除（如需兼容先标记 deprecated 再移除）。

## 子目录

- `ui/`：UI mock、主题调试页与样式实验资源。
- `perf/`：性能方案与基准结果。
- `ref/`：参考资料与实验样例。
- `archive/`：历史文档归档。
