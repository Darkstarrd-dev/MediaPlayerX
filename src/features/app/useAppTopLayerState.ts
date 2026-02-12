import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

import { findShortcutConflicts } from '../../shortcuts'
import { findVectorControlConflicts } from '../../vectorControls'
import type { BrowserMode, ImageItem, VideoItem } from '../../types'
import type { ImportTaskDto } from '../../contracts/backend'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { MediaRepository, RepositoryMode } from '../backend/repository'
import { buildAppHeaderProps } from './buildAppHeaderProps'
import { buildBackendErrorRows } from './buildBackendErrorRows'
import { buildFullscreenLayerProps } from './buildFullscreenLayerProps'
import { buildImportTaskPanelProps } from './buildImportTaskPanelProps'
import { buildSettingsPanelProps } from './buildSettingsPanelProps'
import { SETTINGS_STATE_KEY, toPersistedAppSettings } from './usePersistedAppSettings'
import { useDatabaseResetAction } from './useDatabaseResetAction'
import { useImportTaskPanelState } from './useImportTaskPanelState'
import { useRuntimeInfoDiagnostics } from './useRuntimeInfoDiagnostics'
import { useRuntimeWarningDismiss } from './useRuntimeWarningDismiss'
import type { PlaylistPersistenceResult } from '../media/usePlaylistPersistence'
import type {
  ReadOnlyDataAccessResult,
  RuntimeCapabilitiesResult,
  WriteDataAccessResult,
} from '../backend'

type SearchPanelMode = 'vector' | 'feature'
type FullscreenAlignDirection = 'up' | 'down' | 'left' | 'right'

const VISION_TEST_RED_IMAGE_BASE64 =
  '/9j/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCABkAGQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAcJ/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AnQBDGqYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/2Q=='

