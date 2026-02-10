import { useEffect, useRef } from 'react'
import type { AppSettings } from '../../contracts/settings'
import type { MediaRepository } from '../backend/repository/types'

interface UseSettingsPersistenceParams {
  settings: AppSettings
  repository: MediaRepository
  updateSettings: (patch: Partial<AppSettings>) => void
}

const SETTINGS_STATE_KEY = 'ui_settings_v1'

function normalizePersistedSettings(value: unknown): Partial<AppSettings> {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const next = {
    ...(value as Record<string, unknown>),
  }

  if (typeof next.adReviewMaxConcurrency === 'number' && Number.isFinite(next.adReviewMaxConcurrency)) {
    next.adReviewMaxConcurrency = Math.max(4, Math.min(12, Math.floor(next.adReviewMaxConcurrency)))
  }

  return next as Partial<AppSettings>
}

export function useSettingsPersistence({
  settings,
  repository,
  updateSettings,
}: UseSettingsPersistenceParams) {
  const isHydratedRef = useRef(false)
  const lastSavedJsonRef = useRef('')

  // Hydrate from DB on mount
  useEffect(() => {
    if (!repository.readAppState) {
      return
    }

    repository
      .readAppState({ state_key: SETTINGS_STATE_KEY })
      .then((response) => {
        if (response.state_json && response.state_json !== 'null') {
          try {
            const parsed = JSON.parse(response.state_json)
            // Only update if we haven't modified settings locally yet (or just apply it once)
            if (!isHydratedRef.current) {
              updateSettings(normalizePersistedSettings(parsed))
            }
          } catch (e) {
            console.warn('Failed to parse persisted settings', e)
          }
        }
        isHydratedRef.current = true
      })
      .catch((err) => {
        console.warn('Failed to hydrate settings from DB', err)
        isHydratedRef.current = true
      })
  }, [repository, updateSettings])

  // Persist to DB on change
  useEffect(() => {
    if (!isHydratedRef.current || !repository.writeAppState) {
      return
    }

    const currentJson = JSON.stringify(settings)
    if (currentJson === lastSavedJsonRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      const write = repository.writeAppState
      if (!write) {
        return
      }

      write({
          state_key: SETTINGS_STATE_KEY,
          state_json: currentJson,
        })
        .then(() => {
          lastSavedJsonRef.current = currentJson
        })
        .catch((err) => {
          console.warn('Failed to persist settings to DB', err)
        })
    }, 1000) // Debounce persistence

    return () => clearTimeout(timer)
  }, [settings, repository])
}
