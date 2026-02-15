import { useEffect, useRef, useState, type ReactElement } from 'react'

import {
  dispatchMusicPlaybackControl,
  onMusicPlaybackState,
} from '../features/media/musicPlaybackBridge'
import type { BrowserMode } from '../types'

type HeaderIconName =
  | 'statusIdle'
  | 'statusBusy'
  | 'image'
  | 'video'
  | 'music'
  | 'search'
  | 'edit'
  | 'metadata'
  | 'dataMode'
  | 'autoplayOn'
  | 'autoplayOff'
  | 'settings'
  | 'day'
  | 'night'
  | 'minus'
  | 'plus'
  | 'zoom'
  | 'play'
  | 'pause'
  | 'stop'
  | 'windowMinimize'
  | 'windowMaximize'
  | 'windowRestore'
  | 'windowClose'

type HeaderPopoverKey = 'scale' | 'autoplay'

const HEADER_ICON_NODES: Record<HeaderIconName, ReactElement> = {
  statusIdle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  statusBusy: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  video: (
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
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  edit: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <line x1="9" y1="15" x2="15" y2="9" />
      <line x1="15" y1="15" x2="9" y2="9" />
    </>
  ),
  metadata: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
  autoplayOn: (
    <>
      <path d="M12 2a10 10 0 1 0 10 10" />
      <polygon points="10 8 16 12 10 16 10 8" />
      <path d="M22 12c0-5.52-4.48-10-10-10" />
    </>
  ),
  autoplayOff: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  day: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>
  ),
  night: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  minus: <path d="M6 12h12" />,
  plus: (
    <>
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </>
  ),
  zoom: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </>
  ),
  play: <polygon points="5 3 19 12 5 21 5 3" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
  windowMinimize: <path d="M5 19h14" />,
  windowMaximize: <rect x="3" y="3" width="18" height="18" rx="2" />,
  windowRestore: (
    <>
      <rect x="3" y="11" width="10" height="10" rx="1" />
      <path d="M11 3h7a1 1 0 0 1 1 1v7" />
      <path d="M11 3v4" />
      <path d="M15 11h4" />
    </>
  ),
  windowClose: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
}

function HeaderActionIcon({ name }: { name: HeaderIconName }) {
  return (
    <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 24 24">
      {HEADER_ICON_NODES[name]}
    </svg>
  )
}

export interface AppHeaderProps {
  headerHeight: number
  mode: BrowserMode
  searchPanelOpen: boolean
  manageMode: boolean
  metadataManageMode: boolean
  thumbnailScaleLevel: number
  canThumbnailScaleDown: boolean
  canThumbnailScaleUp: boolean
  autoPlayEnabled: boolean
  autoPlayInterval: number
  paletteMode: 'day' | 'night'
  importMenuOpen: boolean
  taskStatusLabel: string
  taskStatusBusy: boolean
  importTaskPanelOpen: boolean
  autoPlayPresets: number[]
  onToggleImportMenu: () => void
  onToggleImportTaskPanel: () => void
  onCloseImportMenu: () => void
  onImportFiles: () => void
  onImportFolders: () => void
  onModeChange: (mode: BrowserMode) => void
  onToggleSearchPanel: () => void
  onToggleManageMode: () => void
  onToggleMetadataManageMode: () => void
  onThumbnailScaleDown: () => void
  onThumbnailScaleUp: () => void
  onAutoPlayEnabledChange: (enabled: boolean) => void
  onAutoPlayIntervalChange: (value: number) => void
  onTogglePaletteMode: () => void
  onOpenSettings: () => void
}

