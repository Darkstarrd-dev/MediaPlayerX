# mpv 增强模式与转码实施计划（v2）执行计划

Last updated: 2026-02-28

## 0. 目标与执行纪律

- 本计划基于 `docs/mpv-增强模式与转码实施计划-v2.md`，落地两块增量：
  - 音频转码参数可选（在现有预设之上提供常用参数，并持久化到 Settings）。
  - 视频转码（任务化、可进度、可取消、可重试、能力灰度、体积预估）。
- 分阶段执行：**P0 -> P1 -> P2 -> P3 -> P4**。
- 阶段门禁：上一阶段验收未通过，不进入下一阶段。
- 质量门禁（每阶段至少跑一次）：`npm run lint`、`npm run test`、`npm run build`。

## 0.1 关键代码事实（必须先对齐）

- 基线问题（已修复）：音频转码默认输出目录曾为 `libraryRoot/.mediaplayerx/transcoded/`，会与扫库规则冲突。
- 扫库会跳过 `rootDir/.mediaplayerx/**`：`electron/fileSystemFileCollector.ts`。
- 结论：**默认转码输出不可被扫描入库**（即使任务成功并触发 `refreshSnapshotFromFilesystem`）。
- 另外：媒体扫描根来自 `import_sources_v1`（通用导入源），而不是 `music_import_sources_v1`：`electron/services/file-system-read/librarySnapshotService.ts` -> `electron/fileSystemFileCollector.ts`。

本计划将把“默认输出路径策略 + 自动入库策略”作为 P0 前置修复，否则后续 P1/P2/P3 的 UI/能力都会出现“完成但库里不可见”的假失败。

## 0.2 开发机运行时准备（ffmpeg/ffprobe）

- 你提供的 ffmpeg 目录：`C:\Tools\ffmpeg-7.1.1-essentials_build\bin`。
- 现有设置入口已支持目录验证并写入运行时 env：
  - `verifyAudioTranscodeFfmpegBin`（设置 `MPX_FFMPEG_BIN` / `MPX_FFPROBE_BIN`）：`electron/registerBackendIpcHandlers.ts`。
  - 建议在开发/联调前先在“设置 -> 音频转码运行时”验证该目录。

---

## 1. Phase 总览

| Phase | 主题                      | 交付物                                      | 阶段门禁（摘要）                     |
| ----- | ------------------------- | ------------------------------------------- | ------------------------------------ |
| P0    | 默认输出/自动入库前置修复 | 输出目录策略修复 + 自动入库可用             | 转码输出在库内可见且可播放           |
| P1    | 音频转码参数可选          | DTO + 设置持久化 + UI 参数区 + args builder | 关键参数生效、可重试复现             |
| P2    | 视频转码后端 MVP          | DTO + Service + IPC + 任务模型 + 能力探测   | 单/批量可跑、可取消、可重试          |
| P3    | 视频转码 UI + 体积预估    | 面板 + 参数区 + size estimator IPC          | 预估可用、能力灰度正确               |
| P4    | 硬化与体验完善            | 错误归因/磁盘预检/资源治理/文档             | `quality:ci` + `build:electron` 全绿 |

---

## P0：默认输出目录与自动入库修复（阻塞后续）

### P0.1 阶段目标

- 修复“转码成功但库内不可见”的根因。
- 统一音频/视频转码的默认输出目录策略。
- 明确并固化“自动入库”的实现路径（写入 `import_sources_v1` + 刷新快照）。

### P0.2 TODO checklist

- [x] 调整音频转码默认输出目录（建议移出 `.mediaplayerx`）：
  - 目标建议：`libraryRoot/transcoded/audio/`（或 `libraryRoot/transcoded/` 下分域）。
  - 修改点：`electron/services/file-system-read/managementAudioTranscodeService.ts` 的 `DEFAULT_TRANSCODE_OUTPUT_RELATIVE_PATH` 与 `resolveDefaultOutputDir()`。
- [x] 调整 `readAudioTranscodeCapabilities` 返回的 `default_output_dir` 与 UI 提示文案适配：
  - DTO 已包含 `default_output_dir`：`src/contracts/backend.schemas.management.ts`。
  - UI 使用该字段展示默认输出提示：`src/components/useMusicAudioTranscodeController.ts`。
