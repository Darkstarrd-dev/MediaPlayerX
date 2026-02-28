下面给出一份**完整实施方案**，在你现有《mpv 增强模式与转码实施计划（v1.1）》已落地“增强音频播放（mpv）+ 音频转码（ffmpeg）”的基础上，补齐两块能力：

1. **音频格式转换的参数设置功能**（不仅是“预设”，还要让用户可调关键参数并持久化）
2. **视频格式转换功能**（常用参数设置 + 转换后体积预估）



---

## 1. 现状基线与本次增量目标

### 1.1 已有能力（来自文档的既定架构约束）

* 前端通过 `window.mediaPlayerBackend` 调用后端能力；合约集中在 `src/contracts/backend.schemas.ts` 保持 SSOT，不新增分散 schema。
* 转码链路采用 `ffmpeg/ffprobe` 独立服务，任务化、可进度、可取消、可并发治理，并且已具备“预设 + 能力探测（encoder/muxer）+ 默认输出到库内 + 输出到库外提示导入源”的策略。
* ffmpeg 进度建议用 `-progress pipe:1` key=value 解析，避免 stdin 卡死用 `-nostdin`。

### 1.2 本次必须交付

A. **音频转码参数设置**

* 在现有“音频预设”基础上，允许用户调整常用参数（码率/质量、采样率、声道、FLAC 压缩级别、元数据策略等）
* 参数可在 UI 中配置、可保存为默认值（Settings），并能在任务详情中回显（便于复现）
* 参数校验 + 能力探测联动：不可用时给出明确原因并禁用

B. **视频转码功能**

* 支持单文件/批量任务、进度、取消、重试、输出列表、覆盖/元数据复制、输出目录、自动入库（若你们有视频库则入库，否则至少可落盘并在 UI 提示位置）
* 提供“常用参数设置”：分辨率/帧率/码率或 CRF/编码器/封装格式/音频策略/快启动等
* 提供**转换后体积预估**：参数变更时实时刷新（至少给出估算值与可信区间/方法来源）

---

## 2. 总体架构扩展方案（保持你们现有模式）

### 2.1 服务层建议：把“音频转码”升级为“统一转码域”

当前你们已有 `ManagementAudioTranscodeService`（命名示例来自文档进展记录）。为避免后续重复造轮子，建议升级为：

* `electron/services/transcode/ManagementTranscodeService.ts`

  * `startAudioTranscodeTask(...)`
  * `startVideoTranscodeTask(...)`
  * `readTranscodeTasks(...)`
  * `cancelTranscodeTask(...)`
  * `retryTranscodeTask(...)`
* 继续保留 `ffmpegArgsBuilder.ts`，但拆分两个 builder：

  * `buildAudioFfmpegArgs(request, probeInfo)`
  * `buildVideoFfmpegArgs(request, probeInfo)`
* 新增 `sizeEstimator/`：

  * `estimateAudioOutputSize(...)`（可选，但建议做，体验一致）
  * `estimateVideoOutputSize(...)`（本次必须做）

### 2.2 IPC/Preload/Repository 延续既定约束

* 合约：继续扩展 `src/contracts/backend.schemas.ts`（SSOT）。
* IPC：扩展 `electron/registerBackendIpcHandlers.ts` + `electron/channels.ts`
* Preload：扩展 `electron/preload.ts` 把能力挂到 `window.mediaPlayerBackend.transcode.*`
* UI：沿用你们音乐页 TC 面板的模式（已有转码入口），视频页/文件详情页新增类似入口

---

## 3. 音频格式转换参数设置：实施方案

### 3.1 UX 设计（不增加复杂度为首要原则）

在现有“TC 转码面板”基础上增加一块 **参数区（折叠）**：

