import { randomUUID } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import net, { type Socket } from 'node:net'

type JsonRecord = Record<string, unknown>

export interface MpvHostStartOptions {
  mpvBinPath: string
  extraArgs?: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  startupTimeoutMs?: number
  onEvent?: (payload: JsonRecord) => void
  onStderrLine?: (line: string) => void
  onProcessExit?: (payload: {
    code: number | null
    signal: NodeJS.Signals | null
    unexpected: boolean
  }) => void
}

export interface MpvCommandResponse {
  request_id?: number
  error?: string
  data?: unknown
  [key: string]: unknown
}

interface PendingRequest {
  resolve: (value: MpvCommandResponse) => void
  reject: (reason?: unknown) => void
  timer: NodeJS.Timeout
}

const MPV_STARTUP_TIMEOUT_MS = 10_000
const MPV_REQUEST_TIMEOUT_MS = 8_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function toJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as JsonRecord
}

function resolvePipeName(): string {
  const id = randomUUID().replace(/-/g, '')
  return `\\\\.\\pipe\\mpx-mpv-${id}`
}

export class MpvHost {
  private child: ChildProcess | null = null

  private socket: Socket | null = null

  private pipeName: string | null = null

  private requestIdSeed = 1

  private readBuffer = ''

  private stopping = false

  private pendingRequests = new Map<number, PendingRequest>()

  private onEvent: ((payload: JsonRecord) => void) | null = null

  private onStderrLine: ((line: string) => void) | null = null

  private onProcessExit:
    | ((payload: {
        code: number | null
        signal: NodeJS.Signals | null
        unexpected: boolean
      }) => void)
    | null = null

  async start(options: MpvHostStartOptions): Promise<void> {
    if (this.child || this.socket) {
      return
    }

    this.stopping = false
    this.onEvent = options.onEvent ?? null
    this.onStderrLine = options.onStderrLine ?? null
    this.onProcessExit = options.onProcessExit ?? null
    const pipeName = resolvePipeName()
    this.pipeName = pipeName

    const args = [
      '--idle=yes',
      '--force-window=no',
      '--vid=no',
      '--audio-display=no',
      `--input-ipc-server=${pipeName}`,
      ...(options.extraArgs ?? []),
    ]

    const child = spawn(options.mpvBinPath, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    this.child = child

    child.stderr?.on('data', (chunk: Buffer | string) => {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      for (const line of text.split(/\r?\n/)) {
        const normalized = line.trim()
        if (normalized.length > 0) {
          this.onStderrLine?.(normalized)
        }
      }
    })

    child.once('exit', (code, signal) => {
      const unexpected = !this.stopping
      this.onProcessExit?.({
        code,
        signal,
        unexpected,
      })
      if (unexpected) {
        this.rejectAllPending(new Error(`mpv exited unexpectedly: code=${code ?? 'null'} signal=${signal ?? 'null'}`))
      }
      this.child = null
      this.destroySocket()
    })

    const startupTimeoutMs = options.startupTimeoutMs ?? MPV_STARTUP_TIMEOUT_MS
    this.socket = await this.connectSocket(pipeName, startupTimeoutMs)
    this.socket.setEncoding('utf8')
    this.socket.on('data', this.handleSocketData)
    this.socket.once('error', (error) => {
      if (!this.stopping) {
        this.rejectAllPending(error)
      }
    })
    this.socket.once('close', () => {
      if (!this.stopping) {
        this.rejectAllPending(new Error('mpv ipc socket closed unexpectedly'))
      }
      this.socket = null
    })
  }

  async stop(): Promise<void> {
    this.stopping = true
    this.onProcessExit = null
    this.destroySocket()
    this.rejectAllPending(new Error('mpv host stopped'))

    if (!this.child) {
      return
    }

    const child = this.child
    this.child = null

    await new Promise<void>((resolve) => {
      let settled = false
      const done = () => {
        if (settled) {
          return
        }
        settled = true
        resolve()
      }

      child.once('exit', () => done())
      child.kill('SIGTERM')

      const forceTimer = setTimeout(() => {
        child.kill('SIGKILL')
        done()
      }, 1500)
      forceTimer.unref?.()
    })
  }

  async sendCommand(command: unknown[], timeoutMs: number = MPV_REQUEST_TIMEOUT_MS): Promise<MpvCommandResponse> {
    const socket = this.socket
    if (!socket || socket.destroyed) {
      throw new Error('mpv ipc socket not connected')
    }

    const requestId = this.requestIdSeed
    this.requestIdSeed += 1

    const payload = JSON.stringify({
      command,
      request_id: requestId,
    })

    return new Promise<MpvCommandResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`mpv command timeout: request_id=${requestId}`))
      }, timeoutMs)

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timer,
      })

      socket.write(`${payload}\n`, (error) => {
        if (!error) {
          return
        }
        const pending = this.pendingRequests.get(requestId)
        if (!pending) {
          return
        }
        clearTimeout(pending.timer)
        this.pendingRequests.delete(requestId)
        reject(error)
      })
    })
  }

  private async connectSocket(pipeName: string, timeoutMs: number): Promise<Socket> {
    const startedAt = Date.now()
    let lastError: Error | null = null

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const socket = await this.tryConnectSocket(pipeName)
        return socket
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        await sleep(80)
      }
    }

    throw new Error(`mpv ipc connect timeout (${timeoutMs}ms): ${lastError?.message ?? 'unknown error'}`)
  }

  private async tryConnectSocket(pipeName: string): Promise<Socket> {
    return new Promise<Socket>((resolve, reject) => {
      const socket = net.createConnection(pipeName)
      const cleanup = () => {
        socket.removeAllListeners('connect')
        socket.removeAllListeners('error')
      }

      socket.once('connect', () => {
        cleanup()
        resolve(socket)
      })

      socket.once('error', (error) => {
        cleanup()
        socket.destroy()
        reject(error)
      })
    })
  }

  private handleSocketData = (chunk: Buffer | string): void => {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    this.readBuffer += text

    while (true) {
      const lineBreakIndex = this.readBuffer.indexOf('\n')
      if (lineBreakIndex < 0) {
        return
      }

      const rawLine = this.readBuffer.slice(0, lineBreakIndex)
      this.readBuffer = this.readBuffer.slice(lineBreakIndex + 1)
      const line = rawLine.trim()
      if (line.length === 0) {
        continue
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }

      const payload = toJsonRecord(parsed)
      if (!payload) {
        continue
      }

      const requestId = payload.request_id
      if (typeof requestId === 'number') {
        const pending = this.pendingRequests.get(requestId)
        if (!pending) {
          continue
        }
        clearTimeout(pending.timer)
        this.pendingRequests.delete(requestId)
        pending.resolve(payload)
        continue
      }

      this.onEvent?.(payload)
    }
  }

  private destroySocket(): void {
    if (!this.socket) {
      return
    }
    this.socket.removeAllListeners()
    this.socket.destroy()
    this.socket = null
  }

  private rejectAllPending(reason: Error): void {
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer)
      pending.reject(new Error(`${reason.message}; request_id=${requestId}`))
      this.pendingRequests.delete(requestId)
    }
  }
}
