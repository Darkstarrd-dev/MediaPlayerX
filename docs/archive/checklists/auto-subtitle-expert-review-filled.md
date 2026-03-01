# 自动字幕专家评审输入包模板（含骨架代码）

Last updated: 2026-02-19
Owner: MediaPlayerX 字幕链路
Target: 外部专家评审（ASR/VAD/说话人分离）

---

## 1. 评审目标

### 1.1 目标问题

1. **Simple 模式**：字幕堆积、文本非线性跳变（头/中/尾不稳定）。
2. **Advanced 模式**：说话人拆分不准（易误分）、响应延迟高。
3. **稳定性**：避免 Electron IPC 与 WebAudio 链路的非稳定错误。

### 1.2 目标指标（建议）

| 指标 | 目标值 | 备注 |
|---|---:|---|
| Simple 端到端字幕延迟 P50 | <= 500ms | 播放中实时观感 |
| Advanced 端到端字幕延迟 P95 | <= 1200ms | 含 VAD + speaker |
| 说话人切换误判率 | <= 10% | 以人工标注为准 |
| 说话人过分裂率（S3+） | <= 5% | 双人样本中评估 |
| 字幕堆积可读性问题 | 0 严重问题 | 不出现无规律跳变 |

---

## 2. 复现实验集

### 2.1 当前样本

- 主样本（已提取）：`testdata/speaker-scan/voice_03m13s_04m13s.wav`
- 来源：`Z:\voice.mp4` 的 `03:13~04:13`
- 规格：`16kHz` / `mono` / `pcm_s16le`

### 2.2 实验矩阵（模板）

| Case | 模式 | 参数集 | 预期 | 结果 |
|---|---|---|---|---|
| C1 | Simple | 默认 | 无堆积、线性增长 | pending |
| C2 | Simple | playbackRate 1.0/1.25/1.5 | 不劣化 | pending |
| C3 | Advanced | vad=balanced + spk=0.50 | 双人稳定 S1/S2 | pending |
| C4 | Advanced | vad=aggressive + spk=0.48 | 降低延迟 | pending |
| C5 | Advanced | vad=conservative + spk=0.55 | 降低误切换 | pending |

---

## 3. 当前实现骨架（可直接评审）

> 说明：以下为“当前策略”的压缩骨架代码，便于专家不依赖全仓库快速理解。

### 3.1 Renderer 推流骨架（Simple/Advanced 共用）

```ts
type AudioChunk = {
  sampleRateHz: number
  channelCount: number
  startSec: number
  endSec: number
  samples: Float32Array
}

const pushQueue: AudioChunk[] = []
let pushInFlight = false

function encodeFloat32ToBase64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + 0x8000)))
  }
  return btoa(binary)
}

async function drainPushQueue(pushSubtitleAudio: (req: unknown) => Promise<{ cues: unknown[] }>) {
  if (pushInFlight) return
  const chunk = pushQueue.shift()
  if (!chunk) return

  pushInFlight = true
  try {
    await pushSubtitleAudio({
      chunk_base64: encodeFloat32ToBase64(chunk.samples),
      sample_rate_hz: chunk.sampleRateHz,
      channel_count: chunk.channelCount,
      chunk_start_sec: chunk.startSec,
      chunk_end_sec: chunk.endSec,
    })
  } finally {
    pushInFlight = false
    void drainPushQueue(pushSubtitleAudio)
  }
}

function onCapturedChunk(chunk: AudioChunk) {
  if (pushQueue.length > 8) pushQueue.shift() // 队列上限
  pushQueue.push(chunk)
}
```

### 3.2 Simple 模式当前策略骨架

