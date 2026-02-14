# Music Mode 实施计划（Implementation Plan）

## 0. 决策冻结（已确认）

- 目标模式：新增 `music` 浏览模式，端到端可用（扫描、入库、播放、元数据编辑、跨模式跳转）。
- 元数据持久化：音频元数据写入 SQLite（`library.sqlite`），不写回原始音频文件。
- 元数据来源：扫描入库时优先读取音频标签（`ID3` / `Vorbis Comment`），缺失字段使用现有回退策略。
- UI 约束：主区使用“纯文件名列表（names-only）”布局；不提供缩略图网格。
- 控制条约束：使用 `music-controls-shell`，仅保留音量、上一首、播放/暂停、下一首。
- 交互约束：保留现有单例弹层（single-open popover）与应用整体布局结构（header + sidebar + main + metadata/footer）。

### 本轮新增决策（Music Motion Visualizer）

- Shader 来源：固定使用 Shadertoy `McsSzB`，当前版本确认为单 pass（无 Buffer A/B/C/D）。
- 技术约束：优先不新增依赖，使用 WebGL2 + GLSL（OpenGL Shading Language）完成主渲染。
- 解耦目标：播放器主体仅提供输入（时间、分辨率、音频频谱、开关参数）；Shader 资源与适配层独立，可单独增删替换。
- 全屏策略：音乐模式可视化支持全屏；沿用现有全屏状态与快捷键（Esc/F）行为语义。
- 性能策略：渲染分辨率采用“容器长边目标分辨率”控制，必要时固定低分辨率渲染后缩放显示。
- 调试策略：设置面板“界面设置”新增 3 项：实际渲染分辨率、FPS 显示、CPU/GPU 渲染模式切换。

## 1. 执行规则（必须遵守）

1. 严格按步骤顺序执行，不并行跨步开发。
2. 每步完成后，先更新本文档 checklist 与“执行记录”，再做提交。
3. 每步至少执行最小必要测试（targeted tests）；关键里程碑补充回归测试。
4. 测试通过后执行：`git add` -> `git commit` -> `git push`，再进入下一步。
5. 若测试失败：先修复再提交，禁止带失败状态进入下一步。

## 2. 总体 Checklist

- [x] Step 0：落地实施计划文档（本文件）
- [x] Step 1：扩展前后端模式与合约（`music` + `audio` DTO 基础）
- [x] Step 2：Electron 扫描链路支持音频文件与 `media_type=audio`
- [x] Step 3：数据库 Schema 迁移（`audio_item` / `audio_metadata`）与快照读写
- [x] Step 4：入库时解析 `ID3` / `Vorbis` 标签并写入 metadata override
- [x] Step 5：前端状态层接入 music（读取、选择、播放列表、sidebar scope）
- [x] Step 6：新增 `MusicMainSection`（names-only + `music-controls-shell`）
- [x] Step 7：Metadata 面板接入 `MetadataMusicEditor`（album/author/title/seriesId）
- [x] Step 8：seriesId 跨模式跳转（music -> manga/image、music -> animation/video）
- [x] Step 9：测试补齐与文档同步（interaction/architecture 必要更新）
- [x] Step 10：最终回归、收尾提交与推送
- [x] Step 11：Visualizer 架构拆分与设置项扩展（分辨率/FPS/CPU-GPU）
- [x] Step 12：Shadertoy `McsSzB` -> WebGL2 GLSL 适配与 Shader 注册机制
- [x] Step 13：音频输入链路（Web Audio API）与 `iChannel0` 音频纹理
- [x] Step 14：MusicMainSection 集成、全屏模式接线与占位替换
- [x] Step 15：性能与保底策略（固定分辨率缩放、FPS HUD、CPU fallback）
- [ ] Step 16：回归测试、文档同步与发布收尾

## 3. 分步执行明细

### Step 0：落地实施计划文档

- 目标：固定实现边界、步骤、测试策略、提交节奏。
- 变更文件：`docs/music-mode-implementation-plan.md`
- 测试：无（文档变更）。
- 完成标准：文档入库且 Step 0 勾选。

