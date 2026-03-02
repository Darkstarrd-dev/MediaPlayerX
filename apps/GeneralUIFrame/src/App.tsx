import { useEffect, useMemo, useState } from 'react'
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

function App() {
  const [activeModuleId, setActiveModuleId] = useState(MODULES[0]?.id ?? '')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPage, setSettingsPage] = useState<SettingsPageId>('appearance')
  const [uiSettings, setUiSettings] = useState<UiSettingsState>(() => loadUiSettings())

  useEffect(() => {
    applyUiSettingsToDocument(uiSettings)
    persistUiSettings(uiSettings)
  }, [uiSettings])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  const activeModule = useMemo(
    () => MODULES.find((entry) => entry.id === activeModuleId) ?? MODULES[0],
    [activeModuleId],
  )

  const sidebarWidth = `${uiSettings.sidebarWidthPercent}%`
  const metadataWidth = `${uiSettings.metadataWidthPercent}%`

  const handleUiSettingsPatch = (patch: Partial<UiSettingsState>) => {
    setUiSettings((previous) => normalizeUiSettings({ ...previous, ...patch }))
  }

  const handleUiSettingsReset = () => {
    setUiSettings(DEFAULT_UI_SETTINGS)
    setSettingsPage('appearance')
  }

  return (
    <div className="app">
      <header className="app-header" data-slot="fg-header-root">
        <div className="header-left" data-slot="fg-header-left-group">
          <div className="header-logo-group" data-slot="fg-header-g1">
            <button className="logo-btn is-task-idle" type="button" data-slot="fg-header-logo">
              GeneralUIFrame
            </button>
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
              data-slot="fg-header-g3-help"
              onClick={() => setSettingsOpen(true)}
            >
              设置
            </button>
          </div>
        </div>
      </header>

      <div className="app-body" data-slot="bg-app-workspace">
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
        <div className="sidebar-splitter" data-slot="fg-splitter-left" />

        <section className="workspace" data-slot="bg-app-workspace-shell" style={{ flex: '1 1 auto' }}>
          <div className="workspace-body" data-slot="bg-app-workspace-body">
            <main className="main-pane" data-slot="fg-main-root" style={{ flex: '1 1 auto' }}>
              <div className="main-toolbar" data-slot="fg-main-toolbar-root">
                <strong>{activeModule?.title}</strong>
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

            <div className="metadata-splitter" data-slot="fg-splitter-right" />
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
              </div>
            </aside>
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
