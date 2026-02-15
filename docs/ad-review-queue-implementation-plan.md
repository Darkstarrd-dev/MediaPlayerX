# AI Ad Review Queue Implementation Plan (v1)

Last updated: 2026-02-15

This document is an execution plan for implementing a persistent AI ad-review queue.
It is written to be runnable in a fresh chat session without re-reading large parts of the codebase.

Rules for this plan
- Each phase is self-contained and ends with: tests -> update this doc -> git commit -> git push.
- Only 1 ad-review task is allowed to be `running` at any time.
- Keep per-image concurrency behavior as-is (existing `max_concurrency` setting).
- For sidebar-scope reviews, node completion is the atomic unit for persistence.

---

## Goals

1) Persist ad-review results in the database so that:
   - reviewed nodes do not trigger repeated review until the node changes (node hash changes)
   - results are visible after restart (no loss on unexpected interruption)
2) Ad-review results become a queue:
   - can continuously add items while another is running
   - can remove items
   - can switch/focus into any result item at any time
3) In result focus mode:
   - sidebar + thumbnails show only suspected-ad images for the focused queue item
   - for parent folders that contain packages/directories, do NOT show node-cover tiles; show aggregated suspected thumbnails
4) UX:
   - Header busy state is `busy` while an ad-review task is running
   - Ad-review continues while user switches mode / browses images
   - Non-manage mode: switching focused image by mouse or keyboard forces metadata panel into original-image view; Esc/right-click returns to data view

---

## Confirmed Decisions

- A) Focus does NOT auto-enable. User manually toggles focus.
- B) Do NOT destroy the result view after deletion. Results persist as queue items until removed.
- C) Auto original-image view:
  - applies only when `manageMode=false` AND `metadataManageMode=false`
  - mouse click + keyboard navigation both trigger switch to original-image
  - Esc or right-click exits original-image back to data view
- D) Only 1 ad-review item can be `running` at a time.
  - a new request while one is running becomes `pending`.
- E) Node-level persistence semantics (sidebar scope):
  - Node definition: a "node" means one normalized selected sidebar node id (from `selection_node_ids` after de-dup and removing descendants).
    - if the node is a folder node, its scan scope is all descendant image sources and images under that subtree.
    - if the node is a package/directory node, its scan scope is that single image source.
  - A node is marked as reviewed only after the node finishes scanning.
  - If the app crashes/power-loss happens while scanning a node, that node is NOT recorded as reviewed.
    - after restart, that node will be scanned again next time.
  - Nodes completed before the crash remain recorded and their results remain visible after restart.

---

## Current Implementation Pointers (baseline)

Backend
- Service: `electron/services/file-system-read/manageAdReviewService.ts`
  - runtime in-memory tasks: `private readonly tasks = new Map<string, RuntimeTaskState>()`
  - persistent known hashes only: `KNOWN_HASHES_STATE_KEY = 'manage_ad_review_known_hashes_v1'`
  - statuses currently: `running/paused/review/failed` (see `src/contracts/backend.ts`)

Frontend
- Hook: `src/features/app/useManageAdReviewActions.ts`
  - currently clears task & polling when leaving `manageMode` or `mode!=='image'`
- Panel: `src/components/metadata/MetadataAdReviewSection.tsx`
- Metadata panel wrapper: `src/components/MetadataPanel.tsx` (ad-review section is already moved to the top)
- Header busy style currently depends on `taskStatusLabel==='加载中'`:
  - state: `src/features/app/useImportTaskPanelState.ts`
  - render: `src/components/AppHeader.tsx`

Sidebar + thumbnails
- Sidebar component: `src/components/SidebarPanel.tsx`
- Node-browse cover view for folders: `src/features/app/workspaceImageDerivations.ts` + `src/components/ImageMainSection.tsx`

---

## Data Model (v1)

### 1) Queue

Persisted in DB (app_state) and mirrored in memory.

App state keys
- `manage_ad_review_queue_v1`
- `manage_ad_review_reviewed_nodes_v1`
- `manage_ad_review_known_hashes_v1` (already exists)