```ts
type SimpleState = {
  simpleLastRawText: string
  simpleWindowText: string
  committedText: string
  lastSpeechEndSec: number
}

function computeTextDelta(previousText: string, currentText: string): string {
  if (!currentText) return ''
  if (!previousText) return currentText
  if (currentText === previousText) return ''
  if (currentText.startsWith(previousText)) return currentText.slice(previousText.length).trim()

  const previousTail = previousText.slice(Math.max(0, previousText.length - 16))
  const overlapIndex = currentText.indexOf(previousTail)
  if (overlapIndex >= 0) return currentText.slice(overlapIndex + previousTail.length).trim()
  return currentText
}

function buildSimpleCue(rawAsrText: string, timelineEndSec: number, state: SimpleState) {
  const silenceDuration = timelineEndSec - state.lastSpeechEndSec
  if (silenceDuration > 1.5) {
    state.simpleLastRawText = ''
    state.simpleWindowText = ''
    state.committedText = ''
  }

  const delta = computeTextDelta(state.simpleLastRawText, rawAsrText)
  state.simpleLastRawText = rawAsrText
  if (!delta) return null

  // 单字拟声噪点过滤
  const normalizedDelta = delta.trim()
  if (Array.from(normalizedDelta).length <= 1 && !/[0-9A-Za-z]/.test(normalizedDelta)) return null

  state.simpleWindowText = `${state.simpleWindowText} ${normalizedDelta}`.trim()
  const displayText = pickSimpleDisplayText(state.simpleWindowText, 54)
  if (!displayText || displayText === state.committedText) return null

  state.committedText = displayText
  state.lastSpeechEndSec = timelineEndSec
  return { text: displayText }
}
```

### 3.3 Advanced 模式当前策略骨架（VAD + Speaker）

```ts
type VadConfig = {
  threshold: number
  minSilenceDuration: number
  minSpeechDuration: number
  maxSpeechDuration: number
}

type SpeakerProfile = { id: number; embedding: Float32Array }
type SpeakerState = {
  profiles: SpeakerProfile[]
  currentSpeakerId: number | null
}

const MAX_SPEAKER_COUNT = 3

function identifySpeaker(
  embedding: Float32Array,
  speaker: SpeakerState,
  similarityThreshold: number,
  segmentDurationSec: number,
): number {
  let bestId = -1
  let bestScore = -1
  let currentSpeakerScore = -1

  for (const profile of speaker.profiles) {
    const score = cosineSimilarity(embedding, profile.embedding)
    if (score > bestScore) {
      bestScore = score
      bestId = profile.id
    }
    if (profile.id === speaker.currentSpeakerId) currentSpeakerScore = score
  }

  // 黏滞：优先保持当前说话人
  const stickyThreshold = Math.max(0.35, similarityThreshold - 0.12)
  if (speaker.currentSpeakerId !== null && currentSpeakerScore >= stickyThreshold) {
    return speaker.currentSpeakerId
  }

  if (bestId >= 0 && bestScore >= similarityThreshold) return bestId

  // 新建说话人门槛
  const createThreshold = Math.max(0.35, similarityThreshold - 0.08)
  const allowCreate =
    speaker.profiles.length === 0 || (
      segmentDurationSec >= 0.9 &&
      bestScore < createThreshold &&
      speaker.profiles.length < MAX_SPEAKER_COUNT
    )

  if (!allowCreate && bestId >= 0) return bestId

  const newId = speaker.profiles.length
  speaker.profiles.push({ id: newId, embedding: new Float32Array(embedding) })
  return newId
}
```

### 3.4 WebAudio 采集稳定性骨架（已修补）

```ts
type SharedAudioChain = {
  context: AudioContext
  sourceNode: MediaElementAudioSourceNode
  gainNode: GainNode
}

const sharedAudioChainByVideo = new WeakMap<HTMLVideoElement, SharedAudioChain>()

async function attachCapture(video: HTMLVideoElement) {
  const shared = sharedAudioChainByVideo.get(video)
  const context = shared?.context ?? new AudioContext({ latencyHint: 'interactive' })
  const sourceNode = shared?.sourceNode ?? context.createMediaElementSource(video)
  const gainNode = shared?.gainNode ?? context.createGain()

  if (!shared) {
    sharedAudioChainByVideo.set(video, { context, sourceNode, gainNode })
  }

  // 避免重复创建 sourceNode 导致
  // "HTMLMediaElement already connected" 报错
}
```

---

## 4. 当前参数快照（提交评审时必填）

```yaml
runtime:
  sample_rate_hz: 16000
  push_chunk_samples: 1600
  push_queue_limit: 8
  cue_cache_limit: 300

simple:
  silence_reset_sec: 1.5
  overlap_tail_chars: 16
  display_max_chars: 54
  cue_duration_min_sec: 1.2
  cue_duration_max_sec: 3.2
  cue_duration_chars_factor: 0.16

advanced:
  vad_preset: balanced
  vad_threshold: 0.45
  vad_min_silence_sec: 0.30
  vad_min_speech_sec: 0.25
  vad_max_speech_sec: 15
  segment_min_duration_sec: 0.2

speaker:
  similarity_threshold: 0.50
  sticky_offset: -0.12
  create_offset: -0.08
  create_min_segment_sec: 0.9
  max_speakers: 3
  profile_update_alpha: 0.3
```

