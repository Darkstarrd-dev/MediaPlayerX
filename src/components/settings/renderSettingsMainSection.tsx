import {
  listPalettesByStyle,
  listStyles,
  resolvePalettePairForStyle,
  resolveStyleIdFromStyles,
} from '../../features/theme/themeRegistry'
import type { ReadRuntimeInfoResponseDto } from '../../contracts/backend'
import type { RepositoryMode } from '../../features/backend/repository'
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { RuntimeMediaCapabilityProbeResult } from '../../features/app/useRuntimeInfoDiagnostics'

import type { ShortcutConflict } from '../../shortcuts'
import { MainUiIcon } from '../MainUiIcon'
import {
  formatScale,
  SIZE_SCALE_CONFIG,
  toAbsolutePx,
} from './settingsScale'
import type { TranslateFn } from '../../i18n/context'

export type SettingsSection = 'layout' | 'system' | 'model' | 'database' | 'shortcuts'

interface RenderSettingsMainSectionParams {
  t: TranslateFn
  activeSection: SettingsSection
  uiLocale: 'auto' | 'zh-CN' | 'en-US'
  layoutLocked: boolean
  headerHeight: number
  headerHeightScale: number
  settingsFontSize: number
  settingsFontSizeScale: number
  sidebarRatio: number
  sidebarMinWidth: number
  sidebarMinWidthScale: number
  sidebarFontSize: number
  sidebarFontSizeScale: number
  electronNativeChromeEnabled: boolean
  themeParameterButtonVisible: boolean
  sidebarCountFontSize: number
  sidebarCountFontSizeScale: number
  sidebarIndentStep: number
  sidebarIndentStepScale: number
  sidebarVerticalGap: number
  sidebarVerticalGapScale: number
  metadataRatio: number
  workspaceBottomPanelHeight: number
  workspaceBottomPanelHeightScale: number
  fullscreenVideoControlsMaxWidth: number
  fullscreenVideoControlsMaxWidthScale: number
  mediaPreloadMemoryBudgetMb: number
  thumbnailGap: number
  thumbnailGapScale: number
  thumbnailQuality: number
  thumbnailWidthInputValue: string
  thumbnailGenerationConcurrencyInput: string
  thumbnailResolveConcurrencyInput: string
  proxyServer: string
  ehentaiCookies: string
  subtitleFeatureEnabled: boolean
  subtitleLanguage: 'auto' | 'zh' | 'en' | 'ja' | 'ko' | 'yue'
  subtitleModelDir: string
  subtitleTextFillMode: 'solid' | 'gradient'
  subtitleTextColor: string
  subtitleGradientStartColor: string
  subtitleGradientEndColor: string
  subtitleGradientDirection:
    | 'left-to-right'
    | 'right-to-left'
    | 'top-to-bottom'
    | 'bottom-to-top'
    | 'top-left-to-bottom-right'
    | 'top-right-to-bottom-left'
    | 'bottom-left-to-top-right'
    | 'bottom-right-to-top-left'
  subtitleGradientCurve: 'linear' | 'smooth' | 'bezier' | 'smoother'
  subtitleStrokeColor: string
  subtitleStrokeWidth: number
  subtitleStrokeShadowColor: string
  subtitleStrokeShadowRadius: number
  subtitleFontSize: number
  subtitleMaxLineChars: number
  subtitleOffsetY: number
  subtitleStylePanelExpanded: boolean
  subtitleModelsLoading: boolean
  subtitleModelsError: string | null
  subtitleModelsStatus: string | null
  subtitleRemoteModels: Array<{
    id: string
    label: string
    languageCodes: string[]
    sizeBytes: number
    homepageUrl: string | null
  }>
  subtitleLocalModels: Array<{
    id: string
    label: string
    modelDir: string
    sizeBytes: number
    source: 'downloaded' | 'manual'
  }>
  subtitleDownloadTask: {
    downloadId: string
    status: 'queued' | 'downloading' | 'verifying' | 'completed' | 'failed' | 'cancelled'
    percent: number
    speedBps: number
    etaSec: number | null
    message: string | null
  } | null
  subtitleDownloadPending: boolean
  adReviewVisionEndpoint: string
  adReviewVisionModel: string
  adReviewVisionVerified: boolean
  adReviewVisionTestPending: boolean
  adReviewVisionTestMessage: string | null
  adReviewVisionSavePending: boolean
  adReviewVisionSaveMessage: string | null
  subtitleCleanupLlmEndpoint: string
  subtitleCleanupLlmModel: string
  subtitleCleanupLlmPrompt: string
  styleId: string
  paletteMode: 'day' | 'night'
  paletteDayId: string
  paletteNightId: string
  shortcutConflicts: ShortcutConflict[]
  shortcutLabelByAction: Map<string, string>
  settingsBackdropOpacity: number
  databaseResetPending: boolean
  databaseResetError: string | null
  runtimePathUpdatePending: boolean
  runtimePathUpdateMessage: string | null
  repositoryMode: RepositoryMode
  backendBridgeInjected: boolean
  runtimeInfoLoading: boolean
  runtimeInfoError: string | null
  runtimeInfo: ReadRuntimeInfoResponseDto | null
  mediaCapabilitiesLoading: boolean
  mediaCapabilitiesError: string | null
  mediaCapabilities: RuntimeMediaCapabilityProbeResult[]
  renderBindingRows: () => JSX.Element
  onResetShortcuts: () => void
  onUiLocaleChange: (value: 'auto' | 'zh-CN' | 'en-US') => void
  onLayoutLockedChange: (value: boolean) => void
  onHeaderHeightChange: (value: number) => void
  onSettingsBackdropOpacityChange: (value: number) => void
  onSettingsFontSizeChange: (value: number) => void
  onSidebarRatioChange: (value: number) => void
  onSidebarMinWidthChange: (value: number) => void
  onSidebarFontSizeChange: (value: number) => void
  onElectronNativeChromeEnabledChange: (value: boolean) => void
  onThemeParameterButtonVisibleChange: (value: boolean) => void
  onSidebarCountFontSizeChange: (value: number) => void
  onSidebarIndentStepChange: (value: number) => void
  onSidebarVerticalGapChange: (value: number) => void
  onMetadataRatioChange: (value: number) => void
  onWorkspaceBottomPanelHeightChange: (value: number) => void
  onFullscreenVideoControlsMaxWidthChange: (value: number) => void
  onMediaPreloadMemoryBudgetMbChange: (value: number) => void
  onThumbnailGapChange: (value: number) => void
  onThumbnailQualityChange: (value: number) => void
  onResetThumbnailQuality: () => void
  onThumbnailWidthInputChange: (value: string) => void
  onThumbnailWidthInputBlur: () => void
  onThumbnailWidthInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onResetThumbnailWidth: () => void
  onThumbnailGenerationConcurrencyInputChange: (value: string) => void
  onThumbnailGenerationConcurrencyInputBlur: () => void
  onThumbnailGenerationConcurrencyInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onResetThumbnailGenerationConcurrency: () => void
  onThumbnailResolveConcurrencyInputChange: (value: string) => void
  onThumbnailResolveConcurrencyInputBlur: () => void
  onThumbnailResolveConcurrencyInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onResetThumbnailResolveConcurrency: () => void
  onProxyServerChange: (value: string) => void
  onEhentaiCookiesChange: (value: string) => void
  onSubtitleFeatureEnabledChange: (value: boolean) => void
  onSubtitleLanguageChange: (value: 'auto' | 'zh' | 'en' | 'ja' | 'ko' | 'yue') => void
  onSubtitleModelDirPick: () => void
  onSubtitleTextFillModeChange: (value: 'solid' | 'gradient') => void
  onSubtitleTextColorChange: (value: string) => void
  onSubtitleGradientStartColorChange: (value: string) => void
  onSubtitleGradientEndColorChange: (value: string) => void
  onSubtitleGradientDirectionChange: (
    value:
      | 'left-to-right'
      | 'right-to-left'
      | 'top-to-bottom'
      | 'bottom-to-top'
      | 'top-left-to-bottom-right'
      | 'top-right-to-bottom-left'
      | 'bottom-left-to-top-right'
      | 'bottom-right-to-top-left',
  ) => void
  onSubtitleGradientCurveChange: (value: 'linear' | 'smooth' | 'bezier' | 'smoother') => void
  onSubtitleStrokeColorChange: (value: string) => void
  onSubtitleStrokeWidthChange: (value: number) => void
  onSubtitleStrokeShadowColorChange: (value: string) => void
  onSubtitleStrokeShadowRadiusChange: (value: number) => void
  onSubtitleFontSizeChange: (value: number) => void
  onSubtitleMaxLineCharsChange: (value: number) => void
  onSubtitleOffsetYChange: (value: number) => void
  onSubtitleStylePanelExpandedChange: (value: boolean) => void
  onRefreshSubtitleModels: () => void
  onStartSubtitleModelDownload: () => void
  onCancelSubtitleModelDownload: () => void
  onOpenSubtitleModelPage: () => void
  onAdReviewVisionEndpointChange: (value: string) => void
  onAdReviewVisionModelChange: (value: string) => void
  onTestAdReviewVisionModel: () => void
  onSaveAdReviewVisionModel: () => void
  onSubtitleCleanupLlmEndpointChange: (value: string) => void
  onSubtitleCleanupLlmModelChange: (value: string) => void
  onSubtitleCleanupLlmPromptChange: (value: string) => void
  onStyleChange: (value: string) => void
  onPaletteModeChange: (value: 'day' | 'night') => void
  onPaletteDayChange: (value: string) => void
  onPaletteNightChange: (value: string) => void
  onClearDatabase: () => void
  onPickDatabaseDirectoryPath: () => void
  onPickThumbnailCacheDirectoryPath: () => void
  onRefreshRuntimeInfo: () => void
}