Queue item shape (conceptual, JSON persisted)
```ts
type ManageAdReviewQueueItemStatus = 'pending' | 'running' | 'paused' | 'review' | 'failed'

type ManageAdReviewQueueItem = {
  task_id: string
  status: ManageAdReviewQueueItemStatus
  created_at_ms: number
  updated_at_ms: number

  // selection as requested by user
  selection_scope: 'image' | 'sidebar'
  selection_image_ids: string[]
  selection_node_ids: string[]

  // resolved scope after filtering reviewed nodes (optional but useful)
  effective_image_ids_count: number
  effective_node_ids: string[]
  skipped_node_ids: string[]

  // execution config snapshot (so queued items are reproducible)
  llm_endpoint: string
  llm_model: string
  execution: {
    strategy: { mode: 'all' } | { mode: 'head-tail'; head_n: number; tail_n: number; tail_stop_clean_streak: number }
    max_concurrency: number
  }

  // progress
  progress: number
  total_count: number
  reviewed_count: number
  suspected_count: number
  failed_count: number
  known_hash_hits: number
  llm_calls: number
  message: string | null
  error_detail: string | null

  // review outputs
  candidates: Array<{
    image_id: string
    package_id: string
    package_name: string
    display_name: string
    ordinal: number
    file_name: string | null
    reason: string
    source: 'known-hash' | 'llm'
    hash: string
  }>

  image_source_by_id: Record<string, 'known-hash' | 'llm' | 'llm-error' | 'strategy-skip'>
}

type ManageAdReviewQueue = {
  version: 1
  items: ManageAdReviewQueueItem[]
}
```

### 2) Reviewed Node Index

Purpose: avoid repeating reviews for unchanged nodes.

Reviewed index shape (conceptual, JSON persisted)
```ts
type ReviewedNodeIndex = {
  version: 1
  node_hash_by_id: Record<string, { node_hash: string; updated_at_ms: number }>
}
```

Node hash definition (recommended v1)
- `node_hash` is computed from snapshot metadata (no file bytes read):
  - stable digest of the node's image list signature, e.g.
    - `image.id`
    - `image.size_kb`
    - `image.media_locator.kind` + `absolute_path|archive_path|entry_name`
- This detects add/remove/relocate/most changes cheaply.
- If strict byte-level detection is required later, introduce per-image sha256 storage at ingest time (out of scope for v1).

Persistence semantics (crash safety)
- Queue item results should be persisted at node boundaries (after a node completes) so completed nodes survive crashes.
- Reviewed-node index MUST be persisted only at node completion.
  - Do not update reviewed-node index for partially scanned nodes.
- On restart, any queue item left in `running` becomes `paused`.
  - resuming will re-scan the last in-progress node because it was not marked as reviewed.

---

## Execution Phases

### Phase 1 - Backend: Persist Queue + Enforce Single Running

Outcome
- Backend persists queue + reviewed-node index.
- `startManageAdReview` enqueues items; if idle starts immediately else creates `pending`.
- Only 1 `running` is possible.
- On completion (running -> review/failed), backend auto-starts next `pending` (FIFO).
- On pause, backend does NOT auto-start next.
- On restart:
  - any item left in `running` is converted to `paused` (best-effort).
  - only nodes fully completed before the interruption are present in reviewed-node index.

Files to touch
- `src/contracts/backend.ts`
  - extend `manageAdReviewTaskStatusSchema` to include `pending`
  - optionally add/adjust schemas if we decide to expose queue via typed endpoints (see Phase 2)
- `electron/services/file-system-read/manageAdReviewService.ts`
  - introduce app_state persistence:
    - read/write `manage_ad_review_queue_v1`
    - read/write `manage_ad_review_reviewed_nodes_v1`
  - implement enqueue + auto-run FIFO
  - implement reviewed-node skip in sidebar scope
  - update `confirmManageAdReviewDelete` to update reviewed-node hashes for affected nodes
- `electron/services/file-system-read/manageAdReviewService.utils.ts`
  - add helpers:
    - compute node hash from snapshot metadata
    - map selection node -> effective source ids / image ids
- (If needed) `electron/manageAdReview/adReviewEngine.ts`
  - only if we add incremental persistence hooks beyond current `onEvent`

Implementation checklist
- [x] Define and document app_state keys (`queue_v1`, `reviewed_nodes_v1`).
- [x] Add queue load/save helpers in `ManageAdReviewService`.
- [x] On service init / first call, normalize persisted queue:
  - [x] items with `status==='running'` -> `paused`.
- [x] Implement `enqueueOrStart(request)` behavior:
  - [x] if a `running` task exists -> create `pending` item
  - [x] else -> create item and start (status `running`)
- [x] Reviewed-node skip (sidebar scope only):
  - [x] compute node_hash for each selected node
  - [x] if `node_hash` unchanged vs reviewed index -> add to `skipped_node_ids` and exclude from effective selection
  - [x] if effective selection empty -> mark item as `review` with message `已审核(未变更)，无需执行`
- [x] Normalize sidebar node targets (sidebar scope only):
  - [x] remove descendant nodes if an ancestor node is also selected (avoid double-scanning overlaps)
