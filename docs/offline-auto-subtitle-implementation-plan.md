# 离线自动字幕实施方案 (v1)

Last updated: 2026-02-17

## 1. 目标与范围

- 目标：在现有 MediaPlayerX 视频播放链路中，落地可选安装的离线自动字幕能力。
- 范围：Electron Main / preload / Renderer / settings / contracts / packaging / docs。
- 不在本期范围：在线字幕 API、CUDA 路线、多语言翻译字幕（双语对照）生产化。

## 2. 决策锁定（本方案强约束）

1. 放弃 CUDA 方案（不提供 CUDA provider，不引入 CUDA/cuDNN 依赖链）。
2. 支持 CPU / GPU(DirectML) 可选，并提供自动回退（DirectML -> CPU）。
3. 自动字幕模块为可选安装组件，不随基础安装强制落地。
4. 模型不随项目分发；用户在设置面板通过下拉选择并下载模型。
5. 模型下载目录由用户在设置面板选择并持久化。
6. 下载过程必须展示：百分比、速度、预计剩余时间（ETA）。
7. 当设置面板存在 proxy 配置时，下载前必须询问用户本次是否启用 proxy。

## 3. 现状基线（实施前）

- 已有字幕能力为外部字幕文件链路：同目录扫描、ffmpeg 转 vtt、`<track>` 加载。
- 已有设置持久化能力：`readAppState/writeAppState` + `ui_settings_v1`。
- 已有 IPC 与 schema 规范：`contracts/backend.ts` + `preload.ts` + `registerBackendIpcHandlers.ts`。
- 已有运行时能力矩阵：`runtimeDependencyService`。

## 4. 总体架构增量

### 4.1 模块分层

- Renderer：
  - 视频音频抓取（WebAudio + AudioWorklet）
  - 自动字幕 Overlay 渲染
  - 设置面板模型管理与下载交互
- Main：
  - 可选组件探测与引擎加载
  - 字幕会话编排（按 `webContents.id` 隔离）
  - 下载任务管理、进度推送、代理选择确认
- Worker：
  - ASR + VAD 推理
  - provider 自动回退与错误上报

### 4.2 与现有外部字幕的关系

- 外部字幕与自动字幕互斥：
  - 选择自动字幕时，停止 `<track>` 外部字幕链路。
  - 选择外部字幕时，停止自动字幕会话与音频上送。
- 外部字幕功能保持可用，不可回归。

## 5. Phase 计划

---

## Phase 0 - Spike 与风险清零

状态：`in_progress`（已启动，执行记录见 `docs/offline-auto-subtitle-phase0-report.md`）

### 目标

- 验证 DirectML/CPU provider 切换可行性。
- 验证视频音频抓取与时间轴映射可行性。
- 验证静音/音量策略不会导致自动字幕输入被置零。

### 涉及文件（新增或临时验证）

- `docs/ref/subtitle.md`（仅参考）
- `src/components/VideoMainSection.tsx`（调试点）
- `src/components/fullscreen/FullscreenPanes.tsx`（调试点）
- `src/features/music-visualizer/audioAnalyser.ts`（参考 WebAudio 接法）

### TODO

1. 在 dev 环境验证引擎最小可加载（CPU provider）。
2. 验证 DirectML provider 可用性；记录失败错误码与 fallback 条件。
3. 验证 `video.muted` 或 `volume=0` 时抓取音频是否失真/静音。
4. 输出结论：是否引入 GainNode 管音量（若需要，后续 Phase 4 落地）。

### Checklist

- [ ] CPU provider 能稳定初始化。
- [ ] DirectML provider 可探测，失败可识别原因。
- [ ] seek/pause/ratechange 的时间轴重置策略可行。
- [ ] 输出风险清单与后续实现约束。

---

## Phase 1 - 可选安装组件与运行时探测

### 目标

- 将离线自动字幕引擎做成安装可选组件。
- 主进程可探测组件是否安装，并向前端提供状态。

### 涉及文件

- `electron-builder.config.cjs`
- `scripts/electron-pack.mjs`
- `scripts/build-electron.mjs`
- `electron/services/file-system-read/runtimeDependencyService.ts`
- `src/contracts/backend.ts`
- `electron/channels.ts`
- `electron/registerBackendIpcHandlers.ts`
- `electron/preload.ts`
- `src/backend-api.d.ts`

