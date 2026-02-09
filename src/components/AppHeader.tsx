import type { BrowserMode } from '../types'

export interface AppHeaderProps {
  headerHeight: number
  mode: BrowserMode
  searchPanelOpen: boolean
  vectorUniverseOpen: boolean
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
  onOpenVectorUniverse: () => void
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
  vectorUniverseOpen,
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
  onOpenVectorUniverse,
  onThumbnailScaleDown,
  onThumbnailScaleUp,
  onAutoPlayEnabledChange,
  onAutoPlayIntervalChange,
  onOpenSettings,
}: AppHeaderProps) {
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
          className={`task-status-btn ${taskStatusLabel === '加载中' ? 'is-busy' : 'is-idle'} ${importTaskPanelOpen ? 'is-open' : ''}`}
          type="button"
          onClick={onToggleImportTaskPanel}
        >
          {taskStatusLabel}
        </button>

        <div className="mode-switch" role="group" aria-label="mode-switch">
          <button className={mode === 'image' ? 'is-active' : ''} type="button" onClick={() => onModeChange('image')}>
            图片模式
          </button>
          <button className={mode === 'video' ? 'is-active' : ''} type="button" onClick={() => onModeChange('video')}>
            视频模式
          </button>
        </div>

        <button
          className={`search-trigger-btn ${searchPanelOpen ? 'is-active' : ''}`}
          disabled={mode !== 'image'}
          type="button"
          onClick={onToggleSearchPanel}
        >
          检索
        </button>

        <button
          className={`search-trigger-btn vector-universe-trigger ${vectorUniverseOpen ? 'is-active' : ''}`}
          type="button"
          onClick={onOpenVectorUniverse}
        >
          向量宇宙
        </button>
      </div>

      <div className="header-right">
        <div className="zoom-stepper" role="group" aria-label="缩略图缩放级别">
          <span>缩放级别</span>
          <button
            aria-label="缩小缩略图"
            className="zoom-stepper-btn"
            disabled={!canThumbnailScaleDown}
            type="button"
            onClick={onThumbnailScaleDown}
          >
            -
          </button>
          <span>{thumbnailScaleLevel}</span>
          <button
            aria-label="放大缩略图"
            className="zoom-stepper-btn"
            disabled={!canThumbnailScaleUp}
            type="button"
            onClick={onThumbnailScaleUp}
          >
            +
          </button>
        </div>

        <label className="inline-switch">
          <input
            checked={autoPlayEnabled}
            type="checkbox"
            onChange={(event) => onAutoPlayEnabledChange(event.target.checked)}
          />
          自动播放
        </label>

        <select value={autoPlayInterval} onChange={(event) => onAutoPlayIntervalChange(Number(event.target.value))}>
          {autoPlayPresets.map((value) => (
            <option key={value} value={value}>{`${value}s`}</option>
          ))}
        </select>

        <button className="header-settings-btn" type="button" onClick={onOpenSettings}>
          设置
        </button>
      </div>
    </header>
  )
}

export default AppHeader