### Step 1：扩展前后端模式与合约

- 目标：让 `music` 成为一等模式，建立 `audio` 基础 DTO/类型。
- 主要文件（预期）：
  - `src/types.ts`
  - `src/contracts/settings.ts`
  - `src/contracts/backend.ts`
  - `src/features/backend/mappers.ts`
  - `src/features/backend/repository/mock/mappers.ts`
- 关键任务：
  - `BROWSER_MODES` 增加 `music`。
  - `browserModeSchema` / `browserModeDtoSchema` 增加 `music`。
  - `mediaLocator.media_type` 增加 `audio`。
  - 新增 `audioItemDtoSchema` 与前端 `AudioItem` 映射。
- 测试（最小）：
  - `npm run test -- src/features/backend/mappers.test.ts`
  - `npm run test -- src/contracts`

### Step 2：Electron 扫描链路支持音频

- 目标：扫描层识别音频文件并进入 snapshot 构建流程。
- 主要文件（预期）：
  - `electron/services/file-system-read/fileSystemReadFacadeConfig.ts`
  - `electron/fileSystemServiceHelpers.ts`
  - `electron/fileSystemMediaAccessGuard.ts`
  - `electron/services/file-system-read/librarySnapshotService.ts`
- 关键任务：
  - 新增 `AUDIO_EXTENSIONS`（至少：`.mp3/.flac/.wav/.ogg/.m4a/.opus/.aac`）。
  - MIME 识别补齐 `audio/*`。
  - 资源访问白名单（allowlist）支持 `audio`。
  - snapshot 构建阶段收集 `audio` 记录。
- 测试（最小）：
  - `npm run test -- electron/fileSystemMediaAccessGuard.test.ts`
  - `npm run test -- electron/services/file-system-read/librarySnapshotService.test.ts`

### Step 3：数据库 Schema 迁移与快照读写

- 目标：在 SQLite 增加音频实体与元数据表，支持快照落库/回读。
- 主要文件（预期）：
  - `electron/mediaLibrarySchema.ts`
  - `electron/mediaLibrarySchema.test.ts`
  - `electron/mediaLibrarySnapshotStore.ts`
  - `electron/mediaLibrarySnapshotStore.test.ts`
  - `src/contracts/backend.ts`（`librarySnapshotDto` 增加 `audios`）
- 关键任务：
  - 升级 `SCHEMA_VERSION`。
  - 新增 `audio_item`（基础信息）与 `audio_metadata`（album/author/title/series_id）。
  - 快照写入/读取链路补齐 audios。
- 测试（最小）：
  - `npm run test -- electron/mediaLibrarySchema.test.ts`
  - `npm run test -- electron/mediaLibrarySnapshotStore.test.ts`

### Step 4：入库时解析 ID3/Vorbis 标签

- 目标：音频导入时自动抽取可用元数据并写入 SQLite。
- 主要文件（预期）：
  - `electron/services/file-system-read/librarySnapshotService.ts`
  - `electron/fileSystemRuntimeHelpers.ts`（或新增 audio probe helper）
  - `electron/mediaLibraryMetadataStore.ts`
  - `electron/mediaLibraryMetadataStore.test.ts`
- 关键任务：
  - 解析标签字段映射：
    - `album <- album`
    - `author <- artist`
    - `track_title <- title`
    - `series_id <- comment/description`（若无统一标签则留空）
  - 缺失字段时回退：保持空字符串，不伪造值。
- 测试（最小）：
  - `npm run test -- electron/mediaLibraryMetadataStore.test.ts`
  - 新增基于 fixture 的标签解析测试。

### Step 5：前端状态层接入 music

- 目标：应用状态可在 music 模式下完成列表选择、播放上下文、sidebar 过滤。
- 主要文件（预期）：
  - `src/features/app/useAppReadState.ts`
  - `src/features/app/useAppNavigationState.ts`
  - `src/features/app/useAppSidebarScopeState.ts`
  - `src/features/app/useAppWorkspaceProps.ts`
  - `src/components/SidebarPanel.tsx`
