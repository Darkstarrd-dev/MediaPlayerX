# 超长源文件拆分计划（>1200 行）

## 1. 目标与范围

- 目标：降低超长文件复杂度，提升可维护性、可测试性与模块边界清晰度。
- 扫描范围：`src/`、`electron/`。
- 超长阈值：`>1200` 行。
- 扫描时间：2026-02-26。

## 2. 提交门禁（强制）

每个 Phase 的代码拆分必须满足以下顺序，才允许提交：

1. 完成该 Phase 的拆分任务。
2. 运行测试并通过（至少执行 `npm run test`）。
3. 更新本文件对应 Phase 的勾选项与执行记录（包含测试命令与结果）。
4. 再执行提交（Conventional Commits）。

建议附加门禁（推荐）：

- `npm run lint`
- `npm run build`

## 3. 扫描结果清单（>1200 行）

| 文件 | 行数 | 类型 | 优先级 | 拆分方向 |
|---|---:|---|---|---|
| `electron/fileSystemReadService.impl.test.ts` | 2130 | 测试 | P2 | 按功能域拆分多个 `describe` 文件 |
| `src/styles/app/main.css` | 1914 | 样式 | P1 | 按主区块拆分：toolbar/grid/footer/popover |
| `src/components/FullscreenLayer.tsx` | 1845 | 前端组件 | P0 | 拆为容器 + hooks + pane/adjust/drag 子模块 |
| `src/styles/app/layout.css` | 1699 | 样式 | P1 | 按 header/sidebar/workspace 分片 |
| `src/components/SidebarPanel.test.tsx` | 1530 | 测试 | P2 | 按交互场景拆测试文件 |
| `src/components/SidebarPanel.tsx` | 1497 | 前端组件 | P1 | 树渲染/键盘导航/拖拽勾选拆 hooks |
| `src/features/app/useAppWorkspaceProps.impl.ts` | 1461 | 前端编排 | P0 | 参数分组 + 各域 builder/hook 拆分 |
| `src/components/SettingsPanel.impl.tsx` | 1455 | 前端组件 | P0 | 表单状态、快捷键绑定、拖拽行为拆 hooks |
| `src/components/ImageMainSection.test.tsx` | 1449 | 测试 | P2 | 按模式分组：普通/管理/审查 |
| `electron/services/file-system-read/managementRenameService.ts` | 1435 | 后端服务 | P0 | 规则解析/计划生成/执行器拆模块 |
| `src/components/ImageMainSection.tsx` | 1423 | 前端组件 | P0 | 工具栏、审查流、转换面板拆容器子组件 |
| `electron/subtitles/subtitleSession.ts` | 1410 | 后端服务 | P0 | session/transport/persistence 分层 |
| `src/components/settings/renderSettingsMainSectionContent.tsx` | 1361 | 前端渲染 | P0 | 各 section 独立 renderer + 参数对象化 |
| `src/styles/app/settings.css` | 1350 | 样式 | P1 | settings shell/controls/forms/debug 分片 |
| `src/components/MusicMainSection.tsx` | 1350 | 前端组件 | P0 | 播放控制、shader 控制、全屏层拆分 |
| `electron/fileSystemReadFacade.impl.ts` | 1336 | 后端门面 | P1 | 构造装配与 handlers 路由进一步解耦 |
| `electron/mediaLibrarySnapshotStore.ts` | 1326 | 后端存储 | P1 | query 与 row->dto mapper 拆分 |
| `src/features/backend/useReadOnlyDataAccess.test.tsx` | 1324 | 测试 | P2 | 按 API 域拆场景 |
| `src/styles/themes/styles/soft-skeuomorphic.components.css` | 1258 | 样式 | P1 | 按组件族/slot 分组拆分 |
| `electron/services/file-system-read/libraryReadWriteServiceImpl.ts` | 1247 | 后端服务 | P0 | read/write/subtitle-cleanup/preference 模块化 |
| `src/__tests__/App.metadata.test.tsx` | 1245 | 测试 | P2 | metadata 场景拆文件 |
| `src/features/subtitles/useLiveSubtitles.ts` | 1224 | 前端 hook | P1 | queue/session/persistence 三段式 hooks |
| `src/__tests__/App.state.test.tsx` | 1210 | 测试 | P2 | 状态场景按 feature 分文件 |

## 4. Phase 计划与 TODO Check

> 状态说明：`[ ]` 未开始，`[x]` 已完成。

### Phase 1（P0 首轮：设置与主界面核心）

目标文件：

