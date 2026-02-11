import type { AppSettings } from '../../contracts/settings'
import type { SettingsPanelProps } from '../../components/SettingsPanel'

interface BuildSettingsPanelPropsParams {
  settingsOpen: boolean
  styleId: string
  paletteId: string
  headerHeight: number
  settingsFontSize: number
  sidebarRatio: number
  sidebarMinWidth: number
  layoutLocked: boolean
  sidebarFontSize: number
  sidebarCountFontSize: number
  sidebarIndentStep: number
  sidebarVerticalGap: number
  metadataRatio: number
  vectorPanelHeight: number
  thumbnailGap: number
  thumbnailQuality: number
  thumbnailWidth: number
  lmStudioEndpoint: string
  lmStudioModel: string
  embeddingModelTestPending: boolean
  embeddingModelTestMessage: string | null
  wdSwinTaggerModelPath: string
  wdSwinTaggerAutoTagOccurrenceThreshold: number
  wdSwinTaggerAutoTagGeneralMinScore: number
  wdSwinTaggerAutoTagCharacterMinScore: number
  wdSwinTaggerAutoTagIncludeRating: boolean
  wdSwinTaggerAutoTagRatingMinScore: number
  visionAutoTagCsvPath: string
  visionAutoTagSampleImageCount: number
  visionAutoTagOccurrenceThreshold: number
  visionAutoTagTemperature: number
  visionAutoTagTimeoutMs: number
  wdSwinTaggerTestPending: boolean
  wdSwinTaggerTestMessage: string | null
  adReviewVisionEndpoint: string
  adReviewVisionModel: string
  adReviewVisionVerified: boolean
  adReviewVisionTestPending: boolean
  adReviewVisionTestMessage: string | null
  vectorUniverseMoveSpeed: number
  vectorUniverseSprintMultiplier: number
  vectorUniverseLookSensitivity: number
  vectorUniverseRaycastDistance: number
  vectorUniverseHelperScale: number
  vectorUniverseDispersion: number
  vectorUniverseWidgetSize: number
  shortcuts: SettingsPanelProps['shortcuts']
  shortcutConflicts: SettingsPanelProps['shortcutConflicts']
  vectorControls: SettingsPanelProps['vectorControls']
  vectorControlConflicts: SettingsPanelProps['vectorControlConflicts']
  databaseResetPending: boolean
  databaseResetError: string | null
  vectorDataStatusLoading: boolean
  vectorDataStatusError: string | null
  vectorDataStatus: SettingsPanelProps['vectorDataStatus']
  vectorDataClearPending: boolean
  vectorDataClearError: string | null
  repositoryMode: SettingsPanelProps['repositoryMode']
  backendBridgeInjected: boolean
  runtimeInfoLoading: boolean
  runtimeInfoError: string | null
  runtimeInfo: SettingsPanelProps['runtimeInfo']
  refreshRuntimeInfo: () => void
  updateSettings: (patch: Partial<AppSettings>) => void
  applySidebarRatio: (value: number) => void
  applyMetadataRatio: (value: number) => void
  setShortcut: SettingsPanelProps['onSetShortcut']
  setVectorControl: SettingsPanelProps['onSetVectorControl']
  resetShortcuts: () => void
  resetVectorControls: () => void
  clearDatabaseForDev: () => void
  refreshVectorDataStatus: () => void
  clearVectorDataForDev: () => void
  testEmbeddingModel: () => void
  testAdReviewVisionModel: () => void
  testWdSwinTaggerModel: () => void
}