---

## 5. 评审所需数据清单（交付物）

1. 输入音频/视频样本（至少 3 类）：
   - 单人连续讲话
   - 双人对话（快切换）
   - 背景噪声/音乐干扰
2. 运行日志（建议 JSONL）：
   - `t_capture_start/end`
   - `t_push_sent/t_push_recv`
   - `vad_segment_start/end/duration`
   - `asr_text_len`
   - `speaker_id/speaker_similarity/speaker_changed`
3. 人工标注（最小）：
   - 句子边界
   - 说话人切换点

---

## 6. 建议专家输出格式（模板）

```md
## 结论
- Root cause #1:
- Root cause #2:

## 改造建议（按优先级）
1. P0:
2. P1:
3. P2:

## 参数建议
- Simple:
- Advanced/VAD:
- Speaker:

## 预期收益
- 延迟:
- 准确率:
- 稳定性:

## 回归风险
- 风险项:
- 规避方案:
```

---

## 7. 快速实验脚本骨架（可直接改）

```ts
// scripts/subtitle-review-probe.mjs (skeleton)
import fs from 'node:fs'

function logEvent(event) {
  fs.appendFileSync('review-events.jsonl', `${JSON.stringify(event)}\n`, 'utf8')
}

export function onVadSegment(seg) {
  logEvent({
    type: 'vad',
    start: seg.startSec,
    end: seg.endSec,
    duration: seg.endSec - seg.startSec,
    at: Date.now(),
  })
}

export function onSubtitleCue(cue) {
  logEvent({
    type: 'cue',
    speaker: cue.speaker,
    speakerChanged: cue.speaker_changed,
    sim: cue.speaker_similarity,
    textLen: Array.from(cue.text || '').length,
    start: cue.start_sec,
    end: cue.end_sec,
    at: Date.now(),
  })
}
```

---

## 8. 当前已知问题（本轮）

1. Simple：在 `ratechange` 下仍存在堆积与非线性跳变（E-M4 fail）。
2. Advanced：external buffer 报错已修复，但说话人拆分与延迟仍未达到可用（E-M5 fail）。
3. WebAudio：`createMediaElementSource` 偶发冲突已修补，待持续观察。

---

## 9. 评审回填区

### 9.1 专家建议摘要

- **Simple（字幕堆积/非线性跳变）的主要根因**：增量文本算法对 *ASR 修订* 与 *playbackRate/seek 触发的时间基准变化* 不鲁棒；再叠加 push 队列满时直接丢弃 chunk，导致 ASR 输出出现“回卷/重复/缺失”，最终表现为堆积与跳变。
- **Advanced（说话人拆分/延迟高）的主要根因**：VAD 产生的有效说话段偏短且缺少 hangover/合并策略，导致 embedding 噪声大；speaker profile 没有“高置信更新 + 切换门槛（margin/cooldown）”，易误切换/过分裂；同时端到端链路缺少 session/seq 防乱序与全链路时序日志，难以定位延迟来自编码/IPC/网络/模型哪一段。
- **优先级建议**：先把“时间基准 + 会话重置 + 不丢音 + 文本增量”做扎实（P0），再做 VAD endpointing 与 speaker smoothing（P1），最后做性能与架构优化（P2）。

### 9.2 计划改造项（转实施）

- [ ] **P0-时间基准统一与会话隔离**
  - 以 *media timeline* 作为唯一时间基准；在 `ratechange/seeking/seeked/ended` 时 `resetSession()`：清空队列、清空 Simple/Advanced 状态、`AbortController.abort()` 取消 in-flight 请求。
  - 每个 chunk 增加 `{session_epoch, chunk_seq}`，响应回包也带回；UI 侧丢弃过期/乱序响应，避免“旧结果覆盖新结果”导致跳变。
- [ ] **P0-Simple 文本增量算法替换**
  - `computeTextDelta` 改为“最长后缀-前缀 overlap（maxOverlapChars 64）+ 修订检测（长度回退/编辑距离阈值）”；遇到修订不再把 `currentText` 整段 append，而是进入“replace/重建窗口”分支。
  - `lastSpeechEndSec` 改为“最后一次看到非空 ASR（或能量/VAD）”的时间，而不是“最后一次 commit cue”的时间，避免长句/稳定段触发误 reset。
