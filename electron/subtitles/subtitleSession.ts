import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

import type { WebContents } from 'electron'

import {
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioResponseSchema,
  startSubtitlePersistenceResponseSchema,
  appendSubtitlePersistenceResponseSchema,
  readSubtitlePersistenceWindowResponseSchema,
  resetSubtitleSessionResponseSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionResponseSchema,
  type FlushSubtitleSessionResponseDto,
  type PushSubtitleAudioRequestDto,
  type PushSubtitleAudioResponseDto,
  type StartSubtitlePersistenceRequestDto,
  type StartSubtitlePersistenceResponseDto,
  type AppendSubtitlePersistenceRequestDto,
  type AppendSubtitlePersistenceResponseDto,
  type ReadSubtitlePersistenceWindowRequestDto,
  type ReadSubtitlePersistenceWindowResponseDto,
  type ResetSubtitleSessionRequestDto,
  type ResetSubtitleSessionResponseDto,
  type StartSubtitleSessionRequestDto,
  type StartSubtitleSessionResponseDto,
  type StopSubtitleSessionRequestDto,
  type StopSubtitleSessionResponseDto,
  type SubtitleSessionProviderDto,
} from '../../src/contracts/backend'
import { probeSubtitleEngineStatus } from './subtitleEngineProbe'

type SubtitleWorkerCommand = 'init' | 'stop' | 'reset' | 'flush' | 'push-audio'

interface SubtitleWorkerRequest {
  kind: 'request'
  request_id: string
  command: SubtitleWorkerCommand
  payload: unknown
}

interface SubtitleWorkerResponse {
  kind: 'response'
  request_id: string
  ok: boolean
  payload?: unknown
  error?: string
}

interface SubtitleSessionState {
  sessionId: string
  provider: SubtitleSessionProviderDto
  workerClient: SubtitleWorkerClient
  persistence: SubtitlePersistenceState | null
}

interface SubtitlePersistenceState {
  subtitlePath: string
  cues: SubtitleCueRecord[]
  lastAppliedEpoch: number
  lastAppliedChunkSeq: number
}

interface SubtitleCueRecord {
  id: string
  start_sec: number
  end_sec: number
  text: string
  lang: string | null
  speaker?: number | null
  line?: 'A' | 'B'
  speaker_changed?: boolean
  speaker_similarity?: number
}

interface CueRange {
  startSec: number
  endSec: number
}

function nowMs(): number {
  return Date.now()
}

