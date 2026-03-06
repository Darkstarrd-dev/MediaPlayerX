# MediaPlayerX 文档目录

## 文档策略

- `docs/` 根目录仅保留 SSOT 与当前迭代必用文档。
- 历史文档统一迁移到 `docs/archive/`。

## 快速入口

- 总索引：`02-DOCS_INDEX.md`
- 需求：`03-requirements-v1.md`
- 架构：`04-architecture-v1.md`
- 交互：`05-interaction-v1.md`
- 后端约束：`06-backend-integration-guardrails.md`
- i18n/a11y 约束：`07-i18n-aria-guardrails.md`
- Shader 开发入口：`12-music-visualizer-shader-entry.md`
- Shader 实施手册：`13-music-visualizer-shader-migration-playbook.md`
- Shader 插件改造实施清单：`28-shader-plugin-implementation-checklist-v1.md`
- 模块文件索引（半自动）：`29-module-file-index.md`
- 全仓重复治理 PR 清单：`30-全仓重复治理PR拆分清单-v1.md`
- Ad Review Performance 分阶段重实施计划：`31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`
- Theme 规范（SSOT）：`08-theme-system-v2.md`
- Theme 迭代入口：`09-theme-brainstorm-entry.md`
- 疑难点记录：`27-Tips.md`
- UI 稳定路径表：`10-ui_definition.md`
- UI 槽位 Token 前缀表：`11-token_design.md`
- 评估模板：`14-project-evalutation-template.md`
- 当前评估：`14-project-evaluation-report-v19.md`
- 风险台账：`15-dependency-risk-register.md`
- 性能实施计划：`17-thumb_acceleration_implementation_plan.md`
- 音频增强与转码计划：`19-mpv-增强模式与转码实施计划-v1.md`
- 音频增强发布说明：`20-audio-enhanced-mode-release-notes-v1.md`
- 音频增强长稳测试手册：`21-audio-enhanced-mode-longrun-test-runbook-v1.md`
- 音频增强专家咨询申请：`22-mpv-增强模式专家咨询申请-2026-02-27.md`
- 全屏重采样 SSOT 草案：`23-fullscreen_resampling_ssot_draft.md`
- 高优化需求项目表：`24-high-optimization-demand-table.md`
- Ad Review 导入哈希专家咨询申请：`33-ad-review-import-known-hash-专家技术支持请求-2026-03-04.md`
- UI Theme Config 与 Tauri 迁移路线图：`35-ui-theme-config-tauri-roadmap-v1.md`

## 待办

- [ ] 排查 fullscreen dual 模式下视频播放约 5~6 分钟自动跳回片首的回归问题（远程机器接手）
  - [ ] 复现结论：问题发生在 `fullscreen + dual` 播放过程中，不是 single/dual 切换瞬间；从头连续播放时约 5~6 分钟触发。
  - [ ] 新增复测结论：即使先 `seek forward` 到较靠后位置，仍然是“从 seek 后继续播放约 5 分钟左右”跳回片首，而不是在媒体时间轴到达 5:00 左右时触发。
  - [ ] 当前判断：根因更像“与当前全屏 dual 视频实例存活时长 / 某个墙钟定时链路相关”，而不是“与播放位置到达某个时间点相关”。
  - [ ] 已排除的初步假设：仅缩短媒体 token TTL（`MPX_MEDIA_TOKEN_TTL_MS` / `MEDIA_PLAYERX_MEDIA_TOKEN_TTL_MS`）不会让问题提前到 10~30 秒内触发，因此“纯墙钟 5 分钟 token 到期即刻触发”不是充分解释。
  - [ ] 待优先验证 1：全屏 dual 视频实例在存活约 5 分钟后触发某次新的 range / 续读请求或内部重载，自定义媒体协议读流失败，导致 `<video>` 静默 reload 或 seek 到 0。
  - [ ] 待优先验证 2：播放过程中的周期性刷新 / 库变更 / scope 校正导致 `selectedVideoId`、`focusedVideoSrc` 或全屏 `<video>` 实例被隐式重建，从而把播放状态重置到片首。
  - [ ] 先补诊断：`electron/registerMediaProtocolHandler.ts` 为 `media-protocol-read-failed` 增加强制日志（至少打印 `tokenPrefix`、`hasRangeHeader`、错误 message、触发时间）。
  - [ ] 先补前端事件埋点：`src/components/fullscreen/FullscreenPanes.tsx` 的 `<video>` 增加 `onError / onStalled / onWaiting / onEmptied / onAbort`，记录 `currentSrc / currentTime / networkState / readyState`。
  - [ ] 重点排查文件：`src/components/fullscreen/FullscreenPanes.tsx`、`src/components/FullscreenLayer.tsx`、`src/features/app/useAppEffects.ts`、`src/features/app/useResolvedMediaState.ts`、`src/features/backend/useResolvedMediaUrls.ts`。
  - [ ] 协议/后端链路重点文件：`electron/registerMediaProtocolHandler.ts`、`electron/services/file-system-read/mediaResourceService.ts`、`electron/services/file-system-read/mediaTokenService.ts`、`electron/services/file-system-read/fileSystemReadFacadeConfig.ts`、`electron/fileSystemMediaReaders.ts`。
  - [ ] 次级干扰项：`src/features/app/usePreferenceMetricsBuffer.ts` 会周期性写 runtime checkpoint；`electron/services/file-system-read/libraryReadWriteServiceImpl.ts` 会发 `write-preference-metrics`；`src/features/backend/useReadOnlyDataAccess.ts` 当前未豁免该 reason，可能放大全量刷新与重建概率，需一并审计。
  - [ ] 建议远程机复现步骤 A：进入 video 模式 -> fullscreen -> dual -> 从头连续播放同一视频，记录 5~6 分钟附近是否触发；期间不要切视频、不要切模式。
  - [ ] 建议远程机复现步骤 B：进入 fullscreen dual 后立即 `seek forward` 到明显靠后位置，继续播放并记录是否仍在 seek 后约 5 分钟左右触发；若仍触发，可继续排除“播放位置阈值”假设。

