import type { ManageAdReviewTaskDto } from '../../contracts/backend'
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
  adReviewFocusTaskId: string | null
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewMaxConcurrency: number
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  canExecuteAdReview: boolean
  onStartAdReview: () => void
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
  adReviewHideUncheckedNonChecked,
  hasCheckedAdReviewCandidates,
  adReviewFocusTaskId,
  adReviewStrategyMode,
  adReviewMaxConcurrency,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  canExecuteAdReview,
  onStartAdReview,
  onPauseAdReview,
  onToggleHideUncheckedNonChecked,
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
  const adReviewRunning = adReviewTask?.status === 'running'

  return (
    <section className="metadata-ad-review-section" aria-label="AI广告审核面板">
      <header>
        <strong>AI广告审核</strong>
        {adReviewTask ? <span className={`manage-ad-review-status is-${adReviewTask.status}`}>{resolveAdReviewStatusLabel(adReviewTask.status)}</span> : null}
      </header>

      <div className="metadata-ad-review-controls" role="group" aria-label="AI广告审核控制">
        <div className="metadata-ad-review-primary-row">
          <button
            className={`manage-ad-review-icon-btn ${adReviewStrategyMode === 'head-tail' ? 'is-active' : ''}`}
            type="button"
            aria-label="AI广告审核策略切换"
            title={
              adReviewStrategyMode === 'head-tail'
                ? '当前策略：头尾抽样。点击切换为全量审核'
                : '当前策略：全量审核。点击切换为头尾抽样'
            }
            onClick={() => onAdReviewStrategyModeChange(adReviewStrategyMode === 'head-tail' ? 'all' : 'head-tail')}
          >
            <span aria-hidden="true">{adReviewStrategyMode === 'head-tail' ? '⇵' : '∞'}</span>
          </button>

          <button
            className={`manage-ad-review-icon-btn manage-ad-review-exec-btn ${adReviewRunning ? 'is-running' : ''}`}
            type="button"
            aria-label={adReviewRunning ? '暂停AI广告审核' : '执行AI广告审核'}
            title={adReviewRunning ? '暂停AI广告审核' : '执行AI广告审核'}
            disabled={adReviewPending || (!adReviewRunning && !canExecuteAdReview)}
            onClick={adReviewRunning ? onPauseAdReview : onStartAdReview}
          >
            <span aria-hidden="true">{adReviewRunning ? '⏸' : '▶'}</span>
          </button>
        </div>

        <label className="manage-ad-review-inline-field">
          <span>并发</span>
          <select aria-label="AI广告审核并发" value={adReviewMaxConcurrency} onChange={(event) => onAdReviewMaxConcurrencyChange(Number(event.target.value))}>
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
            aria-label="AI广告审核头部窗口样本数"
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
            aria-label="AI广告审核尾部窗口样本数"
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
            aria-label="AI广告审核尾部停止clean连续数"
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
        <section className="manage-ad-review-queue" aria-label="AI广告审核队列">
          {adReviewQueueTasks.map((queueTask) => {
            const isActive = adReviewTask?.task_id === queueTask.task_id || adReviewActiveTaskId === queueTask.task_id
            return (
              <div key={queueTask.task_id} className={`manage-ad-review-queue-item ${isActive ? 'is-active' : ''}`}>
                <button
                  className="feature-action-btn manage-ad-review-queue-item-btn"
                  type="button"
                  onClick={() => onSelectAdReviewTask(queueTask.task_id)}
                >
                  <span>{resolveAdReviewStatusLabel(queueTask.status)}</span>
                  <span>{`${Math.round(queueTask.progress * 100)}% · ${queueTask.reviewed_count}/${queueTask.total_count}`}</span>
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
              ? `疑似候选 ${adReviewTask.candidates.length} 张，已同步到选中态。请在主视图修正后使用上方“删除”执行清除。`
              : adReviewTask.message ?? 'AI广告审核任务进行中'}
          </p>

          {adReviewTask.status === 'review' ? (
            <div className="manage-ad-review-actions">
              <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onToggleHideUncheckedNonChecked}>
                {adReviewHideUncheckedNonChecked ? '显示全部图片' : '隐藏未勾选图片'}
              </button>
              <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onDismissAdReviewTask}>
                关闭结果
              </button>
              <button
                className="feature-action-btn"
                type="button"
                disabled={adReviewPending || adReviewTask.candidates.length === 0}
                onClick={onToggleAdReviewFocus}
              >
                {adReviewFocusTaskId === adReviewTask.task_id ? 'return' : 'focus'}
              </button>
              <span className={`manage-ad-review-selection-tag ${hasCheckedAdReviewCandidates ? 'is-active' : ''}`}>
                {hasCheckedAdReviewCandidates ? '已选候选可删除' : '未选候选'}
              </span>
            </div>
          ) : null}

          {(adReviewTask.status === 'running' || adReviewTask.status === 'paused') ? (
            <div className="manage-ad-review-actions">
              <button
                className="feature-action-btn"
                type="button"
                disabled={adReviewPending || adReviewTask.candidates.length === 0}
                onClick={onToggleAdReviewFocus}
              >
                {adReviewFocusTaskId === adReviewTask.task_id ? 'return' : 'focus'}
              </button>
            </div>
          ) : null}

          {adReviewTask.error_detail ? <p className="manage-ad-review-error">{adReviewTask.error_detail}</p> : null}
        </section>
      ) : null}
    </section>
  )
}
