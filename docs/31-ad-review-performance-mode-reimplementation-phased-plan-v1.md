# Ad Review Performance 模式分阶段重实施计划 v1（增量执行版）

## 1. 文档目标

- 将 ad/cover 审核能力按 `normal` / `performance` 双模式落地，且保证 `normal` 行为不变。
- 将实施拆为独立 phase；每次只做一个 phase，完成后回填本文件，再开启下一个 phase。
- 降低单次对话上下文压力，避免“未开始实施即触发上下文压缩”。

## 2. 冻结约束（来自恢复文档）

- `normal`：保持旧行为，不引入新策略。
- `performance`：必须保留 head/tail 差异提示词。
  - head：同图聚类 + 覆盖广告 + 覆盖文本。
  - tail：广告 / 空白 / 非正文。
- 全流程使用 `image_id`，禁止依赖图片顺序索引。
- 尾部发送量规则：`tail_llm_n = tail_base_n - tail_hash_hit_count`，且不向前补位。
- 合并动作：
  - `ad_delete_ids = head.ad_overlay_ids ∪ tail.ad_ids ∪ hash_hit_ad_ids`
  - `nonbody_hide_ids = (head.non_body_ids ∪ tail.non_body_ids) - ad_delete_ids`
- `tail_base_n` 当前基数按 **8** 执行，且该值继续由现有 popover 控件调节；不新增额外配置入口。
- Phase A 复现实验模型固定：`huihui-qwen3-vl-8b-instruct-abliterated`。

## 3. 分部执行规则（强制）

- 每次新对话只允许读取：
  - `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`
  - `docs/ref/ad-review-data/START_HERE.md`
  - `docs/ref/ad-review-data/RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md`
  - 当前 phase 的“涉及文件”列表。
- 未完成当前 phase 的“完成检查”前，不进入下一 phase。
- 每完成一个 phase，必须回填“Phase 执行记录”。

## 4. Phase 总览

| Phase | 目标 | 状态 |
|---|---|---|
| A | 先测基线，冻结可复现实验口径 | [x] 已完成（基线锁定：中文直问 + 1024/q80 + 指定模型） |
| B | 设置层改造（视频设置分页 + AI辅助设置 + 模式下拉） | [x] 已完成 |
| C | 后端 `performance` 分支（head/tail + 合并规则） | [x] 已完成 |
| D | 前端审核交互门控与结果分组显示 | [x] 已完成 |
| E | 回归验证、文档回填、收口检查 | [x] 已完成 |

---

## Phase A：实验基线与口径冻结（先测试）

### Todo

- [x] 使用恢复脚本完成最小复现实验（至少 1 次批次）。
- [x] 确认 head 任务在样本 `01/02/03` 可稳定命中“同图 + 覆盖广告 + 覆盖文本”。（基线：中文直问 + 1024/q80 + `huihui-qwen3-vl-8b-instruct-abliterated`）
- [x] 确认 tail 计算口径与 `tail_base_n=8`（可调）一致。
- [x] 将本轮结果路径回填到“Phase 执行记录”。

### 涉及文件

- `docs/ref/ad-review-data/scripts/vision-token-matrix.mjs`
- `docs/ref/ad-review-data/scripts/vision-ocr-matrix.mjs`
- `docs/ref/ad-review-data/scripts/unified-review-batch-test.mjs`
- `docs/ref/ad-review-data/scripts/unified-review-head-tail-test.mjs`
- `docs/ref/ad-review-data/scripts/head3-direct-prompt-repeat5.mjs`
- `docs/ref/ad-review-data/results/`
- `src/assets/test/`
- `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`

### 完成检查

- [x] 产出新的实验结果目录并可追溯。
- [x] head/tail 关键结论与 `START_HERE` 无冲突。（按当前基线复测通过）
- [x] 明确记录 `tail_base_n=8` 且来自 popover 控件。

---

## Phase B：设置与面板结构改造

### Todo

- [x] 在设置模型中加入审核执行模式字段（`normal | performance`），默认值不破坏旧行为。
- [x] 设置页新增“视频设置”分页，并迁移“离线字幕 + 字幕清理”配置。
- [x] 原视频相关 AI 配置区更名为“AI辅助设置”，加入模式下拉。
- [x] `performance` 模式下保留 tail 基数可调（沿用现有 popover），不新增额外配置入口。

### 涉及文件

