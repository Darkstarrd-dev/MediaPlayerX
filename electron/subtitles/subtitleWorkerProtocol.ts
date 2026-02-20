import {
  TASK_WORKER_HEARTBEAT_INTERVAL_MS,
  TASK_WORKER_HEARTBEAT_TIMEOUT_MS,
  type TaskWorkerCancelEnvelope,
  type TaskWorkerHeartbeatEnvelope,
  type TaskWorkerResponseEnvelope,
} from '../services/task-orchestrator/taskWorkerProtocol'

export type SubtitleWorkerCommand = 'init' | 'stop' | 'reset' | 'flush' | 'push-audio' | 'transcribe-all'

export interface SubtitleWorkerRequestEnvelope {
  kind: 'request'
  request_id: string
  command: SubtitleWorkerCommand
  payload: unknown
}

export type SubtitleWorkerResponseEnvelope = TaskWorkerResponseEnvelope

export type SubtitleWorkerHeartbeatEnvelope = TaskWorkerHeartbeatEnvelope

export type SubtitleWorkerIncomingEnvelope =
  | SubtitleWorkerRequestEnvelope
  | TaskWorkerCancelEnvelope

export type SubtitleWorkerOutgoingEnvelope =
  | SubtitleWorkerResponseEnvelope
  | SubtitleWorkerHeartbeatEnvelope

export const SUBTITLE_WORKER_HEARTBEAT_INTERVAL_MS = TASK_WORKER_HEARTBEAT_INTERVAL_MS

export const SUBTITLE_WORKER_HEARTBEAT_TIMEOUT_MS = TASK_WORKER_HEARTBEAT_TIMEOUT_MS
