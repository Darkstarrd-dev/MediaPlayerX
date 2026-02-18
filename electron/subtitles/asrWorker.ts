import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { parentPort } from 'node:worker_threads'

import {
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioResponseSchema,
  resetSubtitleSessionResponseSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionResponseSchema,
  type PushSubtitleAudioRequestDto,
  type ResetSubtitleSessionRequestDto,
  type StartSubtitleSessionRequestDto,
  type StopSubtitleSessionRequestDto,
  type SubtitleCueDto,
  type SubtitleSessionEventDto,
  type SubtitleSessionProviderDto,
} from '../../src/contracts/backend'

type SubtitleWorkerCommand = 'init' | 'stop' | 'reset' | 'flush' | 'push-audio' | 'transcribe-all'

interface SubtitleWorkerRequest {
  kind: 'request'
  request_id: string
  command: SubtitleWorkerCommand
  payload: unknown
}

interface InitRequestPayload extends StartSubtitleSessionRequestDto {
  engine_module_root: string
  available_providers: Array<'cpu' | 'directml'>
}

interface TranscribeAllRequestPayload {
  chunk_base64: string
  sample_rate_hz: number
  channel_count: number
  duration_sec?: number
}

interface RuntimeSessionState {
  sessionId: string
  provider: SubtitleSessionProviderDto
  startedAtMs: number
  modelRootDir: string
  language: string
  fallbackApplied: boolean
  lastChunkEndSec: number
  recognizer: {
    decode: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => void
    getResult: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => {
      lang?: string
      text?: string
      tokens?: string[]
      timestamps?: number[]
      durations?: number[]
    }
    createStream: () => { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
  }
  stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
  sampleRateHz: number
  pendingSamplesSinceDecode: number
  committedText: string
  cueSeed: number
  requestedLanguage: string
  renderMode: 'simple' | 'advanced'
  lastSpeechEndSec: number // Track when speech last ended (for silence detection)
}

let runtimeSession: RuntimeSessionState | null = null

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

