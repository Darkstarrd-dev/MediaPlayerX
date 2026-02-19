import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  FlushSubtitleSessionResponseDto,
  PushSubtitleAudioRequestDto,
  SubtitleCueDto,
  SubtitleSessionEventDto,
  SubtitleSessionProviderPreferenceDto,
} from '../../contracts/backend'
import type { MediaRepository } from '../backend/repository'
import { VideoSubtitleCapture, type CapturedAudioChunk } from './VideoSubtitleCapture'

function isSubtitleDebugEnabled(): boolean {
  if (typeof globalThis === 'undefined') {
    return false
  }
  try {
    const value = globalThis.localStorage?.getItem('subtitle.debug.logs')
    return value === '1' || value === 'true'
  } catch {
    return false
  }
}

function readSubtitleDebugBoolean(key: string): boolean {
  if (typeof globalThis === 'undefined') {
    return false
  }
  try {
    const raw = globalThis.localStorage?.getItem(key)
    return raw === '1' || raw === 'true'
  } catch {
    return false
  }
}

function readSubtitleDebugOffsetSec(): number {
  if (typeof globalThis === 'undefined') {
    return 0
  }
  try {
    const raw = globalThis.localStorage?.getItem('subtitle.debug.offsetSec')
    if (!raw) {
      return 0
    }
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      return 0
    }
    return Math.max(-2, Math.min(2, value))
  } catch {
    return 0
  }
}

function isAbortLikeError(error: unknown): boolean {
  if (!error) {
    return false
  }
  if (typeof error === 'object' && 'name' in error && (error as { name?: unknown }).name === 'AbortError') {
    return true
  }
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.trim().toLowerCase()
  if (!normalized) {
    return false
  }
  return (
    normalized.includes('abort') ||
    normalized.includes('cancel') ||
    normalized.includes('canceled') ||
    normalized.includes('cancelled') ||
    normalized.includes('请求已取消')
  )
}

type SubtitleDebugOffsetMode = 'off' | 'renderer'

function readSubtitleDebugOffsetMode(): SubtitleDebugOffsetMode {
  if (typeof globalThis === 'undefined') {
    return 'off'
  }
  try {
    const raw = (globalThis.localStorage?.getItem('subtitle.debug.offsetMode') ?? '').trim().toLowerCase()
    if (raw === 'off') {
      return 'off'
    }
    return 'renderer'
  } catch {
    return 'renderer'
  }
}

const SUBTITLE_DEBUG_LOGS = isSubtitleDebugEnabled()

function emitSubtitleDebug(event: string, payload: Record<string, unknown>): void {
  if (!SUBTITLE_DEBUG_LOGS) {
    return
  }
  console.info('[subtitle][metrics]', JSON.stringify({
    event,
    at_ms: Math.round(performance.now()),
    ...payload,
  }))
}

interface UseLiveSubtitlesParams {
  enabled: boolean
  videoElement: HTMLVideoElement | null
  videoPath: string | null
  currentTimeSec: number
  modelDir: string
  modelId: string | null
  providerPreference: SubtitleSessionProviderPreferenceDto
  language: string
  renderMode: 'simple' | 'advanced'
  advancedOptions: {
    vad: {
      preset: 'balanced' | 'conservative' | 'aggressive'
      threshold: number
      minSilenceSec: number
      minSpeechSec: number
      maxSpeechSec: number
    }
    speaker: {
      similarityThreshold: number
    }
  }
  repository: MediaRepository
}

interface PersistenceBatchPayload {
  cues: SubtitleCueDto[]
  sessionEpoch: number
  chunkSeq: number
  batchStartSec: number | null
  batchEndSec: number | null
}

interface PersistenceSyncState {
  timelineHasCue: boolean
  timelineInGeneratedRange: boolean
  activeRange: GeneratedRangeDto | null
}

interface GeneratedRangeDto {
  start_sec: number
  end_sec: number
}

function resolveActiveGeneratedRange(
  ranges: GeneratedRangeDto[],
  timelineSec: number,
): GeneratedRangeDto | null {
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]
    if (range.start_sec - 0.01 <= timelineSec && range.end_sec + 0.01 >= timelineSec) {
      return range
    }
  }
  return null
}

function toDisplayCue(cue: SubtitleCueDto): SubtitleCueDto {
  const originalStart = Math.max(0, cue.start_sec)
  const originalEnd = Math.max(originalStart + 0.12, cue.end_sec)
  const rawDurationSec = Math.max(0.12, originalEnd - originalStart)

  const normalizedText = cue.text.replace(/\s+/g, ' ').trim()
  const cjkCount = (normalizedText.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g) ?? []).length
  const latinOrDigitCount = (normalizedText.match(/[A-Za-z0-9]/g) ?? []).length
  const otherVisibleCount = Math.max(0, normalizedText.replace(/[\s]/g, '').length - cjkCount - latinOrDigitCount)
  const effectiveCharUnits = cjkCount + latinOrDigitCount * 0.45 + otherVisibleCount * 0.6

  const mappedLeadSec = (() => {
    const minChars = 3
    const maxChars = 20
    const minSec = 0.3
    const maxSec = 2
    const clampedChars = Math.max(minChars, Math.min(maxChars, effectiveCharUnits))
    const ratio = (clampedChars - minChars) / (maxChars - minChars)
    return minSec + ratio * (maxSec - minSec)
  })()

  const speechSecByChars = Math.max(0.25, Math.min(6, effectiveCharUnits * 0.17))
  const leadOffsetSec = mappedLeadSec + speechSecByChars

  const expandedStart = Math.max(0, originalStart - 0.5)
  const expandedEnd = Math.max(expandedStart + 0.25, originalEnd + 0.5)
  const shiftedStart = Math.max(0, expandedStart - leadOffsetSec)
  const displayDurationSec = Math.max(rawDurationSec + 0.5, speechSecByChars + 0.55, 0.85)
  const shiftedEnd = Math.max(shiftedStart + 0.25, shiftedStart + displayDurationSec, expandedEnd - leadOffsetSec)

  return {
    ...cue,
    start_sec: Number(shiftedStart.toFixed(3)),
    end_sec: Number(shiftedEnd.toFixed(3)),
  }
}

