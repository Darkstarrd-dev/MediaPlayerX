/* eslint-disable @typescript-eslint/no-explicit-any */

import { buildMetadataPanelProps } from "./buildMetadataPanelProps";
import { createAdReviewSettingHandlers } from "./workspaceAdReviewHandlers";

interface BuildWorkspaceMetadataPanelPropsParams {
  appSettings: any;
  manageAdReview: any;
  metadataWriteBindings: any;
  musicBookletState: any;
  musicBookletBindings: any;
  mode: any;
  manageMode: boolean;
  vectorMode: boolean;
  metadataManageMode: boolean;
  videosForSidebarCount: number;
  audiosForSidebarCount: number;
  scopedImageSourcesEffective: unknown[];
  featureNameQuery: string;
  setFeatureNameQuery: (value: string) => void;
  featureWorkTitleQuery: string;
  setFeatureWorkTitleQuery: (value: string) => void;
  featureCircleQuery: string;
  setFeatureCircleQuery: (value: string) => void;
  featureAuthorQuery: string;
  setFeatureAuthorQuery: (value: string) => void;
  featureCircleOptions: string[];
  featureAuthorOptions: string[];
  featureTagOptionsEffective: string[];
  featureTagPickerOpen: boolean;
  setFeatureTagPickerOpen: (updater: (value: boolean) => boolean) => void;
  featureTags: string[];
  setFeatureTags: (tags: string[]) => void;
  featureGradeFilter: number | null;
  setFeatureGradeFilter: (value: number | null) => void;
  adReviewPanelOpen: boolean;
  activeSelectionScope: any;
  sidebarCheckedNodeIds: string[];
  imageCheckedIds: string[];
  adReviewFocusTaskId: string | null;
  setAdReviewFocusTaskId: (
    value: string | null | ((prev: string | null) => string | null),
  ) => void;
  setAdReviewPageIndex: (value: number) => void;
  setSelectedSidebarNodeId: (nodeId: string | null) => void;
  imageFocusActive: boolean;
  metadataImageEffective: any;
  metadataImageSrc: string | null;
  metadataImagePackageEffective: any;
  currentGradeEffective: number | null;
  focusedVideoEffective: any;
  focusedAudio: any;
  metadataMusicPlaylistIds: string[];
  selectedAudioId: string | null;
  audioByIdEffective: Map<string, any>;
  openMusicCoverSourceId: string | null;
  openMusicBookletSourceId: string | null;
  metadataTab: any;
  playlistIds: string[];
  selectedVideoId: string | null;
  dragVideoId: string | null;
  videoByIdEffective: Map<string, any>;
  saveParsedMetadata: any;
  applyQuickFeatureSearch: (patch: {
    workTitle?: string;
    circle?: string;
    author?: string;
    tag?: string;
  }) => void;
  setMetadataTab: (tab: any) => void;
  selectVideoFromBrowser: (videoId: string, options?: any) => void;
  setSelectedAudioId: any;
  requestMusicPlay: () => void;
  updateMusicCoverBinding: any;
  updateMusicBookletBinding: any;
  jumpMusicToCover: () => void;
  jumpMusicToBooklet: () => void;
  setPlaylistIds: any;
  setDragVideoId: any;
  videoQueueSource: "sidebar" | "playlist";
  titleCollapseEnabled?: boolean;
}

