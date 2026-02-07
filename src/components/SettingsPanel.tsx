import { useEffect, useState } from 'react'

import {
  SHORTCUT_DEFINITIONS,
  type ShortcutAction,
  type ShortcutConflict,
  type ShortcutMap,
} from '../shortcuts'

interface SettingsPanelProps {
  settingsOpen: boolean
  headerHeight: number
  settingsFontSize: number
  sidebarRatio: number
  sidebarMinWidth: number
  layoutLocked: boolean
  sidebarFontSize: number
  sidebarCountFontSize: number
  sidebarIndentStep: number
  sidebarVerticalGap: number
  metadataRatio: number
  vectorPanelHeight: number
  thumbnailGap: number
  thumbnailQuality: number
  thumbnailWidth: number
  lmStudioEndpoint: string
  lmStudioModel: string
  shortcuts: ShortcutMap
  shortcutConflicts: ShortcutConflict[]
  onClose: () => void
  onHeaderHeightChange: (value: number) => void
  onSettingsFontSizeChange: (value: number) => void
  onSidebarRatioChange: (value: number) => void
  onSidebarMinWidthChange: (value: number) => void
  onLayoutLockedChange: (value: boolean) => void
  onSidebarFontSizeChange: (value: number) => void
  onSidebarCountFontSizeChange: (value: number) => void
  onSidebarIndentStepChange: (value: number) => void
  onSidebarVerticalGapChange: (value: number) => void
  onMetadataRatioChange: (value: number) => void
  onVectorPanelHeightChange: (value: number) => void
  onThumbnailGapChange: (value: number) => void
  onThumbnailQualityChange: (value: number) => void
  onThumbnailWidthChange: (value: number) => void
  onLmStudioEndpointChange: (value: string) => void
  onLmStudioModelChange: (value: string) => void
  onSetShortcut: (action: ShortcutAction, binding: string) => void
  onResetShortcuts: () => void
}

type SettingsSection = 'layout' | 'model' | 'shortcuts' | 'theme' | 'space3d'

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: 'layout', label: '布局参数' },
  { id: 'model', label: '模型参数' },
  { id: 'shortcuts', label: '快捷键设置' },
  { id: 'theme', label: 'theme 设置' },
  { id: 'space3d', label: '3D 设置' },
]

