type VideoControlIconName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'volume'
  | 'volumeMuted'
  | 'fullscreen'
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

const ICON_PATHS: Record<VideoControlIconName, string> = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 19h4V5H6zm8-14v14h4V5h-4z',
  prev: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
  next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  volume:
    'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  volumeMuted:
    'M4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 12 10.73 4.27 3z',
  fullscreen: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
  subtitle:
    'M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z',
  playlist: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-10v2h14V7H7z',
  dual:
    'M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H5V7h6v10zm8 0h-6V7h6v10z',
  camera:
    'M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
  aspect: 'M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z',
  speed: 'M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V4zm1 7.2 4.6-2.3-2.3 4.6z',
  repeatOne: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-5-2V9h-1.6l-1.2 1v1.2h1.3V15H12z',
  repeatFolder:
    'M7 7h9v3l3-3-3-3v2H6v5h1V7zm9 10H7v-2H4l3 3 3-3H8v-1h8v3zm4-9h-8l-2-2H4v6h16V8z',
  repeatAlbum: 'M7 7h9v3l3-3-3-3v2H6v5h1V7zm9 10H8v-1H6v3h10v3l3-3-3-3v2zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
  repeatLibrary: 'M7 7h9v3l3-3-3-3v2H6v5h1V7zm9 10H7v-2H4l3 3 3-3H8v-1h8v3zm-9-5h10V10H7v2zm0-4h12V6H7v2z',
  shader:
    'M3 6h7v2H3V6zm11 0h7v2h-7V6zM8 11h13v2H8v-2zM3 11h3v2H3v-2zm0 5h11v2H3v-2zm15 0h3v2h-3v-2zM10 5h4v4h-4V5zm-4 5h4v4H6v-4zm8 5h4v4h-4v-4z',
  settings:
    'M3 17h6v2H3v-2zm0-6h10v2H3v-2zm0-6h14v2H3V5zm16 12v2h2v-2h-2zm-2-2h6v6h-6v-6zm2-8h2V5h-2v2zm-2-2h6v6h-6V5z',
}

export function VideoControlIcon({ name, className }: VideoControlIconProps) {
  if (name === 'pause') {
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
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className={className ?? 'video-action-icon'} viewBox="0 0 24 24">
      <path d={ICON_PATHS[name]} />
      {name === 'camera' ? <circle cx="12" cy="12" r="3.2" /> : null}
    </svg>
  )
}