export function buildSettingsPanelProps(params: BuildSettingsPanelPropsParams): SettingsPanelProps {
  return {
    settingsOpen: params.settingsOpen,
    styleId: params.styleId,
    paletteId: params.paletteId,
    headerHeight: params.headerHeight,
    settingsFontSize: params.settingsFontSize,
    sidebarRatio: params.sidebarRatio,
    sidebarMinWidth: params.sidebarMinWidth,
    layoutLocked: params.layoutLocked,
    sidebarFontSize: params.sidebarFontSize,
    sidebarCountFontSize: params.sidebarCountFontSize,
    sidebarIndentStep: params.sidebarIndentStep,
    sidebarVerticalGap: params.sidebarVerticalGap,
    metadataRatio: params.metadataRatio,
    vectorPanelHeight: params.vectorPanelHeight,
    thumbnailGap: params.thumbnailGap,
    thumbnailQuality: params.thumbnailQuality,
    thumbnailWidth: params.thumbnailWidth,
    lmStudioEndpoint: params.lmStudioEndpoint,
    lmStudioModel: params.lmStudioModel,
    embeddingModelTestPending: params.embeddingModelTestPending,
    embeddingModelTestMessage: params.embeddingModelTestMessage,
    wdSwinTaggerModelPath: params.wdSwinTaggerModelPath,
    wdSwinTaggerAutoTagOccurrenceThreshold: params.wdSwinTaggerAutoTagOccurrenceThreshold,
    wdSwinTaggerAutoTagGeneralMinScore: params.wdSwinTaggerAutoTagGeneralMinScore,
    wdSwinTaggerAutoTagCharacterMinScore: params.wdSwinTaggerAutoTagCharacterMinScore,
    wdSwinTaggerAutoTagIncludeRating: params.wdSwinTaggerAutoTagIncludeRating,
    wdSwinTaggerAutoTagRatingMinScore: params.wdSwinTaggerAutoTagRatingMinScore,
    visionAutoTagCsvPath: params.visionAutoTagCsvPath,
    visionAutoTagSampleImageCount: params.visionAutoTagSampleImageCount,
    visionAutoTagOccurrenceThreshold: params.visionAutoTagOccurrenceThreshold,
    visionAutoTagTemperature: params.visionAutoTagTemperature,
    visionAutoTagTimeoutMs: params.visionAutoTagTimeoutMs,
    wdSwinTaggerTestPending: params.wdSwinTaggerTestPending,
    wdSwinTaggerTestMessage: params.wdSwinTaggerTestMessage,
    adReviewVisionEndpoint: params.adReviewVisionEndpoint,
    adReviewVisionModel: params.adReviewVisionModel,
    adReviewVisionVerified: params.adReviewVisionVerified,
    adReviewVisionTestPending: params.adReviewVisionTestPending,
    adReviewVisionTestMessage: params.adReviewVisionTestMessage,
    vectorUniverseMoveSpeed: params.vectorUniverseMoveSpeed,
    vectorUniverseSprintMultiplier: params.vectorUniverseSprintMultiplier,
    vectorUniverseLookSensitivity: params.vectorUniverseLookSensitivity,
    vectorUniverseRaycastDistance: params.vectorUniverseRaycastDistance,
    vectorUniverseHelperScale: params.vectorUniverseHelperScale,
    vectorUniverseDispersion: params.vectorUniverseDispersion,
    vectorUniverseWidgetSize: params.vectorUniverseWidgetSize,
    shortcuts: params.shortcuts,
    shortcutConflicts: params.shortcutConflicts,
    vectorControls: params.vectorControls,
    vectorControlConflicts: params.vectorControlConflicts,
    databaseResetPending: params.databaseResetPending,
    databaseResetError: params.databaseResetError,
    vectorDataStatusLoading: params.vectorDataStatusLoading,
    vectorDataStatusError: params.vectorDataStatusError,
    vectorDataStatus: params.vectorDataStatus,
    vectorDataClearPending: params.vectorDataClearPending,
    vectorDataClearError: params.vectorDataClearError,
    repositoryMode: params.repositoryMode,
    backendBridgeInjected: params.backendBridgeInjected,
    runtimeInfoLoading: params.runtimeInfoLoading,
    runtimeInfoError: params.runtimeInfoError,
    runtimeInfo: params.runtimeInfo,
    onRefreshRuntimeInfo: params.refreshRuntimeInfo,
    onClose: () => params.updateSettings({ settingsOpen: false }),
    onStyleChange: (value) => params.updateSettings({ styleId: value }),
    onPaletteChange: (value) =>
      params.updateSettings({
        paletteId: value,
        themeId: value,
      }),
    onHeaderHeightChange: (value) => params.updateSettings({ headerHeight: value }),
    onSettingsFontSizeChange: (value) => params.updateSettings({ settingsFontSize: value }),
    onSidebarRatioChange: params.applySidebarRatio,
    onSidebarMinWidthChange: (value) => params.updateSettings({ sidebarMinWidth: value }),
    onLayoutLockedChange: (value) => params.updateSettings({ layoutLocked: value }),
    onSidebarFontSizeChange: (value) => params.updateSettings({ sidebarFontSize: value }),
    onSidebarCountFontSizeChange: (value) => params.updateSettings({ sidebarCountFontSize: value }),
    onSidebarIndentStepChange: (value) => params.updateSettings({ sidebarIndentStep: value }),
    onSidebarVerticalGapChange: (value) => params.updateSettings({ sidebarVerticalGap: value }),
    onMetadataRatioChange: params.applyMetadataRatio,
    onVectorPanelHeightChange: (value) => params.updateSettings({ vectorPanelHeight: value }),
    onThumbnailGapChange: (value) => params.updateSettings({ thumbnailGap: value }),
    onThumbnailQualityChange: (value) => params.updateSettings({ thumbnailQuality: value }),
    onThumbnailWidthChange: (value) => params.updateSettings({ thumbnailWidth: value }),
    onLmStudioEndpointChange: (value) => params.updateSettings({ lmStudioEndpoint: value }),
    onLmStudioModelChange: (value) => params.updateSettings({ lmStudioModel: value }),
    onTestEmbeddingModel: params.testEmbeddingModel,
    onWdSwinTaggerModelPathChange: (value) => params.updateSettings({ wdSwinTaggerModelPath: value }),
    onWdSwinTaggerAutoTagOccurrenceThresholdChange: (value) =>
      params.updateSettings({ wdSwinTaggerAutoTagOccurrenceThreshold: Math.max(1, Math.min(200, Math.floor(value))) }),
    onWdSwinTaggerAutoTagGeneralMinScoreChange: (value) =>
      params.updateSettings({ wdSwinTaggerAutoTagGeneralMinScore: Math.max(0, Math.min(1, value)) }),
    onWdSwinTaggerAutoTagCharacterMinScoreChange: (value) =>
      params.updateSettings({ wdSwinTaggerAutoTagCharacterMinScore: Math.max(0, Math.min(1, value)) }),
    onWdSwinTaggerAutoTagIncludeRatingChange: (value) =>
      params.updateSettings({ wdSwinTaggerAutoTagIncludeRating: value }),
    onWdSwinTaggerAutoTagRatingMinScoreChange: (value) =>
      params.updateSettings({ wdSwinTaggerAutoTagRatingMinScore: Math.max(0, Math.min(1, value)) }),
    onVisionAutoTagCsvPathChange: (value) => params.updateSettings({ visionAutoTagCsvPath: value }),
    onVisionAutoTagSampleImageCountChange: (value) =>
      params.updateSettings({ visionAutoTagSampleImageCount: Math.max(1, Math.min(24, Math.floor(value))) }),
    onVisionAutoTagOccurrenceThresholdChange: (value) =>
      params.updateSettings({ visionAutoTagOccurrenceThreshold: Math.max(1, Math.min(24, Math.floor(value))) }),
    onVisionAutoTagTemperatureChange: (value) =>
      params.updateSettings({ visionAutoTagTemperature: Math.max(0, Math.min(1, value)) }),
    onVisionAutoTagTimeoutMsChange: (value) =>
      params.updateSettings({ visionAutoTagTimeoutMs: Math.max(3_000, Math.min(120_000, Math.floor(value))) }),
    onTestWdSwinTaggerModel: params.testWdSwinTaggerModel,
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
    onVectorUniverseMoveSpeedChange: (value) => params.updateSettings({ vectorUniverseMoveSpeed: value }),
    onVectorUniverseSprintMultiplierChange: (value) => params.updateSettings({ vectorUniverseSprintMultiplier: value }),
    onVectorUniverseLookSensitivityChange: (value) => params.updateSettings({ vectorUniverseLookSensitivity: value }),
    onVectorUniverseRaycastDistanceChange: (value) => params.updateSettings({ vectorUniverseRaycastDistance: value }),
    onVectorUniverseHelperScaleChange: (value) => params.updateSettings({ vectorUniverseHelperScale: value }),
    onVectorUniverseDispersionChange: (value) => params.updateSettings({ vectorUniverseDispersion: value }),
    onVectorUniverseWidgetSizeChange: (value) => params.updateSettings({ vectorUniverseWidgetSize: value }),
    onSetShortcut: params.setShortcut,
    onSetVectorControl: params.setVectorControl,
    onResetShortcuts: params.resetShortcuts,
    onResetVectorControls: params.resetVectorControls,
    onClearDatabase: params.clearDatabaseForDev,
    onRefreshVectorDataStatus: params.refreshVectorDataStatus,
    onClearVectorData: params.clearVectorDataForDev,
  }
}
