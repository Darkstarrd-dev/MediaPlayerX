import type { ImportTaskDto } from '../contracts/backend'
import { useI18n } from '../i18n/useI18n'
import { useDraggablePanel } from './useDraggablePanel'
import { clamp } from '../utils/ui'

export interface ImportHashReviewLogItem {
  id: string
  compared_count: number
  hit_count: number
  deleted_count: number
  failed_count: number
  created_at_ms: number
}

export interface ImportTaskPanelProps {
  open: boolean
  activeTaskCount: number
  pendingArchiveCount: number
  runningArchive: boolean
  runningArchiveProgress: number | null
  runningArchiveMessage: string | null
  thumbnailRunningCount: number
  thumbnailRunningProgress: number | null
  thumbnailRunningMessage: string | null
  enqueuePending: boolean
  operationHint: string | null
  taskError: string | null
  tasks: ImportTaskDto[]
  pendingReviewNoticeVisible?: boolean
  pendingReviewTaskCount?: number
  pendingReviewImageCount?: number
  onOpenAdReviewFromPendingNotice?: () => void
  onDismissPendingReviewNotice?: () => void
  hashReviewLogs?: ImportHashReviewLogItem[]
  onRemoveHashReviewLog?: (logId: string) => void
  onClose: () => void
  onClearFinished: () => void
  onClearAll: () => void
  onClearOperationHint: () => void
  onClearError: () => void
  onRetryTask: (taskId: string) => void
  onRemoveTask: (taskId: string) => void
}

function resolveTaskSourceLabel(source: ImportTaskDto['source'], t: ReturnType<typeof useI18n>['t']): string {
  if (source === 'dialog-folders' || source === 'dialog-folders-music') {
    return t('ui.importTask.source.folder')
  }
  if (source === 'drag-drop' || source === 'drag-drop-music') {
    return t('ui.importTask.source.dragDrop')
  }
  if (source === 'paste' || source === 'paste-music') {
    return t('ui.importTask.source.paste')
  }
  return t('ui.importTask.source.file')
}

function resolveTaskStatusLabel(status: ImportTaskDto['status'], t: ReturnType<typeof useI18n>['t']): string {
  if (status === 'pending') {
    return t('ui.importTask.status.pending')
  }
  if (status === 'running') {
    return t('ui.importTask.status.running')
  }
  if (status === 'completed') {
    return t('ui.importTask.status.completed')
  }
  if (status === 'failed') {
    return t('ui.importTask.status.failed')
  }
  if (status === 'cancelled') {
    return t('ui.importTask.status.cancelled')
  }
  return status
}

