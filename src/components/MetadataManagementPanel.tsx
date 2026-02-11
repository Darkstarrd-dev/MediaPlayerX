import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

type MetadataTaskKind = 'auto-tags' | 'vision-tags' | 'embeddings'
type MetadataTaskStatus = 'idle' | 'running' | 'paused'

interface MetadataManagementPanelProps {
  visible: boolean
  collapsed: boolean
  panelHeight: number
  panelRef: RefObject<HTMLDivElement | null>
  panelContentRef: RefObject<HTMLDivElement | null>
  showGenerationActions: boolean
  metadataPending: boolean
  operationHint: string | null
  taskKind: MetadataTaskKind | null
  taskStatus: MetadataTaskStatus
  taskProcessed: number
  taskTotal: number
  onSyncName: () => void
  onAutoTags: () => void
  onVisionTags: () => void
  onEmbeddings: () => void
  onStopTask: () => void
  onExpand: () => void
  onStartResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
}

function resolveTaskButtonLabel(label: string, status: MetadataTaskStatus): string {
  if (status === 'running') {
    return `${label}（执行中，点击暂停）`
  }
  if (status === 'paused') {
    return `${label}（已暂停，点击继续）`
  }
  return label
}

function resolveTaskStatusLabel(status: MetadataTaskStatus): string {
  if (status === 'running') {
    return '执行中'
  }
  if (status === 'paused') {
    return '已暂停'
  }
  return '空闲'
}

function MetadataManagementPanel({
  visible,
  collapsed,
  panelHeight,
  panelRef,
  panelContentRef,
  showGenerationActions,
  metadataPending,
  operationHint,
  taskKind,
  taskStatus,
  taskProcessed,
  taskTotal,
  onSyncName,
  onAutoTags,
  onVisionTags,
  onEmbeddings,
  onStopTask,
  onExpand,
  onStartResize,
  layoutLocked,
}: MetadataManagementPanelProps) {
  if (!visible) {
    return null
  }

  const activeTask = taskKind !== null
  const syncNameDisabled = metadataPending || activeTask

  const showAutoTagsButton = showGenerationActions && (!activeTask || taskKind === 'auto-tags')
  const showVisionTagsButton = showGenerationActions && (!activeTask || taskKind === 'vision-tags')
  const showEmbeddingsButton = showGenerationActions && (!activeTask || taskKind === 'embeddings')

  return (
    <>
      {collapsed ? (
        <button aria-label="展开元数据管理容器" className="search-panel-expand-btn" type="button" onClick={onExpand}>
          <span className="search-panel-expand-tip">展开元数据管理容器</span>
        </button>
      ) : (
        <div className="vector-panel metadata-manage-panel" ref={panelRef} style={{ maxHeight: `${panelHeight}px` }}>
          <div className="vector-panel-content" ref={panelContentRef}>
            <div className="vector-controls metadata-manage-actions">
              <button className="feature-action-btn" type="button" disabled={syncNameDisabled} onClick={onSyncName}>
                同步名称
              </button>

              {showAutoTagsButton ? (
                <button
                  className={`feature-action-btn ${taskKind === 'auto-tags' ? 'is-active' : ''}`}
                  type="button"
                  disabled={taskKind === null && metadataPending}
                  onClick={onAutoTags}
                >
                  {resolveTaskButtonLabel('自动生成标签', taskKind === 'auto-tags' ? taskStatus : 'idle')}
                </button>
              ) : null}

              {showVisionTagsButton ? (
                <button
                  className={`feature-action-btn ${taskKind === 'vision-tags' ? 'is-active' : ''}`}
                  type="button"
                  disabled={taskKind === null && metadataPending}
                  onClick={onVisionTags}
                >
                  {resolveTaskButtonLabel('视觉模型生成标签', taskKind === 'vision-tags' ? taskStatus : 'idle')}
                </button>
              ) : null}

              {showEmbeddingsButton ? (
                <button
                  className={`feature-action-btn ${taskKind === 'embeddings' ? 'is-active' : ''}`}
                  type="button"
                  disabled={taskKind === null && metadataPending}
                  onClick={onEmbeddings}
                >
                  {resolveTaskButtonLabel('生成嵌入向量', taskKind === 'embeddings' ? taskStatus : 'idle')}
                </button>
              ) : null}

              {activeTask ? (
                <button className="vector-search-btn" type="button" onClick={onStopTask}>
                  停止
                </button>
              ) : null}
            </div>

            <p className="metadata-manage-progress">
              {`执行进度：${taskProcessed}/${taskTotal}`}
              {activeTask ? `（${resolveTaskStatusLabel(taskStatus)}）` : ''}
            </p>

            {operationHint ? <p className="manage-panel-hint">{operationHint}</p> : null}
          </div>
        </div>
      )}

      {!collapsed ? (
        <div
          aria-label="调整元数据管理容器高度"
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

export default MetadataManagementPanel
