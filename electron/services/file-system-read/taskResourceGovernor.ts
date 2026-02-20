interface PendingAcquireRequest {
  resolve: (release: () => void) => void
  reject: (error: Error) => void
}

class TokenSemaphore {
  private readonly queue: PendingAcquireRequest[] = []

  private inUse = 0

  constructor(private readonly capacity: number) {}

  async acquire(): Promise<() => void> {
    if (this.inUse < this.capacity) {
      this.inUse += 1
      return this.createRelease()
    }

    return await new Promise<() => void>((resolve, reject) => {
      this.queue.push({ resolve, reject })
    })
  }

  private createRelease(): () => void {
    let released = false
    return () => {
      if (released) {
        return
      }
      released = true

      const next = this.queue.shift()
      if (next) {
        next.resolve(this.createRelease())
        return
      }

      this.inUse = Math.max(0, this.inUse - 1)
    }
  }

  clear(): void {
    while (this.queue.length > 0) {
      const request = this.queue.shift()
      request?.reject(new Error('resource_governor_disposed'))
    }
  }
}

export interface TaskResourceGovernorOptions {
  cpuTokenLimit: number
  gpuTokenLimit: number
}

function normalizeTokenLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1
  }
  return Math.max(1, Math.min(32, Math.round(raw)))
}

export class TaskResourceGovernor {
  private readonly cpuSemaphore: TokenSemaphore

  private readonly gpuSemaphore: TokenSemaphore

  constructor(options: TaskResourceGovernorOptions) {
    this.cpuSemaphore = new TokenSemaphore(normalizeTokenLimit(options.cpuTokenLimit))
    this.gpuSemaphore = new TokenSemaphore(normalizeTokenLimit(options.gpuTokenLimit))
  }

  async runWithCpuToken<T>(_taskName: string, task: () => Promise<T>): Promise<T> {
    const release = await this.cpuSemaphore.acquire()
    try {
      return await task()
    } finally {
      release()
    }
  }

  async runWithGpuToken<T>(_taskName: string, task: () => Promise<T>): Promise<T> {
    const release = await this.gpuSemaphore.acquire()
    try {
      return await task()
    } finally {
      release()
    }
  }

  dispose(): void {
    this.cpuSemaphore.clear()
    this.gpuSemaphore.clear()
  }
}
