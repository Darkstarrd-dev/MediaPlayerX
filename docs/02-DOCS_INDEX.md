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
| `14-project-evalutation-template.md` | 模板 | 项目评估模板（P0/P1/P2 + 逻辑重复 + 稳定性） |
| `14-project-evaluation-report-v18.md` | 质量基线 | 上一版项目评估结果 |
| `14-project-evaluation-report-v19.md` | 质量基线 | 当前项目评估结果 |
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
| `28-shader-plugin-implementation-checklist-v1.md` | 当前计划 | Shader 插件模式改造实施清单（全局开关 + 设置面板 Shader 分页） |
| `29-module-file-index.md` | 索引 | 模块到文件的半自动追踪索引（排障/改造入口） |
| `30-全仓重复治理PR拆分清单-v1.md` | 当前计划 | 重复治理重构的 PR 级拆分清单与回归检查门禁 |
| `31-ad-review-performance-mode-reimplementation-phased-plan-v1.md` | 当前计划 | Ad Review Performance 模式分阶段重实施计划（增量执行、防上下文压缩） |
| `33-ad-review-import-known-hash-专家技术支持请求-2026-03-04.md` | 当前计划 | Ad Review 导入哈希告警/清理问题专家技术支持请求 |
| `35-ui-theme-config-tauri-roadmap-v1.md` | 当前计划 | UI theme 配置收口与 Tauri 迁移实施路线图（含 phase/todo/check） |
| `36-theme-container-frame-migration-plan-v1.md` | 当前计划 | ThemeParameter 大容器层共享壳层 / frame / visual transform 全量迁移实施计划 |
| `38-theme-style-palette-skeleton-implement-plan-v1.md` | 当前计划 | Theme Style × Palette Skeleton 分阶段实施计划（已完成，含 TestStyle 空壳链路） |
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
- 新增功能若引入新模块/关键入口/跨层链路，必须同步更新 `29-module-file-index.md`。
- 每次迁移后同步更新：
  - `README.md`（项目根）
  - `docs/01-README.md`
  - `docs/02-DOCS_INDEX.md`
