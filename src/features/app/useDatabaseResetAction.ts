import { useCallback, useState } from 'react'

import type { MediaRepository } from '../backend/repository'

interface UseDatabaseResetActionParams {
  mediaRepository: MediaRepository
}

interface UseDatabaseResetActionResult {
  databaseResetPending: boolean
  databaseResetError: string | null
  clearDatabaseForDev: () => void
}

export function useDatabaseResetAction({ mediaRepository }: UseDatabaseResetActionParams): UseDatabaseResetActionResult {
  const [databaseResetPending, setDatabaseResetPending] = useState(false)
  const [databaseResetError, setDatabaseResetError] = useState<string | null>(null)

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
        if (error instanceof Error && error.message.trim().length > 0) {
          setDatabaseResetError(error.message)
          return
        }
        setDatabaseResetError('清除数据库失败')
      })
      .finally(() => {
        setDatabaseResetPending(false)
      })
  }, [mediaRepository])

  return {
    databaseResetPending,
    databaseResetError,
    clearDatabaseForDev,
  }
}
