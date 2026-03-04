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

- 现阶段功能主链路已具备，但”红闪告警”与”删除后自动清除提示”仍未收敛。
- 这两个问题本质上都与”队列状态聚合 + 事件时序 + 告警 token 状态机”相关。
- 请求专家提供最小改动可落地方案，并附带可执行回归测试矩阵。

---

## 9. 专家诊断结论（2026-03-04）

### 9.0 总体判断

两个问题的核心根因均为 **双数据源合并（`adReviewQueueTasks` + `adReviewQueueTasksFromState`）与事件时序不一致**。具体来说，持久化队列快照 `adReviewQueueTasksFromState` 的刷新时机依赖事件驱动，但关键写操作（如 `removeTaskInternal`）完成后**不会触发重新加载**，导致合并结果残留已失效的任务数据。

---

### 9.1 问题 B 根因（审核删除后提示不自动清除）— 确定性根因

**根因：`adReviewQueueTasksFromState` 在任务被移除前加载，且移除后无事件触发重新加载。**

完整时序如下：

```
T0: 用户点击删除确认 → confirmDeleteSelectedCandidates() 开始
T1: 前端调用 IPC confirmManageAdReviewDelete
T2: 后端 deleteImageItems() 执行 → 删除文件
T3: 后端 emitLibraryChanged({ reason: “manage-delete-image-items” }) ← 事件发出
T4: 后端 updateQueueTask() → 更新持久化队列（任务仍存在，candidates 减少）
T5: 后端返回 IPC 响应
    ──────────────────────────────────────────────────
T3': 前端收到 “manage-delete-image-items” 事件
     → loadAdReviewQueueTasksForNotice() → 读取持久化队列
     → ⚠️ 此时读到的是 T3 时刻的数据（T4 的 updateQueueTask 尚未执行）
     → adReviewQueueTasksFromState = 旧版本任务（含全部 candidates）
    ──────────────────────────────────────────────────
T6: 前端收到 IPC 响应，执行：
     → updateTaskInQueue(response.task)     — 更新内存队列 ✓
     → loadQueueTasks({ silent: true })     — 重载内存队列 ✓
     → removeTaskInternal(taskId)           — 从持久化 + 内存移除任务 ✓
T7: removeTaskInternal 完成，写入持久化队列（任务已删除）
    但 ⚠️ 无事件触发 loadAdReviewQueueTasksForNotice() 重新加载
```

**结果：**
- `adReviewQueueTasks`（内存队列，来自 `useManageAdReviewActions`）：任务已正确移除 ✓
- `adReviewQueueTasksFromState`（持久化快照，来自 `useAppTopLayerState`）：**保留 T3' 时刻加载的旧任务** ✗
- `mergedAdReviewQueueTasks` 合并逻辑（`useAppTopLayerState.ts:586-598`）：先加载 `adReviewQueueTasksFromState`（含旧任务），再用 `adReviewQueueTasks` 覆盖同 ID 更新版本。由于内存队列已不含该任务，无法覆盖 → **旧任务残留在合并结果中**
- `pendingReviewTasks` 仍能匹配残留任务 → `pendingReviewSummary` 不归零 → 提示不消失

**涉及代码：**
- `useManageAdReviewActions.ts:1194` — `removeTaskInternal` 不发出任何事件
- `useAppTopLayerState.ts:774-776` — `manage-delete-image-items` 事件监听，在任务移除前触发加载
- `useAppTopLayerState.ts:586-598` — 合并逻辑无法清除仅存于 `adReviewQueueTasksFromState` 中的残留任务

---

### 9.2 问题 A 根因（红闪不触发）— 高置信度推断

经过完整链路追踪，红闪状态机逻辑本身是正确的：

- 任务 ID 前缀 `manage-ad-review-import-`（`manageAdReviewService.ts:978`）与过滤条件（`useAppTopLayerState.ts:604`）**匹配** ✓
- Zod schema 验证路径正确 ✓
- `pendingReviewNoticeToken` 设置逻辑正确 ✓
- `importReviewAlerting` 计算逻辑正确 ✓
- CSS 动画定义正确（`layout.part1.css:258-277`）✓
- `buildAppHeaderProps` 透传正确（`buildAppHeaderProps.ts:79`）✓
- `AppHeader.tsx` class 绑定正确（`AppHeader.tsx:462`）✓

**最可能的根因是问题 B 的衍生效应：**

当用户执行过一次删除操作后，`adReviewQueueTasksFromState` 残留旧任务（问题 B）。此时 `pendingReviewNoticeToken` 被设为旧任务的 `created_at_ms`。用户在操作过程中打开过面板，`lastImportPanelOpenedAtMs` 被更新为接近当前的时间戳。