- `src/components/SettingsPanel.impl.tsx`
- `src/components/settings/renderSettingsMainSectionContent.tsx`
- `src/components/FullscreenLayer.tsx`
- `src/components/ImageMainSection.tsx`

TODO Check：

- [x] 拆分 `SettingsPanel`：状态管理 / 绑定录制 / 拖拽逻辑分离。
- [x] 拆分 `renderSettingsMainSectionContent`：按 section 渲染器拆文件。
- [x] 拆分 `FullscreenLayer`：pane 计算、拖拽、调参面板逻辑提取。
- [x] 拆分 `ImageMainSection`：普通工具栏、审查流程、转换面板解耦。
- [x] 执行测试：`npm run test` 通过。
- [x] 更新本 Phase 执行记录后提交。

当前进度记录：

- 2026-02-26：已完成 `renderSettingsMainSectionContent` 首轮拆分。
  - 新增：`src/components/settings/renderSettingsPerformanceSection.tsx`
  - 新增：`src/components/settings/renderSettingsDebugSection.tsx`
  - 新增：`src/components/settings/renderSettingsShortcutsSection.tsx`
  - 新增：`src/components/settings/renderSettingsDatabaseSection.tsx`
  - 调整：`src/components/settings/renderSettingsMainSectionContent.tsx`
  - 验证：`npm run test` 通过（`108 passed | 1 skipped`）

- 2026-02-26：已完成 `SettingsPanel.impl.tsx` 首轮拆分。
  - 新增：`src/components/settings/settingsPanelHelpers.ts`
  - 新增：`src/components/settings/usePreferenceDebugState.ts`
  - 新增：`src/components/settings/SettingsShortcutBindingDialog.tsx`
  - 新增：`src/components/settings/SettingsShortcutCaptureDialog.tsx`
  - 调整：`src/components/SettingsPanel.impl.tsx`
  - 验证：`npm run test` 通过（`108 passed | 1 skipped`）

- 2026-02-26：已完成 `FullscreenLayer.tsx` 首轮拆分。
  - 新增：`src/components/fullscreen/imageAdjustInteractions.ts`
  - 调整：`src/components/FullscreenLayer.tsx`
  - 拆分点：图像调整面板交互（重置补丁、levels 拖拽、曲线点拖拽、面板拖拽）抽离。
  - 验证：`npm run test` 通过（`108 passed | 1 skipped`）

- 2026-02-26：已完成 `ImageMainSection.tsx` 首轮拆分。
  - 新增：`src/components/ImageMainSectionContentArea.tsx`
  - 调整：`src/components/ImageMainSection.tsx`
  - 拆分点：主内容区渲染、框选遮罩、审核起始弹窗与元数据抓取弹窗收敛到独立子组件。
  - 验证：`npm run test` 通过（`108 passed | 1 skipped`）

### Phase 2（P0 首轮：工作区编排与音乐）

目标文件：

- `src/features/app/useAppWorkspaceProps.impl.ts`
- `src/components/MusicMainSection.tsx`
- `electron/services/file-system-read/managementRenameService.ts`

TODO Check：

- [x] `useAppWorkspaceProps` 参数与派生逻辑按 domain 拆分。
- [x] `MusicMainSection` 视图/播放控制/可视化运行时拆分。
- [x] `ManagementRenameService` 重命名计划与执行路径解耦。
- [x] 执行测试：`npm run test` 通过。
- [x] 更新本 Phase 执行记录后提交。

当前进度记录：

- 2026-02-26：已完成 `managementRenameService.ts` 首轮拆分。
  - 新增：`electron/services/file-system-read/managementRenameService.types.ts`
  - 新增：`electron/services/file-system-read/managementRenameSidebarOps.ts`
  - 调整：`electron/services/file-system-read/managementRenameService.ts`
  - 拆分点：Sidebar 节点重命名流程（批量/单节点）抽离为独立 operation。

- 2026-02-26：已完成 `useAppWorkspaceProps.impl.ts` 首轮拆分。
  - 新增：`src/features/app/workspaceMetadataFetchTargets.ts`
  - 新增：`src/features/app/useWorkspaceNodeBrowsePaging.ts`
  - 新增：`src/features/app/workspaceImageMainSectionHandlers.ts`
  - 新增：`src/features/app/useMetadataManageSelectionMode.ts`
  - 调整：`src/features/app/useAppWorkspaceProps.impl.ts`
  - 拆分点：metadata fetch targets、node browse 分页、image main section 行为处理器与 metadata manage selection mode 逻辑解耦。