function formatSrtTimestamp(seconds: number): string {
  const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const totalMs = Math.floor(clamped * 1000)
  const ms = totalMs % 1000
  const totalSec = Math.floor(totalMs / 1000)
  const sec = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const min = totalMin % 60
  const hour = Math.floor(totalMin / 60)
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function cuesToSrtText(cues: SubtitleCueRecord[]): string {
  const lines: string[] = []
  let cueIndex = 1
  for (const cue of cues) {
    const text = cue.text.trim()
    if (!text) {
      continue
    }
    lines.push(String(cueIndex))
    lines.push(`${formatSrtTimestamp(cue.start_sec)} --> ${formatSrtTimestamp(Math.max(cue.end_sec, cue.start_sec + 0.2))}`)
    lines.push(text)
    lines.push('')
    cueIndex += 1
  }
  return lines.join('\n').trim()
}

function normalizePersistenceLocaleTag(rawLanguage: string): string {
  const input = rawLanguage.trim()
  if (!input) {
    return 'auto'
  }
  if (input.toLowerCase() === 'auto') {
    return 'auto'
  }

  const cleaned = input.replace(/_/g, '-').replace(/[^A-Za-z0-9-]/g, '')
  const parts = cleaned.split('-').filter((part) => part.length > 0)
  if (parts.length === 0) {
    return 'auto'
  }

  const normalized = parts.map((part, index) => {
    if (index === 0) {
      return part.toLowerCase()
    }
    if (part.length === 2) {
      return part.toUpperCase()
    }
    return part.toLowerCase()
  })
  return normalized.join('-')
}

function resolveAutoSubtitlePath(videoPath: string, localeTag: string): string {
  const videoDir = path.dirname(videoPath)
  const stem = path.basename(videoPath, path.extname(videoPath))
  return path.join(videoDir, `${stem}.auto-live.${localeTag}.srt`)
}

function normalizePathForCompare(inputPath: string): string {
  return path.resolve(inputPath).replace(/[\\/]+$/, '').toLowerCase()
}

function resolvePersistableVideoPath(rawPath: string): string | null {
  const trimmed = rawPath.trim()
  if (!trimmed) {
    return null
  }
  const resolved = path.resolve(trimmed)
  const parsed = path.parse(resolved)
  const normalizedResolved = normalizePathForCompare(resolved)
  const normalizedRoot = normalizePathForCompare(parsed.root)
  if (!parsed.base || normalizedResolved === normalizedRoot) {
    return null
  }
  return resolved
}

async function ensureParentDirectory(filePath: string): Promise<void> {
  const parentDir = path.dirname(filePath)
  const parsed = path.parse(parentDir)
  const normalizedParent = normalizePathForCompare(parentDir)
  const normalizedRoot = normalizePathForCompare(parsed.root)
  if (normalizedParent === normalizedRoot) {
    return
  }
  await fs.mkdir(parentDir, { recursive: true })
}

function parseSrtTimestamp(timestamp: string): number {
  const match = timestamp.trim().match(/^(\d+):(\d+):(\d+)[,.](\d{1,3})$/)
  if (!match) {
    return Number.NaN
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3])
  const ms = Number(match[4].padEnd(3, '0'))
  if (![hour, minute, second, ms].every((value) => Number.isFinite(value))) {
    return Number.NaN
  }
  return hour * 3600 + minute * 60 + second + ms / 1000
}

function parseSrtText(rawText: string): SubtitleCueRecord[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return []
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)

  const cues: SubtitleCueRecord[] = []
  let seed = 0
  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0)
    if (lines.length < 2) {
      continue
    }

    const timingIndex = lines[0].includes('-->') ? 0 : 1
    const timingLine = lines[timingIndex]
    if (!timingLine || !timingLine.includes('-->')) {
      continue
    }
    const [startRaw, endRaw] = timingLine.split('-->').map((value) => value.trim())
    const startSec = parseSrtTimestamp(startRaw)
    const endSec = parseSrtTimestamp(endRaw)
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
      continue
    }

    const textLines = lines.slice(timingIndex + 1)
    const text = textLines.join('\n').trim()
    if (!text) {
      continue
    }

    seed += 1
    cues.push({
      id: `persisted:${Math.round(startSec * 1000)}:${Math.round(endSec * 1000)}:${seed}`,
      start_sec: Math.max(0, startSec),
      end_sec: Math.max(startSec + 0.12, endSec),
      text,
      lang: null,
    })
  }

  return dedupeCuesByTimeAndText(cues)
}

function toCueRecord(cue: AppendSubtitlePersistenceRequestDto['cues'][number]): SubtitleCueRecord {
  return {
    id: cue.id,
    start_sec: cue.start_sec,
    end_sec: cue.end_sec,
    text: cue.text,
    lang: cue.lang,
    speaker: cue.speaker,
    line: cue.line,
    speaker_changed: cue.speaker_changed,
    speaker_similarity: cue.speaker_similarity,
  }
}

function cueOverlapsRange(cue: SubtitleCueRecord, rangeStartSec: number, rangeEndSec: number): boolean {
  return cue.end_sec + 0.001 >= rangeStartSec && cue.start_sec <= rangeEndSec + 0.001
}

function mergeCueRanges(cues: SubtitleCueRecord[], maxGapSec = 0.35): CueRange[] {
  if (cues.length === 0) {
    return []
  }
  const ordered = [...cues].sort((left, right) => left.start_sec - right.start_sec)
  const ranges: CueRange[] = []
  for (const cue of ordered) {
    const startSec = Math.max(0, cue.start_sec)
    const endSec = Math.max(startSec, cue.end_sec)
    const previous = ranges[ranges.length - 1]
    if (!previous) {
      ranges.push({ startSec, endSec })
      continue
    }
    if (startSec <= previous.endSec + maxGapSec) {
      previous.endSec = Math.max(previous.endSec, endSec)
    } else {
      ranges.push({ startSec, endSec })
    }
  }
  return ranges
}