* **基础区（默认展示）**

  * 输出格式（沿用已有预设：FLAC/ALAC/WAV/Opus/AAC/MP3）
  * 质量（对有损）：`低 / 标准 / 高 / 极高`（映射到 bitrate 或 VBR quality）
  * 采样率：`跟随源 / 44.1k / 48k / 96k`
  * 声道：`跟随源 / 单声道 / 立体声`
  * 元数据：`复制 / 不复制 / 复制并覆盖（若用户填写字段）`
* **高级区（可展开）**

  * MP3：CBR/VBR、`-b:a`、`-q:a`
  * AAC：profile（LC/HE-AAC…，按能力矩阵灰度）、`-b:a`
  * Opus：VBR 开关、bitrate、复杂度（可选）
  * FLAC：压缩级别 `0-12`
  * WAV：位深（如 16/24，注意 ffmpeg PCM 编码器可用性）
  * 响度/归一化（可选项，后续再做；本次可先不开放 UI，只保留技术通道）

> 关键点：**把“用户心智”锁定在少量常用参数**，其他都放到“高级”并默认折叠，否则参数爆炸。

### 3.2 Settings 持久化设计

在 `src/contracts/settings.ts` 里新增（示例结构）：

* `transcode.audio.defaultPresetId`
* `transcode.audio.defaultsByPreset`（按 preset 存默认参数）
* `transcode.audio.ui.lastUsed`（可选：记住上一次选择）

这样能满足：

* 用户设置“默认音频转码参数”
* 每次打开面板自动回填
* 任务创建时把最终参数写进 task payload，保证可追溯

### 3.3 合约（backend.schemas.ts）建议新增

新增两个核心 DTO：

* `audioTranscodeParamsSchema`

  * `codec`（opus/aac/mp3/flac/alac/wav）
  * `mode`（copy / vbr / cbr / lossless）
  * `bitrateKbps?`
  * `quality?`（VBR 等级）
  * `sampleRate?`、`channels?`
  * `flacCompressionLevel?`
  * `metadataMode`（copy / none / copyAndOverride）
* `startAudioTranscodeRequestSchema` 扩展为：`presetId + paramsOverride?`

  * 兼容旧任务：如果没有 paramsOverride，就按 preset 默认参数生成

### 3.4 ffmpeg 参数映射规则（ffmpegArgsBuilder）

* **无损类**

  * FLAC：`-c:a flac -compression_level N`（N 来自 UI）
  * ALAC：`-c:a alac`
  * WAV：`-c:a pcm_s16le` / `pcm_s24le`（按位深）
* **有损类**

  * MP3：CBR `-c:a libmp3lame -b:a 192k`；VBR `-q:a 2`
  * AAC：`-c:a aac -b:a 160k`（profile 按能力矩阵/参数）
  * Opus：`-c:a libopus -b:a 128k` +（可选 `-vbr on/off`）
* 采样率/声道：

  * `-ar`、`-ac`（当用户不选“跟随源”时）
* 元数据：

  * `-map_metadata 0`（复制）
  * 覆盖策略：如需要覆盖字段，追加 `-metadata key=value`

### 3.5 参数校验与能力探测联动

你们已有“编码器 + muxer 可用矩阵”的能力探测机制（文档 P2 里已提到）。
扩展点：

* 探测结果要能回答：“该 preset 是否可用、不可用原因是什么”（已有）
* 进一步回答：“该参数组合是否可用”

  * 例如：WAV 24-bit 需要对应 pcm 编码器可用
  * AAC profile 是否支持
* UI 策略：

  * 参数项灰度/禁用 + tooltip 显示原因
  * “开始转码”前做一次后端 `validateTranscodeRequest`（可选，但强烈建议），避免前端与后端不一致

---

## 4. 视频格式转换：实施方案（含常用参数 + 体积预估）

### 4.1 范围定义（先做“能用且好用”的最小集合）

#### 支持输入

* 任意 ffmpeg 能解的常见视频文件（mp4/mkv/webm/mov/avi…）
* 批量：文件列表或库内条目列表

#### 支持输出（首发建议）