随后的新导入产生新任务时：
1. `import-hash-review-updated` 事件触发 `loadAdReviewQueueTasksForNotice()`
2. 新任务进入 `adReviewQueueTasksFromState`
3. `pendingReviewSummary.latestEffectiveCreatedAtMs` 更新为新任务的 `created_at_ms`
4. `pendingReviewNoticeToken` 通过 `Math.max(previous, latestCreatedAtMs)` 更新

但如果残留旧任务的 `created_at_ms` 与新任务的 `created_at_ms` 存在交叉（例如旧任务残留导致 token 未正确重置），或者用户在两次导入之间打开过面板使 `lastImportPanelOpenedAtMs` > 新 token，则 `importReviewAlerting` 为 `false`。

**另一个可能的根因：`pendingReviewNoticeToken` 使用 `useEffect` 延迟设置。**

`pendingReviewNoticeToken` 通过 `useEffect`（`useAppTopLayerState.ts:681-698`）更新，而非 `useMemo`。这导致：
- 当 `adReviewQueueTasksFromState` 更新后，第一次 render 中 `mergedAdReviewQueueTasks` → `pendingReviewTasks` → `pendingReviewSummary` 全部正确计算
- 但 `pendingReviewNoticeToken` 仍为旧值（`null` 或旧时间戳）
- `importReviewAlerting` 在第一次 render 为 `false`
- `useEffect` 在 render 后执行，更新 `pendingReviewNoticeToken` → 触发第二次 render
- 第二次 render 中 `importReviewAlerting` 才为 `true`

**这个两次 render 延迟本身不应导致”永不触发”，但如果与其他状态更新（如面板开关、导入完成通知等）产生竞态，可能导致 token 在第二次 render 前被覆盖或面板状态已改变。**

---

### 9.3 单一事实源建议

**建议：Import 面板待审核提示应仅依赖持久化队列（`adReviewQueueTasksFromState`），不应做双源合并。**

理由：
- 导入阶段 known-hash 审核任务仅在后端创建和管理，前端 `useManageAdReviewActions` 的内存队列是为用户交互式审核设计的
- 双源合并是问题 B 的直接根因，且增加了状态一致性维护的复杂度
- 前端通知只需要”是否有待审核任务”这一只读信息，不需要实时的内存队列

---

### 9.4 最小可落地修复方案（P0）

#### 修复点 1：`removeTaskInternal` 完成后强制刷新 `adReviewQueueTasksFromState`

**文件：** `src/features/app/useAppTopLayerState.ts`

**方案：** 在 `manage-delete-image-items` 事件处理中，增加延迟重新加载机制，确保在 `removeTaskInternal` 写入持久化后再读取。

```typescript
// useAppTopLayerState.ts — 事件监听部分（约 763-782 行）
// 现有代码：
if (payload.reason === “manage-delete-image-items”) {
  void loadAdReviewQueueTasksForNotice();
}

// 修改为：添加延迟二次加载，覆盖 removeTaskInternal 的写入
if (payload.reason === “manage-delete-image-items”) {
  void loadAdReviewQueueTasksForNotice();
  // removeTaskInternal 在 IPC 响应处理后异步执行，
  // 延迟再读一次以确保持久化状态已更新
  setTimeout(() => {
    void loadAdReviewQueueTasksForNotice();
  }, 300);
}
```

**更优的替代方案：** 让 `removeTaskInternal` 完成后主动通知 `useAppTopLayerState` 刷新。

```typescript
// useManageAdReviewActions.ts — removeTaskInternal 完成后
// 在 setQueueTasks 之后（约 1042 行）添加事件通知：

setQueueTasks((previous) =>
  previous.filter((item) => item.task_id !== taskId),
);
// 新增：通知顶层状态刷新持久化快照
onQueueTaskRemoved?.();
```

在 `useAppTopLayerState` 接收此回调并调用 `loadAdReviewQueueTasksForNotice()`。

#### 修复点 2：将 `pendingReviewNoticeToken` 从 `useEffect` 改为同步计算

**文件：** `src/features/app/useAppTopLayerState.ts`

**方案：** 将 token 的设置从 `useEffect` 改为 `useRef` + 同步计算，消除两次 render 延迟：

```typescript
// 替换 useEffect 方案（约 681-698 行），改为 useRef 管理
const pendingReviewNoticeTokenRef = useRef<number | null>(null);

const latestEffective = pendingReviewSummary.latestEffectiveCreatedAtMs;
if (latestEffective <= 0) {
  pendingReviewNoticeTokenRef.current = null;
  // 同步重置 dismissed token
} else if (pendingReviewNoticeTokenRef.current === null) {
  pendingReviewNoticeTokenRef.current = latestEffective;
} else {
  pendingReviewNoticeTokenRef.current = Math.max(
    pendingReviewNoticeTokenRef.current,
    latestEffective,
  );
}
const pendingReviewNoticeToken = pendingReviewNoticeTokenRef.current;
```

这样 `importReviewAlerting` 在第一次 render 就能正确计算，消除竞态窗口。

#### 修复点 3：合并逻辑改进 — 已删除任务不参与合并

