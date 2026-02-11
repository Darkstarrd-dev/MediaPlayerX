import { useEffect, useMemo, useRef, useState } from 'react'

import type { ReadRuntimeInfoResponseDto, ReadVectorDataStatusResponseDto } from '../contracts/backend'
import type { RepositoryMode } from '../features/backend/repository'
import {
  appendShortcutBinding,
  keyboardEventToCombo,
  mouseEventToCombo,
  SHORTCUT_DEFINITIONS,
  type ShortcutAction,
  type ShortcutConflict,
  type ShortcutMap,
} from '../shortcuts'
import {
  VECTOR_CONTROL_DEFINITIONS,
  type VectorControlAction,
  type VectorControlConflict,
  type VectorControlMap,
} from '../vectorControls'
import {
  renderSettingsMainSection,
  type SettingsSection,
} from './settings/renderSettingsMainSection'
import { toScale } from './settings/settingsScale'

export interface SettingsPanelProps {
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
  shortcuts: ShortcutMap
  shortcutConflicts: ShortcutConflict[]
  vectorControls: VectorControlMap
  vectorControlConflicts: VectorControlConflict[]
  databaseResetPending: boolean
  databaseResetError: string | null
  vectorDataStatusLoading: boolean
  vectorDataStatusError: string | null
  vectorDataStatus: ReadVectorDataStatusResponseDto | null
  vectorDataClearPending: boolean
  vectorDataClearError: string | null
  repositoryMode: RepositoryMode
  backendBridgeInjected: boolean
  runtimeInfoLoading: boolean
  runtimeInfoError: string | null
  runtimeInfo: ReadRuntimeInfoResponseDto | null
  onClose: () => void
  onStyleChange: (value: string) => void
  onPaletteChange: (value: string) => void
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
  onTestEmbeddingModel: () => void
  onWdSwinTaggerModelPathChange: (value: string) => void
  onWdSwinTaggerAutoTagOccurrenceThresholdChange: (value: number) => void
  onWdSwinTaggerAutoTagGeneralMinScoreChange: (value: number) => void
  onWdSwinTaggerAutoTagCharacterMinScoreChange: (value: number) => void
  onWdSwinTaggerAutoTagIncludeRatingChange: (value: boolean) => void
  onWdSwinTaggerAutoTagRatingMinScoreChange: (value: number) => void
  onVisionAutoTagCsvPathChange: (value: string) => void
  onVisionAutoTagSampleImageCountChange: (value: number) => void
  onVisionAutoTagOccurrenceThresholdChange: (value: number) => void
  onVisionAutoTagTemperatureChange: (value: number) => void
  onVisionAutoTagTimeoutMsChange: (value: number) => void
  onTestWdSwinTaggerModel: () => void
  onAdReviewVisionEndpointChange: (value: string) => void
  onAdReviewVisionModelChange: (value: string) => void
  onTestAdReviewVisionModel: () => void
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
  onRefreshRuntimeInfo: () => void
  onRefreshVectorDataStatus: () => void
  onClearVectorData: () => void
}

type BindingTarget =
  | { kind: 'shortcut'; action: ShortcutAction; label: string }
  | { kind: 'vector'; action: VectorControlAction; label: string }

const MOUSE_CAPTURE_PRESETS: Array<{ label: string; combo: string }> = [
  { label: '鼠标左键', combo: 'MouseLeft' },
  { label: '鼠标中键', combo: 'MouseMiddle' },
  { label: '鼠标右键', combo: 'MouseRight' },
  { label: '鼠标后退键', combo: 'MouseBack' },
  { label: '鼠标前进键', combo: 'MouseForward' },
]

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: 'layout', label: '界面设置' },
  { id: 'model', label: 'AI模型设置' },
  { id: 'database', label: '数据库设置' },
  { id: 'shortcuts', label: '快捷键设置' },
  { id: 'space3d', label: '3D 设置' },
]

function resolveSettingsSection(raw: unknown): SettingsSection {
  if (raw === 'layout' || raw === 'model' || raw === 'database' || raw === 'shortcuts' || raw === 'space3d') {
    return raw
  }
  if (raw === 'theme' || raw === 'thumbnail') {
    return 'layout'
  }
  return 'layout'
}

