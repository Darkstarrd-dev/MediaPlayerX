import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ImageMainScaleControl } from './ImageMainScaleControl'

function buildProps() {
  return {
    t: ((key: string) => key) as (key: string) => string,
    openScalePopover: true,
    canThumbnailScaleDown: true,
    canThumbnailScaleUp: true,
    thumbnailScaleLevelCount: 7,
    scaleDraftValue: 4,
    onOpenByHover: vi.fn(),
    onCloseByHover: vi.fn(),
    onScaleDraftChange: vi.fn(),
    onScaleChange: vi.fn(),
  }
}

describe('ImageMainScaleControl', () => {
  it('缩放滑条不再使用 is-reverse 变体', () => {
    const { container } = render(<ImageMainScaleControl {...buildProps()} />)
    const runway = container.querySelector('.mpx-runway')

    expect(runway).not.toBeNull()
    expect(runway?.classList.contains('is-reverse')).toBe(false)
  })

  it('onChange 连续拖动同档位时仅提交一次', () => {
    const props = buildProps()
    render(<ImageMainScaleControl {...props} />)

    const slider = screen.getByLabelText('a11y.header.scaleSlider')

    fireEvent.change(slider, { target: { value: '6.2' } })
    expect(props.onScaleDraftChange).toHaveBeenLastCalledWith(6.2)
    expect(props.onScaleChange).toHaveBeenLastCalledWith(6)

    fireEvent.change(slider, { target: { value: '6.4' } })
    expect(props.onScaleDraftChange).toHaveBeenLastCalledWith(6.4)
    expect(props.onScaleChange).toHaveBeenCalledTimes(1)

    fireEvent.change(slider, { target: { value: '6.6' } })
    expect(props.onScaleChange).toHaveBeenLastCalledWith(7)
    expect(props.onScaleChange).toHaveBeenCalledTimes(2)
  })
})
