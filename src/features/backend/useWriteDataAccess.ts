import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import type { ReadonlyMediaRepository } from './repository'

const DEFAULT_WRITE_TIMEOUT_MS = 8_000

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '未知后端错误'
}

interface UseWriteDataAccessParams {
  repository: ReadonlyMediaRepository
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>
  setVideoCoverById: Dispatch<SetStateAction<Record<string, string>>>
  setVideoCoverImageById: Dispatch<SetStateAction<Record<string, string | null>>>
}

interface UseWriteDataAccessResult {
  pending: {
    grade: boolean
    cover: boolean
  }
  errors: {
    grade: string | null
    cover: string | null
  }
  clearGradeError: () => void
  clearCoverError: () => void
  writePackageGrade: (packageId: string, grade: number | null) => Promise<void>
  saveVideoCover: (videoId: string, timeSec: number, optimisticColor: string) => Promise<void>
}

export function useWriteDataAccess({
  repository,
  setGradeByPackage,
  setVideoCoverById,
  setVideoCoverImageById,
}: UseWriteDataAccessParams): UseWriteDataAccessResult {
  const [gradePending, setGradePending] = useState(false)
  const [coverPending, setCoverPending] = useState(false)
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)

  const writePackageGrade = useCallback(
    async (packageId: string, grade: number | null) => {
      let previousGrade: number | null = null
      setGradeByPackage((previous) => {
        previousGrade = previous[packageId] ?? null
        return {
          ...previous,
          [packageId]: grade,
        }
      })

      setGradePending(true)
      setGradeError(null)

      try {
        const response = await repository.writePackageGrade(
          {
            package_id: packageId,
            grade,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        )

        setGradeByPackage((previous) => ({
          ...previous,
          [packageId]: response.grade,
        }))
      } catch (error: unknown) {
        setGradeByPackage((previous) => ({
          ...previous,
          [packageId]: previousGrade,
        }))
        setGradeError(toErrorMessage(error))
      } finally {
        setGradePending(false)
      }
    },
    [repository, setGradeByPackage],
  )

  const saveVideoCover = useCallback(
    async (videoId: string, timeSec: number, optimisticColor: string) => {
      let previousColor: string | null = null
      let previousCoverImagePath: string | null = null
      setVideoCoverById((previous) => {
        previousColor = previous[videoId] ?? null
        return {
          ...previous,
          [videoId]: optimisticColor,
        }
      })
      setVideoCoverImageById((previous) => {
        previousCoverImagePath = previous[videoId] ?? null
        return previous
      })

      setCoverPending(true)
      setCoverError(null)

      try {
        const response = await repository.saveVideoCover(
          {
            video_id: videoId,
            time_sec: Math.max(0, timeSec),
            fallback_color: optimisticColor,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        )

        setVideoCoverById((previous) => ({
          ...previous,
          [videoId]: response.cover_color,
        }))
        setVideoCoverImageById((previous) => ({
          ...previous,
          [videoId]: response.cover_image_path,
        }))
      } catch (error: unknown) {
        setVideoCoverById((previous) => ({
          ...previous,
          [videoId]: previousColor ?? optimisticColor,
        }))
        setVideoCoverImageById((previous) => ({
          ...previous,
          [videoId]: previousCoverImagePath,
        }))
        setCoverError(toErrorMessage(error))
      } finally {
        setCoverPending(false)
      }
    },
    [repository, setVideoCoverById, setVideoCoverImageById],
  )

  return {
    pending: {
      grade: gradePending,
      cover: coverPending,
    },
    errors: {
      grade: gradeError,
      cover: coverError,
    },
    clearGradeError: () => setGradeError(null),
    clearCoverError: () => setCoverError(null),
    writePackageGrade,
    saveVideoCover,
  }
}
