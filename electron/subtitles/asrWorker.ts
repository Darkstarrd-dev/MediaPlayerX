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
  sessionEpoch: number
  lastChunkSeq: number
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
  simpleLastRawText: string
  simpleWindowText: string
  simpleLastNonEmptySec: number
  cueSeed: number
  requestedLanguage: string
  renderMode: 'simple' | 'advanced'
  lastSpeechEndSec: number // Track when speech last ended (for silence detection)
  vad: VadRuntime | null
  speaker: SpeakerRuntime | null
  similarityThreshold: number
  profileUpdateAlpha: number
}

interface VadSegmentLike {
  samples?: Float32Array | number[]
  start?: number
  end?: number
  startSec?: number
  endSec?: number
}

interface VadLike {
  acceptWaveform: (samples: Float32Array) => void
  isEmpty: () => boolean
  front: (enableExternalBuffer?: boolean) => VadSegmentLike
  pop: () => void
}

interface VadRuntime {
  detector: VadLike
}

interface SpeakerExtractorStreamLike {
  acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void
  inputFinished?: () => void
}

interface SpeakerExtractorLike {
  createStream: () => SpeakerExtractorStreamLike
  isReady?: (stream: SpeakerExtractorStreamLike) => boolean
  compute: (stream: SpeakerExtractorStreamLike, enableExternalBuffer?: boolean) => Float32Array | number[]
}

interface SpeakerProfile {
  id: number
  embedding: Float32Array
}

interface SpeakerRuntime {
  extractor: SpeakerExtractorLike
  profiles: SpeakerProfile[]
  currentSpeakerId: number | null
  lastSwitchSec: number
  recentBestScores: number[]
  segmentCount: number
  lastHintSegmentCount: number
}

const MAX_SPEAKER_COUNT = 2

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

