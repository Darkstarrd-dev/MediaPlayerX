import type { Dispatch, SetStateAction } from "react";

import type { AppSettings } from "../../contracts/settings";
import type { ManageReviewModeDto } from "../../contracts/backend";
import type { MetadataPanelProps } from "../../components/MetadataPanel";
import type { ParsedExternalMetadata } from "../metadata/parseExternalMetadata";
import type {
  AudioItem,
  ImageItem,
  ImagePackage,
  VideoItem,
} from "../../types";
import type {
  AudioMetadataWritePayload,
  PackageMetadataWritePayload,
  VideoMetadataWritePayload,
} from "./useMetadataWriteBindings";

interface BuildMetadataPanelPropsParams {
  mode: MetadataPanelProps["mode"];
  manageMode: boolean;
  searchModeActive: boolean;
  featureResultCount: number;
  featureNameQuery: string;
  onFeatureNameQueryChange: (value: string) => void;
  featureWorkTitleQuery: string;
  onFeatureWorkTitleQueryChange: (value: string) => void;
  featureCircleQuery: string;
  onFeatureCircleQueryChange: (value: string) => void;
  featureAuthorQuery: string;
  onFeatureAuthorQueryChange: (value: string) => void;
  featureCircleOptions: string[];
  featureAuthorOptions: string[];
  featureTagOptions: string[];
  featureTagPickerOpen: boolean;
  onToggleFeatureTagPicker: () => void;
  featureTags: string[];
  onSetFeatureTags: (tags: string[]) => void;
  onClearFeatureTags: () => void;
  featureGradeFilter: number | null;
  onFeatureGradeFilterChange: (value: number | null) => void;
  adReviewFeatureVisible: boolean;
  adReviewPanelOpen: boolean;
  manageReviewMode?: ManageReviewModeDto;
  canSwitchManageReviewMode?: boolean;
  canExecuteAdReview: boolean;
  adReviewPending: boolean;
  adReviewDeletePending?: boolean;
  adReviewTask: MetadataPanelProps["adReviewTask"];
  adReviewQueueTasks: MetadataPanelProps["adReviewQueueTasks"];
  adReviewActiveTaskId: string | null;
  adReviewHideUncheckedNonChecked: boolean;
  hasCheckedAdReviewCandidates: boolean;
  selectedAdReviewCandidateCount: number;
  adReviewFocusTaskId: string | null;
  adReviewStrategyMode: "all" | "head-tail";
  adReviewExecutionMode?: "normal" | "performance";
  adReviewMaxConcurrency: number;
  adReviewHeadN: number;
  adReviewTailN: number;
  adReviewTailStopCleanStreak: number;
  onStartAdReview: (options?: { skipReviewedNodes?: boolean }) => void;
  onPauseAdReview: () => void;
  onToggleHideUncheckedNonChecked: () => void;
  onSelectAdReviewTask: (taskId: string) => void;
  onRemoveAdReviewTask: (taskId: string) => void;
  onDeleteSelectedAdReviewCandidates?: () => void;
  onToggleAdReviewFocus: () => void;
  onAdReviewStrategyModeChange: (value: "all" | "head-tail") => void;
  onAdReviewMaxConcurrencyChange: (value: number) => void;
  onAdReviewHeadNChange: (value: number) => void;
  onAdReviewTailNChange: (value: number) => void;
  onAdReviewTailStopCleanStreakChange: (value: number) => void;
  onDismissAdReviewTask: () => void;
  onManageReviewModeChange?: (nextMode: ManageReviewModeDto) => void;
  metadataCollapsed: boolean;
  metadataRatio: number;
  hasImageFocus: boolean;
  focusedImage: ImageItem | null;
  focusedImageSrc: string | null;
  focusedImagePackage: ImagePackage | null;
  currentGrade: number | null;
  currentVideoGrade: number | null;
  metadataPending: boolean;
  editable: boolean;
  focusedVideo: VideoItem | null;
  focusedAudio: AudioItem | null;
  audioPlaylistIds: string[];
  selectedAudioId: string;
  audioById: Map<string, AudioItem>;
  musicBookletAlbumRootPath: string;
  musicBookletCandidates: Array<{
    sourceId: string;
    label: string;
    imageCount: number;
  }>;
  musicCoverBindingValue: string;
  musicBookletBindingValue: string;
  canOpenMusicCover: boolean;
  canOpenMusicBooklet: boolean;
  metadataTab: MetadataPanelProps["metadataTab"];
  playlistIds: string[];
  videoQueueSource: MetadataPanelProps["videoQueueSource"];
  savedVideoPlaylists: AppSettings["videoSavedPlaylists"];
  selectedVideoId: string;
  dragVideoId: string | null;
  videoById: Map<string, VideoItem>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  onGradeChange: (grade: number | null) => void;
  onSavePackageMetadata: (payload: PackageMetadataWritePayload) => void;
  onSavePackageParsedMetadata: (
    payload: ParsedExternalMetadata,
  ) => Promise<void>;
  onSaveVideoMetadata: (payload: VideoMetadataWritePayload) => void;
  onSaveAudioMetadata: (payload: AudioMetadataWritePayload) => void;
  onMetadataTabChange: (tab: MetadataPanelProps["metadataTab"]) => void;
  onSelectVideo: (videoId: string) => void;
  onSelectVideoAndPlay?: (videoId: string) => void;
  onSearchByWorkTitle: (value: string) => void;
  onSearchByCircle: (value: string) => void;
  onSearchByAuthor: (value: string) => void;
  onSearchByTag: (value: string) => void;
  setPlaylistIds: Dispatch<SetStateAction<string[]>>;
  setDragVideoId: Dispatch<SetStateAction<string | null>>;
  onSelectAudio: (audioId: string) => void;
  onSelectAudioAndPlay: (audioId: string) => void;
  onMusicCoverBindingChange: (value: string) => void;
  onMusicBookletBindingChange: (value: string) => void;
  onOpenMusicCover: () => void;
  onOpenMusicBooklet: () => void;
  onResetMusicBookletBinding: () => void;
  titleCollapseEnabled?: boolean;
}

