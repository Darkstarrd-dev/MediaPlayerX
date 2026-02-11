import { useCallback, useState } from 'react'

import type { SidebarNode } from '../../types'

export interface PackageMetadataWritePayload {
  workTitle: string
  circle: string
  author: string
  tags: string[]
  syncWorkTitleToPackageName?: boolean
}

export interface VideoMetadataWritePayload {
  workTitle: string
  circle: string
  author: string
  tags: string[]
  grade?: number | null
  syncFileNameToWorkTitle?: boolean
}

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
    writePackageMetadata?: (packageId: string, payload: PackageMetadataWritePayload) => Promise<void>
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
    writeVideoMetadata?: (videoId: string, payload: VideoMetadataWritePayload) => Promise<void>
  }
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
  applyPackageGrade: (grade: number | null) => void
  applyPackageMetadata: (payload: PackageMetadataWritePayload) => void
  applyPackageAutoTags: () => void
  applyPackageAutoTagsVision: () => void
  applyPackageEmbeddings: () => void
  applyVideoMetadata: (payload: VideoMetadataWritePayload) => void
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
  metadataImagePackageId,
  focusedVideoId,
  sidebarCheckedNodeIds,
  sidebarNodeById,
  setManageOperationHint,
}: UseMetadataWriteBindingsParams): UseMetadataWriteBindingsResult {
  const [autoTagPending, setAutoTagPending] = useState(false)
  const [embeddingPending, setEmbeddingPending] = useState(false)

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

  const applyPackageGrade = useCallback(
    (grade: number | null) => {
      if (metadataManageMode) {
        const { packageIds } = collectBatchTargets()
        if (packageIds.length > 0) {
          void runBatchWrite(packageIds, (packageId) => backendWrite.writePackageGrade(packageId, grade))
          return
        }
      }

      if (!metadataImagePackageId) {
        return
      }
      void backendWrite.writePackageGrade(metadataImagePackageId, grade)
    },
    [backendWrite, collectBatchTargets, metadataImagePackageId, metadataManageMode, runBatchWrite],
  )

  const applyPackageMetadata = useCallback(
    (payload: PackageMetadataWritePayload) => {
      if (!backendWrite.writePackageMetadata) {
        return
      }

      if (metadataManageMode) {
        const { packageIds } = collectBatchTargets()
        if (packageIds.length > 0) {
          void runBatchWrite(packageIds, (packageId) => backendWrite.writePackageMetadata!(packageId, payload))
          return
        }
      }

      if (!metadataImagePackageId) {
        return
      }
      void backendWrite.writePackageMetadata(metadataImagePackageId, payload)
    },
    [backendWrite, collectBatchTargets, metadataImagePackageId, metadataManageMode, runBatchWrite],
  )

  const applyPackageAutoTags = useCallback(() => {
    if (autoTagPending) {
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

    const runForPackage = (packageId: string) =>
      autoTagWriter(packageId, {
        modelPath,
        occurrenceThreshold: threshold,
        generalMinScore,
        characterMinScore,
        includeRating: autoTagIncludeRating,
        ratingMinScore,
      })

    if (metadataManageMode) {
      const { packageIds } = collectBatchTargets()
      if (packageIds.length > 0) {
        setAutoTagPending(true)
        void runBatchWrite(
          packageIds,
          async (packageId) => {
            await runForPackage(packageId)
          },
          '自动标签批量执行完成',
        )
          .catch(() => undefined)
          .finally(() => {
            setAutoTagPending(false)
          })
        return
      }
    }

    if (!metadataImagePackageId) {
      setManageOperationHint('自动标签失败：当前无可用图包')
      return
    }

    setAutoTagPending(true)
    void runForPackage(metadataImagePackageId)
      .then((response) => {
        setManageOperationHint(`自动标签完成：生成 ${response.generated_tags.length} 个标签，分析 ${response.analyzed_images} 张图片`)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setManageOperationHint(`自动标签失败：${message}`)
      })
      .finally(() => {
        setAutoTagPending(false)
      })
  }, [
    autoTagPending,
    autoTagModelPath,
    autoTagOccurrenceThreshold,
    autoTagGeneralMinScore,
    autoTagCharacterMinScore,
    autoTagIncludeRating,
    autoTagRatingMinScore,
    backendWrite.generatePackageAutoTags,
    collectBatchTargets,
    metadataImagePackageId,
    metadataManageMode,
    runBatchWrite,
    setManageOperationHint,
  ])

  const applyPackageAutoTagsVision = useCallback(() => {
    if (autoTagPending) {
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

    const runForPackage = (packageId: string) =>
      autoTagWriter(packageId, {
        tagsCsvPath: normalizedCsvPath,
        llmEndpoint: normalizedEndpoint,
        llmModel: normalizedModel,
        sampleImageCount,
        occurrenceThreshold,
        temperature,
        timeoutMs,
      })

    if (metadataManageMode) {
      const { packageIds } = collectBatchTargets()
      if (packageIds.length > 0) {
        setAutoTagPending(true)
        void runBatchWrite(
          packageIds,
          async (packageId) => {
            await runForPackage(packageId)
          },
          '视觉自动标签批量执行完成',
        )
          .catch(() => undefined)
          .finally(() => {
            setAutoTagPending(false)
          })
        return
      }
    }

    if (!metadataImagePackageId) {
      setManageOperationHint('视觉自动标签失败：当前无可用图包')
      return
    }

    setAutoTagPending(true)
    void runForPackage(metadataImagePackageId)
      .then((response) => {
        const droppedSummary = response.dropped_tags.length > 0 ? `，丢弃 ${response.dropped_tags.length} 个越界标签` : ''
        const invalidSummary = response.invalid_response_images > 0 ? `，无效响应 ${response.invalid_response_images} 张` : ''
        setManageOperationHint(
          `视觉自动标签完成：生成 ${response.generated_tags.length} 个标签，分析 ${response.analyzed_images} 张图片${droppedSummary}${invalidSummary}`,
        )
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setManageOperationHint(`视觉自动标签失败：${message}`)
      })
      .finally(() => {
        setAutoTagPending(false)
      })
  }, [
    autoTagPending,
    backendWrite.generatePackageAutoTagsVision,
    collectBatchTargets,
    metadataImagePackageId,
    metadataManageMode,
    runBatchWrite,
    setManageOperationHint,
    visionAutoTagCsvPath,
    visionAutoTagEndpoint,
    visionAutoTagModel,
    visionAutoTagOccurrenceThreshold,
    visionAutoTagSampleImageCount,
    visionAutoTagTemperature,
    visionAutoTagTimeoutMs,
  ])

  const applyPackageEmbeddings = useCallback(() => {
    if (embeddingPending || autoTagPending) {
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

    const maxConcurrency = 4
    const maxRetries = 1
    const timeoutMs = 45_000

    const runForPackage = (packageId: string) =>
      embeddingWriter(packageId, {
        embeddingEndpoint: normalizedEndpoint,
        embeddingModel: normalizedModel,
        maxConcurrency,
        maxRetries,
        timeoutMs,
      })

    if (metadataManageMode) {
      const { packageIds } = collectBatchTargets()
      if (packageIds.length > 0) {
        setEmbeddingPending(true)
        void (async () => {
          let analyzedTotal = 0
          let embeddedTotal = 0
          let failedTotal = 0
          let failedPackages = 0

          for (let index = 0; index < packageIds.length; index += 1) {
            const packageId = packageIds[index]!
            try {
              const response = await runForPackage(packageId)
              analyzedTotal += response.analyzed_images
              embeddedTotal += response.embedded_images
              failedTotal += response.failed_images
              setManageOperationHint(
                `嵌入生成进度 ${index + 1}/${packageIds.length}：已写入 ${embeddedTotal}/${analyzedTotal} 张`,
              )
            } catch {
              failedPackages += 1
            }
          }

          const packageFailureSummary =
            failedPackages > 0 ? `，图包失败 ${failedPackages} 个` : ''
          setManageOperationHint(
            `嵌入生成批量完成：写入 ${embeddedTotal}/${analyzedTotal} 张，失败 ${failedTotal} 张${packageFailureSummary}`,
          )
        })()
          .catch(() => undefined)
          .finally(() => {
            setEmbeddingPending(false)
          })
        return
      }
    }

    if (!metadataImagePackageId) {
      setManageOperationHint('嵌入生成失败：当前无可用图包')
      return
    }

    setEmbeddingPending(true)
    void runForPackage(metadataImagePackageId)
      .then((response) => {
        setManageOperationHint(
          `嵌入生成完成：写入 ${response.embedded_images}/${response.analyzed_images} 张，失败 ${response.failed_images} 张，向量维度 ${response.vector_dimension}`,
        )
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setManageOperationHint(`嵌入生成失败：${message}`)
      })
      .finally(() => {
        setEmbeddingPending(false)
      })
  }, [
    autoTagPending,
    backendWrite.generatePackageEmbeddings,
    collectBatchTargets,
    embeddingEndpoint,
    embeddingModel,
    embeddingPending,
    metadataImagePackageId,
    metadataManageMode,
    setManageOperationHint,
  ])

  const applyVideoMetadata = useCallback(
    (payload: VideoMetadataWritePayload) => {
      if (!backendWrite.writeVideoMetadata) {
        return
      }

      if (metadataManageMode) {
        const { videoIds } = collectBatchTargets()
        if (videoIds.length > 0) {
          void runBatchWrite(videoIds, (videoId) => backendWrite.writeVideoMetadata!(videoId, payload))
          return
        }
      }

      if (!focusedVideoId) {
        return
      }
      void backendWrite.writeVideoMetadata(focusedVideoId, payload)
    },
    [backendWrite, collectBatchTargets, focusedVideoId, metadataManageMode, runBatchWrite],
  )

  return {
    metadataPending:
      backendWrite.pending.metadata ||
      backendWrite.pending.grade ||
      autoTagPending ||
      embeddingPending,
    autoTagPending,
    embeddingPending,
    applyPackageGrade,
    applyPackageMetadata,
    applyPackageAutoTags,
    applyPackageAutoTagsVision,
    applyPackageEmbeddings,
    applyVideoMetadata,
  }
}

export type MetadataWriteBindingsResult = ReturnType<typeof useMetadataWriteBindings>
