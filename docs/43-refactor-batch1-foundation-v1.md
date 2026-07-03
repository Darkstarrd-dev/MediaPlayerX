# 第一批重构实施文档 — Foundation（低风险底座）

Last updated: 2026-07-03

> 总编排文档：`docs/42-refactor-orchestration-v1.md`
> 本批次 6 个 PR 可全并行执行，无文件交叉。

## B1-PR1：Review StateStore 合并

### 目标

将 `manageAdReviewStateStore.ts`（92 行）与 `manageCoverReviewStateStore.ts`（85 行）合并为单一参数化模块，消除 98% 相同的薄包装代码。

### 前置依赖

无。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `electron/services/file-system-read/manageAdReviewStateStore.ts` | 92 | 删除 |
| `electron/services/file-system-read/manageCoverReviewStateStore.ts` | 85 | 删除 |
| `electron/services/file-system-read/manageReviewStateStoreFactory.ts` | 301 | 保留，扩展导出 |
| `electron/services/file-system-read/manageAdReviewService.ts` | 1845 | 更新导入 |
| `electron/services/file-system-read/manageCoverReviewService.ts` | 1051 | 更新导入 |
| `electron/facade/FileSystemManagementHandlers.ts` | 796 | 更新导入（如有） |

### 当前问题分析

两个文件的差异仅在 4 处：

```
差异点              manageAdReviewStateStore        manageCoverReviewStateStore
─────────────────  ──────────────────────────────  ──────────────────────────────
key 常量           manage_ad_review_*              manage_cover_review_*
schema 引用        manageAdReviewTaskSchema        manageCoverReviewTaskSchema
type 引用          ManageAdReviewTaskDto           ManageCoverReviewTaskDto
types 文件         manageAdReviewService.types     manageCoverReviewService.types
```

`createManageReviewStateStore` factory 已存在且已泛型化（`<TTask, TRequest>`），两个薄包装只是调用 factory 并传入不同配置。

### 实施步骤

#### Step 1：在 factory 文件中新增统一导出

在 `manageReviewStateStoreFactory.ts` 中新增 `createManageReviewStateStoreModule` 高阶函数，接受配置对象并返回完整的导出函数集：

```typescript
// 配置接口
interface ManageReviewStateStoreConfig<TTask, TRequest> {
  keys: { knownHashesStateKey: string; queueStateKey: string; reviewedNodeHashStateKey: string };
  queueStateVersion: number;
  reviewedNodeHashStateVersion: number;
  taskParser: ZodSchema<TTask>;
  normalizeStoredRequest: (raw: unknown, task: TTask) => TRequest;
}

// 返回的模块接口
interface ManageReviewStateStoreModule {
  readQueueStateInternal: (db: MediaLibraryDatabase) => PersistedQueueState;
  writeQueueState: (db: MediaLibraryDatabase, state: PersistedQueueState) => void;
  readReviewedNodeHashState: (db: MediaLibraryDatabase) => ReviewedNodeHashState;
  writeReviewedNodeHashState: (db: MediaLibraryDatabase, state: ReviewedNodeHashState) => void;
  readKnownHashes: (db: MediaLibraryDatabase) => Set<string>;
  persistKnownHashes: (db: MediaLibraryDatabase, imageIds: string[], hashes: Map<string, string>) => void;
  writeKnownHashes: (db: MediaLibraryDatabase, hashes: Iterable<string>) => void;
}
```

注意：`PersistedQueueState` 和 `ReviewedNodeHashState` 在两个 service 的 types 文件中定义但结构相同，需统一引用。

#### Step 2：在 Ad/Cover service 中直接使用 factory

将 `manageAdReviewService.ts` 和 `manageCoverReviewService.ts` 中对 `manageAdReviewStateStore` / `manageCoverReviewStateStore` 的导入改为直接从 factory 创建实例。

#### Step 3：删除两个薄包装文件

确认所有引用已迁移后删除：
- `manageAdReviewStateStore.ts`
- `manageCoverReviewStateStore.ts`

#### Step 4：更新测试

