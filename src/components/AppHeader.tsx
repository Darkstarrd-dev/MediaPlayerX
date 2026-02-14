import { useEffect, useState } from 'react'

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

        <div className="mode-switch" role="group" aria-label="mode-switch">
          <button
            aria-label="图片模式"
            className={mode === 'image' ? 'is-active' : ''}
            type="button"
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
            onClick={() => onModeChange('music')}
          >
            <span className="header-btn-content">
              <span className="header-btn-icon">
                <HeaderActionIcon name="music" />
              </span>
              <span className="header-btn-label">音乐模式</span>
            </span>
          </button>
        </div>

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

      <div className="header-right">
        <div className="zoom-stepper" role="group" aria-label="缩略图缩放级别">
          <span className="zoom-stepper-label">缩放级别</span>
          <button
            aria-label="缩小缩略图"
            className="zoom-stepper-btn"
            disabled={!canThumbnailScaleDown}
            type="button"
            onClick={onThumbnailScaleDown}
          >
            <HeaderActionIcon name="minus" />
          </button>
          <span>{thumbnailScaleLevel}</span>
          <button
            aria-label="放大缩略图"
            className="zoom-stepper-btn"
            disabled={!canThumbnailScaleUp}
            type="button"
            onClick={onThumbnailScaleUp}
          >
            <HeaderActionIcon name="plus" />
          </button>
        </div>

        <button
          aria-label="自动播放"
          aria-pressed={autoPlayEnabled}
          className={`auto-play-toggle-btn ${autoPlayEnabled ? 'is-active' : ''}`}
          type="button"
          onClick={() => onAutoPlayEnabledChange(!autoPlayEnabled)}
        >
          <span className="header-btn-content">
            <span className="header-btn-icon">
              <HeaderActionIcon name="autoplay" />
            </span>
            <span className="header-btn-label">自动</span>
          </span>
        </button>

        <select value={autoPlayInterval} onChange={(event) => onAutoPlayIntervalChange(Number(event.target.value))}>
          {autoPlayPresets.map((value) => (
            <option key={value} value={value}>{`${value}s`}</option>
          ))}
        </select>

        <button aria-label="设置" className="header-settings-btn" type="button" onClick={onOpenSettings}>
          <span className="header-btn-content">
            <span className="header-btn-icon">
              <HeaderActionIcon name="settings" />
            </span>
            <span className="header-btn-label">设置</span>
          </span>
        </button>

        <div aria-label="窗口控制" className="window-controls" role="group">
          <button
            aria-label="最小化窗口"
            className="window-control-btn"
            type="button"
            onClick={() => {
              void window.mediaPlayerWindow?.minimize()
            }}
          >
            —
          </button>
          <button
            aria-label={windowMaximized ? '还原窗口' : '最大化窗口'}
            className="window-control-btn"
            type="button"
            onClick={() => {
              void window.mediaPlayerWindow?.toggleMaximize()
            }}
          >
            {windowMaximized ? '❐' : '□'}
          </button>
          <button
            aria-label="关闭窗口"
            className="window-control-btn window-control-btn--close"
            type="button"
            onClick={() => {
              void window.mediaPlayerWindow?.close()
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
