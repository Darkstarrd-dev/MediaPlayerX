# mpv 增强模式与转码实施计划（v1.1）

Last updated: 2026-02-27

## 0. 决策输入（已冻结）

- 保留当前音乐播放模式（Chromium `<audio>` 链路）作为默认兼容模式。
- 新增“增强模式”开关（设置面板可切换），增强模式使用 `mpv` 作为音频引擎。
- 分发策略：开源免费分发，可接受 GPLv3 约束。
- 打包策略：内置 `mpv` 二进制与必要运行时资源。
- 可视化策略（按你提供的 mpv 方案）：
  - P0/P1 以 `mpv + FFmpeg audio filter metadata (af-metadata)` 驱动“可视化信号”。
  - P2 评估是否引入旁路解码（sidecar decode）生成 `512x2` 音频纹理以提升 Shadertoy 兼容度。
- 格式策略（按你提供的格式方案）：
  - 播放能力由 `mpv` 承担。
  - 转码能力由 `ffmpeg/ffprobe` 独立服务承担。

## 0.1 本次复审修订点（错误/不足 -> 修正）

- 修正 preload 暴露对象命名：从“`window.backendApi`”改为与项目一致的 `window.mediaPlayerBackend`。
- 修正合约位置：不新增分散的 schema 文件，改为在 `src/contracts/backend.schemas.ts` 内扩展（保持 SSOT）。
- 修正可视化输入契约：不使用不存在的 `u_*` uniform 命名；增强模式输出必须对齐现有 `iAudioLevel/iAudioBeat` + `512x2` 音频纹理契约（可低保真）。
- 补齐 mpv/ffmpeg 二进制内置与运行时寻址方案（`electron-builder` 的 `extraResources` + `process.resourcesPath`）。
- 补齐 `.cue` 的定位：`.cue` 是索引/元文件，不应直接加入 `AUDIO_EXTENSIONS`（避免 ffprobe 探测失败与误入库）。
- 补齐“转码 -> 自动入库”的边界与默认路径策略（默认输出到库内，库外需显式加入音乐导入源）。
- 补齐 IPC 安全与背压：白名单命令、随机命名管道、事件节流（避免 60fps IPC 洪泛）。
- 补齐测试策略：CI 侧不依赖真实音频设备；mpv/ffmpeg 相关走单测+可选集成测试开关。

---

## 1. 目标与非目标

### 1.1 目标

- 在不破坏现有功能的前提下，交付“增强模式”音频链路：输出设备选择、WASAPI 独占、ReplayGain、Gapless、EQ/DSP。
- 交付 CUE 虚拟曲目播放能力（单文件/多文件）。
- 交付“格式转换”能力（单文件/批量、预设、进度、取消、元数据复制）。
- 与现有音乐可视化系统打通：增强模式下 shader 仍具备可用的音频驱动信号。

### 1.2 非目标（本期不承诺）

- 不替换现有 Chromium 音频链路，不移除现有 `<audio>` 播放路径。
- 不承诺 ASIO 首发支持。
- 不承诺 DSD bit-perfect/DoP 首发完整能力（仅做可入库/可播放验证）。
- 不承诺首发实现“真实 PCM 级 waveform/FFT bins”；P2 才评估 sidecar decode。

---

## 2. 现状基线（代码事实）

- 当前音乐播放：Renderer 内部使用 `HTMLAudioElement`：`src/components/MusicMainSection.tsx`。
- 当前音乐可视化：`AudioContext + AnalyserNode` 从 `<audio>` 抽取频谱/波形，并输出 `512x2` 音频纹理；shader 侧通过 `iAudioLevel/iAudioBeat` + `iChannel*` 采样驱动：
  - 分析器：`src/features/music-visualizer/audioAnalyser.ts`
  - 渲染器：`src/features/music-visualizer/webglRenderer.ts`
  - 契约文档：`docs/music-visualizer-shader-migration-playbook.md`
- 当前 preload 注入点：`window.mediaPlayerBackend`（不是 `window.backendApi`）：`electron/preload.ts`。
- 当前音乐导入白名单：`mp3/flac/wav/ogg/m4a/opus/aac`：`electron/services/file-system-read/fileSystemReadFacadeConfig.ts`。
- 当前 `ffmpeg/ffprobe` 为可选外部依赖（缺失会降级）：`electron/services/file-system-read/runtimeDependencyService.ts`。