* 容器（Container）：`MP4 / MKV / WebM`
* 视频编码器（Video Codec）：

  * `H.264 (libx264)`
  * `H.265/HEVC (libx265)`（可选灰度，取决于构建）
  * `VP9 (libvpx-vp9)`（WebM 常用）
  * `AV1`（如果 encoder 可用就显示，否则灰度）
* 音频编码器（Audio Codec）：

  * `AAC`（MP4/MKV 常用）
  * `Opus`（WebM/MKV 常用）
  * `copy`（保留原音轨）
* 字幕策略（可先做最简单两档）：

  * `copy`（MKV 优先；MP4 可能需要转 `mov_text`，首发可灰度/限制）
  * `drop`（不要字幕）
  * *burn-in*（烧录字幕）建议放后续迭代，因为 UI/滤镜更复杂

### 4.2 UI 设计（建议：视频页/文件右键 + 转码面板）

#### 基础区（默认）

* 输出格式：MP4/MKV/WebM
* 视频编码：H.264/H.265/VP9/AV1（按能力探测显示）
* 质量模式（2 选 1）：

  1. **质量优先（CRF）**：用户选“质量：高/标准/省体积” -> 映射到 CRF
  2. **体积可控（目标码率）**：用户填 `视频码率 kbps`
* 分辨率：跟随源 / 1080p / 720p / 480p / 自定义（宽高）
* 帧率：跟随源 / 60/30/24
* 音频：copy / AAC / Opus（如编码则给音频码率 96/128/160/192k）
* 输出目录、覆盖、元数据复制（沿用音频转码既有项）

#### 高级区（折叠）

* x264/x265 preset：ultrafast/superfast/veryfast/faster/fast/medium/slow/slower/veryslow
* tune/profile/level（可先只开放 preset；tune/profile/level 后续再加）
* `faststart`（MP4：`-movflags +faststart`）
* 关键帧间隔 GOP（可选）
* 去隔行（deinterlace）开关（可选）

### 4.3 后端服务与任务模型

#### 新增/扩展 DTO

* `videoTranscodeParamsSchema`

  * `container`
  * `videoCodec`
  * `mode: crf | bitrate | copy`
  * `crf?` / `videoBitrateKbps?`
  * `preset?`（编码 preset）
  * `scale?`（目标宽高/长边）
  * `fps?`
  * `audioMode: copy | encode | drop`
  * `audioCodec?` + `audioBitrateKbps?`
  * `subtitleMode: copy | drop | burnIn?`
  * `metadataMode`
  * `faststart?`
* `startVideoTranscodeTaskRequestSchema`

  * `inputs`（文件路径或库内 locator）
  * `outputDir`
  * `params`
  * `overwrite`
  * `autoImportToLibrary?`（如果你们有视频库；没有就改成“完成后在文件管理器中显示/打开目录”）

#### 任务落库

沿用你们现有 `transcode_tasks_v1` 的思路，建议扩展字段：

* `kind: audio | video`
* `requestPayloadJson`（含 params，保证可追溯/可重试）
* `estimateBytes?`（启动前估算值）
* `estimateMethod?`（见下文）
* 输出清单：`outputs[]`（路径/大小/媒体信息摘要）

### 4.4 ffmpeg 参数生成（video ffmpegArgsBuilder）

通用基线参数：

* `-hide_banner -nostdin`
* 覆盖策略：`-y` 或 `-n`
* 进度：`-progress pipe:1 -stats_period 0.5`（可选 stats_period）

典型映射（示例逻辑）：

* 容器 mp4：

  * 视频：`-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p`
  * 音频：`-c:a aac -b:a 160k` 或 `-c:a copy`
  * `faststart`：`-movflags +faststart`
* 容器 webm：

  * 视频：`-c:v libvpx-vp9 -crf 32 -b:v 0`（VP9 常见写法）
  * 音频：`-c:a libopus -b:a 128k`
