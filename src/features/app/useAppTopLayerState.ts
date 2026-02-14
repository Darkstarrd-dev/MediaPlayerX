import {
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react'

import { findShortcutConflicts } from '../../shortcuts'
import type { BrowserMode, ImageItem, VideoItem } from '../../types'
import type { ImportTaskDto } from '../../contracts/backend'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { MediaRepository, RepositoryMode } from '../backend/repository'
import { buildAppHeaderProps } from './buildAppHeaderProps'
import { buildBackendErrorRows } from './buildBackendErrorRows'
import { buildFullscreenLayerProps } from './buildFullscreenLayerProps'
import { buildImportTaskPanelProps } from './buildImportTaskPanelProps'
import { buildSettingsPanelProps } from './buildSettingsPanelProps'
import { useTopLayerSettingsActions } from './useTopLayerSettingsActions'
import { useDatabaseResetAction } from './useDatabaseResetAction'
import { useImportTaskPanelState } from './useImportTaskPanelState'
import { useRuntimeInfoDiagnostics } from './useRuntimeInfoDiagnostics'
import { useRuntimeWarningDismiss } from './useRuntimeWarningDismiss'
import type { PlaylistPersistenceResult } from '../media/usePlaylistPersistence'
import type { VideoFitMode } from '../media/videoFitMode'
import type {
  ReadOnlyDataAccessResult,
  RuntimeCapabilitiesResult,
  WriteDataAccessResult,
} from '../backend'

type SearchPanelMode = 'vector' | 'feature'
type FullscreenAlignDirection = 'up' | 'down' | 'left' | 'right'

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
  subtitleTrackUrl: string | null
  subtitleVisible: boolean
  subtitleLoading: boolean
  subtitleMessage: string | null
  subtitleOptions: Array<{ id: string; label: string; format: 'vtt' | 'srt' | 'ass' | 'ssa' }>
  selectedSubtitleId: string | null
  focusedVideoCoverImageSrc: string | null
  focusedVideoDurationSec: number
  focusedVideoCoverColor: string
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoFitMode: VideoFitMode
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: (step: number) => void
  playlistIds: string[]
  selectedVideoId: string
  videoById: Map<string, VideoItem>
  selectVideoFromBrowser: (videoId: string) => void
  setVideoTime: Dispatch<SetStateAction<number>>
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>
  setVideoMuted: Dispatch<SetStateAction<boolean>>
  setVideoVolume: Dispatch<SetStateAction<number>>
  setVideoRate: Dispatch<SetStateAction<number>>
  setVideoFitMode: Dispatch<SetStateAction<VideoFitMode>>
  cycleVideoFitMode: () => void
  setSubtitleVisible: Dispatch<SetStateAction<boolean>>
  selectSubtitleById: (subtitleId: string) => Promise<void>
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
  subtitleTrackUrl,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  focusedVideoCoverImageSrc,
  focusedVideoDurationSec,
  focusedVideoCoverColor,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
  setVideoPlaying,
  goPlaylist,
  playlistIds,
  selectedVideoId,
  videoById,
  selectVideoFromBrowser,
  setVideoTime,
  setVideoDurationById,
  setVideoMuted,
  setVideoVolume,
  setVideoRate,
  setVideoFitMode,
  cycleVideoFitMode,
  setSubtitleVisible,
  selectSubtitleById,
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
  const {
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
  } = useTopLayerSettingsActions({
    appSettings,
    mediaRepository,
    runtimeInfoDiagnostics,
  })

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
    subtitleTrackUrl,
    subtitleVisible,
    subtitleLoading,
    subtitleMessage,
    subtitleOptions,
    selectedSubtitleId,
    focusedVideoCoverImageSrc,
    durationSec: focusedVideoDurationSec,
    focusedVideoCoverColor,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoFitMode,
    fullscreenVideoControlsMaxWidth: appSettings.fullscreenVideoControlsMaxWidth,
    autoPlayEnabled: appSettings.autoPlayEnabled,
    autoPlayInterval: appSettings.autoPlayInterval,
    autoPlayPresets,
    updateSettings: appSettings.updateSettings,
    setVideoPlaying,
    goPlaylist,
    playlistIds,
    selectedVideoId,
    videoById,
    selectVideoFromBrowser,
    setVideoTime,
    focusedVideoId: focusedVideoEffectiveId,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setVideoFitMode,
    cycleVideoFitMode,
    setSubtitleVisible,
    selectSubtitleById,
    saveVideoCover: backendWrite.saveVideoCover,
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
    electronNativeChromeEnabled: appSettings.electronNativeChromeEnabled,
    sidebarFontSize: appSettings.sidebarFontSize,
    sidebarCountFontSize: appSettings.sidebarCountFontSize,
    sidebarIndentStep: appSettings.sidebarIndentStep,
    sidebarVerticalGap: appSettings.sidebarVerticalGap,
    metadataRatio: appSettings.metadataRatio,
    workspaceBottomPanelHeight: appSettings.workspaceBottomPanelHeight,
    fullscreenVideoControlsMaxWidth: appSettings.fullscreenVideoControlsMaxWidth,
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
    shortcuts: appSettings.shortcuts,
    shortcutConflicts,
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
    applyElectronNativeChromeEnabled,
    setShortcut: appSettings.setShortcut,
    resetShortcuts: appSettings.resetShortcuts,
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
