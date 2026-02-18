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

- 待填写

### 9.2 计划改造项（转实施）

- [ ] P0-
- [ ] P1-
- [ ] P2-

### 9.3 复测结论

- E-M4:
- E-M5:
- Final Go/No-Go:
