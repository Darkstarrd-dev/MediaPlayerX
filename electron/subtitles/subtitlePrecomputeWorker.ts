import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { parentPort } from 'node:worker_threads'

import type {
  PrecomputeSubtitleCuesRequestDto,
  SubtitleCueDto,
  SubtitlePreviewCueDto,
  SubtitleSessionEventDto,
  SubtitleSessionProviderDto,
} from '../../src/contracts/backend'
import {
  DEFAULT_SUBTITLE_SHAPING_OPTIONS,
  SubtitleCueShaper,
} from '../../src/features/subtitles/pipeline/shaper'
import type { SubtitlePreviewCue, SubtitleShapedCue } from '../../src/features/subtitles/pipeline/types'

type PrecomputeWorkerCommand = 'precompute'

interface PrecomputeWorkerRequest {
  kind: 'request'
  request_id: string
  command: PrecomputeWorkerCommand
  payload: unknown
}

interface PrecomputeRequestPayload {
  request: PrecomputeSubtitleCuesRequestDto
  engine_module_root: string
  available_providers: Array<'cpu' | 'directml'>
  ffmpeg_bin: string
}

interface RuntimePrecomputeState {
  sessionId: string
  provider: SubtitleSessionProviderDto
  recognizer: {
    decode: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => void
    getResult: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => {
      lang?: string
      text?: string
    }
    createStream: () => { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
  }
  stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
  cueSeed: number
  requestedLanguage: string
  detectedLanguage: string | null
  committedText: string
  shaper: SubtitleCueShaper
}

function nowMs(): number {
  return Date.now()
}

function createEvent(
  code: string,
  level: SubtitleSessionEventDto['level'],
  message: string,
): SubtitleSessionEventDto {
  return {
    code,
    level,
    message,
    at_ms: nowMs(),
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function resolveModelRootDir(modelDir: string, modelId: string): Promise<string> {
  const normalizedDir = path.resolve(modelDir)
  const candidates = [path.join(normalizedDir, modelId), normalizedDir]

  const isValidModelDir = async (candidate: string): Promise<boolean> => {
    if (!(await pathExists(candidate))) {
      return false
    }

    const tokensPath = path.join(candidate, 'tokens.txt')
    if (!(await pathExists(tokensPath))) {
      return false
    }

    let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
    try {
      entries = await fs.readdir(candidate, { withFileTypes: true })
    } catch {
      return false
    }

    return entries.some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.onnx'))
  }

  for (const candidate of candidates) {
    if (await isValidModelDir(candidate)) {
      return candidate
    }
  }

  throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`)
}

async function resolveModelOnnxPath(modelRootDir: string): Promise<string> {
  let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
  try {
    entries = await fs.readdir(modelRootDir, { withFileTypes: true })
  } catch {
    throw new Error(`subtitle_model_files_missing:${modelRootDir}`)
  }

  const modelFileNames = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.onnx'))
    .map((entry) => entry.name)

  if (modelFileNames.length === 0) {
    throw new Error(`subtitle_model_files_missing:${modelRootDir}`)
  }

  const preferred =
    modelFileNames.find((name) => name.toLowerCase() === 'model.int8.onnx')
    ?? modelFileNames.find((name) => name.toLowerCase() === 'model.onnx')
    ?? modelFileNames[0]

  return path.join(modelRootDir, preferred)
}

function chooseProvider(payload: PrecomputeRequestPayload): {
  provider: SubtitleSessionProviderDto
  events: SubtitleSessionEventDto[]
} {
  const available = new Set(payload.available_providers)
  const events: SubtitleSessionEventDto[] = []

  if (!available.has('cpu')) {
    throw new Error('subtitle_provider_unavailable:cpu')
  }

  if (payload.request.provider_preference === 'cpu') {
    return {
      provider: 'cpu',
      events,
    }
  }

  if (available.has('directml')) {
    return {
      provider: 'directml',
      events,
    }
  }

  if (!payload.request.fallback_to_cpu) {
    throw new Error('subtitle_provider_unavailable:directml')
  }

  events.push(
    createEvent(
      'provider_fallback',
      'warning',
      `directml unavailable, fallback to cpu (${payload.request.provider_preference})`,
    ),
  )

  return {
    provider: 'cpu',
    events,
  }
}

function loadSherpaModule(moduleRoot: string): {
  OfflineRecognizer: new (config: unknown) => {
    createStream: () => { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
    decode: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => void
    getResult: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => {
      lang?: string
      text?: string
    }
  }
} {
  const packageJsonPath = path.join(moduleRoot, 'package.json')
  if (!existsSync(packageJsonPath)) {
    throw new Error(`subtitle_engine_package_not_found:${packageJsonPath}`)
  }

  const moduleRequire = createRequire(packageJsonPath)
  return moduleRequire('sherpa-onnx-node') as {
    OfflineRecognizer: new (config: unknown) => {
      createStream: () => { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
      decode: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => void
      getResult: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => {
        lang?: string
        text?: string
      }
    }
  }
}

function normalizeRecognizedText(value: string | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) {
    return ''
  }
  return raw.replace(/<\|[^|]+\|>/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeLangTag(value: string | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) {
    return null
  }

  const tagged = /^<\|([^|]+)\|>$/.exec(raw)
  if (tagged?.[1]) {
    return tagged[1].toLowerCase()
  }

  return raw.toLowerCase()
}

function normalizeRequestedLanguage(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'zh' || normalized === 'en' || normalized === 'ja' || normalized === 'ko' || normalized === 'yue') {
    return normalized
  }
  return 'auto'
}

function computeTextDelta(previousText: string, currentText: string): string {
  if (!currentText) {
    return ''
  }
  if (!previousText) {
    return currentText
  }
  if (currentText === previousText) {
    return ''
  }
  if (currentText.startsWith(previousText)) {
    return currentText.slice(previousText.length).trim()
  }

  const previousTail = previousText.slice(Math.max(0, previousText.length - 16))
  const overlapIndex = currentText.indexOf(previousTail)
  if (overlapIndex >= 0) {
    return currentText.slice(overlapIndex + previousTail.length).trim()
  }

  return currentText
}

function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0
  }

  let squareSum = 0
  for (let i = 0; i < samples.length; i += 1) {
    squareSum += samples[i] * samples[i]
  }

  return Math.sqrt(squareSum / samples.length)
}

function resolveCueLanguage(state: RuntimePrecomputeState): string | null {
  if (state.requestedLanguage !== 'auto') {
    return state.requestedLanguage
  }
  return state.detectedLanguage
}

function makeCueId(sessionId: string, cueSeed: number): string {
  return `${sessionId}:${cueSeed}`
}

function toSubtitleCueDto(state: RuntimePrecomputeState, cue: SubtitleShapedCue): SubtitleCueDto {
  state.cueSeed += 1
  return {
    id: makeCueId(state.sessionId, state.cueSeed),
    start_sec: cue.startSec,
    end_sec: cue.endSec,
    text: cue.text,
    lang: resolveCueLanguage(state),
  }
}

function toSubtitlePreviewCueDto(state: RuntimePrecomputeState, cue: SubtitlePreviewCue | null): SubtitlePreviewCueDto | null {
  if (!cue) {
    return null
  }

  return {
    start_sec: cue.startSec,
    end_sec: cue.endSec,
    text: cue.text,
    lang: resolveCueLanguage(state),
  }
}

function decodeAndShapeSubtitle(
  state: RuntimePrecomputeState,
  timelineStartSec: number,
  timelineEndSec: number,
): { cues: SubtitleCueDto[]; preview: SubtitlePreviewCueDto | null } {
  state.recognizer.decode(state.stream)
  const result = state.recognizer.getResult(state.stream)
  if (state.requestedLanguage === 'auto') {
    state.detectedLanguage = normalizeLangTag(result.lang)
  }

  const currentText = normalizeRecognizedText(result.text)
  if (!currentText) {
    return {
      cues: [],
      preview: toSubtitlePreviewCueDto(state, state.shaper.getPreviewCue()),
    }
  }

  const delta = computeTextDelta(state.committedText, currentText)
  state.committedText = currentText
  if (!delta) {
    return {
      cues: [],
      preview: toSubtitlePreviewCueDto(state, state.shaper.getPreviewCue()),
    }
  }

  const shaped = state.shaper.ingestDelta({
    text: delta,
    startSec: timelineStartSec,
    endSec: timelineEndSec,
  })

  return {
    cues: shaped.cues.map((cue) => toSubtitleCueDto(state, cue)),
    preview: toSubtitlePreviewCueDto(state, shaped.preview),
  }
}

function flushBySilence(state: RuntimePrecomputeState, nowSec: number): { cues: SubtitleCueDto[]; preview: SubtitlePreviewCueDto | null } {
  const shaped = state.shaper.flushBySilence(nowSec)
  return {
    cues: shaped.cues.map((cue) => toSubtitleCueDto(state, cue)),
    preview: toSubtitlePreviewCueDto(state, shaped.preview),
  }
}

async function decodeVideoAudioToFloat32(
  ffmpegBin: string,
  videoPath: string,
  sampleRateHz: number,
): Promise<Float32Array> {
  const resolvedVideoPath = path.resolve(videoPath)
  await fs.access(resolvedVideoPath)

  const args = [
    '-v',
    'error',
    '-i',
    resolvedVideoPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(sampleRateHz),
    '-f',
    's16le',
    'pipe:1',
  ]

  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })
    child.on('error', (error) => {
      reject(error)
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      const stderrText = Buffer.concat(stderrChunks).toString('utf8').trim()
      reject(new Error(stderrText || `subtitle_ffmpeg_decode_failed:${code}`))
    })
  })

  const pcm = Buffer.concat(stdoutChunks)
  const sampleCount = Math.floor(pcm.byteLength / 2)
  const out = new Float32Array(sampleCount)
  for (let i = 0; i < sampleCount; i += 1) {
    out[i] = pcm.readInt16LE(i * 2) / 32768
  }
  return out
}

async function handlePrecompute(rawPayload: unknown): Promise<unknown> {
  const payload = rawPayload as PrecomputeRequestPayload
  const providerDecision = chooseProvider(payload)
  const sherpa = loadSherpaModule(path.resolve(payload.engine_module_root))

  const modelRootDir = await resolveModelRootDir(payload.request.model_dir, payload.request.model_id)
  const modelPath = await resolveModelOnnxPath(modelRootDir)
  const tokensPath = path.join(modelRootDir, 'tokens.txt')
  const normalizedLanguage = normalizeRequestedLanguage(payload.request.language)
  const useInverseTextNormalization = normalizedLanguage === 'zh' || normalizedLanguage === 'yue' ? 1 : 0

  const recognizer = new sherpa.OfflineRecognizer({
    featConfig: {
      sampleRate: 16_000,
      featureDim: 80,
    },
    modelConfig: {
      senseVoice: {
        model: modelPath,
        language: normalizedLanguage,
        useInverseTextNormalization,
      },
      tokens: tokensPath,
      provider: providerDecision.provider,
      numThreads: 2,
    },
  })

  const sessionId = `subtitle-precompute-${nowMs()}-${Math.floor(Math.random() * 100_000)}`
  const state: RuntimePrecomputeState = {
    sessionId,
    provider: providerDecision.provider,
    recognizer,
    stream: recognizer.createStream(),
    cueSeed: 0,
    requestedLanguage: normalizedLanguage,
    detectedLanguage: null,
    committedText: '',
    shaper: new SubtitleCueShaper(DEFAULT_SUBTITLE_SHAPING_OPTIONS),
  }

  const audio = await decodeVideoAudioToFloat32(payload.ffmpeg_bin, payload.request.video_path, 16_000)
  if (audio.length === 0) {
    return {
      cues: [],
      events: providerDecision.events,
    }
  }

  const cues: SubtitleCueDto[] = []
  const chunkSize = Math.floor(16_000 * 0.8)
  const decodeWindowSamples = Math.floor(16_000 * 0.6)
  let pendingSamplesSinceDecode = 0

  for (let offset = 0; offset < audio.length; offset += chunkSize) {
    const chunk = audio.subarray(offset, Math.min(audio.length, offset + chunkSize))
    const chunkStartSec = offset / 16_000
    const chunkEndSec = (offset + chunk.length) / 16_000
    const rms = calculateRms(chunk)

    state.stream.acceptWaveform({
      samples: chunk,
      sampleRate: 16_000,
    })
    pendingSamplesSinceDecode += chunk.length

    if (pendingSamplesSinceDecode >= decodeWindowSamples && rms >= 0.002) {
      pendingSamplesSinceDecode = 0
      const decoded = decodeAndShapeSubtitle(state, chunkStartSec, chunkEndSec)
      if (decoded.cues.length > 0) {
        cues.push(...decoded.cues)
      }
      continue
    }

    if (rms < 0.0015) {
      const flushed = flushBySilence(state, chunkEndSec)
      if (flushed.cues.length > 0) {
        cues.push(...flushed.cues)
      }
    }
  }

  const decoded = decodeAndShapeSubtitle(
    state,
    Math.max(0, audio.length / 16_000 - 2),
    audio.length / 16_000,
  )
  if (decoded.cues.length > 0) {
    cues.push(...decoded.cues)
  }

  const flushed = state.shaper.flushAll().map((cue) => toSubtitleCueDto(state, cue))
  if (flushed.length > 0) {
    cues.push(...flushed)
  }

  return {
    cues,
    events: providerDecision.events,
  }
}

function ensureParentPort(): asserts parentPort is NonNullable<typeof parentPort> {
  if (!parentPort) {
    throw new Error('subtitle_precompute_worker_missing_parent_port')
  }
}

async function handleRequest(command: PrecomputeWorkerCommand, payload: unknown): Promise<unknown> {
  switch (command) {
    case 'precompute':
      return await handlePrecompute(payload)
    default:
      throw new Error(`subtitle_precompute_worker_unknown_command:${command satisfies never}`)
  }
}

ensureParentPort()

parentPort.on('message', (message: unknown) => {
  if (!message || typeof message !== 'object') {
    return
  }

  const request = message as Partial<PrecomputeWorkerRequest>
  if (request.kind !== 'request' || typeof request.request_id !== 'string' || typeof request.command !== 'string') {
    return
  }

  void handleRequest(request.command as PrecomputeWorkerCommand, request.payload)
    .then((payload) => {
      parentPort.postMessage({
        kind: 'response',
        request_id: request.request_id,
        ok: true,
        payload,
      })
    })
    .catch((error: unknown) => {
      const messageText = error instanceof Error && error.message ? error.message : String(error)
      parentPort.postMessage({
        kind: 'response',
        request_id: request.request_id,
        ok: false,
        error: messageText,
      })
    })
})