**文件：** `src/features/app/useAppTopLayerState.ts`

**方案：** 在 `mergedAdReviewQueueTasks` 合并逻辑中，如果 `adReviewQueueTasks`（内存队列）不含某任务但 `adReviewQueueTasksFromState`（持久化快照）包含，在内存队列已初始化（非空数组或已有加载记录）的前提下，**以内存队列为准移除该任务**：

```typescript
const mergedAdReviewQueueTasks = useMemo(() => {
  const taskById = new Map<string, ManageAdReviewTaskDto>();
  for (const task of adReviewQueueTasksFromState) {
    taskById.set(task.task_id, task);
  }
  // 内存队列中的任务覆盖持久化快照
  const memoryTaskIds = new Set(adReviewQueueTasks.map(t => t.task_id));
  for (const task of adReviewQueueTasks) {
    const previous = taskById.get(task.task_id);
    if (!previous || task.updated_at_ms >= previous.updated_at_ms) {
      taskById.set(task.task_id, task);
    }
  }
  // 如果内存队列已有数据（非初始空状态），
  // 则持久化快照中 “仅存于快照” 的 import 任务视为残留，过滤掉
  if (adReviewQueueTasks.length > 0) {
    for (const [taskId, task] of taskById) {
      if (
        task.task_id.startsWith(“manage-ad-review-import-”) &&
        !memoryTaskIds.has(taskId)
      ) {
        taskById.delete(taskId);
      }
    }
  }
  return Array.from(taskById.values());
}, [adReviewQueueTasks, adReviewQueueTasksFromState]);
```

> **注意：** 此方案有局限性 — 在 `useManageAdReviewActions` 尚未加载时（`adReviewQueueTasks` 为空），会误删合法的导入任务。因此修复点 1（刷新时机保证）是更根本的修复，修复点 3 是防御性补充。

---

### 9.5 推荐实施优先级

| 优先级 | 修复点 | 修复目标 | 影响范围 |
|--------|--------|----------|----------|
| P0 | 修复点 1 | 消除 `adReviewQueueTasksFromState` 残留 | 问题 B 根治，问题 A 衍生场景修复 |
| P0 | 修复点 2 | 消除 token 两次 render 延迟 | 问题 A 竞态窗口消除 |
| P1 | 修复点 3 | 防御性合并过滤 | 兜底方案，防止任何残留 |

---

### 9.6 回归测试矩阵

| 场景 | 前置条件 | 操作 | 预期结果 |
|------|----------|------|----------|
| 1. 首次导入命中 | 空队列，面板关闭 | 导入含 known-hash 命中图片 | Logo 红闪，面板显示待审核摘要 |
| 2. 首次导入命中（面板打开） | 空队列，面板打开 | 导入含 known-hash 命中图片 | 面板显示待审核摘要，Logo 不闪（面板已打开） |
| 3. 关闭面板后红闪 | 场景 2 之后 | 关闭面板 | Logo 红闪 |
| 4. 打开面板后停止红闪 | 场景 3 之后 | 打开面板 | Logo 停止红闪 |
| 5. 审核删除后提示自动清除 | 有待审核任务 | 选中所有候选 → 确认删除 | 面板待审核摘要自动消失 |
| 6. 审核删除后红闪停止 | 有待审核任务，Logo 红闪 | 打开面板 → 删除全部候选 | Logo 停止红闪 |
| 7. 重复导入去重 | 已有待审核任务 A | 再次导入相同图片 | 不产生重复任务 |
| 8. 手动清除提示 | 有待审核摘要 | 点击清除按钮 | 摘要消失，新导入再次触发 |
| 9. 部分删除 | 任务有 3 张候选 | 只删除 2 张 | 任务被整体移除，待审核提示根据剩余队列状态更新 |
| 10. 应用重启后一致性 | 有待审核任务 → 重启应用 | 启动后检查面板和 Logo | 与重启前一致（待审核摘要仍在，如未处理则 Logo 红闪） |
| 11. 空导入（无命中） | 空队列 | 导入不含命中的图片 | 无待审核任务，Logo 不闪 |
| 12. silent-delete 模式 | `hitAction=silent-delete` | 导入含命中图片 | 直接删除，无待审核任务，不触发红闪 |

---

### 9.7 附加建议

1. **添加 console.debug 日志**：在 `loadAdReviewQueueTasksForNotice` 的入口和出口添加日志（含加载到的任务数和 task_id 列表），便于在开发模式下追踪事件时序。
2. **后续重构方向**：中期考虑将 `pendingReviewNoticeToken` 改为基于递增序列号（而非任务时间戳），降低对时间戳比较的敏感度。序列号由后端在每次队列变更时递增并通过事件传播。
3. **端到端测试**：为”导入 → 命中 → 通知 → 删除 → 通知清除”这条完整链路编写集成测试，使用 `MockMediaRepository` 模拟后端事件流。
