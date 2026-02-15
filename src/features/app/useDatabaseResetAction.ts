import { useCallback, useState } from 'react'

import { useI18n } from '../../i18n/useI18n'
import type { MediaRepository } from '../backend/repository'

interface UseDatabaseResetActionParams {
  mediaRepository: MediaRepository
}

interface UseDatabaseResetActionResult {
  databaseResetPending: boolean
  databaseResetError: string | null
  clearDatabaseForDev: () => void
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return fallback
}

export function useDatabaseResetAction({ mediaRepository }: UseDatabaseResetActionParams): UseDatabaseResetActionResult {
  const { t } = useI18n()
  const [databaseResetPending, setDatabaseResetPending] = useState(false)
  const [databaseResetError, setDatabaseResetError] = useState<string | null>(null)
  const clearDatabaseForDev = useCallback(() => {
    if (!mediaRepository.clearDatabase) {
      setDatabaseResetError(t('ui.settings.databaseResetUnsupported'))
      return
    }

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            t('ui.settings.databaseResetConfirmPrompt'),
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
        setDatabaseResetError(toErrorMessage(error, t('ui.settings.databaseResetFailed')))
      })
      .finally(() => {
        setDatabaseResetPending(false)
      })
  }, [mediaRepository, t])

  return {
    databaseResetPending,
    databaseResetError,
    clearDatabaseForDev,
  }
}
