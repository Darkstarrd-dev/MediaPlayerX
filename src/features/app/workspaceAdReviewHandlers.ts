import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'

interface CreateAdReviewSettingHandlersParams {
  updateSettings: AppSettingsStoreSnapshot['updateSettings']
}

export function createAdReviewSettingHandlers({ updateSettings }: CreateAdReviewSettingHandlersParams) {
  const onAdReviewStrategyModeChange = (value: AppSettingsStoreSnapshot['adReviewStrategyMode']) => {
    updateSettings({ adReviewStrategyMode: value })
  }

  const onAdReviewMaxConcurrencyChange = (value: number) => {
    updateSettings({
      adReviewMaxConcurrency: Math.max(4, Math.min(12, Math.floor(value))),
    })
  }

  const onAdReviewHeadNChange = (value: number) => {
    updateSettings({
      adReviewHeadN: Math.max(0, Math.min(200, Math.floor(value))),
    })
  }

  const onAdReviewTailNChange = (value: number) => {
    updateSettings({
      adReviewTailN: Math.max(0, Math.min(200, Math.floor(value))),
    })
  }

  const onAdReviewTailStopCleanStreakChange = (value: number) => {
    updateSettings({
      adReviewTailStopCleanStreak: Math.max(1, Math.min(200, Math.floor(value))),
    })
  }

  return {
    onAdReviewStrategyModeChange,
    onAdReviewMaxConcurrencyChange,
    onAdReviewHeadNChange,
    onAdReviewTailNChange,
    onAdReviewTailStopCleanStreakChange,
  }
}
