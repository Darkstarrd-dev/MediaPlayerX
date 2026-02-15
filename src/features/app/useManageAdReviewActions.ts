import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { manageAdReviewTaskSchema, type ManageAdReviewTaskDto } from '../../contracts/backend'
import type { BrowserMode } from '../../types'
import type { MediaRepository } from '../backend/repository'

const REVIEW_POLL_INTERVAL_MS = 1_000
const REVIEW_START_TIMEOUT_MS = 60_000
const REVIEW_READ_TIMEOUT_MS = 10_000
const REVIEW_PAUSE_TIMEOUT_MS = 10_000
const REVIEW_DELETE_TIMEOUT_MS = 20_000
const REVIEW_QUEUE_WRITE_TIMEOUT_MS = 10_000
const AD_REVIEW_QUEUE_STATE_KEY = 'manage_ad_review_queue_v1'

interface UseManageAdReviewActionsParams {
  repository: MediaRepository
  mode: BrowserMode
  manageMode: boolean
  activeSelectionScope: 'sidebar' | 'image' | null
  imageCheckedIds: string[]
  sidebarCheckedNodeIds: string[]
  llmEndpoint: string
  llmModel: string
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  adReviewMaxConcurrency: number
  clearAllSelections: () => void
  replaceImageCheckedIds: (imageIds: string[], append?: boolean) => void
  setManageOperationHint: (message: string | null) => void
}

interface PersistedQueueRaw {
  version: number
  items: Array<{
    task?: unknown
    [key: string]: unknown
  }>
}

interface UseManageAdReviewActionsResult {
  task: ManageAdReviewTaskDto | null
  queueTasks: ManageAdReviewTaskDto[]
  activeTaskId: string | null
  runningTaskId: string | null
  hasRunningTask: boolean
  pending: boolean
  hideUncheckedNonChecked: boolean
  hasCheckedCandidateSelection: boolean
  scopeImageIds: string[]
  llmReviewedImageIds: string[]
  nonLlmReviewedImageIds: string[]
  startManageAdReview: () => Promise<void>
  pauseManageAdReview: () => Promise<void>
  toggleHideUncheckedNonChecked: () => void
  confirmDeleteSelectedCandidates: () => Promise<void>
  dismissTask: () => void
  selectTask: (taskId: string) => void
  removeTask: (taskId: string) => Promise<void>
}

function parseQueueRaw(stateJson: string): PersistedQueueRaw {
  try {
    const parsed = JSON.parse(stateJson) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return { version: 1, items: [] }
    }
    const version = typeof (parsed as { version?: unknown }).version === 'number' ? (parsed as { version: number }).version : 1
    const items = Array.isArray((parsed as { items?: unknown }).items)
      ? ((parsed as { items: Array<{ task?: unknown; [key: string]: unknown }> }).items ?? [])
      : []
    return {
      version,
      items,
    }
  } catch {
    return { version: 1, items: [] }
  }
}

function parseQueueTasks(stateJson: string): ManageAdReviewTaskDto[] {
  const raw = parseQueueRaw(stateJson)
  const tasks: ManageAdReviewTaskDto[] = []

  for (const item of raw.items) {
    const parsedTask = manageAdReviewTaskSchema.safeParse(item.task)
    if (!parsedTask.success) {
      continue
    }
    tasks.push(parsedTask.data)
  }

  return tasks
}

function upsertTask(tasks: ManageAdReviewTaskDto[], nextTask: ManageAdReviewTaskDto): ManageAdReviewTaskDto[] {
  const index = tasks.findIndex((task) => task.task_id === nextTask.task_id)
  if (index < 0) {
    return [...tasks, nextTask]
  }

  const next = [...tasks]
  next[index] = nextTask
  return next
}

export function useManageAdReviewActions({
  repository,
  mode,
  manageMode,
  activeSelectionScope,
  imageCheckedIds,
  sidebarCheckedNodeIds,
  llmEndpoint,
  llmModel,
  adReviewStrategyMode,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  adReviewMaxConcurrency,
  clearAllSelections,
  replaceImageCheckedIds,
  setManageOperationHint,
}: UseManageAdReviewActionsParams): UseManageAdReviewActionsResult {
  const [queueTasks, setQueueTasks] = useState<ManageAdReviewTaskDto[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [hideUncheckedNonChecked, setHideUncheckedNonChecked] = useState(false)
  const pollingTimerRef = useRef<ReturnType<typeof window.setInterval> | null>(null)
  const previousTaskStatusByIdRef = useRef<Record<string, ManageAdReviewTaskDto['status']>>({})

  const activeScope = useMemo(() => {
    if (activeSelectionScope === 'sidebar' && sidebarCheckedNodeIds.length > 0) {
      return 'sidebar' as const
    }
    if (imageCheckedIds.length > 0) {
      return 'image' as const
    }
    return null
  }, [activeSelectionScope, imageCheckedIds.length, sidebarCheckedNodeIds.length])

  const disposePolling = useCallback(() => {
    if (pollingTimerRef.current !== null) {
      window.clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      disposePolling()
    },
    [disposePolling],
  )

  const loadQueueTasks = useCallback(
    async (options?: { silent?: boolean }) => {
      const readAppState = repository.readAppState
      if (!readAppState) {
        return null
      }

      try {
        const response = await readAppState(
          {
            state_key: AD_REVIEW_QUEUE_STATE_KEY,
            fallback_json: JSON.stringify({ version: 1, items: [] }),
          },
          { timeoutMs: REVIEW_READ_TIMEOUT_MS },
        )
        const tasks = parseQueueTasks(response.state_json)
        setQueueTasks(tasks)
        setActiveTaskId((previous) => {
          if (previous && tasks.some((task) => task.task_id === previous)) {
            return previous
          }

          const runningTask = tasks.find((task) => task.status === 'running')
          if (runningTask) {
            return runningTask.task_id
          }

          return tasks.length > 0 ? tasks[tasks.length - 1]?.task_id ?? null : null
        })
        return tasks
      } catch (error) {
        if (!options?.silent) {
          const message = error instanceof Error ? error.message : String(error)
          setManageOperationHint(`AI广告审核队列读取失败：${message}`)
        }
        return null
      }
    },
    [repository, setManageOperationHint],
  )

  useEffect(() => {
    void loadQueueTasks({ silent: true })
  }, [loadQueueTasks])

  const task = useMemo(() => {
    if (queueTasks.length === 0) {
      return null
    }

    if (activeTaskId) {
      const active = queueTasks.find((item) => item.task_id === activeTaskId)
      if (active) {
        return active
      }
    }

    const runningTask = queueTasks.find((item) => item.status === 'running')
    if (runningTask) {
      return runningTask
    }

    return queueTasks[queueTasks.length - 1] ?? null
  }, [activeTaskId, queueTasks])

  const hasRunningTask = useMemo(() => queueTasks.some((item) => item.status === 'running'), [queueTasks])
  const runningTaskId = useMemo(
    () => queueTasks.find((item) => item.status === 'running')?.task_id ?? null,
    [queueTasks],
  )

  useEffect(() => {
    if (!task) {
      return
    }

    const previousStatus = previousTaskStatusByIdRef.current[task.task_id]
    if (previousStatus && task.status === 'review' && previousStatus !== 'review') {
      replaceImageCheckedIds(
        task.candidates.map((candidate) => candidate.image_id),
        false,
      )
    }
    previousTaskStatusByIdRef.current[task.task_id] = task.status
  }, [replaceImageCheckedIds, task])

  useEffect(() => {
    if (!hasRunningTask || !repository.readAppState) {
      disposePolling()
      return
    }

    disposePolling()
    pollingTimerRef.current = window.setInterval(() => {
      void loadQueueTasks({ silent: true })
    }, REVIEW_POLL_INTERVAL_MS)

    return () => {
      disposePolling()
    }
  }, [disposePolling, hasRunningTask, loadQueueTasks, repository])

  const updateTaskInQueue = useCallback((nextTask: ManageAdReviewTaskDto) => {
    setQueueTasks((previous) => upsertTask(previous, nextTask))
    setActiveTaskId(nextTask.task_id)
  }, [])

  const startManageAdReview = useCallback(async () => {
    if (!repository.startManageAdReview) {
      setManageOperationHint('当前后端不支持AI广告审核')
      return
    }
    if (mode !== 'image') {
      setManageOperationHint('AI广告审核仅支持图片模式')
      return
    }
    if (!manageMode) {
      setManageOperationHint('请先进入管理模式')
      return
    }
    if (!activeScope) {
      setManageOperationHint('请先在管理模式勾选图片或目录')
      return
    }

    const normalizedEndpoint = llmEndpoint.trim()
    const normalizedModel = llmModel.trim()
    if (!normalizedEndpoint || !normalizedModel) {
      setManageOperationHint('请先在设置面板配置并测试AI广告审核视觉模型')
      return
    }

    const imageIds = activeScope === 'image' ? imageCheckedIds : []
    const nodeIds = activeScope === 'sidebar' ? sidebarCheckedNodeIds : []

    setHideUncheckedNonChecked(false)
    setPending(true)
    setManageOperationHint('AI广告审核任务已启动')
    try {
      const normalizedStrategyMode = adReviewStrategyMode === 'head-tail' ? 'head-tail' : 'all'
      const strategy =
        normalizedStrategyMode === 'head-tail'
          ? {
              mode: 'head-tail' as const,
              head_n: Math.max(0, Math.floor(adReviewHeadN)),
              tail_n: Math.max(0, Math.floor(adReviewTailN)),
              tail_stop_clean_streak: Math.max(1, Math.floor(adReviewTailStopCleanStreak)),
            }
          : {
              mode: 'all' as const,
            }

      const maxConcurrency = Number.isFinite(adReviewMaxConcurrency)
        ? Math.max(4, Math.min(12, Math.floor(adReviewMaxConcurrency)))
        : undefined

      const response = await repository.startManageAdReview(
        {
          selection_scope: activeScope,
          image_ids: imageIds,
          node_ids: nodeIds,
          llm_endpoint: normalizedEndpoint,
          llm_model: normalizedModel,
          strategy,
          max_concurrency: maxConcurrency,
        },
        { timeoutMs: REVIEW_START_TIMEOUT_MS },
      )

      updateTaskInQueue(response.task)
      await loadQueueTasks({ silent: true })
      setManageOperationHint(response.task.message ?? 'AI广告审核任务已启动')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setManageOperationHint(`AI广告审核启动失败：${message}`)
    } finally {
      setPending(false)
    }
  }, [
    activeScope,
    imageCheckedIds,
    adReviewHeadN,
    adReviewMaxConcurrency,
    adReviewStrategyMode,
    adReviewTailN,
    adReviewTailStopCleanStreak,
    llmEndpoint,
    llmModel,
    loadQueueTasks,
    manageMode,
    mode,
    repository,
    setManageOperationHint,
    sidebarCheckedNodeIds,
    updateTaskInQueue,
  ])

  const pauseManageAdReview = useCallback(async () => {
    if (!repository.pauseManageAdReviewTask) {
      setManageOperationHint('当前后端不支持AI广告审核暂停')
      return
    }

    const runningTask = task?.status === 'running' ? task : queueTasks.find((item) => item.status === 'running') ?? null
    if (!runningTask) {
      setManageOperationHint('当前无可暂停的AI广告审核任务')
      return
    }

    setPending(true)
    try {
      const response = await repository.pauseManageAdReviewTask(
        { task_id: runningTask.task_id },
        { timeoutMs: REVIEW_PAUSE_TIMEOUT_MS },
      )
      updateTaskInQueue(response.task)
      await loadQueueTasks({ silent: true })
      setManageOperationHint(response.task.message ?? 'AI广告审核已暂停')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setManageOperationHint(`AI广告审核暂停失败：${message}`)
    } finally {
      setPending(false)
    }
  }, [loadQueueTasks, queueTasks, repository, setManageOperationHint, task, updateTaskInQueue])

  const toggleHideUncheckedNonChecked = useCallback(() => {
    setHideUncheckedNonChecked((previous) => !previous)
  }, [])

  const selectedCandidateIds = useMemo(() => {
    if (!task || task.status !== 'review') {
      return []
    }

    const candidateIdSet = new Set(task.candidates.map((candidate) => candidate.image_id))
    return imageCheckedIds.filter((imageId) => candidateIdSet.has(imageId))
  }, [imageCheckedIds, task])

  const hasCheckedCandidateSelection = selectedCandidateIds.length > 0

  const scopeImageIds = task?.scope_image_ids ?? []
  const llmReviewedImageIds = useMemo(() => {
    if (!task) {
      return []
    }

    return Object.entries(task.image_source_by_id)
      .filter(([, source]) => source === 'llm' || source === 'llm-error')
      .map(([imageId]) => imageId)
  }, [task])

  const nonLlmReviewedImageIds = useMemo(() => {
    if (!task) {
      return []
    }

    return Object.entries(task.image_source_by_id)
      .filter(([, source]) => source === 'known-hash' || source === 'strategy-skip')
      .map(([imageId]) => imageId)
  }, [task])

  const confirmDeleteSelectedCandidates = useCallback(async () => {
    if (!repository.confirmManageAdReviewDelete) {
      setManageOperationHint('当前后端不支持AI广告审核删除')
      return
    }
    if (!task) {
      setManageOperationHint('暂无可删除的AI广告审核结果')
      return
    }
    if (task.status !== 'review') {
      setManageOperationHint('AI广告审核尚未完成，请稍候')
      return
    }
    if (selectedCandidateIds.length === 0) {
      setManageOperationHint('请先勾选需要删除的候选项')
      return
    }

    setPending(true)
    try {
      const response = await repository.confirmManageAdReviewDelete(
        {
          task_id: task.task_id,
          image_ids: selectedCandidateIds,
        },
        { timeoutMs: REVIEW_DELETE_TIMEOUT_MS },
      )

      updateTaskInQueue(response.task)
      await loadQueueTasks({ silent: true })

      if (response.deleted_count > 0) {
        clearAllSelections()
      }

      replaceImageCheckedIds(
        response.task.candidates.map((candidate) => candidate.image_id),
        false,
      )

      if (response.deleted_count > 0) {
        setHideUncheckedNonChecked(true)
      }

      if (response.failed.length > 0) {
        setManageOperationHint(`已删除 ${response.deleted_count} 张，失败 ${response.failed.length} 项`)
      } else {
        setManageOperationHint(`已删除 ${response.deleted_count} 张疑似广告`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setManageOperationHint(`AI广告审核删除失败：${message}`)
    } finally {
      setPending(false)
    }
  }, [
    clearAllSelections,
    loadQueueTasks,
    replaceImageCheckedIds,
    repository,
    selectedCandidateIds,
    setManageOperationHint,
    task,
    updateTaskInQueue,
  ])

  const dismissTask = useCallback(() => {
    setActiveTaskId(null)
    setHideUncheckedNonChecked(false)
  }, [])

  const selectTask = useCallback((taskId: string) => {
    setActiveTaskId(taskId)
  }, [])

  const removeTask = useCallback(
    async (taskId: string) => {
      const readAppState = repository.readAppState
      const writeAppState = repository.writeAppState
      if (!readAppState || !writeAppState) {
        setManageOperationHint('当前后端不支持AI广告审核队列管理')
        return
      }

      const target = queueTasks.find((item) => item.task_id === taskId)
      if (!target) {
        setManageOperationHint('目标任务不存在，可能已被移除')
        return
      }

      if (target.status === 'running') {
        setManageOperationHint('运行中的任务不可直接移除，请先暂停')
        return
      }

      setPending(true)
      try {
        const response = await readAppState(
          {
            state_key: AD_REVIEW_QUEUE_STATE_KEY,
            fallback_json: JSON.stringify({ version: 1, items: [] }),
          },
          { timeoutMs: REVIEW_READ_TIMEOUT_MS },
        )
        const rawQueue = parseQueueRaw(response.state_json)
        const nextQueue: PersistedQueueRaw = {
          version: rawQueue.version,
          items: rawQueue.items.filter((item) => {
            const parsedTask = manageAdReviewTaskSchema.safeParse(item.task)
            return parsedTask.success ? parsedTask.data.task_id !== taskId : true
          }),
        }

        await writeAppState(
          {
            state_key: AD_REVIEW_QUEUE_STATE_KEY,
            state_json: JSON.stringify(nextQueue),
          },
          { timeoutMs: REVIEW_QUEUE_WRITE_TIMEOUT_MS },
        )

        setQueueTasks((previous) => previous.filter((item) => item.task_id !== taskId))
        setActiveTaskId((previous) => (previous === taskId ? null : previous))
        setManageOperationHint('已移除AI广告审核队列项')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setManageOperationHint(`AI广告审核队列移除失败：${message}`)
      } finally {
        setPending(false)
      }
    },
    [queueTasks, repository, setManageOperationHint],
  )

  return {
    task,
    queueTasks,
    activeTaskId,
    runningTaskId,
    hasRunningTask,
    pending,
    hideUncheckedNonChecked,
    hasCheckedCandidateSelection,
    scopeImageIds,
    llmReviewedImageIds,
    nonLlmReviewedImageIds,
    startManageAdReview,
    pauseManageAdReview,
    toggleHideUncheckedNonChecked,
    confirmDeleteSelectedCandidates,
    dismissTask,
    selectTask,
    removeTask,
  }
}

export type ManageAdReviewActionsResult = ReturnType<typeof useManageAdReviewActions>