- [ ] **P0-背压与丢音策略改造**
  - 取消 `pushQueue.length>limit` 时直接 `shift()` 丢 chunk；改为：队列积压时“合并 batch（<=400ms wall-time 音频）”或“动态增大一次 push 的 samples”，保证不丢音。
  - 记录并上报 `queue_len / encode_ms / push_rtt_ms`，作为延迟根因判定依据。
- [ ] **P0-全链路 JSONL 日志补齐**
  - capture：`chunk_seq/session_epoch/startSec/endSec/playbackRate/queue_len`
  - push：`t_send/t_recv/rtt_ms/bytes`
  - vad：`segment_start/end/duration`
  - speaker：`best/second score/current score/speaker_changed`
  - cue：`committed_len/raw_len/delta_len`
- [ ] **P1-VAD endpointing 调优**
  - 加 `hangover_sec`（建议 0.15~0.20s）与“短静音合并”（<0.18s），减少碎片段；`segment_min_duration_sec` 提升到 0.6s（embedding 用），但 UI 可继续 0.2s 粒度做临时字幕。
- [ ] **P1-说话人识别稳定化**
  - 引入 `switch_margin`（best - current >= 0.03）与 `cooldown_sec`（切换后至少 0.6s 才允许再切换）。
  - 只有在 `bestScore >= update_min_similarity` 且段长 >= 1.0s 时用 EMA 更新 profile（`profile_update_alpha`），并对高度相似的 profile 做 merge，抑制过分裂。
- [ ] **P2-性能与链路稳定性**
  - base64 编码改为 Buffer/Worker（减少主线程抖动）；若经 Electron IPC，优先改为可 transfer 的 `ArrayBuffer`/`MessagePort`（避免大字符串）。
  - AudioContext 生命周期：页面隐藏/视频销毁时显式 close；异常时自动重建链路并降级到 Simple。

### 9.3 复测结论

- **E-M4（Simple + ratechange）**：当前结论 *Fail*（已知：ratechange 下仍堆积/跳变）。  
  复测通过标准（P0 完成后）：  
  1) `committedText` 不出现可见重复段落（重复率 < 2%）；  
  2) `chunk_end_sec` 单调递增（允许 <100ms 抖动），seek/ratechange 后不出现旧 session 回包覆盖；  
  3) C2（1.0/1.25/1.5）下字幕持续线性前进、无“回卷/跳字”。  
- **E-M5（Advanced diarization + 延迟）**：当前结论 *Fail*（说话人误切换/过分裂 + 延迟超标）。  
  复测通过标准（P1 完成后）：  
  1) 说话人切换误判率 <= 10%，过分裂（S3+）<= 5%；  
  2) Advanced 端到端延迟 P95 <= 1200ms（含 VAD + speaker），并能从日志定位瓶颈（编码/推送/模型）。  
- **Final Go/No-Go**：现阶段 **No-Go**；完成 P0（稳定性+不丢音+时间基准）并通过 E-M4 后进入 P1；E-M5 达标后再 **Go**。


## review

基于你提供的《自动字幕专家评审输入包模板（含骨架代码）》，我按 **Simple（增量字幕）/ Advanced（VAD+Speaker）/ WebAudio+IPC 稳定性** 三条线做了专家评审，给出可落地的改造方案，并把“9 评审回填区”按可执行口径回填（文末也附了回填后的 Markdown 文件下载）。

---

## 结论

* **Root cause #1（Simple 堆积/跳变）**：当前 `computeTextDelta` 对 **ASR 修订（回卷）** 与 **playbackRate/seek 导致的时间基准变化** 不鲁棒；当 `currentText` 不再是 `previousText` 的前缀时，算法会把整段 `currentText` 当“增量”追加进窗口，极易出现“重复堆积/非线性跳变”。
* **Root cause #2（Simple 重置逻辑误判）**：`lastSpeechEndSec` 只在 *commit cue* 时更新；当 ASR 在一段时间内“稳定但无新增 delta”或产生修订，`silenceDuration` 会被放大，触发误 reset，造成“头/中/尾不稳定”。
* **Root cause #3（Advanced 误切换/过分裂 + 延迟）**：VAD 段偏碎、缺少 hangover/短静音合并，导致 embedding 噪声大；speaker profile **缺少“高置信更新 + 切换 margin/cooldown”**，容易抖动误切换或分裂出 S3+；同时端到端延迟缺少 session/seq 与全链路时序日志，调参无抓手。
* **Root cause #4（端到端稳定性）**：push 队列满时直接丢 chunk（`shift()`）会制造不可逆的“音频缺口”，ASR 输出出现回卷/补偿，进一步放大字幕跳变；这类问题通常被误认为“ASR 不稳定”。

