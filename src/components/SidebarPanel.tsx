import type { ReactElement } from 'react'

import type { BrowserMode, SidebarNode } from '../types'

interface SidebarPanelProps {
  mode: BrowserMode
  sidebarFocus: 'sidebar' | 'main'
  sidebarRatio: number
  imageRootNodeId: string | null
  videoRootNodeId: string | null
  imageTreeNodes: SidebarNode[]
  videoTreeNodes: SidebarNode[]
  selectedPackageId: string
  selectedVideoId: string
  playlistIds: string[]
  getPackageImageCount: (packageId: string) => number
  onSelectPackage: (packageId: string) => void
  onSelectVideo: (videoId: string) => void
  onSetCurrentRoot: (nodeId: string) => void
  onResetRoot: () => void
  onToggleVideoPlaylist: (videoId: string, checked: boolean) => void
}

function SidebarPanel({
  mode,
  sidebarFocus,
  sidebarRatio,
  imageRootNodeId,
  videoRootNodeId,
  imageTreeNodes,
  videoTreeNodes,
  selectedPackageId,
  selectedVideoId,
  playlistIds,
  getPackageImageCount,
  onSelectPackage,
  onSelectVideo,
  onSetCurrentRoot,
  onResetRoot,
  onToggleVideoPlaylist,
}: SidebarPanelProps) {
  const renderNodes = (nodes: SidebarNode[], depth = 0): ReactElement[] => {
    return nodes.flatMap((node) => {
      const isFolder = node.kind === 'folder'
      const isActivePackage = mode === 'image' && node.packageId === selectedPackageId
      const isActiveVideo = mode === 'video' && node.videoId === selectedVideoId

      const row = (
        <div
          key={node.id}
          className={`sidebar-row ${isActivePackage || isActiveVideo ? 'is-active' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
        >
          <button
            className="sidebar-label"
            type="button"
            onClick={() => {
              if (node.packageId) {
                onSelectPackage(node.packageId)
              }
              if (node.videoId) {
                onSelectVideo(node.videoId)
              }
            }}
          >
            {node.label}
          </button>

          <button className="sidebar-mini-btn" type="button" onClick={() => onSetCurrentRoot(node.id)}>
            设为根
          </button>

          {mode === 'video' && node.videoId ? (
            <input
              aria-label={`toggle-${node.videoId}`}
              checked={playlistIds.includes(node.videoId)}
              type="checkbox"
              onChange={(event) => onToggleVideoPlaylist(node.videoId!, event.target.checked)}
            />
          ) : null}

          {!isFolder && mode === 'image' && node.packageId ? (
            <span className="sidebar-count">{getPackageImageCount(node.packageId)}</span>
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
    <aside className={`sidebar ${sidebarFocus === 'sidebar' ? 'is-focus' : ''}`} style={{ width: `${sidebarRatio * 100}%` }}>
      <div className="sidebar-head">
        <strong>目录结构</strong>
        {mode === 'image' && imageRootNodeId ? (
          <button type="button" onClick={onResetRoot}>
            恢复数据库根
          </button>
        ) : null}
        {mode === 'video' && videoRootNodeId ? (
          <button type="button" onClick={onResetRoot}>
            恢复数据库根
          </button>
        ) : null}
      </div>

      <div className="sidebar-tree">{mode === 'image' ? renderNodes(imageTreeNodes) : renderNodes(videoTreeNodes)}</div>
    </aside>
  )
}

export default SidebarPanel