---

## 3. 目标架构（双引擎 + 可回退）

### 3.1 引擎分层

- `ChromiumEngine`（兼容模式，默认）：保持现有 `<audio>` 行为与可视化采样路径。
- `MpvEngine`（增强模式）：主进程托管 `mpv` 子进程，通过 JSON IPC/命名管道控制。
- `PlaybackController`：统一播放状态机与队列策略，屏蔽引擎差异，并向 renderer 发布事件。

### 3.2 架构拓扑（与现有 `mediaPlayerBackend` 对齐）

```text
Renderer UI
  -> Preload: window.mediaPlayerBackend
    -> IPC channels (Zod)
      -> Main: PlaybackController
        -> ChromiumEngine | MpvEngine
        -> CueService
        -> TranscodeService (ffmpeg/ffprobe)
        -> AudioAnalysisService (mpv metadata -> visualizer feed)
```

### 3.3 mpv 托管方式（Main）

- 进程模型：`child_process.spawn(mpvExe, args)`，仅由 Main 进程创建/销毁。
- IPC：`--input-ipc-server=\\.\\pipe\\mpx-mpv-<random>`，命名管道随机化，避免被同机其他进程猜测。
- 推荐基础参数（Windows 音频优先）：
  - `--idle=yes`（常驻减少切歌开销）
  - `--vid=no`、`--force-window=no`、`--audio-display=no`（避免窗口/封面视频轨）
  - `--ao=wasapi`（Windows）
  - 日志：`--msg-level=all=warn`（默认不刷屏，可在调试模式提升）

### 3.4 可视化数据通路（增强模式）

约束：现有 shader 运行时契约包含 `iAudioLevel/iAudioBeat` 与 `512x2` 音频纹理（`channels.kind=audio`）。增强模式必须提供这些输入，即使纹理为“低保真近似”。

实现策略分两档：

- P1（默认）：`mpv af-metadata -> iAudioLevel/iAudioBeat + 伪音频纹理`。
  - 从 mpv 订阅 `time-pos/pause/speed`，并读取 `af-metadata/<label>`：`astats/aspectralstats`（可选 `ebur128`）。
  - 在 Main 侧执行与现有 `MusicAudioAnalyser` 同风格的 Attack/Release + onset 逻辑，产出舒适化 `audioLevel/audioBeat`。
  - 生成 `frequencyData[512]`：用 `RMS/Peak + centroid/spread/flux` 构造“形状稳定的伪频谱曲线”（分段/高斯/指数衰减均可），确保大部分 shader 有可感知响应。
  - `waveformData[512]`：先用常量/低幅噪声 + beat 调制（低成本），避免全零导致部分 shader 失去动态。
- P2（可选）：sidecar decode 生成真实音频纹理。
  - 用 `ffmpeg` 旁路解码 PCM 并计算 FFT/waveform；以 `mpv time-pos` 同步 seek/切歌。
  - 仅在用户启用“高保真纹理”时打开，并受资源治理限制（避免占满 CPU）。

数据传输（Main -> Renderer）：

- 通过 `window.mediaPlayerBackend` 新增事件订阅：`onAudioAnalysisFrame(listener)`。
- 默认节流到 30fps（可配置 15/30/60），只保留最新帧（drop old frames），避免 IPC 洪泛。
- 单帧载荷建议：
  - `audioLevel/audioBeat`（float）
  - `frequencyData`（512 bytes）
  - `waveformData`（512 bytes）

### 3.5 CUE（虚拟曲目）

- `.cue` 为“索引/元文件”，不加入 `AUDIO_EXTENSIONS`。
- 导入：音乐导入过滤器允许选择 `.cue`，但入库时按 cue 解析生成“虚拟曲目”，并引用真实音频文件。
- 播放：
  - `MpvEngine`：加载同一个音频文件并应用 per-file `start/end`（或等价策略）。
  - `ChromiumEngine`：依旧播放真实音频文件，通过 `currentTime` seek + 结束定时器实现区间播放（P0 样式）。

### 3.6 转码服务（ffmpeg/ffprobe）

