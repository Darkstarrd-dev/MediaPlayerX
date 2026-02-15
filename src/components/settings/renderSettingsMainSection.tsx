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
  thumbnailGap: number
  thumbnailGapScale: number
  thumbnailQuality: number
  thumbnailWidthInputValue: string
  thumbnailGenerationConcurrencyInput: string
  thumbnailResolveConcurrencyInput: string
  proxyServer: string
  ehentaiCookies: string
  adReviewVisionEndpoint: string
  adReviewVisionModel: string
  adReviewVisionVerified: boolean
  adReviewVisionTestPending: boolean
  adReviewVisionTestMessage: string | null
  adReviewVisionSavePending: boolean
  adReviewVisionSaveMessage: string | null
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
  onLayoutLockedChange: (value: boolean) => void
  onHeaderHeightChange: (value: number) => void
  onSettingsBackdropOpacityChange: (value: number) => void
  onSettingsFontSizeChange: (value: number) => void
  onSidebarRatioChange: (value: number) => void
  onSidebarMinWidthChange: (value: number) => void
  onSidebarFontSizeChange: (value: number) => void
  onElectronNativeChromeEnabledChange: (value: boolean) => void
  onSidebarCountFontSizeChange: (value: number) => void
  onSidebarIndentStepChange: (value: number) => void
  onSidebarVerticalGapChange: (value: number) => void
  onMetadataRatioChange: (value: number) => void
  onWorkspaceBottomPanelHeightChange: (value: number) => void
  onFullscreenVideoControlsMaxWidthChange: (value: number) => void
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
  onAdReviewVisionEndpointChange: (value: string) => void
  onAdReviewVisionModelChange: (value: string) => void
  onTestAdReviewVisionModel: () => void
  onSaveAdReviewVisionModel: () => void
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
  thumbnailGap,
  thumbnailGapScale,
  thumbnailQuality,
  thumbnailWidthInputValue,
  thumbnailGenerationConcurrencyInput,
  thumbnailResolveConcurrencyInput,
  proxyServer,
  ehentaiCookies,
  adReviewVisionEndpoint,
  adReviewVisionModel,
  adReviewVisionVerified,
  adReviewVisionTestPending,
  adReviewVisionTestMessage,
  adReviewVisionSavePending,
  adReviewVisionSaveMessage,
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
  onLayoutLockedChange,
  onHeaderHeightChange,
  onSettingsBackdropOpacityChange,
  onSettingsFontSizeChange,
  onSidebarRatioChange,
  onSidebarMinWidthChange,
  onSidebarFontSizeChange,
  onElectronNativeChromeEnabledChange,
  onSidebarCountFontSizeChange,
  onSidebarIndentStepChange,
  onSidebarVerticalGapChange,
  onMetadataRatioChange,
  onWorkspaceBottomPanelHeightChange,
  onFullscreenVideoControlsMaxWidthChange,
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
  onAdReviewVisionEndpointChange,
  onAdReviewVisionModelChange,
  onTestAdReviewVisionModel,
  onSaveAdReviewVisionModel,
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
                <input max={100} min={1} type="number" value={thumbnailQuality} onChange={(event) => onThumbnailQualityChange(Number(event.target.value))} />
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
            <span>{t('ui.settings.layoutSection')}</span>
          </header>
          <label className="settings-toggle-row">
            <span>{t('ui.settings.layoutLocked')}</span>
            <input type="checkbox" checked={layoutLocked} onChange={(event) => onLayoutLockedChange(event.target.checked)} />
          </label>
          <label className="settings-toggle-row">
            <span>{t('ui.settings.debugNativeChrome')}</span>
            <input
              type="checkbox"
              checked={electronNativeChromeEnabled}
              onChange={(event) => onElectronNativeChromeEnabledChange(event.target.checked)}
            />
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
          <legend>运行时诊断</legend>
          <p className="settings-placeholder">用于排查 EXE 与 dev:desktop 的后端桥接与数据路径差异。</p>
          <div className="settings-runtime-grid">
            <span>Renderer PROD</span>
            <code>{rendererIsProd ? 'true' : 'false'}</code>
            <span>Repository 模式</span>
            <code>{repositoryMode}</code>
            <span>Backend Bridge</span>
            <code>{backendBridgeInjected ? 'true' : 'false'}</code>
            <span>App 版本</span>
            <code>{runtimeInfo?.app_version ?? '-'}</code>
            <span>Main isPackaged</span>
            <code>{typeof runtimeInfo?.is_packaged === 'boolean' ? String(runtimeInfo.is_packaged) : '-'}</code>
            <span>平台/架构</span>
            <code>{runtimeInfo ? `${runtimeInfo.platform}/${runtimeInfo.arch}` : '-'}</code>
            <span>UserData 路径</span>
            <code>{runtimeInfo?.user_data_path ?? '-'}</code>
            <span>Library Root</span>
            <code>{runtimeInfo?.library_root ?? '-'}</code>
            <span>数据库路径</span>
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
              当前为生产构建且未检测到后端桥接，已禁用 mock 回退。请检查打包产物中的 preload 注入链路。
            </p>
          ) : null}
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>GPU 诊断（Main）</legend>
          <div className="settings-runtime-grid">
            <span>硬件加速启用</span>
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
            <p className="settings-placeholder">无 GPU FeatureStatus 数据。</p>
          )}
          {gpuInfoJson ? <pre className="settings-code-block">{gpuInfoJson}</pre> : <p className="settings-placeholder">无 GPUInfo(basic) 数据。</p>}
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>解码能力检测（Renderer）</legend>
          {mediaCapabilitiesLoading ? <p className="settings-placeholder">检测中...</p> : null}
          {mediaCapabilitiesError ? <p className="settings-danger-text">{mediaCapabilitiesError}</p> : null}
          {mediaCapabilities.length > 0 ? (
            <div className="settings-runtime-grid">
              {mediaCapabilities.flatMap((item) => [
                <span key={`${item.id}:label`}>{item.label}</span>,
                <code key={`${item.id}:value`}>
                  {item.supported
                    ? `supported=${item.supported}, smooth=${item.smooth}, powerEfficient=${item.powerEfficient ?? 'unknown'}`
                    : `unsupported${item.error ? ` (${item.error})` : ''}`}
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
          <legend>AI广告审核视觉模型</legend>
          <label>
            视觉模型端口
            <input
              type="text"
              value={adReviewVisionEndpoint}
              onChange={(event) => onAdReviewVisionEndpointChange(event.target.value)}
            />
          </label>
          <label>
            视觉模型ID
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
              {adReviewVisionTestMessage ?? (adReviewVisionVerified ? '已通过测试' : '未测试')}
            </span>
          </div>
          {adReviewVisionSaveMessage ? <p className="settings-placeholder">{adReviewVisionSaveMessage}</p> : null}
          <p className="settings-placeholder">通过测试后，文件管理模式主工具栏会显示“广告审核”按钮。</p>
        </fieldset>
      </div>
    )
  }

  if (activeSection === 'shortcuts') {
    return (
      <div className="settings-block settings-shortcuts">
        <div className="settings-shortcuts-head">
          <strong>快捷键设置</strong>
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
          <strong>冲突检测</strong>
          {shortcutConflicts.length === 0 ? (
            <p>当前无冲突。</p>
          ) : (
            <ul>
              {shortcutConflicts.map((conflict) => (
                <li key={`${conflict.scope}-${conflict.combo}`}>
                  {`${conflict.scope} 范围：${conflict.combo} -> ${conflict.actions.map((action) => shortcutLabelByAction.get(action) ?? action).join(', ')}`}
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
        <p className="settings-placeholder">开发阶段可使用此功能清空本地数据库后重启验证初始化链路。</p>
        <label>
          清除数据库（开发）
          <button type="button" className="settings-danger-btn" disabled={databaseResetPending} onClick={onClearDatabase}>
            {databaseResetPending ? '清除中...' : '清除数据库'}
          </button>
        </label>
        {databaseResetError ? <p className="settings-danger-text">{databaseResetError}</p> : null}

        <fieldset className="settings-subsection">
          <legend>数据库目录设置</legend>
          <p className="settings-placeholder">选择后会立即保存目录配置，重启后自动沿用。</p>
          <p className="settings-placeholder">若当前数据库已有内容，切换 SQL 目录时会自动迁移数据库文件。</p>
          <label>
            SQL 库路径
            <div className="settings-inline-field">
              <input type="text" value={databasePath} readOnly placeholder="读取运行时诊断后显示" />
              <button type="button" disabled={runtimePathUpdatePending} onClick={onPickDatabaseDirectoryPath}>
                {runtimePathUpdatePending ? '保存中...' : '选择SQL目录'}
              </button>
            </div>
          </label>
          <label>
            缩略图目录
            <div className="settings-inline-field">
              <input type="text" value={thumbnailCachePath} readOnly placeholder="读取运行时诊断后显示" />
              <button type="button" disabled={runtimePathUpdatePending} onClick={onPickThumbnailCacheDirectoryPath}>
                {runtimePathUpdatePending ? '保存中...' : '选择缩略图目录'}
              </button>
            </div>
          </label>
          {runtimePathUpdateMessage ? <p className="settings-placeholder">{runtimePathUpdateMessage}</p> : null}
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>网络代理设置</legend>
          <p className="settings-placeholder">用于元数据抓取链路，支持 socks5:// 与 http(s)://。</p>
          <label>
            代理服务器
            <input
              type="text"
              value={proxyServer}
              placeholder="例如 socks5://127.0.0.1:2080"
              onChange={(event) => onProxyServerChange(event.target.value)}
            />
          </label>
          <label>
            E-Hentai Cookies
            <input
              type="text"
              value={ehentaiCookies}
              placeholder="例如 ipb_member_id=xxx; ipb_pass_hash=xxx"
              onChange={(event) => onEhentaiCookiesChange(event.target.value)}
            />
          </label>
        </fieldset>

      </div>
    )
  }

  return <div className="settings-block" />
}