function SettingsPanel({
  settingsOpen,
  styleId,
  paletteId,
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
  embeddingModelTestPending,
  embeddingModelTestMessage,
  wdSwinTaggerModelPath,
  wdSwinTaggerAutoTagOccurrenceThreshold,
  wdSwinTaggerAutoTagGeneralMinScore,
  wdSwinTaggerAutoTagCharacterMinScore,
  wdSwinTaggerAutoTagIncludeRating,
  wdSwinTaggerAutoTagRatingMinScore,
  visionAutoTagCsvPath,
  visionAutoTagSampleImageCount,
  visionAutoTagOccurrenceThreshold,
  visionAutoTagTemperature,
  visionAutoTagTimeoutMs,
  wdSwinTaggerTestPending,
  wdSwinTaggerTestMessage,
  adReviewVisionEndpoint,
  adReviewVisionModel,
  adReviewVisionVerified,
  adReviewVisionTestPending,
  adReviewVisionTestMessage,
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
  vectorDataStatusLoading,
  vectorDataStatusError,
  vectorDataStatus,
  vectorDataClearPending,
  vectorDataClearError,
  repositoryMode,
  backendBridgeInjected,
  runtimeInfoLoading,
  runtimeInfoError,
  runtimeInfo,
  onClose,
  onStyleChange,
  onPaletteChange,
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
  onTestEmbeddingModel,
  onWdSwinTaggerModelPathChange,
  onWdSwinTaggerAutoTagOccurrenceThresholdChange,
  onWdSwinTaggerAutoTagGeneralMinScoreChange,
  onWdSwinTaggerAutoTagCharacterMinScoreChange,
  onWdSwinTaggerAutoTagIncludeRatingChange,
  onWdSwinTaggerAutoTagRatingMinScoreChange,
  onVisionAutoTagCsvPathChange,
  onVisionAutoTagSampleImageCountChange,
  onVisionAutoTagOccurrenceThresholdChange,
  onVisionAutoTagTemperatureChange,
  onVisionAutoTagTimeoutMsChange,
  onTestWdSwinTaggerModel,
  onAdReviewVisionEndpointChange,
  onAdReviewVisionModelChange,
  onTestAdReviewVisionModel,
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
  onRefreshRuntimeInfo,
  onRefreshVectorDataStatus,
  onClearVectorData,
}: SettingsPanelProps) {
  const [activeSectionRaw, setActiveSection] = useState<SettingsSection>('layout')
  const activeSection = resolveSettingsSection(activeSectionRaw)
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
    const normalized = resolveSettingsSection(activeSectionRaw)
    if (normalized !== activeSectionRaw) {
      setActiveSection(normalized)
    }
  }, [activeSectionRaw])

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
      const targetElement = event.target as HTMLElement | null
      if (targetElement?.closest('[data-capture-ignore="true"]')) {
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

  const mainSection = renderSettingsMainSection({
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
    embeddingModelTestPending,
    embeddingModelTestMessage,
    wdSwinTaggerModelPath,
    wdSwinTaggerAutoTagOccurrenceThreshold,
    wdSwinTaggerAutoTagGeneralMinScore,
    wdSwinTaggerAutoTagCharacterMinScore,
    wdSwinTaggerAutoTagIncludeRating,
    wdSwinTaggerAutoTagRatingMinScore,
    visionAutoTagCsvPath,
    visionAutoTagSampleImageCount,
    visionAutoTagOccurrenceThreshold,
    visionAutoTagTemperature,
    visionAutoTagTimeoutMs,
    wdSwinTaggerTestPending,
    wdSwinTaggerTestMessage,
    adReviewVisionEndpoint,
    adReviewVisionModel,
    adReviewVisionVerified,
    adReviewVisionTestPending,
    adReviewVisionTestMessage,
    styleId,
    paletteId,
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
    vectorDataStatusLoading,
    vectorDataStatusError,
    vectorDataStatus,
    vectorDataClearPending,
    vectorDataClearError,
    repositoryMode,
    backendBridgeInjected,
    runtimeInfoLoading,
    runtimeInfoError,
    runtimeInfo,
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
    onTestEmbeddingModel,
    onWdSwinTaggerModelPathChange,
    onWdSwinTaggerAutoTagOccurrenceThresholdChange,
    onWdSwinTaggerAutoTagGeneralMinScoreChange,
    onWdSwinTaggerAutoTagCharacterMinScoreChange,
    onWdSwinTaggerAutoTagIncludeRatingChange,
    onWdSwinTaggerAutoTagRatingMinScoreChange,
    onVisionAutoTagCsvPathChange,
    onVisionAutoTagSampleImageCountChange,
    onVisionAutoTagOccurrenceThresholdChange,
    onVisionAutoTagTemperatureChange,
    onVisionAutoTagTimeoutMsChange,
    onTestWdSwinTaggerModel,
    onAdReviewVisionEndpointChange,
    onAdReviewVisionModelChange,
    onTestAdReviewVisionModel,
    onStyleChange,
    onPaletteChange,
    onVectorUniverseMoveSpeedChange,
    onVectorUniverseSprintMultiplierChange,
    onVectorUniverseLookSensitivityChange,
    onVectorUniverseRaycastDistanceChange,
    onVectorUniverseHelperScaleChange,
    onVectorUniverseDispersionChange,
    onVectorUniverseWidgetSizeChange,
    onClearDatabase,
    onRefreshRuntimeInfo,
    onRefreshVectorDataStatus,
    onClearVectorData,
  })

  const currentBinding = bindingTarget ? getBinding(bindingTarget) : ''
  const currentCombos = currentBinding ? currentBinding.split('|') : []

  return (
    <div className="settings-mask" role="dialog" aria-modal="true">
      <section className="settings-panel" style={{ fontSize: `${settingsFontSize}px` }}>
        <div className="settings-head">
          <span className="settings-head-spacer" aria-hidden="true" />
          <h2>设置面板</h2>
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

          <main className="settings-main">{mainSection}</main>
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
                  data-capture-ignore="true"
                  onClick={() => {
                    setCapturedCombo('')
                    setCapturingTarget(bindingTarget)
                  }}
                >
                  新增
                </button>
                <button type="button" data-capture-ignore="true" onClick={() => setBinding(bindingTarget, '')}>清除</button>
                <button
                  type="button"
                  data-capture-ignore="true"
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
              <div className="binding-mouse-presets" data-capture-ignore="true">
                <span>快速选择鼠标事件</span>
                <div className="binding-mouse-preset-list">
                  {MOUSE_CAPTURE_PRESETS.map((preset) => (
                    <button
                      key={preset.combo}
                      type="button"
                      data-capture-ignore="true"
                      onClick={() => {
                        setCapturedCombo(preset.combo)
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-floating-actions">
                <button
                  type="button"
                  data-capture-ignore="true"
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
                  data-capture-ignore="true"
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