确认 `manageAdReviewService.test.ts` 和 `manageCoverReviewService.test.ts` 仍通过。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:electron`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] Ad Review 状态读写正确（启动/暂停/确认删除）
- [ ] Cover Review 状态读写正确（启动/暂停/确认隐藏）
- [ ] known hashes 导入/导出功能正常
- [ ] 数据库升级或旧数据加载不回归

### 回滚策略

保留 factory 的原有 `createManageReviewStateStore` 导出不变，仅新增高阶函数。若出现问题可直接恢复两个薄包装文件。

### 风险评估

**低。** Factory 已存在且已泛型化，薄包装仅做配置传递。两个 types 文件中的 `PersistedQueueState` / `ReviewedNodeHashState` 结构需确认完全一致。

---

## B1-PR2：根级 components 子目录化

### 目标

将 `src/components/` 根级下散乱的 88 个条目按组件系列归类到子目录，降低根级杂乱度。

### 前置依赖

无。

### 涉及文件清单

需移动的文件系列（共 33 个文件）：

| 目标子目录 | 文件 |
|-----------|------|
| `image-main/` | `ImageMainAdReviewControls.tsx`, `ImageMainMetadataToolbar.tsx`, `ImageMainNormalToolbar.tsx`, `ImageMainScaleControl.tsx`, `ImageMainScaleControl.test.tsx`, `ImageMainSection.tsx`, `ImageMainSection.renderers.tsx`, `ImageMainSection.types.ts`, `ImageMainSectionContentArea.tsx`, `ImageMainSection.test.tsx`, `ImageMainSection.scroll-and-rs.test.tsx`, `imageMainSectionPreload.ts`, `imageMainSectionTasks.ts` |
| `music-main/` | `MusicMainSection.tsx`, `MusicMainSection.types.ts`, `MusicMainSection.test.tsx`, `MusicMainSectionControlsShell.tsx`, `MusicMainSectionLayout.tsx`, `musicMainSectionUtils.ts`, `MusicControlIcon.tsx`, `MusicAudioTranscodePanel.tsx` |
| `video-main/` | `VideoMainSection.tsx`, `VideoMainSection.test.tsx`, `VideoControlIcon.tsx`, `VideoTranscodePanel.tsx` |
| `sidebar/` | `SidebarPanel.tsx`, `SidebarPanel.test.tsx`, `SidebarPanel.collapse-and-navigation.test.tsx`, `SidebarPanelRow.tsx`, `SidebarRenameDialog.tsx`, `sidebarPanelNavigationHelpers.ts`, `sidebarPanelTreeUtils.ts` |

保留在根级的文件（通用组件）：
`AppHeader.tsx`, `AppShell.tsx`, `AppWorkspace.tsx`, `BackendErrorBanner.tsx`, `DangerConfirmDialog.tsx`, `DragImportOverlay.tsx`, `FullscreenLayer.tsx`, `GroupFooter.tsx`, `GroupNameDialog.tsx`, `HelpPanel.tsx`, `ImportSourceInputs.tsx`, `ImportTaskPanel.tsx`, `MetadataPanel.tsx`, `SettingsPanel.tsx`, `SettingsPanel.impl.tsx`, `SettingsPanel.types.ts`, `ThemeParameterPanel.tsx`, `ToolbarTitleMarquee.tsx`, `TooltipLayer.tsx`, `AppTopBanners.tsx`, `RuntimeWarningBanner.tsx`, `MainUiIcon.tsx`, `ButtonHelpOverlay.tsx`, `E2eBenchSection.tsx`, `ImageConvertSettingsPanel.tsx`, `subtitles.css`

Hook 文件（11 个 `use*.ts`）保留在根级，因其跨组件复用。

### 实施步骤

#### Step 1：创建子目录

```
src/components/image-main/
src/components/music-main/
src/components/video-main/
src/components/sidebar/
```

#### Step 2：移动文件

使用 `git mv` 移动文件以保留 git 历史。

#### Step 3：批量更新导入路径

所有引用这些文件的导入路径需从 `components/ImageMainSection` 改为 `components/image-main/ImageMainSection` 等。

用全局搜索替换处理：
- `from "../components/ImageMain` → `from "../components/image-main/ImageMain`（或相应相对路径）
- `from "./ImageMain` → `from "./image-main/ImageMain`（同目录内引用）

#### Step 4：验证测试文件仍能正确解析

移动后的 `.test.tsx` 文件需确认 vitest 配置不受路径影响。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 图片模式主界面渲染正常（工具栏、缩放控制、Ad Review 控制）
- [ ] 音乐模式主界面渲染正常
- [ ] 视频模式主界面渲染正常
- [ ] 侧边栏面板渲染正常（折叠/导航/重命名）

### 回滚策略

纯文件移动，出现问题直接 `git revert`。

### 风险评估

**极低。** 纯文件移动 + 导入路径更新，无逻辑变更。主要工作量在批量更新导入路径。

---

## B1-PR3：重导出链清理

### 目标

删除不必要的重导出跳板文件，简化 import 路径。

### 前置依赖

无。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `electron/fileSystemReadService.ts` | 2 | 删除或直接指向 impl |
| `electron/fileSystemReadFacade.ts` | 1 | 删除 |

当前导出链：
```
fileSystemReadService.ts (2行)
  └─ export { FileSystemMediaReadService } from './fileSystemReadFacade'
  └─ export type { LibraryChangedEventPayload } from './services/...'

