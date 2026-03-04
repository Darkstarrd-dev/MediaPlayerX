# Ad Review 导入哈希链路专家技术支持请求（2026-03-04）

## 0. 文档目的

- 汇总当前 `known-hash` 在 `stage=import` 链路的实现方式与已落地行为。
- 明确两项仍未收敛问题：
  1) Header Logo 红色告警闪烁未触发。
  2) 审核删除完成后，Import Task Panel 的待审核提示不自动清除。
- 提供复现路径、代码级定位、已知风险与专家咨询问题，便于快速给出可落地修复方案。

---

## 1. 当前目标与约束

- 目标：在导入阶段支持 known-hash 对比，并根据配置执行 `silent-delete` 或 `user-confirm`。
- 约束：
  - `user-confirm` 不阻塞导入，命中结果进入现有 Ad Review 队列。
  - Import 面板仅保留单条“待审核摘要提示”，不堆叠多条提示。
  - Header Logo 仅在“新待审核到达且任务面板未打开”时红闪，打开面板后停止。

---

## 2. 当前实现方式（代码事实）

## 2.1 后端：导入阶段命中 known-hash 的处理

- 入口：`electron/services/file-system-read/manageAdReviewService.ts`
  - `handleImportStageKnownHashHits(sourcePaths)`：导入完成后扫描新导入图片并计算 SHA-256。
  - `silent-delete`：直接调用删除服务，记录导入阶段日志 `manage_ad_review_import_stage_log_v1`。
  - `user-confirm`：将命中项封装为 `status=review` 的任务加入 `manage_ad_review_queue_v1`。
  - 为避免重复堆积，`enqueueImportHashReviewTask` 会按 `image_id` 与现有队列候选去重。
  - 仅在 `enqueued_count > 0` 时发出 `import-hash-review-updated` 事件。

## 2.2 前端：Import 面板待审核提示 + Header 红闪

- 聚合逻辑：`src/features/app/useAppTopLayerState.ts`
  - 数据源 A：`adReviewQueueTasks`（来自 `useManageAdReviewActions` 内存队列）。
  - 数据源 B：`adReviewQueueTasksFromState`（通过 `readAppState(manage_ad_review_queue_v1)` 读取持久化队列）。
  - `mergedAdReviewQueueTasks` 使用 `task_id` 合并并取 `updated_at_ms` 较新版本。
  - `pendingReviewTasks` 过滤 `task_id` 前缀 `manage-ad-review-import-` 且 `status=review` 且 `candidates.length > 0`。
  - `pendingReviewSummary` 以 `image_id` 去重后生成任务数/图片数摘要。

- 红闪状态机（同文件）：
  - `pendingReviewNoticeToken`：以“最新有效待审核任务 created_at_ms”作为 token。
  - `dismissedPendingReviewToken`：手动清除提示时记录已确认 token。
  - `lastImportPanelOpenedAtMs`：任务面板打开边沿更新为当前时间。
  - `importReviewAlerting = pendingNoticeVisible && token > lastImportPanelOpenedAtMs`。

- Header 呈现：
  - `src/features/app/buildAppHeaderProps.ts` 透传 `importReviewAlerting`。
  - `src/components/AppHeader.tsx` 在 Logo 按钮追加 `is-review-alert` class。
  - `src/styles/app/layout/layout.part1.css` 中 `.logo-btn.is-review-alert` 定义红色脉冲动画。

## 2.3 审核删除后队列与提示的清理链路

- 审核删除动作：`src/features/app/useManageAdReviewActions.ts`
  - `confirmDeleteSelectedCandidates()`：调用 `confirmManageAdReviewDelete` 后会执行 `removeTaskInternal(taskId)`，从 `manage_ad_review_queue_v1` 移除任务。
- 后端删除事件：`electron/services/file-system-read/managementMoveDeleteService.ts`
  - 删除成功时发出 `manage-delete-image-items`。
- 顶层监听：`src/features/app/useAppTopLayerState.ts`
  - 收到 `manage-delete-image-items` 时会触发一次 `loadAdReviewQueueTasksForNotice()`。

---

## 3. 已确认问题（最新）

## 3.1 问题 A：Header Logo 红色闪烁仍不触发

- 用户反馈：在存在新的导入待审核任务时，Header Logo 仍然不闪。
- 影响：无法通过顶层强提醒感知“有新待审核到达”，需要手动打开面板确认。

## 3.2 问题 B：审核删除完成后，Import Task Panel 待审核提示不自动清除

