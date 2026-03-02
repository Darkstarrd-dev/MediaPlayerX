import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { SettingsPanel } from './components/SettingsPanel'
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

interface ModuleDefinition {
  id: string
  title: string
  tag: string
  description: string
}

const MODULES: ModuleDefinition[] = [
  {
    id: 'dashboard',
    title: '控制台模块',
    tag: 'UI已就绪',
    description: '用于承载后续在线应用入口、运行状态提示与导航。',
  },
  {
    id: 'file-panel',
    title: '文件列表面板',
    tag: '待接入逻辑',
    description: '保留列表与筛选布局，后续接入 FSAA 与 ZIP 浏览能力。',
  },
  {
    id: 'rename',
    title: '更名工具模块',
    tag: '待接入逻辑',
    description: '先复用表单与批量操作 UI，后续接入命名策略执行器。',
  },
]

const APP_ENTRIES = [
  {
    id: 'billing-workbench',
    name: '账单处理',
    description: '当前仅占位，后续接入实际功能模块。',
  },
] as const

const SIDEBAR_MIN_PERCENT = 20
const SIDEBAR_MAX_PERCENT = 40
const METADATA_MIN_PERCENT = 20
const METADATA_MAX_PERCENT = 40

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function App() {
  const [activeModuleId, setActiveModuleId] = useState(MODULES[0]?.id ?? '')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPage, setSettingsPage] = useState<SettingsPageId>('appearance')
  const [uiSettings, setUiSettings] = useState<UiSettingsState>(() => loadUiSettings())
  const [appPickerOpen, setAppPickerOpen] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState(APP_ENTRIES[0]?.id ?? '')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [metadataCollapsed, setMetadataCollapsed] = useState(false)
  const appBodyRef = useRef<HTMLDivElement | null>(null)
  const workspaceBodyRef = useRef<HTMLDivElement | null>(null)
  const appSwitcherRef = useRef<HTMLDivElement | null>(null)
  const resizeCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    applyUiSettingsToDocument(uiSettings)
    persistUiSettings(uiSettings)
  }, [uiSettings])

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

  const activeModule = useMemo(
    () => MODULES.find((entry) => entry.id === activeModuleId) ?? MODULES[0],
    [activeModuleId],
  )
  const selectedApp = useMemo(
    () => APP_ENTRIES.find((entry) => entry.id === selectedAppId) ?? APP_ENTRIES[0],
    [selectedAppId],
  )

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

  const onToggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((previous) => !previous)
  }, [])

  const onToggleMetadataCollapse = useCallback(() => {
    setMetadataCollapsed((previous) => !previous)
  }, [])

  const onToggleAppPicker = useCallback(() => {
    setAppPickerOpen((previous) => !previous)
    setSettingsOpen(false)
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
      if (event.button !== 0) {
        return
      }
      event.preventDefault()
      beginHorizontalResize('sidebar')
    },
    [beginHorizontalResize],
  )

  const onStartMetadataResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return
      }
      event.preventDefault()
      beginHorizontalResize('metadata')
    },
    [beginHorizontalResize],
  )

  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.()
      resizeCleanupRef.current = null
    }
  }, [])

  const handleUiSettingsReset = () => {
    setUiSettings(DEFAULT_UI_SETTINGS)
    setSettingsPage('appearance')
  }

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
              {selectedApp?.name ?? '应用入口'}
            </button>
            {appPickerOpen ? (
              <div className="app-switcher-panel" role="menu" aria-label="应用选择">
                {APP_ENTRIES.map((entry) => {
                  const active = entry.id === selectedAppId
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      className={`app-switcher-item${active ? ' is-active' : ''}`}
                      onClick={() => {
                        setSelectedAppId(entry.id)
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
              onClick={onToggleSidebarCollapse}
            >
              {sidebarCollapsed ? '左开' : '左收'}
            </button>
            <button
              className="window-control-btn"
              type="button"
              data-slot="fg-header-g3-toggle-metadata"
              aria-pressed={!metadataCollapsed}
              onClick={onToggleMetadataCollapse}
            >
              {metadataCollapsed ? '右开' : '右收'}
            </button>
            <button
              className="window-control-btn"
              type="button"
              data-slot="fg-header-g3-help"
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
                <strong>功能模块</strong>
              </div>
              <div className="sidebar-tree mpx-scroll-area" data-slot="fg-sidebar-tree">
                {MODULES.map((module) => {
                  const active = module.id === activeModuleId
                  return (
                    <button
                      key={module.id}
                      className={`module-link-btn${active ? ' is-active' : ''}`}
                      type="button"
                      onClick={() => setActiveModuleId(module.id)}
                    >
                      {module.title}
                      <span className="module-link-desc">{module.tag}</span>
                    </button>
                  )
                })}
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
                <strong>
                  {selectedApp?.name} / {activeModule?.title}
                </strong>
              </div>
              <div className="image-grid mpx-scroll-area" data-slot="fg-main-content-image-grid-shell">
                <article className="thumb-card" data-slot="fg-main-content-image-card-shell">
                  <div className="thumb-card-meta">{activeModule?.description}</div>
                  <div className="panel-placeholder">执行逻辑暂空，后续逐模块接入。</div>
                </article>
              </div>
              <footer className="main-footer" data-slot="fg-main-footer-root">
                <small>窗口即应用视口，默认主题与样式已接入。</small>
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
                    <strong>模块说明</strong>
                  </div>
                  <div className="metadata-content" data-slot="fg-meta-content-image-editor">
                    <div className="panel-placeholder">
                      当前为框架复用阶段：UI、主题、token 与布局已落地；模块能力后续分批迁移。
                    </div>
                <div className="panel-placeholder">
                  当前界面语言：{uiSettings.uiLocale}；模式：{uiSettings.paletteMode}
                </div>
                <div className="panel-placeholder">当前应用：{selectedApp?.name}（占位）</div>
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
