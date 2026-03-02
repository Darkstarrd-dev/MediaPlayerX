# 模块文件索引（半自动）

Last updated: 2026-03-02

## 目标

- 本文档用于建立“模块 -> 文件”的快速定位索引，降低排障与改造时的检索成本。
- 本文档不替代 SSOT；业务规则与约束仍以各 SSOT 文档为准。
- 采用半自动维护：人工维护模块入口与风险点，文件清单通过命令按需实时展开。

## 使用方式

1. 先在“模块索引表”定位目标模块。
2. 优先阅读该模块“必读入口文件”和“关联 SSOT”。
3. 执行该模块“自动发现范围”命令，获取当前最新文件清单。
4. 涉及跨层改造时，按“IPC 协议链路”从 contracts -> preload -> ipc -> repository/main 全链路检查。

## 模块索引表

| 模块 | 必读入口文件（人工维护） | 自动发现范围（半自动） | 关联 SSOT |
|---|---|---|---|
| IPC 协议链路 | `electron/channels.ts`、`src/contracts/backend.schemas.ts`、`electron/registerBackendIpcHandlers.ts`、`src/features/backend/repository/realRepository.ts`、`src/backend-api.d.ts` | `rg --files electron/facade electron | rg "channels|registerBackendIpcHandlers|preload|facade"`；`rg --files src/contracts src/features/backend/repository src | rg "backend"` | `docs/06-backend-integration-guardrails.md` |
| Electron Main 门面与服务编排 | `electron/fileSystemReadFacade.ts`、`electron/fileSystemReadService.ts`、`electron/services/file-system-read/fileSystemReadFacadeConfig.ts` | `rg --files electron/services/file-system-read electron | rg "fileSystemRead|management|runtimeDependency|archive|mediaResource"` | `docs/04-architecture-v1.md` |
| 数据库与快照存储 | `electron/mediaLibraryDatabase.ts`、`electron/mediaLibrarySchema.ts`、`electron/mediaLibrarySnapshotStore.ts`、`electron/mediaLibraryAppStateStore.ts` | `rg --files electron | rg "mediaLibrary(Database|Schema|Snapshot|AppState|Task|Playlist|Metadata)"` | `docs/04-architecture-v1.md` |
| 任务编排与 Worker | `electron/services/task-orchestrator/processTaskOrchestrator.ts`、`electron/archiveNormalizeWorker.ts`、`electron/thumbnailRenderWorker.ts` | `rg --files electron/services/task-orchestrator electron | rg "Worker|task|orchestrator|archiveNormalize|thumbnailRender"` | `docs/04-architecture-v1.md` |
| Renderer 顶层编排（App Pipeline） | `src/App.tsx`、`src/features/app/useAppController.ts`、`src/features/app/useAppDataPipeline.ts`、`src/features/app/useAppRuntimeSources.ts` | `rg --files src/features/app src | rg "useApp|build.*Props|workspace|pipeline|controller"` | `docs/04-architecture-v1.md`、`docs/05-interaction-v1.md` |
| 后端仓库抽象（Repository） | `src/features/backend/repository/types.ts`、`src/features/backend/repository/realRepository.ts`、`src/features/backend/repository/mockRepository.ts` | `rg --files src/features/backend/repository src/features/backend | rg "repository|useReadOnlyDataAccess|useWriteDataAccess"` | `docs/06-backend-integration-guardrails.md` |
| 导入链路（拖拽/粘贴/队列） | `src/features/import/useImportPipeline.ts`、`src/features/import/useImportPaste.ts`、`src/features/import/useImportDragOverlay.ts`、`electron/fileSystemImportTasks.ts` | `rg --files src/features/import electron | rg "import|clipboard|drag|paste|task"` | `docs/04-architecture-v1.md`、`docs/05-interaction-v1.md` |
| 管理模式（删除/移动/重命名/审核/转换） | `src/features/management/useManageSelection.ts`、`src/features/management/useManageImageSelectionInteractions.ts`、`electron/services/file-system-read/managementMutationService.ts`、`electron/services/file-system-read/manageAdReviewService.ts`、`electron/services/file-system-read/managementImageConvertService.ts` | `rg --files src/features/management electron/services/file-system-read | rg "manage|management|review|convert|rename|move|delete"` | `docs/05-interaction-v1.md`、`docs/06-backend-integration-guardrails.md` |
| 媒体状态与播放桥接 | `src/features/media/useMediaState.ts`、`src/features/media/musicPlaybackBridge.ts`、`src/features/media/usePlaylistPersistence.ts`、`electron/services/audio-engine/audioEngineController.ts` | `rg --files src/features/media electron/services/audio-engine | rg "media|playback|playlist|audioEngine|mpv"` | `docs/04-architecture-v1.md`、`docs/19-mpv-增强模式与转码实施计划-v1.md` |
| 音乐可视化（legacy/plugin） | `src/features/music-visualizer/useMusicVisualizerRuntime.ts`、`src/features/music-visualizer/useMusicVisualizerPluginRuntime.ts`、`src/features/music-visualizer/shaderRegistry.ts`、`src/features/music-visualizer/plugin/inputBinder.ts` | `rg --files src/features/music-visualizer | rg "shader|visualizer|runtime|plugin|renderer|audio"` | `docs/12-music-visualizer-shader-entry.md`、`docs/13-music-visualizer-shader-migration-playbook.md`、`docs/28-shader-plugin-implementation-checklist-v1.md` |
| 字幕链路（离线/实时） | `src/features/subtitles/useLiveSubtitles.ts`、`src/features/subtitles/liveSubtitlesRepositoryApi.ts`、`electron/services/file-system-read/subtitleModelService.ts`、`electron/services/file-system-read/librarySubtitleCleanupTaskService.ts` | `rg --files src/features/subtitles electron/services/file-system-read | rg "subtitle|cue|sherpa|cleanup"` | `docs/18-offline-auto-subtitle-implementation-plan.md` |
| 元数据解析与抓取 | `src/features/metadata/parseExternalMetadata.ts`、`src/features/metadata/metadataFetchTargets.ts`、`electron/services/metadata/metadataScraperService.ts` | `rg --files src/features/metadata electron/services/metadata docs/ref | rg "metadata|scraper|nhentai|ehentai"` | `docs/03-requirements-v1.md`、`docs/04-architecture-v1.md` |
| 搜索与侧边栏导航 | `src/features/search/useFeatureSearch.ts`、`src/features/sidebar/useSidebarNavigation.ts`、`src/features/sidebar/normalizePointerSidebarTree.ts` | `rg --files src/features/search src/features/sidebar src/features/app | rg "search|sidebar|navigation|tree"` | `docs/05-interaction-v1.md` |
| 主题系统与 UI 槽位 | `src/features/theme/themeRegistry.ts`、`src/styles/app/main/main.part1.css`、`docs/10-ui_definition.md`、`docs/11-token_design.md` | `rg --files src/features/theme src/styles/app docs | rg "theme|token|ui_definition|slot|main\.part"` | `docs/08-theme-system-v2.md`、`docs/09-theme-brainstorm-entry.md`、`docs/10-ui_definition.md`、`docs/11-token_design.md` |
| 布局、间距与响应式 | `src/features/layout/runtimeSpacing.ts`、`src/features/layout/thumbnailLayout.ts`、`src/styles/app/layout.css`、`src/styles/app/responsive.css` | `rg --files src/features/layout src/styles/app | rg "layout|spacing|thumbnail|responsive|pane"` | `docs/05-interaction-v1.md` |
| 快捷键与性能基准 | `src/features/shortcuts/useShortcutEngine.ts`、`src/features/perf/benchSettings.ts`、`scripts/run-ui-bench.mjs`、`scripts/run-ui-bench-matrix.mjs` | `rg --files src/features/shortcuts src/features/perf scripts | rg "shortcut|bench|perf|matrix"` | `docs/24-high-optimization-demand-table.md` |
| 运行时依赖与外部认证 | `electron/services/file-system-read/runtimeDependencyService.ts`、`electron/runtimeDiagnostics.ts`、`electron/services/auth/externalAuthSessionManager.ts`、`electron/services/auth/externalAuthProviders.ts` | `rg --files electron/services electron | rg "runtimeDependency|runtimeDiagnostics|auth|external"` | `docs/04-architecture-v1.md`、`docs/27-Tips.md` |