async function resolveAuxiliaryModelPath(modelRootDir: string, matcher: (lowerName: string) => boolean): Promise<string | null> {
  let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
  try {
    entries = await fs.readdir(modelRootDir, { withFileTypes: true })
  } catch {
    return null
  }

  const match = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.onnx'))
    .map((entry) => entry.name)
    .find((name) => matcher(name.toLowerCase()))

  if (!match) {
    return null
  }
  return path.join(modelRootDir, match)
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

function resolveVadTuning(payload: InitRequestPayload): {
  threshold: number
  minSilenceDuration: number
  minSpeechDuration: number
  maxSpeechDuration: number
} {
  const preset = payload.advanced_options?.vad?.preset ?? 'balanced'
  const presetDefaults =
    preset === 'conservative'
      ? {
          threshold: 0.52,
          minSilenceDuration: 0.45,
          minSpeechDuration: 0.25,
          maxSpeechDuration: 20,
        }
      : preset === 'aggressive'
        ? {
            threshold: 0.36,
            minSilenceDuration: 0.1,
            minSpeechDuration: 0.15,
            maxSpeechDuration: 3,
          }
        : {
            threshold: 0.42,
            minSilenceDuration: 0.14,
            minSpeechDuration: 0.18,
            maxSpeechDuration: 3,
          }

  return {
    threshold: payload.advanced_options?.vad?.threshold ?? presetDefaults.threshold,
    minSilenceDuration: payload.advanced_options?.vad?.min_silence_sec ?? presetDefaults.minSilenceDuration,
    minSpeechDuration: payload.advanced_options?.vad?.min_speech_sec ?? presetDefaults.minSpeechDuration,
    maxSpeechDuration: payload.advanced_options?.vad?.max_speech_sec ?? presetDefaults.maxSpeechDuration,
  }
}

function resolveSpeakerThreshold(payload: InitRequestPayload): number {
  return payload.advanced_options?.speaker?.similarity_threshold ?? 0.5
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
  VoiceActivityDetector?: new (config: unknown) => VadLike
  Vad?: new (config: unknown, bufferSizeInSeconds?: number) => VadLike
  SpeakerEmbeddingExtractor?: new (config: unknown) => SpeakerExtractorLike
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
    VoiceActivityDetector?: new (config: unknown) => VadLike
    Vad?: new (config: unknown, bufferSizeInSeconds?: number) => VadLike
    SpeakerEmbeddingExtractor?: new (config: unknown) => SpeakerExtractorLike
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

function computeOverlapDelta(
  previousText: string,
  currentText: string,
  maxOverlapChars = 64,
): { kind: 'none' | 'append' | 'replace'; delta: string } {
  if (!currentText) {
    return { kind: 'none', delta: '' }
  }
  if (!previousText) {
    return { kind: 'append', delta: currentText }
  }
  if (currentText === previousText) {
    return { kind: 'none', delta: '' }
  }

  if (currentText.startsWith(previousText)) {
    return { kind: 'append', delta: currentText.slice(previousText.length).trim() }
  }

  const previousChars = Array.from(previousText)
  const currentChars = Array.from(currentText)
  const overlapLimit = Math.min(maxOverlapChars, previousChars.length, currentChars.length)
  for (let overlap = overlapLimit; overlap >= 1; overlap -= 1) {
    const prevSuffix = previousChars.slice(previousChars.length - overlap).join('')
    const currPrefix = currentChars.slice(0, overlap).join('')
    if (prevSuffix === currPrefix) {
      return {
        kind: 'append',
        delta: currentChars.slice(overlap).join('').trim(),
      }
    }
  }

  const rollback = currentChars.length < previousChars.length * 0.7
  if (rollback) {
    return { kind: 'replace', delta: currentText }
  }
  return { kind: 'replace', delta: currentText }
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

function downmixToMono(interleaved: Float32Array, channelCount: number): Float32Array {
  if (channelCount <= 1) {
    return interleaved
  }
  if (interleaved.length === 0) {
    return interleaved
  }

  const frameCount = Math.floor(interleaved.length / channelCount)
  const mono = new Float32Array(frameCount)
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0
    for (let channel = 0; channel < channelCount; channel += 1) {
      sum += interleaved[frame * channelCount + channel] ?? 0
    }
    mono[frame] = sum / channelCount
  }
  return mono
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

function charLength(value: string): number {
  return Array.from(value).length
}

function sliceTailByChars(value: string, count: number): string {
  if (count <= 0) {
    return ''
  }
  const chars = Array.from(value)
  return chars.slice(Math.max(0, chars.length - count)).join('')
}

function pickSimpleDisplayText(fullText: string, maxChars = 54): string {
  const normalized = fullText.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  if (charLength(normalized) <= maxChars) {
    return normalized
  }

  const separators = ['。', '！', '？', '!', '?', '.', ';', '；', ',', '，', '、']
  let lastSeparatorIndex = -1
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    if (separators.includes(normalized[index] ?? '')) {
      lastSeparatorIndex = index
      break
    }
  }

  if (lastSeparatorIndex >= 0 && lastSeparatorIndex + 1 < normalized.length) {
    const tail = normalized.slice(lastSeparatorIndex + 1).trim()
    if (tail && charLength(tail) <= maxChars + 16) {
      return sliceTailByChars(tail, maxChars)
    }
  }

  return sliceTailByChars(normalized, maxChars)
}

function pickLatestSimpleSnippet(fullText: string, maxChars = 28): string {
  const normalized = fullText.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }

  const separators = ['。', '！', '？', '!', '?', '.', ';', '；', ',', '，', '、']
  const chars = Array.from(normalized)
  let lastSeparatorPos = -1
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (separators.includes(chars[i] ?? '')) {
      lastSeparatorPos = i
      break
    }
  }

  if (lastSeparatorPos >= 0 && lastSeparatorPos + 1 < chars.length) {
    const tail = chars.slice(lastSeparatorPos + 1).join('').trim()
    if (tail) {
      return sliceTailByChars(tail, maxChars)
    }
  }

  return sliceTailByChars(normalized, maxChars)
}

function splitCompletedSentence(pendingText: string): { completed: string | null; rest: string } {
  const normalized = pendingText.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return { completed: null, rest: '' }
  }

  const separators = ['。', '！', '？', '!', '?', '.']
  const chars = Array.from(normalized)
  let lastSeparator = -1
  for (let i = 0; i < chars.length; i += 1) {
    if (separators.includes(chars[i] ?? '')) {
      lastSeparator = i
    }
  }

  if (lastSeparator < 0) {
    return { completed: null, rest: normalized }
  }

  const completed = chars.slice(0, lastSeparator + 1).join('').trim()
  const rest = chars.slice(lastSeparator + 1).join('').trim()
  return {
    completed: completed || null,
    rest,
  }
}

function sanitizePayloadForPostMessage(payload: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(payload))
  } catch {
    return payload
  }
}

