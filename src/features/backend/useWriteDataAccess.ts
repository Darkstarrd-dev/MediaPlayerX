import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import type {
  DeleteImageItemsResponseDto,
  DeleteSidebarNodesResponseDto,
  SaveVideoCoverRequestDto,
  SaveVideoCoverResponseDto,
  SetImageHiddenResponseDto,
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
  WritePackageMetadataRequestDto,
  WritePackageMetadataResponseDto,
  GeneratePackageAutoTagsRequestDto,
  GeneratePackageAutoTagsResponseDto,
  GeneratePackageAutoTagsVisionRequestDto,
  GeneratePackageAutoTagsVisionResponseDto,
  GeneratePackageEmbeddingsRequestDto,
  GeneratePackageEmbeddingsResponseDto,
  WriteVideoMetadataRequestDto,
  WriteVideoMetadataResponseDto,
} from '../../contracts/backend'
import type { MediaRepository } from './repository'

const DEFAULT_WRITE_TIMEOUT_MS = 8_000
const AUTO_TAG_WRITE_TIMEOUT_MS = 300_000
const EMBEDDING_WRITE_TIMEOUT_MS = 300_000

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '未知后端错误'
}

interface UseWriteDataAccessParams {
  repository: MediaRepository
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>
  setVideoCoverById: Dispatch<SetStateAction<Record<string, string>>>
  setVideoCoverImageById: Dispatch<SetStateAction<Record<string, string | null>>>
}

interface SyncWriteRepository extends MediaRepository {
  writePackageGradeSync(request: WritePackageGradeRequestDto): WritePackageGradeResponseDto
  writePackageMetadataSync?(request: WritePackageMetadataRequestDto): WritePackageMetadataResponseDto
  generatePackageAutoTagsSync?(request: GeneratePackageAutoTagsRequestDto): GeneratePackageAutoTagsResponseDto
  generatePackageAutoTagsVisionSync?(
    request: GeneratePackageAutoTagsVisionRequestDto,
  ): GeneratePackageAutoTagsVisionResponseDto
  generatePackageEmbeddingsSync?(
    request: GeneratePackageEmbeddingsRequestDto,
  ): GeneratePackageEmbeddingsResponseDto
  writeVideoMetadataSync?(request: WriteVideoMetadataRequestDto): WriteVideoMetadataResponseDto
  saveVideoCoverSync(request: SaveVideoCoverRequestDto): SaveVideoCoverResponseDto
}

function isSyncWriteRepository(repository: MediaRepository): repository is SyncWriteRepository {
  return (
    'writePackageGradeSync' in repository &&
    typeof repository.writePackageGradeSync === 'function' &&
    'saveVideoCoverSync' in repository &&
    typeof repository.saveVideoCoverSync === 'function'
  )
}