function toDisplayCues(cues: SubtitleCueDto[]): SubtitleCueDto[] {
  if (cues.length === 0) {
    return cues
  }
  return cues.map((cue) => toDisplayCue(cue))
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

function cueOverlapRatio(left: SubtitleCueDto, right: SubtitleCueDto): number {
  const overlapStart = Math.max(left.start_sec, right.start_sec)
  const overlapEnd = Math.min(left.end_sec, right.end_sec)
  const overlap = Math.max(0, overlapEnd - overlapStart)
  const leftDuration = Math.max(0.05, left.end_sec - left.start_sec)
  const rightDuration = Math.max(0.05, right.end_sec - right.start_sec)
  return overlap / Math.min(leftDuration, rightDuration)
}

function areLikelyDuplicateCue(left: SubtitleCueDto, right: SubtitleCueDto): boolean {
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

function mergeDuplicateCues(base: SubtitleCueDto, incoming: SubtitleCueDto): SubtitleCueDto {
  const mergedStart = Math.min(base.start_sec, incoming.start_sec)
  const mergedEnd = Math.max(base.end_sec, incoming.end_sec)
  const mergedText = incoming.text.trim().length >= base.text.trim().length ? incoming.text : base.text
  return {
    ...base,
    text: mergedText,
    start_sec: Number(mergedStart.toFixed(3)),
    end_sec: Number(mergedEnd.toFixed(3)),
    lang: incoming.lang ?? base.lang,
    speaker: incoming.speaker ?? base.speaker,
    line: incoming.line ?? base.line,
    speaker_changed: incoming.speaker_changed ?? base.speaker_changed,
    speaker_similarity: incoming.speaker_similarity ?? base.speaker_similarity,
  }
}

function hasCueAtTimeline(cues: SubtitleCueDto[], timelineSec: number): boolean {
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index]
    if (cue.start_sec - 0.01 <= timelineSec && cue.end_sec + 0.12 >= timelineSec) {
      return true
    }
  }
  return false
}

function isTimelineInRanges(ranges: GeneratedRangeDto[], timelineSec: number): boolean {
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]
    if (range.start_sec - 0.01 <= timelineSec && range.end_sec + 0.01 >= timelineSec) {
      return true
    }
  }
  return false
}

function encodeFloat32ToBase64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const next = bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize))
    binary += String.fromCharCode(...next)
  }
  return btoa(binary)
}

function appendCues(previous: SubtitleCueDto[], next: SubtitleCueDto[]): SubtitleCueDto[] {
  if (next.length === 0) {
    return previous
  }
  const mergedById = new Map<string, SubtitleCueDto>()
  for (const cue of [...previous, ...next]) {
    mergedById.set(cue.id, cue)
  }
  const ordered = Array.from(mergedById.values()).sort((left, right) => left.start_sec - right.start_sec)
  const deduped: SubtitleCueDto[] = []
  for (const cue of ordered) {
    let duplicateIndex = -1
    for (let index = deduped.length - 1; index >= Math.max(0, deduped.length - 8); index -= 1) {
      if (areLikelyDuplicateCue(deduped[index], cue)) {
        duplicateIndex = index
        break
      }
    }
    if (duplicateIndex >= 0) {
      deduped[duplicateIndex] = mergeDuplicateCues(deduped[duplicateIndex], cue)
      continue
    }
    deduped.push(cue)
  }
  return deduped.slice(-300)
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, part) => sum + part.length, 0)
  const output = new Float32Array(total)
  let offset = 0
  for (const part of chunks) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function popBatchChunk(queue: CapturedAudioChunk[], maxWallDurationSec = 0.4): CapturedAudioChunk | null {
  const first = queue.shift()
  if (!first) {
    return null
  }

  const maxSamples = Math.max(1, Math.floor(first.sampleRateHz * maxWallDurationSec) * Math.max(1, first.channelCount))
  const parts: Float32Array[] = [first.samples]
  let totalSamples = first.samples.length
  let endSec = first.endSec

  while (queue.length > 0) {
    const next = queue[0]
    if (next.sampleRateHz !== first.sampleRateHz || next.channelCount !== first.channelCount) {
      break
    }
    if (totalSamples + next.samples.length > maxSamples) {
      break
    }
    queue.shift()
    parts.push(next.samples)
    totalSamples += next.samples.length
    endSec = next.endSec
  }

  return {
    sampleRateHz: first.sampleRateHz,
    channelCount: first.channelCount,
    startSec: first.startSec,
    endSec,
    samples: parts.length === 1 ? first.samples : concatFloat32(parts),
  }
}

function pickDisplayEventMessage(events: SubtitleSessionEventDto[]): string | null {
  const selected = events.find((item) => {
    if (item.level === 'error') {
      return true
    }
    if (item.code === 'provider_fallback') {
      return false
    }
    if (item.code === 'session_not_running') {
      return false
    }
    return item.level === 'warning'
  })

  return selected?.message ?? null
}

