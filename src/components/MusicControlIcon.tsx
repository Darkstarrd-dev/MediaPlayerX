import type { ReactElement } from 'react'

type MusicControlIconName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'volume'
  | 'volumeMuted'
  | 'fullscreenExpand'
  | 'fullscreenCompress'
  | 'shaderList'
  | 'shaderParameter'
  | 'repeatOne'
  | 'repeatFolder'
  | 'repeatAlbum'
  | 'repeatLibrary'

interface MusicControlIconProps {
  name: MusicControlIconName
  className?: string
}

const ICON_NODES: Record<MusicControlIconName, ReactElement> = {
  play: <polygon points="5 3 19 12 5 21 5 3" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </>
  ),
  prev: (
    <>
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </>
  ),
  next: (
    <>
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </>
  ),
  volume: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </>
  ),
  volumeMuted: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </>
  ),
  fullscreenExpand: (
    <>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </>
  ),
  fullscreenCompress: (
    <>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M3 21l7-7" />
    </>
  ),
  shaderList: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>
  ),
  shaderParameter: (
    <>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </>
  ),
  repeatOne: <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-5-2V9h-1.6l-1.2 1v1.2h1.3V15H12z" />,
  repeatFolder: (
    <path d="M7 7h9v3l3-3-3-3v2H6v5h1V7zm9 10H7v-2H4l3 3 3-3H8v-1h8v3zm4-9h-8l-2-2H4v6h16V8z" />
  ),
  repeatAlbum: (
    <path d="M7 7h9v3l3-3-3-3v2H6v5h1V7zm9 10H8v-1H6v3h10v3l3-3-3-3v2zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  ),
  repeatLibrary: (
    <path d="M7 7h9v3l3-3-3-3v2H6v5h1V7zm9 10H7v-2H4l3 3 3-3H8v-1h8v3zm-9-5h10V10H7v2zm0-4h12V6H7v2z" />
  ),
}

export function MusicControlIcon({ name, className }: MusicControlIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? 'music-action-icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_NODES[name]}
    </svg>
  )
}

export type { MusicControlIconName }