interface UseWriteDataAccessResult {
  pending: {
    grade: boolean
    metadata: boolean
    cover: boolean
    manage: boolean
  }
  errors: {
    grade: string | null
    metadata: string | null
    cover: string | null
    manage: string | null
  }
  clearGradeError: () => void
  clearMetadataError: () => void
  clearCoverError: () => void
  clearManageError: () => void
  writePackageGrade: (packageId: string, grade: number | null) => Promise<void>
  setImageHidden: (imageIds: string[], hidden: boolean) => Promise<SetImageHiddenResponseDto>
  deleteImageItems: (imageIds: string[]) => Promise<DeleteImageItemsResponseDto>
  deleteSidebarNodes: (nodeIds: string[]) => Promise<DeleteSidebarNodesResponseDto>
  writePackageMetadata: (
    packageId: string,
    payload: {
      workTitle: string
      circle: string
      author: string
      tags: string[]
      syncWorkTitleToPackageName?: boolean
    },
  ) => Promise<void>
  generatePackageAutoTags: (
    packageId: string,
    payload: {
      modelPath: string
      occurrenceThreshold: number
      generalMinScore: number
      characterMinScore: number
      includeRating: boolean
      ratingMinScore: number
    },
  ) => Promise<GeneratePackageAutoTagsResponseDto>
  generatePackageAutoTagsVision: (
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
  ) => Promise<GeneratePackageAutoTagsVisionResponseDto>
  generatePackageEmbeddings: (
    packageId: string,
    payload: {
      embeddingEndpoint: string
      embeddingModel: string
      maxConcurrency: number
      maxRetries: number
      timeoutMs: number
    },
  ) => Promise<GeneratePackageEmbeddingsResponseDto>
  writeVideoMetadata: (
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
  saveVideoCover: (videoId: string, timeSec: number, optimisticColor: string) => Promise<void>
}

export function useWriteDataAccess({
  repository,
  setGradeByPackage,
  setVideoCoverById,
  setVideoCoverImageById,
}: UseWriteDataAccessParams): UseWriteDataAccessResult {
  const isSynchronousTestMode = import.meta.env.MODE === 'test' && isSyncWriteRepository(repository)

  const [gradePending, setGradePending] = useState(false)
  const [metadataPending, setMetadataPending] = useState(false)
  const [coverPending, setCoverPending] = useState(false)
  const [managePending, setManagePending] = useState(false)
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [manageError, setManageError] = useState<string | null>(null)

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
        const request: WritePackageGradeRequestDto = {
          package_id: packageId,
          grade,
        }
        const response = isSynchronousTestMode
          ? repository.writePackageGradeSync(request)
          : await repository.writePackageGrade(request, {
              timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
            })

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
    [isSynchronousTestMode, repository, setGradeByPackage],
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
        const request: SaveVideoCoverRequestDto = {
          video_id: videoId,
          time_sec: Math.max(0, timeSec),
          fallback_color: optimisticColor,
        }
        const response = isSynchronousTestMode
          ? repository.saveVideoCoverSync(request)
          : await repository.saveVideoCover(request, {
              timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
            })

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
    [isSynchronousTestMode, repository, setVideoCoverById, setVideoCoverImageById],
  )

  const writePackageMetadata = useCallback(
    async (
      packageId: string,
      payload: {
        workTitle: string
        circle: string
        author: string
        tags: string[]
        syncWorkTitleToPackageName?: boolean
      },
    ) => {
      if (!repository.writePackageMetadata) {
        setMetadataError('当前后端不支持写入元数据')
        return
      }

      setMetadataPending(true)
      setMetadataError(null)

      try {
        const request: WritePackageMetadataRequestDto = {
          package_id: packageId,
          work_title: payload.workTitle,
          circle: payload.circle,
          author: payload.author,
          tags: payload.tags,
          sync_work_title_to_package_name: payload.syncWorkTitleToPackageName,
        }

        if (isSynchronousTestMode) {
          const writer = repository.writePackageMetadataSync
          if (!writer) {
            setMetadataError('当前后端不支持写入元数据')
            return
          }
          writer(request)
          return
        }

        await repository.writePackageMetadata(request, {
          timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
        })
      } catch (error: unknown) {
        setMetadataError(toErrorMessage(error))
      } finally {
        setMetadataPending(false)
      }
    },
    [isSynchronousTestMode, repository],
  )

  const generatePackageAutoTags = useCallback(
    async (
      packageId: string,
      payload: {
        modelPath: string
        occurrenceThreshold: number
        generalMinScore: number
        characterMinScore: number
        includeRating: boolean
        ratingMinScore: number
      },
    ): Promise<GeneratePackageAutoTagsResponseDto> => {
      if (!repository.generatePackageAutoTags) {
        const message = '当前后端不支持自动标签'
        setMetadataError(message)
        throw new Error(message)
      }

      setMetadataPending(true)
      setMetadataError(null)

      try {
        const request: GeneratePackageAutoTagsRequestDto = {
          package_id: packageId,
          model_path: payload.modelPath,
          occurrence_threshold: Math.max(1, Math.min(200, Math.floor(payload.occurrenceThreshold))),
          general_min_score: Math.max(0, Math.min(1, payload.generalMinScore)),
          character_min_score: Math.max(0, Math.min(1, payload.characterMinScore)),
          include_rating: payload.includeRating,
          rating_min_score: Math.max(0, Math.min(1, payload.ratingMinScore)),
        }

        if (isSynchronousTestMode) {
          const writer = repository.generatePackageAutoTagsSync
          if (!writer) {
            const message = '当前后端不支持自动标签'
            setMetadataError(message)
            throw new Error(message)
          }
          return writer(request)
        }

        return await repository.generatePackageAutoTags(request, {
          timeoutMs: AUTO_TAG_WRITE_TIMEOUT_MS,
        })
      } catch (error: unknown) {
        const message = toErrorMessage(error)
        setMetadataError(message)
        throw new Error(message)
      } finally {
        setMetadataPending(false)
      }
    },
    [isSynchronousTestMode, repository],
  )

