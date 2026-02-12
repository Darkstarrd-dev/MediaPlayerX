import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { MockMediaRepository } from './features/backend/repository/mockRepository'
import { resetUiStoreState, useUiStore } from './store/useUiStore'

describe('MediaPlayer 虚拟 UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetUiStoreState()
    window.mediaPlayerBackend = undefined
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('支持图片/视频模式切换', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: '检索' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))

    expect(screen.getByText(/封面态（待播放）/)).toBeInTheDocument()
  })

  it('应用启动阶段不会触发 Maximum update depth exceeded', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<App />)

    for (let i = 0; i < 3; i += 1) {
      fireEvent(window, new Event('resize'))
    }

    await waitFor(() => {
      const hasMaxDepthError = consoleErrorSpy.mock.calls.some((call) => {
        const message = call.map((item) => String(item)).join(' ')
        return message.includes('Maximum update depth exceeded')
      })
      expect(hasMaxDepthError).toBe(false)
    })
  })

  it('管理模式可展开管理容器并与检索容器互斥', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '检索' }))
    expect(screen.getByLabelText('名称')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    expect(screen.queryByLabelText('名称')).not.toBeInTheDocument()
  })

  it('文件管理与元数据管理互斥，且可一键切换到检索模式', () => {
    render(<App />)

    const searchButton = screen.getByRole('button', { name: '检索' }) as HTMLButtonElement
    const fileManageButton = screen.getByRole('button', { name: '文件管理' })
    const metadataManageButton = screen.getByRole('button', { name: '元数据管理' })

    fireEvent.click(metadataManageButton)
    expect(searchButton.disabled).toBe(false)
    expect(metadataManageButton.classList.contains('is-active')).toBe(true)
    expect(fileManageButton.classList.contains('is-active')).toBe(false)

    fireEvent.click(searchButton)
    expect(searchButton.classList.contains('is-active')).toBe(true)
    expect(metadataManageButton.classList.contains('is-active')).toBe(false)
    expect(screen.getByLabelText('名称')).toBeInTheDocument()

    fireEvent.click(fileManageButton)
    expect(searchButton.classList.contains('is-active')).toBe(false)
    expect(fileManageButton.classList.contains('is-active')).toBe(true)
    expect(screen.queryByLabelText('名称')).toBeNull()
  })

  it('文件管理控件改为主工具栏承载，且摘要右对齐显示', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    expect(document.querySelector('.manage-panel')).toBeNull()
    expect(document.querySelector('.main-toolbar-summary')).not.toBeNull()

    await waitFor(() => {
      expect(screen.getByText('未选择条目')).toBeInTheDocument()
    })
  })

  it('检索/文件管理/元数据管理快速切换不会抛出运行时错误', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<App />)

    const searchButton = screen.getByRole('button', { name: '检索' })
    const manageButton = screen.getByRole('button', { name: '文件管理' })
    const metadataManageButton = screen.getByRole('button', { name: '元数据管理' })

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(manageButton)
      fireEvent.click(metadataManageButton)
      fireEvent.click(searchButton)
    }

    await waitFor(() => {
      const hasRuntimeError = consoleErrorSpy.mock.calls.some((call) => {
        const message = call.map((item) => String(item)).join(' ')
        return message.includes('Error:') || message.includes('TypeError') || message.includes('Maximum update depth exceeded')
      })
      expect(hasRuntimeError).toBe(false)
    })
  })

  it('快速切换 Sidebar 节点时缩略图列表保持可渲染且不抛错', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<App />)

    const node1 = screen.getByRole('button', { name: '目录直读：海岸' })
    const node2 = screen.getByRole('button', { name: '目录直读：画廊A' })

    for (let index = 0; index < 8; index += 1) {
      fireEvent.click(node1)
      fireEvent.click(node2)
    }

    await waitFor(() => {
      expect(document.querySelectorAll('.thumb-card-main').length).toBeGreaterThan(0)
    })

    const hasRuntimeError = consoleErrorSpy.mock.calls.some((call) => {
      const message = call.map((item) => String(item)).join(' ')
      return message.includes('Error:') || message.includes('TypeError')
    })
    expect(hasRuntimeError).toBe(false)
  })

  it('Sidebar 包节点在包名与作品名不一致时显示作品名', () => {
    render(<App />)

    expect(screen.getAllByRole('button', { name: '海岸线合集' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'coastline_album.zip' })).toBeNull()
  })

  it('Sidebar 目录源节点在图包名与作品名不一致时显示作品名', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: '目录直读：仅图片目录' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '仅图片目录' })).toBeNull()
  })

  it('管理模式删除确认弹窗需勾选不可逆确认后才能提交', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-row.is-manage .sidebar-label').length).toBeGreaterThan(0)
    })

    const firstSidebarLabel = document.querySelector('.sidebar-row.is-manage .sidebar-label') as HTMLButtonElement | null
    expect(firstSidebarLabel).not.toBeNull()
    fireEvent.click(firstSidebarLabel as HTMLButtonElement)

    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.getByRole('dialog', { name: '永久删除确认' })).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: '确定删除' }) as HTMLButtonElement
    expect(confirmButton.disabled).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: '我了解此操作将永久不可逆地删除选中数据' }))
    expect(confirmButton.disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog', { name: '永久删除确认' })).not.toBeInTheDocument()
  })

  it('Esc 按优先级先关闭删除确认，再关闭管理面板', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-row.is-manage .sidebar-label').length).toBeGreaterThan(0)
    })

    fireEvent.click(document.querySelector('.sidebar-row.is-manage .sidebar-label') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.getByRole('dialog', { name: '永久删除确认' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '永久删除确认' })).toBeNull()
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull()
  })

  it('Esc 可关闭设置与检索状态，且主区右键不误关闭检索', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(screen.getByRole('dialog', { name: '设置面板' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '设置面板' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    const settingsMask = document.querySelector('.settings-mask') as HTMLElement | null
    expect(settingsMask).not.toBeNull()
    fireEvent.mouseDown(settingsMask as HTMLElement, { button: 2 })
    expect(screen.queryByRole('dialog', { name: '设置面板' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '检索' }))
    expect(screen.getByLabelText('名称')).toBeInTheDocument()

    const mainPane = document.querySelector('.main-pane') as HTMLElement | null
    expect(mainPane).not.toBeNull()
    fireEvent.mouseDown(mainPane as HTMLElement, { button: 2 })
    expect(screen.getByLabelText('名称')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByLabelText('名称')).toBeNull()
  })

  it('Esc 关闭元数据管理，右键关闭全屏层', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))
    expect(screen.getByRole('button', { name: '同步名称' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('button', { name: '同步名称' })).toBeNull()

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })

    await waitFor(() => {
      expect(document.querySelector('.fullscreen-layer')).not.toBeNull()
    })

    const fullscreenLayer = document.querySelector('.fullscreen-layer') as HTMLElement | null
    expect(fullscreenLayer).not.toBeNull()
    fireEvent.mouseDown(fullscreenLayer as HTMLElement, { button: 2 })

    await waitFor(() => {
      expect(document.querySelector('.fullscreen-layer')).toBeNull()
    })
  })

  it('管理模式下 Sidebar 与主视图 checker 互斥，且视频模式可进入管理', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-row.is-manage .sidebar-label').length).toBeGreaterThan(0)
      expect(document.querySelectorAll('.thumb-card-main').length).toBeGreaterThan(0)
    })

    const firstSidebarRow = document.querySelector('.sidebar-row.is-manage') as HTMLElement | null
    expect(firstSidebarRow).not.toBeNull()
    fireEvent.click(document.querySelector('.sidebar-row.is-manage .sidebar-label') as HTMLButtonElement)
    expect((firstSidebarRow as HTMLElement).classList.contains('is-selected')).toBe(true)

    const firstThumbCard = document.querySelector('.thumb-card.is-manage') as HTMLElement | null
    expect(firstThumbCard).not.toBeNull()
    fireEvent.mouseDown(document.querySelector('.thumb-card-main') as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    expect((firstThumbCard as HTMLElement).classList.contains('is-selected')).toBe(true)
    expect((firstSidebarRow as HTMLElement).classList.contains('is-selected')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '隐藏' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消隐藏' })).toBeDisabled()
  })

  it('管理模式下点击缩略图即可切换 checker 状态', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelector('.thumb-card-main')).not.toBeNull()
    })

    const firstCard = document.querySelector('.thumb-card.is-manage') as HTMLElement | null
    const thumbCardMain = document.querySelector('.thumb-card-main') as HTMLButtonElement | null
    expect(firstCard).not.toBeNull()
    expect(thumbCardMain).not.toBeNull()

    fireEvent.mouseDown(thumbCardMain as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    expect((firstCard as HTMLElement).classList.contains('is-selected')).toBe(true)

    fireEvent.mouseDown(thumbCardMain as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    expect((firstCard as HTMLElement).classList.contains('is-selected')).toBe(false)
  })

  it('管理模式在紧凑窗口下保持稳定：无最大更新深度报错、无折叠按钮、缩略图容器不可滚动', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelector('.image-grid.is-manage')).not.toBeNull()
    })

    expect(screen.queryByRole('button', { name: '折叠' })).toBeNull()

    const grid = document.querySelector('.image-grid.is-manage') as HTMLElement | null
    expect(grid).not.toBeNull()
    expect(grid?.classList.contains('is-manage')).toBe(true)

    for (let i = 0; i < 5; i += 1) {
      fireEvent(window, new Event('resize'))
    }

    await waitFor(() => {
      const hasMaxDepthError = consoleErrorSpy.mock.calls.some((call) => {
        const message = call.map((item) => String(item)).join(' ')
        return message.includes('Maximum update depth exceeded')
      })
      expect(hasMaxDepthError).toBe(false)
    })
  })

  it('隐藏项在非管理模式不可见', async () => {
    render(<App />)

    expect(screen.queryAllByText('幻旅系列 001 #1').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.thumb-card-main').length).toBeGreaterThan(0)
    })

    fireEvent.mouseDown(document.querySelector('.thumb-card-main') as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    fireEvent.click(screen.getByRole('button', { name: '隐藏' }))

    await waitFor(() => {
      expect(screen.getByText('隐藏完成：1 项')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(screen.queryByText('幻旅系列 001 #1')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(screen.queryAllByText('幻旅系列 001 #1').length).toBeGreaterThan(0)
    })

    const hiddenThumbButton = screen.getAllByText('幻旅系列 001 #1')[0]?.closest('button')
    expect(hiddenThumbButton).not.toBeNull()
    fireEvent.mouseDown(hiddenThumbButton as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    fireEvent.click(screen.getByRole('button', { name: '取消隐藏' }))

    await waitFor(() => {
      expect(screen.getByText('取消隐藏完成：1 项')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(screen.queryAllByText('幻旅系列 001 #1').length).toBeGreaterThan(0)
    })
  })

  it('main-footer 始终显示，focus 清空后显示当前 Sidebar 路径', async () => {
    render(<App />)

    const footer = document.querySelector('.main-footer') as HTMLElement | null
    expect(footer).not.toBeNull()
    expect((footer?.textContent ?? '').trim().length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '目录直读：画廊A' }))
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      const footerSpans = document.querySelectorAll('.main-footer span')
      expect(footerSpans.length).toBeGreaterThanOrEqual(1)
      expect(footerSpans[0]?.textContent ?? '').toContain('X盘/收藏/画廊A')
    })
  })

  it('管理异常显示在主工具栏提示中，不占用顶部异常横幅', async () => {
    vi.spyOn(MockMediaRepository.prototype, 'deleteSidebarNodesSync').mockImplementation(() => {
      throw new Error('manage-delete-failed')
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-row.is-manage .sidebar-label').length).toBeGreaterThan(0)
    })
    fireEvent.click(document.querySelector('.sidebar-row.is-manage .sidebar-label') as HTMLButtonElement)

    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '我了解此操作将永久不可逆地删除选中数据' }))
    fireEvent.click(screen.getByRole('button', { name: '确定删除' }))

    await waitFor(() => {
      expect(screen.getByText('manage-delete-failed')).toBeInTheDocument()
    })

    expect(document.querySelector('.backend-error-banner')).toBeNull()
  })

  it('管理删除 Sidebar 节点部分失败时，提示文案与 failed 计数保持一致', async () => {
    vi.spyOn(MockMediaRepository.prototype, 'deleteSidebarNodesSync').mockImplementation(() => ({
      deleted_count: 1,
      failed: [
        {
          node_id: 'folder:not-found',
          reason: 'node not found',
        },
      ],
      updated_at_ms: Date.now(),
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-row.is-manage .sidebar-label').length).toBeGreaterThan(0)
    })

    fireEvent.click(document.querySelector('.sidebar-row.is-manage .sidebar-label') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '我了解此操作将永久不可逆地删除选中数据' }))
    fireEvent.click(screen.getByRole('button', { name: '确定删除' }))

    await waitFor(() => {
      expect(screen.getByText('已删除 1 项，失败 1 项')).toBeInTheDocument()
    })

    expect(screen.queryByText(/管理操作:/)).not.toBeInTheDocument()
  })

  it('管理删除图片部分失败时，提示文案与 failed 计数保持一致', async () => {
    vi.spyOn(MockMediaRepository.prototype, 'deleteImageItemsSync').mockImplementation(() => ({
      deleted_count: 1,
      failed: [
        {
          image_id: 'img-not-found',
          reason: 'image not found',
        },
      ],
      updated_at_ms: Date.now(),
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.thumb-card-main').length).toBeGreaterThan(0)
    })

    fireEvent.mouseDown(document.querySelector('.thumb-card-main') as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '我了解此操作将永久不可逆地删除选中数据' }))
    fireEvent.click(screen.getByRole('button', { name: '确定删除' }))

    await waitFor(() => {
      expect(screen.getByText('已删除 1 张，失败 1 项')).toBeInTheDocument()
    })

    expect(screen.queryByText(/管理操作:/)).not.toBeInTheDocument()
  })

  it('文件管理改为工具栏后仍可执行删除流程', async () => {
    vi.spyOn(MockMediaRepository.prototype, 'deleteImageItemsSync').mockImplementation((request) => ({
      deleted_count: request.image_ids.length,
      failed: [],
      updated_at_ms: Date.now(),
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.thumb-card-main').length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole('group', { name: 'AI广告审核控制' })).toBeNull()

    fireEvent.mouseDown(document.querySelector('.thumb-card-main') as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '我了解此操作将永久不可逆地删除选中数据' }))
    fireEvent.click(screen.getByRole('button', { name: '确定删除' }))

    await waitFor(() => {
      expect(screen.getByText('已删除 1 张')).toBeInTheDocument()
    })
  }, 15_000)

  it('AI广告审核通过后仅显示工具栏按钮，点击后才展开审核面板', async () => {
    useUiStore.setState({
      adReviewVisionEndpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      adReviewVisionModel: 'mock-vision-model',
      adReviewVisionVerified: true,
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '文件管理' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '广告审核' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('group', { name: 'AI广告审核控制' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '广告审核' }))
    await waitFor(() => {
      expect(screen.getByRole('group', { name: 'AI广告审核控制' })).toBeInTheDocument()
    })
  })

  it('真实渲染链路可输出可渲染媒体 URL（Main/Metadata/Fullscreen）', async () => {
    render(<App />)

    await waitFor(() => {
      const firstThumbImage = document.querySelector('.thumb-media-image') as HTMLImageElement | null
      expect(firstThumbImage).not.toBeNull()
      expect(firstThumbImage?.getAttribute('src')).toContain('data:image/svg+xml')
    })

    const firstThumbButton = screen.getByText('幻旅系列 001 #1').closest('button')
    expect(firstThumbButton).not.toBeNull()
    fireEvent.click(firstThumbButton as HTMLButtonElement)

    await waitFor(() => {
      const metadataImage = document.querySelector('.metadata-image-real') as HTMLImageElement | null
      expect(metadataImage).not.toBeNull()
      expect(metadataImage?.getAttribute('src')).toContain('data:image/svg+xml')
    })

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })

    await waitFor(() => {
      const fullscreenImage = document.querySelector('.fullscreen-media-image-element') as HTMLImageElement | null
      expect(fullscreenImage).not.toBeNull()
      expect(fullscreenImage?.getAttribute('src')).toContain('data:image/svg+xml')
    })

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))

    await waitFor(() => {
      const videoElement = document.querySelector('.video-screen-media') as HTMLVideoElement | null
      expect(videoElement).not.toBeNull()
      expect(videoElement?.getAttribute('src')).toContain('about:blank#mock-video')
    })
  })

  it('检索模式将筛选控件渲染到元数据面板下方并实时生效', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '检索' }))
    const featureControls = document.querySelector('.feature-controls') as HTMLElement | null
    expect(featureControls).not.toBeNull()
    const featureScope = within(featureControls as HTMLElement)
    expect(featureScope.getByPlaceholderText('按名称模糊匹配')).toBeInTheDocument()
    expect(featureScope.getByPlaceholderText('按作品名模糊匹配')).toBeInTheDocument()
    expect(screen.getByText(/命中节点:/)).toBeInTheDocument()

    fireEvent.change(featureScope.getByPlaceholderText('按名称模糊匹配'), { target: { value: '002' } })
    fireEvent.change(featureScope.getByPlaceholderText('输入作者，支持自动补完'), { target: { value: 'Nori' } })
    expect(screen.getByRole('button', { name: '检索结果' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument()
  }, 15_000)

  it('视频模式检索面板仅展示特征检索', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.click(screen.getByRole('button', { name: '检索' }))

    expect(screen.queryByRole('group', { name: 'search-mode-switch' })).toBeNull()
    expect(screen.queryByRole('button', { name: '向量检索' })).toBeNull()
    expect(screen.queryByText(/当前结果:/)).toBeNull()
    expect(screen.getByText(/命中节点:/)).toBeInTheDocument()

    const featureControls = document.querySelector('.feature-controls') as HTMLElement | null
    expect(featureControls).not.toBeNull()
    const featureScope = within(featureControls as HTMLElement)
    expect(featureScope.getByLabelText('名称')).toBeInTheDocument()
    expect(featureScope.getByLabelText('作品名')).toBeInTheDocument()
    expect(featureScope.getByLabelText('社团')).toBeInTheDocument()
    expect(featureScope.getByLabelText('作者')).toBeInTheDocument()
  })

  it('布局锁定开启后，主界面分割条拖动失效', () => {
    render(<App />)

    const sidebar = document.querySelector('.sidebar') as HTMLElement | null
    expect(sidebar).not.toBeNull()
    const widthBeforeLock = sidebar!.style.width

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    const layoutLockToggle = screen.getByLabelText('布局锁定')
    fireEvent.click(layoutLockToggle)
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))

    const sidebarSplitter = screen.getByRole('separator', { name: '调整 Sidebar 宽度' })
    fireEvent.mouseDown(sidebarSplitter, { clientX: 220 })
    fireEvent.mouseMove(window, { clientX: 640 })
    fireEvent.mouseUp(window)

    const widthAfterLock = (document.querySelector('.sidebar') as HTMLElement).style.width
    expect(widthAfterLock).toBe(widthBeforeLock)
  })

  it('元数据管理使用主工具栏承载同步名称与获取元数据动作', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))

    expect(screen.getByRole('button', { name: '同步名称' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取元数据' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '自动生成标签' })).toBeNull()
    expect(screen.queryByRole('button', { name: '视觉模型生成标签' })).toBeNull()
    expect(screen.queryByRole('button', { name: '生成嵌入向量' })).toBeNull()
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
  })

  it('获取元数据弹窗展示双源结果列与分源请求响应预览', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))
    fireEvent.click(screen.getByRole('button', { name: '获取元数据' }))

    const searchExternalMetadata = vi.fn(async (request: { source?: 'nhentai' | 'ehentai' }) => {
      if (request.source === 'ehentai') {
        return {
          items: [
            {
              source: 'ehentai' as const,
              id: '1919810',
              title: '[Circle] mock-eh-title',
              title_original: null,
              cover: null,
              url: 'https://example.com/eh/1919810',
              token: 'token1919810',
              tags: ['parody:original'],
              pages: 1,
              posted: null,
              rating: null,
              favorited: null,
              raw: { source: 'ehentai', mock: true },
            },
          ],
          debug: {
            source: 'ehentai' as const,
            started_at_ms: 1,
            finished_at_ms: 2,
            success: true,
            result_count: 1,
            steps: [
              {
                at_ms: 1,
                stage: 'ehentai.search-page.request',
                message: '开始请求',
                request: { url: 'https://e-hentai.org/' },
              },
            ],
          },
        }
      }

      return {
        items: [
          {
            source: 'nhentai' as const,
            id: '114514',
            title: 'mock-nh-title',
            title_original: null,
            cover: null,
            url: 'https://example.com/nh/114514',
            token: '',
            tags: ['language:chinese'],
            pages: 1,
            posted: null,
            rating: null,
            favorited: null,
            raw: { source: 'nhentai', mock: true },
          },
        ],
        debug: {
          source: 'nhentai' as const,
          started_at_ms: 1,
          finished_at_ms: 2,
          success: true,
          result_count: 1,
          steps: [
            {
              at_ms: 1,
              stage: 'nhentai.gallery.request',
              message: '开始请求',
              request: { url: 'https://nhentai.net/api/gallery/114514' },
            },
          ],
        },
      }
    })

    window.mediaPlayerBackend = {
      searchExternalMetadata,
    } as unknown as typeof window.mediaPlayerBackend

    const dialog = screen.getByRole('dialog', { name: '获取元数据' })
    const scope = within(dialog)

    expect(dialog.querySelectorAll('.metadata-fetch-source-column').length).toBe(2)

    fireEvent.click(scope.getByRole('button', { name: '检索' }))

    await waitFor(() => {
      expect(searchExternalMetadata).toHaveBeenCalledTimes(2)
    })

    const calledSources = searchExternalMetadata.mock.calls.map((call) => call[0]?.source)
    expect(calledSources).toEqual(expect.arrayContaining(['nhentai', 'ehentai']))

    const nhColumn = dialog.querySelector('[data-source="nhentai"]') as HTMLElement | null
    const ehColumn = dialog.querySelector('[data-source="ehentai"]') as HTMLElement | null
    expect(nhColumn).not.toBeNull()
    expect(ehColumn).not.toBeNull()

    await waitFor(() => {
      const nhScope = within(nhColumn as HTMLElement)
      const ehScope = within(ehColumn as HTMLElement)
      const nhRequest = nhScope.getByLabelText('Request Body') as HTMLTextAreaElement
      const nhResponse = nhScope.getByLabelText('Response Body') as HTMLTextAreaElement
      const nhDebug = nhScope.getByLabelText('Debug Trace') as HTMLTextAreaElement
      const ehRequest = ehScope.getByLabelText('Request Body') as HTMLTextAreaElement
      const ehResponse = ehScope.getByLabelText('Response Body') as HTMLTextAreaElement
      const ehDebug = ehScope.getByLabelText('Debug Trace') as HTMLTextAreaElement

      expect(nhRequest.value).toContain('"source": "nhentai"')
      expect(nhResponse.value).toContain('"source": "nhentai"')
      expect(nhDebug.value).toContain('"nhentai.gallery.request"')
      expect(ehRequest.value).toContain('"source": "ehentai"')
      expect(ehResponse.value).toContain('"source": "ehentai"')
      expect(ehDebug.value).toContain('"ehentai.search-page.request"')
    })

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '获取元数据' })).toBeNull()
    })
  })

  it('获取元数据支持按来源过滤、回车检索并可解析 ehentai 结果', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '数据库设置' }))
    fireEvent.change(screen.getByLabelText('E-Hentai Cookies'), {
      target: { value: 'ipb_member_id=123; ipb_pass_hash=abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))

    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))
    fireEvent.click(screen.getByRole('button', { name: '获取元数据' }))

    const searchExternalMetadata = vi.fn(async () => ({
      items: [
        {
          source: 'ehentai' as const,
          id: '1919810',
          title: '[Circle] mock-eh-title',
          title_original: '[サークル] mock-eh-title-jpn',
          cover: null,
          url: 'https://e-hentai.org/g/1919810/mocktoken/',
          token: 'mocktoken',
          tags: ['parody:original', 'female:big breasts'],
          pages: 12,
          posted: '1700000000',
          rating: '4.8',
          favorited: null,
          raw: {
            gid: '1919810',
            token: 'mocktoken',
            title: '[Circle] mock-eh-title',
            title_jpn: '[サークル] mock-eh-title-jpn',
          },
        },
      ],
      debug: {
        source: 'ehentai' as const,
        started_at_ms: 1,
        finished_at_ms: 2,
        success: true,
        result_count: 1,
        steps: [
          {
            at_ms: 1,
            stage: 'ehentai.gdata.response',
            message: '请求成功',
            response: { status: 200 },
          },
        ],
      },
    }))

    window.mediaPlayerBackend = {
      searchExternalMetadata,
    } as unknown as typeof window.mediaPlayerBackend

    const dialog = screen.getByRole('dialog', { name: '获取元数据' })
    const scope = within(dialog)

    fireEvent.click(scope.getByRole('button', { name: 'EH' }))

    const idInput = scope.getByLabelText('检索ID') as HTMLInputElement
    fireEvent.change(idInput, { target: { value: '1919810' } })
    fireEvent.keyDown(idInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(searchExternalMetadata).toHaveBeenCalledTimes(1)
    })

      expect(searchExternalMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'ehentai',
          input_id: '1919810',
          ehentai_cookies: 'ipb_member_id=123; ipb_pass_hash=abc',
        }),
      )

    const nhColumn = dialog.querySelector('[data-source="nhentai"]') as HTMLElement | null
    const ehColumn = dialog.querySelector('[data-source="ehentai"]') as HTMLElement | null
    expect(nhColumn).not.toBeNull()
    expect(ehColumn).not.toBeNull()

    await waitFor(() => {
      const nhScope = within(nhColumn as HTMLElement)
      const ehScope = within(ehColumn as HTMLElement)
      const nhRequest = nhScope.getByLabelText('Request Body') as HTMLTextAreaElement
      const nhResponse = nhScope.getByLabelText('Response Body') as HTMLTextAreaElement
      const nhDebug = nhScope.getByLabelText('Debug Trace') as HTMLTextAreaElement
      const ehRequest = ehScope.getByLabelText('Request Body') as HTMLTextAreaElement
      const ehResponse = ehScope.getByLabelText('Response Body') as HTMLTextAreaElement
      const ehDebug = ehScope.getByLabelText('Debug Trace') as HTMLTextAreaElement

      expect(nhRequest.value).toBe('')
      expect(nhResponse.value).toBe('')
      expect(nhDebug.value).toBe('')
      expect(ehRequest.value).toContain('"source": "ehentai"')
      expect(ehResponse.value).toContain('"source": "ehentai"')
      expect(ehDebug.value).toContain('"ehentai.gdata.response"')
    })

    fireEvent.click(within(ehColumn as HTMLElement).getByRole('button', { name: '解析' }))

    await waitFor(() => {
      const parsed = within(ehColumn as HTMLElement).getByLabelText('Parsed') as HTMLTextAreaElement
      expect(parsed.value).toContain('"site": "ehentai"')
    })

    await waitFor(() => {
      expect(within(ehColumn as HTMLElement).queryByLabelText('Request Body')).toBeNull()
      expect(within(ehColumn as HTMLElement).queryByLabelText('Response Body')).toBeNull()
    })

    fireEvent.click(within(ehColumn as HTMLElement).getByRole('button', { name: /Request Body/ }))
    await waitFor(() => {
      expect(within(ehColumn as HTMLElement).getByLabelText('Request Body')).toBeInTheDocument()
    })
  })

  it('元数据面板标题可折叠，并可恢复展开', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '元数据面板' }))
    expect(screen.getByRole('button', { name: '展开元数据面板' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '展开元数据面板' }))
    expect(screen.getByRole('button', { name: '元数据面板' })).toBeInTheDocument()
  })

  it('进入元数据管理时自动退出原图显示并回到元数据编辑视图', async () => {
    render(<App />)

    const firstThumbButton = screen.getByText('幻旅系列 001 #1').closest('button')
    expect(firstThumbButton).not.toBeNull()
    fireEvent.click(firstThumbButton as HTMLButtonElement)

    await waitFor(() => {
      expect(document.querySelector('.metadata-image-real')).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))

    await waitFor(() => {
      expect(document.querySelector('.metadata-image-real')).toBeNull()
      expect(screen.getByRole('group', { name: '图包评分' })).toBeInTheDocument()
    })
  })

  it('元数据评分支持清空到空星，并可继续点击设星', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))

    const ratingGroup = screen.getByRole('group', { name: '图包评分' })
    const readStars = () => within(ratingGroup).getAllByRole('button').map((button) => button.textContent)

    fireEvent.click(screen.getByRole('button', { name: '图包评分 2 星' }))
    expect(readStars()).toEqual(['×', '★', '★', '☆', '☆', '☆'])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '图包评分 2 星' })).not.toBeDisabled()
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: '清空评分' }), { button: 0 })
    expect(readStars()).toEqual(['×', '☆', '☆', '☆', '☆', '☆'])
  })

  it('图片模式只读元数据评分可用并可写入', async () => {
    const writePackageGradeSpy = vi.spyOn(MockMediaRepository.prototype, 'writePackageGradeSync')
    render(<App />)

    const ratingGroup = screen.getByRole('group', { name: '图包评分' })
    const ratingThreeStar = within(ratingGroup).getByRole('button', { name: '图包评分 3 星' }) as HTMLButtonElement
    expect(ratingThreeStar.disabled).toBe(false)

    fireEvent.click(ratingThreeStar)
    expect(writePackageGradeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        grade: 3,
      }),
    )

    await waitFor(() => {
      expect(ratingThreeStar.disabled).toBe(false)
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: '清空评分' }), { button: 0 })
    expect(writePackageGradeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        grade: null,
      }),
    )
  })

  it('视频模式元数据默认只读，包含评分与操作区及底部状态区', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.click(screen.getByRole('button', { name: '视频信息' }))

    expect(screen.getByLabelText('文件名')).toBeInTheDocument()
    expect(screen.getByLabelText('作品名')).toBeInTheDocument()
    expect(screen.getByLabelText('社团')).toBeInTheDocument()
    expect(screen.getByLabelText('作者')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '视频评分' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '视频评分 无评分' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
    expect(screen.queryByRole('button', { name: '同步文件名到作品名' })).toBeNull()
    expect(document.querySelector('.metadata-video-stats')).not.toBeNull()
  })

  it('视频信息字段回车会触发 writeVideoMetadata 调用', () => {
    const writeVideoMetadataSpy = vi.spyOn(MockMediaRepository.prototype, 'writeVideoMetadataSync')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))
    fireEvent.click(screen.getByRole('button', { name: '视频信息' }))

    const workTitleInput = screen.getByLabelText('作品名') as HTMLInputElement
    fireEvent.change(workTitleInput, { target: { value: '新的视频作品名' } })
    fireEvent.keyDown(workTitleInput, { key: 'Enter', code: 'Enter' })

    expect(writeVideoMetadataSpy).toHaveBeenCalled()
    expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        work_title: '新的视频作品名',
      }),
    )
  })

  it('视频评分可点击并写入 grade', () => {
    const writeVideoMetadataSpy = vi.spyOn(MockMediaRepository.prototype, 'writeVideoMetadataSync')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))
    fireEvent.click(screen.getByRole('button', { name: '视频信息' }))
    fireEvent.click(screen.getByRole('button', { name: '视频评分 5 星' }))

    expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        grade: 5,
      }),
    )
  })

  it('默认只读元数据点击社团可静默触发检索并通过返回按钮清空', () => {
    render(<App />)

    const circleLabel = screen.getByText('社团').closest('label') as HTMLElement
    const circleChip = within(circleLabel).getByRole('button') as HTMLButtonElement
    fireEvent.click(circleChip)

    expect(screen.queryByRole('group', { name: 'search-mode-switch' })).toBeNull()
    expect(screen.getByRole('button', { name: '检索结果' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '设为根' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(screen.queryByRole('button', { name: '检索结果' })).toBeNull()
    expect(screen.queryByRole('button', { name: '返回' })).toBeNull()
    expect(screen.getByRole('button', { name: '设为根' })).toBeInTheDocument()
  })

  it('视频模式只读元数据点击社团可静默触发检索并通过返回按钮清空', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))

    const circleLabel = screen.getByText('社团').closest('label') as HTMLElement
    const circleChip = within(circleLabel).getByRole('button') as HTMLButtonElement
    fireEvent.click(circleChip)

    expect(screen.queryByRole('group', { name: 'search-mode-switch' })).toBeNull()
    expect(screen.getByRole('button', { name: '检索结果' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '设为根' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(screen.queryByRole('button', { name: '检索结果' })).toBeNull()
    expect(screen.queryByRole('button', { name: '返回' })).toBeNull()
    expect(screen.getByRole('button', { name: '设为根' })).toBeInTheDocument()
  })

  it('元数据管理支持按字段回车批量写入，不覆盖未提交字段', async () => {
    const writePackageMetadataSpy = vi.spyOn(MockMediaRepository.prototype, 'writePackageMetadataSync')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-row.is-manage .sidebar-label').length).toBeGreaterThan(0)
    })

    fireEvent.click(document.querySelector('.sidebar-row.is-manage .sidebar-label') as HTMLButtonElement)
    const circleInput = screen.getByLabelText('英文社团名') as HTMLInputElement
    fireEvent.change(circleInput, { target: { value: '批量社团更名' } })
    fireEvent.keyDown(circleInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(writePackageMetadataSpy).toHaveBeenCalled()
    })

    const payloads = writePackageMetadataSpy.mock.calls.map((call) => call[0])
    expect(payloads.every((payload) => payload.circle === '批量社团更名')).toBe(true)
    expect(new Set(payloads.map((payload) => payload.package_id)).size).toBeGreaterThan(1)
    expect(new Set(payloads.map((payload) => payload.author)).size).toBeGreaterThan(1)
  })

  it('元数据管理面板已移除自动标签与嵌入按钮，仅保留同步名称', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '元数据管理' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '同步名称' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: '自动生成标签' })).toBeNull()
    expect(screen.queryByRole('button', { name: '视觉模型生成标签' })).toBeNull()
    expect(screen.queryByRole('button', { name: '生成嵌入向量' })).toBeNull()
  })

  it('方向键右键在无 focus 时可建立并切换图片 focus', () => {
    render(<App />)

    expect(screen.queryByText(/archive_001\.zip #1/)).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })

    expect(screen.getByText(/archive_001\.zip #2/)).toBeInTheDocument()
  })

  it('快捷键支持将滚轮下绑定为下一张图片', () => {
    const current = useUiStore.getState().shortcuts
    useUiStore.setState({
      shortcuts: {
        ...current,
        imageNext: 'WheelDown',
      },
    })

    render(<App />)

    expect(screen.queryByText(/archive_001\.zip #1/)).not.toBeInTheDocument()
    fireEvent.wheel(window, { deltaY: 80 })
    expect(screen.getByText(/archive_001\.zip #2/)).toBeInTheDocument()
  })

  it('鼠标点击与键盘方向键共享 focus，Esc 可清空 focus', () => {
    render(<App />)

    expect(screen.getByLabelText('图包名')).toBeInTheDocument()

    const firstThumbButton = screen.getByText('幻旅系列 001 #1').closest('button')
    expect(firstThumbButton).not.toBeNull()
    fireEvent.click(firstThumbButton as HTMLButtonElement)

    expect(screen.queryByLabelText('图包名')).not.toBeInTheDocument()
    expect(screen.getByText(/archive_001\.zip #1/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    expect(screen.getByText(/archive_001\.zip #2/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByText(/archive_001\.zip #/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('图包名')).toBeInTheDocument()
  })

  it('方向键上下按网格移动，到边界时钳制到首末项', () => {
    render(<App />)

    const readFocusedOrdinal = () => {
      const line = screen.getByText(/archive_001\.zip #\d+/).textContent ?? ''
      const matched = line.match(/#(\d+)/)
      return Number(matched?.[1] ?? 0)
    }

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    const afterRight = readFocusedOrdinal()
    expect(afterRight).toBe(2)

    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' })
    const afterDown = readFocusedOrdinal()
    expect(afterDown).toBeGreaterThan(afterRight)

    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
    const afterUp = readFocusedOrdinal()
    expect(afterUp).toBe(afterRight)

    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
    const afterSecondUp = readFocusedOrdinal()
    expect(afterSecondUp).toBe(1)
  })

  it('纯文件名模式为滚动列表且不显示分页控件', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /切换到纯文件名模式/ }))

    expect(screen.getByText('文件名')).toBeInTheDocument()
    expect(screen.getByText(/img_0001\.jpg/)).toBeInTheDocument()
    expect(screen.queryByText(/第\s+\d+\s+\/\s+\d+\s+页/)).not.toBeInTheDocument()
  })

  it('Main 工具栏使用图标按钮，退出全屏会自动关闭自动播放，且不显示加载中文案', async () => {
    render(<App />)

    const toolbarIconButtons = document.querySelectorAll('.toolbar-actions .toolbar-icon-btn')
    expect(toolbarIconButtons.length).toBe(2)
    expect(screen.queryByRole('button', { name: '纯文件名模式' })).not.toBeInTheDocument()
    expect(toolbarIconButtons[0]?.textContent).toContain('▦')

    fireEvent.click(screen.getByRole('button', { name: /切换到纯文件名模式/ }))
    expect(toolbarIconButtons[0]?.textContent).toContain('≡')

    fireEvent.click(screen.getByRole('button', { name: /切换到缩略图模式/ }))
    expect(toolbarIconButtons[0]?.textContent).toContain('▦')

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument()

    const autoplayToggle = screen.getByRole('checkbox', { name: '自动播放' }) as HTMLInputElement
    fireEvent.click(autoplayToggle)
    expect(autoplayToggle.checked).toBe(true)

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    await waitFor(() => {
      expect(document.querySelector('.fullscreen-layer')).not.toBeNull()
    })
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    await waitFor(() => {
      expect(document.querySelector('.fullscreen-layer')).toBeNull()
      expect((screen.getByRole('checkbox', { name: '自动播放' }) as HTMLInputElement).checked).toBe(false)
    })
  })

  it('视频播放后暂停保留当前画面，切换视频后回到封面态，Save as cover 走后端写链路并保持封面态', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument()
    expect(screen.queryByText(/封面态（待播放）/)).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'teaser_forest.mp4' })[0])
    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument()
    expect(screen.getByText(/封面态（待播放）/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save as cover' }))

    await waitFor(() => {
      expect(screen.getByText(/封面态（待播放）/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument()
    })

    const speedSlider = screen.getByRole('slider', { name: '倍速滑条' })
    fireEvent.change(speedSlider, { target: { value: '2.5' } })
    expect(screen.getByText('倍率 x2.50')).toBeInTheDocument()
  })

  it('全屏默认按当前模式进入单显示，双显示切回单显示时恢复入口模式', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(screen.getByAltText('图片 #2')).toBeInTheDocument()
    expect(screen.queryByLabelText('调整全屏分屏比例')).not.toBeInTheDocument()

    const fullscreenLayer = document.querySelector('.fullscreen-layer') as HTMLElement | null
    expect(fullscreenLayer).not.toBeNull()
    fireEvent.mouseMove(fullscreenLayer as Element, { clientY: window.innerHeight - 4 })
    fireEvent.click(screen.getByRole('button', { name: '双显示' }))
    expect(screen.getByLabelText('调整全屏分屏比例')).toBeInTheDocument()
    expect(screen.getByText(/焦点：图片/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Tab', code: 'Tab' })
    expect(screen.getByText(/焦点：视频/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '单显示' }))
    expect(screen.queryByLabelText('调整全屏分屏比例')).not.toBeInTheDocument()
    expect(screen.getByAltText('图片 #2')).toBeInTheDocument()
    expect(screen.queryByText(/封面态（待播放）/)).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(screen.queryByAltText('图片 #2')).not.toBeInTheDocument()
  })

  it('全屏图片支持首末跳转、跨包翻页与上个包下个包按钮', () => {
    render(<App />)

    const readToolbarTitle = () => document.querySelector('.main-toolbar strong')?.textContent ?? ''
    const readFullscreenImageAlt = () =>
      (document.querySelector('.fullscreen-media-image-element') as HTMLImageElement | null)?.getAttribute('alt') ?? ''

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })

    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' })
    expect(readFullscreenImageAlt()).toBe('图片 #36')

    const titleBeforeCross = readToolbarTitle()
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    expect(readFullscreenImageAlt()).toBe('图片 #1')
    expect(readToolbarTitle()).not.toBe(titleBeforeCross)

    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
    expect(readFullscreenImageAlt()).toBe('图片 #1')

    const titleBeforeCtrlPackage = readToolbarTitle()
    fireEvent.keyDown(window, { key: 'ArrowLeft', code: 'ArrowLeft', ctrlKey: true })
    expect(readToolbarTitle()).not.toBe(titleBeforeCtrlPackage)

    const fullscreenLayer = document.querySelector('.fullscreen-layer')
    expect(fullscreenLayer).not.toBeNull()
    fireEvent.mouseMove(fullscreenLayer as Element, { clientY: window.innerHeight - 4 })

    const speedSelect = screen.getByLabelText('全屏自动播放速度')
    fireEvent.focus(speedSelect)
    const titleBeforeCtrlWhenSelectFocused = readToolbarTitle()
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight', ctrlKey: true })
    expect(readToolbarTitle()).not.toBe(titleBeforeCtrlWhenSelectFocused)

    const titleBeforeFooterPackage = readToolbarTitle()
    fireEvent.click(screen.getByRole('button', { name: '下个包' }))
    expect(readToolbarTitle()).not.toBe(titleBeforeFooterPackage)
  })

  it('全屏模式支持鼠标滚轮上下翻页', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })

    const fullscreenImagePane = document.querySelector('.fullscreen-image') as HTMLElement | null
    expect(fullscreenImagePane).not.toBeNull()

    const readFullscreenImageAlt = () =>
      (document.querySelector('.fullscreen-media-image-element') as HTMLImageElement | null)?.getAttribute('alt') ?? ''

    const imageBeforeWheelDown = readFullscreenImageAlt()
    fireEvent.wheel(fullscreenImagePane as HTMLElement, { deltaY: 120 })
    const imageAfterWheelDown = readFullscreenImageAlt()
    expect(imageAfterWheelDown).not.toBe(imageBeforeWheelDown)

    fireEvent.wheel(fullscreenImagePane as HTMLElement, { deltaY: -120 })
    expect(readFullscreenImageAlt()).toBe(imageBeforeWheelDown)
  })

  it('视频模式单视频时将控件并入底部 footer，双显示时保留悬浮控件自适应', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })

    expect(screen.getAllByText(/封面态（待播放）/).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('调整全屏分屏比例')).not.toBeInTheDocument()

    const fullscreenLayer = document.querySelector('.fullscreen-layer')
    expect(fullscreenLayer).not.toBeNull()
    fireEvent.mouseMove(fullscreenLayer as Element, { clientY: window.innerHeight - 4 })

    const fullscreenFooter = document.querySelector('.fullscreen-footer') as HTMLElement | null
    expect(fullscreenFooter).not.toBeNull()
    const footerVideoControls = fullscreenFooter?.querySelector('.fullscreen-footer-video-controls') as HTMLElement | null
    expect(footerVideoControls).not.toBeNull()
    expect(fullscreenFooter?.firstElementChild?.classList.contains('fullscreen-footer-video-controls')).toBe(true)
    expect(screen.getByLabelText('全屏视频进度滑条')).toBeInTheDocument()
    expect(document.querySelector('.fullscreen-stage .fullscreen-video-controls')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '双显示' }))

    const videoPane = document.querySelector('.fullscreen-video')
    expect(videoPane).not.toBeNull()
    fireEvent.mouseEnter(videoPane as Element)

    expect(document.querySelector('.fullscreen-stage .fullscreen-video-controls')).not.toBeNull()
    const rowsDefault = Array.from(document.querySelectorAll('.fullscreen-video-controls-row'))
    expect(rowsDefault[0]?.classList.contains('is-progress')).toBe(true)

    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', altKey: true })
    const rowsBottomAlign = Array.from(document.querySelectorAll('.fullscreen-video-controls-row'))
    expect(rowsBottomAlign[0]?.classList.contains('is-controls')).toBe(true)

    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true })
    const rowsTopAlign = Array.from(document.querySelectorAll('.fullscreen-video-controls-row'))
    expect(rowsTopAlign[0]?.classList.contains('is-progress')).toBe(true)

    const dualVideoStage = document.querySelector('.fullscreen-video .fullscreen-stage')
    const dualVideoMedia = document.querySelector('.fullscreen-video .fullscreen-media-video') as HTMLElement
    const dualImageStage = document.querySelector('.fullscreen-image .fullscreen-stage')
    expect(dualVideoStage?.classList.contains('is-draggable')).toBe(true)
    expect(dualImageStage?.classList.contains('is-draggable')).toBe(false)

    const transformBeforeDrag = dualVideoMedia.style.transform
    fireEvent.mouseDown(dualVideoStage as Element, { button: 0, clientX: 120, clientY: 60 })
    expect(dualVideoStage?.classList.contains('is-dragging')).toBe(true)
    fireEvent.mouseMove(window, { clientX: 120, clientY: 120 })
    fireEvent.mouseUp(window)
    expect(dualVideoStage?.classList.contains('is-dragging')).toBe(false)

    const transformAfterDrag = dualVideoMedia.style.transform
    expect(transformAfterDrag).not.toBe(transformBeforeDrag)
    const yOffset = transformAfterDrag.match(/translate3d\([^,]+,\s*([-\d.]+)px,\s*0\)/)?.[1]
    expect(Number(yOffset ?? '0')).not.toBe(0)
  })

  it('设置面板按 side/main 分栏并包含界面设置聚合与快捷键鼠标录入', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    const settingsPanel = document.querySelector('.settings-panel') as HTMLElement | null
    expect(settingsPanel).not.toBeNull()

    expect(screen.getByRole('button', { name: '界面设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AI模型设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '快捷键设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3D 设置' })).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: '缩略图设置' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'theme 设置' })).toBeNull()

    expect(screen.getByText('主题设置')).toBeInTheDocument()
    expect(screen.getByText('缩略图设置')).toBeInTheDocument()
    expect(screen.getByText('布局参数')).toBeInTheDocument()

    const styleSelect = screen.getByRole('combobox', { name: 'Style' }) as HTMLSelectElement
    const paletteSelect = screen.getByRole('combobox', { name: 'Palette' }) as HTMLSelectElement
    expect(styleSelect.value.length).toBeGreaterThan(0)
    expect(Array.from(styleSelect.options).some((option) => option.value === styleSelect.value)).toBe(true)
    expect(paletteSelect.value.length).toBeGreaterThan(0)
    expect(Array.from(paletteSelect.options).some((option) => option.value === paletteSelect.value)).toBe(true)

    expect(screen.getByLabelText(/缩略图间距系数/)).toBeInTheDocument()
    expect(screen.getByLabelText('缩略图质量')).toBeInTheDocument()
    expect(screen.getByLabelText('缩略图宽度')).toBeInTheDocument()

    const settingsFontSlider = screen.getByLabelText(/设置面板字体系数/)
    const fontSizeBefore = settingsPanel?.style.fontSize
    fireEvent.change(settingsFontSlider, { target: { value: '1.2' } })
    expect(settingsPanel?.style.fontSize).not.toBe(fontSizeBefore)

    fireEvent.click(screen.getByRole('button', { name: 'AI模型设置' }))
    expect(screen.getByLabelText('视觉模型端口')).toBeInTheDocument()
    expect(screen.getByLabelText('视觉模型ID')).toBeInTheDocument()
    expect(screen.queryByLabelText('LM Studio Endpoint')).toBeNull()
    expect(screen.queryByRole('button', { name: '选择ONNX文件' })).toBeNull()
    expect(screen.queryByRole('button', { name: '选择CSV文件' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '数据库设置' }))
    expect(screen.getByText('数据库目录设置')).toBeInTheDocument()
    expect(screen.getByLabelText('SQL 库路径')).toBeInTheDocument()
    expect(screen.getByLabelText('缩略图目录')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择SQL目录' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择缩略图目录' })).toBeInTheDocument()
    expect(screen.queryByText('向量数据管理')).toBeNull()
    expect(screen.queryByRole('button', { name: '选择向量目录' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '3D 设置' }))
    expect(screen.getByText('向量宇宙：前进')).toBeInTheDocument()

    const moveSpeedSlider = screen.getByLabelText(/移动速度/)
    fireEvent.change(moveSpeedSlider, { target: { value: '30' } })
    expect(screen.getByText(/移动速度 30\.0/)).toBeInTheDocument()

    const dispersionSlider = screen.getByLabelText(/宇宙离散度/)
    fireEvent.change(dispersionSlider, { target: { value: '1.5' } })
    expect(screen.getByText(/宇宙离散度 1\.50/)).toBeInTheDocument()

    const widgetSizeSlider = screen.getByLabelText(/位置控件大小/)
    fireEvent.change(widgetSizeSlider, { target: { value: '240' } })
    expect(screen.getByText(/位置控件大小 240px/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '快捷键设置' }))
    expect(screen.getByText('全屏：上对齐')).toBeInTheDocument()
    expect(screen.getByText('全屏：下对齐')).toBeInTheDocument()
    expect(screen.getByText('全屏：左对齐')).toBeInTheDocument()
    expect(screen.getByText('全屏：右对齐')).toBeInTheDocument()

    const alignUpRow = screen.getByText('全屏：上对齐').closest('.shortcut-row') as HTMLElement
    expect(alignUpRow).not.toBeNull()
    const alignUpBindingButton = alignUpRow.querySelector('button') as HTMLButtonElement
    fireEvent.click(alignUpBindingButton)
    const shortcutEditDialog = screen.getByRole('dialog', { name: '快捷键编辑' })
    expect(shortcutEditDialog).toBeInTheDocument()
    expect(within(shortcutEditDialog).getByRole('button', { name: '新增' })).toBeInTheDocument()
    fireEvent.click(within(shortcutEditDialog).getByRole('button', { name: '清除' }))
    expect(screen.getByText('当前未设置快捷键。')).toBeInTheDocument()
    fireEvent.click(within(shortcutEditDialog).getByRole('button', { name: '新增' }))
    const captureDialog = screen.getByRole('dialog', { name: '录入快捷键' })
    fireEvent.click(within(captureDialog).getByRole('button', { name: '鼠标右键' }))
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }))
    fireEvent.click(within(shortcutEditDialog).getByRole('button', { name: '新增' }))
    const wheelCaptureDialog = screen.getByRole('dialog', { name: '录入快捷键' })
    fireEvent.click(within(wheelCaptureDialog).getByRole('button', { name: '滚轮下' }))
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }))
    fireEvent.click(within(shortcutEditDialog).getByRole('button', { name: '关闭' }))
    expect(alignUpBindingButton.textContent).toContain('MouseRight')
    expect(alignUpBindingButton.textContent).toContain('WheelDown')
  }, 15_000)

  it('数据库目录选择器可触发 SQL 与缩略图目录选择', async () => {
    const pickDirectoryPathSpy = vi.spyOn(MockMediaRepository.prototype, 'pickDirectoryPathSync')

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '数据库设置' }))
    fireEvent.click(screen.getByRole('button', { name: '选择SQL目录' }))
    fireEvent.click(screen.getByRole('button', { name: '选择缩略图目录' }))

    await waitFor(() => {
      expect(pickDirectoryPathSpy).toHaveBeenCalledTimes(2)
    })
  })

  it('数据库目录设置会调用后端路径持久化并显示反馈', async () => {
    const pickDirectoryPathSpy = vi
      .spyOn(MockMediaRepository.prototype, 'pickDirectoryPathSync')
      .mockImplementation((request) => ({
        canceled: false,
        path: request.title?.includes('SQL') ? 'D:/media-db' : 'D:/media-thumb-cache',
      }))

    const setRuntimeStoragePaths = vi
      .fn()
      .mockResolvedValueOnce({
        database_path: 'D:/media-db/library.sqlite',
        thumbnail_cache_path: 'C:/legacy-thumb-cache',
        moved_database: true,
        updated_at_ms: Date.now(),
      })
      .mockResolvedValueOnce({
        database_path: 'D:/media-db/library.sqlite',
        thumbnail_cache_path: 'D:/media-thumb-cache',
        moved_database: false,
        updated_at_ms: Date.now(),
      })

    const readRuntimeInfo = vi.fn().mockResolvedValue({
      app_version: '0.0.0-test',
      is_packaged: false,
      platform: 'win32',
      arch: 'x64',
      user_data_path: 'C:/Users/test/AppData/Roaming/MediaPlayerX',
      library_root: 'C:/Users/test/Pictures/MediaPlayerXLibrary',
      database_path: 'D:/media-db/library.sqlite',
      thumbnail_cache_path: 'D:/media-thumb-cache',
    })

    render(<App />)

    window.mediaPlayerBackend = {
      setRuntimeStoragePaths,
      readRuntimeInfo,
    } as any

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '数据库设置' }))

    fireEvent.click(screen.getByRole('button', { name: '选择SQL目录' }))
    await waitFor(() => {
      expect(setRuntimeStoragePaths).toHaveBeenCalledWith({ database_dir: 'D:/media-db' })
    })

    fireEvent.click(screen.getByRole('button', { name: '选择缩略图目录' }))
    await waitFor(() => {
      expect(setRuntimeStoragePaths).toHaveBeenCalledWith({ thumbnail_cache_dir: 'D:/media-thumb-cache' })
    })

    expect(pickDirectoryPathSpy).toHaveBeenCalledTimes(2)
    await waitFor(() => {
      expect(screen.getByText(/目录已保存/)).toBeInTheDocument()
    })
  })

  it('AI模型保存会持久化测试通过状态', async () => {
    const writeAppStateSpy = vi.spyOn(MockMediaRepository.prototype, 'writeAppState')

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: 'AI模型设置' }))

    act(() => {
      useUiStore.getState().updateSettings({
        adReviewVisionModel: 'mock-vision-model',
        adReviewVisionVerified: true,
      })
    })

    fireEvent.click(screen.getByRole('button', { name: '保存视觉模型配置' }))
    await waitFor(() => {
      expect(screen.getByText('视觉模型配置已保存')).toBeInTheDocument()
    })

    const hasPersistedVerifiedTrue = writeAppStateSpy.mock.calls.some(([request]) => {
      try {
        const parsed = JSON.parse(request.state_json) as Record<string, unknown>
        return parsed.adReviewVisionVerified === true
      } catch {
        return false
      }
    })
    expect(hasPersistedVerifiedTrue).toBe(true)
  })

  const openVectorUniverseAndWaitReady = async () => {
    fireEvent.click(screen.getByRole('button', { name: '向量宇宙' }))
    await waitFor(
      () => {
        expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '关闭向量宇宙' })).toBeInTheDocument()
      },
      { timeout: 8_000 },
    )
  }

  it('Header 显示向量宇宙按钮并可打开关闭 3D 层', async () => {
    render(<App />)

    await openVectorUniverseAndWaitReady()

    fireEvent.click(screen.getByRole('button', { name: '关闭向量宇宙' }))
    expect(screen.queryByRole('dialog', { name: '向量宇宙层' })).not.toBeInTheDocument()
  })

  it('向量宇宙层支持 Esc 二次确认退出', async () => {
    render(<App />)

    await openVectorUniverseAndWaitReady()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.getByText('再按一次 Esc 退出向量宇宙')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '向量宇宙层' })).not.toBeInTheDocument()
  })

  it('无 focus 时向量宇宙层显示提示并保留 LOD 层级标识', async () => {
    render(<App />)

    await openVectorUniverseAndWaitReady()

    expect(screen.getByText('请先在主视图选中图片')).toBeInTheDocument()
    expect(screen.getByLabelText('世界坐标辅助')).toBeInTheDocument()
    expect(screen.getByTestId('vector-universe-position')).toBeInTheDocument()
    expect(screen.getByTestId('vector-universe-front-hit')).toHaveTextContent('无命中')
    expect(screen.getByTestId('vector-universe-lod-level')).toBeInTheDocument()
    expect(Number(screen.getByTestId('vector-universe-scope-count').textContent ?? '0')).toBeGreaterThan(0)
    expect(screen.getByRole('group', { name: 'LOD 层级标识' })).toBeInTheDocument()
    expect(screen.getByTestId('vector-universe-lod-far')).toBeInTheDocument()
    expect(screen.getByTestId('vector-universe-lod-mid')).toBeInTheDocument()
    expect(screen.getByTestId('vector-universe-lod-near')).toBeInTheDocument()
  })

  it('向量宇宙层打开期间不吞掉关闭后的既有快捷键行为', async () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    await openVectorUniverseAndWaitReady()

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(document.querySelector('.fullscreen-layer')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '关闭向量宇宙' }))

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(document.querySelector('.fullscreen-layer')).not.toBeNull()
  })

  it('向量宇宙层在无命中时按 Space 不会误退出', async () => {
    render(<App />)

    await openVectorUniverseAndWaitReady()

    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
    expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
  })

  it('向量宇宙层支持 F1 折叠 HUD 为单行信息', async () => {
    render(<App />)

    await openVectorUniverseAndWaitReady()
    expect(screen.queryByTestId('vector-universe-hud-compact')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'LOD 层级标识' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'F1', code: 'F1' })
    expect(screen.getByTestId('vector-universe-hud-compact')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'LOD 层级标识' })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'F1', code: 'F1' })
    expect(screen.queryByTestId('vector-universe-hud-compact')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'LOD 层级标识' })).toBeInTheDocument()
  })
})
