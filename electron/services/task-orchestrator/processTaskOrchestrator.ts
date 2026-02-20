import { fork, type ChildProcess } from 'node:child_process'

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

interface RunnerRequestContext<TPayload, TResult> {
  options: RunProcessTaskOptions<TPayload>
  requestId: string
  attempt: number
  maxRetries: number
  resolve: (value: TResult) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
  heartbeatTimeoutMs: number
}

const WORKER_IDLE_KEEPALIVE_MS = 3_000

const RUNNER_REGISTRY = new Map<string, ProcessTaskWorkerRunner>()

class ProcessTaskWorkerRunner {
  private child: ChildProcess | null = null

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  private idleTimer: ReturnType<typeof setTimeout> | null = null

  private lastHeartbeatAtMs = Date.now()

  private heartbeatObserved = false

  private currentRequest: RunnerRequestContext<unknown, unknown> | null = null

  private queueTail: Promise<void> = Promise.resolve()

  private stderrBuffer = ''

  constructor(
    private readonly workerPath: string,
    private readonly serialization: 'json' | 'advanced',
  ) {}

  async enqueue<TPayload, TResult>(
    options: RunProcessTaskOptions<TPayload>,
    attempt: number,
    maxRetries: number,
  ): Promise<TResult> {
    const operation = async () => {
      return await this.executeRequest<TPayload, TResult>(options, attempt, maxRetries)
    }

    const requestPromise = this.queueTail.then(operation, operation)
    this.queueTail = requestPromise.then(
      () => undefined,
      () => undefined,
    )
    return await requestPromise
  }

  async dispose(): Promise<void> {
    this.clearIdleTimer()
    this.clearHeartbeatTimer()

    if (this.currentRequest) {
      const pending = this.currentRequest
      this.currentRequest = null
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('task worker disposed'))
    }