  let dirEntries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
  try {
    dirEntries = await fs.readdir(normalizedDir, { withFileTypes: true })
  } catch {
    throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`)
  }

  const fallbackSubdirs = dirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(normalizedDir, entry.name))
    .sort((left, right) => left.localeCompare(right))

  for (const candidate of fallbackSubdirs) {
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

  const preferred = modelFileNames.find((name) => name.toLowerCase() === 'model.int8.onnx')
    ?? modelFileNames.find((name) => name.toLowerCase() === 'model.onnx')
    ?? modelFileNames[0]

  return path.join(modelRootDir, preferred)
}

function chooseProvider(payload: InitRequestPayload): {
  provider: SubtitleSessionProviderDto
  fallbackApplied: boolean
  events: SubtitleSessionEventDto[]
} {
  const available = new Set(payload.available_providers)
  const events: SubtitleSessionEventDto[] = []

  if (!available.has('cpu')) {
    throw new Error('subtitle_provider_unavailable:cpu')
  }

  if (payload.provider_preference === 'cpu') {
    return {
      provider: 'cpu',
      fallbackApplied: false,
      events,
    }
  }

  if (available.has('directml')) {
    return {
      provider: 'directml',
      fallbackApplied: false,
      events,
    }
  }

  if (!payload.fallback_to_cpu) {
    throw new Error('subtitle_provider_unavailable:directml')
  }

  events.push(
    createEvent(
      'provider_fallback',
      'warning',
      `directml unavailable, fallback to cpu (${payload.provider_preference})`,
    ),
  )

  return {
    provider: 'cpu',
    fallbackApplied: true,
    events,
  }
}

function ensureParentPort(): asserts parentPort is NonNullable<typeof parentPort> {
  if (!parentPort) {
    throw new Error('subtitle_asr_worker_missing_parent_port')
  }
}

function ensureSession(): RuntimeSessionState {
  if (!runtimeSession) {
    throw new Error('subtitle_session_not_running')
  }
  return runtimeSession
}

function loadSherpaModule(moduleRoot: string): {
  OfflineRecognizer: new (config: unknown) => {
    createStream: () => { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
    decode: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => void
    getResult: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => {
      lang?: string
      text?: string
      tokens?: string[]
      timestamps?: number[]
      durations?: number[]
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
        tokens?: string[]
        timestamps?: number[]
        durations?: number[]
      }
    }
  }
}

function normalizeRecognizedText(value: string | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) {
    return ''
  }
  return raw
    .replace(/<\|[^|]+\|>/g, '')
    .replace(/<[a-z][^>]{0,80}>/gi, '')
    .replace(/<\/[a-z][^>]{0,80}>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
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

function decodeFloat32Buffer(chunkBuffer: Buffer): Float32Array {
  if (chunkBuffer.byteLength === 0) {
    return new Float32Array(0)
  }
  const view = new Float32Array(
    chunkBuffer.buffer,
    chunkBuffer.byteOffset,
    Math.floor(chunkBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT),
  )
  return new Float32Array(view)
}

function makeCueId(sessionId: string, cueSeed: number): string {
  return `${sessionId}:${cueSeed}`
}

function toFiniteNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  const numbers: number[] = []
  for (let i = 0; i < value.length; i += 1) {
    const candidate = Number(value[i])
    if (Number.isFinite(candidate)) {
      numbers.push(candidate)
    }
  }
  return numbers
}

function normalizeTokenText(value: string): string {
  return value
    .replace(/<\|[^|]+\|>/g, '')
    .replace(/<[a-z][^>]{0,80}>/gi, '')
    .replace(/<\/[a-z][^>]{0,80}>/gi, '')
    .replaceAll('▁', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function clampTime(value: number, durationSec: number): number {
  const maxSec = Math.max(0, durationSec)
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(Math.max(value, 0), maxSec + 1)
}

function buildOfflineResultCues(
  currentSession: RuntimeSessionState,
  result: { text?: string; lang?: string; tokens?: string[]; timestamps?: number[]; durations?: number[] },
  durationSec: number,
): SubtitleCueDto[] {
  const fallbackText = normalizeRecognizedText(result.text)
  const rawTokens = Array.isArray(result.tokens) ? result.tokens.filter((item): item is string => typeof item === 'string') : []
  const timestamps = toFiniteNumbers(result.timestamps)
  const durations = toFiniteNumbers(result.durations)
  if (rawTokens.length === 0 || timestamps.length === 0) {
    if (!fallbackText) {
      return []
    }
    currentSession.cueSeed += 1
    return [
      {
        id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
        start_sec: 0,
        end_sec: Math.max(0.8, durationSec),
        text: fallbackText,
        lang: currentSession.requestedLanguage === 'auto' ? normalizeLangTag(result.lang) : currentSession.requestedLanguage,
      },
    ]
  }

  const maxTimestamp = Math.max(...timestamps, 0)
  const maxDuration = Math.max(...durations, 0)
  const likelyMs = (durationSec > 0 && maxTimestamp > durationSec * 20) || (durationSec > 0 && maxDuration > durationSec * 20)
  const timeScale = likelyMs ? 0.001 : 1

  const cues: SubtitleCueDto[] = []
  const cueLanguage =
    currentSession.requestedLanguage === 'auto' ? normalizeLangTag(result.lang) : currentSession.requestedLanguage

  let cueStart = -1
  let cueEnd = 0
  let textBuffer = ''
  const pushCue = () => {
    const text = textBuffer.replace(/\s+/g, ' ').trim()
    if (!text) {
      cueStart = -1
      cueEnd = 0
      textBuffer = ''
      return
    }
    currentSession.cueSeed += 1
    cues.push({
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: clampTime(cueStart >= 0 ? cueStart : 0, durationSec),
      end_sec: clampTime(Math.max((cueStart >= 0 ? cueStart : 0) + 0.4, cueEnd), durationSec),
      text,
      lang: cueLanguage,
    })
    cueStart = -1
    cueEnd = 0
    textBuffer = ''
  }

  for (let i = 0; i < rawTokens.length; i += 1) {
    const tokenText = normalizeTokenText(rawTokens[i])
    if (!tokenText) {
      continue
    }

    const tokenStart = clampTime((timestamps[i] ?? timestamps[timestamps.length - 1] ?? 0) * timeScale, durationSec)
    const durationCandidate = Math.max(0, (durations[i] ?? 0) * timeScale)
    const nextStart = clampTime((timestamps[i + 1] ?? tokenStart) * timeScale, durationSec)
    const tokenEnd = clampTime(
      durationCandidate > 0 ? tokenStart + durationCandidate : Math.max(tokenStart + 0.25, nextStart),
      durationSec,
    )

    if (cueStart < 0) {
      cueStart = tokenStart
      cueEnd = tokenEnd
    } else {
      cueEnd = Math.max(cueEnd, tokenEnd)
    }

    if (textBuffer && /^[A-Za-z0-9]/.test(tokenText) && !textBuffer.endsWith(' ')) {
      textBuffer += ' '
    }
    textBuffer += tokenText

    const cueDuration = cueStart >= 0 ? cueEnd - cueStart : 0
    const hitPunctuation = /[。！？!?；;，,.]$/.test(tokenText)
    if (hitPunctuation || cueDuration >= 3.8 || textBuffer.length >= 42) {
      pushCue()
    }
  }

  pushCue()
  if (cues.length > 0) {
    return cues
  }

  if (!fallbackText) {
    return []
  }
  currentSession.cueSeed += 1
  return [
    {
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: 0,
      end_sec: Math.max(0.8, durationSec),
      text: fallbackText,
      lang: cueLanguage,
    },
  ]
}

function tryDecodeAndBuildCues(
  currentSession: RuntimeSessionState,
  timelineStartSec: number,
  timelineEndSec: number,
): SubtitleCueDto[] {
  currentSession.recognizer.decode(currentSession.stream)
  const result = currentSession.recognizer.getResult(currentSession.stream)
  const currentText = normalizeRecognizedText(result.text)
  
  if (!currentText) {
    return []
  }

  // Simple mode: 直接使用完整的 ASR 文本，不计算 delta
  if (currentSession.renderMode === 'simple') {
    // 检测静音间隔：如果距离上次语音结束超过 1.5 秒，清空已提交的文本
    const silenceDuration = timelineEndSec - currentSession.lastSpeechEndSec
    if (silenceDuration > 1.5 && currentSession.committedText) {
      console.log(`[ASR] Silence detected (${silenceDuration.toFixed(1)}s), clearing previous text`)
      currentSession.committedText = ''
    }
    
    // 如果文本与上次相同，不生成新的 cue
    if (currentText === currentSession.committedText) {
      return []
    }
    
    // 计算增量文本（用于调试输出）
    const delta = currentText.slice(currentSession.committedText.length)
    currentSession.committedText = currentText
    currentSession.lastSpeechEndSec = timelineEndSec
    
    // 根据文本长度估算显示时长
    const durationSec = Math.max(1.2, Math.min(5, currentText.length * 0.22))
    const cueStart = Math.max(0, Math.max(timelineStartSec, timelineEndSec - durationSec * 0.8))
    const cueEnd = Math.max(cueStart + 0.4, cueStart + durationSec)

    const cueLanguage =
      currentSession.requestedLanguage === 'auto'
        ? normalizeLangTag(result.lang)
        : currentSession.requestedLanguage

    currentSession.cueSeed += 1
    const cue = {
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: cueStart,
      end_sec: cueEnd,
      text: currentText,
      lang: cueLanguage,
    }
    
    // 只在有增量时输出调试信息
    console.log(`[ASR] +${delta.length} chars: "${delta}" [${cueStart.toFixed(1)}s - ${cueEnd.toFixed(1)}s]`)
    
    return [cue]
  }

  // Advanced mode: 使用增量 delta 计算
  const delta = computeTextDelta(currentSession.committedText, currentText)
  currentSession.committedText = currentText
  currentSession.lastSpeechEndSec = timelineEndSec
  
  if (!delta) {
    return []
  }

  const durationSec = Math.max(1.2, Math.min(5, delta.length * 0.22))
  const cueStart = Math.max(0, Math.max(timelineStartSec, timelineEndSec - durationSec * 0.8))
  const cueEnd = Math.max(cueStart + 0.4, cueStart + durationSec)

  const cueLanguage =
    currentSession.requestedLanguage === 'auto'
      ? normalizeLangTag(result.lang)
      : currentSession.requestedLanguage

  currentSession.cueSeed += 1
  const cue = {
    id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
    start_sec: cueStart,
    end_sec: cueEnd,
    text: delta,
    lang: cueLanguage,
  }
  
  return [cue]
}

async function handleInit(rawPayload: unknown): Promise<unknown> {
  const payload = rawPayload as InitRequestPayload
  const sherpa = loadSherpaModule(path.resolve(payload.engine_module_root))

  const modelRootDir = await resolveModelRootDir(payload.model_dir, payload.model_id)
  const providerDecision = chooseProvider(payload)

  const modelPath = await resolveModelOnnxPath(modelRootDir)
  const tokensPath = path.join(modelRootDir, 'tokens.txt')
  const normalizedLanguage = normalizeRequestedLanguage(payload.language)
  const useInverseTextNormalization =
    normalizedLanguage === 'zh' || normalizedLanguage === 'yue' ? 1 : 0

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
  const stream = recognizer.createStream()

  const sessionId = `subtitle-session-${nowMs()}-${Math.floor(Math.random() * 100_000)}`
  const startedAtMs = nowMs()

  runtimeSession = {
    sessionId,
    provider: providerDecision.provider,
    startedAtMs,
    modelRootDir,
    language: payload.language,
    fallbackApplied: providerDecision.fallbackApplied,
    lastChunkEndSec: 0,
    recognizer,
    stream,
    sampleRateHz: 16_000,
    pendingSamplesSinceDecode: 0,
    committedText: '',
    cueSeed: 0,
    requestedLanguage: normalizedLanguage,
    renderMode: payload.render_mode ?? 'advanced',
    lastSpeechEndSec: 0,
  }

  console.log(`[ASR] Session started: ${payload.render_mode ?? 'advanced'} mode, language: ${normalizedLanguage}`)

  return startSubtitleSessionResponseSchema.parse({
    session_id: sessionId,
    provider: providerDecision.provider,
    fallback_applied: providerDecision.fallbackApplied,
    events: providerDecision.events,
    started_at_ms: startedAtMs,
  })
}

async function handleStop(rawPayload: unknown): Promise<unknown> {
  const request = (rawPayload ?? {}) as StopSubtitleSessionRequestDto
  const currentSession = runtimeSession
  runtimeSession = null

  const response = stopSubtitleSessionResponseSchema.parse({
    session_id: currentSession?.sessionId ?? null,
    stopped: Boolean(currentSession),
    updated_at_ms: nowMs(),
  })

  void request
  return response
}

async function handleReset(rawPayload: unknown): Promise<unknown> {
  const request = (rawPayload ?? {}) as ResetSubtitleSessionRequestDto
  const currentSession = runtimeSession
  if (!currentSession) {
    return resetSubtitleSessionResponseSchema.parse({
      session_id: null,
      ok: false,
      events: [createEvent('session_not_running', 'warning', 'subtitle session is not running')],
      updated_at_ms: nowMs(),
    })
  }

  currentSession.lastChunkEndSec = request.timeline_sec ?? currentSession.lastChunkEndSec
  currentSession.stream = currentSession.recognizer.createStream()
  currentSession.pendingSamplesSinceDecode = 0
  currentSession.committedText = ''
  return resetSubtitleSessionResponseSchema.parse({
    session_id: currentSession.sessionId,
    ok: true,
    events: [],
    updated_at_ms: nowMs(),
  })
}

async function handleFlush(): Promise<unknown> {
  const currentSession = runtimeSession
  const cues = currentSession
    ? tryDecodeAndBuildCues(
        currentSession,
        Math.max(0, currentSession.lastChunkEndSec - 2),
        currentSession.lastChunkEndSec,
      )
    : []

  return flushSubtitleSessionResponseSchema.parse({
    session_id: currentSession?.sessionId ?? null,
    cues,
    events: [],
    updated_at_ms: nowMs(),
  })
}

async function handlePushAudio(rawPayload: unknown): Promise<unknown> {
  const request = rawPayload as PushSubtitleAudioRequestDto
  const currentSession = ensureSession()

  const chunkBuffer = Buffer.from(request.chunk_base64, 'base64')
  const chunkDurationSec = chunkBuffer.byteLength / 4 / request.sample_rate_hz / Math.max(1, request.channel_count)
  const expectedEndSec = request.chunk_start_sec + Math.max(0, chunkDurationSec)

  const events: SubtitleSessionEventDto[] = []
  if (request.chunk_end_sec + 0.0001 < request.chunk_start_sec) {
    events.push(createEvent('chunk_invalid_range', 'warning', 'chunk_end_sec is less than chunk_start_sec'))
  }
  if (request.chunk_start_sec + 0.0001 < currentSession.lastChunkEndSec) {
    events.push(createEvent('chunk_non_monotonic', 'warning', 'chunk start is earlier than previous chunk end'))
  }

  currentSession.lastChunkEndSec = Math.max(currentSession.lastChunkEndSec, request.chunk_end_sec, expectedEndSec)

  const samples = decodeFloat32Buffer(chunkBuffer)
  const rms = calculateRms(samples)
  
  if (samples.length > 0) {
    currentSession.sampleRateHz = request.sample_rate_hz
    currentSession.stream.acceptWaveform({
      samples,
      sampleRate: request.sample_rate_hz,
    })
    currentSession.pendingSamplesSinceDecode += samples.length / Math.max(1, request.channel_count)
  }

  const decodeWindowSamples = Math.max(1_600, Math.floor(currentSession.sampleRateHz * 0.6))
  const shouldDecode =
    currentSession.pendingSamplesSinceDecode >= decodeWindowSamples &&
    rms >= 0.002

  let cues: SubtitleCueDto[] = []
  if (shouldDecode) {
    currentSession.pendingSamplesSinceDecode = 0
    cues = tryDecodeAndBuildCues(currentSession, request.chunk_start_sec, request.chunk_end_sec)
  }

  return pushSubtitleAudioResponseSchema.parse({
    session_id: currentSession.sessionId,
    accepted: true,
    provider: currentSession.provider,
    cues,
    events,
    updated_at_ms: nowMs(),
  })
}

async function handleTranscribeAll(rawPayload: unknown): Promise<unknown> {
  const request = rawPayload as TranscribeAllRequestPayload
  const currentSession = ensureSession()

  const sampleRate = Number.isFinite(request.sample_rate_hz) && request.sample_rate_hz > 0
    ? Math.floor(request.sample_rate_hz)
    : 16_000
  const channelCount = Number.isFinite(request.channel_count) && request.channel_count > 0
    ? Math.floor(request.channel_count)
    : 1

  const sourceBuffer = Buffer.from(request.chunk_base64, 'base64')
  const rawSamples = decodeFloat32Buffer(sourceBuffer)
  let monoSamples = rawSamples
  if (channelCount > 1 && rawSamples.length > 0) {
    const frameCount = Math.floor(rawSamples.length / channelCount)
    const downmixed = new Float32Array(frameCount)
    for (let frame = 0; frame < frameCount; frame += 1) {
      let mixed = 0
      for (let channel = 0; channel < channelCount; channel += 1) {
        mixed += rawSamples[frame * channelCount + channel] ?? 0
      }
      downmixed[frame] = mixed / channelCount
    }
    monoSamples = downmixed
  }

  const computedDuration = sampleRate > 0 ? monoSamples.length / sampleRate : 0
  const durationSec = Number.isFinite(request.duration_sec) && (request.duration_sec ?? 0) > 0
    ? Number(request.duration_sec)
    : computedDuration

  currentSession.stream = currentSession.recognizer.createStream()
  currentSession.pendingSamplesSinceDecode = 0
  currentSession.committedText = ''
  currentSession.lastChunkEndSec = Math.max(0, durationSec)
  currentSession.stream.acceptWaveform({ samples: monoSamples, sampleRate })

  const startedAt = nowMs()
  currentSession.recognizer.decode(currentSession.stream)
  const elapsedMs = Math.max(1, nowMs() - startedAt)
  const result = currentSession.recognizer.getResult(currentSession.stream)
  const cues = buildOfflineResultCues(currentSession, result, durationSec)

  return {
    session_id: currentSession.sessionId,
    provider: currentSession.provider,
    cues,
    text: normalizeRecognizedText(result.text),
    duration_sec: durationSec,
    elapsed_ms: elapsedMs,
    rtf: durationSec > 0 ? elapsedMs / 1000 / durationSec : null,
    updated_at_ms: nowMs(),
  }
}

async function handleRequest(command: SubtitleWorkerCommand, payload: unknown): Promise<unknown> {
  switch (command) {
    case 'init':
      return await handleInit(payload)
    case 'stop':
      return await handleStop(payload)
    case 'reset':
      return await handleReset(payload)
    case 'flush':
      return await handleFlush()
    case 'push-audio':
      return await handlePushAudio(payload)
    case 'transcribe-all':
      return await handleTranscribeAll(payload)
    default:
      throw new Error(`subtitle_asr_worker_unknown_command:${command satisfies never}`)
  }
}

ensureParentPort()

parentPort.on('message', (message: unknown) => {
  if (!message || typeof message !== 'object') {
    return
  }

  const request = message as Partial<SubtitleWorkerRequest>
  if (request.kind !== 'request' || typeof request.request_id !== 'string' || typeof request.command !== 'string') {
    return
  }

  void handleRequest(request.command as SubtitleWorkerCommand, request.payload)
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
