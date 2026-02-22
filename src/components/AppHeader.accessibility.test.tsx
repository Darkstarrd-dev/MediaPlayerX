import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../i18n/I18nProvider'
import { resetUiStoreState, useUiStore } from '../store/useUiStore'
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
    themeParameterButtonVisible: false,
    popoverDebugPinned: false,
    onTogglePopoverDebugPinned: vi.fn(),
    onOpenThemeParameter: vi.fn(),
    onOpenHelp: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }
}

describe('AppHeader accessibility labels', () => {
  afterEach(() => {
    act(() => {
      resetUiStoreState()
    })
  })

  it('keeps stable toolbar button labels in normal mode', () => {
    act(() => {
      useUiStore.getState().updateSettings({ uiLocale: 'zh-CN' })
    })

    const { container } = render(
      <I18nProvider browserLocale="en-US">
        <AppHeader {...createProps({ metadataManageMode: false })} />
      </I18nProvider>,
    )

    const searchButton = container.querySelector('button[data-a11y-id="header.search"]')
    const manageButton = container.querySelector('button[data-a11y-id="header.manage"]')
    const metadataToggleButton = container.querySelector('button[data-a11y-id="header.metadataToggle"]')
    const helpButton = container.querySelector('button[data-a11y-id="header.help"]')

    expect(searchButton).toBeInTheDocument()
    expect(manageButton).toBeInTheDocument()
    expect(metadataToggleButton).toBeInTheDocument()
    expect(helpButton?.getAttribute('title')).toBe('打开帮助')
    expect(screen.getByRole('button', { name: '检索' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '文件管理' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '切换到元数据模式' })).toBeInTheDocument()
  })

  it('switches metadata mode toggle label when metadata mode is active', () => {
    act(() => {
      useUiStore.getState().updateSettings({ uiLocale: 'zh-CN' })
    })

    const { container } = render(
      <I18nProvider browserLocale="en-US">
        <AppHeader {...createProps({ metadataManageMode: true })} />
      </I18nProvider>,
    )

    expect(container.querySelector('button[data-a11y-id="header.metadataToggle"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '切换到图像模式' })).toBeInTheDocument()
  })
})
