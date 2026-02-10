import { listThemes, resolveThemeIdFromThemes } from '../../features/theme/themeRegistry'
import type { JSX } from 'react'

import type { ShortcutConflict } from '../../shortcuts'
import type { VectorControlConflict } from '../../vectorControls'
import {
  formatScale,
  SIZE_SCALE_CONFIG,
  toAbsolutePx,
} from './settingsScale'

export type SettingsSection = 'layout' | 'model' | 'database' | 'shortcuts' | 'theme' | 'space3d'

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
  sidebarCountFontSize: number
  sidebarCountFontSizeScale: number
  sidebarIndentStep: number
  sidebarIndentStepScale: number
  sidebarVerticalGap: number
  sidebarVerticalGapScale: number
  metadataRatio: number
  vectorPanelHeight: number
  vectorPanelHeightScale: number
  thumbnailGap: number
  thumbnailGapScale: number
  thumbnailQuality: number
  thumbnailWidth: number
  lmStudioEndpoint: string
  lmStudioModel: string
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  adReviewMaxConcurrency: number
  themeId: string
  vectorUniverseMoveSpeed: number
  vectorUniverseSprintMultiplier: number
  vectorUniverseLookSensitivity: number
  vectorUniverseRaycastDistance: number
  vectorUniverseHelperScale: number
  vectorUniverseDispersion: number
  vectorUniverseWidgetSize: number
  shortcutConflicts: ShortcutConflict[]
  vectorControlConflicts: VectorControlConflict[]
  shortcutLabelByAction: Map<string, string>
  vectorLabelByAction: Map<string, string>
  databaseResetPending: boolean
  databaseResetError: string | null
  renderBindingRows: (kind: 'shortcut' | 'vector') => JSX.Element
  onResetShortcuts: () => void
  onResetVectorControls: () => void
  onLayoutLockedChange: (value: boolean) => void
  onHeaderHeightChange: (value: number) => void
  onSettingsFontSizeChange: (value: number) => void
  onSidebarRatioChange: (value: number) => void
  onSidebarMinWidthChange: (value: number) => void
  onSidebarFontSizeChange: (value: number) => void
  onSidebarCountFontSizeChange: (value: number) => void
  onSidebarIndentStepChange: (value: number) => void
  onSidebarVerticalGapChange: (value: number) => void
  onMetadataRatioChange: (value: number) => void
  onVectorPanelHeightChange: (value: number) => void
  onThumbnailGapChange: (value: number) => void
  onThumbnailQualityChange: (value: number) => void
  onThumbnailWidthChange: (value: number) => void
  onLmStudioEndpointChange: (value: string) => void
  onLmStudioModelChange: (value: string) => void
  onAdReviewStrategyModeChange: (value: 'all' | 'head-tail') => void
  onAdReviewHeadNChange: (value: number) => void
  onAdReviewTailNChange: (value: number) => void
  onAdReviewTailStopCleanStreakChange: (value: number) => void
  onAdReviewMaxConcurrencyChange: (value: number) => void
  onThemeChange: (value: string) => void
  onVectorUniverseMoveSpeedChange: (value: number) => void
  onVectorUniverseSprintMultiplierChange: (value: number) => void
  onVectorUniverseLookSensitivityChange: (value: number) => void
  onVectorUniverseRaycastDistanceChange: (value: number) => void
  onVectorUniverseHelperScaleChange: (value: number) => void
  onVectorUniverseDispersionChange: (value: number) => void
  onVectorUniverseWidgetSizeChange: (value: number) => void
  onClearDatabase: () => void
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
  sidebarCountFontSize,
  sidebarCountFontSizeScale,
  sidebarIndentStep,
  sidebarIndentStepScale,
  sidebarVerticalGap,
  sidebarVerticalGapScale,
  metadataRatio,
  vectorPanelHeight,
  vectorPanelHeightScale,
  thumbnailGap,
  thumbnailGapScale,
  thumbnailQuality,
  thumbnailWidth,
  lmStudioEndpoint,
  lmStudioModel,
  adReviewStrategyMode,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  adReviewMaxConcurrency,
  themeId,
  vectorUniverseMoveSpeed,
  vectorUniverseSprintMultiplier,
  vectorUniverseLookSensitivity,
  vectorUniverseRaycastDistance,
  vectorUniverseHelperScale,
  vectorUniverseDispersion,
  vectorUniverseWidgetSize,
  shortcutConflicts,
  vectorControlConflicts,
  shortcutLabelByAction,
  vectorLabelByAction,
  databaseResetPending,
  databaseResetError,
  renderBindingRows,
  onResetShortcuts,
  onResetVectorControls,
  onLayoutLockedChange,
  onHeaderHeightChange,
  onSettingsFontSizeChange,
  onSidebarRatioChange,
  onSidebarMinWidthChange,
  onSidebarFontSizeChange,
  onSidebarCountFontSizeChange,
  onSidebarIndentStepChange,
  onSidebarVerticalGapChange,
  onMetadataRatioChange,
  onVectorPanelHeightChange,
  onThumbnailGapChange,
  onThumbnailQualityChange,
  onThumbnailWidthChange,
  onLmStudioEndpointChange,
  onLmStudioModelChange,
  onAdReviewStrategyModeChange,
  onAdReviewHeadNChange,
  onAdReviewTailNChange,
  onAdReviewTailStopCleanStreakChange,
  onAdReviewMaxConcurrencyChange,
  onThemeChange,
  onVectorUniverseMoveSpeedChange,
  onVectorUniverseSprintMultiplierChange,
  onVectorUniverseLookSensitivityChange,
  onVectorUniverseRaycastDistanceChange,
  onVectorUniverseHelperScaleChange,
  onVectorUniverseDispersionChange,
  onVectorUniverseWidgetSizeChange,
  onClearDatabase,
}: RenderSettingsMainSectionParams): JSX.Element {
  if (activeSection === 'layout') {
    return (
      <div className="settings-block">
        <h3>布局参数</h3>
        <label className="settings-toggle-row">
          <span>布局锁定</span>
          <input type="checkbox" checked={layoutLocked} onChange={(event) => onLayoutLockedChange(event.target.checked)} />
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
          向量容器高度系数 {formatScale(vectorPanelHeightScale)}（{vectorPanelHeight}px）
          <input
            max={SIZE_SCALE_CONFIG.vectorPanelHeight.max}
            min={SIZE_SCALE_CONFIG.vectorPanelHeight.min}
            step={SIZE_SCALE_CONFIG.vectorPanelHeight.step}
            type="range"
            value={vectorPanelHeightScale}
            onChange={(event) => onVectorPanelHeightChange(toAbsolutePx('vectorPanelHeight', Number(event.target.value)))}
          />
        </label>
      </div>
    )
  }

  if (activeSection === 'model') {
    return (
      <div className="settings-block">
        <h3>模型参数</h3>
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
          <input max={2048} min={128} type="number" value={thumbnailWidth} onChange={(event) => onThumbnailWidthChange(Number(event.target.value))} />
        </label>
        <label>
          LM Studio Endpoint
          <input type="text" value={lmStudioEndpoint} onChange={(event) => onLmStudioEndpointChange(event.target.value)} />
        </label>
        <label>
          Embedding 模型
          <input type="text" value={lmStudioModel} onChange={(event) => onLmStudioModelChange(event.target.value)} />
        </label>
        <fieldset className="settings-subsection">
          <legend>广告审核参数</legend>
          <label>
            审核策略
            <select
              aria-label="广告审核策略"
              value={adReviewStrategyMode}
              onChange={(event) =>
                onAdReviewStrategyModeChange(event.target.value === 'head-tail' ? 'head-tail' : 'all')
              }
            >
              <option value="all">全量（all）</option>
              <option value="head-tail">头尾（head-tail）</option>
            </select>
          </label>
          <label>
            审核并发
            <input
              min={1}
              max={8}
              type="number"
              value={adReviewMaxConcurrency}
              onChange={(event) => onAdReviewMaxConcurrencyChange(Number(event.target.value))}
            />
          </label>
          {adReviewStrategyMode === 'head-tail' ? (
            <>
              <label>
                头部窗口样本数
                <input
                  min={0}
                  max={200}
                  type="number"
                  value={adReviewHeadN}
                  onChange={(event) => onAdReviewHeadNChange(Number(event.target.value))}
                />
              </label>
              <label>
                尾部窗口样本数
                <input
                  min={0}
                  max={200}
                  type="number"
                  value={adReviewTailN}
                  onChange={(event) => onAdReviewTailNChange(Number(event.target.value))}
                />
              </label>
              <label>
                尾部停止 clean 连续数
                <input
                  min={1}
                  max={200}
                  type="number"
                  value={adReviewTailStopCleanStreak}
                  onChange={(event) => onAdReviewTailStopCleanStreakChange(Number(event.target.value))}
                />
              </label>
            </>
          ) : null}
        </fieldset>
      </div>
    )
  }

  if (activeSection === 'shortcuts') {
    return (
      <div className="settings-block settings-shortcuts">
        <div className="settings-shortcuts-head">
          <h3>快捷键设置</h3>
          <button type="button" onClick={onResetShortcuts}>恢复默认</button>
        </div>

        {renderBindingRows('shortcut')}

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
    return (
      <div className="settings-block">
        <h3>数据库设置</h3>
        <p className="settings-placeholder">开发阶段可使用此功能清空本地数据库后重启验证初始化链路。</p>
        <label>
          清除数据库（开发）
          <button type="button" className="settings-danger-btn" disabled={databaseResetPending} onClick={onClearDatabase}>
            {databaseResetPending ? '清除中...' : '清除数据库'}
          </button>
        </label>
        {databaseResetError ? <p className="settings-danger-text">{databaseResetError}</p> : null}
      </div>
    )
  }

  if (activeSection === 'theme') {
    const themes = listThemes()
    const selectedThemeId = resolveThemeIdFromThemes(themeId, themes)
    return (
      <div className="settings-block">
        <h3>theme 设置</h3>
        <p className="settings-placeholder">
          在此选择应用主题方案。您可以向 <code>src/styles/themes/presets/</code> 目录添加 CSS
          文件来增加新主题。
        </p>
        <label htmlFor="theme-select">主题方案</label>
        <select id="theme-select" value={selectedThemeId} onChange={(event) => onThemeChange(event.target.value)}>
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="settings-block settings-shortcuts">
      <h3>3D 设置（向量宇宙）</h3>
      <p className="settings-placeholder">参数 + 控制映射均可在此调整。</p>
      <label>
        移动速度 {vectorUniverseMoveSpeed.toFixed(1)}
        <input max={80} min={4} step={0.5} type="range" value={vectorUniverseMoveSpeed} onChange={(event) => onVectorUniverseMoveSpeedChange(Number(event.target.value))} />
      </label>
      <label>
        加速倍率 {vectorUniverseSprintMultiplier.toFixed(2)}
        <input max={4} min={1} step={0.05} type="range" value={vectorUniverseSprintMultiplier} onChange={(event) => onVectorUniverseSprintMultiplierChange(Number(event.target.value))} />
      </label>
      <label>
        视角灵敏度 {vectorUniverseLookSensitivity.toFixed(4)}
        <input max={0.01} min={0.0005} step={0.0001} type="range" value={vectorUniverseLookSensitivity} onChange={(event) => onVectorUniverseLookSensitivityChange(Number(event.target.value))} />
      </label>
      <label>
        正前方检测距离 {vectorUniverseRaycastDistance.toFixed(1)}
        <input max={120} min={4} step={0.5} type="range" value={vectorUniverseRaycastDistance} onChange={(event) => onVectorUniverseRaycastDistanceChange(Number(event.target.value))} />
      </label>
      <label>
        坐标辅助缩放 {vectorUniverseHelperScale.toFixed(0)}
        <input max={600} min={40} step={10} type="range" value={vectorUniverseHelperScale} onChange={(event) => onVectorUniverseHelperScaleChange(Number(event.target.value))} />
      </label>
      <label>
        宇宙离散度 {vectorUniverseDispersion.toFixed(2)}
        <input max={6} min={0.2} step={0.05} type="range" value={vectorUniverseDispersion} onChange={(event) => onVectorUniverseDispersionChange(Number(event.target.value))} />
      </label>
      <label>
        位置控件大小 {vectorUniverseWidgetSize.toFixed(0)}px
        <input max={340} min={140} step={2} type="range" value={vectorUniverseWidgetSize} onChange={(event) => onVectorUniverseWidgetSizeChange(Number(event.target.value))} />
      </label>

      <div className="settings-shortcuts-head">
        <strong>控制映射</strong>
        <button type="button" onClick={onResetVectorControls}>恢复默认</button>
      </div>
      {renderBindingRows('vector')}

      <div className="shortcut-conflicts">
        <strong>控制映射冲突</strong>
        {vectorControlConflicts.length === 0 ? (
          <p>当前无冲突。</p>
        ) : (
          <ul>
            {vectorControlConflicts.map((conflict) => (
              <li key={conflict.combo}>
                {`${conflict.combo} -> ${conflict.actions.map((action) => vectorLabelByAction.get(action) ?? action).join(', ')}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
