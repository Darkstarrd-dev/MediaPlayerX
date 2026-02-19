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

const SUBTITLE_DEBUG_LOGS = false

interface UseLiveSubtitlesParams {
  enabled: boolean
  videoElement: HTMLVideoElement | null
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

function formatCueDisplayText(cue: SubtitleCueDto): string {
  if (typeof cue.speaker === 'number' && cue.speaker >= 0) {
    return `S${cue.speaker + 1}: ${cue.text}`
  }
  return cue.text
}

function buildAdvancedDisplayText(cues: SubtitleCueDto[], currentTimeSec: number): string | null {
  const activeCues = cues
    .filter((cue) => currentTimeSec + 0.35 >= cue.start_sec && currentTimeSec <= cue.end_sec + 2.4)
    .slice(-4)

  if (activeCues.length === 0) {
    return null
  }

  const lines: string[] = []
  for (let i = 0; i < activeCues.length; i += 1) {
    const cue = activeCues[i]
    const hasSpeaker = typeof cue.speaker === 'number' && cue.speaker >= 0
    const speakerLabel = hasSpeaker ? `S${cue.speaker! + 1}` : null

    if (!hasSpeaker) {
      lines.push(cue.text)
      continue
    }

    const previous = activeCues[i - 1]
    const sameSpeakerAsPrevious =
      i > 0 &&
      typeof previous?.speaker === 'number' &&
      previous.speaker === cue.speaker &&
      !cue.speaker_changed

    if (sameSpeakerAsPrevious && lines.length > 0) {
      lines[lines.length - 1] = `${lines[lines.length - 1]} ${cue.text}`.trim()
    } else {
      lines.push(`[${speakerLabel}] ${cue.text}`)
    }
  }

  return lines.join('\n').trim() || null
}

export function useLiveSubtitles({
  enabled,
  videoElement,
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

    if (!enabled || !videoElement || !modelId || modelDir.trim() === '') {
      setLoading(false)
      setMessage(null)
      setCues([])
      pushAbortRef.current?.abort()
      pushAbortRef.current = null
      pushQueueRef.current = []
      sessionRunningRef.current = false
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
      sessionEpochRef.current += 1
      chunkSeqRef.current = 0
      lastAppliedSeqRef.current = -1
      pushQueueRef.current = []
      pushAbortRef.current?.abort()
      pushAbortRef.current = null
      if (SUBTITLE_DEBUG_LOGS) {
        console.info('[subtitle][epoch]', reason, sessionEpochRef.current)
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

      pushInFlightRef.current = true
      try {
        const abortController = new AbortController()
        pushAbortRef.current = abortController
        const sendAt = performance.now()
        const request: PushSubtitleAudioRequestDto = {
          chunk_base64: encodeFloat32ToBase64(nextChunk.samples),
          sample_rate_hz: nextChunk.sampleRateHz,
          chunk_start_sec: nextChunk.startSec,
          chunk_end_sec: nextChunk.endSec,
          channel_count: nextChunk.channelCount,
          session_epoch: sessionEpoch,
          chunk_seq: chunkSeq,
        }
        const response = await pushSubtitleAudio(request, { signal: abortController.signal })

        if (response.session_epoch !== sessionEpochRef.current) {
          return
        }
        if (response.chunk_seq < lastAppliedSeqRef.current) {
          return
        }
        lastAppliedSeqRef.current = response.chunk_seq

        if (SUBTITLE_DEBUG_LOGS) {
          console.debug('[subtitle][push]', {
            epoch: sessionEpoch,
            seq: chunkSeq,
            rttMs: Math.round(performance.now() - sendAt),
            queueLen: pushQueueRef.current.length,
          })
        }

        if (!cancelled) {
          setCues((previous) => appendCues(previous, response.cues))
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : String(error))
        }
      } finally {
        pushAbortRef.current = null
        pushInFlightRef.current = false
        if (!cancelled) {
          void drainPushQueue()
        }
      }
    }

    const handleCuesAndEvents = (response: { cues: SubtitleCueDto[]; events: FlushSubtitleSessionResponseDto['events'] }) => {
      setCues((previous) => appendCues(previous, response.cues))
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

        await capture.attach(videoElement, (chunk) => {
          if (!sessionRunningRef.current || cancelled || videoElement.paused || videoElement.ended) {
            return
          }
          const highWaterMark = renderMode === 'advanced' ? 14 : 24
          if (pushQueueRef.current.length > highWaterMark) {
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
          }
          pushQueueRef.current.push(chunk)
          void drainPushQueue()
        })

        const onSeeked = () => {
          beginNewEpoch('seeked')
          setCues([])
          void resetSubtitleSession({ timeline_sec: Math.max(0, videoElement.currentTime || 0) }).catch(() => undefined)
        }
        const onPause = () => {
          void flushSubtitleSession()
            .then(handleCuesAndEvents)
            .catch(() => undefined)
        }
        const onPlay = () => {
          beginNewEpoch('play')
          void resetSubtitleSession({ timeline_sec: Math.max(0, videoElement.currentTime || 0) }).catch(() => undefined)
        }
        const onRateChange = () => {
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
          pushAbortRef.current?.abort()
          pushAbortRef.current = null
          capture.detach()
          sessionRunningRef.current = false
          await stopSubtitleSession({ reason: 'renderer-dispose' }).catch(() => undefined)
        }
      } catch (error) {
        if (sessionRunningRef.current) {
          await stopSubtitleSession({ reason: 'renderer-start-failed' }).catch(() => undefined)
        }
        pushAbortRef.current?.abort()
        pushAbortRef.current = null
        setLoading(false)
        const messageText = error instanceof Error ? error.message : String(error)
        setMessage(messageText)
        setCues([])
        sessionRunningRef.current = false
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
        pushAbortRef.current?.abort()
        pushAbortRef.current = null
        void stopSubtitleSession({ reason: 'renderer-dispose' }).catch(() => undefined)
      }
    }
  }, [
    capture,
    enabled,
    modelDir,
    modelId,
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
    repository.resetSubtitleSession,
    repository.startSubtitleSession,
    repository.stopSubtitleSession,
    videoElement,
  ])

  const activeText = useMemo(() => {
    if (renderMode === 'advanced') {
      return buildAdvancedDisplayText(cues, currentTimeSec)
    }

    for (let index = cues.length - 1; index >= 0; index -= 1) {
      const cue = cues[index]
      if (currentTimeSec >= cue.start_sec && currentTimeSec <= cue.end_sec) {
        return formatCueDisplayText(cue)
      }
    }

    for (let index = cues.length - 1; index >= 0; index -= 1) {
      const cue = cues[index]
      if (currentTimeSec + 0.15 >= cue.start_sec && currentTimeSec <= cue.end_sec + 0.5) {
        return formatCueDisplayText(cue)
      }
    }

    return null
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
