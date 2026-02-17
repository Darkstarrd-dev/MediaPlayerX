import type { AppSettings } from '../../contracts/settings'
import type { SettingsPanelProps } from '../../components/SettingsPanel'
import { resolvePalettePairForStyle, resolveStyleId } from '../theme/themeRegistry'

interface BuildSettingsPanelPropsParams {
  settingsOpen: boolean
  uiLocale: AppSettings['uiLocale']
  styleId: string
  paletteId: string
  paletteMode: AppSettings['paletteMode']
  paletteDayId: string
  paletteNightId: string
  headerHeight: number
  settingsBackdropOpacity: number
  settingsFontSize: number
  sidebarRatio: number
  sidebarMinWidth: number
  layoutLocked: boolean
  electronNativeChromeEnabled: boolean
  sidebarFontSize: number
  sidebarCountFontSize: number
  sidebarIndentStep: number
  sidebarVerticalGap: number
  metadataRatio: number
  workspaceBottomPanelHeight: number
  fullscreenVideoControlsMaxWidth: number
  mediaPreloadMemoryBudgetMb: number
  thumbnailGap: number
  thumbnailQuality: number
  thumbnailWidth: number
  thumbnailGenerationConcurrency: number
  thumbnailResolveConcurrency: number
  proxyServer: string
  ehentaiCookies: string
  subtitleFeatureEnabled: boolean
  subtitleAcceleration: AppSettings['subtitleAcceleration']
  subtitleLanguage: AppSettings['subtitleLanguage']
  subtitleModelDir: string
  subtitleSelectedModelId: string | null
  subtitleModelsLoading: boolean
  subtitleModelsError: string | null
  subtitleModelsStatus: string | null
  subtitleRemoteModels: SettingsPanelProps['subtitleRemoteModels']
  subtitleLocalModels: SettingsPanelProps['subtitleLocalModels']
  subtitleDownloadTask: SettingsPanelProps['subtitleDownloadTask']
  subtitleDownloadPending: boolean
  adReviewVisionEndpoint: string
  adReviewVisionModel: string
  adReviewVisionVerified: boolean
  adReviewVisionTestPending: boolean
  adReviewVisionTestMessage: string | null
  adReviewVisionSavePending: boolean
  adReviewVisionSaveMessage: string | null
  shortcuts: SettingsPanelProps['shortcuts']
  shortcutConflicts: SettingsPanelProps['shortcutConflicts']
  databaseResetPending: boolean
  databaseResetError: string | null
  runtimePathUpdatePending: boolean
  runtimePathUpdateMessage: string | null
  repositoryMode: SettingsPanelProps['repositoryMode']
  backendBridgeInjected: boolean
  runtimeInfoLoading: boolean
  runtimeInfoError: string | null
  runtimeInfo: SettingsPanelProps['runtimeInfo']
  mediaCapabilitiesLoading: boolean
  mediaCapabilitiesError: string | null
  mediaCapabilities: SettingsPanelProps['mediaCapabilities']
  refreshRuntimeInfo: () => void
  updateSettings: (patch: Partial<AppSettings>) => void
  applySidebarRatio: (value: number) => void
  applyMetadataRatio: (value: number) => void
  applyElectronNativeChromeEnabled: (value: boolean) => void
  setShortcut: SettingsPanelProps['onSetShortcut']
  resetShortcuts: () => void
  clearDatabaseForDev: () => void
  testAdReviewVisionModel: () => void
  saveAdReviewVisionModel: () => void
  pickDatabaseDirectoryPath: () => void
  pickThumbnailCacheDirectoryPath: () => void
  pickSubtitleModelDirectoryPath: () => void
  pickSubtitleModelLocationPath: () => void
  refreshSubtitleModels: () => void
  startSubtitleModelDownload: () => void
  clearSubtitleLocalModel: () => void
  cancelSubtitleModelDownload: () => void
  openSubtitleModelPage: () => void
}

function buildSubtitleModelLocationPath(modelDir: string, modelId: string | null): string {
  const normalizedDir = modelDir.trim().replace(/[\\/]+$/, '')
  const normalizedId = modelId?.trim() ?? ''
  if (!normalizedDir || !normalizedId) {
    return ''
  }

  const separator = normalizedDir.includes('\\') ? '\\' : '/'
  return `${normalizedDir}${separator}${normalizedId}`
}

