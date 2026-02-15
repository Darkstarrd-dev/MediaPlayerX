# AI 广告审核模式修正实施计划 (v1)

Last updated: 2026-02-15

本计划用于修复以下 5 个已确认问题（广告审核模式）：

1. 审核中进度/审计文案不更新（长期停留 `0/总数`）
2. 审核中左侧 sidebar 不能渐进显示疑似结果
3. 重启后 focus 模式下 sidebar 数字正常但缩略图为空
4. focus 模式中间目录未做路径压缩拼接（与正常目录不一致）
5. focus 模式父级目录计数与点击聚合行为不符合预期

---

## 执行总约束

- 分阶段执行：`Phase N` 完成并通过测试后，才允许进入 `Phase N+1`
- 最小读取：每个 Phase 只读取该 Phase 指定文件，避免上下文膨胀
- 单阶段自洽：每个 Phase 包含目标、TODO、checklist、测试、提交推送
- 测试门禁：测试未通过，不允许提交
- Git 门禁：每个 Phase 完成后单独提交并推送

术语约定：
- 运行时任务 (runtime task)
- 应用状态 (app state)
- 焦点模式 (focus mode)

---

## 新对话启动提示词（总模板）

```text
你现在执行 docs/ad-review-audit-mode-fix-implementation-plan.md 的 <PHASE_ID>。

强约束：
1) 只读取该 Phase 的“仅读文件列表”，不要额外扩读。
2) 按该 Phase 的 TODO 和 checklist 实施，不做跨 Phase 改动。
3) 先跑该 Phase 测试；测试通过后再 commit + push。
4) 输出：
   - 改动文件列表
   - checklist 勾选结果
   - 测试命令与结果
   - commit hash 与 push 结果
```

---

## Phase 1 - 修复审核中进度/审计实时刷新

### 目标

- 让队列按钮、进度文本、审计文本在 `running` 期间实时更新
- 以 runtime task 数据覆盖 queue 持久化快照，避免 `0/总数` 卡死

### 仅读文件列表

- `src/features/app/useManageAdReviewActions.ts`
- `src/components/metadata/MetadataAdReviewSection.tsx`
- `src/contracts/backend.ts`

### TODO

1. 在 `loadQueueTasks()` 内增加 running 任务实时覆盖逻辑：
   - 当检测到 `runningTaskId` 且 `repository.readManageAdReviewTask` 可用时，额外读取该任务
   - 用 runtime task 覆盖 `queueTasks` 中同 `task_id` 条目
2. 保持当前 `readAppState` 作为队列基线来源；仅对 running 项做覆盖，不重排队列顺序
3. 避免对 `pending/paused/review/failed` 任务做无意义重复请求

### Checklist

- [ ] 轮询时 running 项的 `reviewed_count/progress/audit` 可实时变化
- [ ] 队列按钮文本从 `0/x` 正常递增
- [ ] `manage-ad-review-progress` 与 `manage-ad-review-audit` 同步变化
- [ ] 非 running 任务不触发额外读取

### 测试

- 新增/补充：`src/features/app/useManageAdReviewActions.test.ts`
- 回归：`src/components/metadata/MetadataAdReviewSection.test.tsx`
- 命令：

```bash
npm run test -- src/features/app/useManageAdReviewActions.test.ts src/components/metadata/MetadataAdReviewSection.test.tsx
```

### 提交与推送

```bash
git add src/features/app/useManageAdReviewActions.ts src/features/app/useManageAdReviewActions.test.ts src/components/metadata/MetadataAdReviewSection.test.tsx
git commit -m "fix(ad-review): sync running task progress from runtime state"
git push
```

### Phase 2 启动提示词

```text
执行 Phase 2。只读取 Phase 2 列出的文件。不要修改 Phase 1 已完成逻辑，除非编译或测试明确要求。
```

---

## Phase 2 - 修复审核中渐进式疑似结果（focus 可在 running 使用）

### 目标

- 审核进行中即可逐步形成候选疑似结果
- focus 模式不再强依赖 `status === review`

### 仅读文件列表

- `electron/manageAdReview/types.ts`
- `electron/manageAdReview/adReviewEngine.ts`
- `electron/manageAdReview/adReviewEngine.test.ts`
- `electron/services/file-system-read/manageAdReviewService.ts`
- `electron/services/file-system-read/manageAdReviewService.test.ts`
- `src/features/app/workspaceAdReviewSidebarContext.ts`
- `src/features/app/buildAdReviewSidebarState.ts`
- `src/components/metadata/MetadataAdReviewSection.tsx`
- `src/components/metadata/MetadataAdReviewSection.test.tsx`