    await this.stopChild()
  }

  private async executeRequest<TPayload, TResult>(
    options: RunProcessTaskOptions<TPayload>,
    attempt: number,
    maxRetries: number,
  ): Promise<TResult> {
    this.clearIdleTimer()
    await this.ensureChild()

    const child = this.child
    if (!child || !child.connected) {
      throw new Error(`${options.taskName} worker ipc disconnected before request`)
    }

    const requestId = `${options.taskName}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
    const heartbeatTimeoutMs = Math.max(1_000, options.heartbeatTimeoutMs ?? TASK_WORKER_HEARTBEAT_TIMEOUT_MS)
    options.onAudit?.({
      stage: 'attempt-start',
      taskName: options.taskName,
      requestId,
      attempt,
      maxRetries,
      message: null,
    })

    return await new Promise<TResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        options.onAudit?.({
          stage: 'timeout',
          taskName: options.taskName,
          requestId,
          attempt,
          maxRetries,
          message: `${options.taskName} task timeout`,
        })
        this.sendCancelEnvelope(options, requestId, attempt, maxRetries, `${options.taskName} task timeout`)
        this.finishCurrentRequest(
          new Error(`${options.taskName} task timeout`),
          null,
          true,
        )
      }, Math.max(1_000, options.timeoutMs))
      timeoutId.unref?.()

      this.currentRequest = {
        options,
        requestId,
        attempt,
        maxRetries,
        resolve,
        reject,
        timeoutId,
        heartbeatTimeoutMs,
      }

      const requestEnvelope: TaskWorkerRequestEnvelope = {
        kind: 'request',
        request_id: requestId,
        payload: options.payload,
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
        this.finishCurrentRequest(
          new Error(`${options.taskName} worker send failed: ${toErrorMessage(error)}`),
          null,
          true,
        )
      }
    })
  }

  private async ensureChild(): Promise<void> {
    if (this.child && this.child.connected) {
      return
    }

    await this.stopChild()
    const child = fork(this.workerPath, [], {
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      serialization: this.serialization,
    })
    this.child = child
    this.stderrBuffer = ''
    this.lastHeartbeatAtMs = Date.now()
    this.heartbeatObserved = false

    child.stderr?.on('data', (chunk) => {
      this.stderrBuffer += String(chunk)
    })

    child.on('message', (rawMessage: unknown) => {
      this.handleChildMessage(rawMessage)
    })

    child.once('error', (error) => {
      const current = this.currentRequest
      if (current) {
        current.options.onAudit?.({
          stage: 'worker-error',
          taskName: current.options.taskName,
          requestId: current.requestId,
          attempt: current.attempt,
          maxRetries: current.maxRetries,
          message: toErrorMessage(error),
        })
      }
      this.finishCurrentRequest(error, null, true)
    })

    child.once('exit', (code, signal) => {
      const current = this.currentRequest
      if (current) {
        current.options.onAudit?.({
          stage: 'worker-exit',
          taskName: current.options.taskName,
          requestId: current.requestId,
          attempt: current.attempt,
          maxRetries: current.maxRetries,
          message: `${current.options.taskName} worker exit ${code ?? 'null'} signal ${signal ?? 'none'}`,
        })
      }

      this.child = null
      this.clearHeartbeatTimer()
      if (!current) {
        return
      }
      this.finishCurrentRequest(
        new Error(`${current.options.taskName} worker exit ${code ?? 'null'} signal ${signal ?? 'none'}`),
        null,
        false,
      )
    })

    this.startHeartbeatMonitor()
  }

  private handleChildMessage(rawMessage: unknown): void {
    if (!rawMessage || typeof rawMessage !== 'object') {
      return
    }

    const heartbeatMessage = rawMessage as { kind?: string; at_ms?: unknown }
    if (heartbeatMessage.kind === 'heartbeat') {
      this.heartbeatObserved = true
      this.lastHeartbeatAtMs =
        typeof heartbeatMessage.at_ms === 'number' && Number.isFinite(heartbeatMessage.at_ms)
          ? heartbeatMessage.at_ms
          : Date.now()
      return
    }

    const current = this.currentRequest
    if (!current) {
      return
    }

    const progressMessage = rawMessage as TaskWorkerProgressEnvelope
    if (progressMessage.kind === 'progress' && progressMessage.request_id === current.requestId) {
      current.options.onProgress?.({
        progress:
          typeof progressMessage.progress === 'number' && Number.isFinite(progressMessage.progress)
            ? progressMessage.progress
            : null,
        message: typeof progressMessage.message === 'string' ? progressMessage.message : null,
      })
      return
    }

    const responseMessage = rawMessage as TaskWorkerResponseEnvelope
    if (responseMessage.kind === 'response' && responseMessage.request_id === current.requestId) {
      if (!responseMessage.ok) {
        this.finishCurrentRequest(
          new Error(responseMessage.error ?? `${current.options.taskName} worker failed`),
          null,
          true,
        )
        return
      }

      this.finishCurrentRequest(null, responseMessage.payload as unknown, false)
      return
    }

    const legacyResponse = rawMessage as { ok?: unknown; error?: unknown }
    if (typeof legacyResponse.ok !== 'boolean') {
      return
    }

    if (!legacyResponse.ok) {
      const message =
        typeof legacyResponse.error === 'string'
          ? legacyResponse.error
          : `${current.options.taskName} worker failed`
      this.finishCurrentRequest(new Error(message), null, true)
      return
    }

    this.finishCurrentRequest(null, rawMessage, false)
  }

  private startHeartbeatMonitor(): void {
    this.clearHeartbeatTimer()

    this.heartbeatTimer = setInterval(() => {
      const current = this.currentRequest
      if (!current) {
        return
      }
      if (!this.heartbeatObserved) {
        return
      }
      if (Date.now() - this.lastHeartbeatAtMs <= current.heartbeatTimeoutMs) {
        return
      }

      current.options.onAudit?.({
        stage: 'heartbeat-timeout',
        taskName: current.options.taskName,
        requestId: current.requestId,
        attempt: current.attempt,
        maxRetries: current.maxRetries,
        message: `${current.options.taskName} worker heartbeat timeout`,
      })
      this.sendCancelEnvelope(
        current.options,
        current.requestId,
        current.attempt,
        current.maxRetries,
        `${current.options.taskName} worker heartbeat timeout`,
      )
      this.finishCurrentRequest(
        new Error(`${current.options.taskName} worker heartbeat timeout`),
        null,
        true,
      )
    }, 1_000)
    this.heartbeatTimer.unref?.()
  }

  private sendCancelEnvelope<TPayload>(
    options: RunProcessTaskOptions<TPayload>,
    requestId: string,
    attempt: number,
    maxRetries: number,
    message: string,
  ): void {
    if (!this.child?.connected) {
      return
    }

    try {
      const cancelEnvelope: TaskWorkerCancelEnvelope = {
        kind: 'cancel',
        request_id: requestId,
      }
      this.child.send(cancelEnvelope)
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

  private finishCurrentRequest(error: Error | null, result: unknown, restartWorker: boolean): void {
    const current = this.currentRequest
    if (!current) {
      return
    }

    this.currentRequest = null
    clearTimeout(current.timeoutId)

    if (error) {
      const stderrHint = this.stderrBuffer.trim()
      const normalizedError =
        stderrHint.length > 0 && !error.message.includes(stderrHint)
          ? new Error(`${error.message}; stderr: ${stderrHint}`)
          : error
      current.reject(normalizedError)
    } else {
      current.resolve(result)
    }

    if (restartWorker) {
      void this.restartChild()
      return
    }

    this.scheduleIdleStop()
  }

  private scheduleIdleStop(): void {
    this.clearIdleTimer()
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null
      void this.stopChild()
    }, WORKER_IDLE_KEEPALIVE_MS)
    this.idleTimer.unref?.()
  }

  private clearIdleTimer(): void {
    if (!this.idleTimer) {
      return
    }
    clearTimeout(this.idleTimer)
    this.idleTimer = null
  }

  private clearHeartbeatTimer(): void {
    if (!this.heartbeatTimer) {
      return
    }
    clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  private async restartChild(): Promise<void> {
    await this.stopChild()
  }

  private async stopChild(): Promise<void> {
    const child = this.child
    if (!child) {
      this.clearHeartbeatTimer()
      return
    }

    this.child = null
    this.clearHeartbeatTimer()

    if (child.killed || !child.connected) {
      return
    }

    await new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timeout)
        resolve()
      }

      const timeout = setTimeout(() => {
        finish()
      }, 1_500)
      timeout.unref?.()

      child.once('exit', () => {
        finish()
      })

      child.kill('SIGKILL')
    })
  }
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

function resolveRunnerKey(options: RunProcessTaskOptions<unknown>): string {
  return `${options.workerPath}::${options.serialization ?? 'json'}::${options.taskName}`
}

function getRunner(options: RunProcessTaskOptions<unknown>): ProcessTaskWorkerRunner {
  const key = resolveRunnerKey(options)
  const existing = RUNNER_REGISTRY.get(key)
  if (existing) {
    return existing
  }

  const created = new ProcessTaskWorkerRunner(
    options.workerPath,
    options.serialization ?? 'json',
  )
  RUNNER_REGISTRY.set(key, created)
  return created
}

export async function runTaskInProcess<TPayload, TResult>(
  options: RunProcessTaskOptions<TPayload>,
): Promise<TResult> {
  const maxRetries = Math.max(0, Math.min(3, Math.round(options.maxRetries ?? 0)))
  let attempt = 0
  let lastError: Error | null = null

  while (attempt <= maxRetries) {
    const runner = getRunner(options as RunProcessTaskOptions<unknown>)
    const requestId = `${options.taskName}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
    try {
      const result = await runner.enqueue<TPayload, TResult>(options, attempt, maxRetries)
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

export async function disposeTaskProcessRunners(): Promise<void> {
  const runners = Array.from(RUNNER_REGISTRY.values())
  RUNNER_REGISTRY.clear()
  for (const runner of runners) {
    await runner.dispose().catch(() => undefined)
  }
}