function resolveCueTrack(cue: SubtitleCueDto): string {
  if (cue.line === 'A' || cue.line === 'B') {
    return cue.line
  }
  if (typeof cue.speaker === 'number' && cue.speaker >= 0) {
    return `S${cue.speaker + 1}`
  }
  return 'T'
}

function buildAdvancedDisplayText(
  cues: SubtitleCueDto[],
  currentTimeSec: number,
  offsetSec: number,
  offsetMode: SubtitleDebugOffsetMode,
  options?: {
    maxLines?: number
    includeTrackLabel?: boolean
  },
): string | null {
  const shouldApplyOffsetToRenderer = offsetMode === 'renderer'
  const adjustedCurrentTimeSec = shouldApplyOffsetToRenderer ? currentTimeSec - offsetSec : currentTimeSec
  const maxLines = Math.max(1, options?.maxLines ?? 2)
  const includeTrackLabel = options?.includeTrackLabel ?? true
  const activeCues = cues
    .filter((cue) => adjustedCurrentTimeSec + 0.35 >= cue.start_sec && adjustedCurrentTimeSec <= cue.end_sec + 2.4)
    .slice(-8)

  if (activeCues.length === 0) {
    return null
  }

  const lines: string[] = []
  let previousTrack: string | null = null
  for (let i = 0; i < activeCues.length; i += 1) {
    const cue = activeCues[i]
    const track = resolveCueTrack(cue)
    const sameTrackAsPrevious =
      i > 0 &&
      previousTrack === track &&
      !cue.speaker_changed

    if (sameTrackAsPrevious && lines.length > 0) {
      const previousLine = lines[lines.length - 1]
      const appended = includeTrackLabel
        ? previousLine
        : `${previousLine} ${cue.text}`.trim()
      lines[lines.length - 1] = includeTrackLabel
        ? `${previousLine} ${cue.text}`.trim()
        : appended
    } else {
      lines.push(includeTrackLabel ? `[${track}] ${cue.text}` : cue.text)
    }
    previousTrack = track
  }

  return lines.slice(-maxLines).join('\n').trim() || null
}