- [x] 实现“自动入库”真正生效：把转码输出目录加入通用导入源 `import_sources_v1.directories`。
  - 推荐实现位置：`electron/services/file-system-read/managementMutationService.ts`（持有 `database` + `importPathRegistry` + `emitLibraryChanged`）。
  - 行为建议：当转码任务 `success_count > 0` 且输出目录不在 import sources 时，自动追加目录并持久化，然后 `refreshSnapshotFromFilesystem({ force: true })`。
- [x] 明确 `add_output_to_music_sources` 的真实语义并收敛：
  - 现状：写入 `music_import_sources_v1.files`：`electron/services/file-system-read/managementAudioTranscodeService.ts:addOutputFilesToMusicImportSources`。
  - 建议：改为写入 `music_import_sources_v1.directories`（以目录为粒度），避免输出文件数量增长导致 state 膨胀。
- [x] 补充回归用例（后端）：
  - [ ] 音频转码默认输出 -> 自动入库 -> 刷新后能在 `readLibrarySnapshotLite` 看到新增音频条目。
  - [x] 覆盖至少 1 个转码成功 + 1 个失败项的混合场景。

### P0.3 验收标准

- [x] 默认输出目录不在 `.mediaplayerx` 下（或已实现明确的“扫库放行”策略）。
- [ ] 音频转码成功后：刷新快照可见新增条目，且可播放（mpv 或 chromium 取决于格式）。
- [ ] “输出目录在库外”的场景：提示策略与实际行为一致（允许/拒绝/自动加入导入源）。

### P0.4 回滚点

- [ ] 默认输出目录变更与“自动写入 import_sources_v1”应拆分提交，便于单独回滚。

---

## P1：音频转码参数可选（DTO + Settings + UI + args builder）

### P1.1 阶段目标

- 在现有 `flac/alac/wav/opus/aac/mp3` 预设基础上，提供常用参数可选。
- 参数可持久化到 Settings，并在任务历史中可回显（用于复现/重试）。
- 参数与能力探测（encoder/muxer）联动：不支持时禁用/提示，并在后端二次校验。

### P1.2 TODO checklist

- [x] 扩展合约（Zod，保持 management 域一致）：
  - 文件：`src/contracts/backend.schemas.management.ts`。
  - 新增 `audioTranscodeParamsSchema`（示例字段）：
    - `bitrate_kbps?`、`vbr_quality?`
    - `sample_rate_hz?`、`channels?`（跟随源用 `null/undefined` 表示）
    - `flac_compression_level? (0..12)`
    - `wav_bit_depth? (16|24)`
    - `metadata_mode`（copy/none/copy_and_override）
    - `metadata_override?`（可选：key-value）
  - 扩展 `startAudioTranscodeTaskRequestSchema`：新增 `params_override?`（兼容旧任务：无该字段即走 preset 默认）。
- [x] 扩展前端类型导出与 d.ts：
  - `src/contracts/backend.types.ts`（由 schema 推导，必要时检查导出链路）。
  - `src/backend-api.d.ts`（若有显式类型声明需同步）。
- [x] 后端参数映射（ffmpeg args builder）：
  - 文件：`electron/services/file-system-read/managementAudioTranscodeService.ts`。
  - 替换固定 `PRESET_CODEC_ARGS[preset]` 为参数化构建（`buildCodecArgs` + `resolveMetadataWriteArgs`）。
  - 基线参数保持：`-hide_banner -nostdin -y/-n -i ... -map_metadata 0`。
  - 校验策略：启动前校验 encoder/muxer + 关键参数组合（例如 `pcm_s24le` 是否存在）。
- [x] Settings 持久化：
  - `src/contracts/settings.ts`：新增音频转码默认参数结构（按 preset 存 defaults）与默认 preset。
  - `src/store/useUiStore.ts`：补齐 DEFAULT_SETTINGS + SETTINGS_KEYS。
  - 目标：面板打开自动回填默认值；用户修改后可保存为默认。
- [x] UI 参数区（基础 + 高级折叠）：
  - `src/components/MusicAudioTranscodePanel.tsx`：新增参数区与“保存为默认”交互。
  - `src/components/useMusicAudioTranscodeController.ts`：
    - 将参数写入 `StartAudioTranscodeTaskRequestDto.params_override`。
    - 任务历史里回显参数摘要（用于重试/复现）。
- [x] i18n（首发只做必要文案）：
  - `src/i18n/locales/zh-CN.part*.ts`、`src/i18n/locales/en-US.part*.ts`：新增参数标签、错误提示、禁用原因。
