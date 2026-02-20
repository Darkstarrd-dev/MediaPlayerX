import { useEffect, useState } from 'react'

import type { ManageAdReviewTaskDto, ManageReviewModeDto } from '../../contracts/backend'
import { useI18n } from '../../i18n/useI18n'
import {
  AD_REVIEW_CONCURRENCY_OPTIONS,
  AD_REVIEW_STREAK_OPTIONS,
  AD_REVIEW_WINDOW_OPTIONS,
  formatPercent,
} from './metadataPanelUtils'

interface MetadataAdReviewSectionProps {
  reviewMode?: ManageReviewModeDto
  canSwitchReviewMode?: boolean
  adReviewPending: boolean
  adReviewTask: ManageAdReviewTaskDto | null
  adReviewQueueTasks: ManageAdReviewTaskDto[]
  adReviewActiveTaskId: string | null
  adReviewHideUncheckedNonChecked: boolean
  hasCheckedAdReviewCandidates: boolean
  selectedAdReviewCandidateCount: number
  adReviewFocusTaskId: string | null
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewMaxConcurrency: number
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  canExecuteAdReview: boolean
  onStartAdReview: (options?: { skipReviewedNodes?: boolean }) => void
  onPauseAdReview: () => void
  onToggleHideUncheckedNonChecked: () => void
  onSelectAdReviewTask: (taskId: string) => void
  onRemoveAdReviewTask: (taskId: string) => void
  onDeleteSelectedAdReviewCandidates?: () => void
  onToggleAdReviewFocus: () => void
  onAdReviewStrategyModeChange: (value: 'all' | 'head-tail') => void
  onAdReviewMaxConcurrencyChange: (value: number) => void
  onAdReviewHeadNChange: (value: number) => void
  onAdReviewTailNChange: (value: number) => void
  onAdReviewTailStopCleanStreakChange: (value: number) => void
  onDismissAdReviewTask: () => void
  onReviewModeChange?: (nextMode: ManageReviewModeDto) => void
  adReviewDeletePending?: boolean
  controlsInToolbar?: boolean
}