function SettingsPanel({
  settingsOpen,
  headerHeight,
  settingsFontSize,
  sidebarRatio,
  sidebarMinWidth,
  layoutLocked,
  sidebarFontSize,
  sidebarCountFontSize,
  sidebarIndentStep,
  sidebarVerticalGap,
  metadataRatio,
  vectorPanelHeight,
  thumbnailGap,
  thumbnailQuality,
  thumbnailWidth,
  lmStudioEndpoint,
  lmStudioModel,
  shortcuts,
  shortcutConflicts,
  onClose,
  onHeaderHeightChange,
  onSettingsFontSizeChange,
  onSidebarRatioChange,
  onSidebarMinWidthChange,
  onLayoutLockedChange,
  onSidebarFontSizeChange,
  onSidebarCountFontSizeChange,
  onSidebarIndentStepChange,
  onSidebarVerticalGapChange,
  onMetadataRatioChange,
  onVectorPanelHeightChange,
  onThumbnailGapChange,
  onThumbnailQualityChange,
  onThumbnailWidthChange,
  onLmStudioEndpointChange,
  onLmStudioModelChange,
  onSetShortcut,
  onResetShortcuts,
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('layout')

  useEffect(() => {
    if (!settingsOpen) {
      setActiveSection('layout')
    }
  }, [settingsOpen])

  if (!settingsOpen) {
    return null
  }

  const renderMainSection = () => {
    if (activeSection === 'layout') {
      return (
        <div className="settings-block">
          <h3>布局参数</h3>
          <label className="settings-toggle-row">
            <span>布局锁定</span>
            <input type="checkbox" checked={layoutLocked} onChange={(event) => onLayoutLockedChange(event.target.checked)} />
          </label>
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
            设置面板字体大小 {settingsFontSize}px
            <input
              max={24}
              min={12}
              step={1}
              type="range"
              value={settingsFontSize}
              onChange={(event) => onSettingsFontSizeChange(Number(event.target.value))}
            />
          </label>
          <label>
            Sidebar 比例 {(sidebarRatio * 100).toFixed(0)}%
            <input
              max={0.95}
              min={0}
              step={0.005}
              type="range"
              value={sidebarRatio}
              onChange={(event) => onSidebarRatioChange(Number(event.target.value))}
            />
          </label>
          <label>
            Sidebar 最小宽度 {sidebarMinWidth}px
            <input
              max={640}
              min={80}
              step={2}
              type="range"
              value={sidebarMinWidth}
              onChange={(event) => onSidebarMinWidthChange(Number(event.target.value))}
            />
          </label>
          <label>
            Sidebar 字体大小 {sidebarFontSize}px
            <input
              max={24}
              min={11}
              step={1}
              type="range"
              value={sidebarFontSize}
              onChange={(event) => onSidebarFontSizeChange(Number(event.target.value))}
            />
          </label>
          <label>
            Sidebar 数字字号 {sidebarCountFontSize}px
            <input
              max={22}
              min={10}
              step={1}
              type="range"
              value={sidebarCountFontSize}
              onChange={(event) => onSidebarCountFontSizeChange(Number(event.target.value))}
            />
          </label>
          <label>
            目录结构间隔 {sidebarIndentStep}px
            <input
              max={48}
              min={8}
              step={1}
              type="range"
              value={sidebarIndentStep}
              onChange={(event) => onSidebarIndentStepChange(Number(event.target.value))}
            />
          </label>
          <label>
            目录结构上下间隔 {sidebarVerticalGap}px
            <input
              max={24}
              min={0}
              step={1}
              type="range"
              value={sidebarVerticalGap}
              onChange={(event) => onSidebarVerticalGapChange(Number(event.target.value))}
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
      )
    }

    if (activeSection === 'model') {
      return (
        <div className="settings-block">
          <h3>模型参数</h3>
          <label>
            缩略图间距 {thumbnailGap}px
            <input
              max={24}
              min={0}
              step={1}
              type="range"
              value={thumbnailGap}
              onChange={(event) => onThumbnailGapChange(Number(event.target.value))}
            />
          </label>
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
            缩略图宽度
            <input
              max={2048}
              min={128}
              type="number"
              value={thumbnailWidth}
              onChange={(event) => onThumbnailWidthChange(Number(event.target.value))}
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
      )
    }

    if (activeSection === 'shortcuts') {
      return (
        <div className="settings-block settings-shortcuts">
          <div className="settings-shortcuts-head">
            <h3>快捷键设置</h3>
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
      )
    }

    if (activeSection === 'theme') {
      return (
        <div className="settings-block">
          <h3>theme 设置（占位）</h3>
          <p className="settings-placeholder">预留：后续用于主题色板、字体体系与控件风格映射配置。</p>
          <label>
            主题方案（预留）
            <input disabled type="text" value="coming-soon" readOnly />
          </label>
          <label>
            动效强度（预留）
            <input disabled type="range" min={0} max={100} value={40} readOnly />
          </label>
        </div>
      )
    }

    return (
      <div className="settings-block">
        <h3>3D 设置（占位）</h3>
        <p className="settings-placeholder">预留：后续用于 3D 空间浏览、向量库图片映射与空间导航参数设置。</p>
        <label>
          空间映射模式（预留）
          <input disabled type="text" value="coming-soon" readOnly />
        </label>
        <label>
          深度缩放系数（预留）
          <input disabled type="range" min={0} max={100} value={55} readOnly />
        </label>
      </div>
    )
  }

  return (
    <div className="settings-mask" role="dialog" aria-modal="true">
      <section className="settings-panel" style={{ fontSize: `${settingsFontSize}px` }}>
        <div className="settings-head">
          <h2>设置面板（虚拟）</h2>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="settings-shell">
          <aside className="settings-side" aria-label="设置分组">
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                className={activeSection === section.id ? 'is-active' : ''}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </aside>

          <main className="settings-main">{renderMainSection()}</main>
        </div>
      </section>
    </div>
  )
}

export default SettingsPanel