- 目标：转码与播放解耦，转码不依赖 mpv。
- 进度：使用 `-progress pipe:1` 输出 key=value；默认 `-nostdin` 防卡死。
- 并发：默认串行（1），允许用户提升到 2；与任务资源治理协同（避免影响 UI 与导入任务）。
- 自动入库：
  - 默认输出到库内目录（推荐 `libraryRoot/.mediaplayerx/transcoded/` 或用户指定的库内路径）。
  - 若输出到库外：必须提示用户“添加为音乐导入源”或“仅生成不入库”。

### 3.7 二进制内置与寻址（打包关键）

mpv 内置：

- 建议目录：`vendor/mpv/win32-x64/`（包含 `mpv.exe` 与其依赖 DLL）。
- 打包：在 `electron-builder.config.cjs` 增加 `extraResources` 复制到 `resources/vendor/mpv/`（asar 外）。
- 运行时：
  - 开发态优先使用 `process.env.MPX_MPV_BIN`（便于本地替换版本）。
  - 打包态使用 `path.join(process.resourcesPath, 'vendor', 'mpv', 'mpv.exe')`。

ffmpeg/ffprobe 内置（用于转码与 sidecar decode）：

- 选项 A（推荐）：同样随应用内置二进制（GPL 可接受），避免用户额外安装。
- 选项 B：保持现有“可选外部依赖”策略，但转码功能必须标记为“依赖未就绪 -> 不可用”。

---

## 4. 合约与模块改造清单

### 4.1 Contracts / Settings（保持 `backend.schemas.ts` 为 SSOT）

- 在 `src/contracts/backend.schemas.ts` 新增：
  - `audioEngine` 命令/查询 DTO（引擎模式、设备列表、状态、错误）。
  - `audioAnalysisFrame` DTO（可视化数据帧）。
  - `transcode` 任务 DTO（创建/查询/取消/事件）。
- 在 `src/contracts/backend.types.ts` 增补对应导出类型。
- 扩展 `src/contracts/settings.ts`：
  - `audio.engineMode: chromium | mpv`
  - `audio.output.deviceId`
  - `audio.output.exclusive`
  - `audio.output.fallbackToShared`
  - `audio.dsp.eq10`
  - `audio.dsp.replaygain`
  - `audio.dsp.resampler`
  - `audio.visualizer.mode: metadata-approx | sidecar-texture`

### 4.2 Main / IPC

- 新增 `electron/services/audio-engine/`：
  - `PlaybackController.ts`（状态机/队列/回退）
  - `MpvHost.ts`（spawn + JSON IPC codec + request_id）
  - `MpvEngine.ts`（播放/输出/DSP 选项映射）
  - `ChromiumEngineAdapter.ts`（可选：统一接口便于 controller 切换）
- 新增 `electron/services/audio-analysis/`：
  - `AudioAnalysisService.ts`（订阅 mpv 元数据、节流、下发分析帧）
- 新增 `electron/services/transcode/`：
  - `TranscodeService.ts`（队列、并发、取消、进度解析）
  - `ffmpegArgsBuilder.ts`（预设系统与参数构建）
  - `ffmpegProgressParser.ts`
- 扩展 `electron/channels.ts` 与 `electron/registerBackendIpcHandlers.ts`：
  - 新增 `readAudioEngineState/setAudioEngineMode/listAudioDevices/...`
  - 新增 `startTranscode/readTranscodeTasks/cancelTranscode/...`
  - 新增“事件订阅类通道”（通过 preload 包装为 listener API）。
- 扩展 `electron/preload.ts`：
  - 将新 API 挂到 `window.mediaPlayerBackend` 下（例如 `mediaPlayerBackend.audioEngine.*`）。

### 4.3 Repository / UI

- 扩展 `src/features/backend/repository/types.ts` 与 `src/features/backend/repository/realRepository.ts`。
- 设置面板新增“增强模式”分组：引擎模式、输出设备、独占、EQ、ReplayGain、转码预设。
- 音乐主界面新增增强模式状态信息：当前设备/独占状态/引擎错误与回退提示。

### 4.4 数据模型

- CUE：新增虚拟曲目结构（`cuePath/audioPath/startMs/endMs/trackNo/...`）。
- 转码任务：新增 `transcode_tasks_v1`（状态、参数、进度、错误、输出列表）。

---

## 5. 格式支持与转码策略

### 5.1 播放格式分级（用于“入库与 UI 选择”）

