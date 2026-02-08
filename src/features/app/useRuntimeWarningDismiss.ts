import { useCallback, useMemo, useState } from 'react'

const RUNTIME_WARNING_DISMISS_STORAGE_KEY = 'mediaplayerx:runtime-warning-dismiss-key'

interface UseRuntimeWarningDismissParams {
  runtimeWarningKey: string
  warningCount: number
}

interface UseRuntimeWarningDismissResult {
  visible: boolean
  dismiss: () => void
}

export function useRuntimeWarningDismiss({
  runtimeWarningKey,
  warningCount,
}: UseRuntimeWarningDismissParams): UseRuntimeWarningDismissResult {
  const [dismissedRuntimeWarningKey, setDismissedRuntimeWarningKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const value = window.localStorage.getItem(RUNTIME_WARNING_DISMISS_STORAGE_KEY)
    return value && value.trim().length > 0 ? value : null
  })

  const visible = useMemo(
    () => warningCount > 0 && dismissedRuntimeWarningKey !== runtimeWarningKey,
    [dismissedRuntimeWarningKey, runtimeWarningKey, warningCount],
  )

  const dismiss = useCallback(() => {
    setDismissedRuntimeWarningKey(runtimeWarningKey)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RUNTIME_WARNING_DISMISS_STORAGE_KEY, runtimeWarningKey)
    }
  }, [runtimeWarningKey])

  return {
    visible,
    dismiss,
  }
}
