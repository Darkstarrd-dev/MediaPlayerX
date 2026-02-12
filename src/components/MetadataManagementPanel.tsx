import { useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'

import MetadataFetchPanel from './metadata/MetadataFetchPanel'
import type { ParsedExternalMetadata } from '../features/metadata/parseExternalMetadata'

interface MetadataManagementPanelProps {
  visible: boolean
  collapsed: boolean
  panelHeight: number
  panelRef: RefObject<HTMLDivElement | null>
  panelContentRef: RefObject<HTMLDivElement | null>
  metadataPending: boolean
  operationHint: string | null
  onSyncName: () => void
  onSaveParsedMetadata: (parsed: ParsedExternalMetadata) => Promise<void>
  onExpand: () => void
  onStartResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
  defaultFetchText: string
  proxyServer: string
  ehentaiCookies: string
  targetPackageLabel: string
}

function MetadataManagementPanel({
  visible,
  collapsed,
  panelHeight,
  panelRef,
  panelContentRef,
  metadataPending,
  operationHint,
  onSyncName,
  onSaveParsedMetadata,
  onExpand,
  onStartResize,
  layoutLocked,
  defaultFetchText,
  proxyServer,
  ehentaiCookies,
  targetPackageLabel,
}: MetadataManagementPanelProps) {
  const [fetchPanelOpen, setFetchPanelOpen] = useState(false)

  if (!visible) {
    return null
  }

  const syncNameDisabled = metadataPending

  return (
    <>
      {collapsed ? (
        <button aria-label="展开元数据管理容器" className="search-panel-expand-btn" type="button" onClick={onExpand}>
          <span className="search-panel-expand-tip">展开元数据管理容器</span>
        </button>
      ) : (
        <div
          className="vector-panel metadata-manage-panel"
          ref={panelRef}
          style={{ maxHeight: `${panelHeight}px` }}
          data-overlay-close="metadata-manage-panel"
        >
          <div className="vector-panel-content" ref={panelContentRef}>
            <div className="vector-controls metadata-manage-actions">
              <button className="feature-action-btn" type="button" disabled={syncNameDisabled} onClick={onSyncName}>
                同步名称
              </button>
              <button className="feature-action-btn" type="button" onClick={() => setFetchPanelOpen(true)}>
                获取元数据
              </button>
            </div>

            {operationHint ? <p className="manage-panel-hint">{operationHint}</p> : null}
          </div>
        </div>
      )}

      {!collapsed ? (
        <div
          aria-label="调整元数据管理容器高度"
          aria-orientation="horizontal"
          aria-disabled={layoutLocked}
          className={`vector-splitter ${layoutLocked ? 'is-locked' : ''}`}
          role="separator"
          tabIndex={-1}
          onMouseDown={onStartResize}
        />
      ) : null}

      <MetadataFetchPanel
        open={fetchPanelOpen}
        defaultText={defaultFetchText}
        proxyServer={proxyServer}
        ehentaiCookies={ehentaiCookies}
        metadataPending={metadataPending}
        targetPackageLabel={targetPackageLabel}
        onClose={() => setFetchPanelOpen(false)}
        onSaveParsedMetadata={onSaveParsedMetadata}
      />
    </>
  )
}

export default MetadataManagementPanel
