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

  it('支持 F 切换全屏虚拟视图', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(screen.getByText('图片 #2')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' })
    expect(screen.queryByText('图片 #2')).not.toBeInTheDocument()
  })
})
