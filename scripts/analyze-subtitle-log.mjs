import fs from 'node:fs'

const logPath = process.argv[2]
if (!logPath) {
  console.error('Usage: node scripts/analyze-subtitle-log.mjs <log-path>')
  process.exit(1)
}

const buffer = fs.readFileSync(logPath)
let content = ''
if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
  content = buffer.toString('utf16le')
} else {
  content = buffer.toString('utf8')
}
if (content.charCodeAt(0) === 0xfeff) {
  content = content.slice(1)
}

const lines = content.split(/\r?\n/)
const metrics = []
const worker = []

for (const line of lines) {
  const workerIndex = line.indexOf('[subtitle][worker] ')
  if (workerIndex >= 0) {
    const jsonText = line.slice(workerIndex + '[subtitle][worker] '.length)
    try {
      worker.push(JSON.parse(jsonText))
    } catch {
      // ignore parse failure
    }
  }

  const metricsIndex = line.indexOf('[subtitle][metrics] ')
  if (metricsIndex >= 0) {
    let jsonText = line.slice(metricsIndex + '[subtitle][metrics] '.length).trim()
    if (jsonText.endsWith("',")) {
      jsonText = jsonText.slice(0, -2)
    } else if (jsonText.endsWith("'")) {
      jsonText = jsonText.slice(0, -1)
    }
    try {
      metrics.push(JSON.parse(jsonText))
    } catch {
      // ignore parse failure
    }
  }
}

const countEvent = (items, event) => items.filter((item) => item.event === event).length
const numberSeries = (items, key) => items.map((item) => item[key]).filter((value) => typeof value === 'number' && Number.isFinite(value))
const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)
const percentile95 = (values) => {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
}

const rendererPush = metrics.filter((item) => item.event === 'renderer_push_result')
const rendererEpochs = metrics.filter((item) => item.event === 'renderer_epoch_begin')
const workerPush = worker.filter((item) => item.event === 'push_audio_received')
const workerSpeaker = worker.filter((item) => item.event === 'speaker_decision')

const workerEventCounts = {
  chunk_epoch_reset: 0,
  chunk_non_monotonic: 0,
  chunk_seq_gap: 0,
}

for (const item of workerPush) {
  const codes = Array.isArray(item.event_codes) ? item.event_codes : []
  for (const code of codes) {
    if (code in workerEventCounts) {
      workerEventCounts[code] += 1
    }
  }
}

const rendererResponseEventCounts = {}
for (const item of rendererPush) {
  const codes = Array.isArray(item.response_events) ? item.response_events : []
  for (const code of codes) {
    rendererResponseEventCounts[code] = (rendererResponseEventCounts[code] ?? 0) + 1
  }
}

const rendererByOffset = {}
for (const item of rendererPush) {
  const key = typeof item.offset_sec === 'number' && Number.isFinite(item.offset_sec)
    ? item.offset_sec.toFixed(3)
    : 'unknown'
  if (!rendererByOffset[key]) {
    rendererByOffset[key] = {
      count: 0,
      rttValues: [],
      queueBeforeValues: [],
      queueAfterValues: [],
      responseEventCounts: {},
    }
  }
  const bucket = rendererByOffset[key]
  bucket.count += 1
  if (typeof item.chunk_rtt_ms === 'number' && Number.isFinite(item.chunk_rtt_ms)) {
    bucket.rttValues.push(item.chunk_rtt_ms)
  }
  if (typeof item.queue_len_before_push === 'number' && Number.isFinite(item.queue_len_before_push)) {
    bucket.queueBeforeValues.push(item.queue_len_before_push)
  }
  if (typeof item.queue_len_after_push === 'number' && Number.isFinite(item.queue_len_after_push)) {
    bucket.queueAfterValues.push(item.queue_len_after_push)
  }
  const codes = Array.isArray(item.response_events) ? item.response_events : []
  for (const code of codes) {
    bucket.responseEventCounts[code] = (bucket.responseEventCounts[code] ?? 0) + 1
  }
}

