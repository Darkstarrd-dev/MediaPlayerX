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
  proxyServer: string
  adReviewVisionEndpoint: string
  adReviewVisionModel: string
  adReviewVisionVerified: boolean
  adReviewVisionTestPending: boolean
  adReviewVisionTestMessage: string | null
  adReviewVisionSavePending: boolean
  adReviewVisionSaveMessage: string | null
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
  runtimePathUpdatePending: boolean
  runtimePathUpdateMessage: string | null
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
  testAdReviewVisionModel: () => void
  saveAdReviewVisionModel: () => void
  pickDatabaseDirectoryPath: () => void
  pickThumbnailCacheDirectoryPath: () => void
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
    proxyServer: params.proxyServer,
    adReviewVisionEndpoint: params.adReviewVisionEndpoint,
    adReviewVisionModel: params.adReviewVisionModel,
    adReviewVisionVerified: params.adReviewVisionVerified,
    adReviewVisionTestPending: params.adReviewVisionTestPending,
    adReviewVisionTestMessage: params.adReviewVisionTestMessage,
    adReviewVisionSavePending: params.adReviewVisionSavePending,
    adReviewVisionSaveMessage: params.adReviewVisionSaveMessage,
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
    runtimePathUpdatePending: params.runtimePathUpdatePending,
    runtimePathUpdateMessage: params.runtimePathUpdateMessage,
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
    onProxyServerChange: (value) => params.updateSettings({ proxyServer: value }),
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
    onPickDatabaseDirectoryPath: params.pickDatabaseDirectoryPath,
    onPickThumbnailCacheDirectoryPath: params.pickThumbnailCacheDirectoryPath,
  }
}
