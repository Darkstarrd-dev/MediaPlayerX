import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

import type { BackendErrorRow } from '../features/app/buildBackendErrorRows'
import type { BrowserMode } from '../types'

interface ManagementPanelProps {
  visible: boolean
  collapsed: boolean
  panelHeight: number
  panelRef: RefObject<HTMLDivElement | null>
  panelContentRef: RefObject<HTMLDivElement | null>
  mode: BrowserMode
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pending: boolean
  operationHint: string | null
  errorRows: BackendErrorRow[]
  canDelete: boolean
  canHide: boolean
  canUnhide: boolean
  onDelete: () => void
  onHide: () => void
  onUnhide: () => void
  onClearSelection: () => void
  onCollapse: () => void
  onExpand: () => void
  onStartResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
}

function ManagementPanel({
  visible,
  collapsed,
  panelHeight,
  panelRef,
  panelContentRef,
  mode,
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pending,
  operationHint,
  errorRows,
  canDelete,
  canHide,
  canUnhide,
  onDelete,
  onHide,
  onUnhide,
  onClearSelection,
  onCollapse,
  onExpand,
  onStartResize,
  layoutLocked,
}: ManagementPanelProps) {
  if (!visible) {
    return null
  }

  return (
    <>
      {collapsed ? (
        <button aria-label="展开管理容器" className="search-panel-expand-btn" type="button" onClick={onExpand}>
          <span className="search-panel-expand-tip">展开管理容器</span>
        </button>
      ) : (
        <div className="vector-panel manage-panel" ref={panelRef} style={{ height: `${panelHeight}px` }}>
          <div className="vector-panel-content" ref={panelContentRef}>
            <div className="vector-top-row">
              <div className="search-mode-switch" role="group" aria-label="manage-mode-switch">
                <button className="is-active" type="button">
                  管理模式
                </button>
              </div>

              <div className="vector-top-actions">
                <span>
                  {activeSelectionScope === 'sidebar'
                    ? `已选目录节点: ${sidebarSelectedCount}`
                    : activeSelectionScope === 'image'
                      ? `已选媒体条目: ${imageSelectedCount}`
                      : '未选择条目'}
                </span>
                <button className="vector-collapse-btn" type="button" onClick={onCollapse}>
                  折叠
                </button>
              </div>
            </div>

            <div className="vector-controls manage-panel-actions">
              <button className="vector-search-btn" type="button" disabled={!canDelete || pending} onClick={onDelete}>
                删除
              </button>
              <button className="feature-action-btn" type="button" disabled={!canHide || pending} onClick={onHide}>
                隐藏
              </button>
              <button className="feature-action-btn" type="button" disabled={!canUnhide || pending} onClick={onUnhide}>
                取消隐藏
              </button>
              <button className="feature-action-btn" type="button" disabled={pending} onClick={onClearSelection}>
                清空选择
              </button>
            </div>

            <p className="vector-hint">
              {mode === 'image'
                ? 'Sidebar 与缩略图/文件名选择互斥：任一侧新选择会自动清空另一侧。'
                : '视频模式下仅支持 Sidebar 节点选择与删除。'}
            </p>

            {operationHint ? <p className="manage-panel-hint">{operationHint}</p> : null}

            {errorRows.length > 0 ? (
              <section className="manage-error-list" aria-live="polite">
                <header>
                  <strong>管理模式异常</strong>
                  <button
                    className="feature-action-btn"
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      for (const row of errorRows) {
                        row.onRetry()
                      }
                    }}
                  >
                    清除全部
                  </button>
                </header>
                <ul>
                  {errorRows.map((row) => (
                    <li key={row.key}>
                      <span>{`${row.label}: ${row.message}`}</span>
                      <button className="feature-action-btn" type="button" disabled={pending} onClick={row.onRetry}>
                        清除
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      )}

      {!collapsed ? (
        <div
          aria-label="调整管理容器高度"
          aria-orientation="horizontal"
          aria-disabled={layoutLocked}
          className={`vector-splitter ${layoutLocked ? 'is-locked' : ''}`}
          role="separator"
          tabIndex={-1}
          onMouseDown={onStartResize}
        />
      ) : null}
    </>
  )
}

export default ManagementPanel
