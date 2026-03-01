# 自动字幕专家评审输入包 V4（自洽版，可脱离项目讨论）

Last updated: 2026-02-19  
Owner: MediaPlayerX Subtitle Runtime  
Checkpoint: `b324147` + 后续未提交调参  
目标：让外部专家**不依赖项目代码仓库**，仅凭本文就能完成技术评审与方案设计。

---

## 1. 背景与本次评审边界

当前离线字幕链路已从“不可用”进入“基本可用”，现阶段问题从“系统性失败”收敛为“局部质量问题”。

本次评审只讨论 4 个问题：

1. **Simple 模式是否应保留**（当前体验明显不如 Advanced）。
2. **行级分离优先 (Line-first Separation)** 是否应替代“严格 S1/S2 身份正确性优先”。
3. **短句/单字/语气词漏识别**（如“啊”“哈哈”）如何提升召回。
4. **预生成 (Pre-generation) + 增量落盘**：利用当前高速稳定链路实现“边生成边写文件、播放回偏移对齐、seek 可回看”。

---

## 2. 已知事实（可直接用于结论）

### 2.1 手测结论（最新）

- E-M4（Simple）: `pass`，但实用性低于 Advanced。  
- E-M5（Advanced）: `fail`（非系统性）
  - 长时间单号塌缩：已从“频繁”下降到“偶发/短窗”。
  - 主要剩余问题：换人后 1~2 句编号错判。
  - 延迟：已从 ~2s 降到接近句末即出。
  - seek 回退堆积：已修复。

### 2.2 offset 归因实验（受控）

| Case | 配置 | chunk_rtt_ms avg/p95 | asr_decode_ms avg/p95 | 结论 |
|---|---|---:|---:|---|
| O-4A | renderer-only offset +0.5 | 25.4 / 130 | 121.52 / 229 | 风险可控 |
| O-4B | worker-only offset +0.5 | 39.11 / 202 | 121.78 / 310 | 尾延迟显著恶化 |

明确结论：offset 注入 worker 时间轴风险高；renderer-only 可保留。

### 2.3 当前最接近目标的行为特征

- 大部分时间可以区分两人。
- 仍有“短时间窗口错判”：换人后 1~2 句归到前一人。
- 业务侧优先级已改变：
  - **不要求严格 S1/S2 绝对身份一致**。
  - **优先要求同时间窗两人可分行显示，避免混在一行**。

---

## 3. 系统实现（自包含代码）

以下为当前实现核心逻辑的等价代码，已足够脱离仓库讨论。

### 3.1 IPC 数据契约

```ts
type PushSubtitleAudioRequestDto = {
  chunk_base64: string
  sample_rate_hz: number
  chunk_start_sec: number
  chunk_end_sec: number
  channel_count: number
  session_epoch: number
  chunk_seq: number
}

type SubtitleCueDto = {
  id: string
  text: string
  start_sec: number
  end_sec: number
  lang?: string
  speaker?: number
  speaker_changed?: boolean
}

type SubtitleSessionEventDto = {
  code: string
  level: 'info' | 'warning' | 'error'
  message: string
  created_at_ms: number
}

type PushSubtitleAudioResponseDto = {
  cues: SubtitleCueDto[]
  events: SubtitleSessionEventDto[]
  queue_len: number
  session_epoch: number
  chunk_seq: number
  updated_at_ms: number
}
```

### 3.2 Renderer 关键行为（会话/seek/队列）

```ts
function beginNewEpoch(reason: string) {
  abortInFlightPushIfAny()
  sessionEpoch += 1
  chunkSeq = 0
  lastAppliedSeq = -1
  pushQueue = []
  emit('renderer_epoch_begin', { reason, session_epoch: sessionEpoch })
}

// 关键修复：seek 必定 reset + clear cues（即使在调试 suppress 模式）
function onSeeked(videoCurrentTime: number) {
  beginNewEpoch('seeked')
  cues = []
  resetSubtitleSession({ timeline_sec: videoCurrentTime })
}

async function drainPushQueue() {
  const chunk = popBatchChunk(pushQueue, advancedMode ? 0.2 : 0.35)
  if (!chunk) return

  const req: PushSubtitleAudioRequestDto = {
    chunk_base64: encodeFloat32ToBase64(chunk.samples),
    sample_rate_hz: chunk.sampleRateHz,
    chunk_start_sec: chunk.startSec,
    chunk_end_sec: chunk.endSec,
    channel_count: chunk.channelCount,
    session_epoch: sessionEpoch,
    chunk_seq: chunkSeq++,
  }

  const res = await pushSubtitleAudio(req)
  if (res.session_epoch !== sessionEpoch) return
  if (res.chunk_seq < lastAppliedSeq) return

  lastAppliedSeq = res.chunk_seq
  cues = appendCues(cues, res.cues)
}
```

