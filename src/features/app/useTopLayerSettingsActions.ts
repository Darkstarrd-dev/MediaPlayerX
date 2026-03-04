import { useCallback, useEffect, useRef, useState } from 'react'

import { useI18n } from '../../i18n/useI18n'
import type { ExternalAuthStatusResponseDto } from '../../contracts/backend'
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
import {
  getSubtitleModelSelectionProfile,
  normalizeSubtitleModelSelectionId,
} from '../subtitles/fixedModel'

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
  adReviewKnownHashImportPending: boolean
  adReviewKnownHashImportMessage: string | null
  adReviewKnownHashExportPending: boolean
  adReviewKnownHashExportMessage: string | null
  runtimePathUpdatePending: boolean
  runtimePathUpdateMessage: string | null
  ehentaiAuthStatus: ExternalAuthStatusResponseDto | null
  ehentaiAuthChecking: boolean
  ehentaiAuthConnectPending: boolean
  ehentaiAuthDisconnectPending: boolean
  applyElectronNativeChromeEnabled: (value: boolean) => void
  testAdReviewVisionModel: () => Promise<void>
  saveAdReviewVisionModel: () => Promise<void>
  importAdReviewKnownHashes: () => Promise<void>
  exportAdReviewKnownHashes: () => Promise<void>
  refreshEhentaiAuthStatus: () => Promise<void>
  connectEhentaiAuth: () => Promise<void>
  disconnectEhentaiAuth: () => Promise<void>
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
  subtitleModelDownloadSupported: boolean
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
    subtitleModelDirByProfile,
    subtitleSelectedModelId,
    updateSettings,
  } = appSettings
  const [adReviewVisionTestPending, setAdReviewVisionTestPending] = useState(false)
  const [adReviewVisionTestMessage, setAdReviewVisionTestMessage] = useState<string | null>(null)
  const [adReviewVisionSavePending, setAdReviewVisionSavePending] = useState(false)
  const [adReviewVisionSaveMessage, setAdReviewVisionSaveMessage] = useState<string | null>(null)
  const [adReviewKnownHashImportPending, setAdReviewKnownHashImportPending] = useState(false)
  const [adReviewKnownHashImportMessage, setAdReviewKnownHashImportMessage] = useState<string | null>(null)
  const [adReviewKnownHashExportPending, setAdReviewKnownHashExportPending] = useState(false)
  const [adReviewKnownHashExportMessage, setAdReviewKnownHashExportMessage] = useState<string | null>(null)
  const [runtimePathUpdatePending, setRuntimePathUpdatePending] = useState(false)
  const [runtimePathUpdateMessage, setRuntimePathUpdateMessage] = useState<string | null>(null)
  const [ehentaiAuthStatus, setEhentaiAuthStatus] = useState<ExternalAuthStatusResponseDto | null>(null)
  const [ehentaiAuthChecking, setEhentaiAuthChecking] = useState(false)
  const [ehentaiAuthConnectPending, setEhentaiAuthConnectPending] = useState(false)
  const [ehentaiAuthDisconnectPending, setEhentaiAuthDisconnectPending] = useState(false)
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

  const resolvedSubtitleModelId = normalizeSubtitleModelSelectionId(subtitleSelectedModelId)
  const resolvedSubtitleModel = getSubtitleModelSelectionProfile(resolvedSubtitleModelId)
  const resolvedSubtitleModelDir =
    (subtitleModelDirByProfile[resolvedSubtitleModelId] ?? subtitleModelDir).trim()

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

  const importAdReviewKnownHashes = useCallback(async () => {
    if (!mediaRepository.pickFilePath || !mediaRepository.importManageAdReviewKnownHashes) {
      setAdReviewKnownHashImportMessage(t('ui.settings.adReviewKnownHashesImportUnsupported'))
      return
    }

    const picked = await mediaRepository.pickFilePath({
      title: t('ui.settings.adReviewKnownHashesPickImportFile'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (picked.canceled || !picked.path) {
      return
    }

    setAdReviewKnownHashImportPending(true)
    setAdReviewKnownHashImportMessage(t('ui.settings.adReviewKnownHashesImporting'))
    try {
      const response = await mediaRepository.importManageAdReviewKnownHashes({
        file_path: picked.path,
      })
      setAdReviewKnownHashImportMessage(
        t('ui.settings.adReviewKnownHashesImportDone', {
          imported: String(response.imported_count),
          duplicate: String(response.duplicate_count),
          total: String(response.total_count),
        }),
      )
    } catch (error) {
      setAdReviewKnownHashImportMessage(
        t('ui.settings.adReviewKnownHashesImportFailed', {
          message: toErrorDetailWithCode(error, t),
        }),
      )
    } finally {
      setAdReviewKnownHashImportPending(false)
    }
  }, [mediaRepository, t])

  const exportAdReviewKnownHashes = useCallback(async () => {
    if (!mediaRepository.pickDirectoryPath || !mediaRepository.exportManageAdReviewKnownHashes) {
      setAdReviewKnownHashExportMessage(t('ui.settings.adReviewKnownHashesExportUnsupported'))
      return
    }

    const picked = await mediaRepository.pickDirectoryPath({
      title: t('ui.settings.adReviewKnownHashesPickExportDirectory'),
    })
    if (picked.canceled || !picked.path) {
      return
    }

    setAdReviewKnownHashExportPending(true)
    setAdReviewKnownHashExportMessage(t('ui.settings.adReviewKnownHashesExporting'))
    try {
      const response = await mediaRepository.exportManageAdReviewKnownHashes({
        output_directory: picked.path,
      })
      setAdReviewKnownHashExportMessage(
        t('ui.settings.adReviewKnownHashesExportDone', {
          total: String(response.total_count),
          path: response.output_path,
        }),
      )
    } catch (error) {
      setAdReviewKnownHashExportMessage(
        t('ui.settings.adReviewKnownHashesExportFailed', {
          message: toErrorDetailWithCode(error, t),
        }),
      )
    } finally {
      setAdReviewKnownHashExportPending(false)
    }
  }, [mediaRepository, t])

  const refreshEhentaiAuthStatus = useCallback(async () => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi?.externalAuthStatus) {
      setEhentaiAuthStatus({
        provider: 'ehentai',
        state: 'error',
        connected: false,
        message: t('ui.settings.ehentaiAuthUnsupported'),
        checked_at_ms: Date.now(),
      })
      return
    }

    setEhentaiAuthChecking(true)
    try {
      const response = await backendApi.externalAuthStatus({ provider: 'ehentai' })
      setEhentaiAuthStatus(response)
    } catch (error) {
      const message = toErrorDetailWithCode(error, t)
      setEhentaiAuthStatus({
        provider: 'ehentai',
        state: 'error',
        connected: false,
        message: t('ui.settings.ehentaiAuthCheckFailed', { message }),
        checked_at_ms: Date.now(),
      })
    } finally {
      setEhentaiAuthChecking(false)
    }
  }, [t])

  const connectEhentaiAuth = useCallback(async () => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi?.externalAuthConnect) {
      setEhentaiAuthStatus({
        provider: 'ehentai',
        state: 'error',
        connected: false,
        message: t('ui.settings.ehentaiAuthUnsupported'),
        checked_at_ms: Date.now(),
      })
      return
    }

    setEhentaiAuthConnectPending(true)
    try {
      const response = await backendApi.externalAuthConnect({ provider: 'ehentai' })
      setEhentaiAuthStatus({
        provider: 'ehentai',
        state: response.connected ? 'connected' : 'disconnected',
        connected: response.connected,
        message:
          response.message ??
          (response.connected
            ? t('ui.settings.ehentaiAuthConnected')
            : t('ui.settings.ehentaiAuthConnectOpened')),
        checked_at_ms: response.checked_at_ms,
      })
      await refreshEhentaiAuthStatus()
    } catch (error) {
      const message = toErrorDetailWithCode(error, t)
      setEhentaiAuthStatus({
        provider: 'ehentai',
        state: 'error',
        connected: false,
        message: t('ui.settings.ehentaiAuthConnectFailed', { message }),
        checked_at_ms: Date.now(),
      })
    } finally {
      setEhentaiAuthConnectPending(false)
    }
  }, [refreshEhentaiAuthStatus, t])

  const disconnectEhentaiAuth = useCallback(async () => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi?.externalAuthDisconnect) {
      setEhentaiAuthStatus({
        provider: 'ehentai',
        state: 'error',
        connected: false,
        message: t('ui.settings.ehentaiAuthUnsupported'),
        checked_at_ms: Date.now(),
      })
      return
    }

    setEhentaiAuthDisconnectPending(true)
    try {
      const response = await backendApi.externalAuthDisconnect({ provider: 'ehentai' })
      setEhentaiAuthStatus({
        provider: 'ehentai',
        state: response.disconnected ? 'disconnected' : 'error',
        connected: !response.disconnected,
        message:
          response.message ??
          (response.disconnected
            ? t('ui.settings.ehentaiAuthDisconnected')
            : t('ui.settings.ehentaiAuthDisconnectFailedDefault')),
        checked_at_ms: response.checked_at_ms,
      })
      await refreshEhentaiAuthStatus()
    } catch (error) {
      const message = toErrorDetailWithCode(error, t)
      setEhentaiAuthStatus({
        provider: 'ehentai',
        state: 'error',
        connected: false,
        message: t('ui.settings.ehentaiAuthDisconnectFailed', { message }),
        checked_at_ms: Date.now(),
      })
    } finally {
      setEhentaiAuthDisconnectPending(false)
    }
  }, [refreshEhentaiAuthStatus, t])

  useEffect(() => {
    void refreshEhentaiAuthStatus()
  }, [refreshEhentaiAuthStatus])

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
      default_path: normalizeOptionalPath(resolvedSubtitleModelDir),
    })

    const pickedPath = result.path?.trim() ?? ''
    if (!pickedPath) {
      return
    }

    updateSettings({
      subtitleModelDir: pickedPath,
      subtitleModelDirByProfile: {
        ...subtitleModelDirByProfile,
        [resolvedSubtitleModelId]: pickedPath,
      },
    })
  }, [
    mediaRepository,
    resolvedSubtitleModelDir,
    resolvedSubtitleModelId,
    subtitleModelDirByProfile,
    t,
    updateSettings,
  ])

  const syncSubtitleDownloadTasks = useCallback(async () => {
    if (!mediaRepository.readSubtitleModelDownloads) {
      setSubtitleDownloadTask(null)
      return
    }

    const response = await mediaRepository.readSubtitleModelDownloads()
    const selectedTask =
      response.tasks.find(
        (task) =>
          task.model_id === resolvedSubtitleModelId &&
          (task.status === 'queued' || task.status === 'downloading' || task.status === 'verifying'),
      ) ??
      response.tasks.find((task) => task.model_id === resolvedSubtitleModelId) ??
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
  }, [mediaRepository, resolvedSubtitleModelId])

  const refreshSubtitleModels = useCallback(async (options?: { modelDirOverride?: string }) => {
    const effectiveModelDir = (options?.modelDirOverride ?? resolvedSubtitleModelDir).trim()

    setSubtitleModelsLoading(true)
    setSubtitleModelsError(null)

    try {
      setSubtitleRemoteModels([
        {
          id: resolvedSubtitleModel.id,
          label: resolvedSubtitleModel.label,
          languageCodes: resolvedSubtitleModel.languageCodes,
          sizeBytes: resolvedSubtitleModel.sizeBytes,
          homepageUrl: resolvedSubtitleModel.homepageUrl,
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
  }, [
    mediaRepository,
    normalizeFsPath,
    resolvedSubtitleModel,
    resolvedSubtitleModelDir,
    syncSubtitleDownloadTasks,
    t,
  ])

  const startSubtitleModelDownload = useCallback(async () => {
    if (!mediaRepository.startSubtitleModelDownload) {
      setSubtitleModelsError(t('ui.settings.offlineSubtitleDownloadUnsupported'))
      return
    }

    if (!resolvedSubtitleModel.downloadSupported) {
      setSubtitleModelsError(
        t('ui.settings.offlineSubtitleDownloadUnsupportedForProfile', {
          profile: resolvedSubtitleModel.label,
        }),
      )
      return
    }

    const modelDir = resolvedSubtitleModelDir.trim()
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
        model_id: resolvedSubtitleModelId,
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
  }, [
    mediaRepository,
    proxyServer,
    refreshSubtitleModels,
    resolvedSubtitleModel.downloadSupported,
    resolvedSubtitleModel.label,
    resolvedSubtitleModelId,
    resolvedSubtitleModelDir,
    t,
  ])

  useEffect(() => {
    if (!appSettings.settingsOpen) {
      return
    }

    if (resolvedSubtitleModelDir === subtitleModelDir.trim()) {
      return
    }

    updateSettings({ subtitleModelDir: resolvedSubtitleModelDir })
  }, [
    appSettings.settingsOpen,
    resolvedSubtitleModelDir,
    subtitleModelDir,
    updateSettings,
  ])

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
      const targetUrl = resolvedSubtitleModel.homepageUrl
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
  }, [resolvedSubtitleModel.homepageUrl, t])

  useEffect(() => {
    if (!appSettings.settingsOpen) {
      return
    }

    updateSettings({
      subtitleAcceleration: 'cpu',
    })

    void refreshSubtitleModels()
  }, [appSettings.settingsOpen, refreshSubtitleModels, updateSettings])

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
    adReviewKnownHashImportPending,
    adReviewKnownHashImportMessage,
    adReviewKnownHashExportPending,
    adReviewKnownHashExportMessage,
    runtimePathUpdatePending,
    runtimePathUpdateMessage,
    ehentaiAuthStatus,
    ehentaiAuthChecking,
    ehentaiAuthConnectPending,
    ehentaiAuthDisconnectPending,
    applyElectronNativeChromeEnabled,
    testAdReviewVisionModel,
    saveAdReviewVisionModel,
    importAdReviewKnownHashes,
    exportAdReviewKnownHashes,
    refreshEhentaiAuthStatus,
    connectEhentaiAuth,
    disconnectEhentaiAuth,
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
    subtitleModelDownloadSupported: resolvedSubtitleModel.downloadSupported,
    refreshSubtitleModels,
    startSubtitleModelDownload,
    cancelSubtitleModelDownload,
    openSubtitleModelPage,
  }
}
