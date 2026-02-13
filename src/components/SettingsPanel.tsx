import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { ReadRuntimeInfoResponseDto } from '../contracts/backend'
import type { RepositoryMode } from '../features/backend/repository'
import {
  appendShortcutBinding,
  keyboardEventToCombo,
  mouseEventToCombo,
  wheelEventToCombo,
  SHORTCUT_DEFINITIONS,
  type ShortcutAction,
  type ShortcutConflict,
  type ShortcutMap,
} from '../shortcuts'
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
  workspaceBottomPanelHeight: number
  fullscreenVideoControlsMaxWidth: number
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
  shortcuts: ShortcutMap
  shortcutConflicts: ShortcutConflict[]
  databaseResetPending: boolean
  databaseResetError: string | null
  runtimePathUpdatePending: boolean
  runtimePathUpdateMessage: string | null
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
  onWorkspaceBottomPanelHeightChange: (value: number) => void
  onFullscreenVideoControlsMaxWidthChange: (value: number) => void
  onThumbnailGapChange: (value: number) => void
  onThumbnailQualityChange: (value: number) => void
  onThumbnailWidthChange: (value: number) => void
  onProxyServerChange: (value: string) => void
  onEhentaiCookiesChange: (value: string) => void
  onAdReviewVisionEndpointChange: (value: string) => void
  onAdReviewVisionModelChange: (value: string) => void
  onTestAdReviewVisionModel: () => void
  onSaveAdReviewVisionModel: () => void
  onSetShortcut: (action: ShortcutAction, binding: string) => void
  onResetShortcuts: () => void
  onClearDatabase: () => void
  onPickDatabaseDirectoryPath: () => void
  onPickThumbnailCacheDirectoryPath: () => void
  onRefreshRuntimeInfo: () => void
}

type BindingTarget = { action: ShortcutAction; label: string }

const MOUSE_CAPTURE_PRESETS: Array<{ label: string; combo: string }> = [
  { label: '鼠标左键', combo: 'MouseLeft' },
  { label: '鼠标中键', combo: 'MouseMiddle' },
  { label: '鼠标右键', combo: 'MouseRight' },
  { label: '鼠标后退键', combo: 'MouseBack' },
  { label: '鼠标前进键', combo: 'MouseForward' },
  { label: '滚轮上', combo: 'WheelUp' },
  { label: '滚轮下', combo: 'WheelDown' },
]

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: 'layout', label: '界面设置' },
  { id: 'model', label: 'AI模型设置' },
  { id: 'database', label: '数据库设置' },
  { id: 'shortcuts', label: '快捷键设置' },
]

const THUMBNAIL_WIDTH_MIN = 128
const THUMBNAIL_WIDTH_MAX = 2048