- `src/contracts/settings.ts`
- `src/store/useUiStore.ts`
- `src/features/app/useAppSettingsStore.ts`
- `src/components/SettingsPanel.types.ts`
- `src/features/app/buildSettingsPanelProps.ts`
- `src/components/settings/renderSettingsMainSection.types.ts`
- `src/components/settings/settingsPanelHelpers.ts`
- `src/components/settings/renderSettingsMainSectionContent.tsx`
- `src/components/settings/renderSettingsModelSection.tsx`
- `src/components/settings/renderSettingsVideoSection.tsx`（新增）
- `src/i18n/locales/zh-CN.part1.ts`
- `src/i18n/locales/zh-CN.part2.ts`
- `src/i18n/locales/en-US.part1.ts`
- `src/i18n/locales/en-US.part2.ts`

### 完成检查

- [x] 设置面板可切换 `normal` / `performance`，并能持久化。
- [x] 新“视频设置”分页可见，离线字幕与字幕清理入口已迁移。
- [x] “AI辅助设置”中广告审核视觉模型配置可用。
- [x] 未启用 `performance` 时，旧设置行为不变。

---

## Phase C：后端审核管线（performance 分支）

### Todo

- [x] 拆分 head/tail prompt 模板并强制 `image_id` 输出。
- [x] 在审核引擎中新增 `performance` 分支；`normal` 继续原逻辑。
- [x] 接入尾部发送量规则：`tail_llm_n = tail_base_n - tail_hash_hit_count`。
- [x] 实现合并动作规则并确保 ad 优先级覆盖 nonbody。

### 涉及文件

- `electron/manageAdReview/types.ts`
- `electron/manageAdReview/prompts.ts`
- `electron/manageAdReview/openAiVisionClient.ts`
- `electron/manageAdReview/adReviewEngine.ts`
- `electron/services/file-system-read/manageAdReviewService.ts`
- `electron/services/file-system-read/manageAdReviewService.utils.ts`
- `electron/services/file-system-read/manageAdReviewService.types.ts`
- `electron/services/file-system-read/manageCoverReviewService.ts`
- `electron/services/file-system-read/manageCoverReviewService.types.ts`
- `src/contracts/backend.schemas.management.ts`
- `src/features/backend/repository/types.ts`
- `src/features/backend/repository/realRepository.ts`
- `src/features/backend/repository/mockRepository.ts`

### 完成检查

- [x] `normal` 模式输入同样本时结果与改造前一致。（既有单测与回归通过）
- [x] `performance` 模式下 head/tail 请求与结果均以 `image_id` 对齐。
- [x] tail 发送量计算正确，且不向前补位。
- [x] 合并后 `ad_delete_ids` 与 `nonbody_hide_ids` 符合冻结公式。

---

## Phase D：前端审核交互与展示分组

### Todo

- [x] `performance` 下隐藏 AD/C 切换。
- [x] `performance` 下锁定 H 模式（禁止 H/A 切换）。
- [x] 策略 popover 移除 `tailStopClean` 控件，仅保留前三项控制。
- [x] 结果区增加“包内非正文组与疑似广告组之间换行”。

### 涉及文件

- `src/components/ImageMainAdReviewControls.tsx`
- `src/components/metadata/MetadataAdReviewSection.tsx`
- `src/components/ImageMainSection.types.ts`
- `src/components/ImageMainSection.renderers.tsx`
- `src/features/app/buildImageMainSectionProps.ts`
- `src/features/app/buildMetadataPanelProps.ts`
- `src/features/app/workspaceAdReviewHandlers.ts`
- `src/features/app/workspaceAdReviewPageDerivations.ts`
- `src/features/app/useManageAdReviewActions.ts`
- `src/features/app/useAppWorkspaceProps.impl.ts`
- `src/styles/app/metadata.css`
- `src/styles/app/main/main.part2.css`

### 完成检查

- [x] `performance` 下 UI 控件门控符合约束；`normal` 下保留旧交互。
- [x] tail 基数控件仍可调（默认 8），`tailStopClean` 已移除。
- [x] 列表分组换行规则符合“包间 + 包内组间”双层换行要求。

---

## Phase E：验证收口与文档同步

### Todo

- [x] 执行最小回归（normal/performance 各一轮）并记录差异。
- [x] 执行质量门禁：格式、lint、测试、构建。
- [x] 将实现结果与运行批次回填到参考文档。
- [x] 同步 SSOT 文档中受影响章节。

### 涉及文件