export function useLiveSubtitles({
  enabled,
  videoElement,
  videoPath,
  currentTimeSec,
  modelDir,
  modelId,
  providerPreference,
  language,
  renderMode,
  advancedOptions,
  repository,
}: UseLiveSubtitlesParams) {
  const vadPreset = advancedOptions.vad.preset
  const vadThreshold = advancedOptions.vad.threshold
  const vadMinSilenceSec = advancedOptions.vad.minSilenceSec
  const vadMinSpeechSec = advancedOptions.vad.minSpeechSec
  const vadMaxSpeechSec = advancedOptions.vad.maxSpeechSec
  const speakerSimilarityThreshold = advancedOptions.speaker.similarityThreshold

  const [cues, setCues] = useState<SubtitleCueDto[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const capture = useMemo(() => new VideoSubtitleCapture(), [])
  const cleanupRef = useRef<(() => Promise<void>) | null>(null)
  const pushQueueRef = useRef<CapturedAudioChunk[]>([])
  const pushInFlightRef = useRef(false)
  const sessionRunningRef = useRef(false)
  const sessionEpochRef = useRef(0)
  const chunkSeqRef = useRef(0)
  const lastAppliedSeqRef = useRef(-1)
  const pushAbortRef = useRef<AbortController | null>(null)
  const pushAbortCountRef = useRef(0)
  const subtitleOffsetSecRef = useRef(0)
  const subtitlePersistenceEnabledRef = useRef(false)
  const persistenceQueueRef = useRef<PersistenceBatchPayload[]>([])
  const persistenceInFlightRef = useRef(false)
  const replayFromPersistenceRef = useRef(false)
  const persistenceWindowCuesRef = useRef<SubtitleCueDto[]>([])
  const persistenceGeneratedRangesRef = useRef<GeneratedRangeDto[]>([])
  const persistenceReadInFlightRef = useRef(false)
  const persistenceLastReadAtMsRef = useRef(0)
  const persistenceLastReadTimelineSecRef = useRef(-1)
  const replayLockRangeRef = useRef<GeneratedRangeDto | null>(null)
  const highRateReplayHintShownRef = useRef(false)

  useEffect(() => {
    cleanupRef.current = null

    return () => {
      capture.dispose()
    }
  }, [capture])

  useEffect(() => {
    const startSubtitleSession =
      repository.startSubtitleSession ? (request: Parameters<NonNullable<MediaRepository['startSubtitleSession']>>[0]) => repository.startSubtitleSession!(request) : null
    const stopSubtitleSession =
      repository.stopSubtitleSession ? (request: Parameters<NonNullable<MediaRepository['stopSubtitleSession']>>[0]) => repository.stopSubtitleSession!(request) : null
    const resetSubtitleSession =
      repository.resetSubtitleSession
        ? (
            request: Parameters<NonNullable<MediaRepository['resetSubtitleSession']>>[0],
            options?: Parameters<NonNullable<MediaRepository['resetSubtitleSession']>>[1],
          ) => repository.resetSubtitleSession!(request, options)
        : null
    const flushSubtitleSession =
      repository.flushSubtitleSession
        ? (options?: Parameters<NonNullable<MediaRepository['flushSubtitleSession']>>[0]) => repository.flushSubtitleSession!(options)
        : null
    const pushSubtitleAudio =
      repository.pushSubtitleAudio
        ? (
            request: Parameters<NonNullable<MediaRepository['pushSubtitleAudio']>>[0],
            options?: Parameters<NonNullable<MediaRepository['pushSubtitleAudio']>>[1],
          ) => repository.pushSubtitleAudio!(request, options)
        : null
    const startSubtitlePersistence =
      repository.startSubtitlePersistence
        ? (
            request: Parameters<NonNullable<MediaRepository['startSubtitlePersistence']>>[0],
            options?: Parameters<NonNullable<MediaRepository['startSubtitlePersistence']>>[1],
          ) => repository.startSubtitlePersistence!(request, options)
        : null
    const appendSubtitlePersistence =
      repository.appendSubtitlePersistence
        ? (
            request: Parameters<NonNullable<MediaRepository['appendSubtitlePersistence']>>[0],
            options?: Parameters<NonNullable<MediaRepository['appendSubtitlePersistence']>>[1],
          ) => repository.appendSubtitlePersistence!(request, options)
        : null
    const readSubtitlePersistenceWindow =
      repository.readSubtitlePersistenceWindow
        ? (
            request: Parameters<NonNullable<MediaRepository['readSubtitlePersistenceWindow']>>[0],
            options?: Parameters<NonNullable<MediaRepository['readSubtitlePersistenceWindow']>>[1],
          ) => repository.readSubtitlePersistenceWindow!(request, options)
        : null

    if (!enabled || !videoElement || !modelId || modelDir.trim() === '') {
      setLoading(false)
      setMessage(null)
      setCues([])
      pushAbortRef.current?.abort()
      pushAbortRef.current = null
      pushQueueRef.current = []
      sessionRunningRef.current = false
      subtitlePersistenceEnabledRef.current = false
      persistenceQueueRef.current = []
      persistenceInFlightRef.current = false
      replayFromPersistenceRef.current = false
      persistenceWindowCuesRef.current = []
      persistenceGeneratedRangesRef.current = []
      persistenceReadInFlightRef.current = false
      persistenceLastReadAtMsRef.current = 0
      persistenceLastReadTimelineSecRef.current = -1
      replayLockRangeRef.current = null
      highRateReplayHintShownRef.current = false
      sessionEpochRef.current = 0
      chunkSeqRef.current = 0
      lastAppliedSeqRef.current = -1
      capture.detach()
      return
    }

    if (!startSubtitleSession || !stopSubtitleSession || !resetSubtitleSession || !flushSubtitleSession || !pushSubtitleAudio) {
      setLoading(false)
      setMessage('subtitle session API unavailable')
      setCues([])
      return
    }

    let cancelled = false

    const beginNewEpoch = (reason: string) => {
      if (pushAbortRef.current) {
        pushAbortRef.current.abort()
        pushAbortCountRef.current += 1
      }
      sessionEpochRef.current += 1
      chunkSeqRef.current = 0
      lastAppliedSeqRef.current = -1
      const droppedQueueLen = pushQueueRef.current.length
      pushQueueRef.current = []
      pushAbortRef.current = null
      persistenceQueueRef.current = []
      replayFromPersistenceRef.current = false
      replayLockRangeRef.current = null
      highRateReplayHintShownRef.current = false
      emitSubtitleDebug('renderer_epoch_begin', {
        reason,
        session_epoch: sessionEpochRef.current,
        dropped_queue_len: droppedQueueLen,
        push_abort_count: pushAbortCountRef.current,
      })
    }

    const syncPersistenceWindow = async (
      timelineSec: number,
      options?: { hydrateCues?: boolean; force?: boolean },
    ): Promise<PersistenceSyncState> => {
      if (!subtitlePersistenceEnabledRef.current || !readSubtitlePersistenceWindow) {
        return { timelineHasCue: false, timelineInGeneratedRange: false, activeRange: null }
      }

      const now = performance.now()
      const force = options?.force === true
      const hydrateCues = options?.hydrateCues === true
      const minIntervalMs = replayFromPersistenceRef.current ? 180 : 750
      if (
        !force
        && now - persistenceLastReadAtMsRef.current < minIntervalMs
        && Math.abs(timelineSec - persistenceLastReadTimelineSecRef.current) < 1.2
      ) {
        const timelineHasCue = hasCueAtTimeline(persistenceWindowCuesRef.current, timelineSec)
        const timelineInGeneratedRange = isTimelineInRanges(persistenceGeneratedRangesRef.current, timelineSec)
        return {
          timelineHasCue,
          timelineInGeneratedRange,
          activeRange: resolveActiveGeneratedRange(persistenceGeneratedRangesRef.current, timelineSec),
        }
      }
      if (persistenceReadInFlightRef.current && !force) {
        const timelineHasCue = hasCueAtTimeline(persistenceWindowCuesRef.current, timelineSec)
        const timelineInGeneratedRange = isTimelineInRanges(persistenceGeneratedRangesRef.current, timelineSec)
        return {
          timelineHasCue,
          timelineInGeneratedRange,
          activeRange: resolveActiveGeneratedRange(persistenceGeneratedRangesRef.current, timelineSec),
        }
      }

      persistenceReadInFlightRef.current = true
      persistenceLastReadAtMsRef.current = now
      persistenceLastReadTimelineSecRef.current = timelineSec
      try {
        const response = await readSubtitlePersistenceWindow({
          timeline_sec: timelineSec,
          backtrack_sec: 1,
          lookahead_sec: 3,
          limit: 30,
        })
        persistenceWindowCuesRef.current = response.cues
        persistenceGeneratedRangesRef.current = response.generated_ranges
        if (!cancelled && hydrateCues) {
          setCues(toDisplayCues(response.cues))
        }
        return {
          timelineHasCue: response.timeline_has_cue,
          timelineInGeneratedRange: response.timeline_in_generated_range,
          activeRange: resolveActiveGeneratedRange(response.generated_ranges, timelineSec),
        }
      } catch {
        if (!cancelled && hydrateCues) {
          setCues([])
        }
        return {
          timelineHasCue: false,
          timelineInGeneratedRange: false,
          activeRange: null,
        }
      } finally {
        persistenceReadInFlightRef.current = false
      }
    }

    const drainPushQueue = async () => {
      if (pushInFlightRef.current || cancelled || !sessionRunningRef.current) {
        return
      }
      const nextChunk = popBatchChunk(pushQueueRef.current, renderMode === 'advanced' ? 0.2 : 0.35)
      if (!nextChunk) {
        return
      }

      const sessionEpoch = sessionEpochRef.current
      const chunkSeq = chunkSeqRef.current++
      const queueLenBeforePush = pushQueueRef.current.length
      const playbackTimeSec = Math.max(0, videoElement.currentTime || 0)
      subtitleOffsetSecRef.current = readSubtitleDebugOffsetSec()
      const offsetMode = readSubtitleDebugOffsetMode()
      const chunkStartSec = nextChunk.startSec
      const chunkEndSec = nextChunk.endSec

      pushInFlightRef.current = true
      try {
        const abortController = new AbortController()
        pushAbortRef.current = abortController
        const sendAt = performance.now()
        const request: PushSubtitleAudioRequestDto = {
          chunk_base64: encodeFloat32ToBase64(nextChunk.samples),
          sample_rate_hz: nextChunk.sampleRateHz,
          chunk_start_sec: chunkStartSec,
          chunk_end_sec: chunkEndSec,
          channel_count: nextChunk.channelCount,
          session_epoch: sessionEpoch,
          chunk_seq: chunkSeq,
        }
        const response = await pushSubtitleAudio(request, { signal: abortController.signal })
        const rttMs = Math.round(performance.now() - sendAt)

        if (response.session_epoch !== sessionEpochRef.current) {
          emitSubtitleDebug('renderer_push_drop_epoch_mismatch', {
            request_epoch: sessionEpoch,
            response_epoch: response.session_epoch,
            chunk_seq: chunkSeq,
          })
          return
        }
        if (response.chunk_seq < lastAppliedSeqRef.current) {
          emitSubtitleDebug('renderer_push_drop_out_of_order', {
            chunk_seq: response.chunk_seq,
            last_applied_seq: lastAppliedSeqRef.current,
          })
          return
        }
        lastAppliedSeqRef.current = response.chunk_seq

        emitSubtitleDebug('renderer_push_result', {
          session_epoch: sessionEpoch,
          chunk_seq: chunkSeq,
          playback_time_sec: Number(playbackTimeSec.toFixed(3)),
          chunk_start_sec: Number(nextChunk.startSec.toFixed(3)),
          chunk_end_sec: Number(nextChunk.endSec.toFixed(3)),
          chunk_duration_sec: Number((nextChunk.endSec - nextChunk.startSec).toFixed(3)),
          asr_chunk_start_sec: Number(chunkStartSec.toFixed(3)),
          asr_chunk_end_sec: Number(chunkEndSec.toFixed(3)),
          queue_len_before_push: queueLenBeforePush,
          queue_len_after_push: pushQueueRef.current.length,
          chunk_rtt_ms: rttMs,
          offset_sec: subtitleOffsetSecRef.current,
          offset_mode: offsetMode,
          push_abort_count: pushAbortCountRef.current,
          response_events: response.events.map((item) => item.code),
          response_cues: response.cues.length,
        })

        if (!cancelled) {
          setCues((previous) => appendCues(previous, response.cues))
          enqueuePersistenceCues(
            response.cues,
            response.session_epoch,
            response.chunk_seq,
            nextChunk.startSec,
            nextChunk.endSec,
          )
        }
      } catch (error) {
        if (!cancelled && !isAbortLikeError(error)) {
          setMessage(error instanceof Error ? error.message : String(error))
          emitSubtitleDebug('renderer_push_error', {
            session_epoch: sessionEpoch,
            chunk_seq: chunkSeq,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      } finally {
        pushAbortRef.current = null
        pushInFlightRef.current = false
        if (!cancelled) {
          void drainPushQueue()
        }
      }
    }

    const drainPersistenceQueue = async () => {
      if (persistenceInFlightRef.current || cancelled || !subtitlePersistenceEnabledRef.current || !appendSubtitlePersistence) {
        return
      }
      if (persistenceQueueRef.current.length === 0) {
        return
      }

      persistenceInFlightRef.current = true
      try {
        const batches = persistenceQueueRef.current
        persistenceQueueRef.current = []
        for (const batch of batches) {
          await appendSubtitlePersistence({
            cues: batch.cues,
            session_epoch: batch.sessionEpoch,
            chunk_seq: batch.chunkSeq,
            batch_start_sec: batch.batchStartSec,
            batch_end_sec: batch.batchEndSec,
          })
        }
      } catch {
        // ignore subtitle persistence failures during playback
      } finally {
        persistenceInFlightRef.current = false
        if (!cancelled && persistenceQueueRef.current.length > 0) {
          void drainPersistenceQueue()
        }
      }
    }

    const enqueuePersistenceCues = (
      nextCues: SubtitleCueDto[],
      sessionEpoch: number,
      chunkSeq: number,
      batchStartSec: number | null,
      batchEndSec: number | null,
    ) => {
      if (!subtitlePersistenceEnabledRef.current || nextCues.length === 0) {
        return
      }
      persistenceQueueRef.current.push({
        cues: nextCues,
        sessionEpoch,
        chunkSeq,
        batchStartSec,
        batchEndSec,
      })
      void drainPersistenceQueue()
    }

    const handleCuesAndEvents = (response: { cues: SubtitleCueDto[]; events: FlushSubtitleSessionResponseDto['events'] }) => {
      setCues((previous) => appendCues(previous, response.cues))
      const startSec = response.cues.length > 0 ? response.cues[0].start_sec : null
      const endSec = response.cues.length > 0 ? response.cues[response.cues.length - 1].end_sec : null
      enqueuePersistenceCues(
        response.cues,
        sessionEpochRef.current,
        Math.max(0, lastAppliedSeqRef.current),
        startSec,
        endSec,
      )
      const displayMessage = pickDisplayEventMessage(response.events)
      if (displayMessage) {
        setMessage(displayMessage)
      }
    }

    const start = async () => {
      setLoading(true)
      setMessage(null)
      setCues([])
      beginNewEpoch('start')

      try {
        const startResponse = await startSubtitleSession({
          model_dir: modelDir,
          model_id: modelId,
          provider_preference: providerPreference,
          language: language.trim() || 'auto',
          fallback_to_cpu: true,
          render_mode: renderMode,
          advanced_options:
            renderMode === 'advanced'
              ? {
                  vad: {
                    preset: vadPreset,
                    threshold: vadThreshold,
                    min_silence_sec: vadMinSilenceSec,
                    min_speech_sec: vadMinSpeechSec,
                    max_speech_sec: vadMaxSpeechSec,
                  },
                  speaker: {
                    similarity_threshold: speakerSimilarityThreshold,
                  },
                }
              : undefined,
        })

        if (cancelled) {
          await stopSubtitleSession({ reason: 'cancelled-before-ready' }).catch(() => undefined)
          return
        }

        sessionRunningRef.current = true
        setMessage(pickDisplayEventMessage(startResponse.events))

        subtitlePersistenceEnabledRef.current = false
        persistenceQueueRef.current = []
        replayFromPersistenceRef.current = false
        replayLockRangeRef.current = null
        highRateReplayHintShownRef.current = false
        persistenceWindowCuesRef.current = []
        persistenceGeneratedRangesRef.current = []
        persistenceLastReadAtMsRef.current = 0
        persistenceLastReadTimelineSecRef.current = -1
        if (startSubtitlePersistence && videoPath && videoPath.trim() !== '') {
          try {
            const persistenceResponse = await startSubtitlePersistence({
              video_path: videoPath,
              language: language.trim() || 'auto',
              reset_existing: false,
            })
            subtitlePersistenceEnabledRef.current = persistenceResponse.enabled
            if (persistenceResponse.enabled) {
              const timelineSec = Math.max(0, videoElement.currentTime || 0)
              replayFromPersistenceRef.current = true
              const persistedState = await syncPersistenceWindow(timelineSec, {
                hydrateCues: true,
                force: true,
              })
              replayFromPersistenceRef.current = persistedState.timelineInGeneratedRange
              replayLockRangeRef.current = persistedState.timelineInGeneratedRange
                ? persistedState.activeRange
                : null
            }
          } catch (error) {
            subtitlePersistenceEnabledRef.current = false
            if (!cancelled && !isAbortLikeError(error)) {
              setMessage(error instanceof Error ? error.message : String(error))
            }
          }
        }

        await capture.attach(videoElement, (chunk) => {
          if (!sessionRunningRef.current || cancelled || videoElement.paused || videoElement.ended) {
            return
          }

          const timelineSec = Math.max(0, chunk.endSec)
          const playbackRate = Math.max(0.1, videoElement.playbackRate || 1)
          const lockRange = replayLockRangeRef.current
          if (lockRange) {
            if (timelineSec >= lockRange.start_sec - 0.02 && timelineSec <= lockRange.end_sec + 0.03) {
              replayFromPersistenceRef.current = true
            } else if (timelineSec > lockRange.end_sec + 0.03) {
              replayLockRangeRef.current = null
              replayFromPersistenceRef.current = false
              setCues([])
            }
          }

          const cachedHasCue = hasCueAtTimeline(persistenceWindowCuesRef.current, timelineSec)
          if (cachedHasCue) {
            replayFromPersistenceRef.current = true
          }

          if (playbackRate > 2.05 && subtitlePersistenceEnabledRef.current && readSubtitlePersistenceWindow) {
            replayFromPersistenceRef.current = true
            if (!highRateReplayHintShownRef.current) {
              highRateReplayHintShownRef.current = true
              setMessage('播放速度超过 2x：切换为仅回放已生成字幕')
            }
            void syncPersistenceWindow(timelineSec, {
              hydrateCues: true,
              force: false,
            }).then((result) => {
              if (cancelled) {
                return
              }
              replayFromPersistenceRef.current = result.timelineInGeneratedRange
              replayLockRangeRef.current = result.timelineInGeneratedRange ? result.activeRange : null
            })
            return
          }
          if (highRateReplayHintShownRef.current && playbackRate <= 2.01) {
            highRateReplayHintShownRef.current = false
            setMessage((previous) => (
              previous === '播放速度超过 2x：切换为仅回放已生成字幕'
                ? null
                : previous
            ))
          }

          if (subtitlePersistenceEnabledRef.current && readSubtitlePersistenceWindow) {
            const cachedInGeneratedRange = isTimelineInRanges(persistenceGeneratedRangesRef.current, timelineSec)
            const shouldRefreshPersistence =
              replayFromPersistenceRef.current
              || cachedInGeneratedRange
              || Math.abs(timelineSec - persistenceLastReadTimelineSecRef.current) >= 2
            if (shouldRefreshPersistence) {
              void syncPersistenceWindow(timelineSec, {
                hydrateCues: replayFromPersistenceRef.current || cachedHasCue,
                force: replayFromPersistenceRef.current || cachedInGeneratedRange,
              }).then((result) => {
                if (cancelled) {
                  return
                }
                replayFromPersistenceRef.current = result.timelineInGeneratedRange
                replayLockRangeRef.current = result.timelineInGeneratedRange ? result.activeRange : null
              })
            }
          }

          if (replayFromPersistenceRef.current) {
            emitSubtitleDebug('renderer_skip_generation_for_persisted_cue', {
              timeline_sec: Number(timelineSec.toFixed(3)),
            })
            return
          }

          const highWaterMark =
            playbackRate <= 1.5
              ? (renderMode === 'advanced' ? 18 : 28)
              : playbackRate <= 2.5
                ? (renderMode === 'advanced' ? 30 : 42)
                : (renderMode === 'advanced' ? 50 : 60)
          if (pushQueueRef.current.length > highWaterMark) {
            const queueLenBeforeCompaction = pushQueueRef.current.length
            const first = pushQueueRef.current.shift()
            const second = pushQueueRef.current.shift()
            if (first && second) {
              pushQueueRef.current.unshift({
                sampleRateHz: first.sampleRateHz,
                channelCount: first.channelCount,
                startSec: first.startSec,
                endSec: second.endSec,
                samples: concatFloat32([first.samples, second.samples]),
              })
            } else {
              if (first) {
                pushQueueRef.current.unshift(first)
              }
              if (second) {
                pushQueueRef.current.unshift(second)
              }
            }
            emitSubtitleDebug('renderer_queue_compaction', {
              mode: renderMode,
              high_water_mark: highWaterMark,
              queue_len_before: queueLenBeforeCompaction,
              queue_len_after: pushQueueRef.current.length,
            })
          }
          pushQueueRef.current.push(chunk)
          emitSubtitleDebug('renderer_capture_chunk', {
            mode: renderMode,
            playback_time_sec: Number(Math.max(0, videoElement.currentTime || 0).toFixed(3)),
            chunk_start_sec: Number(chunk.startSec.toFixed(3)),
            chunk_end_sec: Number(chunk.endSec.toFixed(3)),
            offset_sec: subtitleOffsetSecRef.current,
            offset_mode: readSubtitleDebugOffsetMode(),
            queue_len: pushQueueRef.current.length,
          })
          void drainPushQueue()
        })

        const onSeeked = () => {
          beginNewEpoch('seeked')
          const timelineSec = Math.max(0, videoElement.currentTime || 0)
          if (subtitlePersistenceEnabledRef.current && readSubtitlePersistenceWindow) {
            replayFromPersistenceRef.current = true
            void syncPersistenceWindow(timelineSec, { hydrateCues: true, force: true })
              .then((result) => {
                if (!cancelled) {
                  replayFromPersistenceRef.current = result.timelineInGeneratedRange
                  replayLockRangeRef.current = result.timelineInGeneratedRange ? result.activeRange : null
                }
              })
              .catch(() => {
                if (!cancelled) {
                  replayFromPersistenceRef.current = false
                  replayLockRangeRef.current = null
                  setCues([])
                }
              })
          } else {
            replayFromPersistenceRef.current = false
            replayLockRangeRef.current = null
            setCues([])
          }

          if (readSubtitleDebugBoolean('subtitle.debug.suppressControlResets')) {
            emitSubtitleDebug('renderer_control_event_ignored', {
              reason: 'seeked',
              current_time_sec: Number(Math.max(0, videoElement.currentTime || 0).toFixed(3)),
            })
            return
          }
          void resetSubtitleSession({ timeline_sec: Math.max(0, videoElement.currentTime || 0) }).catch(() => undefined)
        }
        const onPause = () => {
          void flushSubtitleSession()
            .then(handleCuesAndEvents)
            .catch(() => undefined)
        }
        const onPlay = () => {
          if (readSubtitleDebugBoolean('subtitle.debug.suppressControlResets')) {
            emitSubtitleDebug('renderer_control_event_ignored', {
              reason: 'play',
              current_time_sec: Number(Math.max(0, videoElement.currentTime || 0).toFixed(3)),
            })
            return
          }
          beginNewEpoch('play')
          void resetSubtitleSession({ timeline_sec: Math.max(0, videoElement.currentTime || 0) }).catch(() => undefined)
        }
        const onRateChange = () => {
          if (readSubtitleDebugBoolean('subtitle.debug.suppressControlResets')) {
            emitSubtitleDebug('renderer_control_event_ignored', {
              reason: 'ratechange',
              current_time_sec: Number(Math.max(0, videoElement.currentTime || 0).toFixed(3)),
              playback_rate: Number((videoElement.playbackRate || 1).toFixed(3)),
            })
            return
          }
          beginNewEpoch('ratechange')
          setCues([])
          void resetSubtitleSession({ timeline_sec: Math.max(0, videoElement.currentTime || 0) }).catch(() => undefined)
        }

        videoElement.addEventListener('seeked', onSeeked)
        videoElement.addEventListener('pause', onPause)
        videoElement.addEventListener('play', onPlay)
        videoElement.addEventListener('ratechange', onRateChange)

        if (cancelled) {
          videoElement.removeEventListener('seeked', onSeeked)
          videoElement.removeEventListener('pause', onPause)
          videoElement.removeEventListener('play', onPlay)
          videoElement.removeEventListener('ratechange', onRateChange)
          await stopSubtitleSession({ reason: 'cancelled-after-ready' }).catch(() => undefined)
          sessionRunningRef.current = false
          capture.detach()
          return
        }

        setLoading(false)

        cleanupRef.current = async () => {
          videoElement.removeEventListener('seeked', onSeeked)
          videoElement.removeEventListener('pause', onPause)
          videoElement.removeEventListener('play', onPlay)
          videoElement.removeEventListener('ratechange', onRateChange)
          pushQueueRef.current = []
          if (pushAbortRef.current) {
            pushAbortRef.current.abort()
            pushAbortCountRef.current += 1
          }
          pushAbortRef.current = null
          capture.detach()
          sessionRunningRef.current = false
          subtitlePersistenceEnabledRef.current = false
          persistenceQueueRef.current = []
          persistenceInFlightRef.current = false
          replayFromPersistenceRef.current = false
          replayLockRangeRef.current = null
          highRateReplayHintShownRef.current = false
          persistenceWindowCuesRef.current = []
          persistenceGeneratedRangesRef.current = []
          persistenceReadInFlightRef.current = false
          persistenceLastReadAtMsRef.current = 0
          persistenceLastReadTimelineSecRef.current = -1
          await stopSubtitleSession({ reason: 'renderer-dispose' }).catch(() => undefined)
        }
      } catch (error) {
        if (sessionRunningRef.current) {
          await stopSubtitleSession({ reason: 'renderer-start-failed' }).catch(() => undefined)
        }
        if (pushAbortRef.current) {
          pushAbortRef.current.abort()
          pushAbortCountRef.current += 1
        }
        pushAbortRef.current = null
        setLoading(false)
        const messageText = error instanceof Error ? error.message : String(error)
        setMessage(messageText)
        setCues([])
        sessionRunningRef.current = false
        subtitlePersistenceEnabledRef.current = false
        persistenceQueueRef.current = []
        persistenceInFlightRef.current = false
        replayFromPersistenceRef.current = false
        replayLockRangeRef.current = null
        highRateReplayHintShownRef.current = false
        persistenceWindowCuesRef.current = []
        persistenceGeneratedRangesRef.current = []
        persistenceReadInFlightRef.current = false
        persistenceLastReadAtMsRef.current = 0
        persistenceLastReadTimelineSecRef.current = -1
        capture.detach()
      }
    }

    void start()

    return () => {
      cancelled = true
      const cleanup = cleanupRef.current
      cleanupRef.current = null
      if (cleanup) {
        void cleanup()
      } else {
        capture.detach()
        sessionRunningRef.current = false
        if (pushAbortRef.current) {
          pushAbortRef.current.abort()
          pushAbortCountRef.current += 1
        }
        pushAbortRef.current = null
        subtitlePersistenceEnabledRef.current = false
        persistenceQueueRef.current = []
        persistenceInFlightRef.current = false
        replayFromPersistenceRef.current = false
        replayLockRangeRef.current = null
        highRateReplayHintShownRef.current = false
        persistenceWindowCuesRef.current = []
        persistenceGeneratedRangesRef.current = []
        persistenceReadInFlightRef.current = false
        persistenceLastReadAtMsRef.current = 0
        persistenceLastReadTimelineSecRef.current = -1
        void stopSubtitleSession({ reason: 'renderer-dispose' }).catch(() => undefined)
      }
    }
  }, [
    capture,
    enabled,
    modelDir,
    modelId,
    videoPath,
    providerPreference,
    language,
    renderMode,
    vadPreset,
    vadThreshold,
    vadMinSilenceSec,
    vadMinSpeechSec,
    vadMaxSpeechSec,
    speakerSimilarityThreshold,
    repository.flushSubtitleSession,
    repository.pushSubtitleAudio,
    repository.startSubtitlePersistence,
    repository.appendSubtitlePersistence,
    repository.readSubtitlePersistenceWindow,
    repository.resetSubtitleSession,
    repository.startSubtitleSession,
    repository.stopSubtitleSession,
    videoElement,
  ])

  const activeText = useMemo(() => {
    const subtitleOffsetSec = readSubtitleDebugOffsetSec()
    const offsetMode = readSubtitleDebugOffsetMode()

    if (renderMode === 'advanced') {
      return buildAdvancedDisplayText(cues, currentTimeSec, subtitleOffsetSec, offsetMode, {
        maxLines: 2,
        includeTrackLabel: true,
      })
    }

    return buildAdvancedDisplayText(cues, currentTimeSec, subtitleOffsetSec, offsetMode, {
      maxLines: 1,
      includeTrackLabel: false,
    })
  }, [cues, currentTimeSec, renderMode])

  const detectedLanguage = useMemo(() => {
    for (let index = cues.length - 1; index >= 0; index -= 1) {
      const cue = cues[index]
      if (cue.lang && cue.lang.trim()) {
        return cue.lang.trim().toLowerCase()
      }
    }
    return null
  }, [cues])

  return {
    loading,
    message,
    activeText,
    detectedLanguage,
  }
}
