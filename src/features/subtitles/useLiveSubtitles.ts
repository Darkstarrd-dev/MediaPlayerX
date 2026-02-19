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
  const merged = [...previous, ...next]
  const dedupedById = new Map<string, SubtitleCueDto>()
  for (const cue of merged) {
    dedupedById.set(cue.id, cue)
  }
  const ordered = Array.from(dedupedById.values()).sort((left, right) => left.start_sec - right.start_sec)
  return ordered.slice(-300)
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
  const persistenceQueueRef = useRef<SubtitleCueDto[]>([])
  const persistenceInFlightRef = useRef(false)

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
      emitSubtitleDebug('renderer_epoch_begin', {
        reason,
        session_epoch: sessionEpochRef.current,
        dropped_queue_len: droppedQueueLen,
        push_abort_count: pushAbortCountRef.current,
      })
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
          enqueuePersistenceCues(response.cues)
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
        const cues = persistenceQueueRef.current
        persistenceQueueRef.current = []
        await appendSubtitlePersistence({ cues })
      } catch {
        // ignore subtitle persistence failures during playback
      } finally {
        persistenceInFlightRef.current = false
        if (!cancelled && persistenceQueueRef.current.length > 0) {
          void drainPersistenceQueue()
        }
      }
    }

    const enqueuePersistenceCues = (nextCues: SubtitleCueDto[]) => {
      if (!subtitlePersistenceEnabledRef.current || nextCues.length === 0) {
        return
      }
      persistenceQueueRef.current.push(...nextCues)
      void drainPersistenceQueue()
    }

    const handleCuesAndEvents = (response: { cues: SubtitleCueDto[]; events: FlushSubtitleSessionResponseDto['events'] }) => {
      setCues((previous) => appendCues(previous, response.cues))
      enqueuePersistenceCues(response.cues)
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
        if (startSubtitlePersistence && videoPath && videoPath.trim() !== '') {
          try {
            const persistenceResponse = await startSubtitlePersistence({
              video_path: videoPath,
              language: language.trim() || 'auto',
              reset_existing: true,
            })
            subtitlePersistenceEnabledRef.current = persistenceResponse.enabled
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
          const highWaterMark = renderMode === 'advanced' ? 14 : 24
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
            void readSubtitlePersistenceWindow({
              timeline_sec: timelineSec,
              backtrack_sec: 1,
              lookahead_sec: 3,
              limit: 24,
            })
              .then((response) => {
                if (!cancelled) {
                  setCues(response.cues)
                }
              })
              .catch(() => {
                if (!cancelled) {
                  setCues([])
                }
              })
          } else {
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
