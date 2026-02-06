import type { BrowserMode, SearchField } from '../types'

interface AppHeaderProps {
  headerHeight: number
  mode: BrowserMode
  vectorMode: boolean
  searchField: SearchField
  searchText: string
  currentGrade: number | null
  thumbnailScale: number
  autoPlayEnabled: boolean
  autoPlayInterval: number
  importMenuOpen: boolean
  autoPlayPresets: number[]
  onToggleImportMenu: () => void
  onCloseImportMenu: () => void
  onImportFiles: () => void
  onImportFolders: () => void
  onImportMixed: () => void
  onModeChange: (mode: BrowserMode) => void
  onVectorModeChange: (enabled: boolean) => void
  onSearchFieldChange: (field: SearchField) => void
  onSearchTextChange: (text: string) => void
  onGradeChange: (grade: number | null) => void
  onThumbnailScaleChange: (value: number) => void
  onAutoPlayEnabledChange: (enabled: boolean) => void
  onAutoPlayIntervalChange: (value: number) => void
  onOpenSettings: () => void
}

function AppHeader({
  headerHeight,
  mode,
  vectorMode,
  searchField,
  searchText,
  currentGrade,
  thumbnailScale,
  autoPlayEnabled,
  autoPlayInterval,
  importMenuOpen,
  autoPlayPresets,
  onToggleImportMenu,
  onCloseImportMenu,
  onImportFiles,
  onImportFolders,
  onImportMixed,
  onModeChange,
  onVectorModeChange,
  onSearchFieldChange,
  onSearchTextChange,
  onGradeChange,
  onThumbnailScaleChange,
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
              <button
                type="button"
                onClick={() => {
                  onImportMixed()
                  onCloseImportMenu()
                }}
              >
                导入混合输入
              </button>
            </div>
          ) : null}
        </div>

        <div className="mode-switch" role="group" aria-label="mode-switch">
          <button className={mode === 'image' ? 'is-active' : ''} type="button" onClick={() => onModeChange('image')}>
            图片模式
          </button>
          <button className={mode === 'video' ? 'is-active' : ''} type="button" onClick={() => onModeChange('video')}>
            视频模式
          </button>
        </div>

        <label className="inline-switch">
          <input
            checked={vectorMode}
            disabled={mode !== 'image'}
            type="checkbox"
            onChange={(event) => onVectorModeChange(event.target.checked)}
          />
          向量模式
        </label>

        <div className="search-box">
          <select value={searchField} onChange={(event) => onSearchFieldChange(event.target.value as SearchField)}>
            <option value="all">全部字段</option>
            <option value="name">名称</option>
            <option value="workTitle">作品名</option>
            <option value="circle">社团</option>
            <option value="author">作者</option>
            <option value="tags">Tags</option>
          </select>
          <input
            placeholder="特征检索（名称/社团/作者/tags）"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
          />
        </div>
      </div>

      <div className="header-right">
        <div className="grade-control">
          <button type="button">评分：{currentGrade === null ? '-' : currentGrade}</button>
          <div className="grade-popover">
            {[0, 1, 2, 3, 4, 5].map((grade) => (
              <button key={grade} type="button" onClick={() => onGradeChange(grade === 0 ? null : grade)}>
                {grade === 0 ? '清空' : `${grade} 星`}
              </button>
            ))}
          </div>
        </div>

        <label className="slider-block">
          缩放
          <input
            max={220}
            min={70}
            type="range"
            value={thumbnailScale}
            onChange={(event) => onThumbnailScaleChange(Number(event.target.value))}
          />
        </label>

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

        <button type="button" onClick={onOpenSettings}>
          设置
        </button>
      </div>
    </header>
  )
}

export default AppHeader