### 3.3 Worker 参数解析（当前默认值）

```ts
function resolveVadTuning(preset: 'balanced' | 'conservative' | 'aggressive') {
  if (preset === 'conservative') {
    return { threshold: 0.52, minSilenceDuration: 0.45, minSpeechDuration: 0.25, maxSpeechDuration: 20 }
  }
  if (preset === 'aggressive') {
    return { threshold: 0.36, minSilenceDuration: 0.10, minSpeechDuration: 0.15, maxSpeechDuration: 3 }
  }
  return { threshold: 0.42, minSilenceDuration: 0.14, minSpeechDuration: 0.18, maxSpeechDuration: 3 }
}

function resolveSpeakerThreshold() {
  return 0.50
}
```

### 3.4 Worker 分段与短句过滤（当前）

```ts
function consumeVadSegments(vadSegments, sampleRateHz) {
  const cues: SubtitleCueDto[] = []
  for (const seg of vadSegments) {
    const durSec = seg.samples.length / sampleRateHz
    if (durSec < 0.14) {
      // 当前最短过滤门槛（从 0.2 下调到 0.14）
      continue
    }
    cues.push(...decodeSegmentAndBuildCue(seg.samples, seg.startSec, seg.endSec))
  }
  return cues
}
```

### 3.5 Worker 说话人两阶段决策（当前）

```ts
type SpeakerRuntime = {
  profiles: Array<{ id: number; embedding: Float32Array }>
  currentSpeakerId: number | null
  lastSwitchSec: number

  pendingSwitchSpeakerId: number | null
  pendingSwitchCount: number
  pendingSwitchDurationSec: number
  pendingSwitchScoreSum: number
  pendingSwitchIsNew: boolean
  pendingSwitchEmbedding: Float32Array | null
}

// 关键阈值（当前）
const switchCooldownSec = 0.45
const switchMargin = 0.02
const strongSwitchMargin = 0.05
const strongSwitchMinSegSec = 0.68

// existing speaker 两阶段确认窗口（当前）
const pendingExistingCount = 2
const pendingExistingDurSec = 0.35

// new speaker 两阶段确认窗口（当前）
const pendingNewCount = 2
const pendingNewDurSec = 0.90

function identifySpeaker(rt: SpeakerRuntime, emb: Float32Array, segDur: number, segEnd: number): number {
  // 1) score against profiles -> bestId/bestScore/currentScore/bestOtherScore
  // 2) sticky keep (with low-confidence bypass)
  // 3) candidate build (existing/new)
  // 4) strong fast switch path
  // 5) pending evidence accumulate
  // 6) confirm existing/new
  // 7) fallback current
  return rt.currentSpeakerId ?? 0
}
```

---

## 4. 当前真实问题定义（供专家直接对焦）

### P1. Simple 模式价值不足

- 当前实际表现：Simple 在稳定性、可读性、延迟整体不优于 Advanced。
- 待决策：
  - 方案 A：移除 Simple（仅保留 Advanced）。
  - 方案 B：Simple 退化为 Advanced 的单行展示壳（共享同一底层链路）。

### P2. 行级分离优先（替代严格身份优先）

- 业务目标：同一时间窗内两人**分两行显示**，允许标签身份短窗误差。
- 当前瓶颈：切换后 1~2 句短窗错判导致同号并线。

### P3. 短句/语气词遗漏

- 现状：已改善，但仍有漏词。
- 目标：在误检可控前提下，进一步提升召回。

### P4. 预生成

- 已观察：2x 播放可用半时长拿到完整字幕（说明链路吞吐已足够）。
- 历史问题：raw srt 预生成速度反而接近 2x 视频时长。
- 目标：统一为“实时同链路 + 后台加速 + 增量落盘”。

---

## 5. 行级分离优先：建议实现骨架（供专家评估）

```ts
type LineId = 'A' | 'B'

type LineState = {
  id: LineId
  lastEndSec: number
  recentEmbedding: Float32Array | null
  holdUntilSec: number
}

type LineAssignInput = {
  startSec: number
  endSec: number
  text: string
  speakerEmbedding: Float32Array | null
}

function assignLine(input: LineAssignInput, lineA: LineState, lineB: LineState): LineId {
  // continuity score
  const contA = continuity(input.startSec, lineA.lastEndSec)
  const contB = continuity(input.startSec, lineB.lastEndSec)

  // similarity score
  const simA = similarity(input.speakerEmbedding, lineA.recentEmbedding)
  const simB = similarity(input.speakerEmbedding, lineB.recentEmbedding)

  // combined score, with anti-collapse term
  const scoreA = contA * 0.5 + simA * 0.5 - collapsePenalty(lineA, lineB)
  const scoreB = contB * 0.5 + simB * 0.5 - collapsePenalty(lineB, lineA)

  return scoreA >= scoreB ? 'A' : 'B'
}

function renderLines(window: Array<{ line: LineId; text: string }>): string {
  const a = window.filter(x => x.line === 'A').map(x => x.text).join(' ').trim()
  const b = window.filter(x => x.line === 'B').map(x => x.text).join(' ').trim()
  return [a, b].filter(Boolean).join('\n')
}
```