- [x] 测试：
  - 后端：新增 `managementAudioTranscodeService` 参数映射与校验用例。
  - 前端：扩展 `src/components/MusicMainSection.test.tsx`，覆盖“参数变更 -> 发起请求 payload 正确”。

### P1.3 验收标准

- [ ] MP3：CBR/VBR 任选其一可用，输出码率/质量与预期一致（允许小范围偏差）。
- [ ] FLAC：压缩级别生效，输出仍可播放。
- [ ] WAV：16/24-bit（如提供）按能力灰度；不支持时 UI 禁用且后端校验拒绝。
- [x] 任务重试：从历史重试后参数不丢失。

### P1.4 回滚点

- [ ] DTO 变更与 args builder 变更分离；UI 参数区独立提交。

---

## P2：视频转码后端 MVP（任务化 + 能力探测 + 进度/取消）

### P2.1 阶段目标

- 提供视频转码任务：单文件/批量、进度（progress）、取消（cancel）、重试（retry）、输出列表。
- 参数最小集合：容器 (container) + 视频编码器 (video encoder) + 质量模式（CRF/bitrate/copy）+ 分辨率/帧率 + 音频策略。
- 能力灰度（encoder/muxer）：根据本机 ffmpeg 构建差异灰度可选项。

### P2.2 TODO checklist

- [x] 合约（management schemas）：
  - `src/contracts/backend.schemas.management.ts`：新增
    - `videoTranscodeTaskStatusSchema`
    - `videoTranscodeContainerSchema`（mp4/mkv/webm）
    - `videoTranscodeVideoCodecSchema`（h264/h265/vp9/av1/copy）
    - `videoTranscodeAudioModeSchema`（copy/encode/drop）
    - `videoTranscodeParamsSchema`（含 crf/bitrate/preset/scale/fps/faststart 等）
    - `startVideoTranscodeTaskRequestSchema` / `startVideoTranscodeTaskResponseSchema`
    - `readVideoTranscodeTaskRequestSchema` / `readVideoTranscodeTaskResponseSchema`
    - `cancelVideoTranscodeTaskRequestSchema` / `cancelVideoTranscodeTaskResponseSchema`
    - `readVideoTranscodeCapabilitiesResponseSchema`（encoder/muxer 可用矩阵 + 原因）
- [x] 后端 Service：
  - 新增 `electron/services/file-system-read/managementVideoTranscodeService.ts`：
    - ffmpeg spawn：使用 `-progress pipe:1 -nostdin -hide_banner`，stdout 解析 key=value。
    - 进度计算：`out_time_ms / duration_ms`（duration 用 ffprobe 或预探测）。
    - 取消：AbortSignal -> kill 子进程。
    - 输出路径：基于 container 生成扩展名，避免覆盖策略错误。
    - 资源治理：接入 `runWithCpuToken`，并限制并发（默认 1，上限 2）。
  - 在 `electron/services/file-system-read/managementMutationService.ts` 注入并暴露：
    - `runVideoTranscodeTask` / `readVideoTranscodeCapabilities`。
- [x] IPC 接线：
  - `electron/channels.ts`：新增 video transcode 相关 channel。
  - `electron/facade/FileSystemManagementHandlers.ts`：新增 handler 方法。
  - `electron/registerBackendIpcHandlers.ts`：注册 ipcMain.handle（遵循现有 registerIpcQuery/registerIpcCommand 结构）。
  - `electron/preload.ts`：挂载到 `window.mediaPlayerBackend.*`。
- [x] Repository 接线：
  - `src/features/backend/repository/types.ts`：新增视频转码方法签名。
  - `src/features/backend/repository/realRepository.ts`：新增调用实现。
- [x] 能力探测（encoder/muxer）：
  - 复用 `ffmpeg -encoders/-muxers` 探测思路（封装器 muxer / 编码器 encoder）。
  - 产出可解释的不可用原因（ffmpeg_unavailable/encoder_unavailable/muxer_unavailable）。
- [x] 输出自动入库：
  - 与 P0 一致：成功后必要时写入 `import_sources_v1.directories`，然后刷新快照。
- [x] 测试：
  - 后端：args 构建 + progress parser 单测（无需真实跑完整转码）。
  - IPC：`electron/registerBackendIpcHandlers.test.ts` 补齐“handler 存在性与 schema”覆盖。