export function buildSettingsPanelProps(params: BuildSettingsPanelPropsParams): SettingsPanelProps {
  const subtitleModelLocationPath = buildSubtitleModelLocationPath(
    params.subtitleModelDir,
    params.subtitleSelectedModelId,
  )

  return {
    settingsOpen: params.settingsOpen,
    uiLocale: params.uiLocale,
    styleId: params.styleId,
    paletteId: params.paletteId,
    paletteMode: params.paletteMode,
    paletteDayId: params.paletteDayId,
    paletteNightId: params.paletteNightId,
    headerHeight: params.headerHeight,
    settingsBackdropOpacity: params.settingsBackdropOpacity,
    settingsFontSize: params.settingsFontSize,
    sidebarRatio: params.sidebarRatio,
    sidebarMinWidth: params.sidebarMinWidth,
    layoutLocked: params.layoutLocked,
    electronNativeChromeEnabled: params.electronNativeChromeEnabled,
    sidebarFontSize: params.sidebarFontSize,
    sidebarCountFontSize: params.sidebarCountFontSize,
    sidebarIndentStep: params.sidebarIndentStep,
    sidebarVerticalGap: params.sidebarVerticalGap,
    metadataRatio: params.metadataRatio,
    workspaceBottomPanelHeight: params.workspaceBottomPanelHeight,
    fullscreenVideoControlsMaxWidth: params.fullscreenVideoControlsMaxWidth,
    mediaPreloadMemoryBudgetMb: params.mediaPreloadMemoryBudgetMb,
    thumbnailGap: params.thumbnailGap,
    thumbnailQuality: params.thumbnailQuality,
    thumbnailWidth: params.thumbnailWidth,
    thumbnailGenerationConcurrency: params.thumbnailGenerationConcurrency,
    thumbnailResolveConcurrency: params.thumbnailResolveConcurrency,
    proxyServer: params.proxyServer,
    ehentaiCookies: params.ehentaiCookies,
    subtitleFeatureEnabled: params.subtitleFeatureEnabled,
    subtitleAcceleration: params.subtitleAcceleration,
    subtitleLanguage: params.subtitleLanguage,
    subtitleModelDir: params.subtitleModelDir,
    subtitleModelLocationPath,
    subtitleSelectedModelId: params.subtitleSelectedModelId,
    subtitleModelsLoading: params.subtitleModelsLoading,
    subtitleModelsError: params.subtitleModelsError,
    subtitleModelsStatus: params.subtitleModelsStatus,
    subtitleRemoteModels: params.subtitleRemoteModels,
    subtitleLocalModels: params.subtitleLocalModels,
    subtitleDownloadTask: params.subtitleDownloadTask,
    subtitleDownloadPending: params.subtitleDownloadPending,
    adReviewVisionEndpoint: params.adReviewVisionEndpoint,
    adReviewVisionModel: params.adReviewVisionModel,
    adReviewVisionVerified: params.adReviewVisionVerified,
    adReviewVisionTestPending: params.adReviewVisionTestPending,
    adReviewVisionTestMessage: params.adReviewVisionTestMessage,
    adReviewVisionSavePending: params.adReviewVisionSavePending,
    adReviewVisionSaveMessage: params.adReviewVisionSaveMessage,
    shortcuts: params.shortcuts,
    shortcutConflicts: params.shortcutConflicts,
    databaseResetPending: params.databaseResetPending,
    databaseResetError: params.databaseResetError,
    runtimePathUpdatePending: params.runtimePathUpdatePending,
    runtimePathUpdateMessage: params.runtimePathUpdateMessage,
    repositoryMode: params.repositoryMode,
    backendBridgeInjected: params.backendBridgeInjected,
    runtimeInfoLoading: params.runtimeInfoLoading,
    runtimeInfoError: params.runtimeInfoError,
    runtimeInfo: params.runtimeInfo,
    mediaCapabilitiesLoading: params.mediaCapabilitiesLoading,
    mediaCapabilitiesError: params.mediaCapabilitiesError,
    mediaCapabilities: params.mediaCapabilities,
    onRefreshRuntimeInfo: params.refreshRuntimeInfo,
    onClose: () => params.updateSettings({ settingsOpen: false }),
    onUiLocaleChange: (value) => {
      params.updateSettings({ uiLocale: value })
    },
    onStyleChange: (value) => {
      const nextStyleId = resolveStyleId(value)
      const nextPair = resolvePalettePairForStyle(nextStyleId, params.paletteDayId, params.paletteNightId)
      const nextPaletteId = params.paletteMode === 'night' ? nextPair.night : nextPair.day
      params.updateSettings({
        styleId: nextStyleId,
        paletteDayId: nextPair.day,
        paletteNightId: nextPair.night,
        paletteId: nextPaletteId,
        themeId: nextPaletteId,
      })
    },
    onPaletteModeChange: (value) => {
      const nextMode: AppSettings['paletteMode'] = value === 'night' ? 'night' : 'day'
      const pair = resolvePalettePairForStyle(params.styleId, params.paletteDayId, params.paletteNightId)
      const nextPaletteId = nextMode === 'night' ? pair.night : pair.day
      params.updateSettings({
        paletteMode: nextMode,
        paletteDayId: pair.day,
        paletteNightId: pair.night,
        paletteId: nextPaletteId,
        themeId: nextPaletteId,
      })
    },
    onPaletteDayChange: (value) => {
      const pair = resolvePalettePairForStyle(params.styleId, value, params.paletteNightId)
      params.updateSettings({
        paletteDayId: pair.day,
        paletteNightId: pair.night,
        ...(params.paletteMode === 'day'
          ? {
              paletteId: pair.day,
              themeId: pair.day,
            }
          : {}),
      })
    },
    onPaletteNightChange: (value) => {
      const pair = resolvePalettePairForStyle(params.styleId, params.paletteDayId, value)
      params.updateSettings({
        paletteDayId: pair.day,
        paletteNightId: pair.night,
        ...(params.paletteMode === 'night'
          ? {
              paletteId: pair.night,
              themeId: pair.night,
            }
          : {}),
      })
    },
    onHeaderHeightChange: (value) => params.updateSettings({ headerHeight: value }),
    onSettingsBackdropOpacityChange: (value) => params.updateSettings({ settingsBackdropOpacity: value }),
    onSettingsFontSizeChange: (value) => params.updateSettings({ settingsFontSize: value }),
    onSidebarRatioChange: params.applySidebarRatio,
    onSidebarMinWidthChange: (value) => params.updateSettings({ sidebarMinWidth: value }),
    onLayoutLockedChange: (value) => params.updateSettings({ layoutLocked: value }),
    onElectronNativeChromeEnabledChange: params.applyElectronNativeChromeEnabled,
    onSidebarFontSizeChange: (value) => params.updateSettings({ sidebarFontSize: value }),
    onSidebarCountFontSizeChange: (value) => params.updateSettings({ sidebarCountFontSize: value }),
    onSidebarIndentStepChange: (value) => params.updateSettings({ sidebarIndentStep: value }),
    onSidebarVerticalGapChange: (value) => params.updateSettings({ sidebarVerticalGap: value }),
    onMetadataRatioChange: params.applyMetadataRatio,
    onWorkspaceBottomPanelHeightChange: (value) => params.updateSettings({ workspaceBottomPanelHeight: value }),
    onFullscreenVideoControlsMaxWidthChange: (value) => params.updateSettings({ fullscreenVideoControlsMaxWidth: value }),
    onMediaPreloadMemoryBudgetMbChange: (value) => params.updateSettings({ mediaPreloadMemoryBudgetMb: value }),
    onThumbnailGapChange: (value) => params.updateSettings({ thumbnailGap: value }),
    onThumbnailQualityChange: (value) => params.updateSettings({ thumbnailQuality: value }),
    onResetThumbnailQuality: () =>
      params.updateSettings({
        thumbnailQuality: 40,
      }),
    onThumbnailWidthChange: (value) => params.updateSettings({ thumbnailWidth: value }),
    onResetThumbnailWidth: () =>
      params.updateSettings({
        thumbnailWidth: 512,
      }),
    onThumbnailGenerationConcurrencyChange: (value) => params.updateSettings({ thumbnailGenerationConcurrency: value }),
    onThumbnailResolveConcurrencyChange: (value) => params.updateSettings({ thumbnailResolveConcurrency: value }),
    onResetThumbnailGenerationConcurrency: () =>
      params.updateSettings({
        thumbnailGenerationConcurrency: 4,
      }),
    onResetThumbnailResolveConcurrency: () =>
      params.updateSettings({
        thumbnailResolveConcurrency: 8,
      }),
    onProxyServerChange: (value) => params.updateSettings({ proxyServer: value }),
    onEhentaiCookiesChange: (value) => params.updateSettings({ ehentaiCookies: value }),
    onSubtitleFeatureEnabledChange: (value) => params.updateSettings({ subtitleFeatureEnabled: value }),
    onSubtitleAccelerationChange: (value) => params.updateSettings({ subtitleAcceleration: value }),
    onSubtitleLanguageChange: (value) => params.updateSettings({ subtitleLanguage: value }),
    onSubtitleModelDirPick: params.pickSubtitleModelDirectoryPath,
    onSubtitleModelLocationPick: params.pickSubtitleModelLocationPath,
    onSubtitleSelectedModelIdChange: (value) =>
      params.updateSettings({
        subtitleSelectedModelId: value.trim() || null,
      }),
    onRefreshSubtitleModels: params.refreshSubtitleModels,
    onStartSubtitleModelDownload: params.startSubtitleModelDownload,
    onClearSubtitleLocalModel: params.clearSubtitleLocalModel,
    onCancelSubtitleModelDownload: params.cancelSubtitleModelDownload,
    onOpenSubtitleModelPage: params.openSubtitleModelPage,
    onAdReviewVisionEndpointChange: (value) =>
      params.updateSettings({
        adReviewVisionEndpoint: value,
        adReviewVisionVerified: false,
      }),
    onAdReviewVisionModelChange: (value) =>
      params.updateSettings({
        adReviewVisionModel: value,
        adReviewVisionVerified: false,
      }),
    onTestAdReviewVisionModel: params.testAdReviewVisionModel,
    onSaveAdReviewVisionModel: params.saveAdReviewVisionModel,
    onSetShortcut: params.setShortcut,
    onResetShortcuts: params.resetShortcuts,
    onClearDatabase: params.clearDatabaseForDev,
    onPickDatabaseDirectoryPath: params.pickDatabaseDirectoryPath,
    onPickThumbnailCacheDirectoryPath: params.pickThumbnailCacheDirectoryPath,
  }
}
