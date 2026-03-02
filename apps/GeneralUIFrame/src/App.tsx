import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import { BillingWorkbenchMain, BillingWorkbenchSidebar, useBillingWorkbench } from './apps/billing-workbench'
import { PathArrowEditorMain, PathArrowEditorSidebar, usePathArrowEditor } from './apps/path-arrow-editor'
import { SettingsPanel } from './components/SettingsPanel'
import {
  loadAppShellState,
  persistAppShellState,
  type AppPanelState,
  type ShellViewMode,
} from './features/appShellState'
import {
  DEFAULT_UI_SETTINGS,
  applyUiSettingsToDocument,
  loadUiSettings,
  normalizeUiSettings,
  persistUiSettings,
  type SettingsPageId,
  type UiSettingsState,
} from './features/uiSettings'
import './App.css'

const APP_ENTRIES = [
  {
    id: 'billing-workbench',
    name: '账单处理',
    description: '微信账单支出报销处理工具。',
    layout: {
      sidebarCollapsed: false,
      metadataCollapsed: true,
    },
  },
  {
    id: 'workspace-placeholder',
    name: '通用工作台',
    description: '占位应用，用于承接后续模块。',
    layout: {
      sidebarCollapsed: false,
      metadataCollapsed: false,
    },
  },
  {
    id: 'path-arrow-editor',
    name: '路径动画生成器',
    description: '路径箭头动画编辑与播放工具。',
    layout: {
      sidebarCollapsed: false,
      metadataCollapsed: true,
    },
  },
] as const

type AppEntryId = (typeof APP_ENTRIES)[number]['id']

