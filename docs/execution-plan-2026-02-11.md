# 执行方案（临时，完成后删除）- 2026-02-11

注意：本文件为“阶段性执行方案”。当本文所有阶段的 DoD（完成定义）全部达成后：

- 删除本文件 `docs/execution-plan-2026-02-11.md`
- 同步从 `README.md` 与 `docs/README.md` 移除引用

## 0. 背景与目标

目标：修复桌面打包版 (exe) 与 `npm run dev:desktop` 行为不一致的问题，并推进一组交互/性能/生产能力改造，使“真实库 + 导入 + 元数据/评分 + 检索 + 向量能力”形成可回归闭环。

本方案按“先修一致性，再修交互，再做性能，再加能力”的顺序推进，避免在 mock 数据 (mock data) 状态下堆叠功能造成误判。

## 1. 范围（用户反馈问题清单）

### 1.1 exe（桌面打包产物）

1. 同步 `npm run dev:desktop` 与 exe 表现（当前不一致）：
   - 1a exe 使用 mock 数据，设置中“清除数据库”仍不变
   - 1b exe 导入功能无效

### 1.2 `npm run dev:desktop`（桌面开发模式）

1. 视频模式下，点击元数据面板的按钮无法触发检索（之前可以）
2. 图片模式下，非“元数据管理”模式下，评分系统仍需要可使用
3. 评分系统使用时，不应该触发缩略图界面的刷新
4. 缩略图界面增加 buffer：预渲染上一页/下一页，避免翻页闪动
5. 元数据管理模式：加入第二种 tags 生成方式——要求视觉模型 (vision model) 仅返回指定范围内 tag
6. 元数据管理模式：加入 embedding（嵌入向量）数据生成按钮，接通向量检索与向量宇宙所需数据
7. “检索/文件管理/元数据管理”三者不再互斥不可点击：点击任意模式按钮时自动关闭当前模式并切换到目标模式

## 2. 关键术语与架构锚点（用于定位）

- 仓库模式：mock/real 两套 Repository。
  - `VITE_MEDIA_REPOSITORY_MODE=mock|real` 可强制指定。
  - 未指定时：开发构建若检测到 `window.mediaPlayerBackend`（preload bridge 注入）则使用 real，否则使用 mock；生产/打包构建默认强制 real，禁止静默回退到 mock。
- 静默检索 (silent search)：不展开检索面板、不写入检索面板输入控件，但驱动读链路进入“检索结果”视图，并提供 Sidebar “返回”按钮清空。
- 库变更事件：Main 侧通过 IPC 发出 `libraryChanged`（带 `reason`），Renderer 侧据此决定刷新粒度。

## 3. 分阶段执行计划

以下阶段为“可独立验收”的最小闭环。每个阶段都需要：

- 通过自动化：`npm run build && npm run test`
- 通过桌面开发手测：`npm run dev:desktop`
- 若涉及 exe：`npm run desktop:build` 后验证 `release/win-unpacked/MediaPlayerX.exe`

### P0：exe 与 dev:desktop 行为对齐（先消灭 mock 回退）

目标：exe 必须稳定运行在 real repository，不允许在生产/打包环境静默回落 mock；导入与清库在 exe 生效。

高概率根因（需验证）：exe 未注入 preload bridge 导致 `window.mediaPlayerBackend` 不存在，从而 Renderer 选择 mock；mock 的 `pickImportPaths` 返回空数组，表现为“导入无效”；mock 的“清库”对真实 SQLite 无影响，表现为“清库不变”。

任务清单：

- [x] 增加“运行时诊断信息”并在 UI 可见：
  - 诊断项至少包含：repository 模式、`window.mediaPlayerBackend` 是否存在、应用版本、数据库路径（或可推导信息）。
  - 建议：新增 IPC `getRuntimeInfo`（或等价）并在设置面板/状态栏展示。
  - 参考文件：`electron/preload.ts`、`electron/registerBackendIpcHandlers.ts`、`src/features/backend/repository/createRepository.ts`、`src/components/settings/*`
- [x] 生产/打包环境禁止静默 mock fallback：
  - 若未检测到 backend bridge：在 UI banner 明确报错（可附“如何修复”提示），而不是继续用 mock。
  - 参考文件：`src/features/backend/repository/createRepository.ts`
- [ ] 确认打包产物加载正确的 preload：
  - `BrowserWindow({ webPreferences: { preload } })` 路径在 dev/prod 都可用。
  - 验证：`release/win-unpacked/resources/app.asar` 内包含 `dist-electron/preload.cjs` 且运行时生效。
  - 参考文件：`electron/main.ts`、`scripts/build-electron.mjs`、`package.json#build`

验收（DoD）：

- exe：导入文件/文件夹后任务面板出现任务记录，Sidebar/主区数据发生变化。
- exe：设置面板执行“清除数据库”后重启，库内容为空且不再显示 mock。
- exe：运行时诊断信息显示 real 模式且 backend bridge 存在。

### P1：交互回归与模式切换（按“静默检索”口径）

目标：恢复“视频元数据点击触发检索”，并将“检索/文件管理/元数据管理”改为自动切换模式。

任务清单：

