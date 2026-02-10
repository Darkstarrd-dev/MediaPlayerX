import { useEffect, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'

import type { BackendErrorRow } from '../features/app/buildBackendErrorRows'
import type { ManageAdReviewTaskDto } from '../contracts/backend'
import DangerConfirmDialog from './DangerConfirmDialog'

function resolveAdReviewStatusLabel(status: ManageAdReviewTaskDto['status']): string {
  if (status === 'running') {
    return '审核中'
  }
  if (status === 'failed') {
    return '失败'
  }
  return '待复核'
}

function formatPercent(value: number): string {
  const normalized = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  return `${(normalized * 100).toFixed(1)}%`
}

function resolveAdReviewExecutionLabel(task: ManageAdReviewTaskDto): string | null {
  if (!task.execution) {
    return null
  }

  const strategy = task.execution.strategy
  const strategyLabel =
    strategy.mode === 'head-tail'
      ? `head-tail(h=${strategy.head_n}, t=${strategy.tail_n}, stop=${strategy.tail_stop_clean_streak})`
      : 'all'

  return `策略 ${strategyLabel} | 并发 ${task.execution.max_concurrency}`
}

interface ManagementPanelProps {
  visible: boolean
  collapsed: boolean
  panelHeight: number
  panelRef: RefObject<HTMLDivElement | null>
  panelContentRef: RefObject<HTMLDivElement | null>
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pending: boolean
  operationHint: string | null
  errorRows: BackendErrorRow[]
  canDelete: boolean
  canHide: boolean
  canUnhide: boolean
  canStartAdReview: boolean
  onDelete: () => void
  onHide: () => void
  onUnhide: () => void
  onClearSelection: () => void
  adReviewPending: boolean
  adReviewTask: ManageAdReviewTaskDto | null
  adReviewSelectedImageIds: string[]
  onStartAdReview: () => void
  onToggleAdReviewCandidate: (imageId: string, checked?: boolean) => void
  onSelectAllAdReviewCandidates: () => void
  onClearAdReviewCandidates: () => void
  onDeleteAdReviewCandidates: () => void
  onDismissAdReviewTask: () => void
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
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pending,
  operationHint,
  errorRows,
  canDelete,
  canHide,
  canUnhide,
  canStartAdReview,
  onDelete,
  onHide,
  onUnhide,
  onClearSelection,
  adReviewPending,
  adReviewTask,
  adReviewSelectedImageIds,
  onStartAdReview,
  onToggleAdReviewCandidate,
  onSelectAllAdReviewCandidates,
  onClearAdReviewCandidates,
  onDeleteAdReviewCandidates,
  onDismissAdReviewTask,
  onExpand,
  onStartResize,
  layoutLocked,
}: ManagementPanelProps) {
  const [adReviewDeleteConfirmOpen, setAdReviewDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (!adReviewTask || adReviewTask.status !== 'review') {
      setAdReviewDeleteConfirmOpen(false)
    }
  }, [adReviewTask])

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
        <div className="vector-panel manage-panel" ref={panelRef} style={{ maxHeight: `${panelHeight}px` }}>
          <div className="vector-panel-content" ref={panelContentRef}>
            <p className="manage-panel-summary">
              {activeSelectionScope === 'sidebar'
                ? `已选目录节点: ${sidebarSelectedCount}`
                : activeSelectionScope === 'image'
                  ? `已选媒体条目: ${imageSelectedCount}`
                  : '未选择条目'}
            </p>

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
              <button
                className="feature-action-btn"
                type="button"
                disabled={!canStartAdReview || pending || adReviewPending || adReviewTask?.status === 'running'}
                onClick={onStartAdReview}
              >
                广告审核
              </button>
            </div>

            {operationHint ? <p className="manage-panel-hint">{operationHint}</p> : null}

            {adReviewTask ? (
              <section className="manage-ad-review" aria-live="polite">
                <header>
                  <strong>广告审核</strong>
                  <span className={`manage-ad-review-status is-${adReviewTask.status}`}>
                    {resolveAdReviewStatusLabel(adReviewTask.status)}
                  </span>
                </header>

                <p className="manage-ad-review-progress">
                  {`进度 ${Math.round(adReviewTask.progress * 100)}% (${adReviewTask.reviewed_count}/${adReviewTask.total_count})`}
                </p>
                {resolveAdReviewExecutionLabel(adReviewTask) ? (
                  <p className="manage-ad-review-config">{resolveAdReviewExecutionLabel(adReviewTask)}</p>
                ) : null}
                {adReviewTask.audit ? (
                  <div className="manage-ad-review-audit">
                    <p className="manage-ad-review-audit-line">
                      {`来源 known-hash ${adReviewTask.audit.source_distribution.known_hash} | llm(疑似/正常/失败) ${adReviewTask.audit.source_distribution.llm_suspected}/${adReviewTask.audit.source_distribution.llm_clean}/${adReviewTask.audit.source_distribution.llm_failed} | strategy-skip ${adReviewTask.audit.source_distribution.strategy_skipped}`}
                    </p>
                    <p className="manage-ad-review-audit-line">
                      {`命中率 LLM ${formatPercent(adReviewTask.audit.llm_hit_rate)} | 总体 ${formatPercent(adReviewTask.audit.overall_hit_rate)}`}
                    </p>
                  </div>
                ) : null}
                {adReviewTask.message ? <p className="manage-ad-review-message">{adReviewTask.message}</p> : null}
                {adReviewTask.error_detail ? <p className="manage-ad-review-error">{adReviewTask.error_detail}</p> : null}

                {adReviewTask.status === 'review' ? (
                  <>
                    <div className="manage-ad-review-actions">
                      <button
                        className="feature-action-btn"
                        type="button"
                        disabled={adReviewPending || adReviewTask.candidates.length === 0}
                        onClick={onSelectAllAdReviewCandidates}
                      >
                        全选候选
                      </button>
                      <button
                        className="feature-action-btn"
                        type="button"
                        disabled={adReviewPending || adReviewSelectedImageIds.length === 0}
                        onClick={onClearAdReviewCandidates}
                      >
                        清空候选
                      </button>
                      <button
                        className="vector-search-btn"
                        type="button"
                        disabled={adReviewPending || adReviewSelectedImageIds.length === 0}
                        onClick={() => setAdReviewDeleteConfirmOpen(true)}
                      >
                        删除勾选候选
                      </button>
                      <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onDismissAdReviewTask}>
                        关闭结果
                      </button>
                    </div>

                    {adReviewTask.candidates.length > 0 ? (
                      <ul className="manage-ad-review-list">
                        {adReviewTask.candidates.map((candidate) => {
                          const checked = adReviewSelectedImageIds.includes(candidate.image_id)
                          return (
                            <li key={candidate.image_id}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  aria-label={`ad-review-candidate-${candidate.image_id}`}
                                  onChange={(event) => onToggleAdReviewCandidate(candidate.image_id, event.target.checked)}
                                />
                                <span>{`${candidate.display_name} #${candidate.ordinal}`}</span>
                              </label>
                              <span>{candidate.reason}</span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="manage-ad-review-empty">未发现疑似广告图片</p>
                    )}
                  </>
                ) : null}
              </section>
            ) : null}

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

      <DangerConfirmDialog
        open={adReviewDeleteConfirmOpen}
        title="广告审核删除确认"
        description="该操作将永久删除已勾选的疑似广告图片，并同步更新当前审核结果列表。"
        acknowledgeLabel="我了解此操作将永久不可逆地删除勾选的疑似广告图片"
        confirmLabel="确定删除"
        cancelLabel="取消"
        pending={adReviewPending}
        onConfirm={() => {
          onDeleteAdReviewCandidates()
          setAdReviewDeleteConfirmOpen(false)
        }}
        onCancel={() => setAdReviewDeleteConfirmOpen(false)}
      />
    </>
  )
}

export default ManagementPanel