- 用户反馈：执行审核删除后，面板中的待审核摘要仍存在，需要手动清除。
- 影响：提示与实际队列状态不一致，造成“误报待处理”的 UX 偏差。

---

## 4. 复现步骤（建议专家按此复核）

## 4.1 复现问题 A（不闪）

1. 设置：`adReviewHashCompareStage=import`，`adReviewHashHitAction=user-confirm`。
2. 导入包含 known-hash 命中图片的包。
3. 确认任务面板关闭状态下，观察 Header Logo 是否出现红色脉冲。
4. 实际：用户侧“依然不闪”。

## 4.2 复现问题 B（删除后不自动清除）

1. 在上述配置下导入并生成待审核任务。
2. 打开审核面板，执行删除确认（删掉该待审核任务对应候选）。
3. 返回 Import Task Panel，观察“待审核摘要提示”是否自动消失。
4. 实际：提示仍保留，需手工点清除。

---

## 5. 当前代码级风险点与假设

## 5.1 队列双数据源合并可能导致“已删任务残留”

- `useAppTopLayerState.ts` 同时使用内存队列 + 持久化队列快照并做并集合并。
- 在删除流程中，`manage-delete-image-items` 事件可能先触发一次 state reload，随后前端再执行 `removeTaskInternal()` 写队列。
- 若删除后的队列变化未再次触发 reload，`adReviewQueueTasksFromState` 可能保留旧任务，导致 `pendingReviewSummary` 不归零。

## 5.2 红闪 token 依赖“最新有效任务时间戳”，对残留数据敏感

- 红闪由 `pendingReviewNoticeToken` 与 `lastImportPanelOpenedAtMs` 比较驱动。
- 若 pending 摘要计算受旧任务残留影响，token 可能不按预期重置或递增，造成红闪状态机失效。

## 5.3 缺少针对该状态机的专门测试

- 当前仓库无针对 `pendingReviewNoticeToken / importReviewAlerting` 的单测。
- 当前仓库无“删除后提示自动清除”的端到端或集成断言。

---

## 6. 希望专家给出的结论与方案

请专家按以下问题给出建议（按优先级排序）：

1. **单一事实源 (Single Source of Truth)**
   - Import 面板待审核提示应只依赖哪一类队列数据（内存队列、持久化队列、或统一事件流）？
2. **事件时序与幂等策略**
   - 审核删除完成后，如何设计最小改动的“确定性刷新”机制，保证提示必然自动清除？
3. **告警状态机重构建议**
   - 红闪应基于“递增序列号/事件版本号”还是“任务时间戳”？
   - 如何避免面板开关、手动清除、重复导入导致的误抑制？
4. **最小可落地修复（P0）**
   - 期望给出 2-3 个最小改动点，优先修复“不闪”和“删除后不清”两项。
5. **回归测试矩阵（必须）**
   - 覆盖：首次导入命中、重复导入、面板开关、审核删除、手动清除、应用重启后状态一致性。

---

## 7. 涉及文件清单（按链路分组）

## 7.1 后端导入哈希与队列

- `electron/services/file-system-read/manageAdReviewService.ts`
- `electron/services/file-system-read/manageAdReviewStateStore.ts`
- `electron/services/file-system-read/managementMoveDeleteService.ts`
- `electron/services/file-system-read/fileSystemReadFacadeEvents.ts`

## 7.2 前端顶层状态与审核动作

- `src/features/app/useAppTopLayerState.ts`
- `src/features/app/useManageAdReviewActions.ts`
- `src/features/app/buildImportTaskPanelProps.ts`
- `src/features/app/buildAppHeaderProps.ts`

## 7.3 UI 组件与样式

- `src/components/ImportTaskPanel.tsx`
- `src/components/AppHeader.tsx`
- `src/styles/app/layout/layout.part1.css`
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
- `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`

## 7.4 协议与接线（背景）

- `electron/channels.ts`
- `electron/registerBackendIpcHandlers.ts`
- `electron/preload.ts`
- `src/contracts/backend.schemas.ts`
- `src/contracts/backend.types.ts`
- `src/backend-api.d.ts`
- `src/features/backend/repository/types.ts`
- `src/features/backend/repository/realRepository.ts`

---

## 8. 当前请求结论

- 现阶段功能主链路已具备，但“红闪告警”与“删除后自动清除提示”仍未收敛。
- 这两个问题本质上都与“队列状态聚合 + 事件时序 + 告警 token 状态机”相关。
- 请求专家提供最小改动可落地方案，并附带可执行回归测试矩阵。
