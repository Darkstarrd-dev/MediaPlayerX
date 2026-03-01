# Docs 索引与维护策略

## 目标

- `docs/` 根目录仅保留 SSOT 与当前迭代必用文档。
- 非当前迭代文档统一归档到 `docs/archive/`。

## 根目录文档（当前有效）

| 路径 | 分类 | 用途 |
|---|---|---|
| `03-requirements-v1.md` | SSOT | 需求边界与产品范围 |
| `04-architecture-v1.md` | SSOT | 架构分层与模块边界 |
| `05-interaction-v1.md` | SSOT | 交互规则与键位行为 |
| `06-backend-integration-guardrails.md` | SSOT | 后端接入约束与门禁 |
| `07-i18n-aria-guardrails.md` | SSOT | i18n 与可访问性约束 |
| `12-music-visualizer-shader-entry.md` | SSOT | Shader 开发任务入口与最小读取范围 |
| `13-music-visualizer-shader-migration-playbook.md` | SSOT | Shader 迁移流程、约束与验收标准 |
| `08-theme-system-v2.md` | SSOT | 主题系统规范与 token 契约 |
| `09-theme-brainstorm-entry.md` | SSOT | Theme 迭代提示词入口与执行流程 |
| `14-project-evaluation-report-v17.md` | 质量基线 | 当前项目评估结果 |
| `15-dependency-risk-register.md` | 风险治理 | 依赖风险台账 |
| `16-preference-metrics-spec-v1.md` | 规范 | 偏好指标采集与存储规范 |
| `18-offline-auto-subtitle-implementation-plan.md` | 当前计划 | 离线自动字幕实施计划 |
| `19-mpv-增强模式与转码实施计划-v1.md` | 当前计划 | 音频增强模式（mpv）与转码实施路线 |
| `20-audio-enhanced-mode-release-notes-v1.md` | 运行手册 | 音频增强模式已知限制、回退路径与发布说明 |
| `21-audio-enhanced-mode-longrun-test-runbook-v1.md` | 运行手册 | 音频增强模式长稳测试流程、脚本与回填模板 |
| `22-mpv-增强模式专家咨询申请-2026-02-27.md` | 当前计划 | 音频双引擎切换阻塞问题专家咨询申请 |
| `24-high-optimization-demand-table.md` | 当前计划 | 系统级高性能/长任务优化需求总表 |
| `23-fullscreen_resampling_ssot_draft.md` | 当前计划 | 全屏重采样改造草案与口径 |
| `17-thumb_acceleration_implementation_plan.md` | 当前计划 | 缩略图加速实施计划与验收 |
| `10-ui_definition.md` | SSOT | UI 槽位定义表 |
| `11-token_design.md` | SSOT | UI 槽位 Token 前缀表 |
| `25-windows-release-signing-runbook.md` | 运行手册 | Windows 签名发布流程 |
| `27-Tips.md` | 经验沉淀 | 环境差异与疑难点处理记录 |
| `26-开发启动清单.md` | 运行手册 | 新环境启动检查项 |
| `01-README.md` | 入口 | docs 子目录导航 |
| `02-DOCS_INDEX.md` | 说明 | 本文档，维护规则与目录说明 |

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
  - `docs/01-README.md`
  - `docs/02-DOCS_INDEX.md`
