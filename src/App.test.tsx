import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

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

    expect(screen.getByText(/虚拟视频时钟/)).toBeInTheDocument()
  })

  it('方向键右键可切换到下一张图片', () => {
    render(<App />)

    expect(screen.getByText(/archive_001\.zip #1/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })

    expect(screen.getByText(/archive_001\.zip #2/)).toBeInTheDocument()
  })

  it('支持 F11 切换全屏虚拟视图', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'F11', code: 'F11' })
    expect(screen.getByText('图片 #1')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'F11', code: 'F11' })
    expect(screen.queryByText('图片 #1')).not.toBeInTheDocument()
  })
})
