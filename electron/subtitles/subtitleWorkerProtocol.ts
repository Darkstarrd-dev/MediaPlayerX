export type SubtitleWorkerCommand = 'init' | 'stop' | 'reset' | 'flush' | 'push-audio' | 'transcribe-all'

export interface SubtitleWorkerRequestEnvelope {
  kind: 'request'
  request_id: string
  command: SubtitleWorkerCommand
  payload: unknown
}

export interface SubtitleWorkerResponseEnvelope {
  kind: 'response'
  request_id: string
  ok: boolean
  payload?: unknown
  error?: string
}

export interface SubtitleWorkerHeartbeatEnvelope {
  kind: 'heartbeat'
  worker_pid: number
  at_ms: number
}

export type SubtitleWorkerIncomingEnvelope =
  | SubtitleWorkerRequestEnvelope

export type SubtitleWorkerOutgoingEnvelope =
  | SubtitleWorkerResponseEnvelope
  | SubtitleWorkerHeartbeatEnvelope

export const SUBTITLE_WORKER_HEARTBEAT_INTERVAL_MS = 2_000

export const SUBTITLE_WORKER_HEARTBEAT_TIMEOUT_MS = 10_000
