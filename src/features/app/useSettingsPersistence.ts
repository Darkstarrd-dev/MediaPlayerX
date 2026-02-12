import { useCallback, useEffect, useRef } from 'react'
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

  const rawStyleId = typeof next.styleId === 'string' ? next.styleId.trim() : ''
  const rawPaletteId = typeof next.paletteId === 'string' ? next.paletteId.trim() : ''
  const rawThemeId = typeof next.themeId === 'string' ? next.themeId.trim() : ''

  next.styleId = rawStyleId || 'flush'
  next.paletteId = rawPaletteId || rawThemeId || 'parchment'
  next.themeId = next.paletteId

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
  const pendingJsonRef = useRef<string | null>(null)

  const initialSettingsRef = useRef<AppSettings | null>(null)
  if (initialSettingsRef.current == null) {
    initialSettingsRef.current = settings
  }

  const latestSettingsRef = useRef(settings)
  useEffect(() => {
    latestSettingsRef.current = settings
  }, [settings])

  const buildHydrationPatch = (persisted: Partial<AppSettings>): Partial<AppSettings> => {
    const initial = initialSettingsRef.current
    const latest = latestSettingsRef.current
    if (!initial) {
      return persisted
    }

    const next: Partial<AppSettings> = {}
    const applyHydrationKey = <K extends keyof AppSettings>(key: K): void => {
      const persistedValue = persisted[key]
      if (typeof persistedValue === 'undefined') {
        return
      }

      // 若用户（或其他逻辑）在水合完成前已修改过某个 key，则不允许旧持久化值覆盖它。
      if (Object.is(latest[key], initial[key])) {
        next[key] = persistedValue
      }
    }

    for (const key of Object.keys(persisted) as Array<keyof AppSettings>) {
      applyHydrationKey(key)
    }
    return next
  }

  // Hydrate from DB on mount
  useEffect(() => {
    if (!repository.readAppState) {
      isHydratedRef.current = true
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
              updateSettings(buildHydrationPatch(normalizePersistedSettings(parsed)))
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
  const persistSettingsJson = useCallback(
    async (json: string): Promise<void> => {
      if (!repository.writeAppState) {
        return
      }

      try {
        await repository.writeAppState({
          state_key: SETTINGS_STATE_KEY,
          state_json: json,
        })
        lastSavedJsonRef.current = json
      } catch (err) {
        console.warn('Failed to persist settings to DB', err)
      }
    },
    [repository],
  )

  useEffect(() => {
    if (!isHydratedRef.current || !repository.writeAppState) {
      return
    }

    const currentJson = JSON.stringify(settings)
    if (currentJson === lastSavedJsonRef.current) {
      pendingJsonRef.current = null
      return
    }

    pendingJsonRef.current = currentJson

    const timer = window.setTimeout(() => {
      const jsonToPersist = pendingJsonRef.current
      if (!jsonToPersist) {
        return
      }

      pendingJsonRef.current = null
      void persistSettingsJson(jsonToPersist)
    }, 300)

    return () => clearTimeout(timer)
  }, [settings, repository, persistSettingsJson])

  useEffect(() => {
    const flushPending = () => {
      const pending = pendingJsonRef.current
      if (!pending || pending === lastSavedJsonRef.current) {
        return
      }

      pendingJsonRef.current = null
      void persistSettingsJson(pending)
    }

    window.addEventListener('beforeunload', flushPending)
    return () => {
      flushPending()
      window.removeEventListener('beforeunload', flushPending)
    }
  }, [persistSettingsJson])
}