- P0：`mp3/flac/wav/ogg/m4a/opus/aac`
- P1：`ape/wv/tta/tak/shn`
- P2：`dsf/dff/iso`
- 元文件：`.cue`（不属于音频格式，但属于“可生成虚拟曲目”的入口）

说明：

- `AUDIO_EXTENSIONS` 只放“真实音频文件扩展名”。
- `.cue` 建议单独维护为 `CUE_EXTENSIONS`，避免误入 `ffprobe` 探测链路。
- 对 P1/P2 的入库/转码可用性，需结合 mpv/ffmpeg 能力探测做灰度。

### 5.2 转码预设（首发）

- 无损：`FLAC/ALAC/WAV`
- 有损：`Opus/AAC/MP3`
- Remux：`-c copy`（容器支持时）

### 5.3 转码能力边界

- 支持批量、进度、取消、失败重试。
- 支持 `-map_metadata` 复制元数据，支持覆盖写入。
- 支持 CUE 分轨输出（基于 `-ss/-to` 的可用版本，后续再优化 sample-accurate）。

---

## 6. 分阶段实施（P0 -> P3）

### P0：增强模式可播放 + 可回退（2 周）

目标：增强模式基础闭环，并且任何失败都可降级到兼容模式。

- [x] 内置 mpv 二进制打包与寻址（开发态 env override + 打包态 resourcesPath）。
- [x] `MpvHost`：spawn + JSON IPC 发送/接收 + request_id。
- [x] 基础播放控制：`play/pause/resume/seek/stop`。
- [x] `audio.engineMode` 设置与运行时切换（切换时明确“是否重载当前曲目”的策略）。
- [x] 回退策略：mpv 启动失败/崩溃 -> 自动降级 ChromiumEngine，并可提示原因。

验收：

- [ ] 增强模式播放稳定 1 小时无崩溃。
- [ ] 回退触发后 UI 无卡死，且兼容模式可继续播放。

阶段进展记录：

- 2026-02-27：已完成 `electron-builder` 的 mpv 资源打包入口与运行时 `resolveMpvBinPath` 寻址函数。
- 2026-02-27：已新增 `electron/services/audio-engine/mpvHost.ts`，完成 mpv 子进程启动、命名管道连接、JSON IPC 与 request_id 应答匹配（尚未接入 `PlaybackController` 主流程）。
- 2026-02-27：已新增 `electron/services/audio-engine/mpvEngine.ts`，封装 `play/pause/resume/seek/stop/volume/device/exclusive` 基础控制（尚未接入 IPC handler 与 UI）。
- 2026-02-27：已新增 `AudioEngineController + IPC + preload + repository` 接线，支持 `readAudioEngineState/setAudioEngineMode/listAudioOutputDevices/setAudioOutputDevice/setAudioExclusive`。
- 2026-02-27：已使用实机路径完成 smoke test：
  - `Z:/Playground/CurrentWorking/mpv/mpv.exe` 可正常切换到 mpv 模式并列出设备（`deviceCount=15`）。
  - 缺失二进制路径时可自动回退 chromium（`usingFallback=true`）。

### P1：输出链能力 + 可视化 + CUE（2 周）

目标：增强模式具备“专业播放器体验”的关键卖点，并确保可视化可用。

- [x] 设备枚举与切换（失败提示 + `fallbackToShared` 策略）。
- [x] WASAPI 独占开关与失败回退。
- [x] Gapless 与 ReplayGain（基础配置）。
- [ ] `AudioAnalysisService`：`af-metadata` -> `audioLevel/audioBeat`，并生成伪音频纹理（默认 30fps）。
- [ ] Renderer 侧接线：增强模式时使用外部分析帧替代 WebAudio 采样输入（保持 shader 契约不变）。
- [ ] CUE：解析、虚拟曲目列表、区间播放（单文件/多文件）。

验收：

- [ ] 播放中切设备成功率 >= 95%。
- [ ] 独占开启/关闭后状态可恢复，失败场景可回退 shared。
- [x] 播放中切设备成功率 >= 95%（当前样本为手工验证，待补自动化统计）。
- [x] 独占开启/关闭后状态可恢复，失败场景可回退 shared（已完成手工验证）。
- [ ] 增强模式下 shader 随音频有明显联动（至少 `iAudioLevel/iAudioBeat` 生效，`iChannel0` 有动态）。
- [ ] CUE 切轨边界无明显串轨。