- [x] Execute sidebar scope node-by-node (atomic commit per node):
  - [x] process `effective_node_ids` sequentially
  - [x] for each node:
    - [x] resolve its effective image ids
    - [x] run ad-review engine for this node (keep existing per-image concurrency)
    - [x] append results to the queue item and persist `manage_ad_review_queue_v1`
    - [x] compute and persist reviewed-node hash for this node in `manage_ad_review_reviewed_nodes_v1`
  - [x] if crash happens mid-node: no reviewed-node record exists for that node; it will be re-scanned next time
- [x] During running (optional live progress):
  - [x] keep in-memory progress updates via existing `onEvent(image-reviewed)` for UI
  - [x] do NOT persist partial node results as reviewed-node records
- [x] On task completion:
  - [x] status -> `review` or `failed`
  - [x] persist final queue item state
  - [x] if completed to `review` or `failed`, start next pending (FIFO)
- [x] On pause:
  - [x] status -> `paused`
  - [x] persist
- [x] On delete confirmation:
  - [x] keep existing known-hash persistence
  - [x] update queue item candidates + counts
  - [x] recompute node_hash for effective nodes and write reviewed index

Tests
- Add unit tests:
  - `electron/services/file-system-read/manageAdReviewQueue.test.ts` (new) or `manageAdReviewService.test.ts` (new)
    - [x] enqueue while running -> pending
    - [x] finish running -> auto-start next pending
    - [x] pause running -> does not auto-start next (running 残留在重启后会归一为 paused)
    - [x] reviewed-node skip excludes unchanged nodes
    - [x] delete confirmation updates reviewed-node index

Verify
- [x] `npm run test -- electron/services/file-system-read/manageAdReviewService.test.ts`
- [x] `npm run build`

Doc + Git
- [x] Update this doc: mark Phase 1 done.
- [ ] Commit message suggestion: `feat(ad-review): persist queue and reviewed-node index`
- [ ] `git push`

Phase 1 completion notes
- Added persistence keys and queue/reviewed-node storage implementation in backend service.
- Added node-level atomic persistence semantics for sidebar scope.
- Added regression/unit tests in `electron/services/file-system-read/manageAdReviewService.test.ts`.

---

### Phase 2 - Frontend: Queue UI + Global Polling + Header Busy

Outcome
- Ad-review panel shows queue items (pending/running/paused/review/failed).
- User can add new queue items while another is running.
- Polling is not tied to manageMode/mode; ad-review continues in background.
- Header busy reflects ad-review running state.

Files to touch
- `src/features/app/useManageAdReviewActions.ts`
  - refactor to be queue-driven
  - polling reads queue state (either via typed API or `readAppState`)
- `src/components/metadata/MetadataAdReviewSection.tsx`
  - render queue list + select active item
  - actions:
    - [ ] enqueue/start
    - [ ] pause
    - [ ] remove queue item
    - [ ] focus/return toggle (manual)
- `src/features/app/useAppWorkspaceProps.ts`
  - map queue state to `metadataPanelProps` (active queue item)
- `src/features/app/useAppSessionState.ts`
  - add UI-only state:
    - [ ] `adReviewFocusTaskId: string | null`
- `src/features/app/buildAppHeaderProps.ts`
- `src/components/AppHeader.tsx`
- `src/features/app/useImportTaskPanelState.ts`
  - switch from `taskStatusLabel === '加载中'` to an explicit busy boolean:
    - [ ] `importBusy` (existing)
    - [ ] `adReviewBusy` (derived from queue)
    - [ ] `taskStatusBusy = importBusy || adReviewBusy`

Implementation checklist
- [ ] Create a single source of truth for queue in UI:
  - [ ] `queueItems: ManageAdReviewQueueItem[]`
  - [ ] `activeTaskId`
  - [ ] `runningTaskId`
- [ ] Polling rule:
  - [ ] poll every 1s while `runningTaskId != null`
  - [ ] stop polling otherwise
- [ ] Enqueue action:
  - [ ] uses current selection (sidebar/image) and current vision settings
  - [ ] backend returns new task_id and initial status
- [ ] Focus toggle:
  - [ ] `focus` sets `adReviewFocusTaskId=activeTaskId`
  - [ ] `return` sets null
- [ ] Header busy:
  - [ ] busy style uses boolean, not string label
  - [ ] label can become: `加载中` / `审核中` / `空闲`

Tests
- Unit/UI tests:
  - `src/features/app/useManageAdReviewActions.test.ts` (new): polling + state transitions
  - `src/components/MetadataPanel.test.tsx` or `MetadataAdReviewSection.test.tsx` (new): queue render + focus toggle
  - `src/features/app/buildAppHeaderProps.test.ts`: busy behavior

Verify
- `npm run test -- <targeted test files>`
- `npm run build`

Doc + Git
- [ ] Update this doc: mark Phase 2 done, record commit hash.
- [ ] Commit message suggestion: `feat(ad-review): add queue panel and header busy state`
- [ ] `git push`