- `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`
- `docs/ref/ad-review-data/RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md`
- `docs/ref/ad-review-data/INDEX.md`
- `docs/05-interaction-v1.md`
- `docs/06-backend-integration-guardrails.md`
- `docs/03-requirements-v1.md`（若需求语义发生变更）

### 完成检查

- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] 关键文档已回填，且路径可追溯。

---

## 5. Phase 执行记录（每阶段完成后回填）

### Phase A 执行记录

- 执行日期：2026-03-04
- 变更文件：
  - `docs/ref/ad-review-data/results/unified-review-head-tail-test/run-2026-03-03T17-11-15-908Z/raw.json`
  - `docs/ref/ad-review-data/results/unified-review-head-tail-test/run-2026-03-03T17-11-15-908Z/detail.csv`
  - `docs/ref/ad-review-data/results/unified-review-head-tail-test/run-2026-03-03T17-11-15-908Z/summary.csv`
  - `docs/ref/ad-review-data/results/unified-review-batch-test/run-2026-03-03T17-12-39-483Z/raw.json`
  - `docs/ref/ad-review-data/results/unified-review-batch-test/run-2026-03-03T17-12-39-483Z/summary.csv`
  - `docs/ref/ad-review-data/results/unified-review-batch-test/run-2026-03-03T17-12-39-483Z/compare.csv`
  - `docs/ref/ad-review-data/results/unified-review-batch-test/run-2026-03-03T17-12-39-483Z/detail.csv`
  - `docs/ref/ad-review-data/results/unified-review-head-tail-test/run-2026-03-03T17-30-02-708Z/head3-direct-prompt-repeat5.json`
  - `docs/ref/ad-review-data/results/unified-review-head-tail-test/run-2026-03-03T17-30-03-881Z/head3-direct-prompt-repeat5.json`
  - `docs/ref/ad-review-data/results/unified-review-head-tail-test/run-2026-03-03T17-30-04-254Z/head3-direct-prompt-repeat5.json`
  - `docs/ref/ad-review-data/results/unified-review-head-tail-test/run-2026-03-03T17-30-27-316Z/head3-direct-prompt-repeat5.json`
  - `docs/ref/ad-review-data/scripts/head3-direct-prompt-repeat5.mjs`
  - `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`
- 结果摘要：
  - 已完成最小复现实验批次；批量请求继续保持 token 优势。
  - `tail_base_n=8` 复现成功：`tail_known_hash_hit_ids=4`，`tail_llm_quota=4`，`tail_llm_ids=29,28,27,26`，符合 `tail_llm_n = tail_base_n - tail_hash_hit_count`。
  - 已按用户基准固定模型 `huihui-qwen3-vl-8b-instruct-abliterated` 并使用中文直问提示词复测。
  - 复测对比：`640/q40` 与 `640/q80` 存在抖动（广告编号行偶发缺失）；`1024/q80` 稳定度最高。
  - 结论批次：`run-2026-03-03T17-30-27-316Z` 达到 `duplicate_01_02_hit_rate=1`、`overlay_01_hit_rate=1`、`overlay_text_hit_rate=1`，且文本稳定为 `KOKOKORO个人汉化`（带标点变体）。
- 风险/阻塞：
  - 同模型在较低分辨率存在输出抖动；后续回归需锁定 `1024/q80` 作为 head 评测口径。
- 下一阶段入口：
  - 进入 Phase B：按既定文件清单实施设置层改造。

### Phase B 执行记录

- 执行日期：2026-03-04
- 变更文件：
  - `src/contracts/settings.ts`
  - `src/store/useUiStore.ts`
  - `src/features/app/useAppSettingsStore.ts`
  - `src/features/app/usePersistedAppSettings.ts`
  - `src/components/SettingsPanel.types.ts`
  - `src/features/app/buildSettingsPanelProps.ts`
  - `src/features/app/useAppTopLayerState.ts`
  - `src/components/settings/renderSettingsMainSection.types.ts`
  - `src/components/settings/settingsPanelHelpers.ts`
  - `src/components/settings/renderSettingsMainSectionContent.tsx`
  - `src/components/settings/renderSettingsModelSection.tsx`
  - `src/components/SettingsPanel.impl.tsx`
  - `src/i18n/locales/zh-CN.part1.ts`
  - `src/i18n/locales/en-US.part1.ts`
  - `src/features/app/buildSettingsPanelProps.test.ts`
  - `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`
