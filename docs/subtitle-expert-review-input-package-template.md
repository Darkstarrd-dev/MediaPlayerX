# 自动字幕专家评审输入包模板 V2（聚焦 offset CPU 与两阶段 speaker）

Last updated: 2026-02-19  
Owner: MediaPlayerX Subtitle Pipeline  
Target: 外部专家评审（ASR/VAD/在线说话人分离）

---

## 0. 本模板用途

- 用于向外部专家提交**可复现实验包**，集中解决两个问题：
  1. `ASR 时间偏移 (timeline offset)` 为什么引入高 CPU 且没有明显收益。
  2. `两阶段说话人决策 (two-stage speaker decision)` 如何继续改到可锁定且低延迟。
- 本模板是输入包“骨架”，提交前请把 `pending` 项全部回填。

---

## 1. 当前复测结论（必须原样给专家）

### 1.1 E-M5 最新结果（2026-02-19）

1. “全在 S1”现象：**否**。  
2. 高频抖动：**不会高频抖动，但也不会稳定锁定**。  
3. 延迟：**约 2s**。

### 1.2 问题定义（Problem Statement）

- P-A（性能）：开启/调整 offset 后，出现可感知 CPU 占用上升，并伴随字幕时序收益不明显，甚至有副作用。  
- P-B（质量）：两阶段决策降低了高频抖动，但“锁定能力不足 + 切换延迟偏大（~2s）”。

---

## 2. 评审目标与验收指标

| 维度 | 指标 | 目标值 | 备注 |
|---|---:|---:|---|
| 性能 | Renderer CPU 增量（offset 开 vs 关） | <= +5% | 同一素材、同一时长窗口 |
| 性能 | Worker CPU 增量（offset 开 vs 关） | <= +5% | 同上 |
| 时延 | Advanced 端到端延迟 P50 | <= 900ms | capture -> subtitle render |
| 时延 | Advanced 端到端延迟 P95 | <= 1400ms | 极值可接受上限 |
| 质量 | 说话人锁定稳定率 | >= 90% | 双人样本人工标注 |
| 质量 | 错误切换率 | <= 10% | 含误切 + 漏切 |

---

## 3. 专家必答问题（必须逐条回答）

### Q1. offset 机制问题（性能 + 效果）

请回答：

1. 现有 offset 方案中，CPU 放大的**主因链路**是什么（按概率排序）。  
2. 为什么“理论上轻量”的双时间线处理在本项目会出现可感知开销（请给出证据，不要只给猜测）。  
3. 为什么 offset 没有显著改善字幕同步（请拆成：采集、VAD 端点、解码、渲染窗口四段）。  
4. 若保留 offset 能力，推荐的低开销实现架构是什么（必须给伪代码）。

### Q2. 两阶段 speaker 决策优化

请回答：

1. 当前两阶段状态机为何“抗抖动但不锁定”（从阈值、证据窗、profile 更新、切换门控解释）。  
2. 在保持 `MAX_SPEAKER_COUNT=2` 条件下，如何让“锁定稳定 + 切换不慢”同时成立。  
3. 给出至少两套可落地方案：
   - 方案 A：参数与状态机微调（低改动）。
   - 方案 B：引入额外判据（如 turn prior / confidence / look-ahead）但保持实时性。  
4. 给出每套方案的风险、预期收益、回归测试点。

---

## 4. 当前实现快照（供专家快速建立上下文）

### 4.1 数据流

`WebAudio Capture -> Renderer Push Queue -> Worker(VAD -> ASR -> Speaker) -> Cue -> Renderer Display`

### 4.2 两阶段 speaker 现状（骨架）

```ts
type SpeakerProfile = { id: number; embedding: Float32Array }

type SpeakerRuntime = {
  profiles: SpeakerProfile[]
  currentSpeakerId: number | null
  lastSwitchSec: number

  // Stage-1: 候选累积
  pendingSwitchSpeakerId: number | null
  pendingSwitchCount: number
  pendingSwitchDurationSec: number
  pendingSwitchScoreSum: number
  pendingSwitchIsNew: boolean
  pendingSwitchEmbedding: Float32Array | null
}

function identifySpeakerV2(
  embedding: Float32Array,
  rt: SpeakerRuntime,
  similarityThreshold: number,
  segmentDurationSec: number,
  segmentEndSec: number,
): number {
  // 1) 计算与已有 profile 的相似度
  const { bestId, bestScore, currentScore } = scoreAgainstProfiles(embedding, rt)

  // 2) 若当前 speaker 仍有足够置信，则继续保持（抗抖动）
  if (shouldKeepCurrent(currentScore, bestScore, similarityThreshold)) {
    clearPending(rt)
    updateProfileIfNeeded(rt.currentSpeakerId, embedding, currentScore)
    return rt.currentSpeakerId ?? 0
  }

  // 3) 生成候选：已有 speaker 或新 speaker
  const candidate = buildCandidate(bestId, bestScore, currentScore, rt, similarityThreshold, segmentDurationSec)

  // 4) 两阶段：先累计证据，再确认提交
  appendPendingEvidence(rt, candidate, embedding, segmentDurationSec)
  if (canConfirmSwitch(rt, candidate, similarityThreshold, currentScore, segmentEndSec)) {
    const nextSpeakerId = commitCandidate(rt, candidate, embedding, segmentEndSec)
    return nextSpeakerId
  }

  // 5) 未确认前保持当前 speaker（这是当前延迟来源之一，需专家评估）
  return rt.currentSpeakerId ?? 0
}
```

### 4.3 offset 现状（历史方案骨架，已回滚）

