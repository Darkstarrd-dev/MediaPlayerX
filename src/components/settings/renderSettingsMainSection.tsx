import {
  listPalettesByStyle,
  listStyles,
  resolvePalettePairForStyle,
  resolvePaletteIdForStyle,
  resolveStyleIdFromStyles,
} from '../../features/theme/themeRegistry'
import type { ReadRuntimeInfoResponseDto } from '../../contracts/backend'
import type { RepositoryMode } from '../../features/backend/repository'
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { ShortcutConflict } from '../../shortcuts'
import {
  formatScale,
  SIZE_SCALE_CONFIG,
  toAbsolutePx,
} from './settingsScale'

export type SettingsSection = 'layout' | 'model' | 'database' | 'shortcuts'

interface RenderSettingsMainSectionParams {
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
  paletteId: string
  paletteMode: 'day' | 'night'
  paletteDayId: string
  paletteNightId: string
  shortcutConflicts: ShortcutConflict[]
  shortcutLabelByAction: Map<string, string>
  databaseResetPending: boolean
  databaseResetError: string | null
  runtimePathUpdatePending: boolean
  runtimePathUpdateMessage: string | null
  repositoryMode: RepositoryMode
  backendBridgeInjected: boolean
  runtimeInfoLoading: boolean
  runtimeInfoError: string | null
  runtimeInfo: ReadRuntimeInfoResponseDto | null
  renderBindingRows: () => JSX.Element
  onResetShortcuts: () => void
  onLayoutLockedChange: (value: boolean) => void
  onHeaderHeightChange: (value: number) => void
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
  onThumbnailWidthInputChange: (value: string) => void
  onThumbnailWidthInputBlur: () => void
  onThumbnailWidthInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
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
  paletteId,
  paletteMode,
  paletteDayId,
  paletteNightId,
  shortcutConflicts,
  shortcutLabelByAction,
  databaseResetPending,
  databaseResetError,
  runtimePathUpdatePending,
  runtimePathUpdateMessage,
  repositoryMode,
  backendBridgeInjected,
  runtimeInfoLoading,
  runtimeInfoError,
  runtimeInfo,
  renderBindingRows,
  onResetShortcuts,
  onLayoutLockedChange,
  onHeaderHeightChange,
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
  onThumbnailWidthInputChange,
  onThumbnailWidthInputBlur,
  onThumbnailWidthInputKeyDown,
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
    const activePaletteId = resolvePaletteIdForStyle(paletteId, selectedStyleId)
    const activePaletteLabel = palettes.find((palette) => palette.id === activePaletteId)?.label ?? activePaletteId

