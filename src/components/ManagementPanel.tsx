import { useEffect, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'

import type { BackendErrorRow } from '../features/app/buildBackendErrorRows'
import type { ManageAdReviewTaskDto } from '../contracts/backend'
import { useI18n } from '../i18n/useI18n'

const AD_REVIEW_CONCURRENCY_OPTIONS = Array.from({ length: 9 }, (_, index) => index + 4)
const AD_REVIEW_WINDOW_OPTIONS = Array.from({ length: 201 }, (_, index) => index)
const AD_REVIEW_STREAK_OPTIONS = Array.from({ length: 200 }, (_, index) => index + 1)

function formatPercent(value: number): string {
  const normalized = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  return `${(normalized * 100).toFixed(1)}%`
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
  adReviewFeatureVisible: boolean
  canExecuteAdReview: boolean
  onDelete: () => void
  onHide: () => void
  onUnhide: () => void
  onClearSelection: () => void
  adReviewPending: boolean
  adReviewDeletePending?: boolean
  adReviewTask: ManageAdReviewTaskDto | null
  adReviewHideUncheckedNonChecked: boolean
  hasCheckedAdReviewCandidates: boolean
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewMaxConcurrency: number
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  onStartAdReview: () => void
  onPauseAdReview: () => void
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
  adReviewFeatureVisible,
  canExecuteAdReview,
  onDelete,
  onHide,
  onUnhide,
  onClearSelection,
  adReviewPending,
  adReviewDeletePending = false,
  adReviewTask,
  adReviewHideUncheckedNonChecked,
  hasCheckedAdReviewCandidates,
  adReviewStrategyMode,
  adReviewMaxConcurrency,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  onStartAdReview,
  onPauseAdReview,
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
  const { t } = useI18n()
  const [adReviewPanelOpen, setAdReviewPanelOpen] = useState(false)
  const adReviewRunning = adReviewTask?.status === 'running'
  const effectivePanelHeight = adReviewPanelOpen ? Math.max(panelHeight, 320) : panelHeight

  const resolveStatusLabel = (status: ManageAdReviewTaskDto['status']): string => {
    if (status === 'pending') {
      return t('ui.manage.status.pending')
    }
    if (status === 'running') {
      return t('ui.manage.status.running')
    }
    if (status === 'paused') {
      return t('ui.manage.status.paused')
    }
    if (status === 'failed') {
      return t('ui.manage.status.failed')
    }
    return t('ui.manage.status.review')
  }

  const resolveExecutionLabel = (task: ManageAdReviewTaskDto): string | null => {
    if (!task.execution) {
      return null
    }

    const strategy = task.execution.strategy
    const strategyLabel =
      strategy.mode === 'head-tail'
        ? t('ui.manage.executionStrategyHeadTail', {
            head: strategy.head_n,
            tail: strategy.tail_n,
            stop: strategy.tail_stop_clean_streak,
          })
        : t('ui.manage.executionStrategyAll')

    return t('ui.manage.executionSummary', {
      strategy: strategyLabel,
      concurrency: task.execution.max_concurrency,
    })
  }

  useEffect(() => {
    if (!visible || !adReviewFeatureVisible) {
      setAdReviewPanelOpen(false)
    }
  }, [adReviewFeatureVisible, visible])

  if (!visible) {
    return null
  }

  return (
    <>
      {collapsed ? (
        <button aria-label={t('a11y.common.expandManagePanel')} className="search-panel-expand-btn" type="button" onClick={onExpand}>
          <span className="search-panel-expand-tip">{t('ui.manage.expandPanelTip')}</span>
        </button>
      ) : (
        <div
          className="vector-panel manage-panel"
          ref={panelRef}
          style={{ height: `${effectivePanelHeight}px` }}
          data-overlay-close="manage-panel"
        >
          <div className="vector-panel-content" ref={panelContentRef}>
            <p className="manage-panel-summary">
              {activeSelectionScope === 'sidebar'
                ? t('ui.manage.selectedSidebarNodes', { count: sidebarSelectedCount })
                : activeSelectionScope === 'image'
                  ? t('ui.manage.selectedMediaItems', { count: imageSelectedCount })
                  : t('ui.manage.noSelection')}
            </p>

            <div className="vector-controls manage-panel-actions">
              <button className="vector-search-btn" type="button" disabled={!canDelete || pending} onClick={onDelete}>
                {adReviewDeletePending ? t('ui.manage.deleting') : t('ui.manage.delete')}
              </button>
              <button className="feature-action-btn" type="button" disabled={!canHide || pending} onClick={onHide}>
                {t('tip.common.hide')}
              </button>
              <button className="feature-action-btn" type="button" disabled={!canUnhide || pending} onClick={onUnhide}>
                {t('tip.common.unhide')}
              </button>
              <button className="feature-action-btn" type="button" disabled={pending} onClick={onClearSelection}>
                {t('tip.common.clearSelection')}
              </button>
              {adReviewFeatureVisible ? (
                <button
                  className={`feature-action-btn ${adReviewPanelOpen ? 'is-active' : ''}`}
                  type="button"
                  disabled={pending || adReviewPending}
                  onClick={() => setAdReviewPanelOpen((previous) => !previous)}
                >
                  {adReviewPanelOpen ? t('ui.manage.closeAdReview') : t('ui.manage.adReviewTitle')}
                </button>
              ) : null}
            </div>

            {adReviewFeatureVisible && adReviewPanelOpen ? (
              <section className="manage-ad-review-params">
                <header>
                  <strong>{t('ui.manage.paramsTitle')}</strong>
                </header>
                <div className="manage-ad-review-controls-row" role="group" aria-label={t('a11y.manage.controls')}>
                  <button
                    className={`manage-ad-review-icon-btn ${adReviewStrategyMode === 'head-tail' ? 'is-active' : ''}`}
                    type="button"
                    aria-label={t('a11y.manage.strategyToggle')}
                    title={
                      adReviewStrategyMode === 'head-tail'
                        ? t('tip.manage.strategyHeadTailToAll')
                        : t('tip.manage.strategyAllToHeadTail')
                    }
                    onClick={() => onAdReviewStrategyModeChange(adReviewStrategyMode === 'head-tail' ? 'all' : 'head-tail')}
                  >
                    <span aria-hidden="true">{adReviewStrategyMode === 'head-tail' ? '⇵' : '∞'}</span>
                  </button>

                  <button
                    className={`manage-ad-review-icon-btn manage-ad-review-exec-btn ${adReviewRunning ? 'is-running' : ''}`}
                    type="button"
                    aria-label={adReviewRunning ? t('a11y.manage.pause') : t('a11y.manage.start')}
                    title={adReviewRunning ? t('a11y.manage.pause') : t('a11y.manage.start')}
                    disabled={adReviewPending || (!adReviewRunning && !canExecuteAdReview)}
                    onClick={adReviewRunning ? onPauseAdReview : onStartAdReview}
                  >
                    <span aria-hidden="true">{adReviewRunning ? '⏸' : '▶'}</span>
                  </button>

                  <label className="manage-ad-review-inline-field">
                    <span>{t('ui.manage.concurrency')}</span>
                    <select
                      aria-label={t('a11y.manage.concurrency')}
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

                  <label className={`manage-ad-review-inline-field ${adReviewStrategyMode !== 'head-tail' ? 'is-disabled' : ''}`}>
                    <span>{t('ui.manage.headWindow')}</span>
                    <select
                      aria-label={t('a11y.manage.headWindow')}
                      disabled={adReviewStrategyMode !== 'head-tail'}
                      value={adReviewHeadN}
                      onChange={(event) => onAdReviewHeadNChange(Number(event.target.value))}
                    >
                      {AD_REVIEW_WINDOW_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={`manage-ad-review-inline-field ${adReviewStrategyMode !== 'head-tail' ? 'is-disabled' : ''}`}>
                    <span>{t('ui.manage.tailWindow')}</span>
                    <select
                      aria-label={t('a11y.manage.tailWindow')}
                      disabled={adReviewStrategyMode !== 'head-tail'}
                      value={adReviewTailN}
                      onChange={(event) => onAdReviewTailNChange(Number(event.target.value))}
                    >
                      {AD_REVIEW_WINDOW_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label
                    className={`manage-ad-review-inline-field manage-ad-review-inline-field-wide ${
                      adReviewStrategyMode !== 'head-tail' ? 'is-disabled' : ''
                    }`}
                  >
                    <span>{t('ui.manage.tailStopClean')}</span>
                    <select
                      aria-label={t('a11y.manage.tailStopClean')}
                      disabled={adReviewStrategyMode !== 'head-tail'}
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
                </div>
              </section>
            ) : null}

            {operationHint ? <p className="manage-panel-hint">{operationHint}</p> : null}

            {adReviewFeatureVisible && adReviewPanelOpen && adReviewTask ? (
              <section className="manage-ad-review" aria-live="polite">
                <header>
                  <strong>{t('ui.manage.adReviewTitle')}</strong>
                  <span className={`manage-ad-review-status is-${adReviewTask.status}`}>
                    {resolveStatusLabel(adReviewTask.status)}
                  </span>
                </header>

                <p className="manage-ad-review-progress">
                  {t('ui.manage.progress', {
                    percent: Math.round(adReviewTask.progress * 100),
                    reviewed: adReviewTask.reviewed_count,
                    total: adReviewTask.total_count,
                  })}
                </p>
                {resolveExecutionLabel(adReviewTask) ? (
                  <p className="manage-ad-review-config">{resolveExecutionLabel(adReviewTask)}</p>
                ) : null}
                {adReviewTask.audit ? (
                  <div className="manage-ad-review-audit">
                    <p className="manage-ad-review-audit-line">
                      {t('ui.manage.auditSourceDistribution', {
                        knownHash: adReviewTask.audit.source_distribution.known_hash,
                        suspected: adReviewTask.audit.source_distribution.llm_suspected,
                        clean: adReviewTask.audit.source_distribution.llm_clean,
                        failed: adReviewTask.audit.source_distribution.llm_failed,
                        skipped: adReviewTask.audit.source_distribution.strategy_skipped,
                      })}
                    </p>
                    <p className="manage-ad-review-audit-line">
                      {t('ui.manage.auditHitRate', {
                        llm: formatPercent(adReviewTask.audit.llm_hit_rate),
                        overall: formatPercent(adReviewTask.audit.overall_hit_rate),
                      })}
                    </p>
                  </div>
                ) : null}

                <p className="manage-ad-review-message">
                  {adReviewTask.status === 'review'
                    ? t('ui.manage.reviewCandidatesMessageThumbnail', { count: adReviewTask.candidates.length })
                    : adReviewTask.message ?? t('ui.manage.runningMessage')}
                </p>

                {adReviewTask.status === 'review' ? (
                  <div className="manage-ad-review-actions">
                    <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onToggleHideUncheckedNonChecked}>
                      {adReviewHideUncheckedNonChecked ? t('ui.manage.showAllImages') : t('ui.manage.hideUncheckedImages')}
                    </button>
                    <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onDismissAdReviewTask}>
                      {t('ui.manage.closeResult')}
                    </button>
                    <span className={`manage-ad-review-selection-tag ${hasCheckedAdReviewCandidates ? 'is-active' : ''}`}>
                      {hasCheckedAdReviewCandidates ? t('ui.manage.checkedCandidatesRemovable') : t('ui.manage.uncheckedCandidates')}
                    </span>
                  </div>
                ) : null}

                {adReviewTask.error_detail ? <p className="manage-ad-review-error">{adReviewTask.error_detail}</p> : null}
              </section>
            ) : null}

            {errorRows.length > 0 ? (
              <section className="manage-error-list" aria-live="polite">
                <header>
                  <strong>{t('ui.manage.errorListTitle')}</strong>
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
                    {t('ui.manage.clearAll')}
                  </button>
                </header>
                <ul>
                  {errorRows.map((row) => (
                    <li key={row.key}>
                      <span>{`${row.label}: ${row.message}`}</span>
                      <button className="feature-action-btn" type="button" disabled={pending} onClick={row.onRetry}>
                        {t('ui.manage.clear')}
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
          aria-label={t('a11y.common.adjustManagePanelHeight')}
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