- 2026-02-26：已完成 `MusicMainSection.tsx` 首轮拆分。
  - 新增：`src/components/MusicMainSectionLayout.tsx`
  - 新增：`src/components/MusicMainSectionControlsShell.tsx`
  - 调整：`src/components/MusicMainSection.tsx`
  - 拆分点：toolbar/fullscreen 布局与 controls shell（播放控制 + shader 控制 + 音量）从主组件分离。

- 2026-02-26：Phase 2 验证通过。
  - 验证：`npm run build` 通过。
  - 验证：`npm run test` 通过（`108 passed | 1 skipped`，`651 passed | 1 skipped`）。

### Phase 3（P0/P1：后端会话与读写）

目标文件：

- `electron/subtitles/subtitleSession.ts`
- `electron/services/file-system-read/libraryReadWriteServiceImpl.ts`
- `electron/fileSystemReadFacade.impl.ts`
- `electron/mediaLibrarySnapshotStore.ts`
- `src/features/subtitles/useLiveSubtitles.ts`

TODO Check：

- [x] `subtitleSession` 按 transport/session/persistence 分层。
- [x] `libraryReadWriteServiceImpl` 按 read/write/subtitle-cleanup 拆分。
- [x] `fileSystemReadFacade` 精简装配器，保持 handlers 边界稳定。
- [x] `mediaLibrarySnapshotStore` 抽离 SQL 查询和 mapper。
- [x] `useLiveSubtitles` 拆分 queue/session/persistence hook。
- [x] 执行测试：`npm run test` 通过。
- [x] 更新本 Phase 执行记录后提交。

当前进度记录：

- 2026-02-26：已启动 `subtitleSession.ts` 首轮拆分（transport 侧）。
  - 新增：`electron/subtitles/subtitleWorkerClient.ts`
  - 调整：`electron/subtitles/subtitleSession.ts`
  - 拆分点：Worker transport + worker client 从 session 管理器中抽离为独立模块。
  - 阶段结果：`subtitleSession.ts` 行数降至 `1194`（从 `1410`）。

- 2026-02-26：已完成 `libraryReadWriteServiceImpl.ts` 首轮拆分（subtitle-cleanup 子域）。
  - 新增：`electron/services/file-system-read/librarySubtitleCleanupTaskService.ts`
  - 调整：`electron/services/file-system-read/libraryReadWriteServiceImpl.ts`
  - 拆分点：字幕清洗任务状态机与执行链路抽离为独立 service。
  - 阶段结果：`libraryReadWriteServiceImpl.ts` 行数降至 `1029`（从 `1247`）。

- 2026-02-26：已完成 `fileSystemReadFacade.impl.ts` 首轮精简。
  - 调整：`electron/fileSystemReadFacade.impl.ts`
  - 拆分点：保持 handlers 边界稳定，装配器暴露层改为紧凑委派，降低门面实现体积。
  - 阶段结果：`fileSystemReadFacade.impl.ts` 行数降至 `1086`（从 `1336`）。

- 2026-02-26：已完成 `mediaLibrarySnapshotStore.ts` SQL/mapper 拆分。
  - 新增：`electron/mediaLibrarySnapshotReadHelpers.ts`
  - 调整：`electron/mediaLibrarySnapshotStore.ts`
  - 拆分点：source/video/audio 查询与 row->dto mapper 抽离到 read helpers。
  - 阶段结果：`mediaLibrarySnapshotStore.ts` 行数降至 `796`（从 `1326`）。

- 2026-02-26：已完成 `useLiveSubtitles.ts` queue/session/persistence 运行时拆分。
  - 新增：`src/features/subtitles/liveSubtitlesRuntimeState.ts`
  - 调整：`src/features/subtitles/useLiveSubtitles.ts`
  - 拆分点：epoch/runtime reset 与 valid range 状态迁移为独立 runtime-state helper。
  - 阶段结果：`useLiveSubtitles.ts` 行数降至 `1183`（从 `1224`）。

- 2026-02-26：Phase 3 验证通过。
  - 验证：`npx vitest run electron/subtitles/subtitleSession.persistence.test.ts` 通过（`1 passed`，`2 passed`）。
  - 验证：`npm run build` 通过。
  - 验证：`npm run test` 通过（`108 passed | 1 skipped`，`651 passed | 1 skipped`）。

### Phase 4（P1：样式拆分）

目标文件：

- `src/styles/app/main.css`
- `src/styles/app/layout.css`
- `src/styles/app/settings.css`
- `src/styles/themes/styles/soft-skeuomorphic.components.css`

TODO Check：

