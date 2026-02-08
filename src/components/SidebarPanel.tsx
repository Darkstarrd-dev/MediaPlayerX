import type { ReactElement } from 'react'

import type { BrowserMode, SidebarNode } from '../types'

interface SidebarPanelProps {
  mode: BrowserMode
  sidebarFocus: 'sidebar' | 'main'
  sidebarRatio: number
  sidebarMinWidth: number
  sidebarFontSize: number
  sidebarCountFontSize: number
  sidebarIndentStep: number
  sidebarVerticalGap: number
  currentRootLabel: string | null
  selectedSidebarNodeId: string | null
  canSetCurrentRoot: boolean
  imageRootNodeId: string | null
  videoRootNodeId: string | null
  imageTreeNodes: SidebarNode[]
  videoTreeNodes: SidebarNode[]
  imageNodeLoadStateById?: Record<string, 'pending' | 'running'>
  selectedPackageId: string
  selectedVideoId: string
  imageHighlightByNode?: boolean
  searchResultMode?: boolean
  searchResultReadonly?: boolean
  canGoToFromSearchMode?: boolean
  playlistIds: string[]
  onSelectNode: (nodeId: string) => void
  onSelectPackage: (packageId: string) => void
  onSelectVideo: (videoId: string) => void
  onCollapseSidebar: () => void
  onSetCurrentRoot: () => void
  onGoToFromSearchMode: () => void
  onResetRoot: () => void
  onToggleVideoPlaylist: (videoId: string, checked: boolean) => void
}

function SidebarPanel({
  mode,
  sidebarFocus,
  sidebarRatio,
  sidebarMinWidth,
  sidebarFontSize,
  sidebarCountFontSize,
  sidebarIndentStep,
  sidebarVerticalGap,
  currentRootLabel,
  selectedSidebarNodeId,
  canSetCurrentRoot,
  imageRootNodeId,
  videoRootNodeId,
  imageTreeNodes,
  videoTreeNodes,
  imageNodeLoadStateById = {},
  selectedPackageId,
  selectedVideoId,
  imageHighlightByNode = false,
  searchResultMode = false,
  searchResultReadonly = false,
  canGoToFromSearchMode = false,
  playlistIds,
  onSelectNode,
  onSelectPackage,
  onSelectVideo,
  onCollapseSidebar,
  onSetCurrentRoot,
  onGoToFromSearchMode,
  onResetRoot,
  onToggleVideoPlaylist,
}: SidebarPanelProps) {
  const rootSet = mode === 'image' ? Boolean(imageRootNodeId) : Boolean(videoRootNodeId)
  const showRootToggle = !(mode === 'image' && searchResultMode)
  const rootToggleLabel = rootSet ? '恢复根目录' : '设为根'
  const rootToggleIcon = rootSet ? '↺' : '⌖'

  const renderNodes = (nodes: SidebarNode[], depth = 0): ReactElement[] => {
    return nodes.flatMap((node) => {
      const isFolder = node.kind === 'folder'
      const isActivePackage =
        mode === 'image' &&
        (imageHighlightByNode ? selectedSidebarNodeId === node.id : node.imageSourceId === selectedPackageId)
      const isActiveVideo = mode === 'video' && node.videoId === selectedVideoId
      const isKeyboardActive = selectedSidebarNodeId === node.id
      const loadState = mode === 'image' ? imageNodeLoadStateById[node.id] : undefined

      const row = (
        <div
          key={node.id}
          data-sidebar-node-id={node.id}
          className={`sidebar-row ${isActivePackage || isActiveVideo ? 'is-active' : ''} ${isKeyboardActive ? 'is-key-active' : ''} ${loadState === 'running' ? 'is-processing' : ''}`}
          style={{ paddingLeft: `${depth * sidebarIndentStep + 10}px` }}
        >
          <span className={`sidebar-bullet ${loadState ? `is-${loadState}` : ''}`} aria-hidden="true" />

          <button
            className="sidebar-label"
            type="button"
            style={{ fontSize: `${sidebarFontSize}px` }}
            onClick={() => {
              if (mode === 'image' && searchResultReadonly) {
                return
              }
              onSelectNode(node.id)
              if (mode === 'image' && node.imageSourceId) {
                onSelectPackage(node.imageSourceId)
              }
              if (node.videoId) {
                onSelectVideo(node.videoId)
              }
            }}
          >
            {node.label}
          </button>

          {mode === 'video' && node.videoId ? (
            <input
              aria-label={`toggle-${node.videoId}`}
              checked={playlistIds.includes(node.videoId)}
              type="checkbox"
              onChange={(event) => onToggleVideoPlaylist(node.videoId!, event.target.checked)}
            />
          ) : null}

          {mode === 'image' && isFolder && node.directImageCount ? (
            <span className="sidebar-count" style={{ fontSize: `${sidebarCountFontSize}px` }}>
              {node.directImageCount}
            </span>
          ) : null}

          {mode === 'image' && !isFolder && node.imageSourceId ? (
            <span className="sidebar-count" style={{ fontSize: `${sidebarCountFontSize}px` }}>
              {node.directImageCount ?? 0}
            </span>
          ) : null}
        </div>
      )

      if (node.children.length === 0) {
        return [row]
      }

      return [row, ...renderNodes(node.children, depth + 1)]
    })
  }

  return (
    <aside
      className={`sidebar ${sidebarFocus === 'sidebar' ? 'is-focus' : ''}`}
      style={{ width: `${sidebarRatio * 100}%`, minWidth: `${sidebarMinWidth}px` }}
    >
      <div className="sidebar-head">
        <button className="sidebar-title-btn" type="button" onClick={onCollapseSidebar}>
          {currentRootLabel ?? '目录结构'}
        </button>

        <div className="sidebar-head-actions">
          {mode === 'image' && searchResultMode ? (
            <button type="button" disabled={!canGoToFromSearchMode} onClick={onGoToFromSearchMode}>
              转到
            </button>
          ) : null}

          {showRootToggle ? (
            <button
              className={`sidebar-head-icon-btn ${rootSet ? 'is-root-set' : ''}`}
              type="button"
              aria-label={rootToggleLabel}
              title={rootToggleLabel}
              disabled={!rootSet && !canSetCurrentRoot}
              onClick={rootSet ? onResetRoot : onSetCurrentRoot}
            >
              <span aria-hidden="true">{rootToggleIcon}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="sidebar-tree" style={{ display: 'flex', flexDirection: 'column', gap: `${sidebarVerticalGap}px` }}>
        {mode === 'image' ? renderNodes(imageTreeNodes) : renderNodes(videoTreeNodes)}
      </div>
    </aside>
  )
}

export default SidebarPanel
