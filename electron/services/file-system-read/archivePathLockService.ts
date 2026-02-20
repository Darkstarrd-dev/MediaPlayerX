import path from 'node:path'

import { normalizeAllowlistKey } from '../../fileSystemServiceHelpers'

type LockKind = 'read' | 'write'

interface LockRequest {
  kind: LockKind
  resolve: (release: () => void) => void
}

interface LockState {
  activeReaders: number
  activeWriter: boolean
  queue: LockRequest[]
}

function hasQueuedWriter(queue: readonly LockRequest[]): boolean {
  return queue.some((request) => request.kind === 'write')
}

export class ArchivePathLockService {
  private readonly lockStateByPath = new Map<string, LockState>()

  async withReadLock<T>(archivePath: string, task: () => Promise<T>): Promise<T> {
    const release = await this.acquire(archivePath, 'read')
    try {
      return await task()
    } finally {
      release()
    }
  }

  async withWriteLock<T>(archivePath: string, task: () => Promise<T>): Promise<T> {
    const release = await this.acquire(archivePath, 'write')
    try {
      return await task()
    } finally {
      release()
    }
  }

  private async acquire(archivePath: string, kind: LockKind): Promise<() => void> {
    const key = normalizeAllowlistKey(path.resolve(archivePath))
    const state = this.getOrCreateState(key)

    const canAcquireRead = () => !state.activeWriter && !hasQueuedWriter(state.queue)
    const canAcquireWrite = () => !state.activeWriter && state.activeReaders === 0

    if ((kind === 'read' && canAcquireRead()) || (kind === 'write' && canAcquireWrite())) {
      return this.activateLock(key, state, kind)
    }

    return await new Promise<() => void>((resolve) => {
      state.queue.push({
        kind,
        resolve,
      })
    })
  }

  private activateLock(key: string, state: LockState, kind: LockKind): () => void {
    if (kind === 'read') {
      state.activeReaders += 1
    } else {
      state.activeWriter = true
    }

    let released = false
    return () => {
      if (released) {
        return
      }
      released = true

      if (kind === 'read') {
        state.activeReaders = Math.max(0, state.activeReaders - 1)
      } else {
        state.activeWriter = false
      }

      this.drainQueue(key, state)
    }
  }

  private drainQueue(key: string, state: LockState): void {
    if (state.activeWriter || state.activeReaders > 0) {
      return
    }

    const next = state.queue[0]
    if (!next) {
      this.lockStateByPath.delete(key)
      return
    }

    if (next.kind === 'write') {
      state.queue.shift()
      next.resolve(this.activateLock(key, state, 'write'))
      return
    }

    while (state.queue.length > 0 && state.queue[0]?.kind === 'read') {
      const request = state.queue.shift()
      if (!request) {
        break
      }
      request.resolve(this.activateLock(key, state, 'read'))
    }
  }

  private getOrCreateState(key: string): LockState {
    const existing = this.lockStateByPath.get(key)
    if (existing) {
      return existing
    }

    const created: LockState = {
      activeReaders: 0,
      activeWriter: false,
      queue: [],
    }
    this.lockStateByPath.set(key, created)
    return created
  }
}