```ts
type OffsetConfig = {
  subtitleAsrTimelineOffsetSec: number // [-2, +2]
}

function applyAsrTimelineOffset(baseTimelineSec: number, offsetSec: number): number {
  // 逻辑本身很轻量；问题可能不在此函数本身
  return Math.max(0, baseTimelineSec + offsetSec)
}

function pushChunkWithOffset(chunk: AudioChunk, offsetSec: number) {
  // 每个 chunk 都会映射到 ASR timeline
  // 若 offset 变化触发会话重建/队列抖动，可能出现额外 CPU 与延迟
  const asrStart = applyAsrTimelineOffset(chunk.startSec, offsetSec)
  const asrEnd = applyAsrTimelineOffset(chunk.endSec, offsetSec)
  return pushSubtitleAudio({
    chunk_start_sec: asrStart,
    chunk_end_sec: asrEnd,
    chunk_base64: encodeFloat32ToBase64(chunk.samples),
  })
}
```

---

## 5. 已知现象与待验证假设

### 5.1 offset 高 CPU：待验证假设（Hypotheses）

> 以下为“可能”，必须由日志与实验确认。

1. offset 调整触发了会话 reset/restart，导致 VAD/ASR 状态重建频繁。  
2. reset 后 queue 回压策略触发额外重试/压缩，带来计算与 IPC 放大。  
3. timeline 对齐窗口变化导致 active cue 过滤与重绘频率上升。  
4. Worker/Renderer 两侧同时做时间修正，产生重复工作但收益抵消。  
5. offset 只平移时间轴，无法解决主要延迟来源（VAD 端点等待 + 证据窗确认）。

### 5.2 两阶段不锁定 + 2s 延迟：待验证假设

1. 证据窗阈值偏保守（count/duration）导致提交晚。  
2. current profile 持续更新把边界样本“吸回”，降低切换判据对比度。  
3. 候选分数与当前分数差值门限固定，未按段长/语速自适应。  
4. VAD 分段偏长使 speaker 决策采样频率下降，天然增加感知延迟。

---

## 6. 评审数据包清单（提交前必须齐全）

### 6.1 输入样本

- `testdata/speaker-scan/voice_03m13s_04m13s.wav`（必选）
- 双人快切样本（建议新增，`pending`）
- 背景噪声样本（建议新增，`pending`）

### 6.2 日志字段（JSONL 建议）

```yaml
timestamp_ms:
session_id:
session_epoch:
chunk_seq:
playback_time_sec:
asr_timeline_sec:
offset_sec:

queue_len:
push_inflight:
chunk_duration_sec:

vad_segment_start_sec:
vad_segment_end_sec:
vad_segment_duration_sec:

asr_decode_ms:
asr_text_len:

speaker_current_id:
speaker_candidate_id:
speaker_candidate_is_new:
speaker_similarity_best:
speaker_similarity_current:
pending_count:
pending_duration_sec:
pending_score_avg:
speaker_changed:

cue_start_sec:
cue_end_sec:
cue_render_time_ms:
```

### 6.3 性能采样（至少 60s）

- Renderer CPU（均值/P95）
- Worker CPU（均值/P95）
- 内存峰值
- 事件计数：reset 次数、session 重建次数、chunk reject 次数

---

## 7. 最小实验矩阵（专家必须跑完）

| Case | 目标 | 配置 | 观测重点 | 状态 |
|---|---|---|---|---|
| O-1 | offset 基线 | offset=0 | CPU/延迟基线 | pending |
| O-2 | offset 稳态 | offset=+0.5 固定 | 仅平移时是否增 CPU | pending |
| O-3 | offset 动态 | 每 10s 调整一次 | 是否触发重建与抖动 | pending |
| O-4 | offset 归因 | renderer-only vs worker-only | 开销来自哪一侧 | pending |
| S-1 | 两阶段基线 | 当前实现 | 锁定率/延迟 | pending |
| S-2 | 窗口缩短 | 降低 pending count/duration | 延迟是否下降且不抖动 | pending |
| S-3 | 自适应门限 | 按段长/语速动态门限 | 锁定率是否提升 | pending |
| S-4 | Profile 更新节流 | 非稳定段不更新 profile | 同号混人是否下降 | pending |

---

## 8. 期望专家输出格式（必须遵循）

```md
## A. Root Cause（按证据强度排序）
1. offset 高 CPU 根因：
2. offset 无效根因：
3. 两阶段不锁定根因：

## B. 方案设计
### B1. 低改动方案（参数/状态机）
- 改动点：
- 伪代码：
- 预期：
- 风险：

### B2. 中改动方案（新增判据）
- 改动点：
- 伪代码：
- 预期：
- 风险：

## C. 参数建议（给默认值）
- VAD:
- Speaker threshold:
- pending window:
- profile update:

## D. 验证结果
- 指标表：
- 对比图：
- Go/No-Go:
```

---

## 9. 代码定位（供专家直接入手）

- Worker speaker 决策主逻辑：`electron/subtitles/asrWorker.ts`  
- Renderer 推流与会话控制：`src/features/subtitles/useLiveSubtitles.ts`  
- 评审计划总文档：`docs/offline-auto-subtitle-advanced-implementation-plan.md`

---

## 10. 回填区（提交评审前）

### 10.1 当前参数快照

```yaml
advanced:
  vad_preset: pending
  vad_threshold: pending
  vad_min_silence_sec: pending
  vad_min_speech_sec: pending
  vad_max_speech_sec: pending

speaker:
  similarity_threshold: pending
  max_speakers: 2
  pending_count_confirm: pending
  pending_duration_confirm_sec: pending
  profile_update_alpha: pending
```

### 10.2 附件列表

- [ ] 音频样本
- [ ] JSONL 日志
- [ ] CPU/内存统计
- [ ] 人工标注（speaker 切换点）
- [ ] 本模板回填完整版本
