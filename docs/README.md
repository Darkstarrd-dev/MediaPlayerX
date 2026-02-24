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
- 全屏重采样 SSOT 草案：`fullscreen_resampling_ssot_draft.md`

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