* 分辨率：

  * `-vf scale=w:h:force_original_aspect_ratio=decrease` + `pad`（如果你们希望保持画面不变形且不裁切）
  * 或更简单：只 `scale` 到长边，保持比例（首发推荐简单）
* 帧率：

  * `-r` 或 `-vf fps=...`（谨慎；首发建议优先 `-r` 并跟随源）
* 字幕：

  * `copy`（容器允许时）：`-c:s copy`
  * `drop`：`-sn`
  * burn-in：`-vf subtitles=...`（后续再做）

---

## 5. 转换后体积预估：算法与落地方式（视频必做）

体积预估的关键在于：**不同“质量模式”对应不同可预测性**。建议实现成一个后端 API（保证前端轻量且一致）：

### 5.1 新增 IPC：`estimateVideoTranscodeOutputSize`

* 入参：`inputPath(s) + videoParams`
* 出参（建议）：

  * `estimatedBytes`
  * `rangeBytes?: { low, high }`（给可信区间更符合现实）
  * `method: bitrate_formula | crf_heuristic | sample_encode`
  * `confidence: low | medium | high`
  * `details`（可选：durationSec、assumedVideoBitrateKbps、audioBitrateKbps、overheadFactor）

### 5.2 三种估算方法（按可用信息自动选择）

#### 方法 A：码率公式法（高可信，强推荐默认）

适用：用户选择了**目标码率**（videoBitrateKbps）或你们的 preset 明确给出码率。

* `durationSec` 用 `ffprobe` 获取
* 总码率：

  * `totalKbps = videoKbps + audioKbps + overheadKbps`
  * `overheadKbps` 可用经验值：例如 `1%~3%`，或固定加 `50~150 kbps`（保守一些即可）
* 体积：

  * `bytes = totalKbps * 1000/8 * durationSec`

输出：

* `confidence = high`
* `range` 可给 ±5%~10%

#### 方法 B：CRF 启发式估算（中可信）

适用：CRF 模式（x264/x265/VP9/AV1）——CRF 本质“质量目标”，体积受内容复杂度影响大。

建议策略：

1. `ffprobe` 读取源文件：

   * `durationSec`
   * 源视频码率 `srcVideoKbps`（若存在；没有就用 `fileSize/duration` 粗算）
2. 根据编码器与 CRF 给一个“预期压缩比/效率因子”

   * 经验模型（可配置，后期可用真实任务数据回归）：

     * 同编码器 CRF 变化：每 +6 CRF，码率约减半（这是常见经验，作为启发式足够）
     * 编码器效率因子：H.265 通常比 H.264 更省、AV1/VP9 进一步更省（只做粗略倍率）
3. 得到估算 videoKbps，再走方法 A 的体积公式

输出：

* `confidence = medium`
* `range` 给 ±25%~40%（如内容复杂度未知）

#### 方法 C：短片段采样编码（较高可信，但有成本）

适用：用户非常在意预估准确度，或 CRF 模式下希望更准。

实现：

* 后端用同样参数对**前 N 秒**（比如 8~15 秒）做一次临时转码（写到 temp 文件）
* 读取 sample 输出大小 `sampleBytes`，计算平均码率并外推到全片
* 可选：在片头复杂度不代表整体时，进一步采样“中段 10 秒”（增加一次 `-ss`）

输出：

* `confidence = high`
* `range` 给 ±10%~20%
* UI 上提示“采样估算会额外消耗 CPU，且会短暂创建临时文件（自动清理）”

> 产品建议：默认用 A/B；在 UI 提供一个“更准确预估（采样）”按钮触发 C。

---

## 6. 实施步骤（按迭代拆解，不写工期）

### 迭代 1：音频转码参数设置闭环

