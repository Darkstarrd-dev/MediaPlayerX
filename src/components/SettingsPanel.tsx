import {
  SHORTCUT_DEFINITIONS,
  type ShortcutAction,
  type ShortcutConflict,
  type ShortcutMap,
} from '../shortcuts'

interface SettingsPanelProps {
  settingsOpen: boolean
  headerHeight: number
  sidebarRatio: number
  metadataRatio: number
  vectorPanelHeight: number
  thumbnailQuality: number
  thumbnailMaxEdge: number
  lmStudioEndpoint: string
  lmStudioModel: string
  shortcuts: ShortcutMap
  shortcutConflicts: ShortcutConflict[]
  onClose: () => void
  onHeaderHeightChange: (value: number) => void
  onSidebarRatioChange: (value: number) => void
  onMetadataRatioChange: (value: number) => void
  onVectorPanelHeightChange: (value: number) => void
  onThumbnailQualityChange: (value: number) => void
  onThumbnailMaxEdgeChange: (value: number) => void
  onLmStudioEndpointChange: (value: string) => void
  onLmStudioModelChange: (value: string) => void
  onSetShortcut: (action: ShortcutAction, binding: string) => void
  onResetShortcuts: () => void
}

function SettingsPanel({
  settingsOpen,
  headerHeight,
  sidebarRatio,
  metadataRatio,
  vectorPanelHeight,
  thumbnailQuality,
  thumbnailMaxEdge,
  lmStudioEndpoint,
  lmStudioModel,
  shortcuts,
  shortcutConflicts,
  onClose,
  onHeaderHeightChange,
  onSidebarRatioChange,
  onMetadataRatioChange,
  onVectorPanelHeightChange,
  onThumbnailQualityChange,
  onThumbnailMaxEdgeChange,
  onLmStudioEndpointChange,
  onLmStudioModelChange,
  onSetShortcut,
  onResetShortcuts,
}: SettingsPanelProps) {
  if (!settingsOpen) {
    return null
  }

  return (
    <div className="settings-mask" role="dialog" aria-modal="true">
      <section className="settings-panel">
        <div className="settings-head">
          <h2>设置面板（虚拟）</h2>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="settings-grid">
          <div className="settings-block">
            <h3>布局参数</h3>
            <label>
              Header 高度 {headerHeight}px
              <input
                max={96}
                min={48}
                type="range"
                value={headerHeight}
                onChange={(event) => onHeaderHeightChange(Number(event.target.value))}
              />
            </label>
            <label>
              Sidebar 比例 {(sidebarRatio * 100).toFixed(0)}%
              <input
                max={0.45}
                min={0.16}
                step={0.01}
                type="range"
                value={sidebarRatio}
                onChange={(event) => onSidebarRatioChange(Number(event.target.value))}
              />
            </label>
            <label>
              元数据面板比例 {(metadataRatio * 100).toFixed(0)}%
              <input
                max={0.45}
                min={0.2}
                step={0.01}
                type="range"
                value={metadataRatio}
                onChange={(event) => onMetadataRatioChange(Number(event.target.value))}
              />
            </label>
            <label>
              向量容器高度 {vectorPanelHeight}px
              <input
                max={320}
                min={120}
                step={2}
                type="range"
                value={vectorPanelHeight}
                onChange={(event) => onVectorPanelHeightChange(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="settings-block">
            <h3>缩略图 / 模型参数</h3>
            <label>
              缩略图质量
              <input
                max={100}
                min={1}
                type="number"
                value={thumbnailQuality}
                onChange={(event) => onThumbnailQualityChange(Number(event.target.value))}
              />
            </label>
            <label>
              缩略图最长边
              <input
                max={2048}
                min={128}
                type="number"
                value={thumbnailMaxEdge}
                onChange={(event) => onThumbnailMaxEdgeChange(Number(event.target.value))}
              />
            </label>
            <label>
              LM Studio Endpoint
              <input type="text" value={lmStudioEndpoint} onChange={(event) => onLmStudioEndpointChange(event.target.value)} />
            </label>
            <label>
              Embedding 模型
              <input type="text" value={lmStudioModel} onChange={(event) => onLmStudioModelChange(event.target.value)} />
            </label>
          </div>

          <div className="settings-block settings-shortcuts">
            <div className="settings-shortcuts-head">
              <h3>快捷键重映射</h3>
              <button type="button" onClick={onResetShortcuts}>
                恢复默认
              </button>
            </div>

            <div className="shortcut-list">
              {SHORTCUT_DEFINITIONS.map((definition) => (
                <label key={definition.action}>
                  <span>{definition.label}</span>
                  <input
                    type="text"
                    value={shortcuts[definition.action]}
                    onChange={(event) => onSetShortcut(definition.action, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="shortcut-conflicts">
              <strong>冲突检测</strong>
              {shortcutConflicts.length === 0 ? (
                <p>当前无冲突。</p>
              ) : (
                <ul>
                  {shortcutConflicts.map((conflict) => (
                    <li key={`${conflict.scope}-${conflict.combo}`}>
                      {`${conflict.scope} 范围：${conflict.combo} -> ${conflict.actions.join(', ')}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SettingsPanel
