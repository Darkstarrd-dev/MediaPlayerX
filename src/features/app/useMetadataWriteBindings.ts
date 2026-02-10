import { useCallback } from 'react'

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
  applyPackageGrade: (grade: number | null) => void
  applyPackageMetadata: (payload: PackageMetadataWritePayload) => void
  applyPackageAutoTags: () => void
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
  backendWrite,
  metadataImagePackageId,
  focusedVideoId,
  sidebarCheckedNodeIds,
  sidebarNodeById,
  setManageOperationHint,
}: UseMetadataWriteBindingsParams): UseMetadataWriteBindingsResult {
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
        void runBatchWrite(
          packageIds,
          async (packageId) => {
            await runForPackage(packageId)
          },
          '自动标签批量执行完成',
        )
        return
      }
    }

    if (!metadataImagePackageId) {
      setManageOperationHint('自动标签失败：当前无可用图包')
      return
    }

    void runForPackage(metadataImagePackageId)
      .then((response) => {
        setManageOperationHint(`自动标签完成：生成 ${response.generated_tags.length} 个标签，分析 ${response.analyzed_images} 张图片`)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setManageOperationHint(`自动标签失败：${message}`)
      })
  }, [
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
    metadataPending: backendWrite.pending.metadata || backendWrite.pending.grade,
    applyPackageGrade,
    applyPackageMetadata,
    applyPackageAutoTags,
    applyVideoMetadata,
  }
}

export type MetadataWriteBindingsResult = ReturnType<typeof useMetadataWriteBindings>