fileSystemReadFacade.ts (1行)
  └─ export * from "./fileSystemReadFacade.impl"

fileSystemReadFacade.impl.ts (2029行)  ← 真正的实现
```

### 实施步骤

#### Step 1：搜索所有引用点

搜索所有从 `fileSystemReadService` 和 `fileSystemReadFacade`（非 `.impl`）导入的位置。

#### Step 2：更新引用

将所有引用改为直接指向 `fileSystemReadFacade.impl`（或保留 `fileSystemReadService` 作为唯一入口但直接指向 impl）。

推荐方案：
- 保留 `fileSystemReadService.ts` 作为对外统一入口，但内容改为直接从 `.impl` 导出
- 删除 `fileSystemReadFacade.ts` 中间层

```typescript
// fileSystemReadService.ts（修改后）
export { FileSystemMediaReadService } from './fileSystemReadFacade.impl'
export type { LibraryChangedEventPayload } from './services/file-system-read/fileSystemReadFacadeEvents'
```

#### Step 3：更新内部引用

`fileSystemReadFacade.impl.ts` 内部如有自引用需检查（通常无）。

#### Step 4：删除中间层

删除 `fileSystemReadFacade.ts`。

#### Step 5：搜索其他类似重导出

检查是否存在类似的 1-2 行重导出文件（如 `libraryReadWriteService.ts`），一并清理。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:electron`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] Electron 主进程启动正常
- [ ] IPC 通道全部可用
- [ ] 后端服务初始化无异常

### 回滚策略

恢复被删除的中间层文件即可。

### 风险评估

**极低。** 仅修改 import 路径，无逻辑变更。

---

## B1-PR4：BaseStore 基类抽象

### 目标

提取 `BaseStore` 基类，消除所有 Store 类中重复的 `this.db.prepare(...).run/get` 模式，增强类型安全。

### 前置依赖

无。与 B1-PR1 不交叉（PR1 改 `services/file-system-read/manageReview*StateStore`，PR4 改 `electron/mediaLibrary*Store`）。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `electron/mediaLibraryDatabaseTypes.ts` | 26 | 检查 `SQLiteDatabaseLike` 定义 |
| `electron/mediaLibraryStoreUtils.ts` | 113 | 保留，BaseStore 可复用其中的 `parseJson` |
| 新建 `electron/mediaLibraryBaseStore.ts` | ~50 | 新建 |
| `electron/mediaLibraryAppStateStore.ts` | 93 | 改为继承 BaseStore |
| `electron/mediaLibraryPlaylistStore.ts` | 42 | 改为继承 BaseStore |
| `electron/mediaLibraryTaskStore.ts` | 176 | 改为继承 BaseStore |
| `electron/mediaLibrarySnapshotStore.ts` | 789 | 改为继承 BaseStore |
| `electron/mediaLibraryMetadataStore.ts` | 1177 | 改为继承 BaseStore |

### 当前重复模式

所有 Store 类都遵循相同模式：

```typescript
export class XxxStore {
  constructor(private readonly db: SQLiteDatabaseLike) {}

  someMethod(): void {
    this.db
      .prepare('SQL ...')
      .run(param1, param2)   // 或 .get() / .all()
  }

  someQuery(): T {
    const row = this.db
      .prepare('SQL ...')
      .get(id) as { col: string } | undefined
    // ...
  }
}
```

### 实施步骤

#### Step 1：创建 BaseStore 基类

```typescript
// electron/mediaLibraryBaseStore.ts
import type { SQLiteDatabaseLike } from './mediaLibraryDatabaseTypes'

export abstract class BaseStore {
  constructor(protected readonly db: SQLiteDatabaseLike) {}

  protected run(sql: string, ...params: unknown[]): void {
    this.db.prepare(sql).run(...params)
  }

  protected get<T>(sql: string, ...params: unknown[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined
  }

  protected all<T>(sql: string, ...params: unknown[]): T[] {
    return this.db.prepare(sql).all(...params) as T[]
  }
}
```