- 关键任务：
  - 建立 `audioById` / `selectedAudioId` / `audio playlist` 状态。
  - Sidebar 在 `mode=music` 时使用音频树。
  - mode 切换逻辑覆盖 `music`。
- 测试（最小）：
  - `npm run test -- src/features/app/useAppWorkspaceProps.test.ts`
  - `npm run test -- src/components/SidebarPanel.test.tsx`

### Step 6：主区 `MusicMainSection`

- 目标：落地音乐主区 UI 与播放控制。
- 主要文件（预期）：
  - `src/components/MusicMainSection.tsx`（新）
  - `src/components/AppWorkspace.tsx`
  - `src/features/app/buildMusicMainSectionProps.ts`（新）
  - `src/styles/app/main.css`
- 关键任务：
  - 列表 UI 复用 names-only 结构（文件名/大小/时长）。
  - 新增 `music-controls-shell`：音量 + prev/play-next。
  - `<audio>` 播放器接入：播放、暂停、上一首、下一首、音量。
  - 保持 popover 单开策略。
- 测试（最小）：
  - `npm run test -- src/components/MusicMainSection.test.tsx`
  - `npm run test -- src/components/AppWorkspace.test.tsx`

### Step 7：Metadata 面板（Music）

- 目标：提供 music 元数据编辑与保存。
- 主要文件（预期）：
  - `src/components/MetadataPanel.tsx`
  - `src/components/metadata/MetadataMusicEditor.tsx`（新）
  - `src/features/app/useMetadataWriteBindings.ts`
  - `src/features/backend/useWriteDataAccess.ts`
- 关键任务：
  - 输入项：`album`、`author`、`trackTitle`、`seriesId`。
  - 显示项：仅 `album`、`author`、`trackTitle`。
  - 写入 IPC 与 DTO 对齐 SQLite `audio_metadata`。
- 测试（最小）：
  - `npm run test -- src/components/metadata/MetadataMusicEditor.test.tsx`
  - `npm run test -- src/features/app/useMetadataWriteBindings.test.ts`

### Step 8：seriesId 跨模式跳转

- 目标：music 与 image/video 间完成按 `seriesId` 快速跳转。
- 主要文件（预期）：
  - `src/features/app/useAppWorkspaceProps.ts`
  - `src/components/MusicMainSection.tsx`
  - `docs/interaction-v1.md`（若新增按钮说明）
- 关键任务：
  - music toolbar 增加“漫画版/动画版”跳转按钮。
  - 复用既有 `applyQuickFeatureSearch({ seriesId })`。
  - 跳转后定位首个匹配项并切换 metadata tab 语义一致。
- 测试（最小）：
  - `npm run test -- src/features/app/useAppWorkspaceProps.test.ts`
  - `npm run test -- src/components/MusicMainSection.test.tsx`

### Step 9：测试补齐与文档同步

- 目标：补全新增链路测试与文档。
- 主要文件（预期）：
  - `docs/interaction-v1.md`
  - `docs/architecture-v1.md`
  - 新增/更新相关 test 文件
- 关键任务：
  - 增加音频模式行为说明、快捷键行为与边界条件。
  - 确认后端 schema 迁移和 IPC 合约文档同步。
- 测试（最小）：
  - `npm run test`
  - `npm run lint`

### Step 10：最终回归与收尾

- 目标：完成端到端回归并关闭实施项。
- 回归清单：
  - image/video 既有能力无回归。
  - music 模式：扫描、显示、播放、metadata 写入、seriesId 跳转全部可用。
  - 跨模式切换与 popover 行为稳定。
- 测试：
  - `npm run test`
  - `npm run build`
  - `npm run lint`

### Step 11：Visualizer 架构拆分与设置项扩展

- 目标：建立“可视化引擎与播放器解耦”的输入/渲染契约，并补齐设置项数据链路。
- 主要文件（预期）：
  - `src/features/music-visualizer/*`（新增：类型、注册器、运行时接口）
  - `src/contracts/settings.ts`
  - `src/store/useUiStore.ts`
  - `src/features/app/useAppSettingsStore.ts`
  - `src/features/app/usePersistedAppSettings.ts`
  - `src/features/app/buildSettingsPanelProps.ts`
  - `src/components/SettingsPanel.tsx`
  - `src/components/settings/renderSettingsMainSection.tsx`