### TODO

1. 安装器新增可选组件：`Offline Auto Subtitles`。
2. 组件安装目录约定：`resources/optional/offline-subtitles/**`。
3. Main 新增探测接口：是否安装、CPU/DirectML provider 可用性、错误信息。
4. 运行时能力矩阵追加“离线自动字幕”与“DirectML 加速”状态项。

### Checklist

- [ ] 未安装组件时，状态为 unavailable 且不影响基础包启动。
- [ ] 安装组件后可返回 installed=true。
- [ ] 运行时能力矩阵可见新增项。
- [ ] schema / preload / backend-api 类型一致。

---

## Phase 2 - 设置项、模型目录与基础 UI

### 目标

- 设置面板支持自动字幕开关、加速模式、模型目录、模型选择。
- 设置可持久化并在启动时恢复。

### 涉及文件

- `src/contracts/settings.ts`
- `src/store/useUiStore.ts`
- `src/features/app/useAppSettingsStore.ts`
- `src/features/app/useSettingsPersistence.ts`
- `src/components/SettingsPanel.tsx`
- `src/components/settings/renderSettingsMainSection.tsx`
- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en-US.ts`
- `docs/i18n-aria-guardrails.md`（仅遵循）

### TODO

1. 新增设置字段：
   - `subtitleFeatureEnabled`
   - `subtitleAcceleration` (`auto|cpu|directml`)
   - `subtitleModelDir`
   - `subtitleSelectedModelId`
2. 设置面板新增“自动字幕（离线）”分组。
3. 目录选择复用 `pickDirectoryPath`。
4. 补齐中英文文案与 `i18n:check`。

### Checklist

- [ ] 设置可编辑、可回显、可持久化。
- [ ] 输入异常值可被 schema 拦截。
- [ ] i18n key 双语齐全。
- [ ] 不引入 JSX 硬编码文案。

---

## Phase 3 - 模型清单与下载管理（含 Proxy 询问）

### 目标

- 支持远端模型清单读取、下拉展示、下载、取消、进度可视化。
- 支持下载前 proxy 询问。

### 涉及文件

- `src/contracts/backend.ts`
- `electron/channels.ts`
- `electron/registerBackendIpcHandlers.ts`
- `electron/preload.ts`
- `src/backend-api.d.ts`
- `src/features/backend/repository/types.ts`
- `src/features/backend/repository/realRepository.ts`
- `src/features/backend/repository/mockRepository.ts`
- `src/features/app/useAppTopLayerState.ts`（接线）
- `src/components/SettingsPanel.tsx`
- `src/components/settings/renderSettingsMainSection.tsx`
- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en-US.ts`

### TODO

1. 新增接口：
   - `readSubtitleEngineStatus`
   - `listSubtitleRemoteModels`
   - `listSubtitleLocalModels`
   - `startSubtitleModelDownload`
   - `cancelSubtitleModelDownload`
2. 下载任务增加进度事件：`percent/speedBps/etaSec`。
3. 下载流程：
   - 若 `proxyServer` 非空，弹窗询问是否启用 proxy。
   - 下载到 `.partial`，校验 hash 后原子 rename。
4. 设置面板提供：下拉模型选择、下载按钮、取消按钮、进度显示。

### Checklist

- [ ] 下拉可列出远端模型与本地已装模型。
- [ ] 下载进度显示百分比/速度/ETA。
- [ ] 可取消并正确清理临时文件。
- [ ] proxy 询问逻辑正确且用户可拒绝。
- [ ] 下载失败错误可见且可重试。

---

## Phase 4 - 自动字幕会话（Main + Worker）与 provider 自动回退

### 目标

- 建立自动字幕会话通道，支持启动/停止/reset/flush。
- 实现 `auto -> directml -> cpu` 回退策略与错误上报。

### 涉及文件

- `src/contracts/backend.ts`
- `electron/channels.ts`
- `electron/registerBackendIpcHandlers.ts`
- `electron/preload.ts`
- `src/backend-api.d.ts`
- `electron/subtitles/subtitleSession.ts`（新增）
- `electron/subtitles/asrWorker.ts`（新增）
- `scripts/build-electron.mjs`