function resolveSettingsSection(raw: unknown): SettingsSection {
  if (raw === 'layout' || raw === 'model' || raw === 'database' || raw === 'shortcuts') {
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
  workspaceBottomPanelHeight,
  fullscreenVideoControlsMaxWidth,
  thumbnailGap,
  thumbnailQuality,
  thumbnailWidth,
  proxyServer,
  ehentaiCookies,
  adReviewVisionEndpoint,
  adReviewVisionModel,
  adReviewVisionVerified,
  adReviewVisionTestPending,
  adReviewVisionTestMessage,
  adReviewVisionSavePending,
  adReviewVisionSaveMessage,
  shortcuts,
  shortcutConflicts,
  databaseResetPending,
  databaseResetError,
  runtimePathUpdatePending,
  runtimePathUpdateMessage,
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
  onWorkspaceBottomPanelHeightChange,
  onFullscreenVideoControlsMaxWidthChange,
  onThumbnailGapChange,
  onThumbnailQualityChange,
  onThumbnailWidthChange,
  onProxyServerChange,
  onEhentaiCookiesChange,
  onAdReviewVisionEndpointChange,
  onAdReviewVisionModelChange,
  onTestAdReviewVisionModel,
  onSaveAdReviewVisionModel,
  onSetShortcut,
  onResetShortcuts,
  onClearDatabase,
  onPickDatabaseDirectoryPath,
  onPickThumbnailCacheDirectoryPath,
  onRefreshRuntimeInfo,
}: SettingsPanelProps) {
  const [activeSectionRaw, setActiveSection] = useState<SettingsSection>('layout')
  const activeSection = resolveSettingsSection(activeSectionRaw)
  const [bindingTarget, setBindingTarget] = useState<BindingTarget | null>(null)
  const [capturingTarget, setCapturingTarget] = useState<BindingTarget | null>(null)
  const [capturedCombo, setCapturedCombo] = useState('')
  const [thumbnailWidthInputValue, setThumbnailWidthInputValue] = useState(() => String(thumbnailWidth))
  const captureDialogRef = useRef<HTMLDivElement>(null)

  const headerHeightScale = toScale('headerHeight', headerHeight)
  const settingsFontSizeScale = toScale('settingsFontSize', settingsFontSize)
  const sidebarMinWidthScale = toScale('sidebarMinWidth', sidebarMinWidth)
  const sidebarFontSizeScale = toScale('sidebarFontSize', sidebarFontSize)
  const sidebarCountFontSizeScale = toScale('sidebarCountFontSize', sidebarCountFontSize)
  const sidebarIndentStepScale = toScale('sidebarIndentStep', sidebarIndentStep)
  const sidebarVerticalGapScale = toScale('sidebarVerticalGap', sidebarVerticalGap)
  const workspaceBottomPanelHeightScale = toScale('workspaceBottomPanelHeight', workspaceBottomPanelHeight)
  const fullscreenVideoControlsMaxWidthScale = toScale('fullscreenVideoControlsMaxWidth', fullscreenVideoControlsMaxWidth)
  const thumbnailGapScale = toScale('thumbnailGap', thumbnailGap)

  const shortcutLabelByAction = useMemo(
    () => new Map(SHORTCUT_DEFINITIONS.map((definition) => [definition.action, definition.label])),
    [],
  )
  const getBinding = (target: BindingTarget): string => {
    return shortcuts[target.action]
  }

  const setBinding = (target: BindingTarget, binding: string) => {
    onSetShortcut(target.action, binding)
  }

  useEffect(() => {
    if (!settingsOpen) {
      setActiveSection('layout')
      setBindingTarget(null)
      setCapturingTarget(null)
      setCapturedCombo('')
      setThumbnailWidthInputValue(String(thumbnailWidth))
    }
  }, [settingsOpen, thumbnailWidth])

  useEffect(() => {
    setThumbnailWidthInputValue(String(thumbnailWidth))
  }, [thumbnailWidth])

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

    const onWheel = (event: WheelEvent) => {
      const targetElement = event.target as HTMLElement | null
      if (targetElement?.closest('[data-capture-ignore="true"]')) {
        return
      }

      const combo = wheelEventToCombo(event)
      if (!combo) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setCapturedCombo(combo)
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('mousedown', onMouseDown, true)
    window.addEventListener('wheel', onWheel, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('mousedown', onMouseDown, true)
      window.removeEventListener('wheel', onWheel, true)
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

  const renderBindingRows = () => {
    return (
      <div className="shortcut-list">
        {SHORTCUT_DEFINITIONS.map((definition) => (
          <label key={definition.action} className="shortcut-row">
            <span>{definition.label}</span>
            <button
              className="shortcut-binding-trigger"
              type="button"
              onClick={() => openBindingManager({ action: definition.action, label: definition.label })}
            >
              {shortcuts[definition.action] || '未设置'}
            </button>
          </label>
        ))}
      </div>
    )
  }

  const commitThumbnailWidthInput = () => {
    const parsed = Number(thumbnailWidthInputValue)
    if (!Number.isFinite(parsed)) {
      setThumbnailWidthInputValue(String(thumbnailWidth))
      return
    }

    const normalized = Math.max(THUMBNAIL_WIDTH_MIN, Math.min(THUMBNAIL_WIDTH_MAX, Math.round(parsed)))
    setThumbnailWidthInputValue(String(normalized))
    onThumbnailWidthChange(normalized)
  }

  const handleThumbnailWidthInputChange = (value: string) => {
    if (value.length === 0) {
      setThumbnailWidthInputValue(value)
      return
    }
    if (!/^\d+$/.test(value)) {
      return
    }

    setThumbnailWidthInputValue(value)

    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return
    }
    if (parsed < THUMBNAIL_WIDTH_MIN || parsed > THUMBNAIL_WIDTH_MAX) {
      return
    }
    onThumbnailWidthChange(parsed)
  }

  const handleThumbnailWidthInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitThumbnailWidthInput()
      event.currentTarget.blur()
      return
    }
    if (event.key === 'Escape') {
      setThumbnailWidthInputValue(String(thumbnailWidth))
      event.currentTarget.blur()
    }
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
    onSidebarCountFontSizeChange,
    onSidebarIndentStepChange,
    onSidebarVerticalGapChange,
    onMetadataRatioChange,
    onWorkspaceBottomPanelHeightChange,
    onFullscreenVideoControlsMaxWidthChange,
    onThumbnailGapChange,
    onThumbnailQualityChange,
    onThumbnailWidthInputChange: handleThumbnailWidthInputChange,
    onThumbnailWidthInputBlur: commitThumbnailWidthInput,
    onThumbnailWidthInputKeyDown: handleThumbnailWidthInputKeyDown,
    onProxyServerChange,
    onEhentaiCookiesChange,
    onAdReviewVisionEndpointChange,
    onAdReviewVisionModelChange,
    onTestAdReviewVisionModel,
    onSaveAdReviewVisionModel,
    onStyleChange,
    onPaletteChange,
    onClearDatabase,
    onPickDatabaseDirectoryPath,
    onPickThumbnailCacheDirectoryPath,
    onRefreshRuntimeInfo,
  })

  const currentBinding = bindingTarget ? getBinding(bindingTarget) : ''
  const currentCombos = currentBinding ? currentBinding.split('|') : []

  return (
    <div className="settings-mask" role="dialog" aria-modal="true" aria-label="设置面板" data-overlay-close="settings">
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