export function MetadataAdReviewSection({
  reviewMode = 'ad',
  canSwitchReviewMode = false,
  adReviewPending,
  adReviewTask,
  adReviewQueueTasks,
  adReviewActiveTaskId,
  adReviewHideUncheckedNonChecked: _adReviewHideUncheckedNonChecked,
  hasCheckedAdReviewCandidates,
  selectedAdReviewCandidateCount,
  adReviewFocusTaskId,
  adReviewStrategyMode,
  adReviewMaxConcurrency,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  canExecuteAdReview,
  onStartAdReview,
  onPauseAdReview,
  onToggleHideUncheckedNonChecked: _onToggleHideUncheckedNonChecked,
  onSelectAdReviewTask,
  onRemoveAdReviewTask,
  onDeleteSelectedAdReviewCandidates = () => undefined,
  onToggleAdReviewFocus,
  onAdReviewStrategyModeChange,
  onAdReviewMaxConcurrencyChange,
  onAdReviewHeadNChange,
  onAdReviewTailNChange,
  onAdReviewTailStopCleanStreakChange,
  onDismissAdReviewTask,
  onReviewModeChange = () => undefined,
  adReviewDeletePending = false,
  controlsInToolbar = false,
}: MetadataAdReviewSectionProps) {
  const { t } = useI18n()
  void _adReviewHideUncheckedNonChecked
  void _onToggleHideUncheckedNonChecked

  const adReviewRunning = adReviewTask?.status === 'running'
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const focusEnabledTask = adReviewTask && (adReviewTask.status === 'running' || adReviewTask.status === 'paused' || adReviewTask.status === 'review')
    ? adReviewTask
    : null
  const focusVisible = Boolean(focusEnabledTask && focusEnabledTask.candidates.length > 0)
  const focusActive = Boolean(focusEnabledTask && adReviewFocusTaskId === focusEnabledTask.task_id)
  const reviewWithCandidates = Boolean(adReviewTask?.status === 'review' && adReviewTask.candidates.length > 0)

  useEffect(() => {
    if (adReviewRunning) {
      setStartDialogOpen(false)
    }
  }, [adReviewRunning])

  if (controlsInToolbar) {
    return null
  }

  const triggerStartOrPause = () => {
    if (adReviewRunning) {
      onPauseAdReview()
      return
    }
    setStartDialogOpen(true)
  }

  const startWithOption = (skipReviewedNodes: boolean) => {
    setStartDialogOpen(false)
    onStartAdReview({ skipReviewedNodes })
  }

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

  return (
    <section className="metadata-ad-review-section" aria-label={t('a11y.manage.panel')}>
      <header>
        <strong>{reviewMode === 'cover' ? t('ui.manage.coverReviewTitle') : t('ui.manage.adReviewTitle')}</strong>
        {adReviewTask ? <span className={`manage-ad-review-status is-${adReviewTask.status}`}>{resolveStatusLabel(adReviewTask.status)}</span> : null}
      </header>

      {canSwitchReviewMode ? (
        <div className="metadata-ad-review-controls" role="group" aria-label={t('a11y.manage.controls')}>
          <div className="metadata-ad-review-primary-row">
            <button
              className={`manage-ad-review-icon-btn ${reviewMode === 'ad' ? 'is-active' : ''}`}
              type="button"
              disabled={adReviewPending}
              onClick={() => onReviewModeChange('ad')}
              title={t('ui.manage.adReviewTitle')}
            >
              <span aria-hidden="true">AD</span>
            </button>
            <button
              className={`manage-ad-review-icon-btn ${reviewMode === 'cover' ? 'is-active' : ''}`}
              type="button"
              disabled={adReviewPending}
              onClick={() => onReviewModeChange('cover')}
              title={t('ui.manage.coverReviewTitle')}
            >
              <span aria-hidden="true">C</span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="metadata-ad-review-controls" role="group" aria-label={t('a11y.manage.controls')}>
        <div className="metadata-ad-review-primary-row">
          {(
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
          )}

          {(
            <button
              className={`manage-ad-review-icon-btn manage-ad-review-exec-btn ${adReviewRunning ? 'is-running' : ''}`}
              type="button"
              aria-label={adReviewRunning ? t('a11y.manage.pause') : t('a11y.manage.start')}
              title={adReviewRunning ? t('a11y.manage.pause') : t('a11y.manage.start')}
              disabled={adReviewPending || (!adReviewRunning && !canExecuteAdReview)}
              onClick={triggerStartOrPause}
            >
              <span aria-hidden="true">{adReviewRunning ? '⏸' : '▶'}</span>
            </button>
          )}

          {focusVisible ? (
            <button
              className={`manage-ad-review-icon-btn ${focusActive ? 'is-active' : ''}`}
              type="button"
              aria-label={focusActive ? t('a11y.manage.return') : t('a11y.manage.focus')}
              title={focusActive ? t('a11y.manage.return') : t('a11y.manage.focus')}
              disabled={adReviewPending}
              onClick={onToggleAdReviewFocus}
            >
              <span aria-hidden="true">{focusActive ? 'R' : 'F'}</span>
            </button>
          ) : null}
        </div>

        <label className="manage-ad-review-inline-field">
          <span>{t('ui.manage.concurrency')}</span>
          <select aria-label={t('a11y.manage.concurrency')} value={adReviewMaxConcurrency} onChange={(event) => onAdReviewMaxConcurrencyChange(Number(event.target.value))}>
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

      {adReviewQueueTasks.length > 0 ? (
        <section className="manage-ad-review-queue" aria-label={t('a11y.manage.queue')}>
          {adReviewQueueTasks.map((queueTask) => {
            const isActive = adReviewTask?.task_id === queueTask.task_id || adReviewActiveTaskId === queueTask.task_id
            const reviewWithoutCandidates = queueTask.status === 'review' && queueTask.candidates.length === 0
            const queueStatusLabel = reviewWithoutCandidates ? t('ui.manage.queueStatusCompleted') : resolveStatusLabel(queueTask.status)
            const reviewProgressLabel =
              queueTask.status === 'review'
                ? reviewWithoutCandidates
                  ? t('ui.manage.reviewWithoutCandidates')
                  : `${queueTask.task_id === adReviewTask?.task_id ? selectedAdReviewCandidateCount : queueTask.candidates.length}/${queueTask.candidates.length}`
                : `${Math.round(queueTask.progress * 100)}% · ${queueTask.reviewed_count}/${queueTask.total_count}`
            return (
              <div key={queueTask.task_id} className={`manage-ad-review-queue-item ${isActive ? 'is-active' : ''}`}>
                <button
                  className="feature-action-btn manage-ad-review-queue-item-btn"
                  type="button"
                  onClick={() => onSelectAdReviewTask(queueTask.task_id)}
                >
                  <span>{queueStatusLabel}</span>
                  <span>{reviewProgressLabel}</span>
                </button>

                {!(controlsInToolbar && reviewWithCandidates && queueTask.task_id === adReviewTask?.task_id) ? (
                  <button
                    className="feature-action-btn"
                    type="button"
                    disabled={adReviewPending || adReviewDeletePending || queueTask.status === 'running'}
                    onClick={() => {
                      onRemoveAdReviewTask(queueTask.task_id)
                    }}
                  >
                    {adReviewDeletePending && queueTask.task_id === adReviewTask?.task_id ? t('ui.manage.deleting') : t('ui.manage.removeTask')}
                  </button>
                ) : null}
              </div>
            )
          })}
        </section>
      ) : null}

      {adReviewTask ? (
        <section className="manage-ad-review" aria-live="polite">
          <p className="manage-ad-review-progress">
            {t('ui.manage.progress', {
              percent: Math.round(adReviewTask.progress * 100),
              reviewed: adReviewTask.reviewed_count,
              total: adReviewTask.total_count,
            })}
          </p>
          {resolveExecutionLabel(adReviewTask) ? <p className="manage-ad-review-config">{resolveExecutionLabel(adReviewTask)}</p> : null}
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

          {!reviewWithCandidates ? (
            <p className="manage-ad-review-message">
              {adReviewTask.status === 'review'
                ? adReviewTask.candidates.length > 0
                  ? reviewMode === 'cover'
                    ? t('ui.manage.reviewCandidatesMessageCover', { count: adReviewTask.candidates.length })
                    : t('ui.manage.reviewCandidatesMessage', { count: adReviewTask.candidates.length })
                  : reviewMode === 'cover'
                    ? t('ui.manage.reviewCompletedMessageCover')
                    : t('ui.manage.reviewCompletedMessage')
                : adReviewTask.message ?? (reviewMode === 'cover' ? t('ui.manage.runningMessageCover') : t('ui.manage.runningMessage'))}
            </p>
          ) : null}

          {adReviewTask.status === 'review' && adReviewTask.candidates.length > 0 ? (
            <div className="manage-ad-review-actions">
              <button
                className="vector-search-btn"
                type="button"
                disabled={adReviewPending || !hasCheckedAdReviewCandidates}
                onClick={onDeleteSelectedAdReviewCandidates}
              >
                {adReviewDeletePending
                  ? t('ui.manage.deleting')
                  : reviewMode === 'cover'
                    ? t('ui.manage.applySelectedCountCover', { count: selectedAdReviewCandidateCount })
                    : t('ui.manage.deleteSelectedCount', { count: selectedAdReviewCandidateCount })}
              </button>
              <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onDismissAdReviewTask}>
                {t('ui.manage.resetDismiss')}
              </button>
              <span className={`manage-ad-review-selection-tag ${hasCheckedAdReviewCandidates ? 'is-active' : ''}`}>
                {hasCheckedAdReviewCandidates
                  ? reviewMode === 'cover'
                    ? t('ui.manage.selectedCandidatesHideable')
                    : t('ui.manage.selectedCandidatesRemovable')
                  : t('ui.manage.noCandidateSelected')}
              </span>
            </div>
          ) : null}

          {adReviewTask.error_detail ? <p className="manage-ad-review-error">{adReviewTask.error_detail}</p> : null}
        </section>
      ) : null}

      {startDialogOpen ? (
        <div
          className="manage-ad-review-start-mask"
          data-slot="fg-meta-main-ad-review-start-panel"
          role="dialog"
          aria-modal="true"
          aria-label={t('a11y.manage.startModeDialog')}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setStartDialogOpen(false)
            }
          }}
        >
          <section className="settings-floating-panel manage-ad-review-start-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <h3>{reviewMode === 'cover' ? t('ui.manage.startDialogTitleCover') : t('ui.manage.startDialogTitle')}</h3>
            <p className="manage-ad-review-start-description">{t('ui.manage.startDialogDescription')}</p>
            <div className="settings-floating-actions">
              <button type="button" onClick={() => startWithOption(true)}>
                {t('ui.manage.startSkipScanned')}
              </button>
              <button type="button" onClick={() => startWithOption(false)}>
                {t('ui.manage.startDontSkipScanned')}
              </button>
              <button type="button" onClick={() => setStartDialogOpen(false)}>
                {t('ui.common.cancel')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