function normalizeOptionalPath(value: string): string | undefined {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function toDirectoryDefaultPath(value: string): string | undefined {
  const normalized = normalizeOptionalPath(value)
  if (!normalized) {
    return undefined
  }

  const withoutFragment = normalized.split('#')[0].trim()
  if (!withoutFragment) {
    return undefined
  }

  const normalizedSlashes = withoutFragment.replace(/\\/g, '/')
  const lastSlashIndex = normalizedSlashes.lastIndexOf('/')
  if (lastSlashIndex < 2) {
    return withoutFragment
  }

  return withoutFragment.slice(0, lastSlashIndex)
}

interface UseAppTopLayerStateParams {
  appSettings: AppSettingsStoreSnapshot
  mediaRepository: MediaRepository
  repositoryMode: RepositoryMode
  backendRead: ReadOnlyDataAccessResult
  backendWrite: WriteDataAccessResult
  playlistPersistence: PlaylistPersistenceResult
  runtimeCapabilities: RuntimeCapabilitiesResult
  autoPlayPresets: number[]
  mode: BrowserMode
  manageMode: boolean
  metadataManageMode: boolean
  vectorUniverseOpen: boolean
  displayThumbnailScaleLevel: number
  thumbnailScaleLevelCount: number
  canThumbnailScaleDown: boolean
  canThumbnailScaleUp: boolean
  importMenuOpen: boolean
  importTaskPanelOpen: boolean
  setImportMenuOpen: Dispatch<SetStateAction<boolean>>
  setImportTaskPanelOpen: Dispatch<SetStateAction<boolean>>
  openImportFilesDialog: () => void
  openImportFoldersDialog: () => void
  setSearchPanelMode: Dispatch<SetStateAction<SearchPanelMode>>
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>
  setVectorUniverseOpen: Dispatch<SetStateAction<boolean>>
  onToggleManageMode: () => void
  onToggleMetadataManageMode: () => void
  importTasks: ImportTaskDto[]
  dismissedImportTaskIds: Record<string, true>
  setDismissedImportTaskIds: Dispatch<SetStateAction<Record<string, true>>>
  enqueuePending: boolean
  archiveLoadStatus: {
    runningArchivePath: string | null
    pendingArchivePaths: string[]
  }
  normalizePathForCompare: (value: string) => string
  retryImportTask: (taskId: string) => Promise<void>
  taskError: string | null
  clearTaskError: () => void
  fullscreenActive: boolean
  showFullscreenFooter: boolean
  fullscreenDisplay: 'image-only' | 'video-only' | 'dual'
  fullscreenEntryDisplay: 'image-only' | 'video-only'
  fullscreenAlignRequest: { id: number; direction: FullscreenAlignDirection } | null
  fullscreenSwapped: boolean
  fullscreenVideoFocus: boolean
  fullscreenSplit: number
  focusedImage: ImageItem | null
  fullscreenImageSrc: string | null
  focusedVideo: VideoItem | null
  focusedVideoSrc: string | null
  focusedVideoCoverImageSrc: string | null
  focusedVideoDurationSec: number
  focusedVideoCoverColor: string
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: (step: number) => void
  setVideoTime: Dispatch<SetStateAction<number>>
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  setVideoVolume: Dispatch<SetStateAction<number>>
  setVideoRate: Dispatch<SetStateAction<number>>
  setFullscreenActiveWithAutoStop: (value: boolean | ((previous: boolean) => boolean)) => void
  setShowFullscreenFooter: Dispatch<SetStateAction<boolean>>
  setFullscreenDisplay: Dispatch<SetStateAction<'image-only' | 'video-only' | 'dual'>>
  setFullscreenSwapped: Dispatch<SetStateAction<boolean>>
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>
  setFullscreenSplit: Dispatch<SetStateAction<number>>
  moveImage: (step: number) => void
  goPackage: (step: number) => void
  applySidebarRatio: (value: number) => void
  applyMetadataRatio: (value: number) => void
  focusedVideoEffectiveId: string | null
}

export function useAppTopLayerState({
  appSettings,
  mediaRepository,
  repositoryMode,
  backendRead,
  backendWrite,
  playlistPersistence,
  runtimeCapabilities,
  autoPlayPresets,
  mode,
  manageMode,
  metadataManageMode,
  vectorUniverseOpen,
  displayThumbnailScaleLevel,
  thumbnailScaleLevelCount,
  canThumbnailScaleDown,
  canThumbnailScaleUp,
  importMenuOpen,
  importTaskPanelOpen,
  setImportMenuOpen,
  setImportTaskPanelOpen,
  openImportFilesDialog,
  openImportFoldersDialog,
  setSearchPanelMode,
  setSearchPanelCollapsed,
  setVectorUniverseOpen,
  onToggleManageMode,
  onToggleMetadataManageMode,
  importTasks,
  dismissedImportTaskIds,
  setDismissedImportTaskIds,
  enqueuePending,
  archiveLoadStatus,
  normalizePathForCompare,
  retryImportTask,
  taskError,
  clearTaskError,
  fullscreenActive,
  showFullscreenFooter,
  fullscreenDisplay,
  fullscreenEntryDisplay,
  fullscreenAlignRequest,
  fullscreenSwapped,
  fullscreenVideoFocus,
  fullscreenSplit,
  focusedImage,
  fullscreenImageSrc,
  focusedVideo,
  focusedVideoSrc,
  focusedVideoCoverImageSrc,
  focusedVideoDurationSec,
  focusedVideoCoverColor,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  setVideoPlaying,
  goPlaylist,
  setVideoTime,
  setVideoDurationById,
  setVideoMuted,
  setVideoVolume,
  setVideoRate,
  setFullscreenActiveWithAutoStop,
  setShowFullscreenFooter,
  setFullscreenDisplay,
  setFullscreenSwapped,
  setFullscreenVideoFocus,
  setFullscreenSplit,
  moveImage,
  goPackage,
  applySidebarRatio,
  applyMetadataRatio,
  focusedVideoEffectiveId,
}: UseAppTopLayerStateParams) {
  /**
   * 顶层状态只负责跨面板编排：
   * - Header / Settings / Fullscreen / ImportPanel 共享同一批信号。
   * - 业务读写留在 feature hooks，避免这里再次膨胀为 God Hook。
   */
  const backendErrorRows = buildBackendErrorRows({
    backendRead,
    backendWrite,
    playlistPersistence,
    runtimeCapabilities,
  })

  const runtimeInfoDiagnostics = useRuntimeInfoDiagnostics()

  const bridgeMissingInProduction =
    import.meta.env.PROD &&
    repositoryMode === 'real' &&
    !runtimeInfoDiagnostics.backendBridgeInjected

  const bridgeMissingRow = bridgeMissingInProduction
    ? {
        key: 'backend-bridge',
        label: '后端桥接',
        message:
          '生产构建未检测到后端桥接（window.mediaPlayerBackend），已禁用 mock 回退。请检查 Electron preload 注入链路。',
        onRetry: runtimeInfoDiagnostics.retry,
      }
    : null

  const managementErrorRows = manageMode ? backendErrorRows.filter((row) => row.key === 'manage-write') : []
  const bannerBackendErrorRows = [
    bridgeMissingRow,
    ...backendErrorRows.filter((row) => row.key !== 'manage-write'),
  ].filter((row): row is NonNullable<typeof row> => Boolean(row))

  const runtimeCapabilityWarnings = (runtimeCapabilities.data?.minimum_matrix ?? []).filter(
    (item) => item.status !== 'available',
  )
  const runtimeWarningKey = useMemo(
    () => runtimeCapabilityWarnings.map((item) => `${item.capability}|${item.status}|${item.note}`).join('||'),
    [runtimeCapabilityWarnings],
  )
  const runtimeWarningDismiss = useRuntimeWarningDismiss({
    runtimeWarningKey,
    warningCount: runtimeCapabilityWarnings.length,
  })

  const {
    activeImportTaskCount,
    importTasksForPanel,
    normalizedPendingArchivePathSet,
    normalizedRunningArchivePath,
    taskStatusLabel,
    clearFinishedImportTasks,
    clearAllImportTasks,
    retryImportTaskFromPanel,
  } = useImportTaskPanelState({
    importTasks,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    enqueuePending,
    archiveLoadStatus,
    normalizePathForCompare,
    retryImportTask,
  })

  const {
    databaseResetPending,
    databaseResetError,
    clearDatabaseForDev,
  } = useDatabaseResetAction({
    mediaRepository,
  })

  const shortcutConflicts = useMemo(() => findShortcutConflicts(appSettings.shortcuts), [appSettings.shortcuts])
  const vectorControlConflicts = useMemo(() => findVectorControlConflicts(appSettings.vectorControls), [appSettings.vectorControls])
  const {
    adReviewVisionEndpoint,
    adReviewVisionModel,
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
      adReviewVisionVerified: appSettings.adReviewVisionVerified,
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
        adReviewVisionVerified: appSettings.adReviewVisionVerified,
      })
      setAdReviewVisionSaveMessage('视觉模型配置已保存')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setAdReviewVisionSaveMessage(`保存失败：${message}`)
    } finally {
      setAdReviewVisionSavePending(false)
    }
  }, [adReviewVisionEndpoint, adReviewVisionModel, appSettings, mediaRepository, updateSettings])

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
        setRuntimePathUpdateMessage(
          response.moved_database ? '目录已保存，已迁移数据库文件' : '目录已保存',
        )
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

  const fullscreenLayerProps = buildFullscreenLayerProps({
    mode,
    fullscreenActive,
    showFullscreenFooter,
    fullscreenDisplay,
    fullscreenEntryDisplay,
    fullscreenAlignRequest,
    fullscreenSwapped,
    fullscreenVideoFocus,
    fullscreenSplit,
    focusedImage,
    focusedImageSrc: fullscreenImageSrc,
    focusedVideo,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
    durationSec: focusedVideoDurationSec,
    focusedVideoCoverColor,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    autoPlayEnabled: appSettings.autoPlayEnabled,
    autoPlayInterval: appSettings.autoPlayInterval,
    autoPlayPresets,
    updateSettings: appSettings.updateSettings,
    setVideoPlaying,
    goPlaylist,
    setVideoTime,
    focusedVideoId: focusedVideoEffectiveId,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setFullscreenActiveWithAutoStop,
    setShowFullscreenFooter,
    setFullscreenDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setFullscreenSplit,
    moveImage,
    goPackage,
  })

  const settingsPanelProps = buildSettingsPanelProps({
    settingsOpen: appSettings.settingsOpen,
    styleId: appSettings.styleId,
    paletteId: appSettings.paletteId,
    headerHeight: appSettings.headerHeight,
    settingsFontSize: appSettings.settingsFontSize,
    sidebarRatio: appSettings.sidebarRatio,
    sidebarMinWidth: appSettings.sidebarMinWidth,
    layoutLocked: appSettings.layoutLocked,
    sidebarFontSize: appSettings.sidebarFontSize,
    sidebarCountFontSize: appSettings.sidebarCountFontSize,
    sidebarIndentStep: appSettings.sidebarIndentStep,
    sidebarVerticalGap: appSettings.sidebarVerticalGap,
    metadataRatio: appSettings.metadataRatio,
    vectorPanelHeight: appSettings.vectorPanelHeight,
    thumbnailGap: appSettings.thumbnailGap,
    thumbnailQuality: appSettings.thumbnailQuality,
    thumbnailWidth: appSettings.thumbnailWidth,
    proxyServer: appSettings.proxyServer,
    ehentaiCookies: appSettings.ehentaiCookies,
    adReviewVisionEndpoint: appSettings.adReviewVisionEndpoint,
    adReviewVisionModel: appSettings.adReviewVisionModel,
    adReviewVisionVerified: appSettings.adReviewVisionVerified,
    adReviewVisionTestPending,
    adReviewVisionTestMessage,
    adReviewVisionSavePending,
    adReviewVisionSaveMessage,
    vectorUniverseMoveSpeed: appSettings.vectorUniverseMoveSpeed,
    vectorUniverseSprintMultiplier: appSettings.vectorUniverseSprintMultiplier,
    vectorUniverseLookSensitivity: appSettings.vectorUniverseLookSensitivity,
    vectorUniverseRaycastDistance: appSettings.vectorUniverseRaycastDistance,
    vectorUniverseHelperScale: appSettings.vectorUniverseHelperScale,
    vectorUniverseDispersion: appSettings.vectorUniverseDispersion,
    vectorUniverseWidgetSize: appSettings.vectorUniverseWidgetSize,
    shortcuts: appSettings.shortcuts,
    shortcutConflicts,
    vectorControls: appSettings.vectorControls,
    vectorControlConflicts,
    databaseResetPending,
    databaseResetError,
    runtimePathUpdatePending,
    runtimePathUpdateMessage,
    repositoryMode,
    backendBridgeInjected: runtimeInfoDiagnostics.backendBridgeInjected,
    runtimeInfoLoading: runtimeInfoDiagnostics.loading,
    runtimeInfoError: runtimeInfoDiagnostics.error,
    runtimeInfo: runtimeInfoDiagnostics.data,
    refreshRuntimeInfo: runtimeInfoDiagnostics.retry,
    updateSettings: appSettings.updateSettings,
    applySidebarRatio,
    applyMetadataRatio,
    setShortcut: appSettings.setShortcut,
    setVectorControl: appSettings.setVectorControl,
    resetShortcuts: appSettings.resetShortcuts,
    resetVectorControls: appSettings.resetVectorControls,
    clearDatabaseForDev,
    testAdReviewVisionModel,
    saveAdReviewVisionModel,
    pickDatabaseDirectoryPath,
    pickThumbnailCacheDirectoryPath,
  })

  const appHeaderProps = buildAppHeaderProps({
    headerHeight: appSettings.headerHeight,
    mode,
    vectorMode: appSettings.vectorMode,
    manageMode,
    metadataManageMode,
    vectorUniverseOpen,
    displayThumbnailScaleLevel,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    autoPlayEnabled: appSettings.autoPlayEnabled,
    autoPlayInterval: appSettings.autoPlayInterval,
    importMenuOpen,
    taskStatusLabel,
    importTaskPanelOpen,
    autoPlayPresets,
    thumbnailScale: appSettings.thumbnailScale,
    thumbnailScaleLevelCount,
    setImportMenuOpen,
    setImportTaskPanelOpen,
    openImportFilesDialog,
    openImportFoldersDialog,
    updateSettings: appSettings.updateSettings,
    setSearchPanelMode,
    setSearchPanelCollapsed,
    setVectorUniverseOpen,
    onToggleManageMode,
    onToggleMetadataManageMode,
  })

  const importTaskPanelProps = buildImportTaskPanelProps({
    open: importTaskPanelOpen,
    activeTaskCount: activeImportTaskCount,
    pendingArchiveCount: normalizedPendingArchivePathSet.size,
    runningArchive: Boolean(normalizedRunningArchivePath),
    enqueuePending,
    taskError,
    tasks: importTasksForPanel,
    setImportTaskPanelOpen,
    clearFinishedImportTasks,
    clearAllImportTasks,
    clearTaskError,
    retryImportTaskFromPanel,
    setDismissedImportTaskIds,
  })

  return {
    bannerBackendErrorRows,
    managementErrorRows,
    runtimeCapabilityWarnings,
    runtimeWarningDismiss,
    fullscreenLayerProps,
    settingsPanelProps,
    appHeaderProps,
    importTaskPanelProps,
  }
}

export type AppTopLayerStateResult = ReturnType<typeof useAppTopLayerState>