function isCueAtTimeline(cue: SubtitleCueRecord, timelineSec: number): boolean {
  return cue.start_sec - 0.01 <= timelineSec && cue.end_sec + 0.12 >= timelineSec
}

function toCueDedupKey(cue: SubtitleCueRecord): string {
  const startMs = Math.round(Math.max(0, cue.start_sec) * 1000)
  const endMs = Math.round(Math.max(cue.start_sec, cue.end_sec) * 1000)
  const normalizedText = cue.text.replace(/\s+/g, ' ').trim()
  return `${startMs}|${endMs}|${normalizedText}`
}

function normalizeCueTextForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim()
}

function computeDiceSimilarity(left: string, right: string): number {
  if (!left || !right) {
    return 0
  }
  if (left === right) {
    return 1
  }
  const leftChars = Array.from(left)
  const rightChars = Array.from(right)
  if (leftChars.length < 2 || rightChars.length < 2) {
    const rightSet = new Set(rightChars)
    const hit = leftChars.reduce((sum, ch) => sum + (rightSet.has(ch) ? 1 : 0), 0)
    return hit / Math.max(leftChars.length, rightChars.length)
  }

  const leftBigrams = new Map<string, number>()
  for (let i = 0; i < leftChars.length - 1; i += 1) {
    const key = `${leftChars[i]}${leftChars[i + 1]}`
    leftBigrams.set(key, (leftBigrams.get(key) ?? 0) + 1)
  }

  let intersection = 0
  let rightCount = 0
  for (let i = 0; i < rightChars.length - 1; i += 1) {
    const key = `${rightChars[i]}${rightChars[i + 1]}`
    rightCount += 1
    const leftCount = leftBigrams.get(key) ?? 0
    if (leftCount > 0) {
      intersection += 1
      leftBigrams.set(key, leftCount - 1)
    }
  }

  const leftCount = Math.max(1, leftChars.length - 1)
  const denominator = leftCount + Math.max(1, rightCount)
  return (2 * intersection) / denominator
}

function computeCueTextSimilarity(leftText: string, rightText: string): number {
  const left = normalizeCueTextForDedup(leftText)
  const right = normalizeCueTextForDedup(rightText)
  if (!left || !right) {
    return 0
  }
  if (left === right) {
    return 1
  }
  const containment = left.includes(right) || right.includes(left)
    ? Math.min(left.length, right.length) / Math.max(left.length, right.length)
    : 0
  const dice = computeDiceSimilarity(left, right)
  return Math.max(containment, dice)
}

function cueOverlapRatio(left: SubtitleCueRecord, right: SubtitleCueRecord): number {
  const overlapStart = Math.max(left.start_sec, right.start_sec)
  const overlapEnd = Math.min(left.end_sec, right.end_sec)
  const overlap = Math.max(0, overlapEnd - overlapStart)
  const leftDuration = Math.max(0.05, left.end_sec - left.start_sec)
  const rightDuration = Math.max(0.05, right.end_sec - right.start_sec)
  return overlap / Math.min(leftDuration, rightDuration)
}

function areLikelyDuplicateCue(left: SubtitleCueRecord, right: SubtitleCueRecord): boolean {
  const similarity = computeCueTextSimilarity(left.text, right.text)
  if (similarity < 0.72) {
    return false
  }
  const leftCenter = (left.start_sec + left.end_sec) * 0.5
  const rightCenter = (right.start_sec + right.end_sec) * 0.5
  const centerDiff = Math.abs(leftCenter - rightCenter)
  if (similarity >= 0.9 && centerDiff <= 1.4) {
    return true
  }
  if (centerDiff <= 0.65 && similarity >= 0.78) {
    return true
  }
  return cueOverlapRatio(left, right) >= 0.45 && similarity >= 0.74
}

