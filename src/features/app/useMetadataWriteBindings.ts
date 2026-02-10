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
  backendWrite: {
    pending: {
      metadata: boolean
      grade: boolean
    }
    writePackageGrade: (packageId: string, grade: number | null) => Promise<void>
    writePackageMetadata?: (packageId: string, payload: PackageMetadataWritePayload) => Promise<void>
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
  applyVideoMetadata: (payload: VideoMetadataWritePayload) => void
}

export function useMetadataWriteBindings({
  metadataManageMode,
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
    async (targetIds: string[], applyWrite: (targetId: string) => Promise<void>) => {
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
          ? `元数据批量写入完成：成功 ${successCount} 项，失败 ${failedCount} 项`
          : `元数据批量写入完成：成功 ${successCount} 项`,
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
    applyVideoMetadata,
  }
}

export type MetadataWriteBindingsResult = ReturnType<typeof useMetadataWriteBindings>