阶段进展记录：

- 2026-02-27：已完成设备与独占控制的后端能力与 IPC 接口（`listAudioOutputDevices/setAudioOutputDevice/setAudioExclusive`），待设置面板与播放器 UI 接线后进入验收。
- 2026-02-27：已完成设置面板系统页“音频增强模式”控制区接线（模式切换/设备选择/独占开关/状态刷新/错误展示）。
- 2026-02-27：已完成 MusicMainSection 对 mpv 的播放控制镜像接线（load/pause/resume/seek/stop/volume）；增强模式下实际音频输出由 mpv 承担，HTMLAudio 自动静音用于可视化与时间轴。
- 2026-02-27：已修复“增强模式切回兼容模式后需手动暂停/播放才恢复发声”问题：新增模式切换事件桥与 `mpv -> chromium` 过渡自动恢复播放逻辑。
- 2026-02-27：补充 `mpv -> chromium` 过渡时的媒体恢复细节（强制重置 mute/volume、按当前进度 seek、必要时 reload source、自动恢复播放），提升切换后首帧发声稳定性。
- 2026-02-27：修复切回兼容模式后“播放/暂停状态抖动”问题：新增原生音频事件抑制窗口，切模式恢复期忽略 `onPlay/onPause` 回流，避免状态机互相打架导致快速启停。
- 2026-02-27：进一步修复切回兼容模式“显示 play 但无声/时间不动”问题：新增播放同步挂起机制（事务 token + fallback timer），在切换恢复完成前阻断常规同步 effect，恢复后单点收敛到真实播放状态。
- 2026-02-27：修复头部文本跑马灯在极端布局抖动时可能触发的 `Maximum update depth exceeded`：`useOverflowMarquee` 仅在 overflow 状态实际变化时更新 state。
- 2026-02-27：根据联调结果重构模式切换同步：
  - `chromium -> mpv` 首次加载带 `start_sec`（从当前进度续播，避免从头播放）。
  - `mpv -> chromium` 取消强制 reload，改为就地解除静音并按当前时间点恢复，避免进度回退到开头。
  - mpv 模式下关闭 visualizer runtime（避免 AudioContext 争用独占设备），切回兼容模式后自动恢复。
- 2026-02-27：实施专家建议 P0：
  - `mpv -> chromium` 切换增加对账重试（`resumeAudioAnalyser + play`）。
  - visualizer 非活跃时从 `dispose()` 改为 `suspend()`，避免频繁 `AudioContext.close()` 导致输出链路重建不稳定。
  - `MusicAudioAnalyser` 仅在 `AudioContext` 为 `running` 时连接 `MediaElementSource`，降低切换窗口内被 `suspended` 上下文劫持静音的概率。
- 2026-02-27：实机复测通过：
  - 兼容 -> 增强可原地续播。
  - 增强 -> 兼容可立刻恢复发声并连续推进进度。
- 2026-02-27：已完成 Gapless 与 ReplayGain 基础接线：
  - 主进程新增 `setAudioGaplessMode/setAudioReplayGainMode` 通道与控制器状态。
  - 设置面板新增 Gapless/ReplayGain 下拉控制并可实时下发到 mpv。
- 2026-02-28：已完成 CUE 基础数据通道首轮贯通（DTO -> ViewModel）：
  - `audioItemDtoSchema` 已补充 `cue_source_path/cue_track_no/cue_start_sec/cue_end_sec`。
  - 前端 `AudioItem` 与 repository mapper/mock mapper 已同步透传上述字段，为后续“解析 CUE 生成虚拟曲目”做准备。
- 2026-02-28：已完成 CUE 第二轮实现（导入 + 扫描 + 初始播放边界）：
  - 导入侧：音乐导入文件过滤与任务校验已支持 `.cue`（并保持 `.cue` 不进入 `AUDIO_EXTENSIONS`）。
  - 扫描侧：新增 CUE 解析（`FILE/TRACK/INDEX 01/TITLE/PERFORMER`），可基于已扫描音频生成虚拟曲目，并写入 `cue_*` 边界字段。
  - 播放侧：增强模式下加载 CUE 虚拟曲目时，会向 mpv 下发 `start_sec/end_sec`，并在 seek/time 显示上做基础偏移处理。
  - 当前仍待完善：兼容模式下 CUE 区间语义一致性、CUE 终点自动切曲对账与更多样本回归。
