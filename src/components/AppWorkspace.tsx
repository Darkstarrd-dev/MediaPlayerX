import type { ComponentProps, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from 'react'
import { Profiler } from 'react'

import type { BrowserMode } from '../types'
import { benchOnReactRender } from '../features/perf/benchRecorder'
import { getBenchSettings } from '../features/perf/benchSettings'
import ImageMainSection from './ImageMainSection'
import ManagementPanel from './ManagementPanel'
import MetadataPanel from './MetadataPanel'
import SearchPanel from './SearchPanel'
import SidebarPanel from './SidebarPanel'
import VideoMainSection from './VideoMainSection'

interface AppWorkspaceProps {
  mode: BrowserMode
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
  managementPanelProps: ComponentProps<typeof ManagementPanel>
  imageMainSectionProps: ComponentProps<typeof ImageMainSection>
  videoMainSectionProps: ComponentProps<typeof VideoMainSection>
  metadataPanelProps: ComponentProps<typeof MetadataPanel>
  mainFooter: ReactNode
}

function AppWorkspace({
  mode,
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
  managementPanelProps,
  imageMainSectionProps,
  videoMainSectionProps,
  metadataPanelProps,
  mainFooter,
}: AppWorkspaceProps) {
  const benchSettings = getBenchSettings()
  const enableProfiler = Boolean(benchSettings.enabled && benchSettings.reactProfiler)

  const sidebar = enableProfiler ? (
    <Profiler id="SidebarPanel" onRender={benchOnReactRender}>
      <SidebarPanel {...sidebarPanelProps} />
    </Profiler>
  ) : (
    <SidebarPanel {...sidebarPanelProps} />
  )

  const searchPanel = enableProfiler ? (
    <Profiler id="SearchPanel" onRender={benchOnReactRender}>
      <SearchPanel {...searchPanelProps} />
    </Profiler>
  ) : (
    <SearchPanel {...searchPanelProps} />
  )

  const managementPanel = enableProfiler ? (
    <Profiler id="ManagementPanel" onRender={benchOnReactRender}>
      <ManagementPanel {...managementPanelProps} />
    </Profiler>
  ) : (
    <ManagementPanel {...managementPanelProps} />
  )

  const mainSection = mode === 'image' ? (
    enableProfiler ? (
      <Profiler id="ImageMainSection" onRender={benchOnReactRender}>
        <ImageMainSection {...imageMainSectionProps} />
      </Profiler>
    ) : (
      <ImageMainSection {...imageMainSectionProps} />
    )
  ) : enableProfiler ? (
    <Profiler id="VideoMainSection" onRender={benchOnReactRender}>
      <VideoMainSection {...videoMainSectionProps} />
    </Profiler>
  ) : (
    <VideoMainSection {...videoMainSectionProps} />
  )

  const metadataPanel = enableProfiler ? (
    <Profiler id="MetadataPanel" onRender={benchOnReactRender}>
      <MetadataPanel {...metadataPanelProps} />
    </Profiler>
  ) : (
    <MetadataPanel {...metadataPanelProps} />
  )

  return (
    <div className="app-body" ref={appBodyRef}>
      {sidebarCollapsed ? (
        <button aria-label="展开目录" className="sidebar-expand-btn" type="button" onClick={onExpandSidebar}>
          <span className="sidebar-expand-tip">展开目录</span>
        </button>
      ) : (
        <>
          {sidebar}

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
        style={{ width: sidebarCollapsed ? '100%' : `calc(${(1 - sidebarRatio) * 100}% - var(--mpx-splitter-width))` }}
      >
        {searchPanel}
        {managementPanel}

        <div className="workspace-body" ref={workspaceBodyRef}>
          <main
            className="main-pane"
            style={{ width: metadataCollapsed ? '100%' : `calc(${(1 - metadataRatio) * 100}% - var(--mpx-splitter-width))` }}
          >
            {mainSection}

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

          {metadataPanel}
        </div>
      </section>
    </div>
  )
}

export default AppWorkspace
