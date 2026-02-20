import { fork } from 'node:child_process'

import {
  TASK_WORKER_HEARTBEAT_TIMEOUT_MS,
  type TaskWorkerCancelEnvelope,
  type TaskWorkerProgressEnvelope,
  type TaskWorkerRequestEnvelope,
  type TaskWorkerResponseEnvelope,
} from './taskWorkerProtocol'

interface RunProcessTaskOptions<TPayload> {
  workerPath: string
  taskName: string
  payload: TPayload
  timeoutMs: number
  heartbeatTimeoutMs?: number
  maxRetries?: number
  serialization?: 'json' | 'advanced'
  onProgress?: (payload: { progress: number | null; message: string | null }) => void
  onAudit?: (payload: {
    stage:
      | 'attempt-start'
      | 'request-sent'
      | 'cancel-sent'
      | 'timeout'
      | 'heartbeat-timeout'
      | 'worker-error'
      | 'worker-exit'
      | 'attempt-failed'
      | 'retry-scheduled'
      | 'succeeded'
      | 'failed'
    taskName: string
    requestId: string
    attempt: number
    maxRetries: number
    message: string | null
  }) => void
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error)
}

function shouldRetryTaskError(message: string): boolean {
  return (
    message.includes('timeout') ||
    message.includes('heartbeat') ||
    message.includes('ipc') ||
    message.includes('disconnected') ||
    message.includes('exit')
  )
}

async function runTaskAttempt<TPayload, TResult>(
  requestId: string,
  attempt: number,
  maxRetries: number,
  options: RunProcessTaskOptions<TPayload>,
): Promise<TResult> {
  return await new Promise<TResult>((resolve, reject) => {
    const child = fork(options.workerPath, [], {
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      serialization: options.serialization ?? 'json',
    })

    let settled = false
    let cancelSent = false
    let lastHeartbeatAtMs = Date.now()
    let heartbeatObserved = false
    let stderrBuffer = ''

    options.onAudit?.({
      stage: 'attempt-start',
      taskName: options.taskName,
      requestId,
      attempt,
      maxRetries,
      message: null,
    })

    const heartbeatTimeoutMs = Math.max(1_000, options.heartbeatTimeoutMs ?? TASK_WORKER_HEARTBEAT_TIMEOUT_MS)
    const requestEnvelope: TaskWorkerRequestEnvelope = {
      kind: 'request',
      request_id: requestId,
      payload: options.payload,
    }

    const sendCancel = (message: string) => {
      if (cancelSent) {
        return
      }
      if (!child.connected) {
        return
      }
      try {
        const cancelEnvelope: TaskWorkerCancelEnvelope = {
          kind: 'cancel',
          request_id: requestId,
        }
        child.send(cancelEnvelope)
        cancelSent = true
        options.onAudit?.({
          stage: 'cancel-sent',
          taskName: options.taskName,
          requestId,
          attempt,
          maxRetries,
          message,
        })
      } catch {
        // ignore cancellation delivery failures during teardown
      }
    }

    const timeoutId = setTimeout(() => {
      options.onAudit?.({
        stage: 'timeout',
        taskName: options.taskName,
        requestId,
        attempt,
        maxRetries,
        message: `${options.taskName} task timeout`,
      })
      finish(new Error(`${options.taskName} task timeout`), null)
      sendCancel(`${options.taskName} task timeout`)
      child.kill('SIGKILL')
    }, Math.max(1_000, options.timeoutMs))
    timeoutId.unref?.()

    const heartbeatTimer = setInterval(() => {
      if (!heartbeatObserved) {
        return
      }
      if (Date.now() - lastHeartbeatAtMs <= heartbeatTimeoutMs) {
        return
      }
      options.onAudit?.({
        stage: 'heartbeat-timeout',
        taskName: options.taskName,
        requestId,
        attempt,
        maxRetries,
        message: `${options.taskName} worker heartbeat timeout`,
      })
      finish(new Error(`${options.taskName} worker heartbeat timeout`), null)
      sendCancel(`${options.taskName} worker heartbeat timeout`)
      child.kill('SIGKILL')
    }, Math.max(1_000, Math.floor(heartbeatTimeoutMs / 2)))
    heartbeatTimer.unref?.()

    child.stderr?.on('data', (chunk) => {
      stderrBuffer += String(chunk)
    })

    const finish = (error: Error | null, result: TResult | null) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeoutId)
      clearInterval(heartbeatTimer)

      if (error) {
        const stderrHint = stderrBuffer.trim()
        if (stderrHint.length > 0 && !error.message.includes(stderrHint)) {
          reject(new Error(`${error.message}; stderr: ${stderrHint}`))
          return
        }
        reject(error)
        return
      }

      resolve(result as TResult)
    }

    child.on('message', (rawMessage: unknown) => {
      if (!rawMessage || typeof rawMessage !== 'object') {
        return
      }

      const heartbeatMessage = rawMessage as { kind?: string; at_ms?: unknown }
      if (heartbeatMessage.kind === 'heartbeat') {
        heartbeatObserved = true
        lastHeartbeatAtMs =
          typeof heartbeatMessage.at_ms === 'number' && Number.isFinite(heartbeatMessage.at_ms)
            ? heartbeatMessage.at_ms
            : Date.now()
        return
      }

      const progressMessage = rawMessage as TaskWorkerProgressEnvelope
      if (progressMessage.kind === 'progress' && progressMessage.request_id === requestId) {
        options.onProgress?.({
          progress:
            typeof progressMessage.progress === 'number' && Number.isFinite(progressMessage.progress)
              ? progressMessage.progress
              : null,
          message: typeof progressMessage.message === 'string' ? progressMessage.message : null,
        })
        return
      }

      const responseMessage = rawMessage as TaskWorkerResponseEnvelope
      if (responseMessage.kind !== 'response' || responseMessage.request_id !== requestId) {
        const legacyResponse = rawMessage as { ok?: unknown; error?: unknown }
        if (typeof legacyResponse.ok !== 'boolean') {
          return
        }
        if (!legacyResponse.ok) {
          const message =
            typeof legacyResponse.error === 'string'
              ? legacyResponse.error
              : `${options.taskName} worker failed`
          finish(new Error(message), null)
          return
        }
        finish(null, rawMessage as TResult)
        return
      }

      if (!responseMessage.ok) {
        finish(new Error(responseMessage.error ?? `${options.taskName} worker failed`), null)
        return
      }

      finish(null, responseMessage.payload as TResult)
    })

    child.once('error', (error) => {
      options.onAudit?.({
        stage: 'worker-error',
        taskName: options.taskName,
        requestId,
        attempt,
        maxRetries,
        message: toErrorMessage(error),
      })
      finish(error, null)
    })

    child.once('exit', (code, signal) => {
      if (settled) {
        return
      }
      if (code === 0 && !signal) {
        options.onAudit?.({
          stage: 'worker-exit',
          taskName: options.taskName,
          requestId,
          attempt,
          maxRetries,
          message: `${options.taskName} worker exited before response`,
        })
        finish(new Error(`${options.taskName} worker exited before response`), null)
        return
      }
      options.onAudit?.({
        stage: 'worker-exit',
        taskName: options.taskName,
        requestId,
        attempt,
        maxRetries,
        message: `${options.taskName} worker exit ${code ?? 'null'} signal ${signal ?? 'none'}`,
      })
      finish(new Error(`${options.taskName} worker exit ${code ?? 'null'} signal ${signal ?? 'none'}`), null)
    })

    if (!child.connected) {
      finish(new Error(`${options.taskName} worker ipc disconnected before request`), null)
      return
    }

    try {
      child.send(requestEnvelope)
      options.onAudit?.({
        stage: 'request-sent',
        taskName: options.taskName,
        requestId,
        attempt,
        maxRetries,
        message: null,
      })
    } catch (error) {
      finish(new Error(`${options.taskName} worker send failed: ${toErrorMessage(error)}`), null)
    }
  })
}

