import { useCallback, useEffect, useRef, useState } from 'react'

import { useI18n } from '../../i18n/useI18n'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { MediaRepository } from '../backend/repository'
import type { RuntimeInfoDiagnosticsResult } from './useRuntimeInfoDiagnostics'
import {
  VISION_TEST_RED_IMAGE_BASE64,
  normalizeOptionalPath,
  toDirectoryDefaultPath,
} from './useAppTopLayerState.utils'
import { SETTINGS_STATE_KEY, toPersistedAppSettings } from './usePersistedAppSettings'
import { toErrorDetailWithCode } from './errorCode'
import { FIXED_SUBTITLE_MODEL_ID, FIXED_SUBTITLE_MODEL_URL } from '../subtitles/fixedModel'

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
  pickSubtitleModelDirectoryPath: () => Promise<void>
  subtitleModelsLoading: boolean
  subtitleModelsError: string | null
  subtitleModelsStatus: string | null
  subtitleRemoteModels: Array<{
    id: string
    label: string
    languageCodes: string[]
    sizeBytes: number
    homepageUrl: string | null
  }>
  subtitleLocalModels: Array<{
    id: string
    label: string
    modelDir: string
    sizeBytes: number
    source: 'downloaded' | 'manual'
  }>
  subtitleDownloadTask: {
    downloadId: string
    status: 'queued' | 'downloading' | 'verifying' | 'completed' | 'failed' | 'cancelled'
    percent: number
    speedBps: number
    etaSec: number | null
    message: string | null
  } | null
  subtitleDownloadPending: boolean
  refreshSubtitleModels: () => Promise<void>
  startSubtitleModelDownload: () => Promise<void>
  cancelSubtitleModelDownload: () => Promise<void>
  openSubtitleModelPage: () => Promise<void>
}

