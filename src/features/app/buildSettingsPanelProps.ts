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
  ehentaiCookies: string
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
  refreshRuntimeInfo: () => void
  updateSettings: (patch: Partial<AppSettings>) => void
  applySidebarRatio: (value: number) => void
  applyMetadataRatio: (value: number) => void
  setShortcut: SettingsPanelProps['onSetShortcut']
  resetShortcuts: () => void
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
    ehentaiCookies: params.ehentaiCookies,
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
    onEhentaiCookiesChange: (value) => params.updateSettings({ ehentaiCookies: value }),
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
