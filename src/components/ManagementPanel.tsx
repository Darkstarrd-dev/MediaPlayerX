import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

import type { BackendErrorRow } from '../features/app/buildBackendErrorRows'
import type { ManageAdReviewTaskDto } from '../contracts/backend'

const AD_REVIEW_CONCURRENCY_OPTIONS = Array.from({ length: 9 }, (_, index) => index + 4)
const AD_REVIEW_WINDOW_OPTIONS = Array.from({ length: 201 }, (_, index) => index)
const AD_REVIEW_STREAK_OPTIONS = Array.from({ length: 200 }, (_, index) => index + 1)

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
  adReviewHideUncheckedNonChecked: boolean
  hasCheckedAdReviewCandidates: boolean
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewMaxConcurrency: number
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  onStartAdReview: () => void
  onToggleHideUncheckedNonChecked: () => void
  onAdReviewStrategyModeChange: (value: 'all' | 'head-tail') => void
  onAdReviewMaxConcurrencyChange: (value: number) => void
  onAdReviewHeadNChange: (value: number) => void
  onAdReviewTailNChange: (value: number) => void
  onAdReviewTailStopCleanStreakChange: (value: number) => void
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
  adReviewHideUncheckedNonChecked,
  hasCheckedAdReviewCandidates,
  adReviewStrategyMode,
  adReviewMaxConcurrency,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  onStartAdReview,
  onToggleHideUncheckedNonChecked,
  onAdReviewStrategyModeChange,
  onAdReviewMaxConcurrencyChange,
  onAdReviewHeadNChange,
  onAdReviewTailNChange,
  onAdReviewTailStopCleanStreakChange,
  onDismissAdReviewTask,
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

            <section className="manage-ad-review-params">
              <header>
                <strong>广告审核参数</strong>
              </header>
              <div className="manage-ad-review-strategy-toggle" role="group" aria-label="广告审核策略切换">
                <button
                  className={adReviewStrategyMode === 'all' ? 'is-active' : ''}
                  type="button"
                  onClick={() => onAdReviewStrategyModeChange('all')}
                >
                  all
                </button>
                <button
                  className={adReviewStrategyMode === 'head-tail' ? 'is-active' : ''}
                  type="button"
                  onClick={() => onAdReviewStrategyModeChange('head-tail')}
                >
                  head-tail
                </button>
              </div>
              <label>
                审核并发
                <select
                  aria-label="广告审核并发"
                  value={adReviewMaxConcurrency}
                  onChange={(event) => onAdReviewMaxConcurrencyChange(Number(event.target.value))}
                >
                  {AD_REVIEW_CONCURRENCY_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              {adReviewStrategyMode === 'head-tail' ? (
                <>
                  <label>
                    头部窗口样本数
                    <select value={adReviewHeadN} onChange={(event) => onAdReviewHeadNChange(Number(event.target.value))}>
                      {AD_REVIEW_WINDOW_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    尾部窗口样本数
                    <select value={adReviewTailN} onChange={(event) => onAdReviewTailNChange(Number(event.target.value))}>
                      {AD_REVIEW_WINDOW_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    尾部停止 clean 连续数
                    <select
                      value={adReviewTailStopCleanStreak}
                      onChange={(event) => onAdReviewTailStopCleanStreakChange(Number(event.target.value))}
                    >
                      {AD_REVIEW_STREAK_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
            </section>

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

                <p className="manage-ad-review-message">
                  {adReviewTask.status === 'review'
                    ? `疑似候选 ${adReviewTask.candidates.length} 张，已同步到缩略图勾选。请在缩略图校正后使用上方“删除”执行清除。`
                    : adReviewTask.message ?? '广告审核任务进行中'}
                </p>

                {adReviewTask.status === 'review' ? (
                  <div className="manage-ad-review-actions">
                    <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onToggleHideUncheckedNonChecked}>
                      {adReviewHideUncheckedNonChecked ? '显示全部图片' : '隐藏未勾选图片'}
                    </button>
                    <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onDismissAdReviewTask}>
                      关闭结果
                    </button>
                    <span className={`manage-ad-review-selection-tag ${hasCheckedAdReviewCandidates ? 'is-active' : ''}`}>
                      {hasCheckedAdReviewCandidates ? '已勾选候选可删除' : '未勾选候选'}
                    </span>
                  </div>
                ) : null}

                {adReviewTask.error_detail ? <p className="manage-ad-review-error">{adReviewTask.error_detail}</p> : null}
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
    </>
  )
}

export default ManagementPanel