export function useTopLayerSettingsActions({
  appSettings,
  mediaRepository,
  runtimeInfoDiagnostics,
}: UseTopLayerSettingsActionsParams): TopLayerSettingsActionsResult {
  const { t } = useI18n()
  const handledTerminalDownloadKeyRef = useRef<string | null>(null)

  const {
    adReviewVisionEndpoint,
    adReviewVisionModel,
    adReviewVisionVerified,
    electronNativeChromeEnabled,
    proxyServer,
    subtitleModelDir,
    updateSettings,
  } = appSettings
  const [adReviewVisionTestPending, setAdReviewVisionTestPending] = useState(false)
  const [adReviewVisionTestMessage, setAdReviewVisionTestMessage] = useState<string | null>(null)
  const [adReviewVisionSavePending, setAdReviewVisionSavePending] = useState(false)
  const [adReviewVisionSaveMessage, setAdReviewVisionSaveMessage] = useState<string | null>(null)
  const [runtimePathUpdatePending, setRuntimePathUpdatePending] = useState(false)
  const [runtimePathUpdateMessage, setRuntimePathUpdateMessage] = useState<string | null>(null)
  const [subtitleModelsLoading, setSubtitleModelsLoading] = useState(false)
  const [subtitleModelsError, setSubtitleModelsError] = useState<string | null>(null)
  const [subtitleModelsStatus, setSubtitleModelsStatus] = useState<string | null>(null)
  const [subtitleRemoteModels, setSubtitleRemoteModels] = useState<TopLayerSettingsActionsResult['subtitleRemoteModels']>([])
  const [subtitleLocalModels, setSubtitleLocalModels] = useState<TopLayerSettingsActionsResult['subtitleLocalModels']>([])
  const [subtitleDownloadTask, setSubtitleDownloadTask] = useState<TopLayerSettingsActionsResult['subtitleDownloadTask']>(null)
  const [subtitleDownloadPending, setSubtitleDownloadPending] = useState(false)

  const normalizeFsPath = useCallback((rawPath: string): string => {
    return rawPath.trim().replace(/[\\/]+$/, '').toLowerCase()
  }, [])

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
      setAdReviewVisionTestMessage(t('ui.settings.visionModelTestUnsupported'))
      return
    }

    const normalizedEndpoint = adReviewVisionEndpoint.trim()
    const normalizedModel = adReviewVisionModel.trim()
    if (!normalizedEndpoint || !normalizedModel) {
      updateSettings({ adReviewVisionVerified: false })
      setAdReviewVisionTestMessage(t('ui.settings.visionModelRequired'))
      return
    }

    setAdReviewVisionTestPending(true)
    setAdReviewVisionTestMessage(t('ui.settings.visionModelTesting'))
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
      const message = toErrorDetailWithCode(error, t)
      updateSettings({ adReviewVisionVerified: false })
      setAdReviewVisionTestMessage(t('ui.settings.visionModelTestFailed', { message }))
    } finally {
      setAdReviewVisionTestPending(false)
    }
  }, [adReviewVisionEndpoint, adReviewVisionModel, mediaRepository, t, updateSettings])

  const saveAdReviewVisionModel = useCallback(async () => {
    if (!mediaRepository.writeAppState) {
      setAdReviewVisionSaveMessage(t('ui.settings.visionModelSaveUnsupported'))
      return
    }

    const normalizedEndpoint = adReviewVisionEndpoint.trim()
    const normalizedModel = adReviewVisionModel.trim()
    if (!normalizedEndpoint || !normalizedModel) {
      setAdReviewVisionSaveMessage(t('ui.settings.visionModelRequired'))
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
      setAdReviewVisionSaveMessage(t('ui.settings.visionModelSaved'))
    } catch (error) {
      const message = toErrorDetailWithCode(error, t)
      setAdReviewVisionSaveMessage(t('ui.settings.visionModelSaveFailed', { message }))
    } finally {
      setAdReviewVisionSavePending(false)
    }
  }, [adReviewVisionEndpoint, adReviewVisionModel, adReviewVisionVerified, appSettings, mediaRepository, t, updateSettings])

  const applyRuntimeStoragePaths = useCallback(
    async (patch: { database_dir?: string; thumbnail_cache_dir?: string }) => {
      const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
      if (!backendApi?.setRuntimeStoragePaths) {
        setRuntimePathUpdateMessage(t('ui.settings.runtimePathUnsupported'))
        return
      }

      setRuntimePathUpdatePending(true)
      setRuntimePathUpdateMessage(t('ui.settings.runtimePathSaving'))
      try {
        const response = await backendApi.setRuntimeStoragePaths(patch)
        setRuntimePathUpdateMessage(
          response.moved_database
            ? t('ui.settings.runtimePathSavedMigrated')
            : t('ui.settings.runtimePathSaved'),
        )
        runtimeInfoDiagnostics.retry()
      } catch (error) {
        const message = toErrorDetailWithCode(error, t)
        setRuntimePathUpdateMessage(t('ui.settings.runtimePathSaveFailed', { message }))
      } finally {
        setRuntimePathUpdatePending(false)
      }
    },
    [runtimeInfoDiagnostics, t],
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
      title: t('ui.settings.pickSqlDirectoryDialogTitle'),
      defaultPath: toDirectoryDefaultPath(runtimeInfoDiagnostics.data?.database_path ?? ''),
      target: 'database',
    })
  }, [pickRuntimeDirectory, runtimeInfoDiagnostics.data?.database_path, t])

  const pickThumbnailCacheDirectoryPath = useCallback(async () => {
    await pickRuntimeDirectory({
      title: t('ui.settings.pickThumbnailDirectoryDialogTitle'),
      defaultPath: normalizeOptionalPath(runtimeInfoDiagnostics.data?.thumbnail_cache_path ?? ''),
      target: 'thumbnail-cache',
    })
  }, [pickRuntimeDirectory, runtimeInfoDiagnostics.data?.thumbnail_cache_path, t])

  const pickSubtitleModelDirectoryPath = useCallback(async () => {
    if (!mediaRepository.pickDirectoryPath) {
      return
    }

    const result = await mediaRepository.pickDirectoryPath({
      title: t('ui.settings.pickSubtitleModelDirectoryDialogTitle'),
      default_path: normalizeOptionalPath(subtitleModelDir),
    })

    const pickedPath = result.path?.trim() ?? ''
    if (!pickedPath) {
      return
    }

    updateSettings({ subtitleModelDir: pickedPath })
  }, [mediaRepository, subtitleModelDir, t, updateSettings])

  const syncSubtitleDownloadTasks = useCallback(async () => {
    if (!mediaRepository.readSubtitleModelDownloads) {
      setSubtitleDownloadTask(null)
      return
    }

    const response = await mediaRepository.readSubtitleModelDownloads()
    const selectedTask =
      response.tasks.find(
        (task) =>
          task.model_id === FIXED_SUBTITLE_MODEL_ID &&
          (task.status === 'queued' || task.status === 'downloading' || task.status === 'verifying'),
      ) ??
      response.tasks.find((task) => task.model_id === FIXED_SUBTITLE_MODEL_ID) ??
      response.tasks[0] ??
      null

    if (!selectedTask) {
      setSubtitleDownloadTask(null)
      return
    }

    setSubtitleDownloadTask({
      downloadId: selectedTask.download_id,
      status: selectedTask.status,
      percent: selectedTask.percent,
      speedBps: selectedTask.speed_bps,
      etaSec: selectedTask.eta_sec,
      message: selectedTask.message,
    })
  }, [mediaRepository])

  const refreshSubtitleModels = useCallback(async (options?: { modelDirOverride?: string }) => {
    const effectiveModelDir = (options?.modelDirOverride ?? subtitleModelDir).trim()

    setSubtitleModelsLoading(true)
    setSubtitleModelsError(null)

    try {
      setSubtitleRemoteModels([
        {
          id: FIXED_SUBTITLE_MODEL_ID,
          label: 'SenseVoice Small INT8 (zh/en/ja/ko/yue) 2024-07-17',
          languageCodes: ['zh', 'en', 'ja', 'ko', 'yue'],
          sizeBytes: 236_000_000,
          homepageUrl: FIXED_SUBTITLE_MODEL_URL,
        },
      ])

      if (mediaRepository.listSubtitleLocalModels && effectiveModelDir) {
        const localResponse = await mediaRepository.listSubtitleLocalModels({
          model_dir: effectiveModelDir,
        })
        const nextLocalModels = localResponse.models.map((model) => ({
          id: model.id,
          label: model.label,
          modelDir: model.model_dir,
          sizeBytes: model.size_bytes,
          source: model.source,
        }))
        setSubtitleLocalModels(nextLocalModels)

        const selectedDirNormalized = normalizeFsPath(effectiveModelDir)
        const matchedInSelectedDir = nextLocalModels.find(
          (model) => normalizeFsPath(model.modelDir) === selectedDirNormalized,
        )

        if (matchedInSelectedDir) {
          setSubtitleModelsStatus(t('ui.settings.offlineSubtitleScanValid'))
        } else if (nextLocalModels.length > 0) {
          setSubtitleModelsStatus(
            t('ui.settings.offlineSubtitleScanSelectConcreteDir', {
              count: String(nextLocalModels.length),
            }),
          )
        } else {
          setSubtitleModelsStatus(t('ui.settings.offlineSubtitleScanMissing'))
        }
      } else {
        setSubtitleLocalModels([])
        setSubtitleModelsStatus(
          effectiveModelDir ? t('ui.settings.offlineSubtitleScanMissing') : t('ui.settings.offlineSubtitleModelDirRequired'),
        )
      }

      await syncSubtitleDownloadTasks()

    } catch (error) {
      setSubtitleModelsError(toErrorDetailWithCode(error, t))
      setSubtitleModelsStatus(null)
    } finally {
      setSubtitleModelsLoading(false)
    }
  }, [mediaRepository, normalizeFsPath, subtitleModelDir, syncSubtitleDownloadTasks, t])

  const startSubtitleModelDownload = useCallback(async () => {
    if (!mediaRepository.startSubtitleModelDownload) {
      setSubtitleModelsError(t('ui.settings.offlineSubtitleDownloadUnsupported'))
      return
    }

    const modelDir = subtitleModelDir.trim()
    if (!modelDir) {
      setSubtitleModelsError(t('ui.settings.offlineSubtitleModelDirRequired'))
      return
    }

    const normalizedProxy = proxyServer.trim()
    const useProxy = normalizedProxy
      ? window.confirm(t('ui.settings.offlineSubtitleProxyConfirm', { proxy: normalizedProxy }))
      : false

    setSubtitleDownloadPending(true)
    setSubtitleModelsError(null)

    try {
      const response = await mediaRepository.startSubtitleModelDownload({
        model_id: FIXED_SUBTITLE_MODEL_ID,
        model_dir: modelDir,
        use_proxy: useProxy,
        proxy_url: useProxy ? normalizedProxy : null,
      })

      setSubtitleDownloadTask({
        downloadId: response.task.download_id,
        status: response.task.status,
        percent: response.task.percent,
        speedBps: response.task.speed_bps,
        etaSec: response.task.eta_sec,
        message: response.task.message,
      })
      await refreshSubtitleModels()
    } catch (error) {
      setSubtitleModelsError(t('ui.settings.offlineSubtitleDownloadFailed', { message: toErrorDetailWithCode(error, t) }))
    } finally {
      setSubtitleDownloadPending(false)
    }
  }, [mediaRepository, proxyServer, refreshSubtitleModels, subtitleModelDir, t])

  const cancelSubtitleModelDownload = useCallback(async () => {
    if (!mediaRepository.cancelSubtitleModelDownload || !subtitleDownloadTask) {
      return
    }

    try {
      await mediaRepository.cancelSubtitleModelDownload({
        download_id: subtitleDownloadTask.downloadId,
      })
      await syncSubtitleDownloadTasks()
    } catch (error) {
      setSubtitleModelsError(toErrorDetailWithCode(error, t))
    }
  }, [mediaRepository, subtitleDownloadTask, syncSubtitleDownloadTasks, t])

  const openSubtitleModelPage = useCallback(async () => {
    try {
      const targetUrl = FIXED_SUBTITLE_MODEL_URL
      const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
      const openExternalUrl = backendApi?.openExternalUrl
      if (openExternalUrl) {
        const response = await openExternalUrl({ url: targetUrl })
        if (response.ok) {
          return
        }
      }

      const popup = window.open(targetUrl, '_blank', 'noopener,noreferrer')
      if (!popup) {
        throw new Error('subtitle_open_model_page_blocked')
      }
    } catch (error) {
      setSubtitleModelsError(t('ui.settings.offlineSubtitleOpenModelPageFailed', { message: toErrorDetailWithCode(error, t) }))
    }
  }, [t])

  useEffect(() => {
    if (!appSettings.settingsOpen) {
      return
    }

    updateSettings({
      subtitleAcceleration: 'cpu',
      subtitleSelectedModelId: FIXED_SUBTITLE_MODEL_ID,
    })

    void refreshSubtitleModels()
  }, [appSettings.settingsOpen, refreshSubtitleModels, subtitleModelDir, updateSettings])

  useEffect(() => {
    if (!subtitleDownloadTask) {
      return
    }

    if (
      subtitleDownloadTask.status !== 'queued' &&
      subtitleDownloadTask.status !== 'downloading' &&
      subtitleDownloadTask.status !== 'verifying'
    ) {
      return
    }

    const timer = window.setInterval(() => {
      void syncSubtitleDownloadTasks()
    }, 800)

    return () => {
      window.clearInterval(timer)
    }
  }, [subtitleDownloadTask, syncSubtitleDownloadTasks])

  useEffect(() => {
    if (!subtitleDownloadTask) {
      return
    }

    if (
      subtitleDownloadTask.status !== 'completed' &&
      subtitleDownloadTask.status !== 'failed' &&
      subtitleDownloadTask.status !== 'cancelled'
    ) {
      return
    }

    const terminalKey = `${subtitleDownloadTask.downloadId}:${subtitleDownloadTask.status}`
    if (handledTerminalDownloadKeyRef.current === terminalKey) {
      return
    }
    handledTerminalDownloadKeyRef.current = terminalKey

    if (subtitleDownloadTask.status === 'completed') {
      void refreshSubtitleModels()
    }
  }, [refreshSubtitleModels, subtitleDownloadTask])

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
    pickSubtitleModelDirectoryPath,
    subtitleModelsLoading,
    subtitleModelsError,
    subtitleModelsStatus,
    subtitleRemoteModels,
    subtitleLocalModels,
    subtitleDownloadTask,
    subtitleDownloadPending,
    refreshSubtitleModels,
    startSubtitleModelDownload,
    cancelSubtitleModelDownload,
    openSubtitleModelPage,
  }
}
