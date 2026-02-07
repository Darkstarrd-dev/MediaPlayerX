import type { ComponentProps, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from 'react'

import type { BrowserMode } from '../types'
import ImageMainSection from './ImageMainSection'
import MetadataPanel from './MetadataPanel'
import SearchPanel from './SearchPanel'
import SidebarPanel from './SidebarPanel'
import VideoMainSection from './VideoMainSection'

interface AppWorkspaceProps {
  mode: BrowserMode
  headerHeight: number
  sidebarCollapsed: boolean
  sidebarFocus: 'sidebar' | 'main'
  sidebarRatio: number
  metadataCollapsed: boolean
  metadataRatio: number
  layoutLocked: boolean
  appBodyRef: RefObject<HTMLDivElement | null>
  workspaceRef: RefObject<HTMLElement | null>
  workspaceBodyRef: RefObject<HTMLDivElement | null>
  onExpandSidebar: () => void
  onStartSidebarResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  onStartMetadataResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  sidebarPanelProps: ComponentProps<typeof SidebarPanel>
  searchPanelProps: ComponentProps<typeof SearchPanel>
  imageMainSectionProps: ComponentProps<typeof ImageMainSection>
  videoMainSectionProps: ComponentProps<typeof VideoMainSection>
  metadataPanelProps: ComponentProps<typeof MetadataPanel>
  mainFooter: ReactNode
}

function AppWorkspace({
  mode,
  headerHeight,
  sidebarCollapsed,
  sidebarFocus,
  sidebarRatio,
  metadataCollapsed,
  metadataRatio,
  layoutLocked,
  appBodyRef,
  workspaceRef,
  workspaceBodyRef,
  onExpandSidebar,
  onStartSidebarResize,
  onStartMetadataResize,
  sidebarPanelProps,
  searchPanelProps,
  imageMainSectionProps,
  videoMainSectionProps,
  metadataPanelProps,
  mainFooter,
}: AppWorkspaceProps) {
  return (
    <div className="app-body" ref={appBodyRef} style={{ height: `calc(100vh - ${headerHeight}px)` }}>
      {sidebarCollapsed ? (
        <button aria-label="展开目录" className="sidebar-expand-btn" type="button" onClick={onExpandSidebar}>
          <span className="sidebar-expand-tip">展开目录</span>
        </button>
      ) : (
        <>
          <SidebarPanel {...sidebarPanelProps} />

          <div
            aria-label="调整 Sidebar 宽度"
            aria-orientation="vertical"
            aria-disabled={layoutLocked}
            className={`sidebar-splitter ${layoutLocked ? 'is-locked' : ''}`}
            role="separator"
            tabIndex={-1}
            onMouseDown={onStartSidebarResize}
          />
        </>
      )}

      <section
        className={`workspace ${sidebarFocus === 'main' ? 'is-focus' : ''}`}
        ref={workspaceRef}
        style={{ width: sidebarCollapsed ? '100%' : `calc(${(1 - sidebarRatio) * 100}% - 8px)` }}
      >
        <SearchPanel {...searchPanelProps} />

        <div className="workspace-body" ref={workspaceBodyRef}>
          <main className="main-pane" style={{ width: metadataCollapsed ? '100%' : `calc(${(1 - metadataRatio) * 100}% - 8px)` }}>
            {mode === 'image' ? <ImageMainSection {...imageMainSectionProps} /> : <VideoMainSection {...videoMainSectionProps} />}

            <footer className="main-footer">{mainFooter}</footer>
          </main>

          {metadataCollapsed ? null : (
            <div
              aria-label="调整元数据面板宽度"
              aria-orientation="vertical"
              aria-disabled={layoutLocked}
              className={`metadata-splitter ${layoutLocked ? 'is-locked' : ''}`}
              role="separator"
              tabIndex={-1}
              onMouseDown={onStartMetadataResize}
            />
          )}

          <MetadataPanel {...metadataPanelProps} />
        </div>
      </section>
    </div>
  )
}

export default AppWorkspace