function mergeDuplicateCue(base: SubtitleCueRecord, incoming: SubtitleCueRecord): SubtitleCueRecord {
  const preferIncomingText = incoming.text.trim().length >= base.text.trim().length
  return {
    ...base,
    text: preferIncomingText ? incoming.text : base.text,
    start_sec: Math.min(base.start_sec, incoming.start_sec),
    end_sec: Math.max(base.end_sec, incoming.end_sec),
    lang: incoming.lang ?? base.lang,
    speaker: incoming.speaker ?? base.speaker,
    line: incoming.line ?? base.line,
    speaker_changed: incoming.speaker_changed ?? base.speaker_changed,
    speaker_similarity: incoming.speaker_similarity ?? base.speaker_similarity,
  }
}

function dedupeCuesByTimeAndText(cues: SubtitleCueRecord[]): SubtitleCueRecord[] {
  const byExactKey = new Map<string, SubtitleCueRecord>()
  for (const cue of cues) {
    byExactKey.set(toCueDedupKey(cue), cue)
  }
  const ordered = Array.from(byExactKey.values()).sort((left, right) => left.start_sec - right.start_sec)
  const deduped: SubtitleCueRecord[] = []
  for (const cue of ordered) {
    let duplicateIndex = -1
    for (let index = deduped.length - 1; index >= Math.max(0, deduped.length - 8); index -= 1) {
      if (areLikelyDuplicateCue(deduped[index], cue)) {
        duplicateIndex = index
        break
      }
    }
    if (duplicateIndex >= 0) {
      deduped[duplicateIndex] = mergeDuplicateCue(deduped[duplicateIndex], cue)
      continue
    }
    deduped.push(cue)
  }
  return deduped
}

class SubtitleWorkerClient {
  private requestSeed = 0

  private readonly pending = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeout: ReturnType<typeof setTimeout>
    }
  >()

  constructor(private readonly worker: Worker) {
    this.worker.on('message', (message: unknown) => {
      this.handleMessage(message)
    })

    this.worker.on('error', (error) => {
      this.failAll(error)
    })

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        this.failAll(new Error(`subtitle_asr_worker_exit_${code}`))
      }
    })
  }

  async request(command: SubtitleWorkerCommand, payload: unknown, timeoutMs = 15_000): Promise<unknown> {
    const requestId = `subtitle-worker-${Date.now()}-${this.requestSeed++}`
    const requestPayload: SubtitleWorkerRequest = {
      kind: 'request',
      request_id: requestId,
      command,
      payload,
    }

    return await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`subtitle_asr_worker_timeout:${command}`))
      }, timeoutMs)

      this.pending.set(requestId, {
        resolve,
        reject,
        timeout,
      })

      try {
        this.worker.postMessage(requestPayload)
      } catch (error) {
        clearTimeout(timeout)
        this.pending.delete(requestId)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  async terminate(): Promise<void> {
    this.failAll(new Error('subtitle_asr_worker_terminated'))
    await this.worker.terminate()
  }

  private handleMessage(rawMessage: unknown): void {
    if (!rawMessage || typeof rawMessage !== 'object') {
      return
    }

    const message = rawMessage as Partial<SubtitleWorkerResponse>
    if (message.kind !== 'response' || typeof message.request_id !== 'string') {
      return
    }

    const pending = this.pending.get(message.request_id)
    if (!pending) {
      return
    }

    clearTimeout(pending.timeout)
    this.pending.delete(message.request_id)

    if (!message.ok) {
      pending.reject(new Error(message.error ?? 'subtitle_asr_worker_failed'))
      return
    }

    pending.resolve(message.payload)
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pending.clear()
  }
}

export class SubtitleSessionManager {
  private readonly sessions = new Map<number, SubtitleSessionState>()

  private readonly webContentsBound = new Set<number>()