    return (
      <div className="settings-block">
        <section className="settings-group">
          <header className="settings-group-head">
            <span>主题设置</span>
          </header>
          <p className="settings-placeholder">
            主题已拆分为 style（布局/效果）和 palette（配色）。您可以向 <code>src/styles/themes/styles/</code> 与{' '}
            <code>src/styles/themes/palettes/</code> 添加 CSS 文件扩展预设。
          </p>
          <label htmlFor="theme-style-select">Style</label>
          <select id="theme-style-select" value={selectedStyleId} onChange={(event) => onStyleChange(event.target.value)}>
            {styles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
          <label htmlFor="theme-palette-mode-select">Palette 模式</label>
          <select
            id="theme-palette-mode-select"
            value={paletteMode}
            onChange={(event) => onPaletteModeChange(event.target.value === 'night' ? 'night' : 'day')}
          >
            <option value="day">Day（日间）</option>
            <option value="night">Night（夜间）</option>
          </select>
          <label htmlFor="theme-palette-day-select">日间默认 Palette</label>
          <select id="theme-palette-day-select" value={selectedPalettePair.day} onChange={(event) => onPaletteDayChange(event.target.value)}>
            {palettes.map((palette) => (
              <option key={palette.id} value={palette.id}>
                {palette.label}
              </option>
            ))}
          </select>
          <label htmlFor="theme-palette-night-select">夜间默认 Palette</label>
          <select id="theme-palette-night-select" value={selectedPalettePair.night} onChange={(event) => onPaletteNightChange(event.target.value)}>
            {palettes.map((palette) => (
              <option key={palette.id} value={palette.id}>
                {palette.label}
              </option>
            ))}
          </select>
          <p className="settings-placeholder">当前生效：{activePaletteLabel}</p>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>缩略图设置</span>
          </header>
          <label>
            缩略图间距系数 {formatScale(thumbnailGapScale)}（{thumbnailGap}px）
            <input
              max={SIZE_SCALE_CONFIG.thumbnailGap.max}
              min={SIZE_SCALE_CONFIG.thumbnailGap.min}
              step={SIZE_SCALE_CONFIG.thumbnailGap.step}
              type="range"
              value={thumbnailGapScale}
              onChange={(event) => onThumbnailGapChange(toAbsolutePx('thumbnailGap', Number(event.target.value)))}
            />
          </label>
          <label>
            缩略图质量
            <input max={100} min={1} type="number" value={thumbnailQuality} onChange={(event) => onThumbnailQualityChange(Number(event.target.value))} />
          </label>
          <label>
            缩略图宽度
            <input
              max={2048}
              min={128}
              type="number"
              value={thumbnailWidthInputValue}
              onBlur={onThumbnailWidthInputBlur}
              onChange={(event) => onThumbnailWidthInputChange(event.target.value)}
              onKeyDown={onThumbnailWidthInputKeyDown}
            />
          </label>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>布局参数</span>
          </header>
          <label className="settings-toggle-row">
            <span>布局锁定</span>
            <input type="checkbox" checked={layoutLocked} onChange={(event) => onLayoutLockedChange(event.target.checked)} />
          </label>
          <label className="settings-toggle-row">
            <span>调试显示 Electron 外框与菜单</span>
            <input
              type="checkbox"
              checked={electronNativeChromeEnabled}
              onChange={(event) => onElectronNativeChromeEnabledChange(event.target.checked)}
            />
          </label>
          <label>
            Header 高度系数 {formatScale(headerHeightScale)}（{headerHeight}px）
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
            设置面板字体系数 {formatScale(settingsFontSizeScale)}（{settingsFontSize}px）
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
            Sidebar 比例 {(sidebarRatio * 100).toFixed(0)}%
            <input max={0.95} min={0} step={0.005} type="range" value={sidebarRatio} onChange={(event) => onSidebarRatioChange(Number(event.target.value))} />
          </label>
          <label>
            Sidebar 最小宽度系数 {formatScale(sidebarMinWidthScale)}（{sidebarMinWidth}px）
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
            Sidebar 字体系数 {formatScale(sidebarFontSizeScale)}（{sidebarFontSize}px）
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
            Sidebar 数字字号系数 {formatScale(sidebarCountFontSizeScale)}（{sidebarCountFontSize}px）
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
            目录结构间隔系数 {formatScale(sidebarIndentStepScale)}（{sidebarIndentStep}px）
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
            目录结构上下间隔系数 {formatScale(sidebarVerticalGapScale)}（{sidebarVerticalGap}px）
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
            元数据面板比例 {(metadataRatio * 100).toFixed(0)}%
            <input max={0.45} min={0.2} step={0.01} type="range" value={metadataRatio} onChange={(event) => onMetadataRatioChange(Number(event.target.value))} />
          </label>
          <label>
            检索/管理容器高度系数 {formatScale(workspaceBottomPanelHeightScale)}（{workspaceBottomPanelHeight}px）
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
            全屏视频控件最大宽度系数 {formatScale(fullscreenVideoControlsMaxWidthScale)}（{fullscreenVideoControlsMaxWidth}px）
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
            <button type="button" disabled={adReviewVisionTestPending} aria-label="测试视觉模型连接" onClick={onTestAdReviewVisionModel}>
              {adReviewVisionTestPending ? '测试中...' : '测试'}
            </button>
            <button type="button" disabled={adReviewVisionSavePending} aria-label="保存视觉模型配置" onClick={onSaveAdReviewVisionModel}>
              {adReviewVisionSavePending ? '保存中...' : '保存'}
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
          <button type="button" onClick={onResetShortcuts}>恢复默认</button>
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
    const rendererIsProd = import.meta.env.PROD
    const bridgeMissingInProduction = rendererIsProd && repositoryMode === 'real' && !backendBridgeInjected
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
            <button type="button" disabled={runtimeInfoLoading} onClick={onRefreshRuntimeInfo}>
              {runtimeInfoLoading ? '诊断读取中...' : '刷新诊断'}
            </button>
          </div>
          {runtimeInfoError ? <p className="settings-danger-text">{runtimeInfoError}</p> : null}
          {bridgeMissingInProduction ? (
            <p className="settings-danger-text">
              当前为生产构建且未检测到后端桥接，已禁用 mock 回退。请检查打包产物中的 preload 注入链路。
            </p>
          ) : null}
        </fieldset>
      </div>
    )
  }

  return <div className="settings-block" />
}
