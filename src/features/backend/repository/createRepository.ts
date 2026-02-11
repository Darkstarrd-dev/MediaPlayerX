import { MockMediaRepository } from './mockRepository'
import { RealMediaRepository } from './realRepository'
import type { MediaRepository, RepositoryMode } from './types'

function parseConfiguredMode(rawValue: unknown): RepositoryMode | null {
  if (typeof rawValue !== 'string') {
    return null
  }

  const normalized = rawValue.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return normalized === 'real' ? 'real' : 'mock'
}

function detectBackendBridge(): boolean {
  return typeof window !== 'undefined' && typeof window.mediaPlayerBackend !== 'undefined'
}

function resolveRepositoryMode(): RepositoryMode {
  const configuredMode = parseConfiguredMode(import.meta.env.VITE_MEDIA_REPOSITORY_MODE)
  if (configuredMode) {
    return configuredMode
  }

  if (detectBackendBridge()) {
    return 'real'
  }

  if (import.meta.env.PROD) {
    return 'real'
  }

  return 'mock'
}

export function createMediaRepository(): {
  repository: MediaRepository
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
