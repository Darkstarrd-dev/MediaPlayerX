import type { ImportTaskDto } from '../contracts/backend'
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

function resolveTaskSourceLabel(source: ImportTaskDto['source']): string {
  if (source === 'dialog-folders') {
    return '文件夹'
  }
  if (source === 'drag-drop') {
    return '拖拽'
  }
  if (source === 'paste') {
    return '粘贴'
  }
  return '文件'
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
  if (!open) {
    return null
  }

  return (
    <section className="import-task-panel" role="status" aria-live="polite">
      <header>
        <strong>导入任务</strong>
        <span>{`进行中 ${activeTaskCount}`}</span>
        <span>{`归一化排队 ${pendingArchiveCount}`}</span>
        {runningArchive ? <span>归一化处理中</span> : null}
        {enqueuePending ? <span>正在入队...</span> : null}
        <button type="button" onClick={onClose}>
          关闭
        </button>
        <button type="button" onClick={onClearFinished}>
          清理已完成
        </button>
        <button type="button" onClick={onClearAll}>
          清空列表
        </button>
      </header>
      {taskError ? (
        <p>
          <span>{taskError}</span>
          <button type="button" onClick={onClearError}>
            清除
          </button>
        </p>
      ) : null}
      {tasks.length > 0 ? (
        <ul>
          {tasks.map((task) => {
            const sourceLabel = resolveTaskSourceLabel(task.source)
            const progressPercent = Math.round(clamp(task.progress, 0, 1) * 100)

            return (
              <li key={task.task_id}>
                <span>{`${sourceLabel} | ${task.processed_count}/${task.total_count}`}</span>
                <span>{task.status}</span>
                <progress max={100} value={progressPercent} />
                <span>{`${progressPercent}%`}</span>
                <span>{task.message ?? '-'}</span>
                {task.status === 'failed' ? (
                  <button type="button" onClick={() => onRetryTask(task.task_id)}>
                    重试
                  </button>
                ) : task.status === 'completed' ? (
                  <button type="button" onClick={() => onRemoveTask(task.task_id)}>
                    移除
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p>暂无导入任务。</p>
      )}
    </section>
  )
}

export default ImportTaskPanel
