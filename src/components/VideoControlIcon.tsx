import type { ReactElement } from 'react'

type VideoControlIconName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'volume'
  | 'volumeMuted'
  | 'fullscreen'
  | 'fullscreenExpand'
  | 'fullscreenCompress'
  | 'subtitle'
  | 'playlist'
  | 'dual'
  | 'camera'
  | 'aspect'
  | 'speed'
  | 'repeatOne'
  | 'repeatFolder'
  | 'repeatAlbum'
  | 'repeatLibrary'
  | 'shader'
  | 'settings'

interface VideoControlIconProps {
  name: VideoControlIconName
  className?: string
}

const ICON_NODES: Record<VideoControlIconName, ReactElement> = {
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
  fullscreen: (
    <>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
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
  subtitle: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M9.5 15a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5" />
      <path d="M16.5 15a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5" />
    </>
  ),
  speed: (
    <>
      <polygon points="13 19 22 12 13 5 13 19" />
      <polygon points="2 19 11 12 2 5 2 19" />
    </>
  ),
  aspect: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
      <path d="m12 2 3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" transform="scale(0.4) translate(30,30)" />
    </>
  ),
  dual: (
    <>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </>
  ),
  playlist: (
    <>
      <path d="M9 6h12" />
      <path d="M9 12h12" />
      <path d="M9 18h12" />
      <polygon points="3 5 7 8 3 11 3 5" />
    </>
  ),
  repeatOne: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
      <path d="M11 10h1v4" />
    </>
  ),
  repeatFolder: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  repeatAlbum: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
      <rect x="10" y="10" width="4" height="4" rx="0.5" />
    </>
  ),
  repeatLibrary: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
      <path d="M8 12h8" />
    </>
  ),
  shader: <path d="M3 6h7v2H3V6zm11 0h7v2h-7V6zM8 11h13v2H8v-2zM3 11h3v2H3v-2zm0 5h11v2H3v-2zm15 0h3v2h-3v-2zM10 5h4v4h-4V5zm-4 5h4v4H6v-4zm8 5h4v4h-4v-4z" />,
  settings: <path d="M3 17h6v2H3v-2zm0-6h10v2H3v-2zm0-6h14v2H3V5zm16 12v2h2v-2h-2zm-2-2h6v6h-6v-6zm2-8h2V5h-2v2zm-2-2h6v6h-6V5z" />,
}

export function VideoControlIcon({ name, className }: VideoControlIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? 'video-action-icon'}
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