### TODO

1. 新增会话 IPC：`start/stop/reset/flush/pushAudio`。
2. Worker 初始化参数加入：模型路径、语言、provider 偏好。
3. provider fallback：
   - `auto`：先 directml，失败回 cpu。
   - `directml`：失败后是否回 cpu 由策略控制（本方案要求回退）。
4. 回传 cue：`id/start/end/text/lang`。
5. 错误事件统一结构化并透传到 Renderer。

### Checklist

- [ ] 会话按窗口隔离，不串流。
- [ ] provider 回退稳定，无崩溃。
- [ ] cue 时间轴单调、seek 后不会旧数据穿越。
- [ ] stop/reset/flush 行为符合预期。

---

## Phase 5 - Renderer 音频抓取与自动字幕渲染

### 目标

- 在视频模式和全屏视频中显示自动字幕 Overlay。
- 保持现有外部字幕链路可用。

### 涉及文件

- `public/audio-worklets/video-audio-capture.worklet.js`（新增）
- `src/features/subtitles/VideoSubtitleCapture.ts`（新增）
- `src/features/subtitles/useLiveSubtitles.ts`（新增）
- `src/components/SubtitleOverlay.tsx`（新增）
- `src/components/subtitles.css`（新增）
- `src/components/VideoMainSection.tsx`
- `src/components/fullscreen/FullscreenPanes.tsx`
- `src/features/app/useAppDisplayResources.ts`
- `src/features/app/buildVideoMainSectionProps.ts`
- `src/features/app/useAppWorkspaceProps.ts`

### TODO

1. 接入 AudioWorklet，输出 16k mono float32 chunk。
2. play/pause/seek/ratechange 的会话控制接线。
3. 自动字幕与外部字幕互斥切换。
4. Overlay 样式参数接入设置（首版可先固定 + 预留 token）。
5. 全屏/非全屏视频元素都能显示自动字幕。

### Checklist

- [ ] 自动字幕可在非全屏工作。
- [ ] 自动字幕可在全屏工作。
- [ ] 退出自动字幕后外部字幕仍可选。
- [ ] seek/ratechange 后字幕无明显错位累积。

---

## Phase 6 - 回归、门禁与发布

### 目标

- 在不破坏现有功能的前提下完成联调与发布门禁。

### 涉及文件

- `docs/interaction-v1.md`（必要时补交互）
- `docs/requirements-v1.md`（必要时补范围）
- `docs/architecture-v1.md`（必要时补模块边界）
- `docs/backend-integration-guardrails.md`（仅遵循）

### TODO

1. 补齐单测/组件测试（最小覆盖关键状态机）。
2. 执行门禁命令并修复失败项。
3. 文档同步更新（需求/交互/架构）。

### Checklist

- [ ] `npm run lint` 通过。
- [ ] `npm run test` 通过。
- [ ] `npm run i18n:check` 通过。
- [ ] `npm run build` 通过。
- [ ] 手测关键路径通过（见下节）。

## 6. 手测验收清单（最小）

1. 未安装模块：应用正常启动，自动字幕入口禁用并有提示。
2. 已安装模块但未下载模型：可进入设置并下载模型。
3. 下载中可见 percent/speed/ETA，可取消。
4. proxy 已配置时，下载前弹询问；选择“否”可直连下载。
5. 视频播放自动字幕可显示；暂停/继续/seek/ratechange 行为正常。
6. DirectML 不可用时自动回退 CPU，UI 可见提示。
7. 外部字幕和自动字幕可互相切换且无残留状态。

## 7. 风险与回退策略

- 风险：DirectML 在部分驱动环境初始化失败。
  - 策略：自动回 CPU，并缓存失败原因避免频繁重试抖动。
- 风险：模型下载中断或 hash 不一致。
  - 策略：只认校验通过的最终文件；失败保留错误并允许重试。
- 风险：视频静音导致抓音频为静音。
  - 策略：必要时引入 GainNode 管控播放音量，避免输入链路被置零。

## 8. 里程碑建议

- M1：Phase 0-2 完成（可安装、可配置、可下载）。
- M2：Phase 3-5 完成（可识别、可显示、可回退）。
- M3：Phase 6 完成（门禁通过并可发布）。
