import { useCallback, useEffect, useRef } from 'react'
import type { AppSettings } from '../../contracts/settings'
import type { MediaRepository } from '../backend/repository/types'
import { resolvePaletteModeById } from '../theme/themeRegistry'

interface UseSettingsPersistenceParams {
  settings: AppSettings
  repository: MediaRepository
  updateSettings: (patch: Partial<AppSettings>) => void
}

const SETTINGS_STATE_KEY = 'ui_settings_v1'
const DEFAULT_MUSIC_SHADER_ID = 'mcs-szb'

type MusicVisualizerShaderSettings = AppSettings['musicVisualizerShaderSettingsById'][string]

function normalizeShaderSettingEntry(value: unknown): MusicVisualizerShaderSettings | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const source = value as Record<string, unknown>
  const renderLongEdgePxRaw = source.renderLongEdgePx
  const foregroundBackgroundScaleRatioRaw = source.foregroundBackgroundScaleRatio
  const fpsCapRaw = source.fpsCap
  const toneMapModeRaw = source.toneMapMode
  const toneMapExposureRaw = source.toneMapExposure
  const toneMapStrengthRaw = source.toneMapStrength
  const showFpsRaw = source.showFps
  const rendererRaw = source.renderer

  if (typeof renderLongEdgePxRaw !== 'number' || !Number.isFinite(renderLongEdgePxRaw)) {
    return null
  }
  if (fpsCapRaw !== 30 && fpsCapRaw !== 60 && fpsCapRaw !== 120) {
    return null
  }
  if (
    toneMapModeRaw !== 'off'
    && toneMapModeRaw !== 'reinhard'
    && toneMapModeRaw !== 'aces'
    && toneMapModeRaw !== 'filmic'
    && toneMapModeRaw !== 'agx'
    && toneMapModeRaw !== 'khronos'
  ) {
    return null
  }
  if (typeof toneMapExposureRaw !== 'number' || !Number.isFinite(toneMapExposureRaw)) {
    return null
  }
  if (typeof toneMapStrengthRaw !== 'number' || !Number.isFinite(toneMapStrengthRaw)) {
    return null
  }
  if (typeof showFpsRaw !== 'boolean') {
    return null
  }
  if (rendererRaw !== 'gpu' && rendererRaw !== 'cpu') {
    return null
  }

  const normalizedForegroundBackgroundScaleRatio =
    typeof foregroundBackgroundScaleRatioRaw === 'number' && Number.isFinite(foregroundBackgroundScaleRatioRaw)
      ? Math.max(1, Math.min(5, foregroundBackgroundScaleRatioRaw))
      : 2

  return {
    renderLongEdgePx: Math.max(240, Math.min(4096, Math.floor(renderLongEdgePxRaw))),
    foregroundBackgroundScaleRatio: normalizedForegroundBackgroundScaleRatio,
    fpsCap: fpsCapRaw,
    toneMapMode: toneMapModeRaw,
    toneMapExposure: Math.max(0.5, Math.min(2, toneMapExposureRaw)),
    toneMapStrength: Math.max(0, Math.min(1, toneMapStrengthRaw)),
    showFps: showFpsRaw,
    renderer: rendererRaw,
  }
}

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
  const rawPaletteMode =
    next.paletteMode === 'night'
      ? 'night'
      : next.paletteMode === 'day'
        ? 'day'
        : resolvePaletteModeById(rawPaletteId || rawThemeId || '')
  const rawPaletteDayId = typeof next.paletteDayId === 'string' ? next.paletteDayId.trim() : ''
  const rawPaletteNightId = typeof next.paletteNightId === 'string' ? next.paletteNightId.trim() : ''

  next.styleId = rawStyleId || 'flush'
  next.paletteId = rawPaletteId || rawThemeId || 'parchment'
  next.paletteMode = rawPaletteMode
  next.paletteDayId = rawPaletteDayId || (rawPaletteMode === 'day' ? next.paletteId : 'parchment')
  next.paletteNightId = rawPaletteNightId || (rawPaletteMode === 'night' ? next.paletteId : 'tokyo-night')
  next.themeId = next.paletteId

  const legacyVectorPanelHeight = next.vectorPanelHeight
  const hasNextWorkspaceBottomPanelHeight = typeof next.workspaceBottomPanelHeight === 'number' && Number.isFinite(next.workspaceBottomPanelHeight)
  if (!hasNextWorkspaceBottomPanelHeight && typeof legacyVectorPanelHeight === 'number' && Number.isFinite(legacyVectorPanelHeight)) {
    next.workspaceBottomPanelHeight = legacyVectorPanelHeight
  }
  delete next.vectorPanelHeight

  if (typeof next.adReviewMaxConcurrency === 'number' && Number.isFinite(next.adReviewMaxConcurrency)) {
    next.adReviewMaxConcurrency = Math.max(4, Math.min(12, Math.floor(next.adReviewMaxConcurrency)))
  }

  if (typeof next.musicVisualizerRenderLongEdgePx === 'number' && Number.isFinite(next.musicVisualizerRenderLongEdgePx)) {
    next.musicVisualizerRenderLongEdgePx = Math.max(240, Math.min(4096, Math.floor(next.musicVisualizerRenderLongEdgePx)))
  } else if ('musicVisualizerRenderLongEdgePx' in next) {
    delete next.musicVisualizerRenderLongEdgePx
  }

  if (next.musicVisualizerFpsCap !== 30 && next.musicVisualizerFpsCap !== 60 && next.musicVisualizerFpsCap !== 120 && 'musicVisualizerFpsCap' in next) {
    delete next.musicVisualizerFpsCap
  }

  if (typeof next.musicVisualizerSelectedShaderId === 'string') {
    next.musicVisualizerSelectedShaderId = next.musicVisualizerSelectedShaderId.trim().slice(0, 64)
  } else if ('musicVisualizerSelectedShaderId' in next) {
    delete next.musicVisualizerSelectedShaderId
  }

  if (
    next.musicVisualizerToneMapMode !== 'off'
    && next.musicVisualizerToneMapMode !== 'reinhard'
    && next.musicVisualizerToneMapMode !== 'aces'
    && next.musicVisualizerToneMapMode !== 'filmic'
    && next.musicVisualizerToneMapMode !== 'agx'
    && next.musicVisualizerToneMapMode !== 'khronos'
    && 'musicVisualizerToneMapMode' in next
  ) {
    delete next.musicVisualizerToneMapMode
  }

  if (typeof next.musicVisualizerToneMapExposure === 'number' && Number.isFinite(next.musicVisualizerToneMapExposure)) {
    next.musicVisualizerToneMapExposure = Math.max(0.5, Math.min(2, next.musicVisualizerToneMapExposure))
  } else if ('musicVisualizerToneMapExposure' in next) {
    delete next.musicVisualizerToneMapExposure
  }

  if (typeof next.musicVisualizerToneMapStrength === 'number' && Number.isFinite(next.musicVisualizerToneMapStrength)) {
    next.musicVisualizerToneMapStrength = Math.max(0, Math.min(1, next.musicVisualizerToneMapStrength))
  } else if ('musicVisualizerToneMapStrength' in next) {
    delete next.musicVisualizerToneMapStrength
  }

  if (typeof next.musicVisualizerShowFps !== 'boolean' && 'musicVisualizerShowFps' in next) {
    delete next.musicVisualizerShowFps
  }

  if (next.musicVisualizerRenderer !== 'gpu' && next.musicVisualizerRenderer !== 'cpu' && 'musicVisualizerRenderer' in next) {
    delete next.musicVisualizerRenderer
  }

  const normalizedShaderSettingsById: AppSettings['musicVisualizerShaderSettingsById'] = {}
  const rawShaderSettingsById = next.musicVisualizerShaderSettingsById
  if (rawShaderSettingsById && typeof rawShaderSettingsById === 'object') {
    for (const [rawShaderId, rawValue] of Object.entries(rawShaderSettingsById as Record<string, unknown>)) {
      const shaderId = rawShaderId.trim().slice(0, 64)
      if (!shaderId) {
        continue
      }
      const normalizedEntry = normalizeShaderSettingEntry(rawValue)
      if (normalizedEntry) {
        normalizedShaderSettingsById[shaderId] = normalizedEntry
      }
    }
  }

  const selectedShaderIdRaw = typeof next.musicVisualizerSelectedShaderId === 'string'
    ? next.musicVisualizerSelectedShaderId.trim().slice(0, 64)
    : ''
  const selectedShaderId = selectedShaderIdRaw || DEFAULT_MUSIC_SHADER_ID

  const migratedLegacyEntry: MusicVisualizerShaderSettings | null =
    typeof next.musicVisualizerRenderLongEdgePx === 'number'
      && Number.isFinite(next.musicVisualizerRenderLongEdgePx)
      && (next.musicVisualizerFpsCap === 30 || next.musicVisualizerFpsCap === 60 || next.musicVisualizerFpsCap === 120)
      && (next.musicVisualizerToneMapMode === 'off'
        || next.musicVisualizerToneMapMode === 'reinhard'
        || next.musicVisualizerToneMapMode === 'aces'
        || next.musicVisualizerToneMapMode === 'filmic'
        || next.musicVisualizerToneMapMode === 'agx'
        || next.musicVisualizerToneMapMode === 'khronos')
      && typeof next.musicVisualizerToneMapExposure === 'number'
      && Number.isFinite(next.musicVisualizerToneMapExposure)
      && typeof next.musicVisualizerToneMapStrength === 'number'
      && Number.isFinite(next.musicVisualizerToneMapStrength)
      && typeof next.musicVisualizerShowFps === 'boolean'
      && (next.musicVisualizerRenderer === 'gpu' || next.musicVisualizerRenderer === 'cpu')
      ? {
        renderLongEdgePx: Math.max(240, Math.min(4096, Math.floor(next.musicVisualizerRenderLongEdgePx))),
        foregroundBackgroundScaleRatio: 2,
        fpsCap: next.musicVisualizerFpsCap,
        toneMapMode: next.musicVisualizerToneMapMode,
        toneMapExposure: Math.max(0.5, Math.min(2, next.musicVisualizerToneMapExposure)),
        toneMapStrength: Math.max(0, Math.min(1, next.musicVisualizerToneMapStrength)),
        showFps: next.musicVisualizerShowFps,
        renderer: next.musicVisualizerRenderer,
      }
      : null

  if (!normalizedShaderSettingsById[selectedShaderId] && migratedLegacyEntry) {
    normalizedShaderSettingsById[selectedShaderId] = migratedLegacyEntry
  }

  if (Object.keys(normalizedShaderSettingsById).length > 0) {
    next.musicVisualizerShaderSettingsById = normalizedShaderSettingsById
  } else if ('musicVisualizerShaderSettingsById' in next) {
    delete next.musicVisualizerShaderSettingsById
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