---

## 改造建议（按优先级）

### P0（必须先做，做完才能谈调参）

1. **统一时间基准 + 会话隔离（ratechange/seek 必须 reset）**
   以 media timeline 为唯一基准；引入 `session_epoch + chunk_seq`，丢弃过期回包，避免旧结果覆盖新结果。
2. **替换 Simple 增量算法**
   采用“最长后缀-前缀 overlap（64 chars）+ 修订检测（回退/编辑距离）”，修订时走 replace/重建窗口分支；并修正 `lastSpeechEndSec` 更新策略（不再依赖 commit）。
3. **背压策略改造：不丢音**
   取消队列满丢 chunk；改为 backlog 时批量合并（<=400ms wall-time）或动态扩大一次 push 的 samples；补齐 `queue_len/encode_ms/push_rtt_ms`。
4. **全链路 JSONL 日志补齐**
   capture/push/asr/vad/speaker/cue 全链路打点，才能证明 P50/P95 与误判率达标。

### P1（在 P0 稳定后再做）

5. **VAD endpointing：hangover + 短静音合并**（降碎片、降误切换、降等待）
6. **Speaker：switch margin + cooldown + 高置信 EMA 更新 + profile merge**（降误切换/过分裂）

### P2（优化项）

7. **编码/IPC 性能**：base64 编码移到 Worker 或用 Buffer；若经 IPC，优先改为可 transfer 的 ArrayBuffer/MessagePort，减少主线程抖动。
8. **AudioContext 生命周期与异常恢复**：视频销毁/隐藏时 close；异常时重建链路并降级到 Simple。

---

## 关键落地改造（带可直接搬进仓库的骨架）

### 1）时间基准统一 + session/seq（解决 ratechange/seek 跳变与旧回包覆盖）

核心点：**任何 ratechange / seeking 都等价于“新会话”**，必须清空状态并取消 in-flight；否则旧回包一来就覆盖 UI，必跳。

```ts
let sessionEpoch = 0
let chunkSeq = 0
let aborter: AbortController | null = null

function resetSession(reason: string) {
  sessionEpoch++
  chunkSeq = 0
  pushQueue.length = 0
  aborter?.abort()
  aborter = null

  // Simple/Advanced 状态一起清空
  resetSimpleState()
  resetAdvancedState()

  logEvent({ type: 'session_reset', reason, sessionEpoch, at: Date.now() })
}

// 建议绑定：ratechange / seeking / seeked / ended / sourcechange（如有）
video.addEventListener('ratechange', () => resetSession('ratechange'))
video.addEventListener('seeking', () => resetSession('seeking'))
video.addEventListener('ended', () => resetSession('ended'))
```

**chunk_start/end 的建议计算**（以 media timeline 为准；避免 playbackRate 下“墙钟时间 vs 媒体时间”错配）：

```ts
function onCapturedChunk(samples: Float32Array, sampleRateHz: number, channelCount: number) {
  const r = video.playbackRate || 1
  const endSec = video.currentTime
  // 输出音频 1 秒 ≈ 消耗 r 秒媒体内容（播放加速时）
  const mediaDurSec = (samples.length / sampleRateHz) * r
  const startSec = Math.max(0, endSec - mediaDurSec)

  pushQueue.push({
    sampleRateHz, channelCount,
    startSec, endSec,
    samples,
    sessionEpoch,
    seq: chunkSeq++,
    playbackRate: r,
  })
}
```

请求里带上 `session_epoch/seq`，回包也带回；**UI 侧丢弃不匹配的回包**（旧会话/乱序）：

```ts
if (resp.session_epoch !== currentSessionEpoch) return
if (resp.seq < lastAppliedSeq) return
lastAppliedSeq = resp.seq
```

