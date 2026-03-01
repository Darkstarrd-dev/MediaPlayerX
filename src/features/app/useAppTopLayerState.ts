import {
  useMemo,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";

import { findShortcutConflicts } from "../../shortcuts";
import type { BrowserMode, ImageItem, VideoItem } from "../../types";
import type { ImportTaskDto } from "../../contracts/backend";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { ImageConvertAdjustProfile } from "./useAppSessionState";
import type { MediaRepository, RepositoryMode } from "../backend/repository";
import { buildAppHeaderProps } from "./buildAppHeaderProps";
import { buildBackendErrorRows } from "./buildBackendErrorRows";
import { buildFullscreenLayerProps } from "./buildFullscreenLayerProps";
import { buildImportTaskPanelProps } from "./buildImportTaskPanelProps";
import { buildSettingsPanelProps } from "./buildSettingsPanelProps";
import { useTopLayerSettingsActions } from "./useTopLayerSettingsActions";
import { useDatabaseResetAction } from "./useDatabaseResetAction";
import { useImportTaskPanelState } from "./useImportTaskPanelState";
import { useRuntimeInfoDiagnostics } from "./useRuntimeInfoDiagnostics";
import { useRuntimeWarningDismiss } from "./useRuntimeWarningDismiss";
import { useI18n } from "../../i18n/useI18n";
import { normalizeSubtitleModelSelectionId } from "../subtitles/fixedModel";
import type { PlaylistPersistenceResult } from "../media/usePlaylistPersistence";
import type { VideoFitMode } from "../media/videoFitMode";
import type {
  ReadOnlyDataAccessResult,
  RuntimeCapabilitiesResult,
  WriteDataAccessResult,
} from "../backend";

type SearchPanelMode = "vector" | "feature";
type FullscreenAlignDirection = "up" | "down" | "left" | "right";

interface UseAppTopLayerStateParams {
  appSettings: AppSettingsStoreSnapshot;
  mediaRepository: MediaRepository;
  repositoryMode: RepositoryMode;
  backendRead: ReadOnlyDataAccessResult;
  backendWrite: WriteDataAccessResult;
  playlistPersistence: PlaylistPersistenceResult;
  runtimeCapabilities: RuntimeCapabilitiesResult;
  autoPlayPresets: number[];
  mode: BrowserMode;
  manageMode: boolean;
  metadataManageMode: boolean;
  displayThumbnailScaleLevel: number;
  thumbnailScaleLevelCount: number;
  canThumbnailScaleDown: boolean;
  canThumbnailScaleUp: boolean;
  importMenuOpen: boolean;
  importTaskPanelOpen: boolean;
  helpOverlayOpen: boolean;
  themeParameterPanelOpen: boolean;
  setImportMenuOpen: Dispatch<SetStateAction<boolean>>;
  setImportTaskPanelOpen: Dispatch<SetStateAction<boolean>>;
  setThemeParameterPanelOpen: Dispatch<SetStateAction<boolean>>;
  openImportFilesDialog: () => void;
  openImportFoldersDialog: () => void;
  setSearchPanelMode: Dispatch<SetStateAction<SearchPanelMode>>;
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>;
  onToggleManageMode: () => void;
  onToggleMetadataManageMode: () => void;
  sidebarCollapsed: boolean;
  metadataCollapsed: boolean;
  onToggleSidebarPanel: () => void;
  onToggleMetadataPanel: () => void;
  layoutConvergedInsetPx: number;
  importTasks: ImportTaskDto[];
  dismissedImportTaskIds: Record<string, true>;
  setDismissedImportTaskIds: Dispatch<SetStateAction<Record<string, true>>>;
  enqueuePending: boolean;
  archiveLoadStatus: {
    runningArchivePath: string | null;
    runningArchiveProgress: number | null;
    runningArchiveMessage: string | null;
    pendingArchivePaths: string[];
    thumbnailRunningCount: number;
    thumbnailRunningProgress: number | null;
    thumbnailRunningMessage: string | null;
  };
  normalizePathForCompare: (value: string) => string;
  retryImportTask: (taskId: string) => Promise<void>;
  adReviewRunning: boolean;
  adReviewDeleting: boolean;
  taskError: string | null;
  clearTaskError: () => void;
  fullscreenActive: boolean;
  showFullscreenFooter: boolean;
  fullscreenDisplay: "image-only" | "video-only" | "dual";
  fullscreenEntryDisplay: "image-only" | "video-only";
  fullscreenAlignRequest: {
    id: number;
    direction: FullscreenAlignDirection;
  } | null;
  fullscreenSwapped: boolean;
  fullscreenVideoFocus: boolean;
  fullscreenSplit: number;
  focusedImage: ImageItem | null;
  fullscreenImageSrc: string | null;
  focusedVideo: VideoItem | null;
  focusedVideoSrc: string | null;
  subtitleTrackUrl: string | null;
  subtitleVisible: boolean;
  subtitleLoading: boolean;
  subtitleMessage: string | null;
  subtitleRuntimeErrorMessage: string | null;
  subtitleOptions: Array<{
    id: string;
    label: string;
    format: "vtt" | "srt" | "ass" | "ssa";
  }>;
  selectedSubtitleId: string | null;
  autoSubtitleActive: boolean;
  liveSubtitleText: string | null;
  subtitleOverlayStyle: CSSProperties;
  imageConvertPreviewMode?: boolean;
  imageConvertPreviewScale?: number;
  imageConvertPreviewLongestEdgePx?: number | null;
  imageConvertPreviewAdjustProfile?: ImageConvertAdjustProfile;
  imageConvertPreviewFormat?: "webp" | "jpeg" | "png" | "avif";
  imageConvertPreviewQuality?: number;
  imageConvertPreviewRenderedSrc?: string | null;
  imageConvertPreviewError?: string | null;
  onChangeImageConvertPreviewScale?: (value: number) => void;
  onChangeImageConvertPreviewFormat?: (
    value: "webp" | "jpeg" | "png" | "avif",
  ) => void;
  onChangeImageConvertPreviewQuality?: (value: number) => void;
  onApplyImageConvertPreviewScaleToLongestEdge?: (
    value: number | null,
  ) => void;
  onChangeImageConvertPreviewAdjustProfile?: (
    profile: ImageConvertAdjustProfile,
  ) => void;
  onConfirmImageConvertPreview?: () => void;
  onCancelImageConvertPreview?: () => void;
  bindFullscreenVideoElement: (element: HTMLVideoElement | null) => void;
  focusedVideoCoverImageSrc: string | null;
  focusedVideoDurationSec: number;
  focusedVideoCoverColor: string;
  videoTime: number;
  videoPlaying: boolean;
  videoRate: number;
  videoVolume: number;
  videoMuted: boolean;
  videoFitMode: VideoFitMode;
  videoLoopMode: "single" | "list";
  setVideoPlaying: Dispatch<SetStateAction<boolean>>;
  goPlaylist: (step: number) => void;
  playlistIds: string[];
  videoQueueSource: "sidebar" | "playlist";
  rootScopedVideoIds: string[];
  selectedVideoId: string;
  videoById: Map<string, VideoItem>;
  selectVideoFromBrowser: (videoId: string) => void;
  setVideoTime: Dispatch<SetStateAction<number>>;
  setVideoDurationById: Dispatch<SetStateAction<Record<string, number>>>;
  setVideoMuted: Dispatch<SetStateAction<boolean>>;
  setVideoVolume: Dispatch<SetStateAction<number>>;
  setVideoRate: Dispatch<SetStateAction<number>>;
  setVideoFitMode: Dispatch<SetStateAction<VideoFitMode>>;
  cycleVideoLoopMode: () => void;
  cycleVideoFitMode: () => void;
  setSubtitleVisible: Dispatch<SetStateAction<boolean>>;
  selectSubtitleById: (subtitleId: string) => Promise<void>;
  setFullscreenActiveWithAutoStop: (
    value: boolean | ((previous: boolean) => boolean),
  ) => void;
  setShowFullscreenFooter: Dispatch<SetStateAction<boolean>>;
  setFullscreenDisplay: Dispatch<
    SetStateAction<"image-only" | "video-only" | "dual">
  >;
  setFullscreenSwapped: Dispatch<SetStateAction<boolean>>;
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>;
  setFullscreenSplit: Dispatch<SetStateAction<number>>;
  moveImage: (step: number) => void;
  goPackage: (step: number) => void;
  applySidebarRatio: (value: number) => void;
  applyMetadataRatio: (value: number) => void;
  adReviewDeleteOverlayDebugActive: boolean;
  onOpenAdReviewDeleteOverlayDebug: () => void;
  focusedVideoEffectiveId: string | null;
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
  helpOverlayOpen,
  themeParameterPanelOpen,
  setImportMenuOpen,
  setImportTaskPanelOpen,
  setThemeParameterPanelOpen,
  openImportFilesDialog,
  openImportFoldersDialog,
  setSearchPanelMode,
  setSearchPanelCollapsed,
  onToggleManageMode,
  onToggleMetadataManageMode,
  sidebarCollapsed,
  metadataCollapsed,
  onToggleSidebarPanel,
  onToggleMetadataPanel,
  layoutConvergedInsetPx,
  importTasks,
  dismissedImportTaskIds,
  setDismissedImportTaskIds,
  enqueuePending,
  archiveLoadStatus,
  normalizePathForCompare,
  retryImportTask,
  adReviewRunning,
  adReviewDeleting,
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
  subtitleRuntimeErrorMessage,
  subtitleOptions,
  selectedSubtitleId,
  autoSubtitleActive,
  liveSubtitleText,
  subtitleOverlayStyle,
  imageConvertPreviewMode = false,
  imageConvertPreviewScale = 1,
  imageConvertPreviewLongestEdgePx = null,
  imageConvertPreviewAdjustProfile = {
    mode: "basic",
    brightness: 0,
    contrast: 0,
    level_input_black: 0,
    level_input_white: 255,
    level_gamma: 1,
    curve_shadow_x: 64,
    curve_midtone_x: 128,
    curve_highlight_x: 192,
    curve_shadow: 0,
    curve_midtone: 0,
    curve_highlight: 0,
  },
  imageConvertPreviewFormat = "webp",
  imageConvertPreviewQuality = 80,
  imageConvertPreviewRenderedSrc = null,
  imageConvertPreviewError = null,
  onChangeImageConvertPreviewScale,
  onChangeImageConvertPreviewFormat,
  onChangeImageConvertPreviewQuality,
  onApplyImageConvertPreviewScaleToLongestEdge,
  onChangeImageConvertPreviewAdjustProfile,
  onConfirmImageConvertPreview,
  onCancelImageConvertPreview,
  bindFullscreenVideoElement,
  focusedVideoCoverImageSrc,
  focusedVideoDurationSec,
  focusedVideoCoverColor,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
  videoLoopMode,
  setVideoPlaying,
  goPlaylist,
  playlistIds,
  videoQueueSource,
  rootScopedVideoIds,
  selectedVideoId,
  videoById,
  selectVideoFromBrowser,
  setVideoTime,
  setVideoDurationById,
  setVideoMuted,
  setVideoVolume,
  setVideoRate,
  setVideoFitMode,
  cycleVideoLoopMode,
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
  adReviewDeleteOverlayDebugActive,
  onOpenAdReviewDeleteOverlayDebug,
  focusedVideoEffectiveId,
}: UseAppTopLayerStateParams) {
  const { t } = useI18n();

  /**
   * Top-layer state is responsible only for cross-panel orchestration:
   * - Header / Settings / Fullscreen / ImportPanel share the same signal set.
   * - Domain read/write logic stays in feature hooks to avoid re-growing this into a God Hook.
   */
  const backendErrorRows = buildBackendErrorRows({
    backendRead,
    backendWrite,
    playlistPersistence,
    runtimeCapabilities,
    labels: {
      library: t("ui.settings.backendError.library"),
      sidebar: t("ui.settings.backendError.sidebar"),
      page: t("ui.settings.backendError.page"),
      metadata: t("ui.settings.backendError.metadata"),
      gradeWrite: t("ui.settings.backendError.gradeWrite"),
      metadataWrite: t("ui.settings.backendError.metadataWrite"),
      coverWrite: t("ui.settings.backendError.coverWrite"),
      manageWrite: t("ui.settings.backendError.manageWrite"),
      playlistRead: t("ui.settings.backendError.playlistRead"),
      playlistWrite: t("ui.settings.backendError.playlistWrite"),
      runtimeCapability: t("ui.settings.backendError.runtimeCapability"),
    },
  });

  const runtimeInfoDiagnostics = useRuntimeInfoDiagnostics();

  const bridgeMissingInProduction =
    import.meta.env.PROD &&
    repositoryMode === "real" &&
    !runtimeInfoDiagnostics.backendBridgeInjected;

  const bridgeMissingRow = bridgeMissingInProduction
    ? {
        key: "backend-bridge",
        label: t("ui.settings.backendBridge"),
        message: t("ui.settings.bridgeMissingWarning"),
        onRetry: runtimeInfoDiagnostics.retry,
      }
    : null;

  const subtitleRuntimeErrorRow = subtitleRuntimeErrorMessage
    ? {
        key: "subtitle-runtime",
        label: t("ui.settings.offlineSubtitleLegend"),
        message: subtitleRuntimeErrorMessage,
      }
    : null;

  const managementErrorRows = manageMode
    ? backendErrorRows.filter((row) => row.key === "manage-write")
    : [];
  const bannerBackendErrorRows = [
    bridgeMissingRow,
    subtitleRuntimeErrorRow,
    ...backendErrorRows.filter((row) => row.key !== "manage-write"),
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  const runtimeCapabilityWarnings = (
    runtimeCapabilities.data?.minimum_matrix ?? []
  ).filter((item) => item.status !== "available");
  const runtimeWarningKey = useMemo(
    () =>
      runtimeCapabilityWarnings
        .map((item) => `${item.capability}|${item.status}|${item.note}`)
        .join("||"),
    [runtimeCapabilityWarnings],
  );
  const runtimeWarningDismiss = useRuntimeWarningDismiss({
    runtimeWarningKey,
    warningCount: runtimeCapabilityWarnings.length,
  });

  const {
    activeImportTaskCount,
    importTasksForPanel,
    normalizedPendingArchivePathSet,
    normalizedRunningArchivePath,
    runningArchiveProgress,
    runningArchiveMessage,
    thumbnailRunningCount,
    thumbnailRunningProgress,
    thumbnailRunningMessage,
    taskStatusLabel,
    taskStatusBusy,
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
    adReviewRunning,
    adReviewDeleting,
    taskStatusLabels: {
      loading: t("ui.header.taskStatusLoading"),
      deleting: t("ui.header.taskStatusDeleting"),
      reviewing: t("ui.header.taskStatusReviewing"),
      idle: t("ui.header.taskStatusIdle"),
      importRunning: ({ activeCount, enqueuePending }) =>
        t("ui.header.taskStatusImportRunning", {
          count: Math.max(1, activeCount + (enqueuePending ? 1 : 0)),
        }),
      archiveRunning: ({ progress, pendingCount }) => {
        if (typeof progress === "number" && Number.isFinite(progress)) {
          return t("ui.header.taskStatusArchiveRunning", {
            progress: Math.round(Math.max(0, Math.min(1, progress)) * 100),
          });
        }
        return t("ui.header.taskStatusArchivePending", {
          count: Math.max(1, pendingCount),
        });
      },
      thumbnailRunning: ({ runningCount, progress }) => {
        if (typeof progress === "number" && Number.isFinite(progress)) {
          return t("ui.header.taskStatusThumbnailRunning", {
            count: Math.max(1, runningCount),
            progress: Math.round(Math.max(0, Math.min(1, progress)) * 100),
          });
        }
        return t("ui.header.taskStatusThumbnailQueued", {
          count: Math.max(1, runningCount),
        });
      },
    },
  });

  const { databaseResetPending, databaseResetError, clearDatabaseForDev } =
    useDatabaseResetAction({
      mediaRepository,
    });

  const shortcutConflicts = useMemo(
    () => findShortcutConflicts(appSettings.shortcuts),
    [appSettings.shortcuts],
  );
  const {
    adReviewVisionTestPending,
    adReviewVisionTestMessage,
    adReviewVisionSavePending,
    adReviewVisionSaveMessage,
    runtimePathUpdatePending,
    runtimePathUpdateMessage,
    ehentaiAuthStatus,
    ehentaiAuthChecking,
    ehentaiAuthConnectPending,
    ehentaiAuthDisconnectPending,
    refreshEhentaiAuthStatus,
    connectEhentaiAuth,
    disconnectEhentaiAuth,
    applyElectronNativeChromeEnabled,
    subtitleModelsLoading,
    subtitleModelsError,
    subtitleModelsStatus,
    subtitleRemoteModels,
    subtitleLocalModels,
    subtitleDownloadTask,
    subtitleDownloadPending,
    subtitleModelDownloadSupported,
    refreshSubtitleModels,
    startSubtitleModelDownload,
    cancelSubtitleModelDownload,
    openSubtitleModelPage,
    testAdReviewVisionModel,
    saveAdReviewVisionModel,
    pickDatabaseDirectoryPath,
    pickThumbnailCacheDirectoryPath,
    pickSubtitleModelDirectoryPath,
  } = useTopLayerSettingsActions({
    appSettings,
    mediaRepository,
    runtimeInfoDiagnostics,
  });

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
    autoSubtitleActive,
    liveSubtitleText,
    subtitleOverlayStyle,
    imageConvertPreviewMode,
    imageConvertPreviewScale,
    imageConvertPreviewLongestEdgePx,
    imageConvertPreviewAdjustProfile,
    imageConvertPreviewFormat,
    imageConvertPreviewQuality,
    imageConvertPreviewRenderedSrc,
    imageConvertPreviewError,
    onChangeImageConvertPreviewScale,
    onChangeImageConvertPreviewFormat,
    onChangeImageConvertPreviewQuality,
    onApplyImageConvertPreviewScaleToLongestEdge,
    onChangeImageConvertPreviewAdjustProfile,
    onConfirmImageConvertPreview,
    onCancelImageConvertPreview,
    bindFullscreenVideoElement,
    focusedVideoCoverImageSrc,
    durationSec: focusedVideoDurationSec,
    focusedVideoCoverColor,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoFitMode,
    videoLoopMode,
    fullscreenVideoControlsMaxWidth:
      appSettings.fullscreenVideoControlsMaxWidth,
    fullscreenDecodeCacheSize: appSettings.fullscreenDecodeCacheSize,
    autoPlayEnabled: appSettings.autoPlayEnabled,
    autoPlayInterval: appSettings.autoPlayInterval,
    popoverDebugPinned: appSettings.popoverDebugPinned,
    updateSettings: appSettings.updateSettings,
    setVideoPlaying,
    goPlaylist,
    playlistIds,
    videoQueueSource,
    rootScopedVideoIds,
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
    cycleVideoLoopMode,
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
  });

  const settingsPanelProps = buildSettingsPanelProps({
    settingsOpen: appSettings.settingsOpen,
    uiLocale: appSettings.uiLocale,
    styleId: appSettings.styleId,
    paletteId: appSettings.paletteId,
    paletteMode: appSettings.paletteMode,
    paletteDayId: appSettings.paletteDayId,
    paletteNightId: appSettings.paletteNightId,
    headerHeight: appSettings.headerHeight,
    settingsBackdropOpacity: appSettings.settingsBackdropOpacity,
    settingsFontSize: appSettings.settingsFontSize,
    layoutGapScaleCoeff: appSettings.layoutGapScaleCoeff,
    paneInnerGapScaleCoeff: appSettings.paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff: appSettings.paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff: appSettings.sidebarInnerGapScaleCoeff,
    sidebarRatio: appSettings.sidebarRatio,
    sidebarMinWidth: appSettings.sidebarMinWidth,
    layoutLocked: appSettings.layoutLocked,
    headerDebugGroupVisible: appSettings.headerDebugGroupVisible,
    tooltipEnabled: appSettings.tooltipEnabled,
    electronNativeChromeEnabled: appSettings.electronNativeChromeEnabled,
    themeParameterButtonVisible: appSettings.themeParameterButtonVisible,
    sidebarFontSize: appSettings.sidebarFontSize,
    sidebarCountFontSize: appSettings.sidebarCountFontSize,
    sidebarIndentStep: appSettings.sidebarIndentStep,
    sidebarVerticalGap: appSettings.sidebarVerticalGap,
    metadataRatio: appSettings.metadataRatio,
    workspaceBottomPanelHeight: appSettings.workspaceBottomPanelHeight,
    fullscreenVideoControlsMaxWidth:
      appSettings.fullscreenVideoControlsMaxWidth,
    mediaPreloadMemoryBudgetMb: appSettings.mediaPreloadMemoryBudgetMb,
    thumbnailGap: appSettings.thumbnailGap,
    thumbnailQuality: appSettings.thumbnailQuality,
    thumbnailAdaptiveResolution: appSettings.thumbnailAdaptiveResolution,
    thumbnailWidth: appSettings.thumbnailWidth,
    thumbnailGenerationConcurrency: appSettings.thumbnailGenerationConcurrency,
    thumbnailResolveConcurrency: appSettings.thumbnailResolveConcurrency,
    thumbnailQueueSize: appSettings.thumbnailQueueSize,
    cpuTokenLimit: appSettings.cpuTokenLimit,
    thumbnailWarmupRadius: appSettings.thumbnailWarmupRadius,
    thumbnailWarmupConcurrency: appSettings.thumbnailWarmupConcurrency,
    fullscreenPrefetchRadius: appSettings.fullscreenPrefetchRadius,
    fullscreenDecodeCacheSize: appSettings.fullscreenDecodeCacheSize,
    fullscreenResamplingEnabled: appSettings.fullscreenResamplingEnabled,
    fullscreenUpsamplingKernel: appSettings.fullscreenUpsamplingKernel,
    fullscreenDownsamplingKernel: appSettings.fullscreenDownsamplingKernel,
    proxyServer: appSettings.proxyServer,
    ehentaiAuthState: ehentaiAuthStatus?.state ?? "disconnected",
    ehentaiAuthConnected: ehentaiAuthStatus?.connected ?? false,
    ehentaiAuthMessage: ehentaiAuthStatus?.message ?? null,
    ehentaiAuthChecking,
    ehentaiAuthConnectPending,
    ehentaiAuthDisconnectPending,
    subtitleFeatureEnabled: appSettings.subtitleFeatureEnabled,
    subtitleRenderMode: appSettings.subtitleRenderMode,
    subtitleAdvancedVadPreset: appSettings.subtitleAdvancedVadPreset,
    subtitleAdvancedVadThreshold: appSettings.subtitleAdvancedVadThreshold,
    subtitleAdvancedVadMinSilenceSec:
      appSettings.subtitleAdvancedVadMinSilenceSec,
    subtitleAdvancedVadMinSpeechSec:
      appSettings.subtitleAdvancedVadMinSpeechSec,
    subtitleAdvancedVadMaxSpeechSec:
      appSettings.subtitleAdvancedVadMaxSpeechSec,
    subtitleAdvancedSpeakerThreshold:
      appSettings.subtitleAdvancedSpeakerThreshold,
    subtitleValidPlaybackRateThreshold:
      appSettings.subtitleValidPlaybackRateThreshold,
    subtitleLanguage: appSettings.subtitleLanguage,
    subtitleSelectedModelId: normalizeSubtitleModelSelectionId(
      appSettings.subtitleSelectedModelId,
    ),
    subtitleModelDir: appSettings.subtitleModelDir,
    subtitleModelDirByProfile: appSettings.subtitleModelDirByProfile,
    subtitleTextFillMode: appSettings.subtitleTextFillMode,
    subtitleTextColor: appSettings.subtitleTextColor,
    subtitleGradientStartColor: appSettings.subtitleGradientStartColor,
    subtitleGradientEndColor: appSettings.subtitleGradientEndColor,
    subtitleGradientDirection: appSettings.subtitleGradientDirection,
    subtitleGradientCurve: appSettings.subtitleGradientCurve,
    subtitleStrokeColor: appSettings.subtitleStrokeColor,
    subtitleStrokeWidth: appSettings.subtitleStrokeWidth,
    subtitleStrokeShadowColor: appSettings.subtitleStrokeShadowColor,
    subtitleStrokeShadowRadius: appSettings.subtitleStrokeShadowRadius,
    subtitleFontSize: appSettings.subtitleFontSize,
    subtitleMaxLineChars: appSettings.subtitleMaxLineChars,
    subtitleOffsetY: appSettings.subtitleOffsetY,
    subtitleStylePanelExpanded: appSettings.subtitleStylePanelExpanded,
    subtitleModelsLoading,
    subtitleModelsError,
    subtitleModelsStatus,
    subtitleRemoteModels,
    subtitleLocalModels,
    subtitleDownloadTask,
    subtitleDownloadPending,
    subtitleModelDownloadSupported,
    adReviewVisionEndpoint: appSettings.adReviewVisionEndpoint,
    adReviewVisionModel: appSettings.adReviewVisionModel,
    adReviewVisionVerified: appSettings.adReviewVisionVerified,
    adReviewVisionTestPending,
    adReviewVisionTestMessage,
    adReviewVisionSavePending,
    adReviewVisionSaveMessage,
    subtitleCleanupLlmEndpoint: appSettings.subtitleCleanupLlmEndpoint,
    subtitleCleanupLlmModel: appSettings.subtitleCleanupLlmModel,
    subtitleCleanupLlmPrompt: appSettings.subtitleCleanupLlmPrompt,
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
    mediaCapabilitiesLoading: runtimeInfoDiagnostics.mediaCapabilitiesLoading,
    mediaCapabilitiesError: runtimeInfoDiagnostics.mediaCapabilitiesError,
    mediaCapabilities: runtimeInfoDiagnostics.mediaCapabilities,
    adReviewDeleteOverlayDebugActive,
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
    pickSubtitleModelDirectoryPath,
    refreshSubtitleModels,
    startSubtitleModelDownload,
    cancelSubtitleModelDownload,
    openSubtitleModelPage,
    openAdReviewDeleteOverlayDebug: onOpenAdReviewDeleteOverlayDebug,
    refreshEhentaiAuthStatus,
    connectEhentaiAuth,
    disconnectEhentaiAuth,
  });

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
    styleId: appSettings.styleId,
    paletteMode: appSettings.paletteMode,
    paletteDayId: appSettings.paletteDayId,
    paletteNightId: appSettings.paletteNightId,
    headerDebugGroupVisible: appSettings.headerDebugGroupVisible,
    tooltipEnabled: appSettings.tooltipEnabled,
    electronNativeChromeEnabled: appSettings.electronNativeChromeEnabled,
    themeParameterButtonVisible: appSettings.themeParameterButtonVisible,
    popoverDebugPinned: appSettings.popoverDebugPinned,
    settingsOpen: appSettings.settingsOpen,
    helpOpen: appSettings.helpOpen,
    themeParameterPanelOpen,
    interactionLocked: adReviewDeleting,
    importMenuOpen,
    taskStatusLabel,
    taskStatusBusy,
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
    onTooltipEnabledChange: (value: boolean) => appSettings.updateSettings({ tooltipEnabled: value }),
    onElectronNativeChromeEnabledChange: applyElectronNativeChromeEnabled,
    onThemeParameterButtonVisibleChange: (value: boolean) => appSettings.updateSettings({ themeParameterButtonVisible: value }),
    onOpenThemeParameter: () => setThemeParameterPanelOpen(true),
    sidebarCollapsed,
    metadataCollapsed,
    onToggleSidebarPanel,
    onToggleMetadataPanel,
    layoutConvergedInsetPx,
  });

  const helpPanelProps = {
    helpOpen: appSettings.helpOpen,
    settingsFontSize: appSettings.settingsFontSize,
    shortcuts: appSettings.shortcuts,
    onClose: () => appSettings.updateSettings({ helpOpen: false }),
  };

  const themeParameterPanelProps = {
    open: themeParameterPanelOpen,
    styleId: appSettings.styleId,
    settingsFontSize: appSettings.settingsFontSize,
    onClose: () => setThemeParameterPanelOpen(false),
  };

  const importTaskPanelProps = buildImportTaskPanelProps({
    open: importTaskPanelOpen,
    activeTaskCount: activeImportTaskCount,
    pendingArchiveCount: normalizedPendingArchivePathSet.size,
    runningArchive: Boolean(normalizedRunningArchivePath),
    runningArchiveProgress,
    runningArchiveMessage,
    thumbnailRunningCount,
    thumbnailRunningProgress,
    thumbnailRunningMessage,
    enqueuePending,
    taskError,
    tasks: importTasksForPanel,
    setImportTaskPanelOpen,
    clearFinishedImportTasks,
    clearAllImportTasks,
    clearTaskError,
    retryImportTaskFromPanel,
    setDismissedImportTaskIds,
  });

  return {
    bannerBackendErrorRows,
    managementErrorRows,
    runtimeCapabilityWarnings,
    runtimeWarningDismiss,
    fullscreenLayerProps,
    helpPanelProps,
    settingsPanelProps,
    themeParameterPanelProps,
    appHeaderProps,
    importTaskPanelProps,
    helpOverlayOpen,
  };
}

export type AppTopLayerStateResult = ReturnType<typeof useAppTopLayerState>;
