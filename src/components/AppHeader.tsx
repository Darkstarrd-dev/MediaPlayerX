import { useEffect, useRef, useState } from 'react'

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
  | 'autoplay'
  | 'settings'
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

const HEADER_ICON_PATHS: Record<HeaderIconName, string> = {
  statusIdle: 'M7 7h10v10H7zM9 12l1.8 1.8L15 9.6',
  statusBusy: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4',
  image: 'M4 6h16v12H4zM7 15l3-3 3 3 3-4 4 5M9 10h.01',
  video: 'M4 7h14v10H4zM10 10l4 2-4 2zM18 10l2-1v6l-2-1z',
  music: 'M12 5v10M12 5l7-2v9M10 17a2 2 0 1 0 0 .01M19 14a2 2 0 1 0 0 .01',
  search: 'M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM16 16l4 4',
  edit: 'M8 16l9-9 2 2-9 9-3 1zM7 17h4',
  metadata: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10v6M12 7.5h.01',
  autoplay: 'M8 7h9l-1.5-1.5M17 7l-1.5 1.5M16 17H7l1.5 1.5M7 17l1.5-1.5M11 10l4 2-4 2z',
  settings: 'M6 7h12M6 12h12M6 17h12M10 7a1.3 1.3 0 1 0 0 .01M15 12a1.3 1.3 0 1 0 0 .01M12 17a1.3 1.3 0 1 0 0 .01',
  minus: 'M6 12h12',
  plus: 'M12 6v12M6 12h12',
  zoom: 'M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM16 16l4 4M11 8v6M8 11h6',
  play: 'M8 5v14l11-7z',
  pause: 'M6 19h4V5H6zm8-14v14h4V5h-4z',
  stop: 'M7 7h10v10H7z',
  windowMinimize: 'M5 19h14',
  windowMaximize: 'M4 4h16v16H4z',
  windowRestore: 'M8 8h12v12H8zM4 4h12v2H6v10H4z',
  windowClose: 'M18 6 6 18M6 6l12 12',
}

function HeaderActionIcon({ name }: { name: HeaderIconName }) {
  return (
    <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 24 24">
      <path d={HEADER_ICON_PATHS[name]} />
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
  importMenuOpen: boolean
  taskStatusLabel: string
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
  importMenuOpen,
  taskStatusLabel,
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
            className={`task-status-btn ${taskStatusLabel === '加载中' ? 'is-busy' : 'is-idle'} ${importTaskPanelOpen ? 'is-open' : ''}`}
            type="button"
            onClick={onToggleImportTaskPanel}
          >
            <span className="header-btn-content">
              <span className="header-btn-icon">
                <HeaderActionIcon name={taskStatusLabel === '加载中' ? 'statusBusy' : 'statusIdle'} />
              </span>
              <span className="header-btn-label">{taskStatusLabel}</span>
            </span>
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
                    setMusicQuickPlaying((value) => !value)
                  }}
                >
                  <HeaderActionIcon name={musicQuickPlaying ? 'pause' : 'play'} />
                </button>
                <button
                  aria-label="音乐停止"
                  className="mode-action-btn"
                  type="button"
                  onClick={() => {
                    setMusicQuickPlaying(false)
                  }}
                >
                  <HeaderActionIcon name="stop" />
                </button>
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
            aria-label="元数据管理"
            className={`search-trigger-btn ${metadataManageMode ? 'is-active' : ''}`}
            type="button"
            onClick={onToggleMetadataManageMode}
          >
            <span className="header-btn-content">
              <span className="header-btn-icon">
                <HeaderActionIcon name="metadata" />
              </span>
              <span className="header-btn-label">元数据管理</span>
            </span>
          </button>
        </div>
      </div>

      <div className="header-right">
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
              <HeaderActionIcon name="autoplay" />
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