---

### 2）背压：取消丢 chunk，改为合并 batch（解决“音频缺口 → ASR 回卷/补偿 → 字幕堆积/跳变”）

当前做法：`if (pushQueue.length > 8) pushQueue.shift()` —— 这是制造字幕问题的“隐形炸弹”。
建议：队列积压时把多个 chunk 合并成一个 push（最多 300~400ms wall audio），不丢音。

```ts
function concatFloat32(chunks: Float32Array[]) {
  const total = chunks.reduce((s, a) => s + a.length, 0)
  const out = new Float32Array(total)
  let off = 0
  for (const a of chunks) { out.set(a, off); off += a.length }
  return out
}

function popBatch(maxWallMs = 400): AudioChunk | null {
  const first = pushQueue.shift()
  if (!first) return null

  const maxSamples = Math.floor(first.sampleRateHz * (maxWallMs / 1000))
  const parts: Float32Array[] = [first.samples]
  let total = first.samples.length
  let endSec = first.endSec

  while (pushQueue.length && total + pushQueue[0].samples.length <= maxSamples) {
    const nxt = pushQueue.shift()!
    parts.push(nxt.samples)
    total += nxt.samples.length
    endSec = nxt.endSec
  }

  return { ...first, endSec, samples: concatFloat32(parts) }
}
```

---

### 3）Simple：替换增量文本策略（解决字幕堆积/非线性跳变）

#### 3.1 更鲁棒的 overlap delta（最长后缀-前缀，而不是“取尾巴 16 个字”）

```ts
function normalizeText(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function computeOverlapDelta(prevRaw: string, currRaw: string, maxOverlapChars = 64) {
  const prev = normalizeText(prevRaw)
  const curr = normalizeText(currRaw)
  if (!curr || curr === prev) return { kind: 'none', delta: '' }

  if (!prev) return { kind: 'append', delta: curr }

  if (curr.startsWith(prev)) {
    return { kind: 'append', delta: curr.slice(prev.length).trim() }
  }

  const p = Array.from(prev)
  const c = Array.from(curr)
  const max = Math.min(maxOverlapChars, p.length, c.length)

  for (let k = max; k >= 1; k--) {
    const suffix = p.slice(p.length - k).join('')
    const prefix = c.slice(0, k).join('')
    if (suffix === prefix) {
      return { kind: 'append', delta: c.slice(k).join('').trim() }
    }
  }

  // 修订检测：长度明显回退，或完全不 overlap，优先当作“替换/重建窗口”
  if (c.length < p.length * 0.7) return { kind: 'replace', delta: curr }
  return { kind: 'replace', delta: curr }
}
```

#### 3.2 修正 silence reset 的“计时基准”

把 `lastSpeechEndSec` 从“最后一次 commit cue”改为“最后一次看到非空 ASR（或能量/VAD）”，避免稳定段误 reset：

```ts
type SimpleState = {
  lastRaw: string
  windowText: string
  committedText: string
  lastNonEmptyAsrSec: number
  lastTimelineSec: number
}

function buildSimpleCue(rawAsrText: string, timelineEndSec: number, state: SimpleState) {
  // 处理 seek/ratechange 导致的非单调：直接 reset（也可由 sessionEpoch 保证）
  if (timelineEndSec + 0.1 < state.lastTimelineSec) {
    state.lastRaw = ''
    state.windowText = ''
    state.committedText = ''
    state.lastNonEmptyAsrSec = timelineEndSec
  }
  state.lastTimelineSec = timelineEndSec

  const raw = normalizeText(rawAsrText)
  if (raw) state.lastNonEmptyAsrSec = timelineEndSec

  const silenceDuration = timelineEndSec - state.lastNonEmptyAsrSec
  if (silenceDuration > 1.5) {
    state.lastRaw = ''
    state.windowText = ''
    state.committedText = ''
  }

  const { kind, delta } = computeOverlapDelta(state.lastRaw, raw, 64)
  state.lastRaw = raw
  if (!delta) return null

  if (kind === 'replace') {
    // 修订：重建窗口，避免把整段当增量 append 造成堆积
    state.windowText = delta
  } else {
    state.windowText = `${state.windowText} ${delta}`.trim()
  }

  const displayText = pickSimpleDisplayText(state.windowText, 54)
  if (!displayText || displayText === state.committedText) return null

  state.committedText = displayText
  return { text: displayText }
}
```