- [x] 视频模式支持静默检索：
  - 元数据面板点击社团/作者/tag -> 进入检索结果态（Sidebar 变更），不展开检索面板。
  - Sidebar 提供“返回”按钮清空静默筛选。
  - 参考文件：`src/features/search/useFeatureSearch.ts`、`src/features/app/useAppReadState.ts`、`src/features/app/useAppWorkspaceProps.ts`、`src/components/SidebarPanel.tsx`、`src/features/app/useSearchAndVectorActions.ts`
- [x] 三模式按钮从“互斥禁用”改为“自动切换”：
  - 点击任意模式按钮：关闭当前模式（含必要状态清理）并打开目标模式。
  - 不再出现“另一个按钮不可点击”。
  - 参考文件：`src/components/AppHeader.tsx`、`src/features/app/buildAppHeaderProps.ts`、`src/features/app/useManageModeActions.ts`、`src/features/app/useMetadataManageModeActions.ts`

验收（DoD）：

- `npm run dev:desktop`：视频模式点击元数据 chip 可触发检索；Sidebar 显示“返回”并可清空。
- 三按钮来回切换，模式状态正确且无 disabled。

### P2：评分可用性 + 性能（评分不刷页、翻页预渲染）

目标：评分在非“元数据管理”下可用；评分写入不应造成缩略图区刷新；翻页更平滑。

任务清单：

- [ ] 图片模式评分在只读元数据可用（评分不等于元数据编辑）：
  - UI 侧把评分的 disabled 条件与 `editable` 解耦。
  - 参考文件：`src/components/metadata/MetadataImageEditor.tsx`
- [ ] 评分写入不触发缩略图页刷新：
  - 根据 `libraryChanged.reason=write-package-grade` 做最小刷新，避免 page/sidebar 读链路重跑。
  - 仅在“按评分筛选”启用时才把 `grade_overrides` 作为读请求依赖。
  - 参考文件：`electron/services/file-system-read/libraryReadWriteService.ts`、`src/features/backend/useReadOnlyDataAccess.ts`、`src/features/app/useAppReadState.ts`
- [ ] 缩略图翻页 buffer：预渲染上一页/下一页 (prefetch)：
  - 在缩略图 resolve 阶段扩展 targets：当前页 + 前后各一页（受并发上限控制）。
  - 参考文件：`src/features/app/useResolvedMediaState.ts`、`src/features/backend/useResolvedMediaUrls.ts`

验收（DoD）：

- 连续点评分：缩略图不闪、不跳页，评分立即可见。
- 连续翻页：明显减少空白闪动。

### P3：元数据管理新增“视觉模型 tags 生成”（第二种方式）

目标：在“元数据管理”中新增按钮，调用视觉模型仅返回指定范围内 tags（范围由 CSV 提供），并写回图包 tags。

任务清单：

- [ ] 新增设置项：CSV 路径（tag 范围）+ 视觉模型 endpoint/model（复用或新增字段）。
- [ ] 新增后端写接口：`generatePackageAutoTagsVision`（命名可调整）
  - 输入：package_id、csv_path、endpoint、model、策略参数（抽样张数/温度/超时等）。
  - 输出：generated_tags、analyzed_images、updated_at_ms。
- [ ] 视觉模型返回 JSON 严格校验：只接受范围内 tags，超出则丢弃并记录审计信息。
- [ ] UI：新增按钮与 pending 状态；支持 Sidebar 勾选批量。

验收（DoD）：

- 可在管理模式下生成 tags 并写回；重启后仍存在（SQLite 持久化）。

### P4：元数据管理新增“embedding 生成”并接通向量能力

目标：生成 embedding 写入 `image_item.feature_vector_json`，使向量检索与向量宇宙拥有真实向量输入。

任务清单：

- [ ] 后端新增写接口：`generatePackageEmbeddings`（或按勾选批量的 API）
  - 输入：package_id(s)、LM Studio endpoint、embedding model、并发/重试/超时。
  - 写入：更新 `feature_vector_json`。
  - 事件：完成后 emit `libraryChanged`（reason 单独定义）。
- [ ] UI：元数据管理新增按钮 + pending + 进度/统计。
- [ ] 回归：向量检索排序不再全相同，向量宇宙分布可见变化。

验收（DoD）：

- 生成后，向量检索结果可区分（不再全 0/同分）。
- 向量宇宙节点坐标不再全部重叠。

## 4. 回归测试清单（手工）

- Repository
  - [ ] 诊断信息显示 real，并且 backend bridge 存在
  - [ ] 导入有效（任务面板有记录，库内容变化）
  - [ ] 清除数据库后库清空
- 检索
  - [ ] 图片/视频：元数据点击社团/作者/tag 进入检索结果
  - [ ] Sidebar “返回”可清空检索结果态
- 评分
  - [ ] 非元数据管理模式评分可用
  - [ ] 评分不导致缩略图页刷新/闪烁
- 翻页
  - [ ] 上/下一页预渲染生效，闪动明显减少

## 5. 交付与清理

- 本文件用于记录执行细节与验收口径。
- 当 P0~P4 全部完成并通过回归后：删除本文件并移除 README 引用。
