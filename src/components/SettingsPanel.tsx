import { useEffect, useMemo, useRef, useState } from 'react'

import {
  appendShortcutBinding,
  keyboardEventToCombo,
  mouseEventToCombo,
  SHORTCUT_DEFINITIONS,
  type ShortcutAction,
  type ShortcutConflict,
  type ShortcutMap,
} from '../shortcuts'
import { listThemes } from '../features/theme/themeRegistry'
import {
  VECTOR_CONTROL_DEFINITIONS,
  type VectorControlAction,
  type VectorControlConflict,
  type VectorControlMap,
} from '../vectorControls'
import { DEFAULT_SETTINGS } from '../store/useUiStore'

export interface SettingsPanelProps {
  settingsOpen: boolean
  themeId: string
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
  vectorUniverseMoveSpeed: number
  vectorUniverseSprintMultiplier: number
  vectorUniverseLookSensitivity: number
  vectorUniverseRaycastDistance: number
  vectorUniverseHelperScale: number
  vectorUniverseDispersion: number
  vectorUniverseWidgetSize: number
  shortcuts: ShortcutMap
  shortcutConflicts: ShortcutConflict[]
  vectorControls: VectorControlMap
  vectorControlConflicts: VectorControlConflict[]
  databaseResetPending: boolean
  databaseResetError: string | null
  onClose: () => void
  onThemeChange: (value: string) => void
  onHeaderHeightChange: (value: number) => void
  onSettingsFontSizeChange: (value: number) => void
  onSidebarRatioChange: (value: number) => void
  onSidebarMinWidthChange: (value: number) => void
  onLayoutLockedChange: (value: boolean) => void
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
  onVectorUniverseMoveSpeedChange: (value: number) => void
  onVectorUniverseSprintMultiplierChange: (value: number) => void
  onVectorUniverseLookSensitivityChange: (value: number) => void
  onVectorUniverseRaycastDistanceChange: (value: number) => void
  onVectorUniverseHelperScaleChange: (value: number) => void
  onVectorUniverseDispersionChange: (value: number) => void
  onVectorUniverseWidgetSizeChange: (value: number) => void
  onSetShortcut: (action: ShortcutAction, binding: string) => void
  onSetVectorControl: (action: VectorControlAction, binding: string) => void
  onResetShortcuts: () => void
  onResetVectorControls: () => void
  onClearDatabase: () => void
}

type SettingsSection = 'layout' | 'model' | 'database' | 'shortcuts' | 'theme' | 'space3d'

type BindingTarget =
  | { kind: 'shortcut'; action: ShortcutAction; label: string }
  | { kind: 'vector'; action: VectorControlAction; label: string }

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: 'layout', label: '布局参数' },
  { id: 'model', label: '模型参数' },
  { id: 'database', label: '数据库设置' },
  { id: 'shortcuts', label: '快捷键设置' },
  { id: 'theme', label: 'theme 设置' },
  { id: 'space3d', label: '3D 设置' },
]

const SIZE_SCALE_CONFIG = {
  headerHeight: {
    base: DEFAULT_SETTINGS.headerHeight,
    min: 48 / DEFAULT_SETTINGS.headerHeight,
    max: 96 / DEFAULT_SETTINGS.headerHeight,
    step: 0.01,
  },
  settingsFontSize: {
    base: DEFAULT_SETTINGS.settingsFontSize,
    min: 12 / DEFAULT_SETTINGS.settingsFontSize,
    max: 24 / DEFAULT_SETTINGS.settingsFontSize,
    step: 0.01,
  },
  sidebarMinWidth: {
    base: DEFAULT_SETTINGS.sidebarMinWidth,
    min: 80 / DEFAULT_SETTINGS.sidebarMinWidth,
    max: 640 / DEFAULT_SETTINGS.sidebarMinWidth,
    step: 0.01,
  },
  sidebarFontSize: {
    base: DEFAULT_SETTINGS.sidebarFontSize,
    min: 11 / DEFAULT_SETTINGS.sidebarFontSize,
    max: 24 / DEFAULT_SETTINGS.sidebarFontSize,
    step: 0.01,
  },
  sidebarCountFontSize: {
    base: DEFAULT_SETTINGS.sidebarCountFontSize,
    min: 10 / DEFAULT_SETTINGS.sidebarCountFontSize,
    max: 22 / DEFAULT_SETTINGS.sidebarCountFontSize,
    step: 0.01,
  },
  sidebarIndentStep: {
    base: DEFAULT_SETTINGS.sidebarIndentStep,
    min: 8 / DEFAULT_SETTINGS.sidebarIndentStep,
    max: 48 / DEFAULT_SETTINGS.sidebarIndentStep,
    step: 0.01,
  },
  sidebarVerticalGap: {
    base: DEFAULT_SETTINGS.sidebarVerticalGap,
    min: 0,
    max: 24 / DEFAULT_SETTINGS.sidebarVerticalGap,
    step: 0.01,
  },
  vectorPanelHeight: {
    base: DEFAULT_SETTINGS.vectorPanelHeight,
    min: 120 / DEFAULT_SETTINGS.vectorPanelHeight,
    max: 360 / DEFAULT_SETTINGS.vectorPanelHeight,
    step: 0.01,
  },
  thumbnailGap: {
    base: DEFAULT_SETTINGS.thumbnailGap,
    min: 0,
    max: 24 / DEFAULT_SETTINGS.thumbnailGap,
    step: 0.01,
  },
} as const