### P2.3 验收标准

- [ ] 单文件：可完成、可取消、失败可重试。
- [ ] 批量：N>5 的任务可完成，进度在任务执行期持续推进。
- [ ] 能力灰度：本机缺少 encoder 时 UI/后端都能给出明确原因（至少后端拒绝）。

---

## P3：视频转码 UI + 体积预估（size estimation）

### P3.1 阶段目标

- 在视频页提供可用的转码面板与任务历史。
- 参数变更时可展示“预计输出体积”与误差范围。

### P3.2 TODO checklist

- [x] 新增体积预估 IPC：`estimateVideoTranscodeOutputSize`。
  - 位置建议：`electron/facade/FileSystemManagementHandlers.ts` + `electron/registerBackendIpcHandlers.ts`。
  - 算法（自动选择）：
    - 码率公式法 (bitrate_formula)：`bytes = (videoKbps + audioKbps + overhead) * 1000/8 * durationSec`。
    - CRF 启发式 (crf_heuristic)：基于源码率 + CRF 估算倍率，输出区间与置信度。
    - 采样估算 (sample_encode)：可选按钮触发（首发可先不做）。
- [x] 前端视频转码面板：
  - 新增 `src/components/VideoTranscodePanel.tsx`（仿照 `MusicAudioTranscodePanel.tsx`）。
  - 新增 `src/components/useVideoTranscodeController.ts`（仿照 `useMusicAudioTranscodeController.ts`）。
  - 在 `src/components/VideoMainSection.tsx` 增加入口（仅管理模式可用，且有选中视频或焦点视频）。
- [x] 选中视频集合透传：
  - `src/features/app/useAppWorkspaceProps.impl.ts` 已能解析 sidebar checked videos（用于 addToPlaylist）。
  - 将该逻辑抽为 `manageSelectedVideoIds` 并透传到 `VideoMainSection`，供转码面板使用。
- [x] 能力灰度展示：
  - 面板打开时读取 `readVideoTranscodeCapabilities`。
  - 不可用选项灰度 + 禁用“开始”。
- [x] 体积预估展示：
  - 参数变化触发 debounce 调用 estimate IPC。
  - 展示：源文件大小、预计输出大小（及范围）、压缩比。
- [ ] Settings（可选但推荐）：
  - `src/contracts/settings.ts` + `src/store/useUiStore.ts`：新增视频转码默认参数与上次使用记忆。
- [x] 测试：
  - 前端：VideoMainSection 交互用例（面板打开、发起请求 payload、预估展示）。

### P3.3 验收标准

- [ ] 码率模式下，预估误差可控（建议 <10%）。
- [ ] CRF 模式下，能给出合理区间与置信度，且实际结果落在区间内概率较高（目标 >=70%）。

---

## P4：硬化与体验完善（发布门禁）

### P4.1 阶段目标

- 提升稳定性与可排障性：错误归因、资源治理、磁盘预检、任务历史治理。
- 对齐 CI：`npm run quality:ci` 与 `npm run build:electron` 全绿。

### P4.2 TODO checklist

- [ ] 任务治理：
  - 视频转码并发默认 1，上限 2；与 `TaskResourceGovernor` CPU token 协同。
  - 进度事件节流（例如 200~500ms），只保留最新帧（避免 IPC 洪泛）。
- [ ] 磁盘空间预检查（可选但强烈建议）：
  - 使用 `estimatedBytes` 与目标盘剩余空间对比，不足时提前失败并提示。
- [ ] 错误归因与提示：
  - 常见 ffmpeg stderr 模式 -> 本地化提示（encoder missing、invalid argument、permission denied、disk full）。
- [ ] 输出处理：
  - 完成后提供“打开输出目录”按钮（通过现有 `openExternalUrl` 或新增 `openDirectory` IPC）。
- [ ] 文档同步：
  - `docs/interaction-v1.md`：新增音频/视频转码入口与参数说明。
  - `docs/requirements-v1.md`（如需求口径变更）。
- [ ] 全量回归：
  - `npm run quality:ci`
  - `npm run build:electron`

### P4.3 验收标准

- [ ] 长任务（>10min 视频转码）可稳定运行，取消不残留僵尸进程。
- [ ] 错误提示可读且可定位（至少包含缺失 encoder/muxer 的明确字段）。
- [ ] CI 质量门禁全部通过。
