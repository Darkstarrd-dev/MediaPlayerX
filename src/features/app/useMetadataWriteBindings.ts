import { useCallback } from 'react'

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

interface UseMetadataWriteBindingsParams {
  metadataManageMode: boolean
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
  applyPackageGrade: (grade: number | null) => void
  applyPackageMetadata: (payload: PackageMetadataWritePayload) => void
  applyPackageSyncName: () => void
  applyVideoMetadata: (payload: VideoMetadataWritePayload) => void
  applyVideoSyncName: () => void
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
  backendWrite,
  packageById,
  videoById,
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

  return {
    metadataPending: backendWrite.pending.metadata || backendWrite.pending.grade,
    applyPackageGrade,
    applyPackageMetadata,
    applyPackageSyncName,
    applyVideoMetadata,
    applyVideoSyncName,
  }
}

export type MetadataWriteBindingsResult = ReturnType<typeof useMetadataWriteBindings>