### TODO

1. 扩展 `image-reviewed` 事件载荷，至少包含：
   - `hash`
   - `reason`
2. 在 `adReviewEngine` 发出事件时透传上述字段
3. 在 `manageAdReviewService` 的 `onEvent(image-reviewed)` 中：
   - 继续更新计数/审计
   - 当 `status==='suspected'` 时，增量 upsert 到 `task.candidates`
4. 放开 focus 结果模式 gate：
   - `workspaceAdReviewSidebarContext` 不再要求 `status==='review'`
   - 只要有候选即可进入 ad-review 结果树
5. 面板行为：
   - `focus/return` 在 `running/paused/review` 可见（可按是否有候选控制禁用）

### Checklist

- [ ] 运行中候选数量可增长
- [ ] 左侧 sidebar 在运行中可看到新增疑似分布
- [ ] 事件载荷新增字段后类型检查通过
- [ ] 不影响暂停、失败、完成状态迁移

### 测试

- 更新：`electron/manageAdReview/adReviewEngine.test.ts`（事件字段断言）
- 更新：`electron/services/file-system-read/manageAdReviewService.test.ts`（运行中候选增量）
- 更新：`src/components/metadata/MetadataAdReviewSection.test.tsx`（running 时 focus 行为）
- 命令：

```bash
npm run test -- electron/manageAdReview/adReviewEngine.test.ts electron/services/file-system-read/manageAdReviewService.test.ts src/components/metadata/MetadataAdReviewSection.test.tsx
```

### 提交与推送

```bash
git add electron/manageAdReview/types.ts electron/manageAdReview/adReviewEngine.ts electron/manageAdReview/adReviewEngine.test.ts electron/services/file-system-read/manageAdReviewService.ts electron/services/file-system-read/manageAdReviewService.test.ts src/features/app/workspaceAdReviewSidebarContext.ts src/features/app/buildAdReviewSidebarState.ts src/components/metadata/MetadataAdReviewSection.tsx src/components/metadata/MetadataAdReviewSection.test.tsx
git commit -m "fix(ad-review): stream suspected candidates during running focus"
git push
```

### Phase 3 启动提示词

```text
执行 Phase 3。仅处理 focus 树结构/计数语义/父级聚合展示，不处理媒体 URL 解析链路。
```

---

## Phase 3 - 修复 focus 树路径压缩、父级计数与聚合过滤

### 目标

- focus 树的中间目录路径压缩行为对齐正常目录
- 父级目录显示“疑似图片总数”
- 点击父级目录展示该父级子树全部疑似图片

### 仅读文件列表

- `src/features/app/buildAdReviewSidebarState.ts`
- `src/features/app/buildAdReviewSidebarState.test.ts`
- `src/features/app/workspaceAdReviewPageDerivations.ts`
- `src/features/app/useImageSidebarBaseState.ts`
- `src/components/SidebarPanel.tsx`
- `src/types.ts`

### TODO

1. 在 focus 树构建后增加目录压缩（复用或等价实现 `compactImageSidebarTree`）
2. 为 focus 节点补齐 `imageNodeType`（folder/package）
3. 计数语义修正：
   - 父级显示疑似图片总数
   - 可通过 `descendantNodeCount=descendantImageCount` 或面板逻辑特判实现
4. `workspaceAdReviewPageDerivations` 的 folder 判定改为稳健条件：
   - 不依赖缺失字段时仍可按 `pathKey` 前缀聚合过滤

### Checklist

- [ ] 中间目录显示为压缩路径（例如 `A/B/C`）
- [ ] 父级数字为疑似图片总数
- [ ] 点击父级后主视图展示子树全部疑似图片
- [ ] 包节点点击仍只展示该包疑似图片

### 测试

- 更新：`src/features/app/buildAdReviewSidebarState.test.ts`
- 新增：`src/features/app/workspaceAdReviewPageDerivations.test.ts`
- 命令：

```bash
npm run test -- src/features/app/buildAdReviewSidebarState.test.ts src/features/app/workspaceAdReviewPageDerivations.test.ts
```

### 提交与推送

```bash
git add src/features/app/buildAdReviewSidebarState.ts src/features/app/buildAdReviewSidebarState.test.ts src/features/app/workspaceAdReviewPageDerivations.ts src/features/app/workspaceAdReviewPageDerivations.test.ts src/components/SidebarPanel.tsx
git commit -m "fix(ad-review): align focus sidebar compaction counts and subtree filtering"
git push
```