  bindWebContents(webContents: WebContents): void {
    if (this.webContentsBound.has(webContents.id)) {
      return
    }

    this.webContentsBound.add(webContents.id)
    webContents.once('destroyed', () => {
      void this.stopSession(webContents.id, {
        reason: 'web-contents-destroyed',
      }).catch(() => undefined)
      this.webContentsBound.delete(webContents.id)
    })
  }

  async startSession(webContentsId: number, request: StartSubtitleSessionRequestDto): Promise<StartSubtitleSessionResponseDto> {
    const existingSession = this.sessions.get(webContentsId)
    if (existingSession) {
      await this.stopSession(webContentsId, { reason: 'restart' })
    }

    const engineStatus = probeSubtitleEngineStatus()
    if (!engineStatus.installed || !engineStatus.loadable || !engineStatus.moduleRoot) {
      throw new Error(`subtitle_engine_unavailable:${engineStatus.message ?? 'unknown'}`)
    }

    const workerPath = this.resolveWorkerScriptPath()
    const workerClient = new SubtitleWorkerClient(new Worker(workerPath))

    try {
      const payload = await workerClient.request(
        'init',
        {
          ...request,
          engine_module_root: engineStatus.moduleRoot,
          available_providers: engineStatus.availableProviders,
        },
        20_000,
      )

      const response = startSubtitleSessionResponseSchema.parse(payload)
      this.sessions.set(webContentsId, {
        sessionId: response.session_id,
        provider: response.provider,
        workerClient,
        persistence: null,
      })

      return response
    } catch (error) {
      await workerClient.terminate().catch(() => undefined)
      throw error
    }
  }