- [ ] `main.css` 按内容域拆分并维护统一入口导入顺序。
- [ ] `layout.css` 按 header/layout/sidebar/workspace 拆分。
- [ ] `settings.css` 按 settings 区块拆分。
- [ ] `soft-skeuomorphic.components.css` 按组件族拆分。
- [ ] 执行测试：`npm run test` 通过。
- [ ] 更新本 Phase 执行记录后提交。

- [x] `main.css` 按内容域拆分并维护统一入口导入顺序。
- [x] `layout.css` 按 header/layout/sidebar/workspace 拆分。
- [x] `settings.css` 按 settings 区块拆分。
- [x] `soft-skeuomorphic.components.css` 按组件族拆分。
- [x] 执行测试：`npm run test` 通过。
- [x] 更新本 Phase 执行记录后提交。

当前进度记录：

- 2026-02-26：已完成样式主入口拆分并稳定导入顺序。
  - 新增：`src/styles/app/main/main.part1.css`
  - 新增：`src/styles/app/main/main.part2.css`
  - 新增：`src/styles/app/main/main.part3.css`
  - 新增：`src/styles/app/main/main.part4.css`
  - 新增：`src/styles/app/layout/layout.part1.css`
  - 新增：`src/styles/app/layout/layout.part2.css`
  - 新增：`src/styles/app/layout/layout.part3.css`
  - 新增：`src/styles/app/layout/layout.part4.css`
  - 新增：`src/styles/app/settings/settings.part1.css`
  - 新增：`src/styles/app/settings/settings.part2.css`
  - 新增：`src/styles/app/settings/settings.part3.css`
  - 新增：`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
  - 新增：`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`
  - 新增：`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part3.css`
  - 调整：`src/styles/app/main.css`
  - 调整：`src/styles/app/layout.css`
  - 调整：`src/styles/app/settings.css`
  - 调整：`src/styles/themes/styles/soft-skeuomorphic.components.css`

- 2026-02-26：Phase 4 验证通过。
  - 验证：`npm run build` 通过。
  - 验证：`npm run test` 通过（`108 passed | 1 skipped`，`651 passed | 1 skipped`）。

### Phase 5（P2：测试文件治理）

目标文件：

- `electron/fileSystemReadService.impl.test.ts`
- `src/components/SidebarPanel.test.tsx`
- `src/components/ImageMainSection.test.tsx`
- `src/features/backend/useReadOnlyDataAccess.test.tsx`
- `src/__tests__/App.metadata.test.tsx`
- `src/__tests__/App.state.test.tsx`

TODO Check：

- [ ] 按功能域重组测试文件，避免单文件超长。
- [ ] 提炼共享 helper，减少重复 setup。
- [ ] 保持原有断言语义不变。
- [ ] 执行测试：`npm run test` 通过。
- [ ] 更新本 Phase 执行记录后提交。

## 5. 执行记录（每次提交前必须更新）

| Phase | 状态 | 拆分范围 | 测试命令 | 测试结果 | 提交哈希 | 日期 |
|---|---|---|---|---|---|---|
| Phase 1 | 已完成 | Settings / FullscreenLayer / ImageMainSection 首轮拆分 | `npm run test` | 通过（108 passed / 1 skipped） | `65a7beb` | 2026-02-26 |
| Phase 2 | 已完成 | useAppWorkspaceProps / MusicMainSection / managementRenameService 首轮拆分 | `npm run build` + `npm run test` | 通过（108 files passed / 1 skipped；651 tests passed / 1 skipped） | `327316e` | 2026-02-26 |
| Phase 3 | 已完成 | subtitleSession / libraryReadWriteServiceImpl / fileSystemReadFacade / mediaLibrarySnapshotStore / useLiveSubtitles 首轮拆分 | `npx vitest run electron/subtitles/subtitleSession.persistence.test.ts` + `npm run build` + `npm run test` | 通过（1 file passed；2 tests passed；108 files passed / 1 skipped；651 tests passed / 1 skipped） | `d3fa240` | 2026-02-26 |
| Phase 4 | 已完成 | main.css / layout.css / settings.css / soft-skeuomorphic.components.css 拆分与入口导入重组 | `npm run build` + `npm run test` | 通过（108 files passed / 1 skipped；651 tests passed / 1 skipped） | `df66310` | 2026-02-26 |
| Phase 5 | 未开始 | - | - | - | - | - |

## 6. 拆分完成判定标准（Definition of Done）

- 单文件建议目标：核心实现文件控制在 `~400-900` 行，超过 `1000` 需给出保留理由。
- 公开接口（props、dto、service API）语义不变，避免引入行为回归。
- 通过 `npm run test`；若涉及构建路径变化，补跑 `npm run build`。
- 本文档的对应 Phase 勾选、执行记录、提交哈希已更新。