const rendererOffsetStats = {}
for (const [key, bucket] of Object.entries(rendererByOffset)) {
  rendererOffsetStats[key] = {
    count: bucket.count,
    chunk_rtt_ms_avg: Number(average(bucket.rttValues).toFixed(2)),
    chunk_rtt_ms_p95: Number(percentile95(bucket.rttValues).toFixed(2)),
    queue_len_before_avg: Number(average(bucket.queueBeforeValues).toFixed(2)),
    queue_len_after_avg: Number(average(bucket.queueAfterValues).toFixed(2)),
    response_event_counts: bucket.responseEventCounts,
  }
}

const offsetValueCounts = {}
for (const item of metrics) {
  if (typeof item.offset_sec === 'number' && Number.isFinite(item.offset_sec)) {
    const key = item.offset_sec.toFixed(3)
    offsetValueCounts[key] = (offsetValueCounts[key] ?? 0) + 1
  }
}

const epochReasonCounts = {}
for (const item of rendererEpochs) {
  const reason = typeof item.reason === 'string' ? item.reason : 'unknown'
  epochReasonCounts[reason] = (epochReasonCounts[reason] ?? 0) + 1
}

const workerChunkDurations = numberSeries(workerPush, 'chunk_duration_sec')

const result = {
  file: logPath,
  bytes: buffer.length,
  lines: lines.length,
  metrics_events: metrics.length,
  worker_events: worker.length,
  renderer: {
    capture_chunks: countEvent(metrics, 'renderer_capture_chunk'),
    queue_compactions: countEvent(metrics, 'renderer_queue_compaction'),
    epoch_begin: countEvent(metrics, 'renderer_epoch_begin'),
    epoch_reason_counts: epochReasonCounts,
    push_results: rendererPush.length,
    push_errors: countEvent(metrics, 'renderer_push_error'),
    drop_epoch_mismatch: countEvent(metrics, 'renderer_push_drop_epoch_mismatch'),
    drop_out_of_order: countEvent(metrics, 'renderer_push_drop_out_of_order'),
    chunk_rtt_ms_avg: Number(average(numberSeries(rendererPush, 'chunk_rtt_ms')).toFixed(2)),
    chunk_rtt_ms_p95: Number(percentile95(numberSeries(rendererPush, 'chunk_rtt_ms')).toFixed(2)),
    queue_len_before_avg: Number(average(numberSeries(rendererPush, 'queue_len_before_push')).toFixed(2)),
    queue_len_after_avg: Number(average(numberSeries(rendererPush, 'queue_len_after_push')).toFixed(2)),
    push_abort_count_max: Math.max(0, ...numberSeries(metrics, 'push_abort_count')),
    offset_value_counts: offsetValueCounts,
    response_event_counts: rendererResponseEventCounts,
    offset_stats: rendererOffsetStats,
  },
  worker: {
    push_audio_received: workerPush.length,
    speaker_decision: workerSpeaker.length,
    chunk_epoch_reset: workerEventCounts.chunk_epoch_reset,
    chunk_non_monotonic: workerEventCounts.chunk_non_monotonic,
    chunk_seq_gap: workerEventCounts.chunk_seq_gap,
    chunk_duration_sec_avg: Number(average(workerChunkDurations).toFixed(3)),
    chunk_duration_sec_p95: Number(percentile95(workerChunkDurations).toFixed(3)),
    pending_count_avg: Number(average(numberSeries(workerSpeaker, 'pending_count')).toFixed(2)),
    pending_duration_sec_avg: Number(average(numberSeries(workerSpeaker, 'pending_duration_sec')).toFixed(3)),
    pending_score_avg: Number(average(numberSeries(workerSpeaker, 'pending_score_avg')).toFixed(4)),
    speaker_changed_count: workerSpeaker.filter((item) => item.speaker_changed === true).length,
    asr_decode_ms_avg: Number(average(numberSeries(workerSpeaker, 'asr_decode_ms')).toFixed(2)),
    asr_decode_ms_p95: Number(percentile95(numberSeries(workerSpeaker, 'asr_decode_ms')).toFixed(2)),
  },
}

console.log(JSON.stringify(result, null, 2))