export function buildWorkspaceMetadataPanelProps({
  appSettings,
  manageAdReview,
  metadataWriteBindings,
  musicBookletState,
  musicBookletBindings,
  mode,
  manageMode,
  vectorMode,
  metadataManageMode,
  videosForSidebarCount,
  audiosForSidebarCount,
  scopedImageSourcesEffective,
  featureNameQuery,
  setFeatureNameQuery,
  featureWorkTitleQuery,
  setFeatureWorkTitleQuery,
  featureCircleQuery,
  setFeatureCircleQuery,
  featureAuthorQuery,
  setFeatureAuthorQuery,
  featureCircleOptions,
  featureAuthorOptions,
  featureTagOptionsEffective,
  featureTagPickerOpen,
  setFeatureTagPickerOpen,
  featureTags,
  setFeatureTags,
  featureGradeFilter,
  setFeatureGradeFilter,
  adReviewPanelOpen,
  activeSelectionScope,
  sidebarCheckedNodeIds,
  imageCheckedIds,
  adReviewFocusTaskId,
  setAdReviewFocusTaskId,
  setAdReviewPageIndex,
  setSelectedSidebarNodeId,
  imageFocusActive,
  metadataImageEffective,
  metadataImageSrc,
  metadataImagePackageEffective,
  currentGradeEffective,
  focusedVideoEffective,
  focusedAudio,
  metadataMusicPlaylistIds,
  selectedAudioId,
  audioByIdEffective,
  openMusicCoverSourceId,
  openMusicBookletSourceId,
  metadataTab,
  playlistIds,
  selectedVideoId,
  dragVideoId,
  videoByIdEffective,
  saveParsedMetadata,
  applyQuickFeatureSearch,
  setMetadataTab,
  selectVideoFromBrowser,
  setSelectedAudioId,
  requestMusicPlay,
  updateMusicCoverBinding,
  updateMusicBookletBinding,
  jumpMusicToCover,
  jumpMusicToBooklet,
  setPlaylistIds,
  setDragVideoId,
  videoQueueSource,
  titleCollapseEnabled,
}: BuildWorkspaceMetadataPanelPropsParams) {
  const applyMetadataFeatureSearch = (patch: {
    workTitle?: string;
    circle?: string;
    author?: string;
    tag?: string;
  }) => {
    applyQuickFeatureSearch(patch);
  };

  return buildMetadataPanelProps({
    mode,
    manageMode,
    searchModeActive: vectorMode && !manageMode && !metadataManageMode,
    featureResultCount:
      mode === "video"
        ? videosForSidebarCount
        : mode === "music"
          ? audiosForSidebarCount
          : scopedImageSourcesEffective.length,
    featureNameQuery,
    onFeatureNameQueryChange: setFeatureNameQuery,
    featureWorkTitleQuery,
    onFeatureWorkTitleQueryChange: setFeatureWorkTitleQuery,
    featureCircleQuery,
    onFeatureCircleQueryChange: setFeatureCircleQuery,
    featureAuthorQuery,
    onFeatureAuthorQueryChange: setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions: featureTagOptionsEffective,
    featureTagPickerOpen,
    onToggleFeatureTagPicker: () => setFeatureTagPickerOpen((value) => !value),
    featureTags,
    onSetFeatureTags: (tags: any[]) => {
      const normalized = Array.from(
        new Set(tags.map((tag: any) => String(tag).trim()).filter(Boolean)),
      );
      setFeatureTags(normalized as string[]);
    },
    onClearFeatureTags: () => setFeatureTags([]),
    featureGradeFilter,
    onFeatureGradeFilterChange: setFeatureGradeFilter,
    adReviewFeatureVisible: appSettings.adReviewVisionVerified,
    adReviewPanelOpen,
    manageReviewMode: manageAdReview.reviewMode,
    canSwitchManageReviewMode: manageAdReview.supportsCoverReview,
    canExecuteAdReview:
      (activeSelectionScope === "sidebar" &&
        sidebarCheckedNodeIds.length > 0) ||
      imageCheckedIds.length > 0,
    adReviewPending: manageAdReview.pending,
    adReviewDeletePending: manageAdReview.deletePending,
    adReviewTask: manageAdReview.task,
    adReviewQueueTasks: manageAdReview.queueTasks,
    adReviewActiveTaskId: manageAdReview.activeTaskId,
    adReviewHideUncheckedNonChecked: manageAdReview.hideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: manageAdReview.hasCheckedCandidateSelection,
    selectedAdReviewCandidateCount: manageAdReview.selectedCandidateCount,
    adReviewFocusTaskId,
    adReviewStrategyMode: appSettings.adReviewStrategyMode,
    adReviewMaxConcurrency: appSettings.adReviewMaxConcurrency,
    adReviewHeadN: appSettings.adReviewHeadN,
    adReviewTailN: appSettings.adReviewTailN,
    adReviewTailStopCleanStreak: appSettings.adReviewTailStopCleanStreak,
    onStartAdReview: async (options: any) => {
      const startedTask = await manageAdReview.startManageAdReview(options);
      if (!startedTask) {
        return;
      }
      setAdReviewFocusTaskId(startedTask.task_id);
      setAdReviewPageIndex(0);
      setSelectedSidebarNodeId(null);
    },
    onPauseAdReview: () => {
      void manageAdReview.pauseManageAdReview();
    },
    onToggleHideUncheckedNonChecked:
      manageAdReview.toggleHideUncheckedNonChecked,
    onSelectAdReviewTask: (taskId: any) => {
      manageAdReview.selectTask(taskId);
      setAdReviewPageIndex(0);
    },
    onRemoveAdReviewTask: (taskId: any) => {
      void manageAdReview.removeTask(taskId);
    },
    onDeleteSelectedAdReviewCandidates: () => {
      void manageAdReview.confirmDeleteSelectedCandidates();
    },
    onToggleAdReviewFocus: () => {
      if (manageAdReview.deletePending) {
        return;
      }
      const currentTask = manageAdReview.task;
      if (!currentTask) {
        setAdReviewFocusTaskId(null);
        return;
      }

      const canFocusStatus =
        currentTask.status === "running" ||
        currentTask.status === "paused" ||
        currentTask.status === "review";
      if (!canFocusStatus || currentTask.candidates.length === 0) {
        setAdReviewFocusTaskId(null);
        setAdReviewPageIndex(0);
        return;
      }

      setAdReviewFocusTaskId((previous) => {
        setAdReviewPageIndex(0);
        return previous === currentTask.task_id ? null : currentTask.task_id;
      });
    },
    ...createAdReviewSettingHandlers({
      updateSettings: appSettings.updateSettings,
    }),
    onManageReviewModeChange: manageAdReview.setReviewMode,
    onDismissAdReviewTask: manageAdReview.dismissTask,
    metadataCollapsed: appSettings.metadataCollapsed,
    metadataRatio: appSettings.metadataRatio,
    hasImageFocus: imageFocusActive,
    focusedImage: metadataImageEffective,
    focusedImageSrc: metadataImageSrc,
    focusedImagePackage: metadataImagePackageEffective,
    currentGrade: currentGradeEffective,
    currentVideoGrade: focusedVideoEffective?.grade ?? null,
    metadataPending: metadataWriteBindings.metadataPending,
    editable: metadataManageMode,
    focusedVideo: focusedVideoEffective,
    focusedAudio,
    audioPlaylistIds: metadataMusicPlaylistIds,
    selectedAudioId,
    audioById: audioByIdEffective,
    musicBookletAlbumRootPath: musicBookletState.albumRootPath,
    musicBookletCandidates: musicBookletState.candidates.map(
      (candidate: any) => ({
        sourceId: candidate.sourceId,
        label: candidate.label,
        imageCount: candidate.imageCount,
      }),
    ),
    musicCoverBindingValue: musicBookletState.coverBindingValue,
    musicBookletBindingValue: musicBookletState.bookletBindingValue,
    canOpenMusicCover: Boolean(openMusicCoverSourceId),
    canOpenMusicBooklet: Boolean(openMusicBookletSourceId),
    metadataTab,
    playlistIds,
    videoQueueSource,
    savedVideoPlaylists: appSettings.videoSavedPlaylists,
    selectedVideoId,
    dragVideoId,
    videoById: videoByIdEffective,
    updateSettings: appSettings.updateSettings,
    onGradeChange: metadataWriteBindings.applyPackageGrade,
    onSavePackageMetadata: metadataWriteBindings.applyPackageMetadata,
    onSavePackageParsedMetadata: saveParsedMetadata,
    onSaveVideoMetadata: metadataWriteBindings.applyVideoMetadata,
    onSaveAudioMetadata: metadataWriteBindings.applyAudioMetadata,
    onSearchByWorkTitle: (value: any) => {
      applyMetadataFeatureSearch({ workTitle: value });
    },
    onSearchByCircle: (value: any) => {
      applyMetadataFeatureSearch({ circle: value });
    },
    onSearchByAuthor: (value: any) => {
      applyMetadataFeatureSearch({ author: value });
    },
    onSearchByTag: (value: any) => {
      applyMetadataFeatureSearch({ tag: value });
    },
    onMetadataTabChange: setMetadataTab,
    onSelectVideo: (videoId: any) => {
      selectVideoFromBrowser(videoId, { queueSource: "playlist" });
    },
    onSelectVideoAndPlay: (videoId: any) => {
      selectVideoFromBrowser(videoId, { play: true, queueSource: "playlist" });
    },
    onSelectAudio: (audioId: any) => {
      setSelectedAudioId(audioId);
      appSettings.updateSettings({ sidebarFocus: "main" });
    },
    onSelectAudioAndPlay: (audioId: any) => {
      setSelectedAudioId(audioId);
      requestMusicPlay();
      appSettings.updateSettings({ sidebarFocus: "main" });
    },
    onMusicCoverBindingChange: updateMusicCoverBinding,
    onMusicBookletBindingChange: updateMusicBookletBinding,
    onOpenMusicCover: jumpMusicToCover,
    onOpenMusicBooklet: jumpMusicToBooklet,
    onResetMusicBookletBinding: () => {
      if (!musicBookletState.albumRootPath) {
        return;
      }
      musicBookletBindings.resetBindingOverride(
        musicBookletState.albumRootPath,
      );
    },
    setPlaylistIds,
    setDragVideoId,
    titleCollapseEnabled,
  } as any);
}
