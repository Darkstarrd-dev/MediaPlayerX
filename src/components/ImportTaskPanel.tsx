import type { ImportTaskDto } from '../contracts/backend'
import { useI18n } from '../i18n/useI18n'
import { clamp } from '../utils/ui'

export interface ImportTaskPanelProps {
  open: boolean
  activeTaskCount: number
  pendingArchiveCount: number
  runningArchive: boolean
  enqueuePending: boolean
  taskError: string | null
  tasks: ImportTaskDto[]
  onClose: () => void
  onClearFinished: () => void
  onClearAll: () => void
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
  enqueuePending,
  taskError,
  tasks,
  onClose,
  onClearFinished,
  onClearAll,
  onClearError,
  onRetryTask,
  onRemoveTask,
}: ImportTaskPanelProps) {
  const { t } = useI18n()

  if (!open) {
    return null
  }

  return (
    <section className="import-task-panel" data-slot="fg-header-g1-task-import-task-panel" role="status" aria-live="polite">
      <header>
        <strong>{t('ui.importTask.title')}</strong>
        <span>{t('ui.importTask.activeCount', { count: activeTaskCount })}</span>
        <span>{t('ui.importTask.pendingArchiveCount', { count: pendingArchiveCount })}</span>
        {runningArchive ? <span>{t('ui.importTask.runningArchive')}</span> : null}
        {enqueuePending ? <span>{t('ui.importTask.enqueuing')}</span> : null}
        <button type="button" onClick={onClose}>
          {t('ui.common.close')}
        </button>
        <button type="button" onClick={onClearFinished}>
          {t('ui.importTask.clearFinished')}
        </button>
        <button type="button" onClick={onClearAll}>
          {t('ui.importTask.clearAll')}
        </button>
      </header>
      {taskError ? (
        <p data-slot="fg-header-g1-task-import-task-error-panel">
          <span>{taskError}</span>
          <button type="button" onClick={onClearError}>
            {t('ui.common.clear')}
          </button>
        </p>
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
    </section>
  )
}

export default ImportTaskPanel