  const generatePackageAutoTagsVision = useCallback(
    async (
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
    ): Promise<GeneratePackageAutoTagsVisionResponseDto> => {
      if (!repository.generatePackageAutoTagsVision) {
        const message = '当前后端不支持视觉自动标签'
        setMetadataError(message)
        throw new Error(message)
      }

      setMetadataPending(true)
      setMetadataError(null)

      try {
        const request: GeneratePackageAutoTagsVisionRequestDto = {
          package_id: packageId,
          tags_csv_path: payload.tagsCsvPath,
          llm_endpoint: payload.llmEndpoint,
          llm_model: payload.llmModel,
          sample_image_count: Math.max(1, Math.min(24, Math.floor(payload.sampleImageCount))),
          occurrence_threshold: Math.max(1, Math.min(24, Math.floor(payload.occurrenceThreshold))),
          temperature: Math.max(0, Math.min(1, payload.temperature)),
          timeout_ms: Math.max(3_000, Math.min(120_000, Math.floor(payload.timeoutMs))),
        }

        if (isSynchronousTestMode) {
          const writer = repository.generatePackageAutoTagsVisionSync
          if (!writer) {
            const message = '当前后端不支持视觉自动标签'
            setMetadataError(message)
            throw new Error(message)
          }
          return writer(request)
        }

        return await repository.generatePackageAutoTagsVision(request, {
          timeoutMs: AUTO_TAG_WRITE_TIMEOUT_MS,
        })
      } catch (error: unknown) {
        const message = toErrorMessage(error)
        setMetadataError(message)
        throw new Error(message)
      } finally {
        setMetadataPending(false)
      }
    },
    [isSynchronousTestMode, repository],
  )

  const generatePackageEmbeddings = useCallback(
    async (
      packageId: string,
      payload: {
        embeddingEndpoint: string
        embeddingModel: string
        maxConcurrency: number
        maxRetries: number
        timeoutMs: number
      },
    ): Promise<GeneratePackageEmbeddingsResponseDto> => {
      if (!repository.generatePackageEmbeddings) {
        const message = '当前后端不支持生成嵌入向量'
        setMetadataError(message)
        throw new Error(message)
      }

      setMetadataPending(true)
      setMetadataError(null)

      try {
        const request: GeneratePackageEmbeddingsRequestDto = {
          package_id: packageId,
          embedding_endpoint: payload.embeddingEndpoint,
          embedding_model: payload.embeddingModel,
          max_concurrency: Math.max(1, Math.min(8, Math.floor(payload.maxConcurrency))),
          max_retries: Math.max(0, Math.min(4, Math.floor(payload.maxRetries))),
          timeout_ms: Math.max(3_000, Math.min(120_000, Math.floor(payload.timeoutMs))),
        }

        if (isSynchronousTestMode) {
          const writer = repository.generatePackageEmbeddingsSync
          if (!writer) {
            const message = '当前后端不支持生成嵌入向量'
            setMetadataError(message)
            throw new Error(message)
          }
          return writer(request)
        }

        return await repository.generatePackageEmbeddings(request, {
          timeoutMs: EMBEDDING_WRITE_TIMEOUT_MS,
        })
      } catch (error: unknown) {
        const message = toErrorMessage(error)
        setMetadataError(message)
        throw new Error(message)
      } finally {
        setMetadataPending(false)
      }
    },
    [isSynchronousTestMode, repository],
  )