- 2026-02-28：已修复 CUE 与数据库唯一键冲突（`audio_item.absolute_path UNIQUE`）：
  - CUE 虚拟曲目不再复用源音频 `absolute_path`，改为稳定唯一的 `cue://...` 逻辑路径，避免单文件 CUE 多轨触发冲突。
  - mpv 播放加载路径改为优先使用 `audio.mediaLocator.absolutePath`（真实音频文件路径），确保虚拟路径不影响实际播放。
  - UI 路径展示已同步优先展示 `mediaLocator` 文件系统路径，避免显示 `cue://` 逻辑路径。
- 2026-02-28：已增强 CUE 解析与轨道绑定鲁棒性（针对“单文件 CUE 未分轨”）：
  - CUE 文本读取新增 UTF-16 BOM/零字节检测解码，兼容部分 Windows 导出的 UTF-16 CUE。
  - 当 CUE 中 `FILE` 路径无法精确匹配时，增加“同目录同名 / 全局唯一同名 / 单文件 CUE 同目录唯一音频”回退匹配策略。
  - 目标是确保单文件 CUE 在路径编码不规范场景下仍能生成虚拟分轨。
- 2026-02-28：继续增强单文件 CUE 容错：
  - 解析器放宽 `TRACK` 与 `INDEX` 规则（接受非 AUDIO track type、无尾注释限制、`INDEX 01` 缺失时回退首个 INDEX）。
  - `FILE` 缺失场景下允许以 CUE 路径进入后续匹配，再通过同目录/子目录与同 basename 规则兜底绑定音频。
  - 若 CUE 分轨仍未生成，日志改为可直接复制的单行字符串（含 parsed/inDir/inSubtree 等计数），便于定位。
  - 当 CUE 虚拟轨生成成功后，会过滤对应原始整轨音频项，避免“只看到大文件”造成误判。
- 2026-02-28：修复 CUE 分轨后的快照稳定性与日文编码：
  - 修复 `FOREIGN KEY constraint failed`：仅对最终持久化到 `audio_item` 的 `audioId` 执行扫描元数据回写，避免被 CUE 过滤掉的整轨 `audioId` 写入 `audio_metadata`。
  - CUE 解码从“单编码猜测”升级为多编码候选评分（UTF-8/UTF-16LE/UTF-16BE/Shift_JIS/EUC-JP），优先选择指令命中率高且乱码字符少的结果。
  - 目标：消除导入后 sidebar 全量消失抖动，并改善日文 TITLE/PERFORMER 在元数据面板中的乱码问题。
- 2026-02-28：修复音乐侧边栏结构异常与单文件 CUE 目录导入稳定性：
  - 侧边栏压缩算法修正为“可压缩链路向下包含终点节点”，避免压缩后停在 `directAudioCount=0` 的中间节点。
  - 音乐节点计数改为优先显示子树曲目总数（`descendantNodeCount`），减少“显示 0 但可播放很多”的错位。
  - 元数据面板音乐播放列表作用域改为基于“选中节点后代文件夹集合”收敛，不再仅依赖路径前缀。
  - CUE 解析新增对引用音频的补齐：当 `FILE` 指向音频未进入当前扫描集合时，按引用路径补探测并纳入分轨绑定（适配整目录导入场景）。
  - CUE 行切分增强为 `CRLF/LF/CR` 全兼容，提升部分老格式 cue 文本解析成功率。
- 2026-02-28：修复 CUE 虚拟轨在刷新后被错误自动剪枝：
  - 自动剪枝阶段不再直接用 `audio.absolute_path` 检测 CUE 虚拟轨存在性，改为优先校验 `media_locator.absolute_path`（真实音频路径）并联合校验 `cue://` 中的 cue 文件路径。
  - 快照删除路径与导入源清理路径解耦：数据库删除继续使用快照路径；导入源同步仅使用真实文件系统路径，避免 `cue://` 伪路径干扰。
  - CUE 逻辑路径补充 `start/end` 编码，数据库回读时从 `cue://` 反解 `cue_source_path/cue_track_no/cue_start_sec/cue_end_sec`，保持播放边界在刷新后的可恢复性。

