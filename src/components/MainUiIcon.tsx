import type { ReactElement } from 'react'

export type MainUiIconName =
  | 'setRoot'
  | 'return'
  | 'search'
  | 'test'
  | 'save'
  | 'refresh'
  | 'day'
  | 'night'
  | 'thumbnail'
  | 'fileList'
  | 'getMetaData'
  | 'parse'
  | 'collapse'
  | 'expand'
  | 'close'
  | 'delete'
  | 'dataMode'
  | 'imageMode'
  | 'videoMode'
  | 'musicMode'
  | 'hidden'
  | 'reveal'
  | 'selectAll'
  | 'unselectAll'
  | 'adSearch'
  | 'organize'
  | 'playlistAdd'
  | 'booklet'
  | 'videoInfo'
  | 'cover'

interface MainUiIconProps {
  name: MainUiIconName
  className?: string
}

const MAIN_UI_ICON_NODES: Record<MainUiIconName, ReactElement> = {
  setRoot: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 22V15" />
      <path d="M12 9V2" />
      <path d="M2 12h7" />
      <path d="M15 12h7" />
    </>
  ),
  return: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  test: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ),
  refresh: (
    <>
      <path d="M1 4v6h6" />
      <path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </>
  ),
  day: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>
  ),
  night: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  thumbnail: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  fileList: (
    <>
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </>
  ),
  getMetaData: (
    <>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <polyline points="8 15 12 19 16 15" />
      <line x1="12" y1="19" x2="12" y2="11" />
    </>
  ),
  parse: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
  collapse: <path d="m6 9 6 6 6-6" />,
  expand: <path d="m18 15-6-6-6 6" />,
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  delete: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  dataMode: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <rect x="3" y="4" width="4" height="4" />
      <rect x="3" y="10" width="4" height="4" />
      <rect x="3" y="16" width="4" height="4" />
    </>
  ),
  imageMode: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  videoMode: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </>
  ),
  musicMode: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  hidden: (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  ),
  reveal: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  selectAll: (
    <>
      <path d="M3 3h18v18H3z" strokeDasharray="4 4" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  unselectAll: (
    <>
      <path d="M3 3h18v18H3z" strokeDasharray="4 4" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
  adSearch: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <g transform="translate(-1, 0)">
        <path d="M8 13 9.5 9 11 13" strokeWidth="1.5" />
        <path d="M8.5 12h2" strokeWidth="1.5" />
        <path d="M13 9h1.5a2 2 0 0 1 0 4H13v-4z" strokeWidth="1.5" />
      </g>
    </>
  ),
  organize: (
    <>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <line x1="12" y1="10" x2="12" y2="16" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </>
  ),
  playlistAdd: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h8" />
      <path d="M18 15v6" />
      <path d="M15 18h6" />
    </>
  ),
  booklet: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  videoInfo: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  cover: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="8" y1="4" x2="8" y2="20" />
    </>
  ),
}

export function MainUiIcon({ name, className }: MainUiIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? 'main-ui-icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {MAIN_UI_ICON_NODES[name]}
    </svg>
  )
}
