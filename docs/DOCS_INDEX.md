# Docs 索引与维护策略

## 目标

- `docs/` 根目录仅保留 SSOT 与当前迭代必用文档。
- 非当前迭代文档统一归档到 `docs/archive/`。

## 根目录文档（当前有效）

| 路径 | 分类 | 用途 |
|---|---|---|
| `requirements-v1.md` | SSOT | 需求边界与产品范围 |
| `architecture-v1.md` | SSOT | 架构分层与模块边界 |
| `interaction-v1.md` | SSOT | 交互规则与键位行为 |
| `backend-integration-guardrails.md` | SSOT | 后端接入约束与门禁 |
| `i18n-aria-guardrails.md` | SSOT | i18n 与可访问性约束 |
| `music-visualizer-shader-entry.md` | SSOT | Shader 开发任务入口与最小读取范围 |
| `music-visualizer-shader-migration-playbook.md` | SSOT | Shader 迁移流程、约束与验收标准 |
| `theme-system-v2.md` | SSOT | 主题系统规范与 token 契约 |
| `theme-brainstorm-entry.md` | SSOT | Theme 迭代提示词入口与执行流程 |
| `project-evaluation-report-v12.md` | 质量基线 | 当前项目评估结果 |
| `dependency-risk-register.md` | 风险治理 | 依赖风险台账 |
| `offline-auto-subtitle-implementation-plan.md` | 当前计划 | 离线自动字幕实施计划 |
| `windows-release-signing-runbook.md` | 运行手册 | Windows 签名发布流程 |
| `Tips.md` | 经验沉淀 | 环境差异与疑难点处理记录 |
| `开发启动清单.md` | 运行手册 | 新环境启动检查项 |
| `README.md` | 入口 | docs 子目录导航 |
| `DOCS_INDEX.md` | 说明 | 本文档，维护规则与目录说明 |

## 根目录子目录（当前有效）

| 路径 | 用途 | 备注 |
|---|---|---|
| `ui/` | UI mock、主题调试页与样式实验文档 | 当前仍使用 |
| `perf/` | 性能方案与基准结果 | 当前仍使用 |
| `ref/` | 外部参考资料与实验样例 | 当前仍使用 |
| `archive/` | 历史文档归档区 | 非当前迭代文档 |

## 归档目录说明

| 路径 | 内容 |
|---|---|
| `archive/project-evaluations/` | 历史评估报告、模板、评估产物 |
| `archive/implementation-plans/` | 已完成或替代的实施计划 |
| `archive/offline-auto-subtitle/` | 离线字幕历史阶段报告 |
| `archive/stability-notes/` | 历史稳定性问题记录 |
| `archive/checklists/` | 历史阶段性检查清单 |

## 维护约定

- 新文档进入 `docs/` 根目录前，必须满足“SSOT 或当前必用”。
- 文档若被替代或阶段结束，迁移到 `archive/` 对应子目录。
- 每次迁移后同步更新：
  - `README.md`（项目根）
  - `docs/README.md`
  - `docs/DOCS_INDEX.md`
