import { useCallback, useRef, useState } from 'react'

import type { ImagePackage, SidebarNode, VideoItem } from '../../types'

export interface PackageMetadataWritePayload {
  workTitle?: string
  circle?: string
  author?: string
  tags?: string[]
  syncWorkTitleToPackageName?: boolean
}

export interface VideoMetadataWritePayload {
  workTitle?: string
  circle?: string
  author?: string
  tags?: string[]
  grade?: number | null
  syncFileNameToWorkTitle?: boolean
}

type MetadataTaskKind = 'auto-tags' | 'vision-tags' | 'embeddings'
type MetadataTaskStatus = 'idle' | 'running' | 'paused'

interface MetadataTaskProgressState {
  kind: MetadataTaskKind | null
  status: MetadataTaskStatus
  processed: number
  total: number
}

const IDLE_TASK_PROGRESS: MetadataTaskProgressState = {
  kind: null,
  status: 'idle',
  processed: 0,
  total: 0,
}

const TASK_POLL_INTERVAL_MS = 120

interface UseMetadataWriteBindingsParams {
  metadataManageMode: boolean
  autoTagModelPath: string
  autoTagOccurrenceThreshold: number
  autoTagGeneralMinScore: number
  autoTagCharacterMinScore: number
  autoTagIncludeRating: boolean
  autoTagRatingMinScore: number
  visionAutoTagCsvPath: string
  visionAutoTagSampleImageCount: number
  visionAutoTagOccurrenceThreshold: number
  visionAutoTagTemperature: number
  visionAutoTagTimeoutMs: number
  visionAutoTagEndpoint: string
  visionAutoTagModel: string
  embeddingEndpoint: string
  embeddingModel: string
  backendWrite: {
    pending: {
      metadata: boolean
      grade: boolean
    }
    writePackageGrade: (packageId: string, grade: number | null) => Promise<void>
    writePackageMetadata?: (
      packageId: string,
      payload: {
        workTitle: string
        circle: string
        author: string
        tags: string[]
        syncWorkTitleToPackageName?: boolean
      },
    ) => Promise<void>
    generatePackageAutoTags?: (
      packageId: string,
      payload: {
        modelPath: string
        occurrenceThreshold: number
        generalMinScore: number
        characterMinScore: number
        includeRating: boolean
        ratingMinScore: number
      },
    ) => Promise<{ generated_tags: string[]; analyzed_images: number }>
    generatePackageAutoTagsVision?: (
      packageId: string,
      payload: {
        tagsCsvPath: string
        llmEndpoint: string
        llmModel: string
        sampleImageCount: number
        occurrenceThreshold: number
        temperature: number
        timeoutMs: number
      },
    ) => Promise<{ generated_tags: string[]; analyzed_images: number; dropped_tags: string[]; invalid_response_images: number }>
    generatePackageEmbeddings?: (
      packageId: string,
      payload: {
        embeddingEndpoint: string
        embeddingModel: string
        maxConcurrency: number
        maxRetries: number
        timeoutMs: number
      },
    ) => Promise<{ analyzed_images: number; embedded_images: number; failed_images: number; vector_dimension: number }>
    writeVideoMetadata?: (
      videoId: string,
      payload: {
        workTitle: string
        circle: string
        author: string
        tags: string[]
        grade?: number | null
        syncFileNameToWorkTitle?: boolean
      },
    ) => Promise<void>
  }
  packageById: Map<string, ImagePackage>
  videoById: Map<string, VideoItem>
  metadataImagePackageId: string | null
  focusedVideoId: string | null
  sidebarCheckedNodeIds: string[]
  sidebarNodeById: Map<string, SidebarNode>
  setManageOperationHint: (value: string | null) => void
}