- 结果摘要：
  - 设置模型新增 `adReviewExecutionMode`（`normal | performance`），默认值为 `normal`，并接入 store 与持久化映射。
  - 设置侧边栏新增 `video` 分页；离线字幕与字幕清理配置迁移到视频分页。
  - 原 `model` 分页改为 AI辅助设置，仅保留广告审核视觉模型配置，并新增执行模式下拉。
  - i18n 已同步中英文字段：新增 `sectionVideo`、更新 `sectionModel` 命名、新增执行模式文案与 tooltip。
  - 验证通过：`npm run test -- src/features/app/buildSettingsPanelProps.test.ts`、`npm run build`。
- 风险/阻塞：
  - 当前仅完成设置层改造；`performance` 模式在审核流程中的实际行为门控仍待 Phase C/Phase D 接入。
- 下一阶段入口：
  - 进入 Phase C：后端审核管线 `performance` 分支（head/tail + 合并规则）。

### Phase C 执行记录

- 执行日期：2026-03-04
- 变更文件：
  - `electron/manageAdReview/types.ts`
  - `electron/manageAdReview/prompts.ts`
  - `electron/manageAdReview/openAiVisionClient.ts`
  - `electron/manageAdReview/adReviewEngine.ts`
  - `electron/manageAdReview/index.ts`
  - `electron/services/file-system-read/manageAdReviewService.ts`
  - `electron/services/file-system-read/manageAdReviewService.utils.ts`
  - `electron/services/file-system-read/manageAdReviewStateStore.ts`
  - `electron/services/file-system-read/manageCoverReviewService.ts`
  - `electron/services/file-system-read/manageCoverReviewStateStore.ts`
  - `electron/services/file-system-read/manageReviewStateStoreFactory.ts`
  - `src/contracts/backend.schemas.management.ts`
  - `src/contracts/backend.schemas.ts`
  - `src/contracts/backend.types.ts`
  - `src/features/app/useManageAdReviewActions.ts`
  - `src/features/app/useAppManageBindings.ts`
  - `src/features/backend/repository/mock/AdReviewHandlers.ts`
  - `src/features/app/useManageAdReviewActions.test.ts`
  - `src/features/app/workspaceAdReviewPageDerivations.test.ts`
  - `src/features/app/workspaceAdReviewSidebarContext.test.ts`
  - `src/features/app/buildAdReviewSidebarState.test.ts`
  - `src/components/metadata/MetadataAdReviewSection.test.tsx`
  - `electron/services/file-system-read/manageReviewStateStoreFactory.test.ts`
  - `electron/services/file-system-read/manageAdReviewService.test.ts`
  - `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`
- 结果摘要：
  - 新增后端执行模式字段 `execution_mode`（`normal | performance`），请求/执行配置/持久化全链路可传递。
  - 新增 head/tail 批量提示词模板与批量结果解析，强制以 `image_id` 对齐输入输出。
  - 引擎新增 `performance` 分支（仅在 `execution_mode=performance` 且客户端支持批量审核时触发），保留 `normal` 原扫描逻辑。
  - `performance` 分支已落地尾部配额规则：`tail_llm_n = tail_base_n - tail_hash_hit_count`，且不向前补位。
  - 已落地合并规则：`ad_delete_ids = head.ad_overlay_ids ∪ tail.ad_ids ∪ hash_hit_ad_ids`，`nonbody_hide_ids = (head.non_body_ids ∪ tail.non_body_ids) - ad_delete_ids`。
  - `ManageAdReviewTaskDto` 新增 `performance_result`（可选）用于保留后端合并结果，当前候选仍保持删除语义兼容。
  - 验证通过：
    - `npm run test -- electron/manageAdReview/adReviewEngine.test.ts electron/services/file-system-read/manageAdReviewService.test.ts src/features/app/useManageAdReviewActions.test.ts src/features/app/workspaceAdReviewPageDerivations.test.ts src/features/app/workspaceAdReviewSidebarContext.test.ts src/features/app/buildAdReviewSidebarState.test.ts src/components/metadata/MetadataAdReviewSection.test.tsx electron/services/file-system-read/manageReviewStateStoreFactory.test.ts`
    - `npm run build`
- 风险/阻塞：
  - 当前 `performance_result.nonbody_hide_ids` 已在后端产出，但前端尚未在交互层落地“非正文组展示/应用动作”分流，待 Phase D 接入。
- 下一阶段入口：
  - 进入 Phase D：前端审核交互门控与结果分组展示（AD/C 门控、H 模式锁定、popover 控件裁剪、组间换行）。

### Phase D 执行记录