#### Step 2：逐个 Store 继承 BaseStore

从最小的 Store 开始（PlaylistStore 42 行 → AppStateStore 93 行 → TaskStore 176 行 → SnapshotStore 789 行 → MetadataStore 1177 行）。

每个 Store 的改造模式：
1. `class XxxStore extends BaseStore`
2. 删除 `constructor(private readonly db: SQLiteDatabaseLike)`
3. 删除 `import type { SQLiteDatabaseLike }`（如不再直接使用）
4. 将 `this.db.prepare(sql).run(...)` 替换为 `this.run(sql, ...)`
5. 将 `this.db.prepare(sql).get(...) as T` 替换为 `this.get<T>(sql, ...)`
6. 将 `this.db.prepare(sql).all(...) as T[]` 替换为 `this.all<T>(sql, ...)`

注意：部分 Store 的 constructor 可能接受额外参数（如 MediaLibraryDatabase 引用），需保留额外参数。

#### Step 3：确认 Database 入口不受影响

`MediaLibraryDatabase` 类创建各 Store 时传入 `this.db`，改造后接口不变。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:electron`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 数据库初始化正常
- [ ] 快照读写正确
- [ ] 元数据读写正确
- [ ] App state 读写正确
- [ ] 播放列表读写正确
- [ ] 任务日志读写正确

### 回滚策略

纯机械替换，出现问题直接还原对应 Store 文件。BaseStore 文件可保留不删除。

### 风险评估

**低。** 纯机械替换，无逻辑变更。需注意 `prepare()` 返回的 Statement 对象在某些 Store 中可能被缓存复用（如多次调用同一 SQL），需检查是否有此模式。

---

## B1-PR5：Schema 三重解析消除

### 目标

消除 IPC 响应在 handler → preload → repository 三层中被 Zod schema 重复解析的问题，减少大 payload 的性能开销。

### 前置依赖

无。但 B2-PR5（bare ipcMain.handle 收归）依赖本 PR 完成（同改 `preload.ts`）。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `electron/preload.ts` | 1118 | 移除 ~100 处 `.parse(response)` |
| `src/features/backend/repository/realRepository.ts` | 1225 | 保留 parse（最终验证层） |
| `electron/registerBackendIpcHandlers.ts` | 1619 | 确认 handler 侧 parse 保持不变 |

### 当前问题分析

同一 IPC 响应被解析三次：

```
1. handler 侧：responseSchema.parse(result)  ← registerIpcQuery/registerIpcCommand 内部
2. preload 侧：xxxResponseSchema.parse(response)  ← preload.ts 中 ~100 处
3. repository 侧：xxxResponseSchema.parse(response)  ← realRepository.ts 中 ~100 处
```

已有 3 个大 payload 通道使用 `skipResponseSchemaParse: true` 跳过 handler 侧解析：
- `readLibrarySnapshot`
- `readLibrarySnapshotLite`
- `readImageSidebarTree`

但这 3 个通道在 preload 和 repository 侧仍各 parse 一次（双重）。

### 实施步骤

#### Step 1：确定最终验证层

**决策：保留 repository 侧作为唯一最终验证层。**

理由：
- repository 是前端业务逻辑的入口，在此验证可拦截所有 IPC 返回的异常数据
- preload 侧的 parse 是冗余的——handler 侧已保证正确性，preload 只是转发
- 保留 repository 侧 parse 可在 Mock → Real 切换时统一验证行为

#### Step 2：移除 preload 侧的 parse

将 preload.ts 中所有 `return xxxResponseSchema.parse(response)` 改为 `return response`（直接透传）。

同时移除 preload.ts 中因此不再使用的 schema import。

注意：preload 侧的 **request** parse 应保留（`requestSchema.parse(request)`），因为前端传入的参数需在 preload 侧验证后才发送给 handler。

#### Step 3：确认 repository 侧 parse 覆盖完整

检查 `realRepository.ts` 中所有 IPC 调用方法是否都有 response parse。如有遗漏，补上。

#### Step 4：处理 skipResponseSchemaParse 通道

对于已使用 `skipResponseSchemaParse: true` 的 3 个通道：
- handler 侧：不 parse（保持现状）
- preload 侧：不 parse（本 PR 移除）
- repository 侧：parse（最终验证）

对于其他通道：
- handler 侧：parse（保持现状，作为后端内部验证）
- preload 侧：不 parse（本 PR 移除）
- repository 侧：parse（最终验证）

**优化方向（可选）：** 对于已确认 repository 侧会 parse 的通道，可考虑在 handler 侧也启用 `skipResponseSchemaParse: true`，将验证统一到 repository 侧。但这涉及后端安全边界，建议作为后续优化。

#### Step 5：更新 backend-api.d.ts

确认 `backend-api.d.ts` 中的方法签名不需调整（返回类型已是具体 Dto 类型，不受 parse 移除影响）。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:electron`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 所有 IPC 通道功能正常（重点测试大 payload：库快照、侧边栏树、图片页）
- [ ] 错误响应被 repository 侧正确拦截
- [ ] Mock Repository 测试全部通过

