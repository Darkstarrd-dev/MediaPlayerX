import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MetadataPlaylistItem } from './MetadataPlaylistItem'

describe('MetadataPlaylistItem', () => {
  it('渲染索引与分钟时长，并在 Delete 时触发删除回调', () => {
    const onDelete = vi.fn()

    render(
      <MetadataPlaylistItem
        mediaId="video-1"
        title="video-1.mp4"
        index={1}
        durationSec={151}
        active={true}
        onSelect={vi.fn()}
        onSelectAndPlay={vi.fn()}
        onDelete={onDelete}
      />,
    )

    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    const itemButton = screen.getByRole('button', { name: /video-1.mp4/i })
    fireEvent.focus(itemButton)
    fireEvent.keyDown(itemButton, { key: 'Delete' })

    expect(onDelete).toHaveBeenCalledWith('video-1')
  })
})
