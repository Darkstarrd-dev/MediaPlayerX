import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AppHeader, { type AppHeaderProps } from './AppHeader'

function createProps(overrides: Partial<AppHeaderProps> = {}): AppHeaderProps {
  return {
    headerHeight: 72,
    mode: 'image',
    searchPanelOpen: false,
    manageMode: false,
    metadataManageMode: false,
    thumbnailScaleLevel: 3,
    canThumbnailScaleDown: true,
    canThumbnailScaleUp: true,
    autoPlayEnabled: false,
    autoPlayInterval: 3,
    paletteMode: 'day',
    importMenuOpen: false,
    taskStatusLabel: '空闲',
    taskStatusBusy: false,
    importTaskPanelOpen: false,
    autoPlayPresets: [1, 3, 5],
    onToggleImportMenu: vi.fn(),
    onToggleImportTaskPanel: vi.fn(),
    onCloseImportMenu: vi.fn(),
    onImportFiles: vi.fn(),
    onImportFolders: vi.fn(),
    onModeChange: vi.fn(),
    onToggleSearchPanel: vi.fn(),
    onToggleManageMode: vi.fn(),
    onToggleMetadataManageMode: vi.fn(),
    onThumbnailScaleDown: vi.fn(),
    onThumbnailScaleUp: vi.fn(),
    onAutoPlayEnabledChange: vi.fn(),
    onAutoPlayIntervalChange: vi.fn(),
    onTogglePaletteMode: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }
}

describe('AppHeader accessibility labels', () => {
  it('keeps stable toolbar button labels in normal mode', () => {
    render(<AppHeader {...createProps({ metadataManageMode: false })} />)

    expect(screen.getByRole('button', { name: '检索' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '文件管理' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '切换到元数据模式' })).toBeInTheDocument()
  })

  it('switches metadata mode toggle label when metadata mode is active', () => {
    render(<AppHeader {...createProps({ metadataManageMode: true })} />)

    expect(screen.getByRole('button', { name: '切换到图像模式' })).toBeInTheDocument()
  })
})
