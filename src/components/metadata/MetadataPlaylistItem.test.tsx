import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MetadataPlaylistItem } from './MetadataPlaylistItem'

describe('MetadataPlaylistItem', () => {
  it('渲染索引与时长，并在 Delete 时触发删除回调', () => {
    const onDelete = vi.fn()
    const onTogglePlayPause = vi.fn()

    render(
      <MetadataPlaylistItem
        mediaId="video-1"
        title="video-1.mp4"
        index={1}
        durationSec={151}
        active={true}
        onSelect={vi.fn()}
        onSelectAndPlay={vi.fn()}
        onTogglePlayPause={onTogglePlayPause}
        onDelete={onDelete}
      />,
    )

    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02:31')).toBeInTheDocument()

    const itemButton = screen.getByRole('button', { name: /video-1.mp4/i })
    fireEvent.focus(itemButton)
    expect(itemButton).toHaveClass('is-focused')
    fireEvent.keyDown(itemButton, { key: 'Delete' })
    fireEvent.keyDown(itemButton, { key: ' ', code: 'Space' })
    fireEvent.blur(itemButton)
    expect(itemButton).not.toHaveClass('is-focused')

    expect(onDelete).toHaveBeenCalledWith('video-1')
    expect(onTogglePlayPause).toHaveBeenCalledWith('video-1')
  })
})
