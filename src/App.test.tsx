import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { resetUiStoreState } from './store/useUiStore'

describe('MediaPlayer 虚拟 UI', () => {
  beforeEach(() => {
    resetUiStoreState()
  })

  it('支持图片/视频模式切换', () => {
    render(<App />)

    expect(screen.getByText('向量模式')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))

    expect(screen.getByText(/封面态（待播放）/)).toBeInTheDocument()
  })

  it('方向键右键在无 focus 时可建立并切换图片 focus', () => {
    render(<App />)

    expect(screen.queryByText(/archive_001\.zip #1/)).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })

    expect(screen.getByText(/archive_001\.zip #2/)).toBeInTheDocument()
  })

  it('鼠标点击与键盘方向键共享 focus，Esc 可清空 focus', () => {
    render(<App />)

    expect(screen.getByText('图包：幻旅系列 001')).toBeInTheDocument()

    const firstThumbButton = screen.getByText('幻旅系列 001 #1').closest('button')
    expect(firstThumbButton).not.toBeNull()
    fireEvent.click(firstThumbButton as HTMLButtonElement)

    expect(screen.queryByText('图包：幻旅系列 001')).not.toBeInTheDocument()
    expect(screen.getByText(/archive_001\.zip #1/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    expect(screen.getByText(/archive_001\.zip #2/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByText(/archive_001\.zip #/)).not.toBeInTheDocument()
    expect(screen.getByText('图包：幻旅系列 001')).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: '纯文件名模式' }))

    expect(screen.getByText('文件名')).toBeInTheDocument()
    expect(screen.getByText(/img_0001\.jpg/)).toBeInTheDocument()
    expect(screen.queryByText(/第\s+\d+\s+\/\s+\d+\s+页/)).not.toBeInTheDocument()
  })

  it('视频切换后回到封面暂停态，Save as cover 保存随机颜色', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'teaser_forest.mp4' })[0])
    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument()
    expect(screen.getByText(/封面态（待播放）/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save as cover' }))
    expect(infoSpy).toHaveBeenCalled()

    const speedSlider = screen.getByRole('slider', { name: '倍速滑条' })
    fireEvent.change(speedSlider, { target: { value: '2.5' } })
    expect(screen.getByText('倍率 x2.50')).toBeInTheDocument()

    const lastCall = infoSpy.mock.calls.at(-1)
    expect(lastCall?.[0]).toBe('模拟 Save as cover')
    expect(String(lastCall?.[1]?.coverColor ?? '')).toContain('hsl(')

    infoSpy.mockRestore()
  })

  it('全屏默认按当前模式进入单显示，双显示切回单显示时恢复入口模式', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(screen.getByText('图片 #2')).toBeInTheDocument()
    expect(screen.queryByLabelText('调整全屏分屏比例')).not.toBeInTheDocument()

    fireEvent.mouseMove(screen.getByText('图片 #2'), { clientY: window.innerHeight - 4 })
    fireEvent.click(screen.getByRole('button', { name: '双显示' }))
    expect(screen.getByLabelText('调整全屏分屏比例')).toBeInTheDocument()
    expect(screen.getByText(/焦点：图片/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Tab', code: 'Tab' })
    expect(screen.getByText(/焦点：视频/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '单显示' }))
    expect(screen.queryByLabelText('调整全屏分屏比例')).not.toBeInTheDocument()
    expect(screen.getByText('图片 #2')).toBeInTheDocument()
    expect(screen.queryByText(/封面态（待播放）/)).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(screen.queryByText('图片 #2')).not.toBeInTheDocument()
  })

  it('全屏图片支持首末跳转、跨包翻页与上个包下个包按钮', () => {
    render(<App />)

    const readToolbarTitle = () => document.querySelector('.main-toolbar strong')?.textContent ?? ''

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })

    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' })
    expect(screen.getByText('图片 #36')).toBeInTheDocument()

    const titleBeforeCross = readToolbarTitle()
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })
    expect(screen.getByText('图片 #1')).toBeInTheDocument()
    expect(readToolbarTitle()).not.toBe(titleBeforeCross)

    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
    expect(screen.getByText('图片 #1')).toBeInTheDocument()

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

  it('视频模式进入全屏默认单视频，悬浮控件按视频位置贴顶/贴底并支持 Alt+方向键对齐', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '视频模式' }))
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })

    expect(screen.getAllByText(/封面态（待播放）/).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('调整全屏分屏比例')).not.toBeInTheDocument()

    const videoPane = document.querySelector('.fullscreen-video')
    expect(videoPane).not.toBeNull()
    fireEvent.mouseEnter(videoPane as Element)
    expect(screen.getByLabelText('全屏视频进度滑条')).toBeInTheDocument()

    const fullscreenLayer = document.querySelector('.fullscreen-layer')
    expect(fullscreenLayer).not.toBeNull()
    fireEvent.mouseMove(fullscreenLayer as Element, { clientY: window.innerHeight - 4 })
    const rowsDefault = Array.from(document.querySelectorAll('.fullscreen-video-controls-row'))
    expect(rowsDefault[0]?.classList.contains('is-progress')).toBe(true)

    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', altKey: true })
    const rowsBottomAlign = Array.from(document.querySelectorAll('.fullscreen-video-controls-row'))
    expect(rowsBottomAlign[0]?.classList.contains('is-controls')).toBe(true)

    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true })
    const rowsTopAlign = Array.from(document.querySelectorAll('.fullscreen-video-controls-row'))
    expect(rowsTopAlign[0]?.classList.contains('is-progress')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '双显示' }))
    const dualVideoStage = document.querySelector('.fullscreen-video .fullscreen-stage')
    const dualImageStage = document.querySelector('.fullscreen-image .fullscreen-stage')
    expect(dualVideoStage?.classList.contains('is-draggable')).toBe(true)
    expect(dualImageStage?.classList.contains('is-draggable')).toBe(false)

    fireEvent.mouseDown(dualVideoStage as Element, { button: 0, clientX: 120, clientY: 60 })
    expect(dualVideoStage?.classList.contains('is-dragging')).toBe(true)
    fireEvent.mouseMove(window, { clientX: 180, clientY: 80 })
    fireEvent.mouseUp(window)
    expect(dualVideoStage?.classList.contains('is-dragging')).toBe(false)
  })

  it('设置面板包含全屏对齐快捷键配置项', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(screen.getByText('全屏：上对齐')).toBeInTheDocument()
    expect(screen.getByText('全屏：下对齐')).toBeInTheDocument()
    expect(screen.getByText('全屏：左对齐')).toBeInTheDocument()
    expect(screen.getByText('全屏：右对齐')).toBeInTheDocument()
  })
})
