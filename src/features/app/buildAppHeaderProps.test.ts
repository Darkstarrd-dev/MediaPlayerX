import { describe, expect, it, vi } from 'vitest'

import { buildAppHeaderProps } from './buildAppHeaderProps'

describe('buildAppHeaderProps', () => {
  it('向量检索开关会同步展开检索面板并切到 vector 模式', () => {
    const setSearchPanelMode = vi.fn()
    const setSearchPanelCollapsed = vi.fn()
    const updateSettings = vi.fn()

    const props = buildAppHeaderProps({
      headerHeight: 56,
      mode: 'image',
      vectorMode: false,
      manageMode: false,
      metadataManageMode: false,
      displayThumbnailScaleLevel: 3,
      canThumbnailScaleDown: true,
      canThumbnailScaleUp: true,
      autoPlayEnabled: false,
      autoPlayInterval: 3,
      styleId: 'flush',
      paletteMode: 'day',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      headerDebugGroupVisible: false,
      tooltipEnabled: true,
      electronNativeChromeEnabled: false,
      themeParameterButtonVisible: false,
      popoverDebugPinned: false,
      importMenuOpen: false,
      taskStatusLabel: '空闲',
      taskStatusBusy: false,
      importTaskPanelOpen: false,
      autoPlayPresets: [1, 2, 3],
      thumbnailScale: 3,
      thumbnailScaleLevelCount: 5,
      setImportMenuOpen: vi.fn(),
      setImportTaskPanelOpen: vi.fn(),
      openImportFilesDialog: vi.fn(),
      openImportFoldersDialog: vi.fn(),
      updateSettings,
      setSearchPanelMode,
      setSearchPanelCollapsed,
      onToggleManageMode: vi.fn(),
      onToggleMetadataManageMode: vi.fn(),
      onTooltipEnabledChange: vi.fn(),
      onElectronNativeChromeEnabledChange: vi.fn(),
      onThemeParameterButtonVisibleChange: vi.fn(),
    })

    expect(props.searchPanelOpen).toBe(false)
    props.onToggleSearchPanel()

    expect(updateSettings).toHaveBeenCalledWith({ vectorMode: true })
    expect(setSearchPanelMode).toHaveBeenCalledWith('vector')
    expect(setSearchPanelCollapsed).toHaveBeenCalledWith(false)
  })

  it('视频模式打开检索面板时默认切到 feature 模式', () => {
    const setSearchPanelMode = vi.fn()
    const setSearchPanelCollapsed = vi.fn()
    const updateSettings = vi.fn()

    const props = buildAppHeaderProps({
      headerHeight: 56,
      mode: 'video',
      vectorMode: false,
      manageMode: false,
      metadataManageMode: false,
      displayThumbnailScaleLevel: 3,
      canThumbnailScaleDown: true,
      canThumbnailScaleUp: true,
      autoPlayEnabled: false,
      autoPlayInterval: 3,
      styleId: 'flush',
      paletteMode: 'day',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      headerDebugGroupVisible: false,
      tooltipEnabled: true,
      electronNativeChromeEnabled: false,
      themeParameterButtonVisible: false,
      popoverDebugPinned: false,
      importMenuOpen: false,
      taskStatusLabel: '空闲',
      taskStatusBusy: false,
      importTaskPanelOpen: false,
      autoPlayPresets: [1, 2, 3],
      thumbnailScale: 3,
      thumbnailScaleLevelCount: 5,
      setImportMenuOpen: vi.fn(),
      setImportTaskPanelOpen: vi.fn(),
      openImportFilesDialog: vi.fn(),
      openImportFoldersDialog: vi.fn(),
      updateSettings,
      setSearchPanelMode,
      setSearchPanelCollapsed,
      onToggleManageMode: vi.fn(),
      onToggleMetadataManageMode: vi.fn(),
      onTooltipEnabledChange: vi.fn(),
      onElectronNativeChromeEnabledChange: vi.fn(),
      onThemeParameterButtonVisibleChange: vi.fn(),
    })

    props.onToggleSearchPanel()

    expect(updateSettings).toHaveBeenCalledWith({ vectorMode: true })
    expect(setSearchPanelMode).toHaveBeenCalledWith('feature')
    expect(setSearchPanelCollapsed).toHaveBeenCalledWith(false)
  })

  it('音乐模式打开检索面板时默认切到 feature 模式', () => {
    const setSearchPanelMode = vi.fn()
    const setSearchPanelCollapsed = vi.fn()
    const updateSettings = vi.fn()

    const props = buildAppHeaderProps({
      headerHeight: 56,
      mode: 'music',
      vectorMode: false,
      manageMode: false,
      metadataManageMode: false,
      displayThumbnailScaleLevel: 3,
      canThumbnailScaleDown: true,
      canThumbnailScaleUp: true,
      autoPlayEnabled: false,
      autoPlayInterval: 3,
      styleId: 'flush',
      paletteMode: 'day',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      headerDebugGroupVisible: false,
      tooltipEnabled: true,
      electronNativeChromeEnabled: false,
      themeParameterButtonVisible: false,
      popoverDebugPinned: false,
      importMenuOpen: false,
      taskStatusLabel: '空闲',
      taskStatusBusy: false,
      importTaskPanelOpen: false,
      autoPlayPresets: [1, 2, 3],
      thumbnailScale: 3,
      thumbnailScaleLevelCount: 5,
      setImportMenuOpen: vi.fn(),
      setImportTaskPanelOpen: vi.fn(),
      openImportFilesDialog: vi.fn(),
      openImportFoldersDialog: vi.fn(),
      updateSettings,
      setSearchPanelMode,
      setSearchPanelCollapsed,
      onToggleManageMode: vi.fn(),
      onToggleMetadataManageMode: vi.fn(),
      onTooltipEnabledChange: vi.fn(),
      onElectronNativeChromeEnabledChange: vi.fn(),
      onThemeParameterButtonVisibleChange: vi.fn(),
    })

    props.onToggleSearchPanel()

    expect(updateSettings).toHaveBeenCalledWith({ vectorMode: true })
    expect(setSearchPanelMode).toHaveBeenCalledWith('feature')
    expect(setSearchPanelCollapsed).toHaveBeenCalledWith(false)
  })

  it('缩略图等级调节会执行 clamp，导入菜单开关使用函数式 setter', () => {
    const updateSettings = vi.fn()
    const setImportMenuOpen = vi.fn()

    const props = buildAppHeaderProps({
      headerHeight: 56,
      mode: 'image',
      vectorMode: true,
      manageMode: false,
      metadataManageMode: false,
      displayThumbnailScaleLevel: 1,
      canThumbnailScaleDown: true,
      canThumbnailScaleUp: false,
      autoPlayEnabled: false,
      autoPlayInterval: 3,
      styleId: 'flush',
      paletteMode: 'day',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      headerDebugGroupVisible: false,
      tooltipEnabled: true,
      electronNativeChromeEnabled: false,
      themeParameterButtonVisible: false,
      popoverDebugPinned: false,
      importMenuOpen: true,
      taskStatusLabel: '空闲',
      taskStatusBusy: false,
      importTaskPanelOpen: false,
      autoPlayPresets: [1, 2, 3],
      thumbnailScale: 1,
      thumbnailScaleLevelCount: 5,
      setImportMenuOpen,
      setImportTaskPanelOpen: vi.fn(),
      openImportFilesDialog: vi.fn(),
      openImportFoldersDialog: vi.fn(),
      updateSettings,
      setSearchPanelMode: vi.fn(),
      setSearchPanelCollapsed: vi.fn(),
      onToggleManageMode: vi.fn(),
      onToggleMetadataManageMode: vi.fn(),
      onTooltipEnabledChange: vi.fn(),
      onElectronNativeChromeEnabledChange: vi.fn(),
      onThemeParameterButtonVisibleChange: vi.fn(),
    })

    props.onThumbnailScaleUp()
    expect(updateSettings).toHaveBeenLastCalledWith({ thumbnailScale: 1 })

    props.onThumbnailScaleDown()
    expect(updateSettings).toHaveBeenLastCalledWith({ thumbnailScale: 2 })

    props.onToggleImportMenu()
    const updater = setImportMenuOpen.mock.calls[0]?.[0] as ((value: boolean) => boolean) | undefined
    expect(typeof updater).toBe('function')
    expect(updater?.(true)).toBe(false)
    expect(updater?.(false)).toBe(true)
  })

  it('元数据管理模式开启时，检索按钮保持关闭态', () => {
    const props = buildAppHeaderProps({
      headerHeight: 56,
      mode: 'image',
      vectorMode: true,
      manageMode: false,
      metadataManageMode: true,
      displayThumbnailScaleLevel: 3,
      canThumbnailScaleDown: true,
      canThumbnailScaleUp: true,
      autoPlayEnabled: false,
      autoPlayInterval: 3,
      styleId: 'flush',
      paletteMode: 'day',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      headerDebugGroupVisible: false,
      tooltipEnabled: true,
      electronNativeChromeEnabled: false,
      themeParameterButtonVisible: false,
      popoverDebugPinned: false,
      importMenuOpen: false,
      taskStatusLabel: '空闲',
      taskStatusBusy: false,
      importTaskPanelOpen: false,
      autoPlayPresets: [1, 2, 3],
      thumbnailScale: 3,
      thumbnailScaleLevelCount: 5,
      setImportMenuOpen: vi.fn(),
      setImportTaskPanelOpen: vi.fn(),
      openImportFilesDialog: vi.fn(),
      openImportFoldersDialog: vi.fn(),
      updateSettings: vi.fn(),
      setSearchPanelMode: vi.fn(),
      setSearchPanelCollapsed: vi.fn(),
      onToggleManageMode: vi.fn(),
      onToggleMetadataManageMode: vi.fn(),
      onTooltipEnabledChange: vi.fn(),
      onElectronNativeChromeEnabledChange: vi.fn(),
      onThemeParameterButtonVisibleChange: vi.fn(),
    })

    expect(props.searchPanelOpen).toBe(false)
    expect(props.metadataManageMode).toBe(true)
  })

  it('day/night 按钮切换会同步更新 paletteMode 与生效 palette', () => {
    const updateSettings = vi.fn()

    const props = buildAppHeaderProps({
      headerHeight: 56,
      mode: 'image',
      vectorMode: false,
      manageMode: false,
      metadataManageMode: false,
      displayThumbnailScaleLevel: 3,
      canThumbnailScaleDown: true,
      canThumbnailScaleUp: true,
      autoPlayEnabled: false,
      autoPlayInterval: 3,
      styleId: 'soft-skeuomorphic',
      paletteMode: 'day',
      paletteDayId: 'skeuomorphic-light',
      paletteNightId: 'skeuomorphic-dark',
      headerDebugGroupVisible: false,
      tooltipEnabled: true,
      electronNativeChromeEnabled: false,
      themeParameterButtonVisible: false,
      popoverDebugPinned: false,
      importMenuOpen: false,
      taskStatusLabel: '空闲',
      taskStatusBusy: false,
      importTaskPanelOpen: false,
      autoPlayPresets: [1, 2, 3],
      thumbnailScale: 3,
      thumbnailScaleLevelCount: 9,
      setImportMenuOpen: vi.fn(),
      setImportTaskPanelOpen: vi.fn(),
      openImportFilesDialog: vi.fn(),
      openImportFoldersDialog: vi.fn(),
      updateSettings,
      setSearchPanelMode: vi.fn(),
      setSearchPanelCollapsed: vi.fn(),
      onToggleManageMode: vi.fn(),
      onToggleMetadataManageMode: vi.fn(),
      onTooltipEnabledChange: vi.fn(),
      onElectronNativeChromeEnabledChange: vi.fn(),
      onThemeParameterButtonVisibleChange: vi.fn(),
    })

    props.onTogglePaletteMode()

    expect(updateSettings).toHaveBeenCalledWith({
      paletteMode: 'night',
      paletteDayId: 'skeuomorphic-light',
      paletteNightId: 'skeuomorphic-dark',
      paletteId: 'skeuomorphic-dark',
      themeId: 'skeuomorphic-dark',
    })
  })
})