> 如果你希望进一步降低“修订导致的闪动”，可以加一个 `stable_prefix_frames=2`：只有连续两次都包含的前缀才进入 committed（典型 streaming ASR 的稳定化做法）。

---

### 4）Advanced：VAD + Speaker 的可用化路径（误切换/过分裂 + 延迟）

#### 4.1 VAD：hangover + 短静音合并（把段做“够长且不碎”）

* 目标：embedding 段长尽量 ≥ 1.0s；UI 仍可用更细粒度输出临时字幕，但 speaker 归属用“够长段”来判定。
* 建议：

  * `vad_min_silence_sec` 降到 **0.20~0.25** 以降低 endpoint 等待
  * 增加 `vad_hangover_sec` **0.15~0.20**，避免尾音被切碎
  * 合并相邻段：若静音 < **0.18s** 则合并

#### 4.2 Speaker：加 margin/cooldown + 高置信更新 + 合并相似 profile

```ts
type SpeakerConfig = {
  similarityThreshold: number
  stickyOffset: number
  switchMargin: number
  cooldownSec: number
  createMinSegmentSec: number
  createOffset: number
  maxSpeakers: number
  updateMinSimilarity: number
  profileUpdateAlpha: number
}

function l2norm(v: Float32Array) {
  let s = 0
  for (let i = 0; i < v.length; i++) s += v[i] * v[i]
  return Math.sqrt(s) || 1
}
function normalize(v: Float32Array) {
  const n = l2norm(v)
  const out = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n
  return out
}
function emaUpdate(oldEmb: Float32Array, newEmb: Float32Array, alpha: number) {
  const out = new Float32Array(oldEmb.length)
  for (let i = 0; i < out.length; i++) out[i] = (1 - alpha) * oldEmb[i] + alpha * newEmb[i]
  return normalize(out)
}

function identifySpeakerV2(
  embeddingRaw: Float32Array,
  speaker: SpeakerState & { lastSwitchAtSec?: number },
  cfg: SpeakerConfig,
  segmentDurationSec: number,
  segmentEndSec: number,
) {
  const embedding = normalize(embeddingRaw)

  const scores = speaker.profiles.map(p => cosineSimilarity(embedding, p.embedding))
  let bestId = -1, bestScore = -1
  let secondScore = -1
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i]
    if (s > bestScore) { secondScore = bestScore; bestScore = s; bestId = speaker.profiles[i].id }
    else if (s > secondScore) secondScore = s
  }

  const curId = speaker.currentSpeakerId
  const curScore = (curId == null) ? -1 : (scores[speaker.profiles.findIndex(p => p.id === curId)] ?? -1)

  const stickyTh = Math.max(0.35, cfg.similarityThreshold + cfg.stickyOffset)

  const inCooldown =
    speaker.lastSwitchAtSec != null &&
    (segmentEndSec - speaker.lastSwitchAtSec) < cfg.cooldownSec

  // 1) cooldown：抑制抖动切换
  if (curId != null && inCooldown) return curId

  // 2) 优先保持当前说话人（足够相似 & 没有明显更优者）
  if (curId != null && curScore >= stickyTh) {
    if (bestId < 0) return curId
    if (bestId !== curId && (bestScore - curScore) < cfg.switchMargin) return curId
  }

  // 3) 切换条件：best 达阈值且明显优于 current
  if (bestId >= 0 && bestScore >= cfg.similarityThreshold) {
    if (curId == null || (bestId !== curId && (bestScore - curScore) >= cfg.switchMargin)) {
      speaker.currentSpeakerId = bestId
      speaker.lastSwitchAtSec = segmentEndSec
      return bestId
    }
    return bestId
  }

  // 4) 新建说话人：段够长 + 与现有都不够像
  const createThreshold = Math.max(0.35, cfg.similarityThreshold + cfg.createOffset)
  const allowCreate =
    segmentDurationSec >= cfg.createMinSegmentSec &&
    speaker.profiles.length < cfg.maxSpeakers &&
    (bestScore < createThreshold)

  if (allowCreate) {
    const newId = speaker.profiles.length
    speaker.profiles.push({ id: newId, embedding })
    speaker.currentSpeakerId = newId
    speaker.lastSwitchAtSec = segmentEndSec
    return newId
  }

  // 5) 兜底：有 best 就 best，否则 unknown(-1)
  return bestId >= 0 ? bestId : -1
}

// 更新 profile（只在高置信、段够长时）
function maybeUpdateProfile(speaker: SpeakerState, spkId: number, emb: Float32Array, score: number, segDur: number, cfg: SpeakerConfig) {
  if (spkId < 0) return
  if (score < cfg.updateMinSimilarity) return
  if (segDur < 1.0) return
  const p = speaker.profiles.find(x => x.id === spkId)
  if (!p) return
  p.embedding = emaUpdate(p.embedding, emb, cfg.profileUpdateAlpha)
}
```