### P2：转码服务 + 格式扩展（2 周）

目标：交付可用转码能力，并把格式扩展从“能播”扩展到“可维护地入库/转码”。

- [ ] `TranscodeService` 与任务 UI（创建/进度/取消/重试/输出清单）。
- [ ] 内置 ffmpeg/ffprobe（或清晰降级：依赖缺失时转码入口不可用）。
- [ ] 上线 FLAC/ALAC/WAV/Opus/AAC/MP3 预设与能力探测（按 encoders/formats 灰度）。
- [ ] 扩展音乐导入白名单到 P1/P2（并对不可探测/不可播放文件给出明确错误）。
- [ ] 转码输出默认路径策略与“输出到库外”的导入提示。

验收：

- [ ] 100 首批量转码可完成，失败项可重试。
- [ ] 转码后文件可按策略自动入库并可立即播放。

### P3：硬化与发布（1~2 周）

目标：发布可维护、可排障版本。

- [ ] 崩溃恢复：mpv 异常退出自动拉起（次数限制 + 熔断 + 诊断日志）。
- [ ] 性能：事件节流、UI 渲染负载控制、转码并发默认值与资源治理联动。
- [ ] 文档与发布说明：已知限制、回退路径、FAQ、许可证与源码提供方式。
- [ ] 全量回归与长稳测试。

验收：

- [ ] `npm run quality:ci`、`npm run build:electron` 全绿。

---

## 7. 验收矩阵（核心）

- 设备切换：播放中切换 20 次，不出现死锁/静音卡死。
- 独占模式：开启/关闭后状态可恢复，失败场景可回退 shared。
- CUE：单文件/多文件各 10 组样本，边界准确。
- 可视化：增强模式下 `iAudioLevel/iAudioBeat` 有响应；`iChannel0(audio)` 有动态（允许“低保真”）。
- 转码：单文件、批量、取消、重试、覆盖策略全覆盖。
- 兼容性：增强模式失败自动回退，兼容模式功能零回归。

---

## 8. 风险、合规与应对

### 8.1 GPLv3 合规

- 内置 mpv/ffmpeg（如为 GPL 构建）时，发布包必须包含许可证文本与对应源码获取方式说明（如 release 附带 source 或提供可获取链接/构建脚本）。
- 建议在 `release/NOTICE` 或等价位置沉淀第三方清单与版本锁定。

### 8.2 二进制分发风险

- 应对：发布包内置版本锁定与 SHA 校验；升级走灰度；提供 `MPX_MPV_BIN/MPX_FFMPEG_BIN` override 便于排障。

### 8.3 IPC 安全风险

- 应对：renderer 仅可调用白名单命令；禁止透传原始 mpv 指令；命名管道随机化；仅本机连接。

### 8.4 可视化数据不足风险

- 应对：P1 先保证 `iAudioLevel/iAudioBeat` 与伪频谱可用；P2 再评估 sidecar decode。

### 8.5 性能与稳定性风险

- 应对：分析帧节流（默认 30fps），并采用“只保留最新帧”策略；转码默认串行并受资源治理限制。

---

## 9. 回滚与开关策略

- 一级开关：`audio.engineMode`（随时切回 `chromium`）。
- 二级开关：
  - `audio.visualizer.mode`
  - `audio.output.exclusive`
  - `audio.dsp.*`
  - `transcode.enabled`
- 回滚原则：
  - 任一增强能力异常，不阻断基础播放。
  - 转码服务异常不影响库浏览与普通播放。

---

## 10. 交付物清单

- 代码：引擎层、音频分析层、转码层、设置项、IPC、Repository、UI。
- 文档：本计划、设置说明、发布说明、常见故障排查、第三方许可清单。
- 测试：单测、可选集成测试（环境开关）、手工验收报告。

---

## 11. 文档同步要求（实施时）

- 架构边界变化：同步 `docs/architecture-v1.md`。
- 交互与设置变化：同步 `docs/interaction-v1.md`。
- 后端接入约束变化：同步 `docs/backend-integration-guardrails.md`。
- 音乐可视化运行时契约变化：如新增/变更 uniform 或音频纹理语义，需同步：
  - `docs/music-visualizer-shader-entry.md`
  - `docs/music-visualizer-shader-migration-playbook.md`