function normalizeEmbedding(value: Float32Array | number[] | null | undefined): Float32Array | null {
  if (!value) {
    return null
  }
  const output = value instanceof Float32Array ? value : new Float32Array(value)
  if (output.length === 0) {
    return null
  }
  return output
}

function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  const size = Math.min(left.length, right.length)
  if (size === 0) {
    return -1
  }

  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let i = 0; i < size; i += 1) {
    const l = left[i] ?? 0
    const r = right[i] ?? 0
    dot += l * r
    leftNorm += l * l
    rightNorm += r * r
  }

  if (leftNorm <= 0 || rightNorm <= 0) {
    return -1
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

function identifySpeaker(
  speakerRuntime: SpeakerRuntime,
  embedding: Float32Array,
  similarityThreshold: number,
  profileUpdateAlpha: number,
  segmentDurationSec: number,
  segmentEndSec: number,
): { speakerId: number; bestScore: number } {
  let bestId = -1
  let bestScore = -1
  let currentSpeakerScore = -1

  for (let i = 0; i < speakerRuntime.profiles.length; i += 1) {
    const profile = speakerRuntime.profiles[i]
    const score = cosineSimilarity(embedding, profile.embedding)
    if (score > bestScore) {
      bestScore = score
      bestId = profile.id
    }
    if (profile.id === speakerRuntime.currentSpeakerId) {
      currentSpeakerScore = score
    }
  }

  // Hysteresis: avoid frequent speaker jumps for short/unstable segments.
  const stickyThreshold = Math.max(0.40, similarityThreshold - 0.08)
  const switchMargin = 0.02
  const switchCooldownSec = 0.55
  const inSwitchCooldown =
    speakerRuntime.lastSwitchSec > 0 &&
    segmentEndSec - speakerRuntime.lastSwitchSec < switchCooldownSec

  if (speakerRuntime.currentSpeakerId !== null && currentSpeakerScore >= stickyThreshold) {
    if (
      bestId >= 0 &&
      bestId !== speakerRuntime.currentSpeakerId &&
      bestScore >= similarityThreshold &&
      bestScore - currentSpeakerScore >= switchMargin &&
      !inSwitchCooldown
    ) {
      speakerRuntime.lastSwitchSec = segmentEndSec
      return { speakerId: bestId, bestScore }
    }
    bestId = speakerRuntime.currentSpeakerId
    bestScore = currentSpeakerScore
  }

  if (bestId >= 0 && bestScore >= similarityThreshold) {
    const targetProfile = speakerRuntime.profiles.find((profile) => profile.id === bestId)
    if (targetProfile) {
      const alpha = Math.min(Math.max(profileUpdateAlpha, 0.05), 0.95)
      const size = Math.min(targetProfile.embedding.length, embedding.length)
      for (let i = 0; i < size; i += 1) {
        targetProfile.embedding[i] = (1 - alpha) * targetProfile.embedding[i] + alpha * embedding[i]
      }
    }
    return { speakerId: bestId, bestScore }
  }

  // Do not keep creating new speakers from short/noisy segments.
  const createThreshold = Math.max(0.35, similarityThreshold - 0.08)
  const allowCreate =
    speakerRuntime.profiles.length === 0 || (
      segmentDurationSec >= 0.9 &&
      bestScore < createThreshold &&
      speakerRuntime.profiles.length < MAX_SPEAKER_COUNT
    )

  if (!allowCreate) {
    if (speakerRuntime.currentSpeakerId !== null) {
      return {
        speakerId: speakerRuntime.currentSpeakerId,
        bestScore: currentSpeakerScore >= 0 ? currentSpeakerScore : bestScore,
      }
    }
    if (bestId >= 0) {
      return { speakerId: bestId, bestScore }
    }
    return { speakerId: 0, bestScore }
  }

  if (bestId >= 0 && bestScore >= Math.max(0.72, similarityThreshold + 0.18)) {
    return { speakerId: bestId, bestScore }
  }

  const nextId = speakerRuntime.profiles.length
  speakerRuntime.profiles.push({
    id: nextId,
    embedding: new Float32Array(embedding),
  })
  speakerRuntime.lastSwitchSec = segmentEndSec
  return { speakerId: nextId, bestScore }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(Math.max(value, min), max)
}

function computeMedian(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

function maybeBuildSpeakerThresholdHint(currentSession: RuntimeSessionState): SubtitleSessionEventDto | null {
  const speakerRuntime = currentSession.speaker
  if (!speakerRuntime) {
    return null
  }
  if (speakerRuntime.recentBestScores.length < 20) {
    return null
  }
  if (speakerRuntime.segmentCount - speakerRuntime.lastHintSegmentCount < 20) {
    return null
  }

  const medianScore = computeMedian(speakerRuntime.recentBestScores)
  const suggestedThreshold = clampNumber(medianScore - 0.03, 0.55, 0.72)
  speakerRuntime.lastHintSegmentCount = speakerRuntime.segmentCount

  return createEvent(
    'speaker_threshold_hint',
    'info',
    `speaker score median=${medianScore.toFixed(3)}, suggest threshold=${suggestedThreshold.toFixed(2)}, current=${currentSession.similarityThreshold.toFixed(2)}`,
  )
}

function extractSpeakerEmbedding(
  speakerRuntime: SpeakerRuntime,
  samples: Float32Array,
  sampleRate: number,
): Float32Array | null {
  if (samples.length < Math.floor(sampleRate * 0.45)) {
    return null
  }
  const stream = speakerRuntime.extractor.createStream()
  stream.acceptWaveform({
    samples,
    sampleRate,
  })
  stream.inputFinished?.()

  if (typeof speakerRuntime.extractor.isReady === 'function' && !speakerRuntime.extractor.isReady(stream)) {
    return null
  }
  return normalizeEmbedding(speakerRuntime.extractor.compute(stream, false))
}

function parseVadSegment(rawSegment: VadSegmentLike, sampleRateHz: number): { samples: Float32Array; startSec: number | null; endSec: number | null } | null {
  const inputSamples = rawSegment.samples
  if (!inputSamples) {
    return null
  }
  const samples = inputSamples instanceof Float32Array ? inputSamples : new Float32Array(inputSamples)
  if (samples.length === 0) {
    return null
  }

  const startRaw = Number(rawSegment.startSec ?? rawSegment.start)
  const endRaw = Number(rawSegment.endSec ?? rawSegment.end)

  const startCandidate = Number.isFinite(startRaw)
    ? (rawSegment.startSec != null ? startRaw : startRaw / Math.max(1, sampleRateHz))
    : Number.NaN
  const endCandidate = Number.isFinite(endRaw)
    ? (rawSegment.endSec != null ? endRaw : endRaw / Math.max(1, sampleRateHz))
    : Number.NaN

  return {
    samples,
    startSec: Number.isFinite(startCandidate) ? startCandidate : null,
    endSec: Number.isFinite(endCandidate) ? endCandidate : null,
  }
}

function consumeVadSegments(
  currentSession: RuntimeSessionState,
  vadDetector: VadLike,
  sampleRateHz: number,
  fallbackChunkStartSec: number,
  fallbackChunkEndSec: number,
): SubtitleCueDto[] {
  const cues: SubtitleCueDto[] = []

  while (!vadDetector.isEmpty()) {
    const parsedSegment = parseVadSegment(vadDetector.front(false), sampleRateHz)
    vadDetector.pop()
    if (!parsedSegment || parsedSegment.samples.length === 0) {
      continue
    }

    const segmentDurationSec = parsedSegment.samples.length / sampleRateHz
    if (segmentDurationSec < 0.2) {
      continue
    }

    const segmentEndSec = Number.isFinite(parsedSegment.endSec)
      ? Number(parsedSegment.endSec)
      : fallbackChunkEndSec
    const segmentStartSec = Number.isFinite(parsedSegment.startSec)
      ? Number(parsedSegment.startSec)
      : Math.max(fallbackChunkStartSec, segmentEndSec - segmentDurationSec)

    cues.push(
      ...decodeSegmentAndBuildCue(
        currentSession,
        parsedSegment.samples,
        sampleRateHz,
        Math.max(0, segmentStartSec),
        Math.max(segmentStartSec + 0.35, segmentEndSec),
      ),
    )
  }

  return cues
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

function decodeSegmentAndBuildCue(
  currentSession: RuntimeSessionState,
  samples: Float32Array,
  sampleRateHz: number,
  startSec: number,
  endSec: number,
): SubtitleCueDto[] {
  const stream = currentSession.recognizer.createStream()
  stream.acceptWaveform({
    samples,
    sampleRate: sampleRateHz,
  })

  currentSession.recognizer.decode(stream)
  const result = currentSession.recognizer.getResult(stream)
  const text = normalizeRecognizedText(result.text)
  if (!text) {
    return []
  }

  const cueLanguage =
    currentSession.requestedLanguage === 'auto'
      ? normalizeLangTag(result.lang)
      : currentSession.requestedLanguage

  let speakerId: number | null = currentSession.speaker?.currentSpeakerId ?? null
  let speakerChanged = false
  let speakerSimilarity: number | undefined
  if (currentSession.speaker) {
    const embedding = extractSpeakerEmbedding(currentSession.speaker, samples, sampleRateHz)
    if (embedding) {
      const detected = identifySpeaker(
        currentSession.speaker,
        embedding,
        currentSession.similarityThreshold,
        currentSession.profileUpdateAlpha,
        samples.length / Math.max(1, sampleRateHz),
        endSec,
      )
      speakerSimilarity = detected.bestScore
      currentSession.speaker.segmentCount += 1
      currentSession.speaker.recentBestScores.push(detected.bestScore)
      if (currentSession.speaker.recentBestScores.length > 60) {
        currentSession.speaker.recentBestScores.shift()
      }

      const detectedSpeakerId = detected.speakerId
      speakerChanged = currentSession.speaker.currentSpeakerId !== detectedSpeakerId
      currentSession.speaker.currentSpeakerId = detectedSpeakerId
      speakerId = detectedSpeakerId
    }
  }

  const normalizedStart = Math.max(0, startSec)
  const normalizedEnd = Math.max(normalizedStart + 0.35, endSec)

  const cueText = currentSession.renderMode === 'simple'
    ? pickLatestSimpleSnippet(text, 28)
    : text
  if (!cueText) {
    return []
  }

  const cueStart = currentSession.renderMode === 'simple'
    ? Math.max(0, normalizedEnd - 0.05)
    : normalizedStart
  const cueEnd = currentSession.renderMode === 'simple'
    ? Math.max(cueStart + 0.25, normalizedEnd + 0.55)
    : normalizedEnd

  currentSession.cueSeed += 1
  return [
    {
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: cueStart,
      end_sec: cueEnd,
      text: cueText,
      lang: cueLanguage,
      speaker: speakerId,
      speaker_changed: speakerChanged,
      speaker_similarity: speakerSimilarity,
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
    // 检测静音间隔：基于最后一次非空 ASR 时间，而非最后一次提交 cue
    const silenceDuration = timelineEndSec - currentSession.simpleLastNonEmptySec
    if (silenceDuration > 1.5 && (currentSession.committedText || currentSession.simpleWindowText)) {
      console.log(`[ASR] Silence detected (${silenceDuration.toFixed(1)}s), clearing previous text`)
      currentSession.committedText = ''
      currentSession.simpleLastRawText = ''
      currentSession.simpleWindowText = ''
    }
    currentSession.simpleLastNonEmptySec = timelineEndSec

    const deltaResult = computeOverlapDelta(currentSession.simpleLastRawText, currentText, 64)
    currentSession.simpleLastRawText = currentText

    // 如果文本无新增，不生成新的 cue
    if (deltaResult.kind === 'none' || !deltaResult.delta) {
      return []
    }

    const normalizedDelta = deltaResult.delta.trim()
    if (charLength(normalizedDelta) <= 1 && !/[0-9A-Za-z]/.test(normalizedDelta)) {
      return []
    }

    if (deltaResult.kind === 'replace') {
      currentSession.simpleWindowText = currentText
    } else {
      currentSession.simpleWindowText = `${currentSession.simpleWindowText} ${normalizedDelta}`.trim()
    }

    const sentenceSplit = splitCompletedSentence(currentSession.simpleWindowText)
    let displayText = ''
    if (sentenceSplit.completed) {
      displayText = pickLatestSimpleSnippet(sentenceSplit.completed, 28)
      currentSession.simpleWindowText = sentenceSplit.rest
    } else if (silenceDuration > 0.45 && currentSession.simpleWindowText) {
      displayText = pickLatestSimpleSnippet(currentSession.simpleWindowText, 28)
      currentSession.simpleWindowText = ''
    }

    if (!displayText || displayText === currentSession.committedText) {
      return []
    }

    currentSession.committedText = displayText
    currentSession.lastSpeechEndSec = timelineEndSec

    // Simple 模式句子短暂停留，避免历史内容长驻
    const durationSec = Math.max(0.45, Math.min(0.75, charLength(displayText) * 0.025))
    const cueStart = Math.max(0, timelineEndSec - 0.05)
    const cueEnd = Math.max(cueStart + 0.25, timelineEndSec + durationSec)

    const cueLanguage =
      currentSession.requestedLanguage === 'auto'
        ? normalizeLangTag(result.lang)
        : currentSession.requestedLanguage

    currentSession.cueSeed += 1
    const cue = {
      id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
      start_sec: cueStart,
      end_sec: cueEnd,
      text: displayText,
      lang: cueLanguage,
      speaker: null,
      speaker_changed: false,
    }

    // 只在有增量时输出调试信息
    console.log(`[ASR] +${normalizedDelta.length} chars: "${normalizedDelta}" [${cueStart.toFixed(1)}s - ${cueEnd.toFixed(1)}s]`)

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
    speaker: null,
    speaker_changed: false,
  }
  
  return [cue]
}

async function handleInit(rawPayload: unknown): Promise<unknown> {
  const payload = rawPayload as InitRequestPayload
  const sherpa = loadSherpaModule(path.resolve(payload.engine_module_root))

  const modelRootDir = await resolveModelRootDir(payload.model_dir, payload.model_id)
  const providerDecision = chooseProvider(payload)
  const runtimeEvents = [...providerDecision.events]

  const modelPath = await resolveModelOnnxPath(modelRootDir)
  const tokensPath = path.join(modelRootDir, 'tokens.txt')
  const modelDirRootCandidate = path.resolve(payload.model_dir)
  const vadModelPath =
    await resolveAuxiliaryModelPath(
      modelRootDir,
      (name) => name.includes('silero') && name.includes('vad'),
    )
    ?? (modelDirRootCandidate !== modelRootDir
      ? await resolveAuxiliaryModelPath(
          modelDirRootCandidate,
          (name) => name.includes('silero') && name.includes('vad'),
        )
      : null)
  const speakerModelPath =
    await resolveAuxiliaryModelPath(
      modelRootDir,
      (name) => name.includes('eres2net') || (name.includes('3dspeaker') && name.includes('sv')),
    )
    ?? (modelDirRootCandidate !== modelRootDir
      ? await resolveAuxiliaryModelPath(
          modelDirRootCandidate,
          (name) => name.includes('eres2net') || (name.includes('3dspeaker') && name.includes('sv')),
        )
      : null)
  const normalizedLanguage = normalizeRequestedLanguage(payload.language)
  const vadTuning = resolveVadTuning(payload)
  const speakerThreshold = resolveSpeakerThreshold(payload)
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

  let vad: VadRuntime | null = null
  const VadConstructor = sherpa.VoiceActivityDetector ?? sherpa.Vad
  const wantsVad = payload.render_mode === 'advanced' || payload.render_mode === 'simple'
  if (wantsVad && VadConstructor && vadModelPath) {
    try {
      const detector = new VadConstructor({
        sileroVad: {
          model: vadModelPath,
          threshold: vadTuning.threshold,
          minSilenceDuration: vadTuning.minSilenceDuration,
          minSpeechDuration: vadTuning.minSpeechDuration,
          maxSpeechDuration: vadTuning.maxSpeechDuration,
        },
        sampleRate: 16_000,
        numThreads: 2,
      }, 30)
      vad = { detector }
    } catch (error) {
      runtimeEvents.push(
        createEvent(
          'advanced_vad_init_failed',
          'warning',
          error instanceof Error ? error.message : String(error),
        ),
      )
    }
  } else if (wantsVad) {
    const exportKeys = Object.keys(sherpa).sort().join(',')
    runtimeEvents.push(
      createEvent(
        'advanced_vad_unavailable',
        'warning',
        `silero vad model or constructor is unavailable; fallback to legacy decoding; exports=${exportKeys}`,
      ),
    )
  }

  let speaker: SpeakerRuntime | null = null
  if (payload.render_mode === 'advanced' && sherpa.SpeakerEmbeddingExtractor && speakerModelPath) {
    try {
      const extractor = new sherpa.SpeakerEmbeddingExtractor({
        model: speakerModelPath,
        numThreads: 1,
      })
      speaker = {
        extractor,
        profiles: [],
        currentSpeakerId: null,
        lastSwitchSec: -1,
        recentBestScores: [],
        segmentCount: 0,
        lastHintSegmentCount: 0,
      }
    } catch (error) {
      runtimeEvents.push(
        createEvent(
          'advanced_speaker_init_failed',
          'warning',
          error instanceof Error ? error.message : String(error),
        ),
      )
    }
  } else if (payload.render_mode === 'advanced') {
    const exportKeys = Object.keys(sherpa).sort().join(',')
    runtimeEvents.push(
      createEvent(
        'advanced_speaker_unavailable',
        'warning',
        `speaker embedding model or constructor is unavailable; speaker split is disabled; exports=${exportKeys}`,
      ),
    )
  }

  const sessionId = `subtitle-session-${nowMs()}-${Math.floor(Math.random() * 100_000)}`
  const startedAtMs = nowMs()

  runtimeSession = {
    sessionId,
    sessionEpoch: 0,
    lastChunkSeq: -1,
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
    simpleLastRawText: '',
    simpleWindowText: '',
    simpleLastNonEmptySec: 0,
    cueSeed: 0,
    requestedLanguage: normalizedLanguage,
    renderMode: payload.render_mode ?? 'advanced',
    lastSpeechEndSec: 0,
    vad,
    speaker,
    similarityThreshold: speakerThreshold,
    profileUpdateAlpha: 0.3,
  }

  console.log(`[ASR] Session started: ${payload.render_mode ?? 'advanced'} mode, language: ${normalizedLanguage}`)

  return startSubtitleSessionResponseSchema.parse({
    session_id: sessionId,
    provider: providerDecision.provider,
    fallback_applied: providerDecision.fallbackApplied,
    events: runtimeEvents,
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

function resetSessionStateForTimeline(currentSession: RuntimeSessionState, timelineSec: number): void {
  currentSession.lastChunkEndSec = Math.max(0, timelineSec)
  currentSession.stream = currentSession.recognizer.createStream()
  currentSession.pendingSamplesSinceDecode = 0
  currentSession.committedText = ''
  currentSession.simpleLastRawText = ''
  currentSession.simpleWindowText = ''
  currentSession.simpleLastNonEmptySec = Math.max(0, timelineSec)
  currentSession.lastChunkSeq = -1
  currentSession.speaker?.profiles.splice(0, currentSession.speaker.profiles.length)
  if (currentSession.speaker) {
    currentSession.speaker.currentSpeakerId = null
    currentSession.speaker.lastSwitchSec = -1
    currentSession.speaker.recentBestScores = []
    currentSession.speaker.segmentCount = 0
    currentSession.speaker.lastHintSegmentCount = 0
  }
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

  resetSessionStateForTimeline(currentSession, request.timeline_sec ?? currentSession.lastChunkEndSec)
  return resetSubtitleSessionResponseSchema.parse({
    session_id: currentSession.sessionId,
    ok: true,
    events: [],
    updated_at_ms: nowMs(),
  })
}

async function handleFlush(): Promise<unknown> {
  const currentSession = runtimeSession
  let cues: SubtitleCueDto[] = []

  if (currentSession) {
    const canFlushVad = currentSession.vad !== null

    if (canFlushVad) {
      const vadDetector = currentSession.vad!.detector
      if (typeof (vadDetector as { flush?: () => void }).flush === 'function') {
        ;(vadDetector as { flush: () => void }).flush()
      }
      cues = consumeVadSegments(
        currentSession,
        vadDetector,
        16_000,
        Math.max(0, currentSession.lastChunkEndSec - 2),
        currentSession.lastChunkEndSec,
      )
    } else {
      cues = tryDecodeAndBuildCues(
        currentSession,
        Math.max(0, currentSession.lastChunkEndSec - 2),
        currentSession.lastChunkEndSec,
      )
    }
  }

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

  const requestEpoch = Number.isFinite(request.session_epoch) ? Math.max(0, Math.floor(request.session_epoch)) : 0
  const requestChunkSeq = Number.isFinite(request.chunk_seq) ? Math.max(0, Math.floor(request.chunk_seq)) : 0
  let epochResetApplied = false

  if (requestEpoch < currentSession.sessionEpoch) {
    return pushSubtitleAudioResponseSchema.parse({
      session_id: currentSession.sessionId,
      accepted: false,
      provider: currentSession.provider,
      cues: [],
      events: [createEvent('chunk_stale_epoch', 'warning', 'chunk epoch is older than active session epoch')],
      session_epoch: currentSession.sessionEpoch,
      chunk_seq: requestChunkSeq,
      queue_len: 0,
      updated_at_ms: nowMs(),
    })
  }

  if (requestEpoch > currentSession.sessionEpoch) {
    currentSession.sessionEpoch = requestEpoch
    resetSessionStateForTimeline(currentSession, request.chunk_start_sec)
    epochResetApplied = true
  }

  const previousChunkSeq = currentSession.lastChunkSeq
  if (requestChunkSeq <= previousChunkSeq) {
    return pushSubtitleAudioResponseSchema.parse({
      session_id: currentSession.sessionId,
      accepted: false,
      provider: currentSession.provider,
      cues: [],
      events: [createEvent('chunk_stale_seq', 'warning', 'chunk seq is not newer than last applied seq')],
      session_epoch: currentSession.sessionEpoch,
      chunk_seq: requestChunkSeq,
      queue_len: 0,
      updated_at_ms: nowMs(),
    })
  }

  currentSession.lastChunkSeq = requestChunkSeq

  const chunkBuffer = Buffer.from(request.chunk_base64, 'base64')
  const chunkDurationSec = chunkBuffer.byteLength / 4 / request.sample_rate_hz / Math.max(1, request.channel_count)
  const expectedEndSec = request.chunk_start_sec + Math.max(0, chunkDurationSec)

  const events: SubtitleSessionEventDto[] = []
  if (epochResetApplied) {
    events.push(createEvent('chunk_epoch_reset', 'info', 'session state reset due to newer chunk epoch'))
  }
  if (previousChunkSeq >= 0 && requestChunkSeq > previousChunkSeq + 1) {
    events.push(createEvent('chunk_seq_gap', 'warning', 'chunk seq gap detected; possible upstream drop/merge'))
  }
  if (request.chunk_end_sec + 0.0001 < request.chunk_start_sec) {
    events.push(createEvent('chunk_invalid_range', 'warning', 'chunk_end_sec is less than chunk_start_sec'))
  }
  if (request.chunk_start_sec + 0.0001 < currentSession.lastChunkEndSec) {
    events.push(createEvent('chunk_non_monotonic', 'warning', 'chunk start is earlier than previous chunk end'))
  }

  currentSession.lastChunkEndSec = Math.max(currentSession.lastChunkEndSec, request.chunk_end_sec, expectedEndSec)

  const rawSamples = decodeFloat32Buffer(chunkBuffer)
  const samples = downmixToMono(rawSamples, Math.max(1, request.channel_count))
  const rms = calculateRms(samples)

  let cues: SubtitleCueDto[] = []

  const canUseVadSegmentation =
    currentSession.vad !== null &&
    request.sample_rate_hz === 16_000

  if (canUseVadSegmentation && samples.length > 0) {
    const vadDetector = currentSession.vad!.detector
    vadDetector.acceptWaveform(samples)
    cues.push(
      ...consumeVadSegments(
        currentSession,
        vadDetector,
        16_000,
        request.chunk_start_sec,
        request.chunk_end_sec,
      ),
    )

    if (currentSession.speaker) {
      const thresholdHintEvent = maybeBuildSpeakerThresholdHint(currentSession)
      if (thresholdHintEvent) {
        events.push(thresholdHintEvent)
      }
    }
  } else {
    if (samples.length > 0) {
      currentSession.sampleRateHz = request.sample_rate_hz
      currentSession.stream.acceptWaveform({
        samples,
        sampleRate: request.sample_rate_hz,
      })
      currentSession.pendingSamplesSinceDecode += samples.length
    }

    const decodeWindowSamples = Math.max(1_600, Math.floor(currentSession.sampleRateHz * 0.6))
    const shouldDecode =
      currentSession.pendingSamplesSinceDecode >= decodeWindowSamples &&
      rms >= 0.002

    if (shouldDecode) {
      currentSession.pendingSamplesSinceDecode = 0
      cues = tryDecodeAndBuildCues(currentSession, request.chunk_start_sec, request.chunk_end_sec)
    }
  }

  return pushSubtitleAudioResponseSchema.parse({
    session_id: currentSession.sessionId,
    accepted: true,
    provider: currentSession.provider,
    cues,
    events,
    session_epoch: currentSession.sessionEpoch,
    chunk_seq: requestChunkSeq,
    queue_len: 0,
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

  resetSessionStateForTimeline(currentSession, durationSec)
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
        payload: sanitizePayloadForPostMessage(payload),
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