### Phase 4 启动提示词

```text
执行 Phase 4。重点修复“重启后 focus 缩略图为空”的 URL 解析链路，避免触碰 Phase 3 已稳定的树结构语义。
```

---

## Phase 4 - 修复重启后 focus 缩略图为空（解析链路对齐实际渲染 refs）

### 目标

- `useResolvedMediaState` 输入 refs 与主视图实际渲染 refs 一致
- focus 模式下重启后可正常解析并显示缩略图

### 仅读文件列表

- `src/features/app/useAppDisplayResources.ts`
- `src/features/app/workspaceAdReviewSidebarContext.ts`
- `src/features/app/workspaceAdReviewPageDerivations.ts`
- `src/features/app/workspaceImageDerivations.ts`
- `src/features/app/useResolvedMediaState.ts`
- `src/features/app/useAppWorkspaceProps.ts`

### TODO

1. 在 `useAppDisplayResources` 内构造 `refsInPageForResolve`：
   - 正常模式：保持现有 `refsInPageEffective`
   - ad-review focus 模式：使用与 workspace 同源派生（candidate + sidebar 过滤 + hideUnchecked）
2. 将 `refsInPageForResolve` 传给 `useResolvedMediaState`
3. 确认显示全部/隐藏未勾选 两种模式下都能拿到有效 `thumbnail target`

### Checklist

- [ ] 重启后进入 focus，缩略图可正常显示
- [ ] 切换“显示全部/隐藏未勾选”均不出现全空白
- [ ] 不影响 normal/vector 模式缩略图加载

### 测试

- 新增：`src/features/app/useAppDisplayResources.focus.test.tsx`
- 回归：`src/features/app/useResolvedMediaState.test.tsx`
- 命令：

```bash
npm run test -- src/features/app/useAppDisplayResources.focus.test.tsx src/features/app/useResolvedMediaState.test.tsx
```

### 提交与推送

```bash
git add src/features/app/useAppDisplayResources.ts src/features/app/useAppDisplayResources.focus.test.tsx src/features/app/useResolvedMediaState.test.tsx
git commit -m "fix(ad-review): resolve thumbnails from focus-derived refs after restart"
git push
```

### Phase 5 启动提示词

```text
执行 Phase 5。仅做联调验收与文档回填，不新增功能。
```

---

## Phase 5 - 联调验收与文档回填

### 目标

- 完成 5 个问题的端到端回归
- 回填计划文档状态，确保新会话可继续执行

### 仅读文件列表

- `docs/ad-review-audit-mode-fix-implementation-plan.md`
- `docs/ad-review-queue-implementation-plan.md`
- `src/features/app/useManageAdReviewActions.ts`
- `src/features/app/buildAdReviewSidebarState.ts`
- `src/features/app/useAppDisplayResources.ts`
- `electron/services/file-system-read/manageAdReviewService.ts`

### TODO

1. 端到端手测：
   - 审核中进度/审计实时更新
   - 审核中 focus 渐进结果
   - 重启后 focus 缩略图正常
   - focus 路径压缩、父级计数、父级聚合展示正确
2. 回填本计划 checklist（可在每个 Phase 追加完成说明）

### Checklist

- [ ] 5 个问题全部复现关闭
- [ ] 关键用例无回归
- [ ] 文档已回填并可用于新会话继续执行

### 测试

```bash
npm run test -- src/features/app/useManageAdReviewActions.test.ts src/components/metadata/MetadataAdReviewSection.test.tsx src/features/app/buildAdReviewSidebarState.test.ts src/features/app/workspaceAdReviewPageDerivations.test.ts src/features/app/useAppDisplayResources.focus.test.tsx electron/services/file-system-read/manageAdReviewService.test.ts
npm run build
```

### 提交与推送

```bash
git add docs/ad-review-audit-mode-fix-implementation-plan.md docs/ad-review-queue-implementation-plan.md
git commit -m "docs(ad-review): finalize audit-mode fix execution records"
git push
```

---

## 执行顺序门禁（必须满足）

- Gate 1: Phase 1 测试通过 + commit + push
- Gate 2: Phase 2 测试通过 + commit + push
- Gate 3: Phase 3 测试通过 + commit + push
- Gate 4: Phase 4 测试通过 + commit + push
- Gate 5: Phase 5 测试通过 + commit + push

未通过任意 Gate，不得进入下一阶段。