1. 合约扩展：`audioTranscodeParamsSchema` + 请求 DTO 兼容旧版
2. Settings 扩展：保存默认参数与最近一次使用
3. UI：在现有 TC 面板加“参数区（基础 + 高级折叠）”
4. 后端：`ffmpegArgsBuilder` 支持 paramsOverride
5. 校验：能力探测 + 参数组合校验（至少 codec/muxer/关键参数）
6. 任务详情回显：显示最终 ffmpeg 参数摘要（不必展示完整 args，但要可复制）

### 迭代 2：视频转码 MVP（参数 + 进度 + 取消）

1. 数据模型：`kind=video` 的任务接入统一任务表
2. 后端：

   * `startVideoTranscodeTask`
   * `buildVideoFfmpegArgs`
   * 进度解析复用现有 `-progress pipe:1`
3. UI：

   * 视频页/文件详情页增加“转换格式”
   * 视频转码面板（基础参数优先）
4. 输出处理：

   * 默认输出目录策略（沿用音频：库内 transcoded 或用户选定目录）
   * 覆盖/元数据复制

### 迭代 3：视频体积预估 + 能力灰度完善

1. `estimateVideoTranscodeOutputSize` IPC
2. 预估方法 A/B 先上线；采样法 C 作为可选按钮
3. UI 在参数区实时显示：

   * 源文件大小
   * 预计输出大小（及范围）
   * 预计压缩比
4. 能力矩阵扩展到 video encoders/muxers，并对不可用选项灰度显示原因

### 迭代 4：硬化与体验完善

* 批量任务：多文件同参转码、失败项重试、历史记录筛选
* 磁盘空间预检查：`estimatedBytes` vs free space（可选，但很实用）
* 任务资源治理：视频转码默认并发 1，上限 2（与音频共享资源 token）
* 错误归因：常见 ffmpeg 错误映射为用户可理解提示
* 文档与发布说明：新增“视频转码说明 + 体积预估说明（含误差声明）”

---

## 7. 验收标准（建议直接纳入测试矩阵）

### 7.1 音频参数设置验收

* 同一预设下调整参数（如 MP3 128k/320k、FLAC level 5/8）后：

  * 任务 payload 正确落库、重试后参数不丢
  * 输出文件属性（码率/采样率/声道）符合期望
  * 能力不支持时 UI 正确灰度且后端校验会拒绝并给出原因

### 7.2 视频转码验收

* 单文件/批量：均可完成、可取消、失败可重试
* 输出文件可播放（用 mpv 或系统播放器 smoke）
* 常用参数生效：

  * 分辨率变更、帧率变更、CRF/码率模式生效
  * MP4 faststart 生效（可用简单方式验证：网络播放起播更快/ffprobe flags）
* 体积预估：

  * 码率模式：误差在可接受范围（建议 <10%）
  * CRF 启发式：给出合理范围且实际结果落在区间概率高（比如 70% 以上）
  * 采样估算：误差显著优于启发式（比如 <20%）

---

## 8. 风险与应对

1. **ffmpeg 构建差异导致可用编码器不同**

   * 必须依赖“能力探测矩阵 + UI 灰度 + 后端校验”三件套，避免用户踩坑。

2. **CRF 体积预估天然不准**

   * 通过“范围 + 置信度 + 采样估算”组合，把不确定性产品化，而不是硬给一个数字

3. **视频转码 CPU 压力大影响前台体验**

   * 默认串行 + 资源 token + 可配置上限（你们文档已有类似治理思路，可复用）。

4. **容器/字幕兼容性复杂**

   * 首发明确限制：MP4 优先做音视频；字幕 copy/burn-in 先对 MKV 做稳定支持，MP4 字幕后续迭代

---

如果你希望我把这份方案进一步“落到你们代码结构的具体改动清单”（精确到：新增哪些 IPC handler、哪些 repo 方法、哪些 React 组件/状态字段、哪些 Zod schema 字段名、以及每个 preset 的默认参数映射表），我也可以在这个方案基础上直接给出一份**按文件路径/模块的改造 checklist**，便于直接开任务拆分。
