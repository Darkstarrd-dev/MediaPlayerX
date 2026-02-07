import { MockMediaRepository } from './mockRepository'
import { RealMediaRepository } from './realRepository'
import type { ReadonlyMediaRepository, RepositoryMode } from './types'

function resolveRepositoryMode(): RepositoryMode {
  const mode = String(import.meta.env.VITE_MEDIA_REPOSITORY_MODE ?? 'mock').trim().toLowerCase()
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