---

### Phase 3 - Result Focus Mode: Sidebar + Thumbnail Aggregation

Outcome
- When focus mode is enabled for a queue item:
  - sidebar tree displays only nodes/packages involved in the candidates (suspected images)
  - main thumbnails show suspected images (aggregated), not node-cover browse cards
  - selecting a folder node filters suspected thumbnails to that folder subtree
  - parent folders no longer show a single cover tile (requirement #2)

Files to touch
- `src/features/app/useAppWorkspaceProps.ts`
  - add `adReviewFocusTaskId` awareness
  - override `nodeBrowseMode=false` while in focus mode
  - build `refsInPageForDisplay` by filtering to suspected ids
- `src/features/app/useAppSidebarScopeState.ts`
  - expose helpers needed to map nodeId -> package ids or pathKey
- `src/features/app/workspaceImageDerivations.ts`
  - add helpers to filter refs by:
    - [ ] suspected image ids
    - [ ] selected sidebar node pathKey prefix
- `src/features/app/buildAdReviewSidebarState.ts` (new)
  - build a sidebar tree from candidate list (similar to `buildVectorSidebarState.ts`)
- `src/features/app/useAppReadState.ts`
  - add an `adReviewResultsMode` flag (parallel to `searchResultsMode`)
- `src/features/app/buildSidebarPanelProps.ts`
  - allow alternate tree input for ad-review focus mode
- `src/components/SidebarPanel.tsx`
  - support `searchResultMode`-like header label and return button for focus mode

Implementation checklist
- [ ] Define `adReviewResultsMode`:
  - [ ] `Boolean(adReviewFocusTaskId)`
- [ ] Sidebar tree in focus mode:
  - [ ] leaves = candidate packages (by `package_id` + `treePath` from snapshot)
  - [ ] node counts = suspected image counts (direct + descendant)
- [ ] Main thumbnails in focus mode:
  - [ ] always image grid (disable node browse)
  - [ ] visible refs are derived from candidate image ids
  - [ ] if selected sidebar node is folder -> further filter by subtree
  - [ ] if selected node is a package/directory -> show its candidate images
- [ ] Return behavior:
  - [ ] return button clears focus (does NOT clear queue)

Tests
- `src/features/app/buildAdReviewSidebarState.test.ts` (new)
- `src/features/app/workspaceImageDerivations.test.ts` (new)
- `src/components/SidebarPanel.test.tsx` (extend): focus return button

Verify
- `npm run test -- <targeted test files>`
- `npm run build`

Doc + Git
- [ ] Update this doc: mark Phase 3 done, record commit hash.
- [ ] Commit message suggestion: `feat(ad-review): add result focus mode sidebar and thumbnail filtering`
- [ ] `git push`

---

### Phase 4 - Metadata Panel: Auto Original-Image View (Non-manage Only)

Outcome
- Non-manage mode only:
  - mouse click or keyboard navigation changing focused image forces original-image view
  - Esc/right-click exits back to data view

Files to touch
- `src/components/MetadataPanel.tsx`
  - implement a small internal state machine for `showImagePreview`:
    - [ ] when `mode==='image' && !manageMode && !metadataManageMode` and focused image changes -> `setShowImagePreview(true)`
    - [ ] keydown Escape -> `setShowImagePreview(false)`
    - [ ] contextmenu (right click) -> `setShowImagePreview(false)`
- `src/features/app/useAppWorkspaceProps.ts`
  - ensure metadata panel gets enough signals (focused image id) if needed

Tests
- `src/components/MetadataPanel.test.tsx` (new):
  - [ ] focus image change forces original-image
  - [ ] Esc/right-click returns to data
  - [ ] manageMode or metadataManageMode disables this behavior

Verify
- `npm run test -- src/components/MetadataPanel.test.tsx`
- `npm run build`

Doc + Git
- [ ] Update this doc: mark Phase 4 done, record commit hash.
- [ ] Commit message suggestion: `feat(metadata): auto switch to original image on focus changes`
- [ ] `git push`

---

## Defaults (v1)

- Queue scheduling: auto-run next `pending` when a `running` item transitions to `review` or `failed`.
  - Do NOT auto-run next when user pauses a task (`paused`).
- Reviewed-node hash: metadata signature hash (no file bytes read).
- Reviewed-node persistence: write reviewed-node index only after a node finishes scanning (sidebar scope).

## Optional Variants (not part of v1)

- Manual scheduling only:
  - Keep `pending` items until user explicitly starts the next one.
  - Backend change: do not auto-start pending in the completion handler.
- Strict byte-level node hashing:
  - Compute node hash from per-image sha256.
  - Requires reading image bytes (heavy) or adding sha256 persistence at ingest time (larger scope).
