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

- [ ] 拆分 `SettingsPanel`：状态管理 / 绑定录制 / 拖拽逻辑分离。
- [ ] 拆分 `renderSettingsMainSectionContent`：按 section 渲染器拆文件。
- [ ] 拆分 `FullscreenLayer`：pane 计算、拖拽、调参面板逻辑提取。
- [ ] 拆分 `ImageMainSection`：普通工具栏、审查流程、转换面板解耦。
- [ ] 执行测试：`npm run test` 通过。
- [ ] 更新本 Phase 执行记录后提交。

### Phase 2（P0 首轮：工作区编排与音乐）

目标文件：

- `src/features/app/useAppWorkspaceProps.impl.ts`
- `src/components/MusicMainSection.tsx`
- `electron/services/file-system-read/managementRenameService.ts`

TODO Check：

- [ ] `useAppWorkspaceProps` 参数与派生逻辑按 domain 拆分。
- [ ] `MusicMainSection` 视图/播放控制/可视化运行时拆分。
- [ ] `ManagementRenameService` 重命名计划与执行路径解耦。
- [ ] 执行测试：`npm run test` 通过。
- [ ] 更新本 Phase 执行记录后提交。

### Phase 3（P0/P1：后端会话与读写）

目标文件：

- `electron/subtitles/subtitleSession.ts`
- `electron/services/file-system-read/libraryReadWriteServiceImpl.ts`
- `electron/fileSystemReadFacade.impl.ts`
- `electron/mediaLibrarySnapshotStore.ts`
- `src/features/subtitles/useLiveSubtitles.ts`

TODO Check：

- [ ] `subtitleSession` 按 transport/session/persistence 分层。
- [ ] `libraryReadWriteServiceImpl` 按 read/write/subtitle-cleanup 拆分。
- [ ] `fileSystemReadFacade` 精简装配器，保持 handlers 边界稳定。
- [ ] `mediaLibrarySnapshotStore` 抽离 SQL 查询和 mapper。
- [ ] `useLiveSubtitles` 拆分 queue/session/persistence hook。
- [ ] 执行测试：`npm run test` 通过。
- [ ] 更新本 Phase 执行记录后提交。

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
| Phase 1 | 未开始 | - | - | - | - | - |
| Phase 2 | 未开始 | - | - | - | - | - |
| Phase 3 | 未开始 | - | - | - | - | - |
| Phase 4 | 未开始 | - | - | - | - | - |
| Phase 5 | 未开始 | - | - | - | - | - |

## 6. 拆分完成判定标准（Definition of Done）

- 单文件建议目标：核心实现文件控制在 `~400-900` 行，超过 `1000` 需给出保留理由。
- 公开接口（props、dto、service API）语义不变，避免引入行为回归。
- 通过 `npm run test`；若涉及构建路径变化，补跑 `npm run build`。
- 本文档的对应 Phase 勾选、执行记录、提交哈希已更新。
