import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { BrowserMode } from '../../types'
import type { MediaRepository } from '../backend/repository'

const REVIEW_POLL_INTERVAL_MS = 1_000
const REVIEW_START_TIMEOUT_MS = 60_000
const REVIEW_READ_TIMEOUT_MS = 10_000
const REVIEW_PAUSE_TIMEOUT_MS = 10_000
const REVIEW_DELETE_TIMEOUT_MS = 20_000

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

interface UseManageAdReviewActionsResult {
  task: ManageAdReviewTaskDto | null
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
  const [task, setTask] = useState<ManageAdReviewTaskDto | null>(null)
  const [pending, setPending] = useState(false)
  const [hideUncheckedNonChecked, setHideUncheckedNonChecked] = useState(false)
  const pollingTimerRef = useRef<ReturnType<typeof window.setInterval> | null>(null)
  const previousTaskStatusRef = useRef<ManageAdReviewTaskDto['status'] | null>(null)

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

  useEffect(() => {
    if (!manageMode || mode !== 'image') {
      disposePolling()
      setTask(null)
      setHideUncheckedNonChecked(false)
      previousTaskStatusRef.current = null
    }
  }, [disposePolling, manageMode, mode])

  useEffect(
    () => () => {
      disposePolling()
    },
    [disposePolling],
  )

  useEffect(() => {
    const currentStatus = task?.status ?? null
    const previousStatus = previousTaskStatusRef.current
    if (task && task.status === 'review' && previousStatus !== 'review') {
      replaceImageCheckedIds(
        task.candidates.map((candidate) => candidate.image_id),
        false,
      )
    }
    previousTaskStatusRef.current = currentStatus
  }, [replaceImageCheckedIds, task])

  useEffect(() => {
    const readManageAdReviewTask = repository.readManageAdReviewTask
    if (!task || task.status !== 'running' || !readManageAdReviewTask) {
      disposePolling()
      return
    }

    disposePolling()
    pollingTimerRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const response = await readManageAdReviewTask(
            { task_id: task.task_id },
            { timeoutMs: REVIEW_READ_TIMEOUT_MS },
          )
          if (!response.task) {
            disposePolling()
            setTask(null)
            setHideUncheckedNonChecked(false)
            return
          }

          setTask(response.task)
          if (response.task.status !== 'running') {
            disposePolling()
          }
        } catch (error) {
          disposePolling()
          const message = error instanceof Error ? error.message : String(error)
          setTask((previous) =>
            previous
              ? {
                  ...previous,
                  status: 'failed',
                  message: 'AI广告审核任务读取失败',
                  error_detail: message,
                  updated_at_ms: Date.now(),
                }
              : previous,
          )
          setManageOperationHint(`AI广告审核读取失败：${message}`)
        }
      })()
    }, REVIEW_POLL_INTERVAL_MS)

    return () => {
      disposePolling()
    }
  }, [disposePolling, repository, setManageOperationHint, task])

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

      setTask(response.task)
      setManageOperationHint(response.task.message ?? 'AI广告审核任务已启动')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setTask(null)
      setHideUncheckedNonChecked(false)
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
    manageMode,
    mode,
    repository,
    setManageOperationHint,
    sidebarCheckedNodeIds,
  ])

  const pauseManageAdReview = useCallback(async () => {
    if (!repository.pauseManageAdReviewTask) {
      setManageOperationHint('当前后端不支持AI广告审核暂停')
      return
    }

    if (!task || task.status !== 'running') {
      setManageOperationHint('当前无可暂停的AI广告审核任务')
      return
    }

    setPending(true)
    try {
      const response = await repository.pauseManageAdReviewTask(
        { task_id: task.task_id },
        { timeoutMs: REVIEW_PAUSE_TIMEOUT_MS },
      )
      setTask(response.task)
      setManageOperationHint(response.task.message ?? 'AI广告审核已暂停')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setManageOperationHint(`AI广告审核暂停失败：${message}`)
    } finally {
      setPending(false)
    }
  }, [repository, setManageOperationHint, task])

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

      setTask(response.task)

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
    replaceImageCheckedIds,
    repository,
    selectedCandidateIds,
    setManageOperationHint,
    task,
  ])

  const dismissTask = useCallback(() => {
    disposePolling()
    setTask(null)
    setHideUncheckedNonChecked(false)
  }, [disposePolling])

  return {
    task,
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
  }
}

export type ManageAdReviewActionsResult = ReturnType<typeof useManageAdReviewActions>
