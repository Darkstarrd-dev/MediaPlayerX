import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  FlushSubtitleSessionResponseDto,
  PushSubtitleAudioRequestDto,
  SubtitleCueDto,
  SubtitleSessionProviderPreferenceDto,
} from '../../contracts/backend'
import type { MediaRepository } from '../backend/repository'
import { VideoSubtitleCapture, type CapturedAudioChunk } from './VideoSubtitleCapture'

interface UseLiveSubtitlesParams {
  enabled: boolean
  videoElement: HTMLVideoElement | null
  currentTimeSec: number
  modelDir: string
  modelId: string | null
  providerPreference: SubtitleSessionProviderPreferenceDto
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

export function useLiveSubtitles({
  enabled,
  videoElement,
  currentTimeSec,
  modelDir,
  modelId,
  providerPreference,
  repository,
}: UseLiveSubtitlesParams) {
  const [cues, setCues] = useState<SubtitleCueDto[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const capture = useMemo(() => new VideoSubtitleCapture(), [])
  const cleanupRef = useRef<(() => Promise<void>) | null>(null)
  const pushQueueRef = useRef<CapturedAudioChunk[]>([])
  const pushInFlightRef = useRef(false)
  const sessionRunningRef = useRef(false)

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
      repository.resetSubtitleSession ? (request: Parameters<NonNullable<MediaRepository['resetSubtitleSession']>>[0]) => repository.resetSubtitleSession!(request) : null
    const flushSubtitleSession =
      repository.flushSubtitleSession ? () => repository.flushSubtitleSession!() : null
    const pushSubtitleAudio =
      repository.pushSubtitleAudio ? (request: Parameters<NonNullable<MediaRepository['pushSubtitleAudio']>>[0]) => repository.pushSubtitleAudio!(request) : null
    const listSubtitleLocalModels =
      repository.listSubtitleLocalModels
        ? (request: Parameters<NonNullable<MediaRepository['listSubtitleLocalModels']>>[0]) => repository.listSubtitleLocalModels!(request)
        : null

    if (!enabled || !videoElement || !modelId || modelDir.trim() === '') {
      setLoading(false)
      setMessage(null)
      setCues([])
      pushQueueRef.current = []
      sessionRunningRef.current = false
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

    const drainPushQueue = async () => {
      if (pushInFlightRef.current || cancelled || !sessionRunningRef.current) {
        return
      }
      const nextChunk = pushQueueRef.current.shift()
      if (!nextChunk) {
        return
      }

      pushInFlightRef.current = true
      try {
        const request: PushSubtitleAudioRequestDto = {
          chunk_base64: encodeFloat32ToBase64(nextChunk.samples),
          sample_rate_hz: nextChunk.sampleRateHz,
          chunk_start_sec: nextChunk.startSec,
          chunk_end_sec: nextChunk.endSec,
          channel_count: nextChunk.channelCount,
        }
        const response = await pushSubtitleAudio(request)
        if (!cancelled) {
          setCues((previous) => appendCues(previous, response.cues))
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : String(error))
        }
      } finally {
        pushInFlightRef.current = false
        if (!cancelled) {
          void drainPushQueue()
        }
      }
    }

    const handleCuesAndEvents = (response: { cues: SubtitleCueDto[]; events: FlushSubtitleSessionResponseDto['events'] }) => {
      setCues((previous) => appendCues(previous, response.cues))
      const warning = response.events.find((item) => item.level !== 'info')
      if (warning) {
        setMessage(warning.message)
      }
    }

    const start = async () => {
      setLoading(true)
      setMessage(null)
      setCues([])
      pushQueueRef.current = []

      try {
        if (listSubtitleLocalModels) {
          const localResponse = await listSubtitleLocalModels({ model_dir: modelDir })
          const installed = localResponse.models.some((item) => item.id === modelId)
          if (!installed) {
            setLoading(false)
            setCues([])
            setMessage(`subtitle_model_missing_local:${modelDir}:${modelId}`)
            return
          }
        }

        const startResponse = await startSubtitleSession({
          model_dir: modelDir,
          model_id: modelId,
          provider_preference: providerPreference,
          language: 'auto',
          fallback_to_cpu: true,
        })

        if (cancelled) {
          await stopSubtitleSession({ reason: 'cancelled-before-ready' }).catch(() => undefined)
          return
        }

        sessionRunningRef.current = true
        const firstEvent = startResponse.events.find((item) => item.level !== 'info')
        setMessage(firstEvent?.message ?? null)

        await capture.attach(videoElement, (chunk) => {
          if (!sessionRunningRef.current || cancelled || videoElement.paused || videoElement.ended) {
            return
          }
          if (pushQueueRef.current.length > 8) {
            pushQueueRef.current.shift()
          }
          pushQueueRef.current.push(chunk)
          void drainPushQueue()
        })

        const onSeeked = () => {
          pushQueueRef.current = []
          setCues([])
          void resetSubtitleSession({ timeline_sec: Math.max(0, videoElement.currentTime || 0) }).catch(() => undefined)
        }
        const onPause = () => {
          void flushSubtitleSession()
            .then(handleCuesAndEvents)
            .catch(() => undefined)
        }
        const onPlay = () => {
          void resetSubtitleSession({ timeline_sec: Math.max(0, videoElement.currentTime || 0) }).catch(() => undefined)
        }
        const onRateChange = () => {
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
          capture.detach()
          sessionRunningRef.current = false
          await stopSubtitleSession({ reason: 'renderer-dispose' }).catch(() => undefined)
        }
      } catch (error) {
        if (sessionRunningRef.current) {
          await stopSubtitleSession({ reason: 'renderer-start-failed' }).catch(() => undefined)
        }
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
        void stopSubtitleSession({ reason: 'renderer-dispose' }).catch(() => undefined)
      }
    }
  }, [
    capture,
    enabled,
    modelDir,
    modelId,
    providerPreference,
    repository.flushSubtitleSession,
    repository.listSubtitleLocalModels,
    repository.pushSubtitleAudio,
    repository.resetSubtitleSession,
    repository.startSubtitleSession,
    repository.stopSubtitleSession,
    videoElement,
  ])

  const activeText = useMemo(() => {
    const currentCue = cues.find((item) => currentTimeSec >= item.start_sec && currentTimeSec <= item.end_sec)
    return currentCue?.text ?? null
  }, [cues, currentTimeSec])

  return {
    loading,
    message,
    activeText,
  }
}