export function renderSettingsMainSection({
  t,
  activeSection,
  uiLocale,
  layoutLocked,
  headerHeight,
  headerHeightScale,
  settingsFontSize,
  settingsFontSizeScale,
  sidebarRatio,
  sidebarMinWidth,
  sidebarMinWidthScale,
  sidebarFontSize,
  sidebarFontSizeScale,
  electronNativeChromeEnabled,
  themeParameterButtonVisible,
  sidebarCountFontSize,
  sidebarCountFontSizeScale,
  sidebarIndentStep,
  sidebarIndentStepScale,
  sidebarVerticalGap,
  sidebarVerticalGapScale,
  metadataRatio,
  workspaceBottomPanelHeight,
  workspaceBottomPanelHeightScale,
  fullscreenVideoControlsMaxWidth,
  fullscreenVideoControlsMaxWidthScale,
  mediaPreloadMemoryBudgetMb,
  thumbnailGap,
  thumbnailGapScale,
  thumbnailQuality,
  thumbnailWidthInputValue,
  thumbnailGenerationConcurrencyInput,
  thumbnailResolveConcurrencyInput,
  proxyServer,
  ehentaiCookies,
  subtitleFeatureEnabled,
  subtitleLanguage,
  subtitleModelDir,
  subtitleTextFillMode,
  subtitleTextColor,
  subtitleGradientStartColor,
  subtitleGradientEndColor,
  subtitleGradientDirection,
  subtitleGradientCurve,
  subtitleStrokeColor,
  subtitleStrokeWidth,
  subtitleStrokeShadowColor,
  subtitleStrokeShadowRadius,
  subtitleFontSize,
  subtitleMaxLineChars,
  subtitleOffsetY,
  subtitleStylePanelExpanded,
  subtitleModelsLoading,
  subtitleModelsError,
  subtitleModelsStatus,
  subtitleDownloadTask,
  subtitleDownloadPending,
  adReviewVisionEndpoint,
  adReviewVisionModel,
  adReviewVisionVerified,
  adReviewVisionTestPending,
  adReviewVisionTestMessage,
  adReviewVisionSavePending,
  adReviewVisionSaveMessage,
  subtitleCleanupLlmEndpoint,
  subtitleCleanupLlmModel,
  subtitleCleanupLlmPrompt,
  styleId,
  paletteMode,
  paletteDayId,
  paletteNightId,
  shortcutConflicts,
  shortcutLabelByAction,
  settingsBackdropOpacity,
  databaseResetPending,
  databaseResetError,
  runtimePathUpdatePending,
  runtimePathUpdateMessage,
  repositoryMode,
  backendBridgeInjected,
  runtimeInfoLoading,
  runtimeInfoError,
  runtimeInfo,
  mediaCapabilitiesLoading,
  mediaCapabilitiesError,
  mediaCapabilities,
  renderBindingRows,
  onResetShortcuts,
  onUiLocaleChange,
  onLayoutLockedChange,
  onHeaderHeightChange,
  onSettingsBackdropOpacityChange,
  onSettingsFontSizeChange,
  onSidebarRatioChange,
  onSidebarMinWidthChange,
  onSidebarFontSizeChange,
  onElectronNativeChromeEnabledChange,
  onThemeParameterButtonVisibleChange,
  onSidebarCountFontSizeChange,
  onSidebarIndentStepChange,
  onSidebarVerticalGapChange,
  onMetadataRatioChange,
  onWorkspaceBottomPanelHeightChange,
  onFullscreenVideoControlsMaxWidthChange,
  onMediaPreloadMemoryBudgetMbChange,
  onThumbnailGapChange,
  onThumbnailQualityChange,
  onResetThumbnailQuality,
  onThumbnailWidthInputChange,
  onThumbnailWidthInputBlur,
  onThumbnailWidthInputKeyDown,
  onResetThumbnailWidth,
  onThumbnailGenerationConcurrencyInputChange,
  onThumbnailGenerationConcurrencyInputBlur,
  onThumbnailGenerationConcurrencyInputKeyDown,
  onResetThumbnailGenerationConcurrency,
  onThumbnailResolveConcurrencyInputChange,
  onThumbnailResolveConcurrencyInputBlur,
  onThumbnailResolveConcurrencyInputKeyDown,
  onResetThumbnailResolveConcurrency,
  onProxyServerChange,
  onEhentaiCookiesChange,
  onSubtitleFeatureEnabledChange,
  onSubtitleLanguageChange,
  onSubtitleModelDirPick,
  onSubtitleTextFillModeChange,
  onSubtitleTextColorChange,
  onSubtitleGradientStartColorChange,
  onSubtitleGradientEndColorChange,
  onSubtitleGradientDirectionChange,
  onSubtitleGradientCurveChange,
  onSubtitleStrokeColorChange,
  onSubtitleStrokeWidthChange,
  onSubtitleStrokeShadowColorChange,
  onSubtitleStrokeShadowRadiusChange,
  onSubtitleFontSizeChange,
  onSubtitleMaxLineCharsChange,
  onSubtitleOffsetYChange,
  onSubtitleStylePanelExpandedChange,
  onRefreshSubtitleModels,
  onStartSubtitleModelDownload,
  onCancelSubtitleModelDownload,
  onOpenSubtitleModelPage,
  onAdReviewVisionEndpointChange,
  onAdReviewVisionModelChange,
  onTestAdReviewVisionModel,
  onSaveAdReviewVisionModel,
  onSubtitleCleanupLlmEndpointChange,
  onSubtitleCleanupLlmModelChange,
  onSubtitleCleanupLlmPromptChange,
  onStyleChange,
  onPaletteModeChange,
  onPaletteDayChange,
  onPaletteNightChange,
  onClearDatabase,
  onPickDatabaseDirectoryPath,
  onPickThumbnailCacheDirectoryPath,
  onRefreshRuntimeInfo,
}: RenderSettingsMainSectionParams): JSX.Element {
  if (activeSection === 'layout') {
    const styles = listStyles()
    const selectedStyleId = resolveStyleIdFromStyles(styleId, styles)
    const palettes = listPalettesByStyle(selectedStyleId)
    const selectedPalettePair = resolvePalettePairForStyle(selectedStyleId, paletteDayId, paletteNightId)

    return (
      <div className="settings-block">
        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t('ui.settings.languageSection')}</span>
          </header>
          <label htmlFor="settings-ui-locale-select">
            {t('ui.settings.languageLabel')}
            <select
              id="settings-ui-locale-select"
              value={uiLocale}
              onChange={(event) => onUiLocaleChange(event.target.value as 'auto' | 'zh-CN' | 'en-US')}
            >
              <option value="auto">{t('ui.settings.languageOptionAuto')}</option>
              <option value="zh-CN">{t('ui.settings.languageOptionZhCn')}</option>
              <option value="en-US">{t('ui.settings.languageOptionEnUs')}</option>
            </select>
          </label>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t('ui.settings.themeSection')}</span>
          </header>
          <div className="settings-theme-inline-row">
            <label htmlFor="theme-style-select">
              {t('ui.settings.styleLabel')}
              <select id="theme-style-select" value={selectedStyleId} onChange={(event) => onStyleChange(event.target.value)}>
                {styles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="theme-palette-day-select">
              {t('ui.settings.paletteDayDefault')}{paletteMode === 'day' ? t('ui.settings.currentActiveTag') : ''}
              <select
                id="theme-palette-day-select"
                aria-label={t('ui.settings.paletteDayDefault')}
                value={selectedPalettePair.day}
                onChange={(event) => onPaletteDayChange(event.target.value)}
              >
                {palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>
                    {palette.label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="theme-palette-night-select">
              {t('ui.settings.paletteNightDefault')}{paletteMode === 'night' ? t('ui.settings.currentActiveTag') : ''}
              <select
                id="theme-palette-night-select"
                aria-label={t('ui.settings.paletteNightDefault')}
                value={selectedPalettePair.night}
                onChange={(event) => onPaletteNightChange(event.target.value)}
              >
                {palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>
                    {palette.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="header-settings-btn header-icon-only-btn settings-theme-toggle-btn"
              type="button"
              aria-label={paletteMode === 'day' ? t('a11y.header.switchToNightPalette') : t('a11y.header.switchToDayPalette')}
              title={paletteMode === 'day' ? t('a11y.header.switchToNightPalette') : t('a11y.header.switchToDayPalette')}
              aria-pressed={paletteMode === 'night'}
              onClick={() => onPaletteModeChange(paletteMode === 'day' ? 'night' : 'day')}
            >
              <MainUiIcon name={paletteMode === 'day' ? 'day' : 'night'} />
            </button>
          </div>
          <label>
            {t('ui.settings.backdropOpacity', { value: settingsBackdropOpacity.toFixed(0) })}
            <input
              max={100}
              min={0}
              step={1}
              type="range"
              value={settingsBackdropOpacity}
              onChange={(event) => onSettingsBackdropOpacityChange(Number(event.target.value))}
            />
          </label>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t('ui.settings.thumbnailSection')}</span>
          </header>
          <label>
            {t('ui.settings.thumbnailGapScale', { scale: formatScale(thumbnailGapScale), px: thumbnailGap })}
            <input
              max={SIZE_SCALE_CONFIG.thumbnailGap.max}
              min={SIZE_SCALE_CONFIG.thumbnailGap.min}
              step={SIZE_SCALE_CONFIG.thumbnailGap.step}
              type="range"
              value={thumbnailGapScale}
              onChange={(event) => onThumbnailGapChange(toAbsolutePx('thumbnailGap', Number(event.target.value)))}
            />
          </label>
          <div className="settings-thumbnail-four-row">
            <div className="settings-compact-control-cell">
              <span>{t('ui.settings.thumbnailQuality')}</span>
              <div className="settings-compact-control-actions">
                <input
                  max={100}
                  min={1}
                  type="number"
                  aria-label={t('ui.settings.thumbnailQuality')}
                  value={thumbnailQuality}
                  onChange={(event) => onThumbnailQualityChange(Number(event.target.value))}
                />
                <button
                  className="settings-icon-btn main-icon-square-btn"
                  type="button"
                  aria-label={t('a11y.common.restoreDefault')}
                  title={t('tip.common.restoreDefault')}
                  onClick={onResetThumbnailQuality}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div className="settings-compact-control-cell">
              <span>{t('ui.settings.thumbnailResolution')}</span>
              <div className="settings-compact-control-actions">
                <input
                  max={2048}
                  min={128}
                  type="number"
                  aria-label={t('ui.settings.thumbnailResolution')}
                  value={thumbnailWidthInputValue}
                  onBlur={onThumbnailWidthInputBlur}
                  onChange={(event) => onThumbnailWidthInputChange(event.target.value)}
                  onKeyDown={onThumbnailWidthInputKeyDown}
                />
                <button
                  className="settings-icon-btn main-icon-square-btn"
                  type="button"
                  aria-label={t('a11y.common.restoreDefault')}
                  title={t('tip.common.restoreDefault')}
                  onClick={onResetThumbnailWidth}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div className="settings-compact-control-cell">
              <span>{t('ui.settings.thumbnailGenerationConcurrency')}</span>
              <div className="settings-compact-control-actions">
                <input
                  max={16}
                  min={1}
                  type="number"
                  aria-label={t('ui.settings.thumbnailGenerationConcurrency')}
                  value={thumbnailGenerationConcurrencyInput}
                  onBlur={onThumbnailGenerationConcurrencyInputBlur}
                  onChange={(event) => onThumbnailGenerationConcurrencyInputChange(event.target.value)}
                  onKeyDown={onThumbnailGenerationConcurrencyInputKeyDown}
                />
                <button
                  className="settings-icon-btn main-icon-square-btn"
                  type="button"
                  aria-label={t('a11y.common.restoreDefault')}
                  title={t('tip.common.restoreDefault')}
                  onClick={onResetThumbnailGenerationConcurrency}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div className="settings-compact-control-cell">
              <span>{t('ui.settings.thumbnailResolveConcurrency')}</span>
              <div className="settings-compact-control-actions">
                <input
                  max={32}
                  min={1}
                  type="number"
                  aria-label={t('ui.settings.thumbnailResolveConcurrency')}
                  value={thumbnailResolveConcurrencyInput}
                  onBlur={onThumbnailResolveConcurrencyInputBlur}
                  onChange={(event) => onThumbnailResolveConcurrencyInputChange(event.target.value)}
                  onKeyDown={onThumbnailResolveConcurrencyInputKeyDown}
                />
                <button
                  className="settings-icon-btn main-icon-square-btn"
                  type="button"
                  aria-label={t('a11y.common.restoreDefault')}
                  title={t('tip.common.restoreDefault')}
                  onClick={onResetThumbnailResolveConcurrency}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t('ui.settings.debugSection')}</span>
          </header>
          <div className="settings-debug-toggle-row">
            <button
              type="button"
              className={`settings-debug-toggle-btn ${electronNativeChromeEnabled ? 'is-on' : ''}`}
              onClick={() => onElectronNativeChromeEnabledChange(!electronNativeChromeEnabled)}
            >
              {`${t('ui.settings.debugNativeChrome')} · ${electronNativeChromeEnabled ? t('ui.settings.toggleOn') : t('ui.settings.toggleOff')}`}
            </button>
            <button
              type="button"
              className={`settings-debug-toggle-btn ${themeParameterButtonVisible ? 'is-on' : ''}`}
              onClick={() => onThemeParameterButtonVisibleChange(!themeParameterButtonVisible)}
            >
              {`${t('ui.settings.showThemeParameterButton')} · ${themeParameterButtonVisible ? t('ui.settings.toggleOn') : t('ui.settings.toggleOff')}`}
            </button>
          </div>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t('ui.settings.layoutSection')}</span>
          </header>
          <label className="settings-toggle-row">
            <span>{t('ui.settings.layoutLocked')}</span>
            <input type="checkbox" checked={layoutLocked} onChange={(event) => onLayoutLockedChange(event.target.checked)} />
          </label>
          <label>
            {t('ui.settings.headerHeightScale', { scale: formatScale(headerHeightScale), px: headerHeight })}
            <input
              max={SIZE_SCALE_CONFIG.headerHeight.max}
              min={SIZE_SCALE_CONFIG.headerHeight.min}
              step={SIZE_SCALE_CONFIG.headerHeight.step}
              type="range"
              value={headerHeightScale}
              onChange={(event) => onHeaderHeightChange(toAbsolutePx('headerHeight', Number(event.target.value)))}
            />
          </label>
          <label>
            {t('ui.settings.settingsFontScale', { scale: formatScale(settingsFontSizeScale), px: settingsFontSize })}
            <input
              max={SIZE_SCALE_CONFIG.settingsFontSize.max}
              min={SIZE_SCALE_CONFIG.settingsFontSize.min}
              step={SIZE_SCALE_CONFIG.settingsFontSize.step}
              type="range"
              value={settingsFontSizeScale}
              onChange={(event) => onSettingsFontSizeChange(toAbsolutePx('settingsFontSize', Number(event.target.value)))}
            />
          </label>
          <label>
            {t('ui.settings.sidebarRatio', { percent: (sidebarRatio * 100).toFixed(0) })}
            <input max={0.95} min={0} step={0.005} type="range" value={sidebarRatio} onChange={(event) => onSidebarRatioChange(Number(event.target.value))} />
          </label>
          <label>
            {t('ui.settings.sidebarMinWidthScale', { scale: formatScale(sidebarMinWidthScale), px: sidebarMinWidth })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarMinWidth.max}
              min={SIZE_SCALE_CONFIG.sidebarMinWidth.min}
              step={SIZE_SCALE_CONFIG.sidebarMinWidth.step}
              type="range"
              value={sidebarMinWidthScale}
              onChange={(event) => onSidebarMinWidthChange(toAbsolutePx('sidebarMinWidth', Number(event.target.value)))}
            />
          </label>
          <label>
            {t('ui.settings.sidebarFontScale', { scale: formatScale(sidebarFontSizeScale), px: sidebarFontSize })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarFontSize.max}
              min={SIZE_SCALE_CONFIG.sidebarFontSize.min}
              step={SIZE_SCALE_CONFIG.sidebarFontSize.step}
              type="range"
              value={sidebarFontSizeScale}
              onChange={(event) => onSidebarFontSizeChange(toAbsolutePx('sidebarFontSize', Number(event.target.value)))}
            />
          </label>
          <label>
            {t('ui.settings.sidebarCountFontScale', { scale: formatScale(sidebarCountFontSizeScale), px: sidebarCountFontSize })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarCountFontSize.max}
              min={SIZE_SCALE_CONFIG.sidebarCountFontSize.min}
              step={SIZE_SCALE_CONFIG.sidebarCountFontSize.step}
              type="range"
              value={sidebarCountFontSizeScale}
              onChange={(event) => onSidebarCountFontSizeChange(toAbsolutePx('sidebarCountFontSize', Number(event.target.value)))}
            />
          </label>
          <label>
            {t('ui.settings.sidebarIndentScale', { scale: formatScale(sidebarIndentStepScale), px: sidebarIndentStep })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarIndentStep.max}
              min={SIZE_SCALE_CONFIG.sidebarIndentStep.min}
              step={SIZE_SCALE_CONFIG.sidebarIndentStep.step}
              type="range"
              value={sidebarIndentStepScale}
              onChange={(event) => onSidebarIndentStepChange(toAbsolutePx('sidebarIndentStep', Number(event.target.value)))}
            />
          </label>
          <label>
            {t('ui.settings.sidebarVerticalGapScale', { scale: formatScale(sidebarVerticalGapScale), px: sidebarVerticalGap })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarVerticalGap.max}
              min={SIZE_SCALE_CONFIG.sidebarVerticalGap.min}
              step={SIZE_SCALE_CONFIG.sidebarVerticalGap.step}
              type="range"
              value={sidebarVerticalGapScale}
              onChange={(event) => onSidebarVerticalGapChange(toAbsolutePx('sidebarVerticalGap', Number(event.target.value)))}
            />
          </label>
          <label>
            {t('ui.settings.metadataPanelRatio', { percent: (metadataRatio * 100).toFixed(0) })}
            <input max={0.45} min={0.2} step={0.01} type="range" value={metadataRatio} onChange={(event) => onMetadataRatioChange(Number(event.target.value))} />
          </label>
          <label>
            {t('ui.settings.workspaceBottomPanelHeightScale', { scale: formatScale(workspaceBottomPanelHeightScale), px: workspaceBottomPanelHeight })}
            <input
              max={SIZE_SCALE_CONFIG.workspaceBottomPanelHeight.max}
              min={SIZE_SCALE_CONFIG.workspaceBottomPanelHeight.min}
              step={SIZE_SCALE_CONFIG.workspaceBottomPanelHeight.step}
              type="range"
              value={workspaceBottomPanelHeightScale}
              onChange={(event) => onWorkspaceBottomPanelHeightChange(toAbsolutePx('workspaceBottomPanelHeight', Number(event.target.value)))}
            />
          </label>
          <label>
            {t('ui.settings.fullscreenVideoControlsMaxWidthScale', {
              scale: formatScale(fullscreenVideoControlsMaxWidthScale),
              px: fullscreenVideoControlsMaxWidth,
            })}
            <input
              max={SIZE_SCALE_CONFIG.fullscreenVideoControlsMaxWidth.max}
              min={SIZE_SCALE_CONFIG.fullscreenVideoControlsMaxWidth.min}
              step={SIZE_SCALE_CONFIG.fullscreenVideoControlsMaxWidth.step}
              type="range"
              value={fullscreenVideoControlsMaxWidthScale}
              onChange={(event) =>
                onFullscreenVideoControlsMaxWidthChange(toAbsolutePx('fullscreenVideoControlsMaxWidth', Number(event.target.value)))
              }
            />
          </label>
          <label>
            {t('ui.settings.mediaPreloadMemoryBudgetMb', { value: mediaPreloadMemoryBudgetMb })}
            <input
              max={4096}
              min={0}
              step={64}
              type="range"
              value={mediaPreloadMemoryBudgetMb}
              onChange={(event) => onMediaPreloadMemoryBudgetMbChange(Number(event.target.value))}
            />
          </label>
        </section>

      </div>
    )
  }

  if (activeSection === 'system') {
    const rendererIsProd = import.meta.env.PROD
    const bridgeMissingInProduction = rendererIsProd && repositoryMode === 'real' && !backendBridgeInjected
    const gpuFeatureRows = runtimeInfo?.gpu_feature_status
      ? Object.entries(runtimeInfo.gpu_feature_status).sort(([left], [right]) => left.localeCompare(right))
      : []
    const gpuInfoJson = runtimeInfo?.gpu_info_basic ? JSON.stringify(runtimeInfo.gpu_info_basic, null, 2) : null

    return (
      <div className="settings-block">
        <fieldset className="settings-subsection">
          <legend>{t('ui.settings.runtimeDiagnosticsLegend')}</legend>
          <p className="settings-placeholder">{t('ui.settings.runtimeDiagnosticsHint')}</p>
          <div className="settings-runtime-grid">
            <span>{t('ui.settings.rendererProd')}</span>
            <code>{rendererIsProd ? 'true' : 'false'}</code>
            <span>{t('ui.settings.repositoryMode')}</span>
            <code>{repositoryMode}</code>
            <span>{t('ui.settings.backendBridge')}</span>
            <code>{backendBridgeInjected ? 'true' : 'false'}</code>
            <span>{t('ui.settings.appVersion')}</span>
            <code>{runtimeInfo?.app_version ?? '-'}</code>
            <span>{t('ui.settings.mainIsPackaged')}</span>
            <code>{typeof runtimeInfo?.is_packaged === 'boolean' ? String(runtimeInfo.is_packaged) : '-'}</code>
            <span>{t('ui.settings.platformArch')}</span>
            <code>{runtimeInfo ? `${runtimeInfo.platform}/${runtimeInfo.arch}` : '-'}</code>
            <span>{t('ui.settings.userDataPath')}</span>
            <code>{runtimeInfo?.user_data_path ?? '-'}</code>
            <span>{t('ui.settings.libraryRoot')}</span>
            <code>{runtimeInfo?.library_root ?? '-'}</code>
            <span>{t('ui.settings.databasePath')}</span>
            <code>{runtimeInfo?.database_path ?? '-'}</code>
          </div>
          <div className="settings-runtime-actions">
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              disabled={runtimeInfoLoading}
              aria-label={runtimeInfoLoading ? t('a11y.settings.loadingDiagnostics') : t('a11y.settings.refreshDiagnostics')}
              title={runtimeInfoLoading ? t('a11y.settings.loadingDiagnostics') : t('a11y.settings.refreshDiagnostics')}
              onClick={onRefreshRuntimeInfo}
            >
              <MainUiIcon name="refresh" />
            </button>
          </div>
          {runtimeInfoError ? <p className="settings-danger-text">{runtimeInfoError}</p> : null}
          {bridgeMissingInProduction ? (
            <p className="settings-danger-text">
              {t('ui.settings.bridgeMissingWarning')}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>{t('ui.settings.gpuDiagnosticsLegend')}</legend>
          <div className="settings-runtime-grid">
            <span>{t('ui.settings.hardwareAccelerationEnabled')}</span>
            <code>{typeof runtimeInfo?.hardware_acceleration_enabled === 'boolean' ? String(runtimeInfo.hardware_acceleration_enabled) : '-'}</code>
          </div>
          {gpuFeatureRows.length > 0 ? (
            <div className="settings-runtime-grid">
              {gpuFeatureRows.flatMap(([key, value]) => [
                <span key={`${key}:label`}>{key}</span>,
                <code key={`${key}:value`}>{value}</code>,
              ])}
            </div>
          ) : (
            <p className="settings-placeholder">{t('ui.settings.gpuFeatureStatusEmpty')}</p>
          )}
          {gpuInfoJson ? <pre className="settings-code-block">{gpuInfoJson}</pre> : <p className="settings-placeholder">{t('ui.settings.gpuInfoEmpty')}</p>}
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>{t('ui.settings.mediaCapabilitiesLegend')}</legend>
          {mediaCapabilitiesLoading ? <p className="settings-placeholder">{t('ui.settings.mediaCapabilitiesLoading')}</p> : null}
          {mediaCapabilitiesError ? <p className="settings-danger-text">{mediaCapabilitiesError}</p> : null}
          {mediaCapabilities.length > 0 ? (
            <div className="settings-runtime-grid">
              {mediaCapabilities.flatMap((item) => [
                <span key={`${item.id}:label`}>{item.label}</span>,
                <code key={`${item.id}:value`}>
                  {item.supported
                    ? t('ui.settings.mediaCapabilitySupported', {
                        supported: item.supported,
                        smooth: item.smooth,
                        powerEfficient: item.powerEfficient ?? 'unknown',
                      })
                    : item.error
                      ? t('ui.settings.mediaCapabilityUnsupportedWithError', { error: item.error })
                      : t('ui.settings.mediaCapabilityUnsupported')}
                </code>,
              ])}
            </div>
          ) : null}
        </fieldset>
      </div>
    )
  }

  if (activeSection === 'model') {
    return (
      <div className="settings-block">
        <fieldset className="settings-subsection">
          <legend>{t('ui.settings.offlineSubtitleLegend')}</legend>
          <label className="settings-toggle-row">
            <span>{t('ui.settings.offlineSubtitleEnabled')}</span>
            <input
              type="checkbox"
              checked={subtitleFeatureEnabled}
              onChange={(event) => onSubtitleFeatureEnabledChange(event.target.checked)}
            />
          </label>
          <label>
            {t('ui.settings.offlineSubtitleLanguage')}
            <select
              value={subtitleLanguage}
              onChange={(event) =>
                onSubtitleLanguageChange(event.target.value as 'auto' | 'zh' | 'en' | 'ja' | 'ko' | 'yue')
              }
            >
              <option value="auto">{t('ui.settings.offlineSubtitleLanguageAuto')}</option>
              <option value="zh">{t('ui.settings.offlineSubtitleLanguageZh')}</option>
              <option value="en">{t('ui.settings.offlineSubtitleLanguageEn')}</option>
              <option value="ja">{t('ui.settings.offlineSubtitleLanguageJa')}</option>
              <option value="ko">{t('ui.settings.offlineSubtitleLanguageKo')}</option>
              <option value="yue">{t('ui.settings.offlineSubtitleLanguageYue')}</option>
            </select>
          </label>
          <label>
            {t('ui.settings.offlineSubtitleModelDir')}
            <div className="settings-inline-field">
              <input
                type="text"
                value={subtitleModelDir}
                readOnly
                placeholder={t('ui.settings.offlineSubtitleModelDirPlaceholder')}
              />
              <button type="button" onClick={onSubtitleModelDirPick}>
                {t('ui.settings.offlineSubtitleChooseModelDir')}
              </button>
            </div>
          </label>
          <label>
            {t('ui.settings.offlineSubtitleOffsetY')}
            <input
              type="range"
              min={-400}
              max={400}
              step={2}
              value={subtitleOffsetY}
              onChange={(event) => onSubtitleOffsetYChange(Number(event.target.value))}
            />
            <span className="settings-placeholder">{t('ui.settings.offlineSubtitleOffsetYValue', { value: subtitleOffsetY })}</span>
            <span className="settings-placeholder">{t('ui.settings.offlineSubtitleOffsetYShortcutHint')}</span>
          </label>
          <details
            className="settings-collapsible"
            open={subtitleStylePanelExpanded}
            onToggle={(event) =>
              onSubtitleStylePanelExpandedChange(
                (event.currentTarget as HTMLDetailsElement).open,
              )
            }
          >
            <summary>{t('ui.settings.offlineSubtitleStyleSection')}</summary>
            <div className="settings-collapsible-content">
              <label>
                {t('ui.settings.offlineSubtitleTextFillMode')}
                <select
                  value={subtitleTextFillMode}
                  onChange={(event) => onSubtitleTextFillModeChange(event.target.value as 'solid' | 'gradient')}
                >
                  <option value="solid">{t('ui.settings.offlineSubtitleTextFillModeSolid')}</option>
                  <option value="gradient">{t('ui.settings.offlineSubtitleTextFillModeGradient')}</option>
                </select>
              </label>
              {subtitleTextFillMode === 'solid' ? (
                <label>
                  {t('ui.settings.offlineSubtitleTextColor')}
                  <input
                    type="color"
                    value={subtitleTextColor}
                    onChange={(event) => onSubtitleTextColorChange(event.target.value)}
                  />
                </label>
              ) : (
                <>
                  <label>
                    {t('ui.settings.offlineSubtitleGradientStartColor')}
                    <input
                      type="color"
                      value={subtitleGradientStartColor}
                      onChange={(event) => onSubtitleGradientStartColorChange(event.target.value)}
                    />
                  </label>
                  <label>
                    {t('ui.settings.offlineSubtitleGradientEndColor')}
                    <input
                      type="color"
                      value={subtitleGradientEndColor}
                      onChange={(event) => onSubtitleGradientEndColorChange(event.target.value)}
                    />
                  </label>
                  <label>
                    {t('ui.settings.offlineSubtitleGradientDirection')}
                    <select
                      value={subtitleGradientDirection}
                      onChange={(event) =>
                        onSubtitleGradientDirectionChange(
                          event.target.value as
                            | 'left-to-right'
                            | 'right-to-left'
                            | 'top-to-bottom'
                            | 'bottom-to-top'
                            | 'top-left-to-bottom-right'
                            | 'top-right-to-bottom-left'
                            | 'bottom-left-to-top-right'
                            | 'bottom-right-to-top-left',
                        )
                      }
                    >
                      <option value="left-to-right">{t('ui.settings.offlineSubtitleGradientDirectionLeftToRight')}</option>
                      <option value="right-to-left">{t('ui.settings.offlineSubtitleGradientDirectionRightToLeft')}</option>
                      <option value="top-to-bottom">{t('ui.settings.offlineSubtitleGradientDirectionTopToBottom')}</option>
                      <option value="bottom-to-top">{t('ui.settings.offlineSubtitleGradientDirectionBottomToTop')}</option>
                      <option value="top-left-to-bottom-right">{t('ui.settings.offlineSubtitleGradientDirectionTopLeftToBottomRight')}</option>
                      <option value="top-right-to-bottom-left">{t('ui.settings.offlineSubtitleGradientDirectionTopRightToBottomLeft')}</option>
                      <option value="bottom-left-to-top-right">{t('ui.settings.offlineSubtitleGradientDirectionBottomLeftToTopRight')}</option>
                      <option value="bottom-right-to-top-left">{t('ui.settings.offlineSubtitleGradientDirectionBottomRightToTopLeft')}</option>
                    </select>
                  </label>
                  <label>
                    {t('ui.settings.offlineSubtitleGradientCurve')}
                    <select
                      value={subtitleGradientCurve}
                      onChange={(event) =>
                        onSubtitleGradientCurveChange(
                          event.target.value as 'linear' | 'smooth' | 'bezier' | 'smoother',
                        )
                      }
                    >
                      <option value="linear">{t('ui.settings.offlineSubtitleGradientCurveLinear')}</option>
                      <option value="smooth">{t('ui.settings.offlineSubtitleGradientCurveSmooth')}</option>
                      <option value="bezier">{t('ui.settings.offlineSubtitleGradientCurveBezier')}</option>
                      <option value="smoother">{t('ui.settings.offlineSubtitleGradientCurveSmoother')}</option>
                    </select>
                  </label>
                </>
              )}
              <label>
                {t('ui.settings.offlineSubtitleStrokeColor')}
                <input
                  type="color"
                  value={subtitleStrokeColor}
                  onChange={(event) => onSubtitleStrokeColorChange(event.target.value)}
                />
              </label>
              <label>
                {t('ui.settings.offlineSubtitleStrokeWidth')}
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.5}
                  value={subtitleStrokeWidth}
                  onChange={(event) => onSubtitleStrokeWidthChange(Number(event.target.value))}
                />
                <span className="settings-placeholder">{subtitleStrokeWidth.toFixed(1)}px</span>
              </label>
              <label>
                {t('ui.settings.offlineSubtitleFontSize')}
                <input
                  type="range"
                  min={14}
                  max={72}
                  step={1}
                  value={subtitleFontSize}
                  onChange={(event) => onSubtitleFontSizeChange(Number(event.target.value))}
                />
                <span className="settings-placeholder">{t('ui.settings.offlineSubtitleFontSizeValue', { value: subtitleFontSize })}</span>
              </label>
              <label>
                {t('ui.settings.offlineSubtitleMaxLineChars')}
                <input
                  type="range"
                  min={8}
                  max={80}
                  step={1}
                  value={subtitleMaxLineChars}
                  onChange={(event) => onSubtitleMaxLineCharsChange(Number(event.target.value))}
                />
                <span className="settings-placeholder">{t('ui.settings.offlineSubtitleMaxLineCharsValue', { value: subtitleMaxLineChars })}</span>
              </label>
              <label>
                {t('ui.settings.offlineSubtitleStrokeShadowColor')}
                <input
                  type="color"
                  value={subtitleStrokeShadowColor}
                  onChange={(event) => onSubtitleStrokeShadowColorChange(event.target.value)}
                />
              </label>
              <label>
                {t('ui.settings.offlineSubtitleStrokeShadowRadius')}
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={subtitleStrokeShadowRadius}
                  onChange={(event) => onSubtitleStrokeShadowRadiusChange(Number(event.target.value))}
                />
                <span className="settings-placeholder">{subtitleStrokeShadowRadius.toFixed(0)}px</span>
              </label>
            </div>
          </details>
          <div className="settings-test-row">
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              disabled={subtitleModelsLoading}
              aria-label={t('ui.settings.offlineSubtitleRescanDirectory')}
              title={t('ui.settings.offlineSubtitleRescanDirectory')}
              onClick={onRefreshSubtitleModels}
            >
              <MainUiIcon name="refresh" />
            </button>
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              disabled={subtitleDownloadPending || subtitleModelsLoading || !subtitleModelDir}
              aria-label={t('ui.settings.offlineSubtitleDownloadModel')}
              title={t('ui.settings.offlineSubtitleDownloadModel')}
              onClick={onStartSubtitleModelDownload}
            >
              <MainUiIcon name="save" />
            </button>
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              disabled={
                !subtitleDownloadTask ||
                (subtitleDownloadTask.status !== 'queued' &&
                  subtitleDownloadTask.status !== 'downloading' &&
                  subtitleDownloadTask.status !== 'verifying')
              }
              aria-label={t('ui.settings.offlineSubtitleCancelDownload')}
              title={t('ui.settings.offlineSubtitleCancelDownload')}
              onClick={onCancelSubtitleModelDownload}
            >
              <MainUiIcon name="close" />
            </button>
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              aria-label={t('ui.settings.offlineSubtitleOpenModelPage')}
              title={t('ui.settings.offlineSubtitleOpenModelPage')}
              onClick={onOpenSubtitleModelPage}
            >
              <MainUiIcon name="videoInfo" />
            </button>
          </div>
          {subtitleDownloadTask ? (
            <p className="settings-placeholder">
              {t('ui.settings.offlineSubtitleDownloadProgress', {
                status: subtitleDownloadTask.status,
                percent: subtitleDownloadTask.percent.toFixed(1),
                speed: Math.round(subtitleDownloadTask.speedBps / 1024),
                eta: subtitleDownloadTask.etaSec == null ? '-' : String(subtitleDownloadTask.etaSec),
                message: subtitleDownloadTask.message ?? '-',
              })}
            </p>
          ) : null}
          {subtitleModelsError ? <p className="settings-danger-text">{subtitleModelsError}</p> : null}
          {subtitleModelsStatus ? <p className="settings-placeholder">{subtitleModelsStatus}</p> : null}
          {subtitleDownloadTask?.status === 'failed' ? (
            <p className="settings-placeholder">{t('ui.settings.offlineSubtitleManualInstallHint')}</p>
          ) : null}
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>{t('ui.settings.adReviewVisionLegend')}</legend>
          <label>
            {t('ui.settings.adReviewVisionEndpoint')}
            <input
              type="text"
              value={adReviewVisionEndpoint}
              onChange={(event) => onAdReviewVisionEndpointChange(event.target.value)}
            />
          </label>
          <label>
            {t('ui.settings.adReviewVisionModel')}
            <input
              type="text"
              value={adReviewVisionModel}
              onChange={(event) => onAdReviewVisionModelChange(event.target.value)}
            />
          </label>
          <div className="settings-test-row">
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              disabled={adReviewVisionTestPending}
              aria-label={adReviewVisionTestPending ? t('a11y.settings.testingVisionModel') : t('a11y.settings.testVisionModel')}
              title={adReviewVisionTestPending ? t('a11y.settings.testingVisionModel') : t('a11y.settings.testVisionModel')}
              onClick={onTestAdReviewVisionModel}
            >
              <MainUiIcon name="test" />
            </button>
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              disabled={adReviewVisionSavePending}
              aria-label={adReviewVisionSavePending ? t('a11y.settings.savingVisionModel') : t('a11y.settings.saveVisionModel')}
              title={adReviewVisionSavePending ? t('a11y.settings.savingVisionModel') : t('a11y.settings.saveVisionModel')}
              onClick={onSaveAdReviewVisionModel}
            >
              <MainUiIcon name="save" />
            </button>
            <span className={`settings-test-status ${adReviewVisionVerified ? 'is-ok' : 'is-pending'}`}>
              {adReviewVisionTestMessage ?? (adReviewVisionVerified ? t('ui.settings.adReviewVisionPassed') : t('ui.settings.adReviewVisionUntested'))}
            </span>
          </div>
          {adReviewVisionSaveMessage ? <p className="settings-placeholder">{adReviewVisionSaveMessage}</p> : null}
          <p className="settings-placeholder">{t('ui.settings.adReviewVisionHint')}</p>
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>{t('ui.settings.subtitleCleanupLlmLegend')}</legend>
          <label>
            {t('ui.settings.subtitleCleanupLlmEndpoint')}
            <input
              type="text"
              value={subtitleCleanupLlmEndpoint}
              onChange={(event) => onSubtitleCleanupLlmEndpointChange(event.target.value)}
            />
          </label>
          <label>
            {t('ui.settings.subtitleCleanupLlmModel')}
            <input
              type="text"
              value={subtitleCleanupLlmModel}
              onChange={(event) => onSubtitleCleanupLlmModelChange(event.target.value)}
            />
          </label>
          <details className="settings-collapsible">
            <summary>{t('ui.settings.subtitleCleanupLlmPromptSection')}</summary>
            <div className="settings-collapsible-content">
              <label>
                {t('ui.settings.subtitleCleanupLlmPrompt')}
                <textarea
                  className="settings-scroll-hidden-textarea"
                  rows={8}
                  value={subtitleCleanupLlmPrompt}
                  onChange={(event) => onSubtitleCleanupLlmPromptChange(event.target.value)}
                />
              </label>
            </div>
          </details>
          <p className="settings-placeholder">{t('ui.settings.subtitleCleanupLlmHint')}</p>
        </fieldset>
      </div>
    )
  }

  if (activeSection === 'shortcuts') {
    return (
      <div className="settings-block settings-shortcuts">
        <div className="settings-shortcuts-head">
          <strong>{t('ui.settings.shortcutsTitle')}</strong>
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            aria-label={t('a11y.common.restoreDefault')}
            title={t('tip.common.restoreDefault')}
            onClick={onResetShortcuts}
          >
            <MainUiIcon name="return" />
          </button>
        </div>

        {renderBindingRows()}

        <div className="shortcut-conflicts">
          <strong>{t('ui.settings.shortcutConflictsTitle')}</strong>
          {shortcutConflicts.length === 0 ? (
            <p>{t('ui.settings.shortcutConflictsNone')}</p>
          ) : (
            <ul>
              {shortcutConflicts.map((conflict) => (
                <li key={`${conflict.scope}-${conflict.combo}`}>
                  {t('ui.settings.shortcutConflictLine', {
                    scope: conflict.scope,
                    combo: conflict.combo,
                    actions: conflict.actions.map((action) => shortcutLabelByAction.get(action) ?? action).join(', '),
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  if (activeSection === 'database') {
    const databasePath = runtimeInfo?.database_path ?? ''
    const thumbnailCachePath = runtimeInfo?.thumbnail_cache_path ?? ''

    return (
      <div className="settings-block">
        <p className="settings-placeholder">{t('ui.settings.databaseResetHint')}</p>
        <label>
          {t('ui.settings.databaseResetLabel')}
          <button type="button" className="settings-danger-btn" disabled={databaseResetPending} onClick={onClearDatabase}>
            {databaseResetPending ? t('ui.settings.databaseResetPending') : t('ui.settings.databaseResetAction')}
          </button>
        </label>
        {databaseResetError ? <p className="settings-danger-text">{databaseResetError}</p> : null}

        <fieldset className="settings-subsection">
          <legend>{t('ui.settings.databaseDirectoryLegend')}</legend>
          <p className="settings-placeholder">{t('ui.settings.databaseDirectoryHint')}</p>
          <p className="settings-placeholder">{t('ui.settings.databaseDirectoryMigrationHint')}</p>
          <label>
            {t('ui.settings.sqlDatabasePathLabel')}
            <div className="settings-inline-field">
              <input type="text" value={databasePath} readOnly placeholder={t('ui.settings.readRuntimeInfoPlaceholder')} />
              <button type="button" disabled={runtimePathUpdatePending} onClick={onPickDatabaseDirectoryPath}>
                {runtimePathUpdatePending ? t('ui.settings.runtimePathSaving') : t('ui.settings.chooseSqlDirectory')}
              </button>
            </div>
          </label>
          <label>
            {t('ui.settings.thumbnailCacheDirectoryLabel')}
            <div className="settings-inline-field">
              <input type="text" value={thumbnailCachePath} readOnly placeholder={t('ui.settings.readRuntimeInfoPlaceholder')} />
              <button type="button" disabled={runtimePathUpdatePending} onClick={onPickThumbnailCacheDirectoryPath}>
                {runtimePathUpdatePending ? t('ui.settings.runtimePathSaving') : t('ui.settings.chooseThumbnailDirectory')}
              </button>
            </div>
          </label>
          {runtimePathUpdateMessage ? <p className="settings-placeholder">{runtimePathUpdateMessage}</p> : null}
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>{t('ui.settings.networkProxyLegend')}</legend>
          <p className="settings-placeholder">{t('ui.settings.networkProxyHint')}</p>
          <label>
            {t('ui.settings.proxyServerLabel')}
            <input
              type="text"
              value={proxyServer}
              placeholder={t('ui.settings.proxyServerPlaceholder')}
              onChange={(event) => onProxyServerChange(event.target.value)}
            />
          </label>
          <label>
            {t('ui.settings.ehentaiCookiesLabel')}
            <input
              type="text"
              value={ehentaiCookies}
              placeholder={t('ui.settings.ehentaiCookiesPlaceholder')}
              onChange={(event) => onEhentaiCookiesChange(event.target.value)}
            />
          </label>
        </fieldset>

      </div>
    )
  }

  return <div className="settings-block" />
}
