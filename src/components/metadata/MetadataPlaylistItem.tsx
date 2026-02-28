import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { useOverflowMarquee } from '../useOverflowMarquee'
import { useRandomSweepAnimation } from '../useRandomSweepAnimation'

interface MetadataPlaylistItemProps {
  mediaId: string
  title: string
  index: number
  durationSec: number
  active: boolean
  onSelect: (mediaId: string) => void
  onSelectAndPlay: (mediaId: string) => void
  onTogglePlayPause?: (mediaId: string) => void
  onDelete?: (mediaId: string) => void
  buttonRef?: (element: HTMLButtonElement | null) => void
}

function formatPlaylistIndex(index: number): string {
  return String(Math.max(1, index)).padStart(2, '0')
}

function formatDurationLabel(durationSec: number): string {
  const totalSeconds = Math.max(0, Math.round(Math.max(0, durationSec)))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function MetadataPlaylistItem({
  mediaId,
  title,
  index,
  durationSec,
  active,
  onSelect,
  onSelectAndPlay,
  onTogglePlayPause,
  onDelete,
  buttonRef,
}: MetadataPlaylistItemProps) {
  const [focused, setFocused] = useState(false)
  const sheenEnabled = active || focused
  const { sweeping, onAnimationEnd } = useRandomSweepAnimation({
    enabled: sheenEnabled,
    initialDelayRangeMs: [1200, 3000],
    repeatDelayRangeMs: [2500, 8200],
  })
  const { hostRef, textRef, overflowing, marqueeStyle } = useOverflowMarquee<HTMLSpanElement>({
    text: title,
    cssDurationVar: '--mpx-metadata-playlist-marquee-duration',
    secondsPerChar: 0.24,
  })
  const marqueeActive = focused && overflowing
  const indexLabel = formatPlaylistIndex(index)
  const durationLabel = formatDurationLabel(durationSec)

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Delete' && onDelete) {
      event.preventDefault()
      event.stopPropagation()
      onDelete(mediaId)
      return
    }

    if ((event.key === ' ' || event.code === 'Space') && onTogglePlayPause) {
      event.preventDefault()
      event.stopPropagation()
      onTogglePlayPause(mediaId)
    }
  }

  return (
    <button
      ref={buttonRef}
      className={`metadata-music-playlist-item mpx-overlay-cell-btn ${sheenEnabled ? 'mpx-random-sheen-host' : ''} ${active ? 'is-active' : ''} ${focused ? 'is-focused' : ''} ${sheenEnabled && sweeping ? 'is-sweeping' : ''}`}
      type="button"
      aria-keyshortcuts={onDelete ? 'Delete' : undefined}
      onClick={() => onSelect(mediaId)}
      onDoubleClick={() => onSelectAndPlay(mediaId)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onAnimationEnd={onAnimationEnd}
      onKeyDown={handleKeyDown}
    >
      <span className="metadata-music-playlist-index" aria-hidden="true">
        {indexLabel}
      </span>

      <span
        className={`metadata-music-playlist-title-marquee ${marqueeActive ? 'is-overflow' : ''}`}
        ref={hostRef}
        style={marqueeStyle}
      >
        <span className="metadata-music-playlist-title" ref={textRef} data-tooltip-label={title}>
          {title}
        </span>
        {marqueeActive ? (
          <span aria-hidden="true" className="metadata-music-playlist-title">
            {title}
          </span>
        ) : null}
      </span>

      <span
        className="metadata-music-playlist-duration"
        data-tooltip-label={durationLabel}
      >
        {durationLabel}
      </span>
    </button>
  )
}