function AppHeader({
  headerHeight,
  mode,
  searchPanelOpen,
  manageMode,
  metadataManageMode,
  thumbnailScaleLevel,
  canThumbnailScaleDown,
  canThumbnailScaleUp,
  autoPlayEnabled,
  autoPlayInterval,
  paletteMode,
  importMenuOpen,
  taskStatusLabel,
  taskStatusBusy,
  importTaskPanelOpen,
  autoPlayPresets,
  onToggleImportMenu,
  onToggleImportTaskPanel,
  onCloseImportMenu,
  onImportFiles,
  onImportFolders,
  onModeChange,
  onToggleSearchPanel,
  onToggleManageMode,
  onToggleMetadataManageMode,
  onThumbnailScaleDown,
  onThumbnailScaleUp,
  onAutoPlayEnabledChange,
  onAutoPlayIntervalChange,
  onTogglePaletteMode,
  onOpenSettings,
}: AppHeaderProps) {
  const [windowMaximized, setWindowMaximized] = useState(false)
  const [showMusicQuickActions, setShowMusicQuickActions] = useState(false)
  const [musicQuickPlaying, setMusicQuickPlaying] = useState(false)
  const [scaleCommittedLevel, setScaleCommittedLevel] = useState(Math.max(1, Math.min(9, Math.round(thumbnailScaleLevel))))
  const [autoPlayCommittedLevel, setAutoPlayCommittedLevel] = useState(Math.max(1, Math.min(9, Math.round(autoPlayInterval))))
  const [scaleDraftValue, setScaleDraftValue] = useState(scaleCommittedLevel)
  const [autoPlayDraftValue, setAutoPlayDraftValue] = useState(autoPlayCommittedLevel)
  const [openHeaderPopover, setOpenHeaderPopover] = useState<HeaderPopoverKey | null>(null)
  const musicQuickHideTimerRef = useRef<number | null>(null)
  const headerPopoverHideTimerRef = useRef<number | null>(null)

  const scaleLevel = Math.max(1, Math.min(9, Math.round(thumbnailScaleLevel)))
  const autoPlayPresetLevel = autoPlayPresets.includes(autoPlayInterval)
    ? autoPlayInterval
    : Math.max(1, Math.min(9, Math.round(autoPlayInterval)))
  const autoPlayLevel = Math.max(1, Math.min(9, Math.round(autoPlayPresetLevel)))

  useEffect(() => {
    setScaleCommittedLevel(scaleLevel)
  }, [scaleLevel])

  useEffect(() => {
    setScaleDraftValue(scaleLevel)
  }, [scaleLevel])

  useEffect(() => {
    setAutoPlayCommittedLevel(autoPlayLevel)
  }, [autoPlayLevel])

  useEffect(() => {
    setAutoPlayDraftValue(autoPlayLevel)
  }, [autoPlayLevel])

  const updateScaleLevel = (nextLevel: number) => {
    const target = Math.max(1, Math.min(9, Math.round(nextLevel)))
    if (target === scaleCommittedLevel) {
      return
    }

    const steps = Math.abs(target - scaleCommittedLevel)
    if (target > scaleCommittedLevel) {
      for (let index = 0; index < steps; index += 1) {
        onThumbnailScaleUp()
      }
      setScaleCommittedLevel(target)
      return
    }

    for (let index = 0; index < steps; index += 1) {
      onThumbnailScaleDown()
    }
    setScaleCommittedLevel(target)
  }

  const updateAutoPlayLevel = (nextLevel: number) => {
    const target = Math.max(1, Math.min(9, Math.round(nextLevel)))
    if (target === autoPlayCommittedLevel) {
      return
    }
    onAutoPlayIntervalChange(target)
    setAutoPlayCommittedLevel(target)
  }

  const clearMusicQuickHideTimer = () => {
    if (musicQuickHideTimerRef.current != null) {
      window.clearTimeout(musicQuickHideTimerRef.current)
      musicQuickHideTimerRef.current = null
    }
  }

  const clearHeaderPopoverHideTimer = () => {
    if (headerPopoverHideTimerRef.current != null) {
      window.clearTimeout(headerPopoverHideTimerRef.current)
      headerPopoverHideTimerRef.current = null
    }
  }

  const showMusicActions = () => {
    clearMusicQuickHideTimer()
    setShowMusicQuickActions(true)
  }

  const scheduleHideMusicActions = () => {
    clearMusicQuickHideTimer()
    musicQuickHideTimerRef.current = window.setTimeout(() => {
      setShowMusicQuickActions(false)
      musicQuickHideTimerRef.current = null
    }, 180)
  }

  useEffect(
    () => () => {
      clearMusicQuickHideTimer()
      clearHeaderPopoverHideTimer()
    },
    [],
  )

  const openPopoverByHover = (key: HeaderPopoverKey) => {
    clearHeaderPopoverHideTimer()
    setOpenHeaderPopover(key)
  }

  const closePopoverByHover = (key: HeaderPopoverKey) => {
    clearHeaderPopoverHideTimer()
    headerPopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenHeaderPopover((current) => (current === key ? null : current))
      headerPopoverHideTimerRef.current = null
    }, 140)
  }

  useEffect(() => {
    const windowApi = window.mediaPlayerWindow
    if (!windowApi) {
      return
    }

    let active = true
    void windowApi
      .isMaximized()
      .then((maximized) => {
        if (active) {
          setWindowMaximized(maximized)
        }
      })
      .catch(() => {
        // ignore initialization failures
      })

    const unsubscribe = windowApi.onMaximizedStateChange((maximized) => {
      setWindowMaximized(maximized)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    return onMusicPlaybackState((detail) => {
      setMusicQuickPlaying(detail.playing)
    })
  }, [])

  return (
    <header className="app-header" style={{ height: `${headerHeight}px` }}>
      <div className="header-left">
        <div className="header-group header-group-primary">
          <div className="logo-wrap">
            <button className="logo-btn" type="button" onClick={onToggleImportMenu}>
              MediaPlayerX
            </button>
            {importMenuOpen ? (
              <div className="import-menu">
                <button
                  type="button"
                  onClick={() => {
                    onImportFiles()
                    onCloseImportMenu()
                  }}
                >
                  导入文件
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onImportFolders()
                    onCloseImportMenu()
                  }}
                >
                  导入文件夹
                </button>
              </div>
            ) : null}
          </div>

          <button
            aria-label={taskStatusLabel}
            className={`task-status-btn ${taskStatusBusy ? 'is-busy' : 'is-idle'} ${importTaskPanelOpen ? 'is-open' : ''}`}
            type="button"
            onClick={onToggleImportTaskPanel}
          >
            <span className="header-btn-content">
              <span className="header-btn-icon">
                <HeaderActionIcon name={taskStatusBusy ? 'statusBusy' : 'statusIdle'} />
              </span>
              <span className="header-btn-label">{taskStatusLabel}</span>
            </span>
          </button>

          <button
            aria-label={paletteMode === 'day' ? '切换到夜间配色' : '切换到日间配色'}
            aria-pressed={paletteMode === 'night'}
            className="header-settings-btn header-icon-only-btn"
            type="button"
            onClick={onTogglePaletteMode}
          >
            <HeaderActionIcon name={paletteMode === 'day' ? 'night' : 'day'} />
          </button>

          <button aria-label="设置" className="header-settings-btn" type="button" onClick={onOpenSettings}>
            <span className="header-btn-content">
              <span className="header-btn-icon">
                <HeaderActionIcon name="settings" />
              </span>
              <span className="header-btn-label">设置</span>
            </span>
          </button>
        </div>

        <div className="header-group header-group-modes">
          <div className="mode-switch-wrap" onMouseEnter={clearMusicQuickHideTimer} onMouseLeave={scheduleHideMusicActions}>
            <div className="mode-switch" role="group" aria-label="mode-switch">
              <button
                aria-label="图片模式"
                className={mode === 'image' ? 'is-active' : ''}
                type="button"
                onMouseEnter={() => setShowMusicQuickActions(false)}
                onClick={() => onModeChange('image')}
              >
                <span className="header-btn-content">
                  <span className="header-btn-icon">
                    <HeaderActionIcon name="image" />
                  </span>
                  <span className="header-btn-label">图片模式</span>
                </span>
              </button>
              <button
                aria-label="视频模式"
                className={mode === 'video' ? 'is-active' : ''}
                type="button"
                onMouseEnter={() => setShowMusicQuickActions(false)}
                onClick={() => onModeChange('video')}
              >
                <span className="header-btn-content">
                  <span className="header-btn-icon">
                    <HeaderActionIcon name="video" />
                  </span>
                  <span className="header-btn-label">视频模式</span>
                </span>
              </button>
              <button
                aria-label="音乐模式"
                className={mode === 'music' ? 'is-active' : ''}
                type="button"
                onMouseEnter={showMusicActions}
                onClick={() => onModeChange('music')}
              >
                <span className="header-btn-content">
                  <span className="header-btn-icon">
                    <HeaderActionIcon name="music" />
                  </span>
                  <span className="header-btn-label">音乐模式</span>
                </span>
              </button>
              <div className={`music-quick-actions ${showMusicQuickActions ? 'is-visible' : ''}`} onMouseEnter={clearMusicQuickHideTimer}>
                <button
                  aria-label={musicQuickPlaying ? '音乐暂停' : '音乐播放'}
                  className="mode-action-btn"
                  type="button"
                  onClick={() => {
                    dispatchMusicPlaybackControl('toggle-playback')
                  }}
                >
                  <HeaderActionIcon name={musicQuickPlaying ? 'pause' : 'play'} />
                </button>
                <button
                  aria-label="音乐停止"
                  className="mode-action-btn"
                  type="button"
                  onClick={() => {
                    dispatchMusicPlaybackControl('stop')
                  }}
                >
                  <HeaderActionIcon name="stop" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="header-group header-group-playback">
          <div
            className={`header-popover-control ${openHeaderPopover === 'scale' ? 'is-open' : ''}`}
            role="group"
            aria-label="缩略图缩放级别"
            onMouseEnter={() => openPopoverByHover('scale')}
            onMouseLeave={() => closePopoverByHover('scale')}
          >
            <button
              aria-label="缩略图缩放"
              className="header-popover-trigger"
              disabled={!canThumbnailScaleDown && !canThumbnailScaleUp}
              type="button"
            >
              <HeaderActionIcon name="zoom" />
            </button>

            <div className="header-popover-panel" hidden={openHeaderPopover !== 'scale'} role="dialog" aria-label="缩放级别设置">
              <div className="header-vertical-slider" role="group" aria-label="缩放级别九档选择">
                <div className="header-vertical-slider-value">{Math.max(1, Math.min(9, Math.round(scaleDraftValue)))}</div>
                <div className="header-vertical-slider-body">
                  <input
                    aria-label="缩放级别滑条"
                    className="header-vertical-range"
                    max={9}
                    min={1}
                    step={0.01}
                    type="range"
                    value={scaleDraftValue}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      setScaleDraftValue(nextValue)
                      const roundedLevel = Math.max(1, Math.min(9, Math.round(nextValue)))
                      updateScaleLevel(roundedLevel)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`header-popover-control ${openHeaderPopover === 'autoplay' ? 'is-open' : ''}`}
            role="group"
            aria-label="自动播放速度"
            onMouseEnter={() => openPopoverByHover('autoplay')}
            onMouseLeave={() => closePopoverByHover('autoplay')}
          >
            <button
              aria-label="自动播放"
              aria-pressed={autoPlayEnabled}
              className={`header-popover-trigger auto-play-toggle-btn ${autoPlayEnabled ? 'is-active' : ''}`}
              type="button"
              onClick={() => onAutoPlayEnabledChange(!autoPlayEnabled)}
            >
              <HeaderActionIcon name={autoPlayEnabled ? 'autoplayOn' : 'autoplayOff'} />
            </button>

            <div className="header-popover-panel" hidden={openHeaderPopover !== 'autoplay'} role="dialog" aria-label="自动播放速度设置">
              <div className="header-vertical-slider" role="group" aria-label="自动播放九档选择">
                <div className="header-vertical-slider-value">{Math.max(1, Math.min(9, Math.round(autoPlayDraftValue)))}</div>
                <div className="header-vertical-slider-body">
                  <input
                    aria-label="自动播放速度滑条"
                    className="header-vertical-range"
                    max={9}
                    min={1}
                    step={0.01}
                    type="range"
                    value={autoPlayDraftValue}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      setAutoPlayDraftValue(nextValue)
                      const roundedLevel = Math.max(1, Math.min(9, Math.round(nextValue)))
                      updateAutoPlayLevel(roundedLevel)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="header-group header-group-search">
          <button
            aria-label="检索"
            className={`search-trigger-btn ${searchPanelOpen ? 'is-active' : ''}`}
            type="button"
            onClick={onToggleSearchPanel}
          >
            <span className="header-btn-content">
              <span className="header-btn-icon">
                <HeaderActionIcon name="search" />
              </span>
              <span className="header-btn-label">检索</span>
            </span>
          </button>

          <button
            aria-label="文件管理"
            className={`search-trigger-btn ${manageMode ? 'is-active' : ''}`}
            type="button"
            onClick={onToggleManageMode}
          >
            <span className="header-btn-content">
              <span className="header-btn-icon">
                <HeaderActionIcon name="edit" />
              </span>
              <span className="header-btn-label">文件管理</span>
            </span>
          </button>

          <button
            aria-label={metadataManageMode ? '切换到图像模式' : '切换到元数据模式'}
            className={`search-trigger-btn ${metadataManageMode ? 'is-active' : ''}`}
            type="button"
            onClick={onToggleMetadataManageMode}
          >
              <span className="header-btn-content">
                <span className="header-btn-icon">
                  <HeaderActionIcon name="metadata" />
                </span>
                <span className="header-btn-label">{metadataManageMode ? '图像模式' : '元数据管理'}</span>
              </span>
            </button>
        </div>
      </div>

      <div className="header-right">
        <div aria-label="窗口控制" className="window-controls header-group header-group-window" role="group">
          <button
            aria-label="最小化窗口"
            className="window-control-btn"
            type="button"
            onClick={() => {
              void window.mediaPlayerWindow?.minimize()
            }}
          >
            <HeaderActionIcon name="windowMinimize" />
          </button>
          <button
            aria-label={windowMaximized ? '还原窗口' : '最大化窗口'}
            className="window-control-btn"
            type="button"
            onClick={() => {
              void window.mediaPlayerWindow?.toggleMaximize()
            }}
          >
            <HeaderActionIcon name={windowMaximized ? 'windowRestore' : 'windowMaximize'} />
          </button>
          <button
            aria-label="关闭窗口"
            className="window-control-btn window-control-btn--close"
            type="button"
            onClick={() => {
              void window.mediaPlayerWindow?.close()
            }}
          >
            <HeaderActionIcon name="windowClose" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
