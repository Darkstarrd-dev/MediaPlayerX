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
  onDelete?: (mediaId: string) => void
  buttonRef?: (element: HTMLButtonElement | null) => void
}

function formatPlaylistIndex(index: number): string {
  return String(Math.max(1, index)).padStart(2, '0')
}

function formatDurationMinutes(durationSec: number): number {
  return Math.max(0, Math.round(Math.max(0, durationSec) / 60))
}

export function MetadataPlaylistItem({
  mediaId,
  title,
  index,
  durationSec,
  active,
  onSelect,
  onSelectAndPlay,
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
  const durationMinutes = formatDurationMinutes(durationSec)

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Delete' || !onDelete) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    onDelete(mediaId)
  }

  return (
    <button
      ref={buttonRef}
      className={`metadata-music-playlist-item ${sheenEnabled ? 'mpx-random-sheen-host' : ''} ${active ? 'is-active' : ''} ${sheenEnabled && sweeping ? 'is-sweeping' : ''}`}
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
        className="sidebar-count sidebar-count-images metadata-music-playlist-duration"
        data-tooltip-label={`${durationMinutes} min`}
      >
        {durationMinutes}
      </span>
    </button>
  )
}
