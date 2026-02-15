import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactElement } from 'react'

import { MainUiIcon } from './MainUiIcon'
import { useI18n } from '../i18n/useI18n'
import type { BrowserMode, SidebarNode } from '../types'

function resolveFirstAudioId(node: SidebarNode): string | null {
  if (node.audioId) {
    return node.audioId
  }

  for (const child of node.children) {
    const candidate = resolveFirstAudioId(child)
    if (candidate) {
      return candidate
    }
  }

  return null
}

function canFolderCollapse(mode: BrowserMode, node: SidebarNode, imageNodeType: SidebarNode['imageNodeType']): boolean {
  if (node.kind !== 'folder') {
    return false
  }
  if (mode === 'image' && imageNodeType !== 'folder') {
    return false
  }
  return node.children.length > 0
}

function collectCollapsibleFolderIds(mode: BrowserMode, nodes: SidebarNode[]): Set<string> {
  const ids = new Set<string>()
  const walk = (currentNodes: SidebarNode[]) => {
    for (const node of currentNodes) {
      const imageNodeType = node.imageNodeType ?? (node.kind === 'folder' ? 'folder' : 'package')
      if (canFolderCollapse(mode, node, imageNodeType)) {
        ids.add(node.id)
      }
      if (node.children.length > 0) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return ids
}

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
  musicRootNodeId: string | null
  imageTreeNodes: SidebarNode[]
  videoTreeNodes: SidebarNode[]
  audioTreeNodes: SidebarNode[]
  imageNodeLoadStateById?: Record<string, 'pending' | 'running'>
  selectedPackageId: string
  selectedVideoId: string
  selectedAudioId: string
  imageHighlightByNode?: boolean
  searchResultMode?: boolean
  searchResultReadonly?: boolean
  canGoToFromSearchMode?: boolean
  manageMode?: boolean
  metadataManageMode?: boolean
  checkedSidebarNodeIds?: ReadonlySet<string>
  playlistIds: string[]
  audioPlaylistIds: string[]
  onSelectNode: (nodeId: string) => void
  onSelectPackage: (packageId: string) => void
  onSelectVideo: (videoId: string) => void
  onSelectAudio: (audioId: string) => void
  onCollapseSidebar: () => void
  onSetCurrentRoot: () => void
  onGoToFromSearchMode: () => void
  onResetRoot: () => void
  onToggleVideoPlaylist: (videoId: string, checked: boolean) => void
  onToggleAudioPlaylist: (audioId: string, checked: boolean) => void
  onToggleManageNode?: (nodeId: string, shiftKey: boolean) => void
  onCheckManageNode?: (nodeId: string) => void
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
  musicRootNodeId,
  imageTreeNodes,
  videoTreeNodes,
  audioTreeNodes,
  imageNodeLoadStateById = {},
  selectedPackageId,
  selectedVideoId,
  selectedAudioId,
  imageHighlightByNode = false,
  searchResultMode = false,
  searchResultReadonly = false,
  canGoToFromSearchMode = false,
  manageMode = false,
  metadataManageMode = false,
  checkedSidebarNodeIds,
  playlistIds,
  audioPlaylistIds,
  onSelectNode,
  onSelectPackage,
  onSelectVideo,
  onSelectAudio,
  onCollapseSidebar,
  onSetCurrentRoot,
  onGoToFromSearchMode,
  onResetRoot,
  onToggleVideoPlaylist,
  onToggleAudioPlaylist,
  onToggleManageNode,
  onCheckManageNode,
}: SidebarPanelProps) {
  const { t } = useI18n()
  const checkedNodes = checkedSidebarNodeIds ?? new Set<string>()
  const [collapsedImageFolderNodeIds, setCollapsedImageFolderNodeIds] = useState<Set<string>>(new Set())
  const checkerDragCleanupRef = useRef<(() => void) | null>(null)
  const checkerDragStateRef = useRef<{
    startX: number
    startY: number
    startNodeId: string
    dragStarted: boolean
    visitedNodeIds: Set<string>
  } | null>(null)
  const activeTreeNodes = mode === 'image' ? imageTreeNodes : mode === 'video' ? videoTreeNodes : audioTreeNodes

  const detachCheckerDragListeners = useCallback(() => {
    const cleanup = checkerDragCleanupRef.current
    if (cleanup) {
      checkerDragCleanupRef.current = null
      cleanup()
    }
    checkerDragStateRef.current = null
  }, [])

  useEffect(
    () => () => {
      detachCheckerDragListeners()
    },
    [detachCheckerDragListeners],
  )

  const startCheckerDragSelection = (startNodeId: string, event: ReactMouseEvent<HTMLInputElement>) => {
    if (!manageStyleEnabled || !onCheckManageNode || event.button !== 0) {
      return
    }

    detachCheckerDragListeners()
    checkerDragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startNodeId,
      dragStarted: false,
      visitedNodeIds: new Set<string>(),
    }

    const applyCheckedFromElement = (element: Element | null) => {
      const state = checkerDragStateRef.current
      if (!state) {
        return
      }

      const row = element?.closest<HTMLElement>('[data-sidebar-node-id]')
      const nodeId = row?.dataset.sidebarNodeId
      if (!nodeId || state.visitedNodeIds.has(nodeId)) {
        return
      }

      state.visitedNodeIds.add(nodeId)
      onCheckManageNode(nodeId)
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      const state = checkerDragStateRef.current
      if (!state) {
        return
      }

      const movedEnough = Math.abs(moveEvent.clientX - state.startX) >= 2 || Math.abs(moveEvent.clientY - state.startY) >= 2
      if (!state.dragStarted && !movedEnough) {
        return
      }

      if (!state.dragStarted) {
        state.dragStarted = true
        if (!state.visitedNodeIds.has(state.startNodeId)) {
          state.visitedNodeIds.add(state.startNodeId)
          onCheckManageNode(state.startNodeId)
        }
      }

      applyCheckedFromElement(document.elementFromPoint(moveEvent.clientX, moveEvent.clientY))
    }

    const onMouseUp = () => {
      detachCheckerDragListeners()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    checkerDragCleanupRef.current = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }

  useEffect(() => {
    const allowedIds = collectCollapsibleFolderIds(mode, activeTreeNodes)
    setCollapsedImageFolderNodeIds((previous) => {
      if (previous.size === 0) {
        return previous
      }
      const next = new Set<string>()
      for (const nodeId of previous) {
        if (allowedIds.has(nodeId)) {
          next.add(nodeId)
        }
      }
      return next.size === previous.size ? previous : next
    })
  }, [activeTreeNodes, mode])

  const manageStyleEnabled = manageMode || metadataManageMode
  const rootSet = mode === 'image' ? Boolean(imageRootNodeId) : mode === 'video' ? Boolean(videoRootNodeId) : Boolean(musicRootNodeId)
  const showRootToggle = !searchResultMode
  const rootToggleLabel = rootSet ? t('a11y.sidebar.restoreRoot') : t('a11y.sidebar.setAsRoot')
  const rootToggleIconName = rootSet ? 'return' : 'setRoot'

  const renderNodes = (nodes: SidebarNode[], depth = 0): ReactElement[] => {
    return nodes.flatMap((node) => {
      const isFolder = node.kind === 'folder'
      const imageNodeType = node.imageNodeType ?? (isFolder ? 'folder' : 'package')
      const isActivePackage =
        mode === 'image' &&
        (imageHighlightByNode ? selectedSidebarNodeId === node.id : node.imageSourceId === selectedPackageId)
      const isActiveVideo = mode === 'video' && node.videoId === selectedVideoId
      const isActiveAudio = mode === 'music' && (selectedSidebarNodeId === node.id || node.audioId === selectedAudioId)
      const isKeyboardActive = selectedSidebarNodeId === node.id
      const loadState = mode === 'image' ? imageNodeLoadStateById[node.id] : undefined
      const hasOwnImages = imageNodeType === 'package' || imageNodeType === 'directory'
      const imageFolderCollapsible = canFolderCollapse(mode, node, imageNodeType)
      const imageFolderCollapsed = imageFolderCollapsible && collapsedImageFolderNodeIds.has(node.id)
      const visibleImageCount = node.directImageCount ?? 0
      const descendantNodeCount = node.descendantNodeCount ?? node.children.length
      const directAudioCount = node.directAudioCount ?? 0
      const descendantAudioFolderCount = node.descendantAudioFolderCount ?? 0
      const musicCountIsTrack = directAudioCount > 0
      const musicCountValue = musicCountIsTrack ? directAudioCount : descendantAudioFolderCount
      const musicCountLabel = musicCountIsTrack
        ? t('a11y.sidebar.musicTrackCount', { count: musicCountValue })
        : t('a11y.sidebar.musicFolderCount', { count: musicCountValue })
      const musicCountClassName = `sidebar-count ${musicCountIsTrack ? 'sidebar-count-images' : 'sidebar-count-packages'}`
      const imageCountLabel = hasOwnImages
        ? t('a11y.sidebar.imageCount', { count: visibleImageCount })
        : t('a11y.sidebar.nodeCount', { count: descendantNodeCount })

      const row = (
        <div
          key={node.id}
          data-sidebar-node-id={node.id}
            className={`sidebar-row ${manageStyleEnabled ? 'is-manage' : ''} ${checkedNodes.has(node.id) ? 'is-selected' : ''} ${isActivePackage || isActiveVideo || isActiveAudio ? 'is-active' : ''} ${isKeyboardActive ? 'is-key-active' : ''} ${loadState === 'running' ? 'is-processing' : ''}`}
          style={{ paddingLeft: `${depth * sidebarIndentStep + 10}px` }}
        >
          <span className={`sidebar-bullet ${loadState ? `is-${loadState}` : ''}`} aria-hidden="true" />

          {manageStyleEnabled ? (
            <input
              className="sidebar-manage-checker"
              type="checkbox"
              readOnly
              checked={checkedNodes.has(node.id)}
              aria-label={t('a11y.sidebar.manageNode', { label: node.label })}
              onMouseDown={(event) => {
                event.stopPropagation()
                startCheckerDragSelection(node.id, event)
              }}
              onClick={(event) => {
                event.stopPropagation()
                onToggleManageNode?.(node.id, event.shiftKey)
              }}
            />
          ) : null}

          <button
            className={`sidebar-label ${imageFolderCollapsible ? 'is-collapsible' : ''} ${imageFolderCollapsed ? 'is-collapsed' : ''}`}
            type="button"
            style={{ fontSize: `${sidebarFontSize}px` }}
            title={
              imageFolderCollapsible
                ? imageFolderCollapsed
                  ? t('tip.sidebar.expandSubfolder')
                  : t('tip.sidebar.collapseSubfolder')
                : undefined
            }
            onClick={(event) => {
              if (metadataManageMode && (!checkedNodes.has(node.id) || event.shiftKey)) {
                onToggleManageNode?.(node.id, event.shiftKey)
              }
              if (mode === 'image' && searchResultReadonly) {
                return
              }
              onSelectNode(node.id)
              if (mode === 'image' && node.imageSourceId) {
                onSelectPackage(node.imageSourceId)
              }
              if (mode === 'music') {
                const targetAudioId = resolveFirstAudioId(node)
                if (targetAudioId) {
                  onSelectAudio(targetAudioId)
                }
                return
              }
              if (node.videoId) {
                onSelectVideo(node.videoId)
              }
            }}
            onDoubleClick={() => {
              if (!imageFolderCollapsible) {
                return
              }
              setCollapsedImageFolderNodeIds((previous) => {
                const next = new Set(previous)
                if (next.has(node.id)) {
                  next.delete(node.id)
                } else {
                  next.add(node.id)
                }
                return next
              })
            }}
          >
            {node.label}
          </button>

          {mode === 'video' && node.videoId ? (
            <input
              aria-label={t('a11y.sidebar.toggleVideo', { id: node.videoId })}
              checked={playlistIds.includes(node.videoId)}
              type="checkbox"
              onChange={(event) => onToggleVideoPlaylist(node.videoId!, event.target.checked)}
            />
          ) : null}

          {mode === 'music' && node.kind === 'audio' && node.audioId ? (
            <input
              aria-label={t('a11y.sidebar.toggleAudio', { id: node.audioId })}
              checked={audioPlaylistIds.includes(node.audioId)}
              type="checkbox"
              onChange={(event) => onToggleAudioPlaylist(node.audioId!, event.target.checked)}
            />
          ) : null}

          {mode === 'image' ? (
            <span className="sidebar-counts" style={{ fontSize: `${sidebarCountFontSize}px` }}>
              <span
                className={`sidebar-count ${hasOwnImages ? 'sidebar-count-images' : 'sidebar-count-packages'}`}
                aria-label={imageCountLabel}
                title={imageCountLabel}
              >
                {hasOwnImages ? visibleImageCount : descendantNodeCount}
              </span>
            </span>
          ) : null}

          {mode === 'music' ? (
            <span className="sidebar-counts" style={{ fontSize: `${sidebarCountFontSize}px` }}>
              <span className={musicCountClassName} aria-label={musicCountLabel} title={musicCountLabel}>
                {musicCountValue}
              </span>
            </span>
          ) : null}
        </div>
      )

      if (node.children.length === 0 || imageFolderCollapsed) {
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
          {searchResultMode ? (
            <button
              className="sidebar-head-icon-btn"
              type="button"
              aria-label={t('a11y.common.back')}
              title={t('tip.common.back')}
              disabled={!canGoToFromSearchMode}
              onClick={onGoToFromSearchMode}
            >
              <MainUiIcon name="return" />
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
              <MainUiIcon name={rootToggleIconName} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="sidebar-tree" style={{ display: 'flex', flexDirection: 'column', gap: `${sidebarVerticalGap}px` }}>
        {mode === 'image' ? renderNodes(imageTreeNodes) : mode === 'video' ? renderNodes(videoTreeNodes) : renderNodes(audioTreeNodes)}
      </div>
    </aside>
  )
}

export default SidebarPanel
