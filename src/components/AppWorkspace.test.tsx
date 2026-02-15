import { createRef } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./SidebarPanel', () => ({
  default: () => <div data-testid="sidebar-panel" />,
}))

vi.mock('./MetadataPanel', () => ({
  default: () => <div data-testid="metadata-panel" />,
}))

vi.mock('./ImageMainSection', () => ({
  default: () => <div data-testid="image-main-section" />,
}))

vi.mock('./VideoMainSection', () => ({
  default: () => <div data-testid="video-main-section" />,
}))

vi.mock('./MusicMainSection', () => ({
  default: () => <div data-testid="music-main-section" />,
}))

import AppWorkspace from './AppWorkspace'

function renderWorkspace(mode: 'image' | 'video' | 'music') {
  return render(
    <AppWorkspace
      mode={mode}
      sidebarCollapsed={false}
      sidebarFocus="main"
      sidebarRatio={0.3}
      metadataCollapsed={false}
      metadataRatio={0.3}
      layoutLocked={false}
      appBodyRef={createRef<HTMLDivElement>()}
      workspaceRef={createRef<HTMLElement>()}
      workspaceBodyRef={createRef<HTMLDivElement>()}
      onExpandSidebar={vi.fn()}
      onStartSidebarResize={vi.fn()}
      onStartMetadataResize={vi.fn()}
      sidebarPanelProps={{} as never}
      searchPanelProps={{} as never}
      managementPanelProps={{} as never}
      imageMainSectionProps={{} as never}
      videoMainSectionProps={{} as never}
      musicMainSectionProps={{} as never}
      metadataPanelProps={{} as never}
      mainFooter={<span>footer</span>}
    />,
  )
}

describe('AppWorkspace', () => {
  it('music 模式渲染 MusicMainSection', () => {
    renderWorkspace('music')
    expect(screen.getByTestId('music-main-section')).toBeInTheDocument()
    expect(screen.queryByTestId('image-main-section')).toBeNull()
    expect(screen.queryByTestId('video-main-section')).toBeNull()
  })

  it('image/video 模式保持原有主区渲染逻辑，同时保留 MusicMainSection', () => {
    const { rerender } = renderWorkspace('image')
    expect(screen.getByTestId('image-main-section')).toBeInTheDocument()
    expect(screen.getByTestId('music-main-section')).toBeInTheDocument()

    rerender(
      <AppWorkspace
        mode="video"
        sidebarCollapsed={false}
        sidebarFocus="main"
        sidebarRatio={0.3}
        metadataCollapsed={false}
        metadataRatio={0.3}
        layoutLocked={false}
        appBodyRef={createRef<HTMLDivElement>()}
        workspaceRef={createRef<HTMLElement>()}
        workspaceBodyRef={createRef<HTMLDivElement>()}
        onExpandSidebar={vi.fn()}
        onStartSidebarResize={vi.fn()}
        onStartMetadataResize={vi.fn()}
        sidebarPanelProps={{} as never}
        searchPanelProps={{} as never}
        managementPanelProps={{} as never}
        imageMainSectionProps={{} as never}
        videoMainSectionProps={{} as never}
        musicMainSectionProps={{} as never}
        metadataPanelProps={{} as never}
        mainFooter={<span>footer</span>}
      />,
    )

    expect(screen.getByTestId('video-main-section')).toBeInTheDocument()
    expect(screen.getByTestId('music-main-section')).toBeInTheDocument()
  })
})