- 关键任务：
  - 新增设置字段：
    - `musicVisualizerRenderLongEdgePx`（容器长边目标分辨率）
    - `musicVisualizerShowFps`（FPS 显示开关）
    - `musicVisualizerRenderer`（`gpu` / `cpu`）
  - 可视化输入协议统一：`iTime / iResolution / iFrame / iChannel0(audio)`。
  - 保持现有设置持久化协议兼容（老配置缺省值自动补齐）。
- 测试（最小）：
  - `npm run test -- src/store/useUiStore.test.ts`
  - `npm run test -- src/features/app/buildSettingsPanelProps.test.ts`

### Step 12：Shadertoy `McsSzB` 适配与 Shader 注册机制

- 目标：将提供的单 pass Shadertoy 代码稳定运行在 WebGL2 渲染管线中。
- 主要文件（预期）：
  - `src/features/music-visualizer/shaders/mcs_szb.ts`（或 `*.glsl` + 载入器）
  - `src/features/music-visualizer/shadertoyAdapter.ts`
  - `src/features/music-visualizer/webglRenderer.ts`
  - `src/features/music-visualizer/shaderRegistry.ts`
- 关键任务：
  - 适配 `mainImage(out vec4, in vec2)` 到 WebGL2 `#version 300 es`。
  - 提供默认 uniform：`iResolution`、`iTime`、`iFrame`、`iChannel0`。
  - 构建“注册即生效”机制：新增 shader 文件无需改 `App` 主体。
- 测试（最小）：
  - `npm run test -- src/features/music-visualizer/shadertoyAdapter.test.ts`
  - `npm run test -- src/features/music-visualizer/shaderRegistry.test.ts`

### Step 13：音频输入链路与 `iChannel0` 音频纹理

- 目标：让 Shader 真正随音频实时驱动。
- 主要文件（预期）：
  - `src/features/music-visualizer/useAudioAnalyser.ts`
  - `src/features/music-visualizer/audioTexture.ts`
  - `src/components/MusicMainSection.tsx`
  - `electron/fileSystemMediaReaders.ts`（若需补 CORS 头）
  - `electron/registerBackendIpcHandlers.ts`（协议响应头联动）
- 关键任务：
  - 通过 `AudioContext + AnalyserNode` 采样频谱/波形。
  - 生成 `512x2` 音频纹理并上传到 `iChannel0`。
  - 校验自定义协议音频可接入 analyser；若命中跨域限制，补齐必要响应头。
- 测试（最小）：
  - `npm run test -- src/components/MusicMainSection.test.tsx`
  - `npm run test -- electron/fileSystemMediaReaders.test.ts`

### Step 14：MusicMainSection 集成与全屏接线

- 目标：替换占位区，确保窗口模式与全屏模式都可用。
- 主要文件（预期）：
  - `src/components/MusicMainSection.tsx`
  - `src/features/app/buildMusicMainSectionProps.ts`
  - `src/features/app/useAppWorkspaceProps.ts`
  - `src/components/FullscreenLayer.tsx`
  - `src/styles/app/main.css`
  - `src/styles/app/layout.css`
- 关键任务：
  - 替换 `music-visualizer-placeholder` 为真实渲染容器。
  - 增加音乐模式进入全屏入口（按钮 + 现有快捷键 F/Esc 语义兼容）。
  - 处理音乐模式与现有 FullscreenLayer 的互斥显示，避免空白覆盖层。
- 测试（最小）：
  - `npm run test -- src/components/MusicMainSection.test.tsx`
  - `npm run test -- src/App.test.tsx`

### Step 15：性能与保底策略

- 目标：高分辨率场景可控，低配机器有稳定兜底方案。
- 主要文件（预期）：
  - `src/features/music-visualizer/perfHud.ts`
  - `src/features/music-visualizer/cpuFallbackRenderer.ts`
  - `src/features/music-visualizer/useVisualizerRuntime.ts`
  - `src/components/MusicMainSection.tsx`