- 执行日期：2026-03-04
- 变更文件：
  - `src/components/metadata/MetadataAdReviewSection.tsx`
  - `src/components/ImageMainAdReviewControls.tsx`
  - `src/components/ImageMainSection.types.ts`
  - `src/components/ImageMainSection.tsx`
  - `src/components/ImageMainSectionContentArea.tsx`
  - `src/components/ImageMainSection.renderers.tsx`
  - `src/features/app/buildImageMainSectionProps.ts`
  - `src/features/app/buildMetadataPanelProps.ts`
  - `src/features/app/workspaceMetadataPanelProps.ts`
  - `src/features/app/workspaceAdReviewPageDerivations.ts`
  - `src/features/app/useManageAdReviewActions.ts`
  - `src/features/app/useAppWorkspaceProps.impl.ts`
  - `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`
- 结果摘要：
  - 前端门控已按执行模式生效：`performance` 下隐藏 AD/C 切换，策略按钮锁定为 H（`head-tail`），`normal` 下保持原交互。
  - 策略控件裁剪已完成：`performance` 下元数据面板与主工具栏策略弹层均移除 `tailStopClean`，并保留并发/头部/尾部三个控制项。
  - 结果分组已接入 `performance_result.nonbody_hide_ids`：结果页会同时纳入非正文项，并在同包内“非正文组 ↔ 疑似广告组”之间强制换行，同时保留既有包间换行。
  - 启动请求策略已加保护：`execution_mode=performance` 时，前端发起审核会强制发送 `head-tail` 策略，避免 UI 锁定与请求策略不一致。
  - 验证通过：
    - `npm run test -- src/components/metadata/MetadataAdReviewSection.test.tsx src/features/app/workspaceAdReviewPageDerivations.test.ts src/features/app/useManageAdReviewActions.test.ts`
    - `npm run build`
- 风险/阻塞：
  - 当前广告审核结果侧边栏节点计数仍以 `candidates` 为主，若后续需要在侧边栏显式展示“仅非正文命中且无疑似广告”的图包，可在后续阶段补充 `buildAdReviewSidebarState` 口径。
- 下一阶段入口：
  - 进入 Phase E：执行完整回归与质量门禁，并同步文档归档与 SSOT 章节。

### Phase E 执行记录

- 执行日期：2026-03-04
- 变更文件：
  - `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md`
  - `docs/ref/ad-review-data/RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md`
  - `docs/ref/ad-review-data/INDEX.md`
  - `docs/05-interaction-v1.md`
  - `docs/06-backend-integration-guardrails.md`
  - `docs/03-requirements-v1.md`
  - `src/__tests__/App.settings.test.tsx`
  - `src/features/app/useManageAdReviewActions.test.ts`
- 结果摘要：
  - 最小回归已覆盖 `normal/performance` 两条路径：
    - `normal` 回归：`src/__tests__/App.settings.test.tsx`（设置页入口文案与模型设置流程）通过。
    - `performance` 回归：`src/features/app/useManageAdReviewActions.test.ts` 新增断言，验证 `execution_mode=performance` 时会强制发送 `head-tail` 策略通过。
  - 质量门禁已全部通过：
    - `npm run format:check`
    - `npm run lint`
    - `npm run test`（`141 passed | 1 skipped`，共 `829 passed | 1 skipped`）
    - `npm run build`
  - 参考文档与 SSOT 已同步：交互规则、后端接入门禁、需求语义均已补齐 `performance` 模式约束。
- 风险/阻塞：
  - 无新增阻塞；全链路进入维护期。
- 收尾结论：
  - 本轮 Ad Review Performance 重实施 A-E 阶段全部完成，可按当前实现口径继续回归和后续迭代。

---

## 6. 新对话启动指令（复制即用）

### 通用模板

```text
按 docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md 执行，仅处理 Phase <A|B|C|D|E>。
先读取：
1) docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md
2) docs/ref/ad-review-data/START_HERE.md
3) docs/ref/ad-review-data/RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md
4) 当前 Phase 的“涉及文件”

要求：
- 只做当前 Phase，不提前实现后续 Phase。
- 完成后回填本计划文档中的对应 Phase 执行记录与勾选状态。
- 输出：变更文件清单、完成检查结果、下一 Phase 建议入口。
```

### Phase A 启动示例

```text
按 docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md 执行，仅处理 Phase A。
先完成实验复现与口径冻结，不改生产逻辑。
完成后回填 Phase A 执行记录。
```
