import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

function parseArgs(argv) {
  const args = new Map()
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }
    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      args.set(key, 'true')
      continue
    }
    args.set(key, value)
    index += 1
  }
  return args
}

function requiredArg(args, key) {
  const value = args.get(key)
  if (!value || value === 'true') {
    throw new Error(`missing_required_arg:${key}`)
  }
  return value
}

function toBase64Float32(samples) {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
  return Buffer.from(bytes).toString('base64')
}

function decodeFloat32FromBuffer(buffer) {
  const sampleCount = Math.floor(buffer.length / 4)
  const output = new Float32Array(sampleCount)
  for (let index = 0; index < sampleCount; index += 1) {
    output[index] = buffer.readFloatLE(index * 4)
  }
  return output
}

function extractMonoFloat32({ ffmpegPath, inputPath }) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, [
      '-v',
      'error',
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      'f32le',
      'pipe:1',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    const stdoutChunks = []
    const stderrChunks = []

    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk))
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk))
    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg_failed:${code}:${Buffer.concat(stderrChunks).toString('utf8').trim()}`))
        return
      }
      resolve(decodeFloat32FromBuffer(Buffer.concat(stdoutChunks)))
    })
  })
}

class WorkerClient {
  constructor(workerPath) {
    this.worker = new Worker(workerPath)
    this.seed = 0
    this.pending = new Map()

    this.worker.on('message', (message) => {
      if (!message || typeof message !== 'object' || message.kind !== 'response') {
        return
      }
      const slot = this.pending.get(message.request_id)
      if (!slot) {
        return
      }
      this.pending.delete(message.request_id)
      clearTimeout(slot.timeout)
      if (!message.ok) {
        slot.reject(new Error(message.error || 'worker_request_failed'))
        return
      }
      slot.resolve(message.payload)
    })
  }

  async request(command, payload, timeoutMs = 30000) {
    const requestId = `scan-${Date.now()}-${this.seed++}`
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`worker_timeout:${command}`))
      }, timeoutMs)

      this.pending.set(requestId, { resolve, reject, timeout })
      this.worker.postMessage({
        kind: 'request',
        request_id: requestId,
        command,
        payload,
      })
    })
  }

  async terminate() {
    for (const slot of this.pending.values()) {
      clearTimeout(slot.timeout)
      slot.reject(new Error('worker_terminated'))
    }
    this.pending.clear()
    await this.worker.terminate()
  }
}

function median(values) {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((left, right) => left - right)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function computeMetrics(cues) {
  const withSpeaker = cues.filter((cue) => typeof cue.speaker === 'number')
  const speakerIds = Array.from(new Set(withSpeaker.map((cue) => cue.speaker))).sort((a, b) => a - b)
  const speakerChanges = withSpeaker.filter((cue) => cue.speaker_changed).length
  const similarityValues = withSpeaker
    .map((cue) => cue.speaker_similarity)
    .filter((value) => typeof value === 'number' && Number.isFinite(value))

  let rapidFlipCount = 0
  for (let index = 2; index < withSpeaker.length; index += 1) {
    const a = withSpeaker[index - 2]?.speaker
    const b = withSpeaker[index - 1]?.speaker
    const c = withSpeaker[index]?.speaker
    if (a === c && a !== b) {
      rapidFlipCount += 1
    }
  }

  return {
    cueCount: cues.length,
    withSpeakerCount: withSpeaker.length,
    uniqueSpeakers: speakerIds.length,
    speakerIds,
    speakerChanges,
    rapidFlipCount,
    medianSimilarity: median(similarityValues),
  }
}

function scoreCandidate(metrics) {
  let score = 0

  if (metrics.uniqueSpeakers === 2) {
    score += 12
  } else if (metrics.uniqueSpeakers === 3) {
    score += 9
  } else if (metrics.uniqueSpeakers === 1) {
    score -= 5
  } else {
    score -= 2 * Math.max(0, metrics.uniqueSpeakers - 3)
  }

  score -= metrics.rapidFlipCount * 2
  score -= Math.max(0, metrics.speakerChanges - Math.ceil(metrics.withSpeakerCount * 0.55))
  score += Math.max(0, Math.min(6, Math.round((metrics.medianSimilarity - 0.5) * 20)))

  return score
}

async function runOneThreshold({
  workerPath,
  engineRoot,
  modelDir,
  modelId,
  audioSamples,
  threshold,
  chunkDurationSec,
}) {
  const client = new WorkerClient(workerPath)
  const collectedCues = []
  const collectedEvents = []

  try {
    const initResponse = await client.request('init', {
      model_dir: modelDir,
      model_id: modelId,
      provider_preference: 'cpu',
      language: 'auto',
      fallback_to_cpu: true,
      render_mode: 'advanced',
      advanced_options: {
        vad: {
          preset: 'balanced',
          threshold: 0.45,
          min_silence_sec: 0.3,
          min_speech_sec: 0.25,
          max_speech_sec: 15,
        },
        speaker: {
          similarity_threshold: threshold,
        },
      },
      engine_module_root: engineRoot,
      available_providers: ['cpu'],
    }, 45000)

    if (Array.isArray(initResponse?.events) && initResponse.events.length > 0) {
      collectedEvents.push(...initResponse.events)
    }

    const sampleRate = 16000
    const chunkSamples = Math.max(320, Math.floor(sampleRate * chunkDurationSec))

    for (let start = 0; start < audioSamples.length; start += chunkSamples) {
      const end = Math.min(audioSamples.length, start + chunkSamples)
      const chunk = audioSamples.subarray(start, end)
      const response = await client.request('push-audio', {
        chunk_base64: toBase64Float32(chunk),
        sample_rate_hz: sampleRate,
        channel_count: 1,
        chunk_start_sec: start / sampleRate,
        chunk_end_sec: end / sampleRate,
      })

      if (Array.isArray(response?.cues) && response.cues.length > 0) {
        collectedCues.push(...response.cues)
      }
      if (Array.isArray(response?.events) && response.events.length > 0) {
        collectedEvents.push(...response.events)
      }
    }

    const flushResponse = await client.request('flush', {}, 20000)
    if (Array.isArray(flushResponse?.cues) && flushResponse.cues.length > 0) {
      collectedCues.push(...flushResponse.cues)
    }
    if (Array.isArray(flushResponse?.events) && flushResponse.events.length > 0) {
      collectedEvents.push(...flushResponse.events)
    }

    await client.request('stop', { reason: 'scan-finished' }, 15000)
  } finally {
    await client.terminate()
  }

  const deduped = new Map()
  for (const cue of collectedCues) {
    if (cue?.id) {
      deduped.set(cue.id, cue)
    }
  }
  const cues = Array.from(deduped.values()).sort((left, right) => left.start_sec - right.start_sec)
  const metrics = computeMetrics(cues)
  const hintEvents = collectedEvents.filter((event) => event?.code === 'speaker_threshold_hint')

  return {
    threshold,
    metrics,
    hintCount: hintEvents.length,
    hints: hintEvents.slice(-3).map((event) => event.message),
    initEvents: collectedEvents
      .filter((event) => event?.code?.startsWith?.('advanced_'))
      .map((event) => `${event.code}:${event.message}`),
    sampleCues: cues.slice(0, 3),
    score: scoreCandidate(metrics),
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const inputPath = path.resolve(requiredArg(args, 'input'))
  const modelDir = path.resolve(requiredArg(args, 'model-dir'))
  const modelId = args.get('model-id')?.trim() || 'sensevoice-small-int8-2024-07-17'
  const workerPath = path.resolve(args.get('worker')?.trim() || 'dist-electron/asrWorker.cjs')
  const ffmpegPath = args.get('ffmpeg')?.trim() || 'ffmpeg'
  const chunkDurationSec = Math.max(0.05, Number.parseFloat(args.get('chunk-sec') || '0.2'))
  const thresholdRaw = args.get('thresholds')?.trim() || '0.55,0.58,0.60,0.62,0.64,0.66,0.68,0.70'
  const thresholds = thresholdRaw
    .split(',')
    .map((value) => Number.parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value) && value >= 0.45 && value <= 0.85)

  if (thresholds.length === 0) {
    throw new Error('no_valid_thresholds')
  }

  const require = createRequire(import.meta.url)
  const enginePackageJson = require.resolve('sherpa-onnx-node/package.json')
  const engineRoot = path.dirname(enginePackageJson)

  const audioSamples = await extractMonoFloat32({ ffmpegPath, inputPath })
  if (audioSamples.length === 0) {
    throw new Error('empty_audio')
  }

  const results = []
  for (const threshold of thresholds) {
    const result = await runOneThreshold({
      workerPath,
      engineRoot,
      modelDir,
      modelId,
      audioSamples,
      threshold,
      chunkDurationSec,
    })
    results.push(result)
  }

  results.sort((left, right) => right.score - left.score || left.threshold - right.threshold)
  const best = results[0]

  console.log(`input=${inputPath}`)
  console.log(`duration_sec=${(audioSamples.length / 16000).toFixed(2)}`)
  console.log(`model_dir=${modelDir}`)
  console.log('')
  console.log('threshold\tscore\tcues\twith_spk\tunique\tchanges\tflips\tmedian_sim\thints')
  for (const row of results) {
    console.log(
      `${row.threshold.toFixed(2)}\t${row.score}\t${row.metrics.cueCount}\t${row.metrics.withSpeakerCount}\t${row.metrics.uniqueSpeakers}\t${row.metrics.speakerChanges}\t${row.metrics.rapidFlipCount}\t${row.metrics.medianSimilarity.toFixed(3)}\t${row.hintCount}`,
    )
  }

  console.log('')
  console.log(`recommended_threshold=${best.threshold.toFixed(2)}`)
  if (best.sampleCues.length > 0) {
    console.log(`sample_cue=${JSON.stringify(best.sampleCues[0])}`)
  }
  if (best.initEvents.length > 0) {
    console.log(`init_events=${best.initEvents.join(' | ')}`)
  }
  if (best.hints.length > 0) {
    console.log(`hint_preview=${best.hints[best.hints.length - 1]}`)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