  const writeVideoMetadata = useCallback(
    async (
      videoId: string,
      payload: {
        workTitle: string
        circle: string
        author: string
        tags: string[]
        grade?: number | null
        syncFileNameToWorkTitle?: boolean
      },
    ) => {
      if (!repository.writeVideoMetadata) {
        setMetadataError('当前后端不支持写入视频元数据')
        return
      }

      setMetadataPending(true)
      setMetadataError(null)

      try {
        const request: WriteVideoMetadataRequestDto = {
          video_id: videoId,
          work_title: payload.workTitle,
          circle: payload.circle,
          author: payload.author,
          tags: payload.tags,
          grade: payload.grade,
          sync_file_name_to_work_title: payload.syncFileNameToWorkTitle,
        }

        if (isSynchronousTestMode) {
          const writer = repository.writeVideoMetadataSync
          if (!writer) {
            setMetadataError('当前后端不支持写入视频元数据')
            return
          }
          writer(request)
          return
        }

        await repository.writeVideoMetadata(request, {
          timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
        })
      } catch (error: unknown) {
        setMetadataError(toErrorMessage(error))
      } finally {
        setMetadataPending(false)
      }
    },
    [isSynchronousTestMode, repository],
  )

  const setImageHidden = useCallback(
    async (imageIds: string[], hidden: boolean): Promise<SetImageHiddenResponseDto> => {
      if (!repository.setImageHidden) {
        throw new Error('当前后端不支持隐藏管理操作')
      }

      const normalizedIds = Array.from(new Set(imageIds.map((id) => id.trim()).filter(Boolean)))
      if (normalizedIds.length === 0) {
        throw new Error('请选择需要隐藏/取消隐藏的图片')
      }

      setManagePending(true)
      setManageError(null)

      try {
        const response = await repository.setImageHidden(
          {
            image_ids: normalizedIds,
            hidden,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        )
        return response
      } catch (error: unknown) {
        const message = toErrorMessage(error)
        setManageError(message)
        throw new Error(message)
      } finally {
        setManagePending(false)
      }
    },
    [repository],
  )

  const deleteImageItems = useCallback(
    async (imageIds: string[]): Promise<DeleteImageItemsResponseDto> => {
      if (!repository.deleteImageItems) {
        throw new Error('当前后端不支持删除图片操作')
      }

      const normalizedIds = Array.from(new Set(imageIds.map((id) => id.trim()).filter(Boolean)))
      if (normalizedIds.length === 0) {
        throw new Error('请选择需要删除的图片')
      }

      setManagePending(true)
      setManageError(null)

      try {
        const response = await repository.deleteImageItems(
          {
            image_ids: normalizedIds,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        )
        return response
      } catch (error: unknown) {
        const message = toErrorMessage(error)
        setManageError(message)
        throw new Error(message)
      } finally {
        setManagePending(false)
      }
    },
    [repository],
  )

  const deleteSidebarNodes = useCallback(
    async (nodeIds: string[]): Promise<DeleteSidebarNodesResponseDto> => {
      if (!repository.deleteSidebarNodes) {
        throw new Error('当前后端不支持删除目录操作')
      }

      const normalizedIds = Array.from(new Set(nodeIds.map((id) => id.trim()).filter(Boolean)))
      if (normalizedIds.length === 0) {
        throw new Error('请选择需要删除的目录节点')
      }

      setManagePending(true)
      setManageError(null)

      try {
        const response = await repository.deleteSidebarNodes(
          {
            node_ids: normalizedIds,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        )
        return response
      } catch (error: unknown) {
        const message = toErrorMessage(error)
        setManageError(message)
        throw new Error(message)
      } finally {
        setManagePending(false)
      }
    },
    [repository],
  )

  return {
    pending: {
      grade: gradePending,
      metadata: metadataPending,
      cover: coverPending,
      manage: managePending,
    },
    errors: {
      grade: gradeError,
      metadata: metadataError,
      cover: coverError,
      manage: manageError,
    },
    clearGradeError: () => setGradeError(null),
    clearMetadataError: () => setMetadataError(null),
    clearCoverError: () => setCoverError(null),
    clearManageError: () => setManageError(null),
    writePackageGrade,
    setImageHidden,
    deleteImageItems,
    deleteSidebarNodes,
    writePackageMetadata,
    generatePackageAutoTags,
    generatePackageAutoTagsVision,
    generatePackageEmbeddings,
    writeVideoMetadata,
    saveVideoCover,
  }
}

export type WriteDataAccessResult = ReturnType<typeof useWriteDataAccess>
