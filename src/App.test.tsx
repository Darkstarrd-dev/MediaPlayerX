import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { MockMediaRepository } from './features/backend/repository/mockRepository'
import { resetUiStoreState } from './store/useUiStore'

describe('MediaPlayer 虚拟 UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetUiStoreState()
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
    expect(screen.getByRole('group', { name: 'search-mode-switch' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '管理' }))
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'search-mode-switch' })).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: '管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-manage-checker').length).toBeGreaterThan(0)
    })

    const firstSidebarChecker = document.querySelector('.sidebar-manage-checker') as HTMLInputElement | null
    expect(firstSidebarChecker).not.toBeNull()
    fireEvent.click(firstSidebarChecker as HTMLInputElement)

    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.getByRole('dialog', { name: '永久删除确认' })).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: '确定删除' }) as HTMLButtonElement
    expect(confirmButton.disabled).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: '我了解此操作将永久不可逆地删除选中数据' }))
    expect(confirmButton.disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog', { name: '永久删除确认' })).not.toBeInTheDocument()
  })

  it('管理模式下 Sidebar 与主视图 checker 互斥，且视频模式可进入管理', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-manage-checker').length).toBeGreaterThan(0)
      expect(document.querySelectorAll('.manage-image-checker').length).toBeGreaterThan(0)
    })

    fireEvent.click(document.querySelector('.sidebar-manage-checker') as HTMLInputElement)
    expect((document.querySelector('.sidebar-manage-checker') as HTMLInputElement).checked).toBe(true)

    fireEvent.click(document.querySelector('.manage-image-checker') as HTMLInputElement)
    expect((document.querySelector('.manage-image-checker') as HTMLInputElement).checked).toBe(true)
    expect((document.querySelector('.sidebar-manage-checker') as HTMLInputElement).checked).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '隐藏' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消隐藏' })).toBeDisabled()
  })

  it('管理模式下点击缩略图即可切换 checker 状态', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '管理' }))

    await waitFor(() => {
      expect(document.querySelector('.thumb-card-main')).not.toBeNull()
    })

    const checker = document.querySelector('.manage-image-checker') as HTMLInputElement | null
    const thumbCardMain = document.querySelector('.thumb-card-main') as HTMLButtonElement | null
    expect(checker).not.toBeNull()
    expect(thumbCardMain).not.toBeNull()

    fireEvent.mouseDown(thumbCardMain as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    expect((checker as HTMLInputElement).checked).toBe(true)

    fireEvent.mouseDown(thumbCardMain as HTMLButtonElement, { button: 0 })
    fireEvent.mouseUp(window)
    expect((checker as HTMLInputElement).checked).toBe(false)
  })

  it('管理模式在紧凑窗口下保持稳定：无最大更新深度报错、无折叠按钮、缩略图容器不可滚动', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '管理' }))

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

    fireEvent.click(screen.getByRole('button', { name: '管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.manage-image-checker').length).toBeGreaterThan(0)
    })

    fireEvent.click(document.querySelector('.manage-image-checker') as HTMLInputElement)
    fireEvent.click(screen.getByRole('button', { name: '隐藏' }))

    await waitFor(() => {
      expect(screen.getByText('隐藏完成：1 项')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '管理' }))

    await waitFor(() => {
      expect(screen.queryByText('幻旅系列 001 #1')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '管理' }))

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

    fireEvent.click(screen.getByRole('button', { name: '管理' }))

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

  it('管理异常显示在管理容器中并支持清除，不占用顶部异常横幅', async () => {
    vi.spyOn(MockMediaRepository.prototype, 'deleteSidebarNodesSync').mockImplementation(() => {
      throw new Error('manage-delete-failed')
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-manage-checker').length).toBeGreaterThan(0)
    })
    fireEvent.click(document.querySelector('.sidebar-manage-checker') as HTMLInputElement)

    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '我了解此操作将永久不可逆地删除选中数据' }))
    fireEvent.click(screen.getByRole('button', { name: '确定删除' }))

    await waitFor(() => {
      expect(screen.getByText(/管理操作: manage-delete-failed/)).toBeInTheDocument()
    })

    expect(document.querySelector('.backend-error-banner')).toBeNull()

    const manageErrorList = document.querySelector('.manage-error-list') as HTMLElement | null
    expect(manageErrorList).not.toBeNull()
    fireEvent.click(within(manageErrorList as HTMLElement).getByRole('button', { name: '清除' }))

    await waitFor(() => {
      expect(screen.queryByText(/管理操作: manage-delete-failed/)).not.toBeInTheDocument()
    })
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
    fireEvent.click(screen.getByRole('button', { name: '管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.sidebar-manage-checker').length).toBeGreaterThan(0)
    })

    fireEvent.click(document.querySelector('.sidebar-manage-checker') as HTMLInputElement)
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
    fireEvent.click(screen.getByRole('button', { name: '管理' }))

    await waitFor(() => {
      expect(document.querySelectorAll('.manage-image-checker').length).toBeGreaterThan(0)
    })

    fireEvent.click(document.querySelector('.manage-image-checker') as HTMLInputElement)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '我了解此操作将永久不可逆地删除选中数据' }))
    fireEvent.click(screen.getByRole('button', { name: '确定删除' }))

    await waitFor(() => {
      expect(screen.getByText('已删除 1 张，失败 1 项')).toBeInTheDocument()
    })

    expect(screen.queryByText(/管理操作:/)).not.toBeInTheDocument()
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

  it('检索面板支持向量/特征检索切换、分割条拖拽与检索模式下 Sidebar 只读联动', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '检索' }))
    const searchModeSwitch = screen.getByRole('group', { name: 'search-mode-switch' })
    expect(within(searchModeSwitch).getByRole('button', { name: '向量检索' })).toBeInTheDocument()
    expect(within(searchModeSwitch).getByRole('button', { name: '特征检索' })).toBeInTheDocument()
    expect(screen.getByText('当前结果: 0 张')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '折叠' }))
    expect(screen.queryByRole('group', { name: 'search-mode-switch' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开检索容器' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '展开检索容器' }))
    const searchModeSwitchAfterExpand = screen.getByRole('group', { name: 'search-mode-switch' })
    expect(searchModeSwitchAfterExpand).toBeInTheDocument()

    fireEvent.click(within(searchModeSwitchAfterExpand).getByRole('button', { name: '特征检索' }))
    const featureControls = document.querySelector('.feature-controls') as HTMLElement | null
    expect(featureControls).not.toBeNull()
    const featureScope = within(featureControls as HTMLElement)
    expect(featureScope.getByLabelText('名称')).toBeInTheDocument()
    expect(featureScope.getByLabelText('作品名')).toBeInTheDocument()
    expect(featureScope.getByLabelText('社团')).toBeInTheDocument()
    expect(featureScope.getByLabelText('作者')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择 tags' })).toBeInTheDocument()
    const featureRatingGroup = screen.getByRole('group', { name: '图包评分筛选' })
    expect(featureRatingGroup).toBeInTheDocument()
    expect(within(featureRatingGroup).getByRole('button', { name: '图包评分 无评分' })).toBeInTheDocument()

    fireEvent.change(featureScope.getByLabelText('名称'), { target: { value: '002' } })
    fireEvent.change(featureScope.getByLabelText('作者'), { target: { value: 'Nori' } })
    fireEvent.click(screen.getByRole('button', { name: '选择 tags' }))
    fireEvent.click(screen.getByRole('button', { name: 'fog' }))

    fireEvent.click(screen.getByRole('button', { name: '图包评分 3 分' }))
    expect(screen.getByRole('button', { name: '图包评分 1 分' }).classList.contains('is-active')).toBe(true)
    expect(screen.getByRole('button', { name: '图包评分 4 分' }).classList.contains('is-active')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '图包评分 3 分' }))

    expect(screen.getByText(/archive_002\.zip/)).toBeInTheDocument()
    expect(screen.queryByText(/archive_001\.zip/)).not.toBeInTheDocument()

    fireEvent.click(within(searchModeSwitchAfterExpand).getByRole('button', { name: '向量检索' }))

    const workspace = document.querySelector('.workspace') as HTMLElement | null
    expect(workspace).not.toBeNull()
    vi.spyOn(workspace as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 1200,
      height: 900,
      top: 0,
      left: 0,
      right: 1200,
      bottom: 900,
      toJSON: () => ({}),
    })

    const vectorPanel = document.querySelector('.vector-panel') as HTMLElement | null
    expect(vectorPanel).not.toBeNull()
    const vectorHeightBefore = vectorPanel!.style.height
    const vectorSplitter = screen.getByRole('separator', { name: '调整检索容器高度' })
    fireEvent.mouseDown(vectorSplitter, { clientY: 164 })
    fireEvent.mouseMove(window, { clientY: 260 })
    fireEvent.mouseUp(window)
    expect(vectorPanel!.style.height).not.toBe(vectorHeightBefore)

    const firstThumbButton = document.querySelector('.thumb-card') as HTMLButtonElement | null
    expect(firstThumbButton).not.toBeNull()
    fireEvent.click(firstThumbButton as HTMLButtonElement)

    const vectorSearchAction = document.querySelector('.vector-controls button') as HTMLButtonElement | null
    expect(vectorSearchAction).not.toBeNull()
    fireEvent.click(vectorSearchAction as HTMLButtonElement)

    const readResultCount = () => {
      const text = screen.getByText(/当前结果:/).textContent ?? ''
      const matched = text.match(/(\d+)/)
      return Number(matched?.[1] ?? '0')
    }

    expect(screen.getByText('向量结果视图')).toBeInTheDocument()
    expect(screen.getAllByText(/相似度 1\.00/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '检索结果' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '转到' })).toBeInTheDocument()
    expect(document.querySelector('.main-footer span')?.textContent ?? '').toContain('#')

    const countBeforeThresholdChange = readResultCount()
    const thresholdSlider = screen.getByRole('slider', { name: /相似度阈值/ })
    fireEvent.change(thresholdSlider, { target: { value: '0.95' } })
    expect(readResultCount()).toBe(countBeforeThresholdChange)

    fireEvent.click(vectorSearchAction as HTMLButtonElement)
    const countAfterSearch = readResultCount()
    expect(countAfterSearch).toBeLessThanOrEqual(countBeforeThresholdChange)

    fireEvent.click(screen.getByRole('button', { name: '向量宇宙' }))
    await waitFor(() => {
      expect(screen.getByTestId('vector-universe-scope-count')).toHaveTextContent(String(countAfterSearch))
      expect(screen.getByRole('button', { name: '关闭向量宇宙' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '关闭向量宇宙' }))

    const folderRows = Array.from(document.querySelectorAll<HTMLElement>('.sidebar-row[data-sidebar-node-id^="folder:"]'))
    expect(folderRows.length).toBeGreaterThan(0)
    for (const row of folderRows) {
      expect(row.querySelector('.sidebar-count')).toBeNull()
    }

    const sidebarTree = document.querySelector('.sidebar-tree') as HTMLElement | null
    expect(sidebarTree).not.toBeNull()
    const sidebarRows = Array.from(sidebarTree!.querySelectorAll<HTMLElement>('[data-sidebar-node-id]'))
    expect(sidebarRows.length).toBeGreaterThan(0)

    Object.defineProperty(sidebarTree!, 'clientHeight', { configurable: true, value: 36 })
    Object.defineProperty(sidebarTree!, 'scrollHeight', { configurable: true, value: sidebarRows.length * 28 })

    sidebarRows.forEach((row, index) => {
      Object.defineProperty(row, 'offsetTop', { configurable: true, value: index * 28 })
      Object.defineProperty(row, 'offsetHeight', { configurable: true, value: 28 })
    })

    sidebarTree!.scrollTop = 0
    for (let index = 0; index < 60; index += 1) {
      fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    }

    await waitFor(() => {
      expect(sidebarTree!.scrollTop).toBeGreaterThan(0)
    })

    fireEvent.keyDown(window, { key: 'Home', code: 'Home' })

    const readFocusedPath = () => document.querySelector('.main-footer span')?.textContent ?? ''
    const focusedBeforeSidebarClick = readFocusedPath()
    expect(focusedBeforeSidebarClick).toContain('#')

    const firstSidebarLabel = document.querySelector('.sidebar-tree .sidebar-label') as HTMLElement | null
    expect(firstSidebarLabel).not.toBeNull()
    fireEvent.click(firstSidebarLabel as HTMLElement)
    expect(readFocusedPath()).toBe(focusedBeforeSidebarClick)

    expect(document.querySelector('.sidebar.is-focus')).toBeNull()
    fireEvent.keyDown(window, { key: 'Tab', code: 'Tab' })
    expect(document.querySelector('.sidebar.is-focus')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '转到' }))
    expect(screen.queryByText('向量结果视图')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '转到' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '设为根' })).toBeInTheDocument()
  }, 15_000)

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

  it('元数据面板标题可折叠，并可恢复展开', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '元数据面板' }))
    expect(screen.getByRole('button', { name: '展开元数据面板' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '展开元数据面板' }))
    expect(screen.getByRole('button', { name: '元数据面板' })).toBeInTheDocument()
  })

  it('元数据评分支持清空到空星，并可继续点击设星', async () => {
    render(<App />)

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

  it('视频模式元数据包含评分与操作区，以及文件名/作品名/社团/作者/tags和底部状态区', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.click(screen.getByRole('button', { name: '视频信息' }))

    expect(screen.getByLabelText('文件名')).toBeInTheDocument()
    expect(screen.getByLabelText('作品名')).toBeInTheDocument()
    expect(screen.getByLabelText('社团')).toBeInTheDocument()
    expect(screen.getByLabelText('作者')).toBeInTheDocument()
    expect(screen.getByLabelText('Tags')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '视频评分' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '视频评分 无评分' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '同步文件名到作品名' })).toBeEnabled()
    expect(document.querySelector('.metadata-video-stats')).not.toBeNull()
  })

  it('点击视频信息区保存会触发 writeVideoMetadata 调用', () => {
    const writeVideoMetadataSpy = vi.spyOn(MockMediaRepository.prototype, 'writeVideoMetadataSync')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.click(screen.getByRole('button', { name: '视频信息' }))

    fireEvent.change(screen.getByLabelText('作品名'), { target: { value: '新的视频作品名' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

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
    fireEvent.click(screen.getByRole('button', { name: '视频信息' }))
    fireEvent.click(screen.getByRole('button', { name: '视频评分 5 星' }))

    expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        grade: 5,
      }),
    )
  })

  it('方向键右键在无 focus 时可建立并切换图片 focus', () => {
    render(<App />)

    expect(screen.queryByText(/archive_001\.zip #1/)).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })

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

  it('设置面板按 side/main 分栏并包含向量宇宙参数与全屏对齐快捷键配置', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    const settingsPanel = document.querySelector('.settings-panel') as HTMLElement | null
    expect(settingsPanel).not.toBeNull()

    expect(screen.getByRole('button', { name: '布局参数' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '模型参数' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '快捷键设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'theme 设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3D 设置' })).toBeInTheDocument()

    const settingsFontSlider = screen.getByLabelText(/设置面板字体系数/)
    const fontSizeBefore = settingsPanel?.style.fontSize
    fireEvent.change(settingsFontSlider, { target: { value: '1.2' } })
    expect(settingsPanel?.style.fontSize).not.toBe(fontSizeBefore)

    fireEvent.click(screen.getByRole('button', { name: 'theme 设置' }))
    expect(screen.getByText('主题方案')).toBeInTheDocument()
    const themeSelect = screen.getByRole('combobox', { name: '主题方案' }) as HTMLSelectElement
    expect(themeSelect.value.length).toBeGreaterThan(0)
    expect(Array.from(themeSelect.options).some((option) => option.value === themeSelect.value)).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '3D 设置' }))
    expect(screen.getByText('3D 设置（向量宇宙）')).toBeInTheDocument()
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
    fireEvent.keyDown(window, { key: 'j', code: 'KeyJ' })
    fireEvent.click(screen.getByRole('button', { name: '确认新增' }))
    fireEvent.click(within(shortcutEditDialog).getByRole('button', { name: '关闭' }))
    expect(alignUpBindingButton.textContent).toContain('KeyJ')
  })

  it('Header 显示向量宇宙按钮并可打开关闭 3D 层', async () => {
    render(<App />)

    const trigger = screen.getByRole('button', { name: '向量宇宙' })
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '关闭向量宇宙' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '关闭向量宇宙' }))
    expect(screen.queryByRole('dialog', { name: '向量宇宙层' })).not.toBeInTheDocument()
  })

  it('向量宇宙层支持 Esc 二次确认退出', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '向量宇宙' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.getByText('再按一次 Esc 退出向量宇宙')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '向量宇宙层' })).not.toBeInTheDocument()
  })

  it('无 focus 时向量宇宙层显示提示并保留 LOD 层级标识', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '向量宇宙' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
    })

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
    fireEvent.click(screen.getByRole('button', { name: '向量宇宙' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(document.querySelector('.fullscreen-layer')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '关闭向量宇宙' }))

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(document.querySelector('.fullscreen-layer')).not.toBeNull()
  })

  it('向量宇宙层在无命中时按 Space 不会误退出', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '向量宇宙' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
    expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
  })

  it('向量宇宙层支持 F1 折叠 HUD 为单行信息', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '向量宇宙' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '向量宇宙层' })).toBeInTheDocument()
    })
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
