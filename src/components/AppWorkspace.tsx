import type { ComponentProps, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from 'react'
import { Profiler } from 'react'

import type { BrowserMode } from '../types'
import { benchOnReactRender } from '../features/perf/benchRecorder'
import { getBenchSettings } from '../features/perf/benchSettings'
import { buildA11yPropsByRegistry } from '../i18n/a11y'
import { useI18n } from '../i18n/useI18n'
import ImageMainSection from './ImageMainSection'
import MetadataPanel from './MetadataPanel'
import MusicMainSection from './MusicMainSection'
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
  imageMainSectionProps: ComponentProps<typeof ImageMainSection>
  videoMainSectionProps: ComponentProps<typeof VideoMainSection>
  musicMainSectionProps: ComponentProps<typeof MusicMainSection>
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
  imageMainSectionProps,
  videoMainSectionProps,
  musicMainSectionProps,
  metadataPanelProps,
  mainFooter,
}: AppWorkspaceProps) {
  const { t } = useI18n()
  const benchSettings = getBenchSettings()
  const enableProfiler = Boolean(benchSettings.enabled && benchSettings.reactProfiler)

  const sidebar = enableProfiler ? (
    <Profiler id="SidebarPanel" onRender={benchOnReactRender}>
      <SidebarPanel {...sidebarPanelProps} />
    </Profiler>
  ) : (
    <SidebarPanel {...sidebarPanelProps} />
  )

  const mainSection = mode === 'image' ? (
    enableProfiler ? (
      <Profiler id="ImageMainSection" onRender={benchOnReactRender}>
        <ImageMainSection {...imageMainSectionProps} />
      </Profiler>
    ) : (
      <ImageMainSection {...imageMainSectionProps} />
    )
  ) : mode === 'video' ? (
    enableProfiler ? (
      <Profiler id="VideoMainSection" onRender={benchOnReactRender}>
        <VideoMainSection {...videoMainSectionProps} />
      </Profiler>
    ) : (
      <VideoMainSection {...videoMainSectionProps} />
    )
  ) : null

  const musicSection = enableProfiler ? (
    <Profiler id="MusicMainSection" onRender={benchOnReactRender}>
      <MusicMainSection {...musicMainSectionProps} />
    </Profiler>
  ) : (
    <MusicMainSection {...musicMainSectionProps} />
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
        <button {...buildA11yPropsByRegistry({ key: 'commonExpandSidebar', t })} className="sidebar-expand-btn" type="button" onClick={onExpandSidebar}>
          <span className="sidebar-expand-tip">{t('ui.sidebar.expand')}</span>
        </button>
      ) : (
        <>
          {sidebar}

          <div
            {...buildA11yPropsByRegistry({ key: 'commonAdjustSidebarWidth', t })}
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
        <div className="workspace-body" ref={workspaceBodyRef}>
          <main
            className="main-pane"
            style={{ width: metadataCollapsed ? '100%' : `calc(${(1 - metadataRatio) * 100}% - var(--mpx-splitter-width))` }}
          >
            {mainSection}
            {musicSection}

            <footer className="main-footer">{mainFooter}</footer>
          </main>

          {metadataCollapsed ? null : (
            <div
              {...buildA11yPropsByRegistry({ key: 'commonAdjustMetadataPanelWidth', t })}
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
