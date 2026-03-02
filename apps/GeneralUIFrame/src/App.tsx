import { useEffect, useMemo, useState } from 'react'
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

const STYLE_ID = 'soft-skeuomorphic'
const PALETTE_ID = 'skeuomorphic-luxury-white'

function App() {
  const [activeModuleId, setActiveModuleId] = useState(MODULES[0]?.id ?? '')

  useEffect(() => {
    document.documentElement.setAttribute('data-mpx-style', STYLE_ID)
    document.documentElement.setAttribute('data-mpx-palette', PALETTE_ID)
  }, [])

  const activeModule = useMemo(
    () => MODULES.find((entry) => entry.id === activeModuleId) ?? MODULES[0],
    [activeModuleId],
  )

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
            <button className="window-control-btn" type="button" data-slot="fg-header-g3-help">
              ?
            </button>
          </div>
        </div>
      </header>

      <div className="app-body" data-slot="bg-app-workspace">
        <aside className="sidebar" data-slot="fg-sidebar-root">
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

        <section className="workspace" data-slot="bg-app-workspace-shell">
          <div className="workspace-body" data-slot="bg-app-workspace-body">
            <main className="main-pane" data-slot="fg-main-root">
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
            <aside className="metadata-panel" data-slot="fg-meta-root">
              <div className="metadata-head" data-slot="fg-meta-head">
                <strong>模块说明</strong>
              </div>
              <div className="metadata-content" data-slot="fg-meta-content-image-editor">
                <div className="panel-placeholder">
                  当前为框架复用阶段：UI、主题、token 与布局已落地；模块能力后续分批迁移。
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