- 关键任务：
  - 采用“实际渲染分辨率 < 展示分辨率”策略，按容器长边统一控制内部像素预算。
  - `musicVisualizerShowFps` 开启时显示 FPS、帧耗时、实际渲染尺寸、渲染后端。
  - `musicVisualizerRenderer='cpu'` 走 Canvas2D 频谱保底渲染（非 GLSL 等价实现）。
  - 明确标注软件渲染/硬件加速状态，辅助筛选低配保底效果。
- 测试（最小）：
  - `npm run test -- src/features/music-visualizer/*.test.ts`
  - `npm run test -- src/components/MusicMainSection.test.tsx`

### Step 16：回归、文档与收尾

- 目标：收口所有行为文档与测试，形成可持续扩展的 shader 管线。
- 主要文件（预期）：
  - `docs/interaction-v1.md`
  - `docs/architecture-v1.md`
  - `docs/readme.md`
  - （可选）`docs/music-visualizer-implementation-notes.md`
- 关键任务：
  - 文档补充：设置项说明、CPU/GPU 模式边界、分辨率建议、已验证性能基线。
  - 回归 image/video/music 三模式，确保无全局快捷键与 overlay 回归。
- 测试：
  - `npm run lint`
  - `npm run test`
  - `npm run build`

## 4. 每步提交模板

```bash
# 1) 更新本文件 checklist 与执行记录
# 2) 运行本步测试
# 3) 仅暂存本步相关文件（必须包含本文件）
git add <step-files> docs/music-mode-implementation-plan.md

# 4) 提交
git commit -m "feat(music): <step-summary>"

# 5) 推送
git push
```

## 5. 执行记录（逐步补充）

| Step | 状态 | 测试结论 | Commit | Push |
| --- | --- | --- | --- | --- |
| 0 | DONE | N/A（文档变更） | a0afed8 | DONE |
| 1 | DONE | PASS（`buildAppHeaderProps` + backend read/write/repository 相关 24 tests） | a171a5b | DONE |
| 2 | DONE | PASS（electron `fileSystemMediaAccessGuard` + `fileSystemReadService` 共 22 tests） | 86122ee | DONE |
| 3 | DONE | PASS（schema/snapshot-store/database/read-service 共 26 tests） | 8085593 | DONE |
| 4 | DONE | PASS（metadata-store/database/read-service 含音频标签入库共 25 tests） | f779c2d | DONE |
| 5 | DONE | PASS（`buildSidebarPanelProps` + `useAudioSidebarState` + app pipeline/settings/sidebar 相关 14 tests） | d161bb7 | DONE |
| 6 | DONE | PASS（`MusicMainSection` + `AppWorkspace` + resolved/effective/footer 相关 26 tests） | 71a6271 | DONE |
| 7 | DONE | PASS（`MetadataMusicEditor` + `useMetadataWriteBindings` + metadata/write-access 相关 13 tests） | d3894c6 | DONE |
| 8 | DONE | PASS（`MusicMainSection` 3 tests + `App` 定向用例 `音乐模式支持按系列ID跳转到动画版/漫画版`） | 10dfe42 | DONE |
| 9 | DONE | PASS（`npm run test` 214 tests + `npm run lint` 无 error；修复音乐模式空白页编译阻断） | fa1f6e1 | DONE |
| 10 | DONE | PASS（`npm run lint` + `npm run test` + `npm run build`） | 5d32555 | DONE |
| 11 | DONE（本地） | PASS（`npm run lint` + `npm run test -- src/App.test.tsx` + `npm run test -- src/components/MusicMainSection.test.tsx` + `npm run build` + `npm run build:electron`） | PENDING | PENDING |
| 12 | DONE（本地） | PASS（同 Step 11） | PENDING | PENDING |
| 13 | DONE（本地） | PASS（同 Step 11） | PENDING | PENDING |
| 14 | DONE（本地） | PASS（同 Step 11） | PENDING | PENDING |
| 15 | DONE（本地） | PASS（同 Step 11） | PENDING | PENDING |
| 16 | TODO | PENDING | PENDING | PENDING |