type SizeScaleKey = keyof typeof SIZE_SCALE_CONFIG

function toScale(key: SizeScaleKey, absoluteValue: number): number {
  const config = SIZE_SCALE_CONFIG[key]
  const raw = absoluteValue / config.base
  const clamped = Math.max(config.min, Math.min(config.max, raw))
  return Number(clamped.toFixed(2))
}

function toAbsolutePx(key: SizeScaleKey, scaleValue: number): number {
  const config = SIZE_SCALE_CONFIG[key]
  const clamped = Math.max(config.min, Math.min(config.max, scaleValue))
  return Math.round(config.base * clamped)
}

function formatScale(value: number): string {
  return `${value.toFixed(2)}x`
}

function SettingsPanel({
  settingsOpen,
  themeId,
  headerHeight,
  settingsFontSize,
  sidebarRatio,
  sidebarMinWidth,
  layoutLocked,
  sidebarFontSize,
  sidebarCountFontSize,
  sidebarIndentStep,
  sidebarVerticalGap,
  metadataRatio,
  vectorPanelHeight,
  thumbnailGap,
  thumbnailQuality,
  thumbnailWidth,
  lmStudioEndpoint,
  lmStudioModel,
  vectorUniverseMoveSpeed,
  vectorUniverseSprintMultiplier,
  vectorUniverseLookSensitivity,
  vectorUniverseRaycastDistance,
  vectorUniverseHelperScale,
  vectorUniverseDispersion,
  vectorUniverseWidgetSize,
  shortcuts,
  shortcutConflicts,
  vectorControls,
  vectorControlConflicts,
  databaseResetPending,
  databaseResetError,
  onClose,
  onThemeChange,
  onHeaderHeightChange,
  onSettingsFontSizeChange,
  onSidebarRatioChange,
  onSidebarMinWidthChange,
  onLayoutLockedChange,
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
  onVectorUniverseMoveSpeedChange,
  onVectorUniverseSprintMultiplierChange,
  onVectorUniverseLookSensitivityChange,
  onVectorUniverseRaycastDistanceChange,
  onVectorUniverseHelperScaleChange,
  onVectorUniverseDispersionChange,
  onVectorUniverseWidgetSizeChange,
  onSetShortcut,
  onSetVectorControl,
  onResetShortcuts,
  onResetVectorControls,
  onClearDatabase,
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('layout')
  const [bindingTarget, setBindingTarget] = useState<BindingTarget | null>(null)
  const [capturingTarget, setCapturingTarget] = useState<BindingTarget | null>(null)
  const [capturedCombo, setCapturedCombo] = useState('')
  const captureDialogRef = useRef<HTMLDivElement>(null)

  const headerHeightScale = toScale('headerHeight', headerHeight)
  const settingsFontSizeScale = toScale('settingsFontSize', settingsFontSize)
  const sidebarMinWidthScale = toScale('sidebarMinWidth', sidebarMinWidth)
  const sidebarFontSizeScale = toScale('sidebarFontSize', sidebarFontSize)
  const sidebarCountFontSizeScale = toScale('sidebarCountFontSize', sidebarCountFontSize)
  const sidebarIndentStepScale = toScale('sidebarIndentStep', sidebarIndentStep)
  const sidebarVerticalGapScale = toScale('sidebarVerticalGap', sidebarVerticalGap)
  const vectorPanelHeightScale = toScale('vectorPanelHeight', vectorPanelHeight)
  const thumbnailGapScale = toScale('thumbnailGap', thumbnailGap)

  const shortcutLabelByAction = useMemo(
    () => new Map(SHORTCUT_DEFINITIONS.map((definition) => [definition.action, definition.label])),
    [],
  )
  const vectorLabelByAction = useMemo(
    () => new Map(VECTOR_CONTROL_DEFINITIONS.map((definition) => [definition.action, definition.label])),
    [],
  )

  const getBinding = (target: BindingTarget): string => {
    return target.kind === 'shortcut' ? shortcuts[target.action] : vectorControls[target.action]
  }

  const setBinding = (target: BindingTarget, binding: string) => {
    if (target.kind === 'shortcut') {
      onSetShortcut(target.action, binding)
      return
    }
    onSetVectorControl(target.action, binding)
  }

  useEffect(() => {
    if (!settingsOpen) {
      setActiveSection('layout')
      setBindingTarget(null)
      setCapturingTarget(null)
      setCapturedCombo('')
    }
  }, [settingsOpen])

  useEffect(() => {
    if (!capturingTarget) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const combo = keyboardEventToCombo(event)
      if (!combo) {
        return
      }
      setCapturedCombo(combo)
    }

    const onMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node | null
      if (targetNode && captureDialogRef.current?.contains(targetNode)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const combo = mouseEventToCombo(event)
      if (!combo) {
        return
      }
      setCapturedCombo(combo)
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('mousedown', onMouseDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('mousedown', onMouseDown, true)
    }
  }, [capturingTarget])

  if (!settingsOpen) {
    return null
  }

  const openBindingManager = (target: BindingTarget) => {
    setBindingTarget(target)
    setCapturingTarget(null)
    setCapturedCombo('')
  }

  const renderBindingRows = (kind: BindingTarget['kind']) => {
    if (kind === 'shortcut') {
      return (
        <div className="shortcut-list">
          {SHORTCUT_DEFINITIONS.map((definition) => (
            <label key={definition.action} className="shortcut-row">
              <span>{definition.label}</span>
              <button
                className="shortcut-binding-trigger"
                type="button"
                onClick={() => openBindingManager({ kind: 'shortcut', action: definition.action, label: definition.label })}
              >
                {shortcuts[definition.action] || '未设置'}
              </button>
            </label>
          ))}
        </div>
      )
    }

    return (
      <div className="shortcut-list">
        {VECTOR_CONTROL_DEFINITIONS.map((definition) => (
          <label key={definition.action} className="shortcut-row">
            <span>{definition.label}</span>
            <button
              className="shortcut-binding-trigger"
              type="button"
              onClick={() => openBindingManager({ kind: 'vector', action: definition.action, label: definition.label })}
            >
              {vectorControls[definition.action] || '未设置'}
            </button>
          </label>
        ))}
      </div>
    )
  }

  const renderMainSection = () => {
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
              onChange={(event) =>
                onSidebarCountFontSizeChange(toAbsolutePx('sidebarCountFontSize', Number(event.target.value)))
              }
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
              onChange={(event) =>
                onSidebarVerticalGapChange(toAbsolutePx('sidebarVerticalGap', Number(event.target.value)))
              }
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
      return (
        <div className="settings-block">
          <h3>theme 设置</h3>
          <p className="settings-placeholder">
            在此选择应用主题方案。您可以向 <code>src/styles/themes/presets/</code> 目录添加 CSS
            文件来增加新主题。
          </p>
          <label htmlFor="theme-select">主题方案</label>
          <select id="theme-select" value={themeId} onChange={(event) => onThemeChange(event.target.value)}>
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

  const currentBinding = bindingTarget ? getBinding(bindingTarget) : ''
  const currentCombos = currentBinding ? currentBinding.split('|') : []

  return (
    <div className="settings-mask" role="dialog" aria-modal="true">
      <section className="settings-panel" style={{ fontSize: `${settingsFontSize}px` }}>
        <div className="settings-head">
          <h2>设置面板（虚拟）</h2>
          <button type="button" onClick={onClose}>关闭</button>
        </div>

        <div className="settings-shell">
          <aside className="settings-side" aria-label="设置分组">
            {SETTINGS_SECTIONS.map((section) => (
              <button key={section.id} className={activeSection === section.id ? 'is-active' : ''} type="button" onClick={() => setActiveSection(section.id)}>
                {section.label}
              </button>
            ))}
          </aside>

          <main className="settings-main">{renderMainSection()}</main>
        </div>

        {bindingTarget ? (
          <div className="settings-floating-mask" role="dialog" aria-modal="true" aria-label="快捷键编辑">
            <section className="settings-floating-panel">
              <h3>{bindingTarget.label}</h3>
              {currentCombos.length > 0 ? (
                <ul className="binding-chip-list">
                  {currentCombos.map((combo) => (
                    <li key={combo}>{combo}</li>
                  ))}
                </ul>
              ) : (
                <p className="settings-placeholder">当前未设置快捷键。</p>
              )}
              <div className="settings-floating-actions">
                <button
                  type="button"
                  onClick={() => {
                    setCapturedCombo('')
                    setCapturingTarget(bindingTarget)
                  }}
                >
                  新增
                </button>
                <button type="button" onClick={() => setBinding(bindingTarget, '')}>清除</button>
                <button
                  type="button"
                  onClick={() => {
                    setBindingTarget(null)
                    setCapturingTarget(null)
                    setCapturedCombo('')
                  }}
                >
                  关闭
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {capturingTarget ? (
          <div className="settings-floating-mask" role="dialog" aria-modal="true" aria-label="录入快捷键">
            <section ref={captureDialogRef} className="settings-floating-panel">
              <h3>录入快捷键</h3>
              <p className="settings-placeholder">按下键盘/鼠标（支持组合键）。</p>
              <p className="binding-capture-preview">{capturedCombo || '等待输入...'}</p>
              <div className="settings-floating-actions">
                <button
                  type="button"
                  disabled={!capturedCombo}
                  onClick={() => {
                    const existingBinding = getBinding(capturingTarget)
                    const merged = appendShortcutBinding(existingBinding, capturedCombo)
                    setBinding(capturingTarget, merged)
                    setCapturingTarget(null)
                    setCapturedCombo('')
                  }}
                >
                  确认新增
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapturingTarget(null)
                    setCapturedCombo('')
                  }}
                >
                  取消
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default SettingsPanel