---

## 参数建议（可作为“起始值”，最终应由日志分布回归）

> 重点：**先做 P0**（不丢音/不乱序/时间基准正确）再调这些参数，否则“越调越玄学”。

```yaml
runtime:
  sample_rate_hz: 16000
  push_chunk_samples: 1600          # 先保持 100ms；backlog 时用 batch 合并，不靠增大 chunk 解决
  push_queue_limit: 8               # 逻辑保留，但不再丢弃，改为合并策略
  cue_cache_limit: 300

simple:
  silence_reset_sec: 1.5            # 先保留；但用 lastNonEmptyAsrSec/VAD 来算
  overlap_tail_chars: 64            # 从 16 -> 64（或直接用 maxOverlapChars）
  display_max_chars: 54
  stable_prefix_frames: 2           # 新增：稳定化（可选）
  revision_reset_ratio: 0.70        # 新增：长度回退判定阈值

advanced:
  vad_preset: balanced
  vad_threshold: 0.42               # 0.45 -> 0.42（更敏感一点，靠 hangover 抑制碎片）
  vad_min_silence_sec: 0.22         # 0.30 -> 0.22（降 endpoint 等待）
  vad_hangover_sec: 0.18            # 新增：尾部挂起
  vad_min_speech_sec: 0.35          # 0.25 -> 0.35（减少碎片段）
  vad_max_speech_sec: 12
  segment_min_duration_sec: 0.60    # embedding 用段（UI 仍可输出更细粒度临时字幕）

speaker:
  similarity_threshold: 0.52        # 0.50 -> 0.52（配合 margin/cooldown）
  sticky_offset: -0.10              # -0.12 -> -0.10
  switch_margin: 0.03               # 新增：切换裕量
  cooldown_sec: 0.60                # 新增：切换冷却
  create_offset: -0.05              # -0.08 -> -0.05（更保守创建）
  create_min_segment_sec: 1.20      # 0.9 -> 1.2（段更长再创建）
  max_speakers: 3
  update_min_similarity: 0.60       # 新增：高置信才更新
  profile_update_alpha: 0.20        # 0.3 -> 0.2（更稳）
```

---

## 预期收益（以你模板里的目标为准）

* **稳定性**：ratechange/seek 不再触发堆积与非线性跳变；旧回包不再覆盖新状态；队列不丢音后 ASR 输出更平滑。
* **延迟**：通过 backlog 合并 + 端到端日志定位瓶颈，Simple 更容易把 P50 压到 500ms 内；Advanced 通过 `min_silence` 下调 + hangover，在不明显降低准确率的情况下把 P95 拉回 1200ms 目标附近。
* **说话人**：加入 margin/cooldown + EMA 更新后，误切换与过分裂会显著下降（尤其是快切换双人对话样本）。

---

## 回归风险与规避

* **风险 1：修订/replace 分支导致 UI 文本“闪动”**
  规避：加 `stable_prefix_frames=2` 或只对“明显回退/无 overlap”的情况 replace；并对 UI 更新加最小刷新间隔（如 150ms）。
* **风险 2：backlog 合并增加单次 push 的数据量**
  规避：限制合并上限（<=400ms wall audio），并记录 `push_rtt_ms`；若 RTT 过大，考虑并发 2 in-flight 或改 WS。
* **风险 3：VAD 更敏感带来噪声误触发**
  规避：用 hangover 与短静音合并抵消；噪声样本单独调 `vad_threshold`。

---

## 9 评审回填区（已回填）

我已按你模板把“9 评审回填区”完整回填到新文件中（内容与本回复一致，便于直接归档/提 PR）。

[下载回填后的 Markdown](sandbox:/mnt/data/auto-subtitle-expert-review-filled.md)