function normalizePlaylistName(rawValue: string): string {
  return rawValue.trim().slice(0, 64);
}

function normalizePlaylistVideoIds(videoIds: string[]): string[] {
  return Array.from(
    new Set(videoIds.map((id) => id.trim()).filter(Boolean)),
  ).slice(0, 2000);
}

export function buildMetadataPanelProps(
  params: BuildMetadataPanelPropsParams,
): MetadataPanelProps {
  return {
    mode: params.mode,
    manageMode: params.manageMode,
    searchModeActive: params.searchModeActive,
    featureResultCount: params.featureResultCount,
    featureNameQuery: params.featureNameQuery,
    onFeatureNameQueryChange: params.onFeatureNameQueryChange,
    featureWorkTitleQuery: params.featureWorkTitleQuery,
    onFeatureWorkTitleQueryChange: params.onFeatureWorkTitleQueryChange,
    featureCircleQuery: params.featureCircleQuery,
    onFeatureCircleQueryChange: params.onFeatureCircleQueryChange,
    featureAuthorQuery: params.featureAuthorQuery,
    onFeatureAuthorQueryChange: params.onFeatureAuthorQueryChange,
    featureCircleOptions: params.featureCircleOptions,
    featureAuthorOptions: params.featureAuthorOptions,
    featureTagOptions: params.featureTagOptions,
    featureTagPickerOpen: params.featureTagPickerOpen,
    onToggleFeatureTagPicker: params.onToggleFeatureTagPicker,
    featureTags: params.featureTags,
    onSetFeatureTags: params.onSetFeatureTags,
    onClearFeatureTags: params.onClearFeatureTags,
    featureGradeFilter: params.featureGradeFilter,
    onFeatureGradeFilterChange: params.onFeatureGradeFilterChange,
    adReviewFeatureVisible: params.adReviewFeatureVisible,
    adReviewPanelOpen: params.adReviewPanelOpen,
    manageReviewMode: params.manageReviewMode,
    canSwitchManageReviewMode: params.canSwitchManageReviewMode,
    canExecuteAdReview: params.canExecuteAdReview,
    adReviewPending: params.adReviewPending,
    adReviewDeletePending: params.adReviewDeletePending,
    adReviewTask: params.adReviewTask,
    adReviewQueueTasks: params.adReviewQueueTasks,
    adReviewActiveTaskId: params.adReviewActiveTaskId,
    adReviewHideUncheckedNonChecked: params.adReviewHideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: params.hasCheckedAdReviewCandidates,
    selectedAdReviewCandidateCount: params.selectedAdReviewCandidateCount,
    adReviewFocusTaskId: params.adReviewFocusTaskId,
    adReviewStrategyMode: params.adReviewStrategyMode,
    adReviewExecutionMode: params.adReviewExecutionMode,
    adReviewMaxConcurrency: params.adReviewMaxConcurrency,
    adReviewHeadN: params.adReviewHeadN,
    adReviewTailN: params.adReviewTailN,
    adReviewTailStopCleanStreak: params.adReviewTailStopCleanStreak,
    onStartAdReview: params.onStartAdReview,
    onPauseAdReview: params.onPauseAdReview,
    onToggleHideUncheckedNonChecked: params.onToggleHideUncheckedNonChecked,
    onSelectAdReviewTask: params.onSelectAdReviewTask,
    onRemoveAdReviewTask: params.onRemoveAdReviewTask,
    onDeleteSelectedAdReviewCandidates:
      params.onDeleteSelectedAdReviewCandidates,
    onToggleAdReviewFocus: params.onToggleAdReviewFocus,
    onAdReviewStrategyModeChange: params.onAdReviewStrategyModeChange,
    onAdReviewMaxConcurrencyChange: params.onAdReviewMaxConcurrencyChange,
    onAdReviewHeadNChange: params.onAdReviewHeadNChange,
    onAdReviewTailNChange: params.onAdReviewTailNChange,
    onAdReviewTailStopCleanStreakChange:
      params.onAdReviewTailStopCleanStreakChange,
    onDismissAdReviewTask: params.onDismissAdReviewTask,
    onManageReviewModeChange: params.onManageReviewModeChange,
    metadataCollapsed: params.metadataCollapsed,
    metadataRatio: params.metadataRatio,
    hasImageFocus: params.hasImageFocus,
    focusedImage: params.focusedImage,
    focusedImageSrc: params.focusedImageSrc,
    focusedImagePackage: params.focusedImagePackage,
    currentGrade: params.currentGrade,
    currentVideoGrade: params.currentVideoGrade,
    metadataPending: params.metadataPending,
    editable: params.editable,
    focusedVideo: params.focusedVideo,
    focusedAudio: params.focusedAudio,
    audioPlaylistIds: params.audioPlaylistIds,
    selectedAudioId: params.selectedAudioId,
    audioById: params.audioById,
    musicBookletAlbumRootPath: params.musicBookletAlbumRootPath,
    musicBookletCandidates: params.musicBookletCandidates,
    musicCoverBindingValue: params.musicCoverBindingValue,
    musicBookletBindingValue: params.musicBookletBindingValue,
    canOpenMusicCover: params.canOpenMusicCover,
    canOpenMusicBooklet: params.canOpenMusicBooklet,
    metadataTab: params.metadataTab,
    playlistIds: params.playlistIds,
    videoQueueSource: params.videoQueueSource,
    savedVideoPlaylists: params.savedVideoPlaylists,
    selectedVideoId: params.selectedVideoId,
    dragVideoId: params.dragVideoId,
    videoById: params.videoById,
    onCollapse: () => params.updateSettings({ metadataCollapsed: true }),
    onExpand: () => params.updateSettings({ metadataCollapsed: false }),
    titleCollapseEnabled: params.titleCollapseEnabled ?? true,
    onGradeChange: params.onGradeChange,
    onSavePackageMetadata: params.onSavePackageMetadata,
    onSavePackageParsedMetadata: params.onSavePackageParsedMetadata,
    onSaveVideoMetadata: params.onSaveVideoMetadata,
    onSaveAudioMetadata: params.onSaveAudioMetadata,
    onSearchByWorkTitle: params.onSearchByWorkTitle,
    onSearchByCircle: params.onSearchByCircle,
    onSearchByAuthor: params.onSearchByAuthor,
    onSearchByTag: params.onSearchByTag,
    onMetadataTabChange: params.onMetadataTabChange,
    onSelectVideo: params.onSelectVideo,
    onSelectVideoAndPlay: params.onSelectVideoAndPlay ?? params.onSelectVideo,
    onSaveCurrentPlaylist: (rawName: string) => {
      const name = normalizePlaylistName(rawName);
      if (!name) {
        return;
      }
      const nextIds = normalizePlaylistVideoIds(params.playlistIds);
      params.updateSettings({
        videoSavedPlaylists: {
          ...params.savedVideoPlaylists,
          [name]: nextIds,
        },
      });
    },
    onCreateNamedPlaylist: (rawName: string) => {
      const name = normalizePlaylistName(rawName);
      if (!name || params.savedVideoPlaylists[name]) {
        return;
      }
      const nextSavedPlaylists: AppSettings["videoSavedPlaylists"] = {
        ...params.savedVideoPlaylists,
        [name]: [],
      };
      params.updateSettings({ videoSavedPlaylists: nextSavedPlaylists });
      params.setPlaylistIds([]);
      params.setDragVideoId(null);
    },
    onLoadSavedPlaylist: (rawName: string) => {
      const name = normalizePlaylistName(rawName);
      if (!name) {
        return;
      }
      const nextIds = normalizePlaylistVideoIds(
        params.savedVideoPlaylists[name] ?? [],
      );
      params.setPlaylistIds(nextIds);
      const firstVideoId = nextIds[0];
      if (firstVideoId) {
        params.onSelectVideo(firstVideoId);
      }
    },
    onDeleteSavedPlaylist: (rawName: string) => {
      const name = normalizePlaylistName(rawName);
      if (!name || !params.savedVideoPlaylists[name]) {
        return;
      }
      const removedPlaylistIds = normalizePlaylistVideoIds(
        params.savedVideoPlaylists[name] ?? [],
      );
      const currentPlaylistIds = normalizePlaylistVideoIds(params.playlistIds);
      const deletingCurrentLoadedPlaylist =
        removedPlaylistIds.length === currentPlaylistIds.length &&
        removedPlaylistIds.every(
          (id, index) => id === currentPlaylistIds[index],
        );
      const nextSavedPlaylists: AppSettings["videoSavedPlaylists"] = {
        ...params.savedVideoPlaylists,
      };
      delete nextSavedPlaylists[name];
      params.updateSettings({
        videoSavedPlaylists: nextSavedPlaylists,
      });
      if (
        deletingCurrentLoadedPlaylist ||
        Object.keys(nextSavedPlaylists).length === 0
      ) {
        params.setPlaylistIds([]);
        params.setDragVideoId(null);
      }
    },
    onRemoveVideoFromPlaylist: (videoId: string) => {
      params.setPlaylistIds((previous) =>
        previous.filter((id) => id !== videoId),
      );
    },
    onDragStart: (videoId: string) => {
      params.setDragVideoId(videoId);
    },
    onDropToVideo: (
      targetVideoId: string,
      placement: "before" | "after" = "before",
    ) => {
      const dragVideoId = params.dragVideoId;
      if (!dragVideoId || dragVideoId === targetVideoId) {
        return;
      }

      params.setPlaylistIds((previous) => {
        const from = previous.indexOf(dragVideoId);
        const to = previous.indexOf(targetVideoId);
        if (from < 0 || to < 0) {
          return previous;
        }

        const next = [...previous];
        next.splice(from, 1);
        const insertIndexBase = placement === "after" ? to + 1 : to;
        const insertIndex =
          from < insertIndexBase ? insertIndexBase - 1 : insertIndexBase;
        next.splice(insertIndex, 0, dragVideoId);
        return next;
      });
    },
    onDragEnd: () => {
      params.setDragVideoId(null);
    },
    onSelectAudio: params.onSelectAudio,
    onSelectAudioAndPlay: params.onSelectAudioAndPlay,
    onMusicCoverBindingChange: params.onMusicCoverBindingChange,
    onMusicBookletBindingChange: params.onMusicBookletBindingChange,
    onOpenMusicCover: params.onOpenMusicCover,
    onOpenMusicBooklet: params.onOpenMusicBooklet,
    onResetMusicBookletBinding: params.onResetMusicBookletBinding,
  };
}