说明：该方案目标是“可读分离”，不是“全局身份永远正确”。

---

## 6. 短句召回：建议策略骨架（供专家评估）

```ts
const SHORT_INTERJECTION = new Set(['啊', '哈', '哈哈', '哎', '嗯', '哦', '诶'])

function shouldKeepShort(seg: { durSec: number; text: string; conf: number }): boolean {
  if (seg.durSec >= 0.18) return true
  if (seg.text.length <= 2 && SHORT_INTERJECTION.has(seg.text)) return seg.conf >= 0.24
  if (/^[\u4e00-\u9fa5]{1,2}[！!？?。.]?$/.test(seg.text)) return seg.conf >= 0.28
  return false
}

function emitShortAware(seg, prevCue, nextCueHint) {
  if (!shouldKeepShort(seg)) return null
  return mergeNeighbor(seg, prevCue, nextCueHint, 0.30)
}
```

建议专家给出：
- 语气词白名单是否需要按语言分组；
- 置信阈值如何随噪声动态调整；
- 误检上限目标（例如 <= 3%）。

---

## 7. 预生成 + 增量落盘：建议架构（供专家评估）

### 7.1 核心目标

1. 高速离线推理（RTF 目标 < 0.5，继续测试 3x/4x 极限）。
2. 增量写入 SRT/JSON 索引。
3. 播放端统一回偏移 1s。
4. seek 回退直接命中已生成内容；超出已生成范围自动续算。

### 7.2 结构与流程

```ts
type PreGenState = {
  mediaId: string
  generatedUntilSec: number
  cues: SubtitleCueDto[]
  srtPath: string
  jsonlPath: string
  lastFlushAtMs: number
}

async function preGenerate(mediaAudio, state: PreGenState) {
  for await (const chunk of mediaAudio) {
    const cues = await runVadAsrSpeaker(chunk) // 与实时链路同源
    if (cues.length === 0) continue

    appendCueIndex(state.cues, cues)
    appendSrt(state.srtPath, cues)
    appendJsonl(state.jsonlPath, cues)
    state.generatedUntilSec = Math.max(state.generatedUntilSec, cues[cues.length - 1].end_sec)
  }
}

function readForPlayback(currentSec: number, state: PreGenState): SubtitleCueDto[] {
  const t = Math.max(0, currentSec - 1.0) // 回偏移 1s
  if (t > state.generatedUntilSec - 2.0) {
    triggerBackgroundGenerate(t)
  }
  return queryWindow(state.cues, t)
}
```

### 7.3 必测指标

- RTF：1x / 2x / 3x / 4x
- 稳定输出率（无中断）
- seek 命中率（回退直接可读）
- 实时显示与最终文件一致性

---

## 8. 专家必答清单（不可跳项）

1. Simple 模式建议：删除 / 合并 / 保留，给理由与迁移方案。  
2. 行级分离优先是否可落地，给状态机与参数。  
3. 短句召回如何提升且不显著误检。  
4. 预生成如何复用当前链路并达到 >=2x，3x/4x 上限怎么测。  
5. 最终推荐路线（低改动优先）与分阶段计划。

---

## 9. 验收门禁（本轮）

1. 长时间单号塌缩：基本不可见。  
2. 换人后错号窗口：`<= 1` 句。  
3. 短句/语气词召回：主观明显提升 + 有定量统计。  
4. 预生成速度：稳定 `>= 2x`，并给出 `3x/4x` 极限结论。  
5. seek：回退不堆积，前进超界可自动续生成。

---

## 10. 评审输出格式（固定）

```md
## 1. 决策
- Simple 模式：
- 行级分离优先：
- 预生成路线：

## 2. 方案 A（低改动）
- 改动点：
- 参数：
- 风险：
- 验证：

## 3. 方案 B（中改动）
- 改动点：
- 参数：
- 风险：
- 验证：

## 4. 预生成实现
- 任务拆分：
- 数据结构：
- 并发/落盘：
- seek 与偏移策略：

## 5. 最终推荐
- Go/No-Go：
- 里程碑：
```