- [ ] 间距系统去硬编码收口（image | video | music 三模式）
  - [ ] Video 主区控件容器去硬编码：`src/styles/app/main/main.part3.css`（`video-controls-shell` 的 `margin-top/gap/padding`）
  - [ ] Music 主区控件容器去硬编码：`src/styles/app/main/main.part2.css`（`music-controls-shell` 的 `margin-top/padding`，`music-controls-progress` 的 `gap/margin-bottom`）
  - [ ] Meta Video/Music 编辑区内部间距参数化：`src/styles/app/metadata.css`（`metadata-video-body`、`metadata-music-content` 的固定 `gap: 10px`）
  - [ ] Image/NameList 相关固定间距参数化：`src/styles/app/main/main.part2.css`（`name-list-header` 的 `gap/padding`）
  - [ ] Main Footer 内部固定间距参数化：`src/styles/app/main/main.part1.css`（`main-footer`、`main-footer-meta`、`main-footer-pagination` 的固定 `gap`）
  - [ ] 目标：上述区域可通过设置面板参数统一控制，不再依赖硬编码 px 常量

## 当前进展（样式统一）

- [x] 已完成按钮模板化（Button Template）基础收敛：统一 `idle / hover / active / pressed` 状态语义，修复 `aria-pressed` 视觉延后问题。
- [x] 已完成多处触发器语义对齐：面板打开态按钮统一补齐 `aria-pressed`，并与 `aria-expanded` 协同。
- [x] 已完成部分浮层内容结构原语沉淀：新增并落地一批 `mpx-overlay-*` 共通样式类，减少重复样式实现。
- [ ] 待完成：各 Panel / Dialog 的统一样式修订（全量收口）。
  - 修订原则：凡是结构与交互可复用的位置，优先使用共通样式（Called Common Styles / `mpx-overlay-*`），仅在确有差异时追加局部样式。
  - 目标：降低样式分叉与覆盖冲突，保证跨面板视觉与状态表现一致。

## SSOT 同步提醒

- 当实现“高级分页 / 加载性能”相关交互或默认值调整时，必须同步更新：
  - `05-interaction-v1.md`（交互、分组、参数语义、Tooltip 用途）
  - `17-thumb_acceleration_implementation_plan.md`（阶段、验收、回滚策略）
- 当新增功能引入新模块、关键入口文件或跨层链路时，必须同步更新：
  - `29-module-file-index.md`（模块到文件索引，用于排障与改造快速定位）

## UI 表维护约束

- 新增 UI 槽位：同时新增 `10-ui_definition.md` 与 `11-token_design.md` 条目。
- 修改 UI 槽位：两张表同步修改。
- 删除 UI 槽位：两张表同步删除（如需兼容先标记 deprecated 再移除）。

## 子目录

- `ui/`：UI mock、主题调试页与样式实验资源。
- `perf/`：性能方案与基准结果。
- `ref/`：参考资料与实验样例。
- `archive/`：历史文档归档。
