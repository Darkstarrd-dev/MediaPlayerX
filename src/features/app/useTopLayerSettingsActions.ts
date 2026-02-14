import { useCallback, useEffect, useState } from 'react'

import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { MediaRepository } from '../backend/repository'
import type { RuntimeInfoDiagnosticsResult } from './useRuntimeInfoDiagnostics'
import {
  VISION_TEST_RED_IMAGE_BASE64,
  normalizeOptionalPath,
  toDirectoryDefaultPath,
} from './useAppTopLayerState.utils'
import { SETTINGS_STATE_KEY, toPersistedAppSettings } from './usePersistedAppSettings'

interface UseTopLayerSettingsActionsParams {
  appSettings: AppSettingsStoreSnapshot
  mediaRepository: MediaRepository
  runtimeInfoDiagnostics: RuntimeInfoDiagnosticsResult
}

interface TopLayerSettingsActionsResult {
  adReviewVisionTestPending: boolean
  adReviewVisionTestMessage: string | null
  adReviewVisionSavePending: boolean
  adReviewVisionSaveMessage: string | null
  runtimePathUpdatePending: boolean
  runtimePathUpdateMessage: string | null
  applyElectronNativeChromeEnabled: (value: boolean) => void
  testAdReviewVisionModel: () => Promise<void>
  saveAdReviewVisionModel: () => Promise<void>
  pickDatabaseDirectoryPath: () => Promise<void>
  pickThumbnailCacheDirectoryPath: () => Promise<void>
}

