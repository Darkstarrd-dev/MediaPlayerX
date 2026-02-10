import { useCallback } from 'react'

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
}

interface UseMetadataWriteBindingsResult {
  metadataPending: boolean
  applyPackageGrade: (grade: number | null) => void
  applyPackageMetadata: (payload: PackageMetadataWritePayload) => void
  applyVideoMetadata: (payload: VideoMetadataWritePayload) => void
}

export function useMetadataWriteBindings({
  backendWrite,
  metadataImagePackageId,
  focusedVideoId,
}: UseMetadataWriteBindingsParams): UseMetadataWriteBindingsResult {
  const applyPackageGrade = useCallback(
    (grade: number | null) => {
      if (!metadataImagePackageId) {
        return
      }
      void backendWrite.writePackageGrade(metadataImagePackageId, grade)
    },
    [backendWrite, metadataImagePackageId],
  )

  const applyPackageMetadata = useCallback(
    (payload: PackageMetadataWritePayload) => {
      if (!metadataImagePackageId || !backendWrite.writePackageMetadata) {
        return
      }
      void backendWrite.writePackageMetadata(metadataImagePackageId, payload)
    },
    [backendWrite, metadataImagePackageId],
  )

  const applyVideoMetadata = useCallback(
    (payload: VideoMetadataWritePayload) => {
      if (!focusedVideoId || !backendWrite.writeVideoMetadata) {
        return
      }
      void backendWrite.writeVideoMetadata(focusedVideoId, payload)
    },
    [backendWrite, focusedVideoId],
  )

  return {
    metadataPending: backendWrite.pending.metadata || backendWrite.pending.grade,
    applyPackageGrade,
    applyPackageMetadata,
    applyVideoMetadata,
  }
}

export type MetadataWriteBindingsResult = ReturnType<typeof useMetadataWriteBindings>