interface UseMetadataWriteBindingsResult {
  metadataPending: boolean
  autoTagPending: boolean
  embeddingPending: boolean
  metadataTaskKind: MetadataTaskKind | null
  metadataTaskStatus: MetadataTaskStatus
  metadataTaskProcessed: number
  metadataTaskTotal: number
  stopMetadataTask: () => void
  applyPackageGrade: (grade: number | null) => void
  applyPackageMetadata: (payload: PackageMetadataWritePayload) => void
  applyPackageSyncName: () => void
  applyPackageAutoTags: () => void
  applyPackageAutoTagsVision: () => void
  applyPackageEmbeddings: () => void
  applyVideoMetadata: (payload: VideoMetadataWritePayload) => void
  applyVideoSyncName: () => void
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizeTextPatch(value: string | undefined, fallback: string): string {
  if (value === undefined) {
    return fallback
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : fallback
}

function normalizeTags(tags: string[]): string[] {
  const next = new Set<string>()
  for (const rawTag of tags) {
    const normalized = rawTag.trim()
    if (normalized.length > 0) {
      next.add(normalized)
    }
  }
  return Array.from(next)
}

function normalizeTagsPatch(tags: string[] | undefined, fallback: string[]): string[] {
  if (!tags) {
    return fallback
  }
  return normalizeTags(tags)
}

export function useMetadataWriteBindings({
  metadataManageMode,
  autoTagModelPath,
  autoTagOccurrenceThreshold,
  autoTagGeneralMinScore,
  autoTagCharacterMinScore,
  autoTagIncludeRating,
  autoTagRatingMinScore,
  visionAutoTagCsvPath,
  visionAutoTagSampleImageCount,
  visionAutoTagOccurrenceThreshold,
  visionAutoTagTemperature,
  visionAutoTagTimeoutMs,
  visionAutoTagEndpoint,
  visionAutoTagModel,
  embeddingEndpoint,
  embeddingModel,
  backendWrite,
  packageById,
  videoById,
  metadataImagePackageId,
  focusedVideoId,
  sidebarCheckedNodeIds,
  sidebarNodeById,
  setManageOperationHint,
}: UseMetadataWriteBindingsParams): UseMetadataWriteBindingsResult {
  const [taskProgress, setTaskProgress] = useState<MetadataTaskProgressState>(IDLE_TASK_PROGRESS)

  const taskEpochRef = useRef(0)
  const taskPausedRef = useRef(false)
  const taskStopRequestedRef = useRef(false)

  const isTaskRunActive = useCallback((runId: number) => taskEpochRef.current === runId, [])

  const collectBatchTargets = useCallback(() => {
    const packageIds = new Set<string>()
    const videoIds = new Set<string>()

    const visitNode = (node: SidebarNode) => {
      if (node.packageId) {
        packageIds.add(node.packageId)
      }
      if (node.imageSourceId) {
        packageIds.add(node.imageSourceId)
      }
      if (node.videoId) {
        videoIds.add(node.videoId)
      }
      for (const child of node.children) {
        visitNode(child)
      }
    }

    for (const nodeId of sidebarCheckedNodeIds) {
      const node = sidebarNodeById.get(nodeId)
      if (!node) {
        continue
      }
      visitNode(node)
    }

    return {
      packageIds: Array.from(packageIds),
      videoIds: Array.from(videoIds),
    }
  }, [sidebarCheckedNodeIds, sidebarNodeById])

  const resolvePackageTargets = useCallback((): string[] => {
    if (metadataManageMode) {
      const { packageIds } = collectBatchTargets()
      if (packageIds.length > 0) {
        return packageIds
      }
    }

    return metadataImagePackageId ? [metadataImagePackageId] : []
  }, [collectBatchTargets, metadataImagePackageId, metadataManageMode])

  const resolveVideoTargets = useCallback((): string[] => {
    if (metadataManageMode) {
      const { videoIds } = collectBatchTargets()
      if (videoIds.length > 0) {
        return videoIds
      }
    }

    return focusedVideoId ? [focusedVideoId] : []
  }, [collectBatchTargets, focusedVideoId, metadataManageMode])

  const runBatchWrite = useCallback(
    async (
      targetIds: string[],
      applyWrite: (targetId: string) => Promise<void>,
      summaryLabel = '元数据批量写入完成',
    ) => {
      let successCount = 0
      let failedCount = 0

      for (const targetId of targetIds) {
        try {
          await applyWrite(targetId)
          successCount += 1
        } catch {
          failedCount += 1
        }
      }

      setManageOperationHint(
        failedCount > 0
          ? `${summaryLabel}：成功 ${successCount} 项，失败 ${failedCount} 项`
          : `${summaryLabel}：成功 ${successCount} 项`,
      )
    },
    [setManageOperationHint],
  )

  const buildPackageMetadataPayload = useCallback(
    (packageId: string, payload: PackageMetadataWritePayload) => {
      const source = packageById.get(packageId)
      if (!source) {
        return null
      }

      return {
        workTitle: normalizeTextPatch(payload.workTitle, source.workTitle),
        circle: normalizeTextPatch(payload.circle, source.circle),
        author: normalizeTextPatch(payload.author, source.author),
        tags: normalizeTagsPatch(payload.tags, source.tags),
        syncWorkTitleToPackageName: payload.syncWorkTitleToPackageName,
      }
    },
    [packageById],
  )

  const buildVideoMetadataPayload = useCallback(
    (videoId: string, payload: VideoMetadataWritePayload) => {
      const source = videoById.get(videoId)
      if (!source) {
        return null
      }

      return {
        workTitle: normalizeTextPatch(payload.workTitle, source.workTitle),
        circle: normalizeTextPatch(payload.circle, source.circle),
        author: normalizeTextPatch(payload.author, source.author),
        tags: normalizeTagsPatch(payload.tags, source.tags),
        grade: payload.grade,
        syncFileNameToWorkTitle: payload.syncFileNameToWorkTitle,
      }
    },
    [videoById],
  )

  const applyPackageGrade = useCallback(
    (grade: number | null) => {
      const packageIds = resolvePackageTargets()
      if (packageIds.length > 0) {
        void runBatchWrite(packageIds, (packageId) => backendWrite.writePackageGrade(packageId, grade))
        return
      }

      setManageOperationHint('评分写入失败：当前无可用图包')
    },
    [backendWrite, resolvePackageTargets, runBatchWrite, setManageOperationHint],
  )

  const applyPackageMetadata = useCallback(
    (payload: PackageMetadataWritePayload) => {
      const writer = backendWrite.writePackageMetadata
      if (!writer) {
        return
      }

      const packageIds = resolvePackageTargets()
      if (packageIds.length === 0) {
        setManageOperationHint('元数据写入失败：当前无可用图包')
        return
      }

      void runBatchWrite(
        packageIds,
        async (packageId) => {
          const mergedPayload = buildPackageMetadataPayload(packageId, payload)
          if (!mergedPayload) {
            throw new Error(`package_not_found:${packageId}`)
          }
          await writer(packageId, mergedPayload)
        },
        '元数据批量写入完成',
      )
    },
    [backendWrite.writePackageMetadata, buildPackageMetadataPayload, resolvePackageTargets, runBatchWrite, setManageOperationHint],
  )

  const applyVideoMetadata = useCallback(
    (payload: VideoMetadataWritePayload) => {
      const writer = backendWrite.writeVideoMetadata
      if (!writer) {
        return
      }

      const videoIds = resolveVideoTargets()
      if (videoIds.length === 0) {
        setManageOperationHint('视频元数据写入失败：当前无可用视频')
        return
      }

      void runBatchWrite(
        videoIds,
        async (videoId) => {
          const mergedPayload = buildVideoMetadataPayload(videoId, payload)
          if (!mergedPayload) {
            throw new Error(`video_not_found:${videoId}`)
          }
          await writer(videoId, mergedPayload)
        },
        '视频元数据批量写入完成',
      )
    },
    [backendWrite.writeVideoMetadata, buildVideoMetadataPayload, resolveVideoTargets, runBatchWrite, setManageOperationHint],
  )

  const applyPackageSyncName = useCallback(() => {
    applyPackageMetadata({
      syncWorkTitleToPackageName: true,
    })
  }, [applyPackageMetadata])

  const applyVideoSyncName = useCallback(() => {
    applyVideoMetadata({
      syncFileNameToWorkTitle: true,
    })
  }, [applyVideoMetadata])

  const toggleTaskRunState = useCallback(
    (kind: MetadataTaskKind): boolean => {
      if (taskProgress.kind !== kind) {
        return false
      }

      if (taskProgress.status === 'running') {
        taskPausedRef.current = true
        setTaskProgress((previous) =>
          previous.kind === kind
            ? {
                ...previous,
                status: 'paused',
              }
            : previous,
        )
        return true
      }

      if (taskProgress.status === 'paused') {
        taskPausedRef.current = false
        setTaskProgress((previous) =>
          previous.kind === kind
            ? {
                ...previous,
                status: 'running',
              }
            : previous,
        )
        return true
      }

      return false
    },
    [taskProgress.kind, taskProgress.status],
  )

  const stopMetadataTask = useCallback(() => {
    if (!taskProgress.kind) {
      return
    }

    taskStopRequestedRef.current = true
    taskPausedRef.current = false
    taskEpochRef.current += 1
    setTaskProgress(IDLE_TASK_PROGRESS)
    setManageOperationHint('处理中断：将在当前图包处理完成后停止')
  }, [setManageOperationHint, taskProgress.kind])

  const runPackageTask = useCallback(
    (
      params: {
        kind: MetadataTaskKind
        targets: string[]
        progressLabel: string
        runForPackage: (packageId: string) => Promise<void>
        buildDoneHint: (summary: {
          successCount: number
          failedCount: number
          processedCount: number
        }) => string
      },
    ) => {
      const runId = taskEpochRef.current + 1
      taskEpochRef.current = runId
      taskPausedRef.current = false
      taskStopRequestedRef.current = false

      setTaskProgress({
        kind: params.kind,
        status: 'running',
        processed: 0,
        total: params.targets.length,
      })

      void (async () => {
        let successCount = 0
        let failedCount = 0
        let processedCount = 0

        for (let index = 0; index < params.targets.length; index += 1) {
          if (!isTaskRunActive(runId) || taskStopRequestedRef.current) {
            return
          }

          while (isTaskRunActive(runId) && taskPausedRef.current && !taskStopRequestedRef.current) {
            await sleep(TASK_POLL_INTERVAL_MS)
          }

          if (!isTaskRunActive(runId) || taskStopRequestedRef.current) {
            return
          }

          const packageId = params.targets[index]!
          try {
            await params.runForPackage(packageId)
            successCount += 1
          } catch {
            failedCount += 1
          }

          processedCount = index + 1

          if (!isTaskRunActive(runId)) {
            return
          }

          setTaskProgress((previous) =>
            previous.kind === params.kind
              ? {
                  ...previous,
                  processed: processedCount,
                }
              : previous,
          )

          setManageOperationHint(`${params.progressLabel}进度 ${processedCount}/${params.targets.length}`)
        }

        if (!isTaskRunActive(runId)) {
          return
        }

        setTaskProgress(IDLE_TASK_PROGRESS)
        setManageOperationHint(
          params.buildDoneHint({
            successCount,
            failedCount,
            processedCount,
          }),
        )
      })().catch((error: unknown) => {
        if (!isTaskRunActive(runId)) {
          return
        }

        const message = error instanceof Error && error.message.trim().length > 0 ? error.message : '未知错误'
        setTaskProgress(IDLE_TASK_PROGRESS)
        setManageOperationHint(`${params.progressLabel}失败：${message}`)
      })
    },
    [isTaskRunActive, setManageOperationHint],
  )

  const applyPackageAutoTags = useCallback(() => {
    if (toggleTaskRunState('auto-tags')) {
      return
    }
    if (taskProgress.kind && taskProgress.kind !== 'auto-tags') {
      return
    }

    const autoTagWriter = backendWrite.generatePackageAutoTags
    if (!autoTagWriter) {
      setManageOperationHint('自动标签失败：当前后端不支持该能力')
      return
    }

    const modelPath = autoTagModelPath.trim()
    const threshold = Math.max(1, Math.min(200, Math.floor(autoTagOccurrenceThreshold)))
    const generalMinScore = Math.max(0, Math.min(1, autoTagGeneralMinScore))
    const characterMinScore = Math.max(0, Math.min(1, autoTagCharacterMinScore))
    const ratingMinScore = Math.max(0, Math.min(1, autoTagRatingMinScore))

    if (!modelPath) {
      setManageOperationHint('自动标签失败：请先在设置中填写模型路径')
      return
    }

    const packageIds = resolvePackageTargets()
    if (packageIds.length === 0) {
      setManageOperationHint('自动标签失败：当前无可用图包')
      return
    }

    runPackageTask({
      kind: 'auto-tags',
      targets: packageIds,
      progressLabel: '自动标签',
      runForPackage: async (packageId) => {
        await autoTagWriter(packageId, {
          modelPath,
          occurrenceThreshold: threshold,
          generalMinScore,
          characterMinScore,
          includeRating: autoTagIncludeRating,
          ratingMinScore,
        })
      },
      buildDoneHint: ({ successCount, failedCount, processedCount }) =>
        failedCount > 0
          ? `自动标签批量完成：已处理 ${processedCount} 项，成功 ${successCount} 项，失败 ${failedCount} 项`
          : `自动标签批量完成：已处理 ${processedCount} 项`,
    })
  }, [
    autoTagCharacterMinScore,
    autoTagGeneralMinScore,
    autoTagIncludeRating,
    autoTagModelPath,
    autoTagOccurrenceThreshold,
    autoTagRatingMinScore,
    backendWrite.generatePackageAutoTags,
    resolvePackageTargets,
    runPackageTask,
    setManageOperationHint,
    taskProgress.kind,
    toggleTaskRunState,
  ])

  const applyPackageAutoTagsVision = useCallback(() => {
    if (toggleTaskRunState('vision-tags')) {
      return
    }
    if (taskProgress.kind && taskProgress.kind !== 'vision-tags') {
      return
    }

    const autoTagWriter = backendWrite.generatePackageAutoTagsVision
    if (!autoTagWriter) {
      setManageOperationHint('视觉自动标签失败：当前后端不支持该能力')
      return
    }

    const normalizedCsvPath = visionAutoTagCsvPath.trim()
    const normalizedEndpoint = visionAutoTagEndpoint.trim()
    const normalizedModel = visionAutoTagModel.trim()
    const sampleImageCount = Math.max(1, Math.min(24, Math.floor(visionAutoTagSampleImageCount)))
    const occurrenceThreshold = Math.max(1, Math.min(24, Math.floor(visionAutoTagOccurrenceThreshold)))
    const temperature = Math.max(0, Math.min(1, visionAutoTagTemperature))
    const timeoutMs = Math.max(3_000, Math.min(120_000, Math.floor(visionAutoTagTimeoutMs)))

    if (!normalizedCsvPath) {
      setManageOperationHint('视觉自动标签失败：请先在设置中填写标签范围 CSV 路径')
      return
    }
    if (!normalizedEndpoint || !normalizedModel) {
      setManageOperationHint('视觉自动标签失败：请先在设置中填写视觉模型端口和模型ID')
      return
    }

    const packageIds = resolvePackageTargets()
    if (packageIds.length === 0) {
      setManageOperationHint('视觉自动标签失败：当前无可用图包')
      return
    }

    runPackageTask({
      kind: 'vision-tags',
      targets: packageIds,
      progressLabel: '视觉标签',
      runForPackage: async (packageId) => {
        await autoTagWriter(packageId, {
          tagsCsvPath: normalizedCsvPath,
          llmEndpoint: normalizedEndpoint,
          llmModel: normalizedModel,
          sampleImageCount,
          occurrenceThreshold,
          temperature,
          timeoutMs,
        })
      },
      buildDoneHint: ({ successCount, failedCount, processedCount }) =>
        failedCount > 0
          ? `视觉自动标签批量完成：已处理 ${processedCount} 项，成功 ${successCount} 项，失败 ${failedCount} 项`
          : `视觉自动标签批量完成：已处理 ${processedCount} 项`,
    })
  }, [
    backendWrite.generatePackageAutoTagsVision,
    resolvePackageTargets,
    runPackageTask,
    setManageOperationHint,
    taskProgress.kind,
    toggleTaskRunState,
    visionAutoTagCsvPath,
    visionAutoTagEndpoint,
    visionAutoTagModel,
    visionAutoTagOccurrenceThreshold,
    visionAutoTagSampleImageCount,
    visionAutoTagTemperature,
    visionAutoTagTimeoutMs,
  ])

  const applyPackageEmbeddings = useCallback(() => {
    if (toggleTaskRunState('embeddings')) {
      return
    }
    if (taskProgress.kind && taskProgress.kind !== 'embeddings') {
      return
    }

    const embeddingWriter = backendWrite.generatePackageEmbeddings
    if (!embeddingWriter) {
      setManageOperationHint('嵌入生成失败：当前后端不支持该能力')
      return
    }

    const normalizedEndpoint = embeddingEndpoint.trim()
    const normalizedModel = embeddingModel.trim()
    if (!normalizedEndpoint || !normalizedModel) {
      setManageOperationHint('嵌入生成失败：请先在设置中填写 LM Studio Endpoint 与 Embedding 模型ID')
      return
    }

    const packageIds = resolvePackageTargets()
    if (packageIds.length === 0) {
      setManageOperationHint('嵌入生成失败：当前无可用图包')
      return
    }

    const maxConcurrency = 4
    const maxRetries = 1
    const timeoutMs = 45_000
    let analyzedTotal = 0
    let embeddedTotal = 0
    let failedImagesTotal = 0

    runPackageTask({
      kind: 'embeddings',
      targets: packageIds,
      progressLabel: '嵌入生成',
      runForPackage: async (packageId) => {
        const response = await embeddingWriter(packageId, {
          embeddingEndpoint: normalizedEndpoint,
          embeddingModel: normalizedModel,
          maxConcurrency,
          maxRetries,
          timeoutMs,
        })
        analyzedTotal += response.analyzed_images
        embeddedTotal += response.embedded_images
        failedImagesTotal += response.failed_images
      },
      buildDoneHint: ({ failedCount, processedCount }) => {
        const packageFailureSummary = failedCount > 0 ? `，图包失败 ${failedCount} 个` : ''
        return `嵌入生成批量完成：已处理 ${processedCount} 项，写入 ${embeddedTotal}/${analyzedTotal} 张，失败 ${failedImagesTotal} 张${packageFailureSummary}`
      },
    })
  }, [
    backendWrite.generatePackageEmbeddings,
    embeddingEndpoint,
    embeddingModel,
    resolvePackageTargets,
    runPackageTask,
    setManageOperationHint,
    taskProgress.kind,
    toggleTaskRunState,
  ])

  const autoTagPending = taskProgress.kind === 'auto-tags' || taskProgress.kind === 'vision-tags'
  const embeddingPending = taskProgress.kind === 'embeddings'

  return {
    metadataPending: backendWrite.pending.metadata || backendWrite.pending.grade || autoTagPending || embeddingPending,
    autoTagPending,
    embeddingPending,
    metadataTaskKind: taskProgress.kind,
    metadataTaskStatus: taskProgress.status,
    metadataTaskProcessed: taskProgress.processed,
    metadataTaskTotal: taskProgress.total,
    stopMetadataTask,
    applyPackageGrade,
    applyPackageMetadata,
    applyPackageSyncName,
    applyPackageAutoTags,
    applyPackageAutoTagsVision,
    applyPackageEmbeddings,
    applyVideoMetadata,
    applyVideoSyncName,
  }
}

export type MetadataWriteBindingsResult = ReturnType<typeof useMetadataWriteBindings>
