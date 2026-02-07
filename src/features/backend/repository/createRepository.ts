import { MockMediaRepository } from './mockRepository'
import { RealMediaRepository } from './realRepository'
import type { ReadonlyMediaRepository, RepositoryMode } from './types'

function resolveRepositoryMode(): RepositoryMode {
  const configuredMode = import.meta.env.VITE_MEDIA_REPOSITORY_MODE
  if (typeof configuredMode === 'string' && configuredMode.trim().length > 0) {
    const mode = configuredMode.trim().toLowerCase()
    return mode === 'real' ? 'real' : 'mock'
  }

  if (typeof window !== 'undefined' && window.mediaPlayerBackend) {
    return 'real'
  }

  const mode = String(configuredMode ?? 'mock').trim().toLowerCase()
  return mode === 'real' ? 'real' : 'mock'
}

export function createMediaRepository(): {
  repository: ReadonlyMediaRepository
  mode: RepositoryMode
} {
  const mode = resolveRepositoryMode()
  if (mode === 'real') {
    return {
      repository: new RealMediaRepository(),
      mode,
    }
  }

  return {
    repository: new MockMediaRepository(),
    mode,
  }
}
