export interface TaskWorkerRequestEnvelope {
  kind: 'request'
  request_id: string
  payload: unknown
}

export interface TaskWorkerCancelEnvelope {
  kind: 'cancel'
  request_id: string
}

export interface TaskWorkerResponseEnvelope {
  kind: 'response'
  request_id: string
  ok: boolean
  payload?: unknown
  error?: string
}

export interface TaskWorkerProgressEnvelope {
  kind: 'progress'
  request_id: string
  progress?: number
  message?: string
}

export interface TaskWorkerHeartbeatEnvelope {
  kind: 'heartbeat'
  worker_pid: number
  at_ms: number
}

export type TaskWorkerIncomingEnvelope = TaskWorkerRequestEnvelope | TaskWorkerCancelEnvelope

export type TaskWorkerOutgoingEnvelope =
  | TaskWorkerResponseEnvelope
  | TaskWorkerProgressEnvelope
  | TaskWorkerHeartbeatEnvelope

export const TASK_WORKER_HEARTBEAT_INTERVAL_MS = 2_000

export const TASK_WORKER_HEARTBEAT_TIMEOUT_MS = 10_000