### 回滚策略

恢复 preload.ts 中的 parse 调用即可。建议在 commit 中将 preload.ts 的改动独立提交，便于精准回滚。

### 风险评估

**低-中。** 移除 preload 侧 parse 后，如果 handler 侧返回异常数据，错误会在 repository 侧才被捕获，而非 preload 侧。但 repository 侧的 parse 已保证最终验证。需确认 preload → repository 之间没有其他中间层消费 response。

---

## B1-PR6：测试盲区补齐（4 feature）

### 目标

为 4 个零测试 feature（`import`、`perf`、`search`、`shared`）添加核心逻辑单元测试，清零测试盲区。

### 前置依赖

无。

### 涉及文件清单

| Feature | 源文件 | 测试文件（新建） |
|---------|--------|----------------|
| `import` | `useImportPipeline.ts`, `useImportPaste.ts`, `useImportDragOverlay.ts`, `importPathUtils.ts` | `importPathUtils.test.ts`（纯函数优先） |
| `perf` | `benchSettings.ts`, `benchRecorder.ts` | `benchSettings.test.ts`, `benchRecorder.test.ts` |
| `search` | `useFeatureSearch.ts` | `useFeatureSearch.test.tsx` |
| `shared` | `interactionDelays.ts`, `errorCode.ts` | `interactionDelays.test.ts`, `errorCode.test.ts` |

### 实施步骤

#### Step 1：优先测试纯函数

从无 React 依赖的纯函数文件开始：

1. **`importPathUtils.ts`** — 路径解析/验证逻辑
2. **`interactionDelays.ts`** — 交互延迟常量/计算
3. **`errorCode.ts`** — 错误码定义/映射
4. **`benchSettings.ts`** — 基准设置
5. **`benchRecorder.ts`** — 基准记录器

#### Step 2：测试 React hooks

1. **`useFeatureSearch.ts`** — 使用 `@testing-library/react` 的 `renderHook`
2. **`useImportPipeline.ts`** — 如依赖 IPC/repository，使用 `MockMediaRepository`
3. **`useImportPaste.ts`** — 粘贴事件处理
4. **`useImportDragOverlay.ts`** — 拖拽覆盖层状态

#### Step 3：确认 Mock Repository 覆盖

确认 `MockMediaRepository` 已实现 import/feature-search 相关方法，如未实现需补充。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] 新增测试覆盖率 > 0% for import/perf/search/shared

### 回归检查项

- [ ] 新增测试不影响现有测试通过
- [ ] 新增测试在 CI 环境下稳定通过（无 flaky）

### 回滚策略

删除新增测试文件即可。

### 风险评估

**极低。** 仅新增测试文件，不修改任何业务代码。

---

## 第一批通用回滚策略

| PR | 回滚方式 | 影响范围 |
|----|---------|---------|
| B1-PR1 | 恢复两个薄包装文件 | Ad/Cover Review |
| B1-PR2 | `git revert` 文件移动 | 无功能影响 |
| B1-PR3 | 恢复中间层文件 | import 路径 |
| B1-PR4 | 还原 Store 文件 | 数据库操作 |
| B1-PR5 | 恢复 preload.ts parse | IPC 验证 |
| B1-PR6 | 删除新增测试 | 无功能影响 |

## 变更记录

### 2026-07-03：初始创建

- 基于 4 维探索分析创建第一批 6 个 PR 的详细实施文档
- 6 个 PR 可全并行执行，无文件交叉
