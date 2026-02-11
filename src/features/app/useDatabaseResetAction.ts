import { useCallback, useEffect, useState } from 'react'

import type { ReadVectorDataStatusResponseDto } from '../../contracts/backend'
import type { MediaRepository } from '../backend/repository'

interface UseDatabaseResetActionParams {
  mediaRepository: MediaRepository
}

interface UseDatabaseResetActionResult {
  databaseResetPending: boolean
  databaseResetError: string | null
  clearDatabaseForDev: () => void
  vectorDataStatusLoading: boolean
  vectorDataStatusError: string | null
  vectorDataStatus: ReadVectorDataStatusResponseDto | null
  vectorDataClearPending: boolean
  vectorDataClearError: string | null
  refreshVectorDataStatus: () => void
  clearVectorDataForDev: () => void
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return fallback
}

export function useDatabaseResetAction({ mediaRepository }: UseDatabaseResetActionParams): UseDatabaseResetActionResult {
  const [databaseResetPending, setDatabaseResetPending] = useState(false)
  const [databaseResetError, setDatabaseResetError] = useState<string | null>(null)
  const [vectorDataStatusLoading, setVectorDataStatusLoading] = useState(false)
  const [vectorDataStatusError, setVectorDataStatusError] = useState<string | null>(null)
  const [vectorDataStatus, setVectorDataStatus] = useState<ReadVectorDataStatusResponseDto | null>(null)
  const [vectorDataClearPending, setVectorDataClearPending] = useState(false)
  const [vectorDataClearError, setVectorDataClearError] = useState<string | null>(null)

  const refreshVectorDataStatus = useCallback(() => {
    if (!mediaRepository.readVectorDataStatus) {
      setVectorDataStatus(null)
      setVectorDataStatusError('当前后端不支持向量数据状态读取')
      return
    }

    setVectorDataStatusLoading(true)
    setVectorDataStatusError(null)

    void mediaRepository
      .readVectorDataStatus({ timeoutMs: 8_000 })
      .then((response) => {
        setVectorDataStatus(response)
      })
      .catch((error: unknown) => {
        setVectorDataStatus(null)
        setVectorDataStatusError(toErrorMessage(error, '读取向量数据状态失败'))
      })
      .finally(() => {
        setVectorDataStatusLoading(false)
      })
  }, [mediaRepository])

  useEffect(() => {
    refreshVectorDataStatus()
  }, [refreshVectorDataStatus])

  const clearDatabaseForDev = useCallback(() => {
    if (!mediaRepository.clearDatabase) {
      setDatabaseResetError('当前后端不支持清除数据库')
      return
    }

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            '清除数据库将移除评分/封面/任务/播放列表缓存，并清空导入引用列表与缩略图/归一化缓存。仅建议开发调试使用，确认继续？',
          )

    if (!confirmed) {
      return
    }

    setDatabaseResetPending(true)
    setDatabaseResetError(null)

    void mediaRepository
      .clearDatabase({ timeoutMs: 15_000 })
      .then(() => {
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      })
      .catch((error: unknown) => {
        setDatabaseResetError(toErrorMessage(error, '清除数据库失败'))
      })
      .finally(() => {
        setDatabaseResetPending(false)
      })
  }, [mediaRepository])

  const clearVectorDataForDev = useCallback(() => {
    if (!mediaRepository.clearVectorData) {
      setVectorDataClearError('当前后端不支持清空向量数据')
      return
    }

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm('清空向量数据将把所有图片的 embedding 向量置空，确认继续？')

    if (!confirmed) {
      return
    }

    setVectorDataClearPending(true)
    setVectorDataClearError(null)

    void mediaRepository
      .clearVectorData({ timeoutMs: 15_000 })
      .then(() => {
        refreshVectorDataStatus()
      })
      .catch((error: unknown) => {
        setVectorDataClearError(toErrorMessage(error, '清空向量数据失败'))
      })
      .finally(() => {
        setVectorDataClearPending(false)
      })
  }, [mediaRepository, refreshVectorDataStatus])

  return {
    databaseResetPending,
    databaseResetError,
    clearDatabaseForDev,
    vectorDataStatusLoading,
    vectorDataStatusError,
    vectorDataStatus,
    vectorDataClearPending,
    vectorDataClearError,
    refreshVectorDataStatus,
    clearVectorDataForDev,
  }
}