  async stopSession(webContentsId: number, request: StopSubtitleSessionRequestDto): Promise<StopSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return stopSubtitleSessionResponseSchema.parse({
        session_id: null,
        stopped: false,
        updated_at_ms: nowMs(),
      })
    }

    let responsePayload: unknown = null
    try {
      responsePayload = await session.workerClient.request('stop', request, 8_000)
    } catch {
      responsePayload = {
        session_id: session.sessionId,
        stopped: true,
        updated_at_ms: nowMs(),
      }
    } finally {
      await session.workerClient.terminate().catch(() => undefined)
      this.sessions.delete(webContentsId)
    }

    return stopSubtitleSessionResponseSchema.parse(responsePayload)
  }

  async startPersistence(
    webContentsId: number,
    request: StartSubtitlePersistenceRequestDto,
  ): Promise<StartSubtitlePersistenceResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return startSubtitlePersistenceResponseSchema.parse({
        enabled: false,
        subtitle_path: null,
        cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    const resolvedVideoPath = resolvePersistableVideoPath(request.video_path)
    if (!resolvedVideoPath) {
      return startSubtitlePersistenceResponseSchema.parse({
        enabled: false,
        subtitle_path: null,
        cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    const localeTag = normalizePersistenceLocaleTag(request.language)
    const subtitlePath = resolveAutoSubtitlePath(resolvedVideoPath, localeTag)
    try {
      await ensureParentDirectory(subtitlePath)

      let initialCues: SubtitleCueRecord[] = []
      if (request.reset_existing) {
        await fs.writeFile(subtitlePath, '', 'utf8')
      } else {
        const existingText = await fs.readFile(subtitlePath, 'utf8').catch((error: unknown) => {
          if ((error as { code?: string })?.code === 'ENOENT') {
            return ''
          }
          throw error
        })
        const legacyPath = path.join(
          path.dirname(resolvedVideoPath),
          `${path.basename(resolvedVideoPath, path.extname(resolvedVideoPath))}.auto-live.srt`,
        )
        const legacyText = !existingText
          ? await fs.readFile(legacyPath, 'utf8').catch((error: unknown) => {
              if ((error as { code?: string })?.code === 'ENOENT') {
                return ''
              }
              throw error
            })
          : ''
        const restoredText = existingText || legacyText
        if (restoredText && restoredText.trim()) {
          initialCues = parseSrtText(restoredText)
          if (!existingText && legacyText) {
            await fs.writeFile(subtitlePath, cuesToSrtText(initialCues), 'utf8')
          }
        }
      }

      session.persistence = {
        subtitlePath,
        cues: initialCues,
        lastAppliedEpoch: -1,
        lastAppliedChunkSeq: -1,
      }

      return startSubtitlePersistenceResponseSchema.parse({
        enabled: true,
        subtitle_path: subtitlePath,
        cue_count: initialCues.length,
        updated_at_ms: nowMs(),
      })
    } catch (error) {
      console.warn('[subtitle] start persistence disabled', {
        video_path: request.video_path,
        subtitle_path: subtitlePath,
        reason: error instanceof Error ? error.message : String(error),
      })
      return startSubtitlePersistenceResponseSchema.parse({
        enabled: false,
        subtitle_path: null,
        cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }
  }

  async appendPersistence(
    webContentsId: number,
    request: AppendSubtitlePersistenceRequestDto,
  ): Promise<AppendSubtitlePersistenceResponseDto> {
    const session = this.sessions.get(webContentsId)
    const persistence = session?.persistence
    if (!session || !persistence) {
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: null,
        cue_count: 0,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    if (request.session_epoch < persistence.lastAppliedEpoch) {
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    if (
      request.session_epoch === persistence.lastAppliedEpoch
      && request.chunk_seq <= persistence.lastAppliedChunkSeq
    ) {
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    const incomingCues = request.cues
      .map((cue) => toCueRecord(cue))
      .filter((cue) => cue.text.trim().length > 0)
      .map((cue) => ({
        ...cue,
        start_sec: Math.max(0, cue.start_sec),
        end_sec: Math.max(cue.start_sec + 0.12, cue.end_sec),
      }))
      .sort((left, right) => left.start_sec - right.start_sec)

    if (incomingCues.length === 0) {
      persistence.lastAppliedEpoch = request.session_epoch
      persistence.lastAppliedChunkSeq = request.chunk_seq
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: true,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    const batchStartSec = request.batch_start_sec ?? incomingCues[0].start_sec
    const batchEndSec = request.batch_end_sec ?? incomingCues[incomingCues.length - 1].end_sec
    const rangeStartSec = Math.max(0, Math.min(batchStartSec, batchEndSec))
    const rangeEndSec = Math.max(rangeStartSec, Math.max(batchStartSec, batchEndSec))
    const boundaryEpsSec = 0.25

    const existingRanges = mergeCueRanges(persistence.cues)
    const containingRange = existingRanges.find((range) => {
      return rangeStartSec >= range.startSec + boundaryEpsSec && rangeEndSec <= range.endSec - boundaryEpsSec
    })

    if (containingRange) {
      persistence.lastAppliedEpoch = request.session_epoch
      persistence.lastAppliedChunkSeq = request.chunk_seq
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: true,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: incomingCues.length,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    const replacedCueCount = persistence.cues.filter((cue) => cueOverlapsRange(cue, rangeStartSec, rangeEndSec)).length
    const remainingCues = persistence.cues.filter((cue) => !cueOverlapsRange(cue, rangeStartSec, rangeEndSec))
    const mergedCues = dedupeCuesByTimeAndText([...remainingCues, ...incomingCues])

    persistence.cues = mergedCues
    persistence.lastAppliedEpoch = request.session_epoch
    persistence.lastAppliedChunkSeq = request.chunk_seq

    const nextSrt = cuesToSrtText(persistence.cues)
    const tempPath = `${persistence.subtitlePath}.tmp`
    await fs.writeFile(tempPath, nextSrt, 'utf8')
    await fs.unlink(persistence.subtitlePath).catch(() => undefined)
    await fs.rename(tempPath, persistence.subtitlePath)

    return appendSubtitlePersistenceResponseSchema.parse({
      accepted: true,
      subtitle_path: persistence.subtitlePath,
      cue_count: persistence.cues.length,
      accepted_cue_count: incomingCues.length,
      skipped_inner_cue_count: 0,
      replaced_cue_count: replacedCueCount,
      updated_at_ms: nowMs(),
    })
  }

  async readPersistenceWindow(
    webContentsId: number,
    request: ReadSubtitlePersistenceWindowRequestDto,
  ): Promise<ReadSubtitlePersistenceWindowResponseDto> {
    const session = this.sessions.get(webContentsId)
    const persistence = session?.persistence
    if (!session || !persistence || persistence.cues.length === 0) {
      return readSubtitlePersistenceWindowResponseSchema.parse({
        subtitle_path: persistence?.subtitlePath ?? null,
        cues: [],
        generated_ranges: [],
        timeline_in_generated_range: false,
        timeline_has_cue: false,
        generated_start_sec: null,
        generated_end_sec: null,
        updated_at_ms: nowMs(),
      })
    }

    const rangeStart = Math.max(0, request.timeline_sec - request.backtrack_sec)
    const rangeEnd = request.timeline_sec + request.lookahead_sec
    const generatedRanges = mergeCueRanges(persistence.cues)
    const timelineInGeneratedRange = generatedRanges.some((range) => {
      return range.startSec - 0.01 <= request.timeline_sec && range.endSec + 0.01 >= request.timeline_sec
    })
    const timelineHasCue = persistence.cues.some((cue) => isCueAtTimeline(cue, request.timeline_sec))
    const matched = persistence.cues
      .filter((cue) => cue.end_sec + 0.001 >= rangeStart && cue.start_sec <= rangeEnd + 0.001)
      .slice(-request.limit)

    return readSubtitlePersistenceWindowResponseSchema.parse({
      subtitle_path: persistence.subtitlePath,
      cues: matched,
      generated_ranges: generatedRanges.map((range) => ({
        start_sec: range.startSec,
        end_sec: range.endSec,
      })),
      timeline_in_generated_range: timelineInGeneratedRange,
      timeline_has_cue: timelineHasCue,
      generated_start_sec: persistence.cues[0]?.start_sec ?? null,
      generated_end_sec: persistence.cues[persistence.cues.length - 1]?.end_sec ?? null,
      updated_at_ms: nowMs(),
    })
  }

  async resetSession(
    webContentsId: number,
    request: ResetSubtitleSessionRequestDto,
  ): Promise<ResetSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return resetSubtitleSessionResponseSchema.parse({
        session_id: null,
        ok: false,
        events: [
          {
            code: 'session_not_running',
            level: 'warning',
            message: 'subtitle session is not running',
            at_ms: nowMs(),
          },
        ],
        updated_at_ms: nowMs(),
      })
    }

    const payload = await session.workerClient.request('reset', request)
    return resetSubtitleSessionResponseSchema.parse(payload)
  }

  async flushSession(webContentsId: number): Promise<FlushSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return flushSubtitleSessionResponseSchema.parse({
        session_id: null,
        cues: [],
        preview: null,
        events: [],
        updated_at_ms: nowMs(),
      })
    }

    const payload = await session.workerClient.request('flush', {})
    return flushSubtitleSessionResponseSchema.parse(payload)
  }

  async pushAudio(webContentsId: number, request: PushSubtitleAudioRequestDto): Promise<PushSubtitleAudioResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return pushSubtitleAudioResponseSchema.parse({
        session_id: null,
        accepted: false,
        provider: null,
        cues: [],
        preview: null,
        events: [
          {
            code: 'session_not_running',
            level: 'warning',
            message: 'subtitle session is not running',
            at_ms: nowMs(),
          },
        ],
        updated_at_ms: nowMs(),
      })
    }

    const payload = await session.workerClient.request('push-audio', request)
    return pushSubtitleAudioResponseSchema.parse(payload)
  }

  private resolveWorkerScriptPath(): string {
    const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : ''
    const candidates: string[] = []

    if (mainEntry) {
      candidates.push(path.join(path.dirname(mainEntry), 'asrWorker.cjs'))
    }
    candidates.push(path.join(process.cwd(), 'dist-electron', 'asrWorker.cjs'))

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }

    throw new Error('subtitle_asr_worker_not_found')
  }
}