export async function runTaskInProcess<TPayload, TResult>(
  options: RunProcessTaskOptions<TPayload>,
): Promise<TResult> {
  const maxRetries = Math.max(0, Math.min(3, Math.round(options.maxRetries ?? 0)))
  let attempt = 0
  let lastError: Error | null = null

  while (attempt <= maxRetries) {
    const requestId = `${options.taskName}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
    try {
      const result = await runTaskAttempt<TPayload, TResult>(requestId, attempt, maxRetries, options)
      options.onAudit?.({
        stage: 'succeeded',
        taskName: options.taskName,
        requestId,
        attempt,
        maxRetries,
        message: null,
      })
      return result
    } catch (error) {
      const message = toErrorMessage(error)
      lastError = error instanceof Error ? error : new Error(message)
      options.onAudit?.({
        stage: 'attempt-failed',
        taskName: options.taskName,
        requestId,
        attempt,
        maxRetries,
        message,
      })
      if (attempt >= maxRetries || !shouldRetryTaskError(message)) {
        break
      }
      options.onAudit?.({
        stage: 'retry-scheduled',
        taskName: options.taskName,
        requestId,
        attempt,
        maxRetries,
        message,
      })
      attempt += 1
      continue
    }
  }

  options.onAudit?.({
    stage: 'failed',
    taskName: options.taskName,
    requestId: `${options.taskName}-failed`,
    attempt,
    maxRetries,
    message: lastError?.message ?? `${options.taskName} task failed`,
  })

  throw (lastError ?? new Error(`${options.taskName} task failed`))
}