export function useTopLayerSettingsActions({
  appSettings,
  mediaRepository,
  runtimeInfoDiagnostics,
}: UseTopLayerSettingsActionsParams): TopLayerSettingsActionsResult {
  const {
    adReviewVisionEndpoint,
    adReviewVisionModel,
    adReviewVisionVerified,
    electronNativeChromeEnabled,
    updateSettings,
  } = appSettings
  const [adReviewVisionTestPending, setAdReviewVisionTestPending] = useState(false)
  const [adReviewVisionTestMessage, setAdReviewVisionTestMessage] = useState<string | null>(null)
  const [adReviewVisionSavePending, setAdReviewVisionSavePending] = useState(false)
  const [adReviewVisionSaveMessage, setAdReviewVisionSaveMessage] = useState<string | null>(null)
  const [runtimePathUpdatePending, setRuntimePathUpdatePending] = useState(false)
  const [runtimePathUpdateMessage, setRuntimePathUpdateMessage] = useState<string | null>(null)

  useEffect(() => {
    setAdReviewVisionTestMessage(null)
    setAdReviewVisionSaveMessage(null)
  }, [adReviewVisionEndpoint, adReviewVisionModel])

  useEffect(() => {
    const windowApi = typeof window !== 'undefined' ? window.mediaPlayerWindow : undefined
    if (!windowApi?.getNativeChromeEnabled) {
      return
    }

    let active = true
    void windowApi
      .getNativeChromeEnabled()
      .then((enabled) => {
        if (!active) {
          return
        }
        if (enabled !== electronNativeChromeEnabled) {
          updateSettings({ electronNativeChromeEnabled: enabled })
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [electronNativeChromeEnabled, updateSettings])

  const applyElectronNativeChromeEnabled = useCallback(
    (value: boolean) => {
      updateSettings({ electronNativeChromeEnabled: value })

      const windowApi = typeof window !== 'undefined' ? window.mediaPlayerWindow : undefined
      if (!windowApi?.setNativeChromeEnabled) {
        return
      }

      void windowApi
        .setNativeChromeEnabled(value)
        .then((applied) => {
          updateSettings({ electronNativeChromeEnabled: applied })
        })
        .catch(() => undefined)
    },
    [updateSettings],
  )

  const testAdReviewVisionModel = useCallback(async () => {
    const testVisionModel = mediaRepository.testAdReviewVisionModel
    if (!testVisionModel) {
      updateSettings({ adReviewVisionVerified: false })
      setAdReviewVisionTestMessage('当前后端不支持视觉模型测试')
      return
    }

    const normalizedEndpoint = adReviewVisionEndpoint.trim()
    const normalizedModel = adReviewVisionModel.trim()
    if (!normalizedEndpoint || !normalizedModel) {
      updateSettings({ adReviewVisionVerified: false })
      setAdReviewVisionTestMessage('请先填写视觉模型端口和模型ID')
      return
    }

    setAdReviewVisionTestPending(true)
    setAdReviewVisionTestMessage('测试中...')
    try {
      const response = await testVisionModel(
        {
          llm_endpoint: normalizedEndpoint,
          llm_model: normalizedModel,
          image_base64: VISION_TEST_RED_IMAGE_BASE64,
          timeout_ms: 12_000,
        },
        { timeoutMs: 15_000 },
      )

      updateSettings({
        adReviewVisionEndpoint: normalizedEndpoint,
        adReviewVisionModel: normalizedModel,
        adReviewVisionVerified: response.ok,
      })
      setAdReviewVisionTestMessage(response.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateSettings({ adReviewVisionVerified: false })
      setAdReviewVisionTestMessage(`模型测试失败：${message}`)
    } finally {
      setAdReviewVisionTestPending(false)
    }
  }, [adReviewVisionEndpoint, adReviewVisionModel, mediaRepository, updateSettings])

  const saveAdReviewVisionModel = useCallback(async () => {
    if (!mediaRepository.writeAppState) {
      setAdReviewVisionSaveMessage('当前后端不支持模型配置保存')
      return
    }

    const normalizedEndpoint = adReviewVisionEndpoint.trim()
    const normalizedModel = adReviewVisionModel.trim()
    if (!normalizedEndpoint || !normalizedModel) {
      setAdReviewVisionSaveMessage('请先填写视觉模型端口和模型ID')
      return
    }

    const persistableSettings = {
      ...toPersistedAppSettings(appSettings),
      adReviewVisionEndpoint: normalizedEndpoint,
      adReviewVisionModel: normalizedModel,
      adReviewVisionVerified,
    }

    setAdReviewVisionSavePending(true)
    try {
      await mediaRepository.writeAppState({
        state_key: SETTINGS_STATE_KEY,
        state_json: JSON.stringify(persistableSettings),
      })

      updateSettings({
        adReviewVisionEndpoint: normalizedEndpoint,
        adReviewVisionModel: normalizedModel,
        adReviewVisionVerified,
      })
      setAdReviewVisionSaveMessage('视觉模型配置已保存')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setAdReviewVisionSaveMessage(`保存失败：${message}`)
    } finally {
      setAdReviewVisionSavePending(false)
    }
  }, [adReviewVisionEndpoint, adReviewVisionModel, adReviewVisionVerified, appSettings, mediaRepository, updateSettings])

  const applyRuntimeStoragePaths = useCallback(
    async (patch: { database_dir?: string; thumbnail_cache_dir?: string }) => {
      const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
      if (!backendApi?.setRuntimeStoragePaths) {
        setRuntimePathUpdateMessage('当前后端不支持目录持久化')
        return
      }

      setRuntimePathUpdatePending(true)
      setRuntimePathUpdateMessage('目录保存中...')
      try {
        const response = await backendApi.setRuntimeStoragePaths(patch)
        setRuntimePathUpdateMessage(response.moved_database ? '目录已保存，已迁移数据库文件' : '目录已保存')
        runtimeInfoDiagnostics.retry()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setRuntimePathUpdateMessage(`目录保存失败：${message}`)
      } finally {
        setRuntimePathUpdatePending(false)
      }
    },
    [runtimeInfoDiagnostics],
  )

  const pickRuntimeDirectory = useCallback(
    async (params: {
      title: string
      defaultPath: string | undefined
      target: 'database' | 'thumbnail-cache'
    }) => {
      if (!mediaRepository.pickDirectoryPath) {
        return
      }

      const result = await mediaRepository.pickDirectoryPath({
        title: params.title,
        default_path: params.defaultPath,
      })

      const pickedPath = result.path?.trim() ?? ''
      if (!pickedPath) {
        return
      }

      if (params.target === 'database') {
        await applyRuntimeStoragePaths({ database_dir: pickedPath })
        return
      }

      await applyRuntimeStoragePaths({ thumbnail_cache_dir: pickedPath })
    },
    [applyRuntimeStoragePaths, mediaRepository],
  )

  const pickDatabaseDirectoryPath = useCallback(async () => {
    await pickRuntimeDirectory({
      title: '选择 SQL 库目录',
      defaultPath: toDirectoryDefaultPath(runtimeInfoDiagnostics.data?.database_path ?? ''),
      target: 'database',
    })
  }, [pickRuntimeDirectory, runtimeInfoDiagnostics.data?.database_path])

  const pickThumbnailCacheDirectoryPath = useCallback(async () => {
    await pickRuntimeDirectory({
      title: '选择缩略图缓存目录',
      defaultPath: normalizeOptionalPath(runtimeInfoDiagnostics.data?.thumbnail_cache_path ?? ''),
      target: 'thumbnail-cache',
    })
  }, [pickRuntimeDirectory, runtimeInfoDiagnostics.data?.thumbnail_cache_path])

  return {
    adReviewVisionTestPending,
    adReviewVisionTestMessage,
    adReviewVisionSavePending,
    adReviewVisionSaveMessage,
    runtimePathUpdatePending,
    runtimePathUpdateMessage,
    applyElectronNativeChromeEnabled,
    testAdReviewVisionModel,
    saveAdReviewVisionModel,
    pickDatabaseDirectoryPath,
    pickThumbnailCacheDirectoryPath,
  }
}
