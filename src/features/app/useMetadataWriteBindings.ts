import { useCallback } from 'react'

import type { ImagePackage, SidebarNode, VideoItem } from '../../types'

export interface PackageMetadataWritePayload {
  workTitle?: string
  seriesId?: string
  circle?: string
  author?: string
  tags?: string[]
  syncWorkTitleToPackageName?: boolean
}

export interface ParsedExternalMetadataSavePayload {
  sourceSite: 'nhentai' | 'ehentai' | 'others'
  sourceUrl: string
  sourceRemoteId: string
  sourceToken: string
  title: string
  titleJpn: string
  group: string
  groupJpn: string
  artist: string
  artistJpn: string
  posted: string
  rating?: string
  favorited?: string
  thumbUrl: string
  tags: Record<string, string>
  rawJson: string
}

export interface VideoMetadataWritePayload {
  workTitle?: string
  workTitleJpn?: string
  seriesId?: string
  circle?: string
  circleJpn?: string
  author?: string
  authorJpn?: string
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
        seriesId: string
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
        workTitleJpn: string
        seriesId: string
        circle: string
        circleJpn: string
        author: string
        authorJpn: string
        tags: string[]
        grade?: number | null
        syncFileNameToWorkTitle?: boolean
      },
    ) => Promise<void>
    writePackageExternalMetadata?: (
      packageId: string,
      payload: {
        sourceSite: 'nhentai' | 'ehentai' | 'others'
        sourceUrl: string
        sourceRemoteId: string
        sourceToken?: string
        title?: string
        titleJpn?: string
        groupName?: string
        groupNameJpn?: string
        artist?: string
        artistJpn?: string
        posted?: string
        rating?: string | null
        favorited?: string | null
        tags: Record<string, string>
        rawJson: string
        thumbUrl?: string
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
  applyPackageMetadataById: (packageId: string, payload: PackageMetadataWritePayload) => Promise<void>
  applyPackageExternalMetadataById: (packageId: string, payload: ParsedExternalMetadataSavePayload) => Promise<void>
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

function normalizeSeriesIdPatch(value: string | undefined, fallback: string): string {
  if (typeof value === 'undefined') {
    return fallback
  }
  return value.trim()
}

function normalizeOptionalTextPatch(value: string | undefined, fallback: string): string {
  if (typeof value === 'undefined') {
    return fallback
  }
  return value.trim()
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
        seriesId: normalizeSeriesIdPatch(payload.seriesId, source.seriesId ?? ''),
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
        workTitleJpn: normalizeOptionalTextPatch(payload.workTitleJpn, source.workTitleJpn ?? ''),
        seriesId: normalizeSeriesIdPatch(payload.seriesId, source.seriesId ?? ''),
        circle: normalizeTextPatch(payload.circle, source.circle),
        circleJpn: normalizeOptionalTextPatch(payload.circleJpn, source.circleJpn ?? ''),
        author: normalizeTextPatch(payload.author, source.author),
        authorJpn: normalizeOptionalTextPatch(payload.authorJpn, source.authorJpn ?? ''),
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

  const applyPackageMetadataById = useCallback(
    async (packageId: string, payload: PackageMetadataWritePayload) => {
      const writer = backendWrite.writePackageMetadata
      if (!writer) {
        throw new Error('当前后端不支持写入元数据')
      }

      const mergedPayload = buildPackageMetadataPayload(packageId, payload)
      if (!mergedPayload) {
        throw new Error(`package_not_found:${packageId}`)
      }

      await writer(packageId, mergedPayload)
      setManageOperationHint('元数据写入完成：成功 1 项')
    },
    [backendWrite.writePackageMetadata, buildPackageMetadataPayload, setManageOperationHint],
  )

  const applyPackageExternalMetadataById = useCallback(
    async (packageId: string, payload: ParsedExternalMetadataSavePayload) => {
      const writer = backendWrite.writePackageExternalMetadata
      if (!writer) {
        throw new Error('当前后端不支持写入外部元数据')
      }

      await writer(packageId, {
        sourceSite: payload.sourceSite,
        sourceUrl: payload.sourceUrl,
        sourceRemoteId: payload.sourceRemoteId,
        sourceToken: payload.sourceToken,
        title: payload.title,
        titleJpn: payload.titleJpn,
        groupName: payload.group,
        groupNameJpn: payload.groupJpn,
        artist: payload.artist,
        artistJpn: payload.artistJpn,
        posted: payload.posted,
        rating: payload.rating ?? null,
        favorited: payload.favorited ?? null,
        tags: payload.tags,
        rawJson: payload.rawJson,
        thumbUrl: payload.thumbUrl,
      })
    },
    [backendWrite.writePackageExternalMetadata],
  )

  return {
    metadataPending: backendWrite.pending.metadata || backendWrite.pending.grade,
    applyPackageGrade,
    applyPackageMetadata,
    applyPackageMetadataById,
    applyPackageExternalMetadataById,
    applyPackageSyncName,
    applyVideoMetadata,
    applyVideoSyncName,
  }
}

export type MetadataWriteBindingsResult = ReturnType<typeof useMetadataWriteBindings>