## 高频场景速查

| 场景 | 先看文件 | 再看文件 |
|---|---|---|
| 新增 IPC 字段后前端未生效 | `src/contracts/backend.schemas.ts` | `electron/registerBackendIpcHandlers.ts`、`src/features/backend/repository/realRepository.ts`、`src/backend-api.d.ts` |
| 导入后 Sidebar 未刷新 | `electron/fileSystemImportTasks.ts` | `electron/services/file-system-read/librarySnapshotService.ts`、`src/features/sidebar/useSidebarNavigation.ts` |
| 缩略图生成慢/失败 | `electron/thumbnailRenderWorker.ts` | `electron/services/file-system-read/mediaResourceService.ts`、`src/features/app/useAppDisplayResources.ts` |
| 管理模式删除/重命名异常 | `electron/services/file-system-read/managementMutationService.ts` | `electron/services/file-system-read/managementRenameService.ts`、`src/features/management/useManageSelection.ts` |
| 字幕生成链路异常 | `electron/services/file-system-read/subtitleModelService.ts` | `src/features/subtitles/useLiveSubtitles.ts`、`src/features/subtitles/VideoSubtitleCapture.ts` |
| 主题槽位样式错位 | `docs/10-ui_definition.md` | `docs/11-token_design.md`、`src/styles/app/*` |

## 新功能维护要求（必须执行）

- 新增模块、子系统或跨层链路时，必须在本文档新增或更新对应行。
- 新增入口文件、重命名关键文件、目录重构后，必须同步更新“必读入口文件”和“自动发现范围”。
- 变更涉及 IPC 协议时，除代码改动外必须同步检查：`electron/channels.ts`、`src/contracts/backend.schemas.ts`、`electron/registerBackendIpcHandlers.ts`、`src/features/backend/repository/realRepository.ts`。
- 变更涉及 UI 槽位时，必须同步更新：`docs/10-ui_definition.md` 与 `docs/11-token_design.md`。

## 推荐提交前自检

- 是否能通过本索引在 3 分钟内定位到本次改动的核心文件。
- 是否补齐跨层链路（contracts/preload/ipc/repository/main）而非只改单点。
- 是否同步更新了相关 SSOT 文档引用。
