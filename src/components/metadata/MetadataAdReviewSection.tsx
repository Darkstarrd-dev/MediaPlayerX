import { useEffect, useState } from 'react'

import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import { useI18n } from '../../i18n/useI18n'
import {
  AD_REVIEW_CONCURRENCY_OPTIONS,
  AD_REVIEW_STREAK_OPTIONS,
  AD_REVIEW_WINDOW_OPTIONS,
  formatPercent,
  resolveAdReviewExecutionLabel,
  resolveAdReviewStatusLabel,
} from './metadataPanelUtils'

interface MetadataAdReviewSectionProps {
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
  onToggleAdReviewFocus: () => void
  onAdReviewStrategyModeChange: (value: 'all' | 'head-tail') => void
  onAdReviewMaxConcurrencyChange: (value: number) => void
  onAdReviewHeadNChange: (value: number) => void
  onAdReviewTailNChange: (value: number) => void
  onAdReviewTailStopCleanStreakChange: (value: number) => void
  onDismissAdReviewTask: () => void
}

export function MetadataAdReviewSection({
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
  onToggleAdReviewFocus,
  onAdReviewStrategyModeChange,
  onAdReviewMaxConcurrencyChange,
  onAdReviewHeadNChange,
  onAdReviewTailNChange,
  onAdReviewTailStopCleanStreakChange,
  onDismissAdReviewTask,
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

  useEffect(() => {
    if (adReviewRunning) {
      setStartDialogOpen(false)
    }
  }, [adReviewRunning])

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

  return (
    <section className="metadata-ad-review-section" aria-label={t('a11y.manage.panel')}>
      <header>
        <strong>AI广告审核</strong>
        {adReviewTask ? <span className={`manage-ad-review-status is-${adReviewTask.status}`}>{resolveAdReviewStatusLabel(adReviewTask.status)}</span> : null}
      </header>

      <div className="metadata-ad-review-controls" role="group" aria-label={t('a11y.manage.controls')}>
        <div className="metadata-ad-review-primary-row">
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
            onClick={triggerStartOrPause}
          >
            <span aria-hidden="true">{adReviewRunning ? '⏸' : '▶'}</span>
          </button>

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
          <span>并发</span>
          <select aria-label={t('a11y.manage.concurrency')} value={adReviewMaxConcurrency} onChange={(event) => onAdReviewMaxConcurrencyChange(Number(event.target.value))}>
            {AD_REVIEW_CONCURRENCY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className={`manage-ad-review-inline-field ${adReviewStrategyMode !== 'head-tail' ? 'is-disabled' : ''}`}>
          <span>头部</span>
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
          <span>尾部</span>
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
          <span>停止 clean</span>
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
            const queueStatusLabel = reviewWithoutCandidates ? '已完成' : resolveAdReviewStatusLabel(queueTask.status)
            const reviewProgressLabel =
              queueTask.status === 'review'
                ? reviewWithoutCandidates
                  ? '无待复核'
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

                <button
                  className="feature-action-btn"
                  type="button"
                  disabled={adReviewPending || queueTask.status === 'running'}
                  onClick={() => {
                    onRemoveAdReviewTask(queueTask.task_id)
                  }}
                >
                  移除
                </button>
              </div>
            )
          })}
        </section>
      ) : null}

      {adReviewTask ? (
        <section className="manage-ad-review" aria-live="polite">
          <p className="manage-ad-review-progress">{`进度 ${Math.round(adReviewTask.progress * 100)}% (${adReviewTask.reviewed_count}/${adReviewTask.total_count})`}</p>
          {resolveAdReviewExecutionLabel(adReviewTask) ? <p className="manage-ad-review-config">{resolveAdReviewExecutionLabel(adReviewTask)}</p> : null}
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
              ? adReviewTask.candidates.length > 0
                ? `疑似候选 ${adReviewTask.candidates.length} 张，已同步到选中态。请在主视图修正后使用上方“删除”执行清除。`
                : '本轮审核已完成，无待复核内容。'
              : adReviewTask.message ?? 'AI广告审核任务进行中'}
          </p>

          {adReviewTask.status === 'review' && adReviewTask.candidates.length > 0 ? (
            <div className="manage-ad-review-actions">
              <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onDismissAdReviewTask}>
                重置剔除
              </button>
              <span className={`manage-ad-review-selection-tag ${hasCheckedAdReviewCandidates ? 'is-active' : ''}`}>
                {hasCheckedAdReviewCandidates ? '已选候选可删除' : '未选候选'}
              </span>
            </div>
          ) : null}

          {adReviewTask.error_detail ? <p className="manage-ad-review-error">{adReviewTask.error_detail}</p> : null}
        </section>
      ) : null}

      {startDialogOpen ? (
        <div
          className="manage-ad-review-start-mask"
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
            <h3>执行AI广告审核</h3>
            <p className="manage-ad-review-start-description">请选择本次执行方式：</p>
            <div className="settings-floating-actions">
              <button type="button" onClick={() => startWithOption(true)}>
                跳过已扫描的
              </button>
              <button type="button" onClick={() => startWithOption(false)}>
                不跳过已扫描的
              </button>
              <button type="button" onClick={() => setStartDialogOpen(false)}>
                取消
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