function ImportTaskPanel({
  open,
  activeTaskCount,
  pendingArchiveCount,
  runningArchive,
  runningArchiveProgress,
  runningArchiveMessage,
  thumbnailRunningCount,
  thumbnailRunningProgress,
  thumbnailRunningMessage,
  enqueuePending,
  operationHint,
  taskError,
  tasks,
  pendingReviewNoticeVisible = false,
  pendingReviewTaskCount = 0,
  pendingReviewImageCount = 0,
  onOpenAdReviewFromPendingNotice,
  onDismissPendingReviewNotice,
  hashReviewLogs = [],
  onRemoveHashReviewLog,
  onClose,
  onClearFinished,
  onClearAll,
  onClearOperationHint,
  onClearError,
  onRetryTask,
  onRemoveTask,
}: ImportTaskPanelProps) {
  const { t } = useI18n()
  const { panelOffset, panelDragging, headHandlers } = useDraggablePanel(open)
  const runningArchiveProgressPercent =
    typeof runningArchiveProgress === 'number' && Number.isFinite(runningArchiveProgress)
      ? Math.round(clamp(runningArchiveProgress, 0, 1) * 100)
      : null
  const thumbnailRunningProgressPercent =
    typeof thumbnailRunningProgress === 'number' && Number.isFinite(thumbnailRunningProgress)
      ? Math.round(clamp(thumbnailRunningProgress, 0, 1) * 100)
      : null

  if (!open) {
    return null
  }

  return (
    <div
      className="settings-mask"
      data-slot="fg-import-task-ovl"
      role="dialog"
      aria-modal="true"
      aria-label={t('ui.importTask.title')}
      data-overlay-close="import-task-panel"
    >
      <section
        className={`import-task-panel mpx-large-panel settings-panel ${panelDragging ? 'is-dragging' : ''}`}
        data-slot="fg-import-task-root"
        data-overlay-close="import-task-panel"
        style={{ transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)` }}
      >
        <header className="import-task-panel-head mpx-large-panel-head settings-head settings-head-draggable" {...headHandlers}>
          <span className="settings-head-spacer" />
          <h2 style={{ color: 'var(--mpx-large-panel-head-text, inherit)' }}>
            {t('ui.importTask.title')}
          </h2>
          <div className="import-task-panel-head-actions">
            <button type="button" onClick={onClose}>
              {t('ui.common.close')}
            </button>
            <button type="button" onClick={onClearFinished}>
              {t('ui.importTask.clearFinished')}
            </button>
            <button type="button" onClick={onClearAll}>
              {t('ui.importTask.clearAll')}
            </button>
          </div>
        </header>
        <div className="mpx-large-panel-shell settings-shell is-no-side import-task-panel-shell">
          <main className="import-task-panel-main mpx-large-panel-main settings-main" role="status" aria-live="polite">
            <div className="import-task-panel-summary">
              <span>{t('ui.importTask.activeCount', { count: activeTaskCount })}</span>
              <span>{t('ui.importTask.pendingArchiveCount', { count: pendingArchiveCount })}</span>
              {runningArchive ? (
                <span>
                  {runningArchiveProgressPercent === null
                    ? t('ui.importTask.runningArchive')
                    : t('ui.importTask.runningArchiveProgress', { progress: runningArchiveProgressPercent })}
                </span>
              ) : null}
              {runningArchiveMessage ? <span>{t('ui.importTask.runningArchiveMessage', { message: runningArchiveMessage })}</span> : null}
              {thumbnailRunningCount > 0 ? (
                <span>{t('ui.importTask.thumbnailRunningCount', { count: thumbnailRunningCount })}</span>
              ) : null}
              {thumbnailRunningCount > 0 && thumbnailRunningProgressPercent !== null ? (
                <span>{t('ui.importTask.thumbnailRunningProgress', { progress: thumbnailRunningProgressPercent })}</span>
              ) : null}
              {thumbnailRunningCount > 0 && thumbnailRunningMessage ? (
                <span>{t('ui.importTask.thumbnailRunningMessage', { message: thumbnailRunningMessage })}</span>
              ) : null}
              {enqueuePending ? <span>{t('ui.importTask.enqueuing')}</span> : null}
            </div>
            {taskError ? (
              <p data-slot="fg-import-task-error">
                <span>{taskError}</span>
                <button type="button" onClick={onClearError}>
                  {t('ui.common.clear')}
                </button>
              </p>
            ) : null}
            {operationHint ? (
              <p data-slot="fg-import-task-hint">
                <span>{operationHint}</span>
                <button type="button" onClick={onClearOperationHint}>
                  {t('ui.common.clear')}
                </button>
              </p>
            ) : null}
            {pendingReviewNoticeVisible ? (
              <p className="import-task-panel-review-notice" data-slot="fg-import-task-review-notice">
                <span>
                  {t('ui.importTask.reviewPendingSummary', {
                    taskCount: Math.max(1, pendingReviewTaskCount),
                    imageCount: Math.max(1, pendingReviewImageCount),
                  })}
                </span>
                <span className="import-task-panel-review-notice-actions">
                  <button type="button" onClick={() => onOpenAdReviewFromPendingNotice?.()}>
                    {t('ui.importTask.openReviewMode')}
                  </button>
                  <button type="button" onClick={() => onDismissPendingReviewNotice?.()}>
                    {t('ui.common.clear')}
                  </button>
                </span>
              </p>
            ) : null}
            {hashReviewLogs.length > 0 ? (
              <ul className="import-task-panel-hash-log-list" data-slot="fg-import-task-hash-log-list">
                {hashReviewLogs.map((item) => (
                  <li key={item.id}>
                    <span>
                      {t('ui.importTask.hashSilentDeleteSummary', {
                        deletedCount: item.deleted_count,
                        hitCount: item.hit_count,
                        failedCount: item.failed_count,
                      })}
                    </span>
                    <button type="button" onClick={() => onRemoveHashReviewLog?.(item.id)}>
                      {t('ui.common.clear')}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {tasks.length > 0 ? (
              <ul>
                {tasks.map((task) => {
                  const sourceLabel = resolveTaskSourceLabel(task.source, t)
                  const progressPercent = Math.round(clamp(task.progress, 0, 1) * 100)

                  return (
                    <li key={task.task_id}>
                      <span>{t('ui.importTask.progressSummary', { source: sourceLabel, processed: task.processed_count, total: task.total_count })}</span>
                      <span>{resolveTaskStatusLabel(task.status, t)}</span>
                      <progress max={100} value={progressPercent} />
                      <span>{`${progressPercent}%`}</span>
                      <span>{task.message ?? '-'}</span>
                      {task.status === 'failed' ? (
                        <button type="button" onClick={() => onRetryTask(task.task_id)}>
                          {t('ui.common.retry')}
                        </button>
                      ) : task.status === 'completed' ? (
                        <button type="button" onClick={() => onRemoveTask(task.task_id)}>
                          {t('ui.common.remove')}
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p>{t('ui.importTask.empty')}</p>
            )}
          </main>
        </div>
      </section>
    </div>
  )
}

export default ImportTaskPanel