const SIDEBAR_MIN_PERCENT = 20
const SIDEBAR_MAX_PERCENT = 40
const METADATA_MIN_PERCENT = 20
const METADATA_MAX_PERCENT = 40

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function App() {
  const initialShellState = useMemo(() => loadAppShellState(APP_ENTRIES), [])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPage, setSettingsPage] = useState<SettingsPageId>('appearance')
  const [uiSettings, setUiSettings] = useState<UiSettingsState>(() => loadUiSettings())
  const [appPickerOpen, setAppPickerOpen] = useState(false)
  const [activeView, setActiveView] = useState<ShellViewMode>(initialShellState.activeView)
  const [selectedAppId, setSelectedAppId] = useState<AppEntryId>(initialShellState.selectedAppId)
  const [panelStateMap, setPanelStateMap] = useState<Record<AppEntryId, AppPanelState>>(initialShellState.panelStates)

  const appBodyRef = useRef<HTMLDivElement | null>(null)
  const workspaceBodyRef = useRef<HTMLDivElement | null>(null)
  const appSwitcherRef = useRef<HTMLDivElement | null>(null)
  const resizeCleanupRef = useRef<(() => void) | null>(null)

  const selectedApp = useMemo(
    () => APP_ENTRIES.find((entry) => entry.id === selectedAppId) ?? APP_ENTRIES[0],
    [selectedAppId],
  )

  const currentPanelState = panelStateMap[selectedAppId] ?? selectedApp.layout
  const sidebarCollapsed = activeView === 'app' ? currentPanelState.sidebarCollapsed : false
  const metadataCollapsed = activeView === 'app' ? currentPanelState.metadataCollapsed : false
  const isBillingApp = activeView === 'app' && selectedApp.id === 'billing-workbench'
  const isPathEditorApp = activeView === 'app' && selectedApp.id === 'path-arrow-editor'

  const billingWorkbench = useBillingWorkbench({
    aiSummary: {
      enabled: uiSettings.aiEnabled,
      provider: uiSettings.aiProvider,
      modelName: uiSettings.aiModelName,
    },
  })

  const pathArrowEditor = usePathArrowEditor({
    active: isPathEditorApp,
  })

  useEffect(() => {
    applyUiSettingsToDocument(uiSettings)
    persistUiSettings(uiSettings)
  }, [uiSettings])

  useEffect(() => {
    persistAppShellState({
      activeView,
      selectedAppId,
      panelStates: panelStateMap,
    })
  }, [activeView, panelStateMap, selectedAppId])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        setAppPickerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  useEffect(() => {
    if (!appPickerOpen) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      const host = appSwitcherRef.current
      if (!host) {
        return
      }
      if (event.target instanceof Node && !host.contains(event.target)) {
        setAppPickerOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [appPickerOpen])

  const sidebarWidth = `${uiSettings.sidebarWidthPercent}%`
  const metadataWidth = `${uiSettings.metadataWidthPercent}%`
  const workspaceWidth = sidebarCollapsed
    ? '100%'
    : `calc(${(100 - uiSettings.sidebarWidthPercent).toFixed(3)}% - var(--mpx-splitter-width))`
  const mainPaneWidth = metadataCollapsed
    ? '100%'
    : `calc(${(100 - uiSettings.metadataWidthPercent).toFixed(3)}% - var(--mpx-splitter-width))`

  const handleUiSettingsPatch = useCallback((patch: Partial<UiSettingsState>) => {
    setUiSettings((previous) => normalizeUiSettings({ ...previous, ...patch }))
  }, [])

  const handleUiSettingsReset = useCallback(() => {
    setUiSettings(DEFAULT_UI_SETTINGS)
    setSettingsPage('appearance')
  }, [])

  const updateCurrentAppPanelState = useCallback((patch: Partial<AppPanelState>) => {
    setPanelStateMap((previous) => {
      const current = previous[selectedAppId] ?? selectedApp.layout
      return {
        ...previous,
        [selectedAppId]: {
          ...current,
          ...patch,
        },
      }
    })
  }, [selectedApp.layout, selectedAppId])

  const beginHorizontalResize = useCallback(
    (source: 'sidebar' | 'metadata') => {
      resizeCleanupRef.current?.()
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMouseMove = (event: MouseEvent) => {
        if (source === 'sidebar') {
          const rect = appBodyRef.current?.getBoundingClientRect()
          if (!rect || rect.width <= 0) {
            return
          }
          const next = ((event.clientX - rect.left) / rect.width) * 100
          handleUiSettingsPatch({
            sidebarWidthPercent: clamp(next, SIDEBAR_MIN_PERCENT, SIDEBAR_MAX_PERCENT),
          })
          return
        }

        const rect = workspaceBodyRef.current?.getBoundingClientRect()
        if (!rect || rect.width <= 0) {
          return
        }
        const next = ((rect.right - event.clientX) / rect.width) * 100
        handleUiSettingsPatch({
          metadataWidthPercent: clamp(next, METADATA_MIN_PERCENT, METADATA_MAX_PERCENT),
        })
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        resizeCleanupRef.current = null
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      resizeCleanupRef.current = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
      }
    },
    [handleUiSettingsPatch],
  )

  const onStartSidebarResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || sidebarCollapsed) {
        return
      }
      event.preventDefault()
      beginHorizontalResize('sidebar')
    },
    [beginHorizontalResize, sidebarCollapsed],
  )

  const onStartMetadataResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || metadataCollapsed) {
        return
      }
      event.preventDefault()
      beginHorizontalResize('metadata')
    },
    [beginHorizontalResize, metadataCollapsed],
  )

  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.()
      resizeCleanupRef.current = null
    }
  }, [])

  const onToggleAppPicker = useCallback(() => {
    setAppPickerOpen((previous) => !previous)
    setSettingsOpen(false)
  }, [])

  const onActivateApp = useCallback((appId: AppEntryId) => {
    setSelectedAppId(appId)
    setActiveView('app')
  }, [])

  const onBackHome = useCallback(() => {
    setActiveView('home')
  }, [])

  const onToggleSidebarCollapse = useCallback(() => {
    if (activeView !== 'app') {
      return
    }
    updateCurrentAppPanelState({ sidebarCollapsed: !sidebarCollapsed })
  }, [activeView, sidebarCollapsed, updateCurrentAppPanelState])

  const onToggleMetadataCollapse = useCallback(() => {
    if (activeView !== 'app') {
      return
    }
    updateCurrentAppPanelState({ metadataCollapsed: !metadataCollapsed })
  }, [activeView, metadataCollapsed, updateCurrentAppPanelState])

  const mainTitle = useMemo(() => {
    if (activeView === 'home') {
      return '首页 / 选择应用'
    }
    if (isBillingApp) {
      return `${selectedApp.name} / 预览与调整`
    }
    if (isPathEditorApp) {
      return `${selectedApp.name} / 画布编辑`
    }
    return `${selectedApp.name} / 模块视图`
  }, [activeView, isBillingApp, isPathEditorApp, selectedApp.name])

  const sidebarTitle = activeView === 'home' ? '首页' : selectedApp.name

  const metadataContent = useMemo(() => {
    if (activeView === 'home') {
      return (
        <>
          <div className="panel-placeholder">欢迎使用 GeneralUIFrame。</div>
          <div className="panel-placeholder">请选择左侧或主区中的应用入口继续。</div>
        </>
      )
    }

    if (isBillingApp) {
      return (
        <>
          <div className="panel-placeholder">当前应用：{selectedApp.name}</div>
          <div className="panel-placeholder">
            处理状态：{billingWorkbench.notice?.text ?? '等待上传账单文件'}
          </div>
          <div className="panel-placeholder">
            AI设置：{billingWorkbench.aiSummary.enabled ? '启用' : '未启用'} / {billingWorkbench.aiSummary.provider} /
            {' '}
            {billingWorkbench.aiSummary.modelName}
          </div>
        </>
      )
    }

    if (isPathEditorApp) {
      return (
        <>
          <div className="panel-placeholder">当前应用：{selectedApp.name}</div>
          <div className="panel-placeholder">运行状态：{pathArrowEditor.statusText}</div>
          <div className="panel-placeholder">
            路径数量：{pathArrowEditor.paths.length}；缩放：{Math.round(pathArrowEditor.zoom * 100)}%
          </div>
        </>
      )
    }

    return <div className="panel-placeholder">当前应用尚未接入。</div>
  }, [
    activeView,
    billingWorkbench.aiSummary.enabled,
    billingWorkbench.aiSummary.modelName,
    billingWorkbench.aiSummary.provider,
    billingWorkbench.notice?.text,
    isBillingApp,
    isPathEditorApp,
    pathArrowEditor.paths.length,
    pathArrowEditor.statusText,
    pathArrowEditor.zoom,
    selectedApp.name,
  ])

  const sidebarBody = useMemo(() => {
    if (activeView === 'home') {
      return (
        <div className="home-sidebar-list">
          {APP_ENTRIES.map((entry) => (
            <button key={entry.id} className="module-link-btn" type="button" onClick={() => onActivateApp(entry.id)}>
              {entry.name}
              <span className="module-link-desc">{entry.description}</span>
            </button>
          ))}
        </div>
      )
    }

    if (isBillingApp) {
      return <BillingWorkbenchSidebar model={billingWorkbench} />
    }

    if (isPathEditorApp) {
      return <PathArrowEditorSidebar model={pathArrowEditor} />
    }

    return <div className="panel-placeholder">当前应用暂无侧栏配置项。</div>
  }, [activeView, billingWorkbench, isBillingApp, isPathEditorApp, onActivateApp, pathArrowEditor])

  const mainContent = useMemo(() => {
    if (activeView === 'home') {
      return (
        <div className="home-main-grid">
          {APP_ENTRIES.map((entry) => (
            <button key={entry.id} className="home-main-card" type="button" onClick={() => onActivateApp(entry.id)}>
              <strong>{entry.name}</strong>
              <span>{entry.description}</span>
            </button>
          ))}
        </div>
      )
    }

    if (isBillingApp) {
      return <BillingWorkbenchMain model={billingWorkbench} />
    }

    if (isPathEditorApp) {
      return <PathArrowEditorMain model={pathArrowEditor} />
    }

    return <div className="panel-placeholder">当前应用主面板尚未接入。</div>
  }, [activeView, billingWorkbench, isBillingApp, isPathEditorApp, onActivateApp, pathArrowEditor])

  return (
    <div className="app">
      <header className="app-header" data-slot="fg-header-root">
        <div className="header-left" data-slot="fg-header-left-group">
          <div className="header-logo-group app-switcher-anchor" data-slot="fg-header-g1" ref={appSwitcherRef}>
            <button
              className="logo-btn is-task-idle"
              type="button"
              data-slot="fg-header-logo"
              aria-haspopup="menu"
              aria-expanded={appPickerOpen}
              onClick={onToggleAppPicker}
            >
              {activeView === 'home' ? '首页' : selectedApp.name}
            </button>
            {appPickerOpen ? (
              <div className="app-switcher-panel" role="menu" aria-label="应用选择">
                {APP_ENTRIES.map((entry) => {
                  const active = activeView === 'app' && entry.id === selectedAppId
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      className={`app-switcher-item${active ? ' is-active' : ''}`}
                      onClick={() => {
                        onActivateApp(entry.id)
                        setAppPickerOpen(false)
                      }}
                    >
                      <span>{entry.name}</span>
                      <em>{entry.description}</em>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          <div className="header-group" data-slot="fg-header-g2">
            <button className="search-trigger-btn" type="button" data-slot="fg-header-g2-search">
              在线框架模式
            </button>
          </div>
        </div>

        <div className="header-right" data-slot="fg-header-right-group">
          <div className="window-controls" data-slot="fg-header-g3">
            <button
              className="window-control-btn"
              type="button"
              data-slot="fg-header-g3-toggle-sidebar"
              aria-pressed={!sidebarCollapsed}
              disabled={activeView !== 'app'}
              onClick={onToggleSidebarCollapse}
            >
              {sidebarCollapsed ? '左开' : '左收'}
            </button>
            <button
              className="window-control-btn"
              type="button"
              data-slot="fg-header-g3-toggle-metadata"
              aria-pressed={!metadataCollapsed}
              disabled={activeView !== 'app'}
              onClick={onToggleMetadataCollapse}
            >
              {metadataCollapsed ? '右开' : '右收'}
            </button>
            <button
              className="window-control-btn"
              type="button"
              data-slot="fg-header-g3-settings"
              onClick={() => setSettingsOpen(true)}
            >
              设置
            </button>
          </div>
        </div>
      </header>

      <div className="app-body" data-slot="bg-app-workspace" ref={appBodyRef}>
        {sidebarCollapsed ? null : (
          <>
            <aside className="sidebar" data-slot="fg-sidebar-root" style={{ width: sidebarWidth, flex: `0 0 ${sidebarWidth}` }}>
              <div className="sidebar-head" data-slot="fg-sidebar-head">
                <div className="sidebar-head-title">
                  <strong>{sidebarTitle}</strong>
                </div>
                <div className="sidebar-head-actions">
                  {activeView === 'app' ? (
                    <button
                      className="feature-action-btn main-icon-square-btn sidebar-home-btn"
                      type="button"
                      onClick={onBackHome}
                    >
                      返回
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="sidebar-tree mpx-scroll-area" data-slot="fg-sidebar-tree">
                {sidebarBody}
              </div>
            </aside>

            <div
              className="sidebar-splitter"
              data-slot="fg-splitter-left"
              role="separator"
              aria-orientation="vertical"
              onMouseDown={onStartSidebarResize}
            />
          </>
        )}

        <section className="workspace" data-slot="bg-app-workspace-shell" style={{ width: workspaceWidth }}>
          <div className="workspace-body" data-slot="bg-app-workspace-body" ref={workspaceBodyRef}>
            <main className="main-pane" data-slot="fg-main-root" style={{ width: mainPaneWidth }}>
              <div className="main-toolbar" data-slot="fg-main-toolbar-root">
                <strong>{mainTitle}</strong>
              </div>
              <div className="main-content-host mpx-scroll-area" data-slot="fg-main-content-image-grid-shell">
                {mainContent}
              </div>
              <footer className="main-footer" data-slot="fg-main-footer-root">
                <small>
                  {isBillingApp
                    ? '单页应用已模块化接入：账单处理。'
                    : isPathEditorApp
                      ? '单页应用已模块化接入：路径动画生成器。'
                      : '请选择应用进入工作流。'}
                </small>
              </footer>
            </main>

            {metadataCollapsed ? null : (
              <>
                <div
                  className="metadata-splitter"
                  data-slot="fg-splitter-right"
                  role="separator"
                  aria-orientation="vertical"
                  onMouseDown={onStartMetadataResize}
                />
                <aside
                  className="metadata-panel"
                  data-slot="fg-meta-root"
                  style={{ width: metadataWidth, flex: `0 0 ${metadataWidth}` }}
                >
                  <div className="metadata-head" data-slot="fg-meta-head">
                    <strong>运行信息</strong>
                  </div>
                  <div className="metadata-content" data-slot="fg-meta-content-image-editor">
                    {metadataContent}
                  </div>
                </aside>
              </>
            )}
          </div>
        </section>
      </div>

      <SettingsPanel
        open={settingsOpen}
        settingsPage={settingsPage}
        settings={uiSettings}
        onClose={() => setSettingsOpen(false)}
        onSettingsPageChange={setSettingsPage}
        onSettingsPatch={handleUiSettingsPatch}
        onReset={handleUiSettingsReset}
      />
    </div>
  )
}

export default App
