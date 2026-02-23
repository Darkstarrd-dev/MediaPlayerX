import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type {
  ManageAdReviewTaskDto,
  ManageReviewModeDto,
} from "../contracts/backend";
import type { ParsedExternalMetadata } from "../features/metadata/parseExternalMetadata";
import type {
  AudioItem,
  BrowserMode,
  ImageItem,
  ImagePackage,
  VideoItem,
} from "../types";
import { FeatureTagPickerModal } from "./metadata/FeatureTagPickerModal";
import { MetadataAdReviewSection } from "./metadata/MetadataAdReviewSection";
import { MetadataImageEditor } from "./metadata/MetadataImageEditor";
import { MetadataMusicEditor } from "./metadata/MetadataMusicEditor";
import { MetadataSearchSection } from "./metadata/MetadataSearchSection";
import { MetadataVideoEditor } from "./metadata/MetadataVideoEditor";
import { MainUiIcon } from "./MainUiIcon";
import { useI18n } from "../i18n/useI18n";
import {
  parseTagsInput,
  resolveTagGroupKey,
} from "./metadata/metadataPanelUtils";

const IS_TEST_MODE = import.meta.env.MODE === "test";

export interface MetadataPanelProps {
  mode: BrowserMode;
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
  adReviewTask: ManageAdReviewTaskDto | null;
  adReviewQueueTasks: ManageAdReviewTaskDto[];
  adReviewActiveTaskId: string | null;
  adReviewHideUncheckedNonChecked: boolean;
  hasCheckedAdReviewCandidates: boolean;
  selectedAdReviewCandidateCount: number;
  adReviewFocusTaskId: string | null;
  adReviewStrategyMode: "all" | "head-tail";
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
  metadataTab: "info" | "playlist";
  playlistIds: string[];
  videoQueueSource: "sidebar" | "playlist";
  savedVideoPlaylists: Record<string, string[]>;
  selectedVideoId: string;
  dragVideoId: string | null;
  videoById: Map<string, VideoItem>;
  onCollapse: () => void;
  onExpand: () => void;
  onGradeChange: (grade: number | null) => void;
  onSavePackageMetadata: (payload: {
    workTitle?: string;
    seriesId?: string;
    circle?: string;
    author?: string;
    tags?: string[];
    syncWorkTitleToPackageName?: boolean;
  }) => void;
  onSavePackageParsedMetadata: (
    payload: ParsedExternalMetadata,
  ) => Promise<void>;
  onSaveVideoMetadata: (payload: {
    workTitle?: string;
    workTitleJpn?: string;
    seriesId?: string;
    circle?: string;
    circleJpn?: string;
    author?: string;
    authorJpn?: string;
    tags?: string[];
    grade?: number | null;
    syncFileNameToWorkTitle?: boolean;
  }) => void;
  onSaveAudioMetadata: (payload: {
    album?: string;
    author?: string;
    trackTitle?: string;
    seriesId?: string;
  }) => void;
  onSearchByWorkTitle: (value: string) => void;
  onSearchByCircle: (value: string) => void;
  onSearchByAuthor: (value: string) => void;
  onSearchByTag: (value: string) => void;
  onMetadataTabChange: (tab: "info" | "playlist") => void;
  onSelectVideo: (videoId: string) => void;
  onSelectVideoAndPlay?: (videoId: string) => void;
  onSaveCurrentPlaylist: (name: string) => void;
  onCreateNamedPlaylist: (name: string) => void;
  onLoadSavedPlaylist: (name: string) => void;
  onDeleteSavedPlaylist: (name: string) => void;
  onRemoveVideoFromPlaylist: (videoId: string) => void;
  onDragStart: (videoId: string) => void;
  onDropToVideo: (
    targetVideoId: string,
    placement?: "before" | "after",
  ) => void;
  onDragEnd?: () => void;
  onSelectAudio: (audioId: string) => void;
  onSelectAudioAndPlay: (audioId: string) => void;
  onMusicCoverBindingChange: (value: string) => void;
  onMusicBookletBindingChange: (value: string) => void;
  onOpenMusicCover: () => void;
  onOpenMusicBooklet: () => void;
  onResetMusicBookletBinding: () => void;
}

function MetadataPanel({
  mode,
  manageMode,
  searchModeActive,
  featureResultCount,
  featureNameQuery,
  onFeatureNameQueryChange,
  featureWorkTitleQuery,
  onFeatureWorkTitleQueryChange,
  featureCircleQuery,
  onFeatureCircleQueryChange,
  featureAuthorQuery,
  onFeatureAuthorQueryChange,
  featureCircleOptions,
  featureAuthorOptions,
  featureTagOptions,
  featureTagPickerOpen,
  onToggleFeatureTagPicker,
  featureTags,
  onSetFeatureTags,
  onClearFeatureTags,
  featureGradeFilter,
  onFeatureGradeFilterChange,
  adReviewFeatureVisible,
  adReviewPanelOpen,
  manageReviewMode = "ad",
  canSwitchManageReviewMode = false,
  canExecuteAdReview,
  adReviewPending,
  adReviewDeletePending = false,
  adReviewTask,
  adReviewQueueTasks,
  adReviewActiveTaskId,
  adReviewHideUncheckedNonChecked,
  hasCheckedAdReviewCandidates,
  selectedAdReviewCandidateCount,
  adReviewFocusTaskId,
  adReviewStrategyMode,
  adReviewMaxConcurrency,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  onStartAdReview,
  onPauseAdReview,
  onToggleHideUncheckedNonChecked,
  onSelectAdReviewTask,
  onRemoveAdReviewTask,
  onDeleteSelectedAdReviewCandidates,
  onToggleAdReviewFocus,
  onAdReviewStrategyModeChange,
  onAdReviewMaxConcurrencyChange,
  onAdReviewHeadNChange,
  onAdReviewTailNChange,
  onAdReviewTailStopCleanStreakChange,
  onDismissAdReviewTask,
  onManageReviewModeChange = () => undefined,
  metadataCollapsed,
  metadataRatio,
  hasImageFocus,
  focusedImage,
  focusedImageSrc,
  focusedImagePackage,
  currentGrade,
  currentVideoGrade,
  metadataPending,
  editable,
  focusedVideo,
  focusedAudio,
  audioPlaylistIds,
  selectedAudioId,
  audioById,
  musicBookletAlbumRootPath,
  musicBookletCandidates,
  musicCoverBindingValue,
  musicBookletBindingValue,
  canOpenMusicCover,
  canOpenMusicBooklet,
  metadataTab,
  playlistIds,
  videoQueueSource,
  savedVideoPlaylists,
  selectedVideoId,
  dragVideoId,
  videoById,
  onCollapse,
  onExpand,
  onGradeChange,
  onSavePackageMetadata,
  onSavePackageParsedMetadata,
  onSaveVideoMetadata,
  onSaveAudioMetadata,
  onSearchByWorkTitle,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
  onMetadataTabChange,
  onSelectVideo,
  onSelectVideoAndPlay,
  onSaveCurrentPlaylist,
  onCreateNamedPlaylist,
  onLoadSavedPlaylist,
  onDeleteSavedPlaylist,
  onRemoveVideoFromPlaylist,
  onDragStart,
  onDropToVideo,
  onDragEnd,
  onSelectAudio,
  onSelectAudioAndPlay,
  onMusicCoverBindingChange,
  onMusicBookletBindingChange,
  onOpenMusicCover,
  onOpenMusicBooklet,
  onResetMusicBookletBinding,
}: MetadataPanelProps) {
  const { t } = useI18n();
  const [displayedImageSrc, setDisplayedImageSrc] = useState<string | null>(
    null,
  );
  const [showImagePreview, setShowImagePreview] = useState(true);
  const [workTitleDraft, setWorkTitleDraft] = useState("");
  const [seriesIdDraft, setSeriesIdDraft] = useState("");
  const [circleDraft, setCircleDraft] = useState("");
  const [authorDraft, setAuthorDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");
  const [videoWorkTitleDraft, setVideoWorkTitleDraft] = useState("");
  const [videoWorkTitleJpnDraft, setVideoWorkTitleJpnDraft] = useState("");
  const [videoSeriesIdDraft, setVideoSeriesIdDraft] = useState("");
  const [videoCircleDraft, setVideoCircleDraft] = useState("");
  const [videoCircleJpnDraft, setVideoCircleJpnDraft] = useState("");
  const [videoAuthorDraft, setVideoAuthorDraft] = useState("");
  const [videoAuthorJpnDraft, setVideoAuthorJpnDraft] = useState("");
  const [videoTagsDraft, setVideoTagsDraft] = useState("");
  const [audioAlbumDraft, setAudioAlbumDraft] = useState("");
  const [audioAuthorDraft, setAudioAuthorDraft] = useState("");
  const [audioTrackTitleDraft, setAudioTrackTitleDraft] = useState("");
  const [audioSeriesIdDraft, setAudioSeriesIdDraft] = useState("");
  const [featureTagDrafts, setFeatureTagDrafts] = useState<string[]>([]);
  const [featureTagSelectMode, setFeatureTagSelectMode] = useState<
    "single" | "multi"
  >("multi");
  const featureTagGroupsRef = useRef<HTMLDivElement | null>(null);
  const imagePreloadSeqRef = useRef(0);
  const lastFocusedImageIdRef = useRef<string | null>(null);
  const autoOriginalImageMode = mode === "image" && !manageMode && !editable;
  const focusedImageId = focusedImage?.id ?? null;

  const groupedFeatureTagOptions = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const tag of featureTagOptions) {
      const key = resolveTagGroupKey(tag);
      const existing = groups.get(key);
      if (existing) {
        existing.push(tag);
        continue;
      }
      groups.set(key, [tag]);
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => {
        if (left === "#") {
          return 1;
        }
        if (right === "#") {
          return -1;
        }
        return left.localeCompare(right, "en-US");
      })
      .map(([key, tags]) => ({
        key,
        tags: tags.sort((left, right) => left.localeCompare(right, "zh-CN")),
      }));
  }, [featureTagOptions]);

  useEffect(() => {
    if (IS_TEST_MODE) {
      if (displayedImageSrc !== focusedImageSrc) {
        setDisplayedImageSrc(focusedImageSrc);
      }
      return;
    }

    imagePreloadSeqRef.current += 1;
    const sequence = imagePreloadSeqRef.current;

    if (!focusedImageSrc) {
      if (!focusedImage) {
        setDisplayedImageSrc(null);
      }
      return;
    }

    if (focusedImageSrc === displayedImageSrc) {
      return;
    }

    let cancelled = false;
    const preview = new Image();
    preview.decoding = "async";
    preview.src = focusedImageSrc;

    const commit = () => {
      if (cancelled || imagePreloadSeqRef.current !== sequence) {
        return;
      }
      setDisplayedImageSrc(focusedImageSrc);
    };

    if (typeof preview.decode === "function") {
      void preview
        .decode()
        .then(() => {
          commit();
        })
        .catch(() => {
          if (
            preview.complete &&
            preview.naturalWidth > 0 &&
            preview.naturalHeight > 0
          ) {
            commit();
          }
        });
    } else {
      preview.onload = () => {
        commit();
      };
      preview.onerror = () => undefined;
    }

    return () => {
      cancelled = true;
    };
  }, [displayedImageSrc, focusedImage, focusedImageSrc]);

  useEffect(() => {
    setWorkTitleDraft(focusedImagePackage?.workTitle ?? "");
    setSeriesIdDraft(focusedImagePackage?.seriesId ?? "");
    setCircleDraft(focusedImagePackage?.circle ?? "");
    setAuthorDraft(focusedImagePackage?.author ?? "");
    setTagsDraft((focusedImagePackage?.tags ?? []).join(", "));
  }, [
    focusedImagePackage?.id,
    focusedImagePackage?.workTitle,
    focusedImagePackage?.seriesId,
    focusedImagePackage?.circle,
    focusedImagePackage?.author,
    focusedImagePackage?.tags,
  ]);

  useEffect(() => {
    setVideoWorkTitleDraft(focusedVideo?.workTitle ?? "");
    setVideoWorkTitleJpnDraft(focusedVideo?.workTitleJpn ?? "");
    setVideoSeriesIdDraft(focusedVideo?.seriesId ?? "");
    setVideoCircleDraft(focusedVideo?.circle ?? "");
    setVideoCircleJpnDraft(focusedVideo?.circleJpn ?? "");
    setVideoAuthorDraft(focusedVideo?.author ?? "");
    setVideoAuthorJpnDraft(focusedVideo?.authorJpn ?? "");
    setVideoTagsDraft((focusedVideo?.tags ?? []).join(", "));
  }, [
    focusedVideo?.id,
    focusedVideo?.workTitle,
    focusedVideo?.workTitleJpn,
    focusedVideo?.seriesId,
    focusedVideo?.circle,
    focusedVideo?.circleJpn,
    focusedVideo?.author,
    focusedVideo?.authorJpn,
    focusedVideo?.tags,
  ]);

  useEffect(() => {
    setAudioAlbumDraft(focusedAudio?.album ?? "");
    setAudioAuthorDraft(focusedAudio?.author ?? "");
    setAudioTrackTitleDraft(focusedAudio?.trackTitle ?? "");
    setAudioSeriesIdDraft(focusedAudio?.seriesId ?? "");
  }, [
    focusedAudio?.id,
    focusedAudio?.album,
    focusedAudio?.author,
    focusedAudio?.trackTitle,
    focusedAudio?.seriesId,
  ]);

  useEffect(() => {
    if (editable && showImagePreview) {
      setShowImagePreview(false);
    }
  }, [editable, showImagePreview]);

  useEffect(() => {
    const previousFocusedImageId = lastFocusedImageIdRef.current;
    lastFocusedImageIdRef.current = focusedImageId;

    if (!autoOriginalImageMode || !focusedImageId) {
      return;
    }

    if (previousFocusedImageId !== focusedImageId) {
      setShowImagePreview(true);
    }
  }, [autoOriginalImageMode, focusedImageId]);

  useEffect(() => {
    if (!autoOriginalImageMode) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setShowImagePreview(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [autoOriginalImageMode]);

  useEffect(() => {
    if (!featureTagPickerOpen) {
      return;
    }
    setFeatureTagDrafts(featureTags);
  }, [featureTagPickerOpen, featureTags]);

  useEffect(() => {
    if (!featureTagPickerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const shouldTrap =
        event.key === "Escape" || /^[a-zA-Z0-9]$/.test(event.key);
      if (!shouldTrap) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      if (event.key === "Escape") {
        setFeatureTagDrafts(featureTags);
        onToggleFeatureTagPicker();
        return;
      }

      const matched = event.key.match(/^[a-zA-Z0-9]$/);
      if (!matched) {
        return;
      }
      const jumpKey = matched[0].toUpperCase();
      const container = featureTagGroupsRef.current;
      if (!container) {
        return;
      }

      const rows = Array.from(
        container.querySelectorAll<HTMLElement>("[data-tag-group-key]"),
      );
      const targetRow = rows.find((row) => row.dataset.tagGroupKey === jumpKey);
      if (!targetRow) {
        return;
      }

      targetRow.scrollIntoView({ block: "start", behavior: "auto" });
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [featureTagPickerOpen, featureTags, onToggleFeatureTagPicker]);

  const showImageCanvas =
    mode === "image" &&
    showImagePreview &&
    hasImageFocus &&
    Boolean(focusedImage);
  const imagePreviewClassName = showImageCanvas
    ? "metadata-content metadata-content-focus"
    : "metadata-content";
  const lockMetadataScroll =
    mode === "image" &&
    showImagePreview &&
    hasImageFocus &&
    Boolean(focusedImage) &&
    !searchModeActive;
  const metadataPanelClassName = lockMetadataScroll
    ? "metadata-panel is-image-focus"
    : "metadata-panel";
  const handlePanelContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    if (!autoOriginalImageMode || !showImagePreview) {
      return;
    }
    event.preventDefault();
    setShowImagePreview(false);
  };
  const closeFeatureTagPicker = (revertDraft: boolean) => {
    if (revertDraft) {
      setFeatureTagDrafts(featureTags);
    }
    if (featureTagPickerOpen) {
      onToggleFeatureTagPicker();
    }
  };

  const toggleFeatureTagPickerRequest = () => {
    if (!featureTagPickerOpen) {
      setFeatureTagDrafts(featureTags);
    }
    onToggleFeatureTagPicker();
  };

  const metadataSearchSection = searchModeActive ? (
    <MetadataSearchSection
      featureResultCount={featureResultCount}
      featureNameQuery={featureNameQuery}
      onFeatureNameQueryChange={onFeatureNameQueryChange}
      featureWorkTitleQuery={featureWorkTitleQuery}
      onFeatureWorkTitleQueryChange={onFeatureWorkTitleQueryChange}
      featureCircleQuery={featureCircleQuery}
      onFeatureCircleQueryChange={onFeatureCircleQueryChange}
      featureAuthorQuery={featureAuthorQuery}
      onFeatureAuthorQueryChange={onFeatureAuthorQueryChange}
      featureCircleOptions={featureCircleOptions}
      featureAuthorOptions={featureAuthorOptions}
      featureTagPickerOpen={featureTagPickerOpen}
      featureTags={featureTags}
      onToggleFeatureTagPickerRequest={toggleFeatureTagPickerRequest}
      onClearFeatureTags={onClearFeatureTags}
      onSetFeatureTags={onSetFeatureTags}
      featureGradeFilter={featureGradeFilter}
      onFeatureGradeFilterChange={onFeatureGradeFilterChange}
    />
  ) : null;

  const adReviewSection =
    manageMode &&
    adReviewFeatureVisible &&
    adReviewPanelOpen &&
    mode === "image" ? (
      <MetadataAdReviewSection
        adReviewPending={adReviewPending}
        reviewMode={manageReviewMode}
        canSwitchReviewMode={canSwitchManageReviewMode}
        adReviewTask={adReviewTask}
        adReviewQueueTasks={adReviewQueueTasks}
        adReviewActiveTaskId={adReviewActiveTaskId}
        adReviewHideUncheckedNonChecked={adReviewHideUncheckedNonChecked}
        hasCheckedAdReviewCandidates={hasCheckedAdReviewCandidates}
        selectedAdReviewCandidateCount={selectedAdReviewCandidateCount}
        adReviewFocusTaskId={adReviewFocusTaskId}
        adReviewStrategyMode={adReviewStrategyMode}
        adReviewMaxConcurrency={adReviewMaxConcurrency}
        adReviewHeadN={adReviewHeadN}
        adReviewTailN={adReviewTailN}
        adReviewTailStopCleanStreak={adReviewTailStopCleanStreak}
        canExecuteAdReview={canExecuteAdReview}
        onStartAdReview={onStartAdReview}
        onPauseAdReview={onPauseAdReview}
        onToggleHideUncheckedNonChecked={onToggleHideUncheckedNonChecked}
        onSelectAdReviewTask={onSelectAdReviewTask}
        onRemoveAdReviewTask={onRemoveAdReviewTask}
        onDeleteSelectedAdReviewCandidates={onDeleteSelectedAdReviewCandidates}
        onToggleAdReviewFocus={onToggleAdReviewFocus}
        adReviewDeletePending={adReviewDeletePending}
        onAdReviewStrategyModeChange={onAdReviewStrategyModeChange}
        onAdReviewMaxConcurrencyChange={onAdReviewMaxConcurrencyChange}
        onAdReviewHeadNChange={onAdReviewHeadNChange}
        onAdReviewTailNChange={onAdReviewTailNChange}
        onAdReviewTailStopCleanStreakChange={
          onAdReviewTailStopCleanStreakChange
        }
        onDismissAdReviewTask={onDismissAdReviewTask}
        onReviewModeChange={onManageReviewModeChange}
        controlsInToolbar
      />
    ) : null;

  const persistPackageWorkTitle = (rawValue: string) => {
    if (!focusedImagePackage) {
      return;
    }
    const workTitle = rawValue.trim();
    if (workTitle.length === 0) {
      return;
    }

    onSavePackageMetadata({
      workTitle,
    });
  };

  const persistPackageCircle = (rawValue: string) => {
    if (!focusedImagePackage) {
      return;
    }
    const circle = rawValue.trim();
    if (circle.length === 0) {
      return;
    }

    onSavePackageMetadata({
      circle,
    });
  };

  const persistPackageSeriesId = (rawValue: string) => {
    if (!focusedImagePackage) {
      return;
    }

    onSavePackageMetadata({
      seriesId: rawValue.trim(),
    });
  };

  const persistPackageAuthor = (rawValue: string) => {
    if (!focusedImagePackage) {
      return;
    }
    const author = rawValue.trim();
    if (author.length === 0) {
      return;
    }

    onSavePackageMetadata({
      author,
    });
  };

  const persistPackageTags = (rawValue: string) => {
    if (!focusedImagePackage) {
      return;
    }
    const tags = parseTagsInput(rawValue);

    onSavePackageMetadata({
      tags,
    });
  };

  const persistVideoWorkTitle = (rawValue: string) => {
    if (!focusedVideo) {
      return;
    }
    const workTitle = rawValue.trim();
    if (workTitle.length === 0) {
      return;
    }

    onSaveVideoMetadata({
      workTitle,
    });
  };

  const persistVideoCircle = (rawValue: string) => {
    if (!focusedVideo) {
      return;
    }
    const circle = rawValue.trim();
    if (circle.length === 0) {
      return;
    }

    onSaveVideoMetadata({
      circle,
    });
  };

  const persistVideoWorkTitleJpn = (rawValue: string) => {
    if (!focusedVideo) {
      return;
    }

    onSaveVideoMetadata({
      workTitleJpn: rawValue.trim(),
    });
  };

  const persistVideoCircleJpn = (rawValue: string) => {
    if (!focusedVideo) {
      return;
    }

    onSaveVideoMetadata({
      circleJpn: rawValue.trim(),
    });
  };

  const persistVideoSeriesId = (rawValue: string) => {
    if (!focusedVideo) {
      return;
    }

    onSaveVideoMetadata({
      seriesId: rawValue.trim(),
    });
  };

  const persistVideoAuthor = (rawValue: string) => {
    if (!focusedVideo) {
      return;
    }
    const author = rawValue.trim();
    if (author.length === 0) {
      return;
    }

    onSaveVideoMetadata({
      author,
    });
  };

  const persistVideoAuthorJpn = (rawValue: string) => {
    if (!focusedVideo) {
      return;
    }

    onSaveVideoMetadata({
      authorJpn: rawValue.trim(),
    });
  };

  const persistVideoTags = (rawValue: string) => {
    if (!focusedVideo) {
      return;
    }
    const tags = parseTagsInput(rawValue);

    onSaveVideoMetadata({
      tags,
    });
  };

  const persistVideoGrade = (grade: number | null) => {
    if (!focusedVideo) {
      return;
    }

    onSaveVideoMetadata({
      grade,
    });
  };

  const persistAudioAlbum = (rawValue: string) => {
    if (!focusedAudio) {
      return;
    }

    onSaveAudioMetadata({
      album: rawValue.trim(),
    });
  };

  const persistAudioAuthor = (rawValue: string) => {
    if (!focusedAudio) {
      return;
    }

    onSaveAudioMetadata({
      author: rawValue.trim(),
    });
  };

  const persistAudioTrackTitle = (rawValue: string) => {
    if (!focusedAudio) {
      return;
    }

    onSaveAudioMetadata({
      trackTitle: rawValue.trim(),
    });
  };

  const persistAudioSeriesId = (rawValue: string) => {
    if (!focusedAudio) {
      return;
    }

    onSaveAudioMetadata({
      seriesId: rawValue.trim(),
    });
  };

  if (metadataCollapsed) {
    return (
      <button
        aria-label={t("a11y.common.expandMetadataPanel")}
        className="meta-restore"
        data-slot="fg-meta-restore"
        title={t("a11y.common.expandMetadataPanel")}
        type="button"
        onClick={onExpand}
      >
        <span className="meta-restore-tip">{t("ui.metadata.expandPanel")}</span>
      </button>
    );
  }

  const metadataToggleLabel = showImagePreview
    ? t("a11y.metadata.switchToMetadataDisplay")
    : t("a11y.metadata.switchToOriginalImageDisplay");

  return (
    <>
      <aside
        className={metadataPanelClassName}
        data-slot="fg-meta-root"
        style={{ width: `${metadataRatio * 100}%` }}
        onContextMenu={handlePanelContextMenu}
      >
        <div className="metadata-head" data-slot="fg-meta-toolbar">
          <button
            className="metadata-title-btn"
            data-slot="fg-meta-toolbar-title"
            type="button"
            onClick={onCollapse}
          >
            {t("ui.metadata.panelTitle")}
          </button>

          {mode === "image" ? (
            <button
              className={`metadata-head-icon-btn ${showImagePreview ? "is-image" : "is-metadata"}`}
              data-slot="fg-meta-toolbar-toggle"
              type="button"
              aria-label={metadataToggleLabel}
              title={metadataToggleLabel}
              onClick={() => setShowImagePreview((value) => !value)}
            >
              <MainUiIcon name={showImagePreview ? "dataMode" : "imageMode"} />
            </button>
          ) : null}
        </div>

        <div data-slot="fg-meta-main">
          {adReviewSection ? <div data-slot="fg-meta-main-ad-review">{adReviewSection}</div> : null}

          {metadataSearchSection ? <div data-slot="fg-meta-main-search">{metadataSearchSection}</div> : null}

          {mode === "image" ? (
          <div data-slot="fg-meta-main-image-editor">
            <MetadataImageEditor
              contentClassName={imagePreviewClassName}
              showImageCanvas={showImageCanvas}
              focusedImage={focusedImage}
              focusedImagePackage={focusedImagePackage}
              displayedImageSrc={displayedImageSrc}
              metadataPending={metadataPending}
              editable={editable}
              currentGrade={currentGrade}
              workTitleDraft={workTitleDraft}
              seriesIdDraft={seriesIdDraft}
              circleDraft={circleDraft}
              authorDraft={authorDraft}
              tagsDraft={tagsDraft}
              onWorkTitleDraftChange={setWorkTitleDraft}
              onSeriesIdDraftChange={setSeriesIdDraft}
              onCircleDraftChange={setCircleDraft}
              onAuthorDraftChange={setAuthorDraft}
              onTagsDraftChange={setTagsDraft}
              onSubmitPackageWorkTitle={persistPackageWorkTitle}
              onSubmitPackageSeriesId={persistPackageSeriesId}
              onSubmitPackageCircle={persistPackageCircle}
              onSubmitPackageAuthor={persistPackageAuthor}
              onSubmitPackageTags={persistPackageTags}
              onSubmitParsedMetadata={onSavePackageParsedMetadata}
              onGradeChange={onGradeChange}
              onSearchByWorkTitle={onSearchByWorkTitle}
              onSearchByCircle={onSearchByCircle}
              onSearchByAuthor={onSearchByAuthor}
              onSearchByTag={onSearchByTag}
            />
          </div>
          ) : mode === "video" ? (
          <div data-slot="fg-meta-main-video-editor">
            <MetadataVideoEditor
              metadataTab={metadataTab}
              videoQueueSource={videoQueueSource}
              focusedVideo={focusedVideo}
              metadataPending={metadataPending}
              editable={editable}
              currentVideoGrade={currentVideoGrade}
              videoWorkTitleDraft={videoWorkTitleDraft}
              videoWorkTitleJpnDraft={videoWorkTitleJpnDraft}
              videoSeriesIdDraft={videoSeriesIdDraft}
              videoCircleDraft={videoCircleDraft}
              videoCircleJpnDraft={videoCircleJpnDraft}
              videoAuthorDraft={videoAuthorDraft}
              videoAuthorJpnDraft={videoAuthorJpnDraft}
              videoTagsDraft={videoTagsDraft}
              playlistIds={playlistIds}
              savedVideoPlaylists={savedVideoPlaylists}
              selectedVideoId={selectedVideoId}
              dragVideoId={dragVideoId}
              videoById={videoById}
              onMetadataTabChange={onMetadataTabChange}
              onVideoWorkTitleDraftChange={setVideoWorkTitleDraft}
              onVideoWorkTitleJpnDraftChange={setVideoWorkTitleJpnDraft}
              onVideoSeriesIdDraftChange={setVideoSeriesIdDraft}
              onVideoCircleDraftChange={setVideoCircleDraft}
              onVideoCircleJpnDraftChange={setVideoCircleJpnDraft}
              onVideoAuthorDraftChange={setVideoAuthorDraft}
              onVideoAuthorJpnDraftChange={setVideoAuthorJpnDraft}
              onVideoTagsDraftChange={setVideoTagsDraft}
              onSubmitVideoWorkTitle={persistVideoWorkTitle}
              onSubmitVideoWorkTitleJpn={persistVideoWorkTitleJpn}
              onSubmitVideoSeriesId={persistVideoSeriesId}
              onSubmitVideoCircle={persistVideoCircle}
              onSubmitVideoCircleJpn={persistVideoCircleJpn}
              onSubmitVideoAuthor={persistVideoAuthor}
              onSubmitVideoAuthorJpn={persistVideoAuthorJpn}
              onSubmitVideoTags={persistVideoTags}
              onVideoGradeChange={persistVideoGrade}
              onSearchByWorkTitle={onSearchByWorkTitle}
              onSearchByCircle={onSearchByCircle}
              onSearchByAuthor={onSearchByAuthor}
              onSearchByTag={onSearchByTag}
              onSelectVideo={onSelectVideo}
              onSelectVideoAndPlay={onSelectVideoAndPlay ?? onSelectVideo}
              onSaveCurrentPlaylist={onSaveCurrentPlaylist}
              onCreateNamedPlaylist={onCreateNamedPlaylist}
              onLoadSavedPlaylist={onLoadSavedPlaylist}
              onDeleteSavedPlaylist={onDeleteSavedPlaylist}
              onRemoveVideoFromPlaylist={onRemoveVideoFromPlaylist}
              onDragStart={onDragStart}
              onDropToVideo={onDropToVideo}
              onDragEnd={onDragEnd ?? (() => undefined)}
            />
          </div>
          ) : (
            <div data-slot="fg-meta-main-music-editor">
              <MetadataMusicEditor
                focusedAudio={focusedAudio}
                audioPlaylistIds={audioPlaylistIds}
                selectedAudioId={selectedAudioId}
                audioById={audioById}
                musicBookletAlbumRootPath={musicBookletAlbumRootPath}
                musicBookletCandidates={musicBookletCandidates}
                musicCoverBindingValue={musicCoverBindingValue}
                musicBookletBindingValue={musicBookletBindingValue}
                canOpenMusicCover={canOpenMusicCover}
                canOpenMusicBooklet={canOpenMusicBooklet}
                metadataPending={metadataPending}
                editable={editable}
                audioAlbumDraft={audioAlbumDraft}
                audioAuthorDraft={audioAuthorDraft}
                audioTrackTitleDraft={audioTrackTitleDraft}
                audioSeriesIdDraft={audioSeriesIdDraft}
                onAudioAlbumDraftChange={setAudioAlbumDraft}
                onAudioAuthorDraftChange={setAudioAuthorDraft}
                onAudioTrackTitleDraftChange={setAudioTrackTitleDraft}
                onAudioSeriesIdDraftChange={setAudioSeriesIdDraft}
                onSubmitAudioAlbum={persistAudioAlbum}
                onSubmitAudioAuthor={persistAudioAuthor}
                onSubmitAudioTrackTitle={persistAudioTrackTitle}
                onSubmitAudioSeriesId={persistAudioSeriesId}
                onSearchByWorkTitle={onSearchByWorkTitle}
                onSearchByCircle={onSearchByCircle}
                onSearchByAuthor={onSearchByAuthor}
                onSelectAudio={onSelectAudio}
                onSelectAudioAndPlay={onSelectAudioAndPlay}
                onMusicCoverBindingChange={onMusicCoverBindingChange}
                onMusicBookletBindingChange={onMusicBookletBindingChange}
                onOpenMusicCover={onOpenMusicCover}
                onOpenMusicBooklet={onOpenMusicBooklet}
                onResetMusicBookletBinding={onResetMusicBookletBinding}
              />
            </div>
          )}
        </div>
        <div aria-hidden="true" data-slot="fg-meta-footer" />
      </aside>
      <FeatureTagPickerModal
        open={featureTagPickerOpen}
        selectMode={featureTagSelectMode}
        drafts={featureTagDrafts}
        groupedOptions={groupedFeatureTagOptions}
        groupContainerRef={featureTagGroupsRef}
        onSelectModeChange={setFeatureTagSelectMode}
        onDraftsChange={setFeatureTagDrafts}
        onCancel={() => closeFeatureTagPicker(true)}
        onConfirm={() => {
          onSetFeatureTags(featureTagDrafts);
          closeFeatureTagPicker(false);
        }}
      />
    </>
  );
}

export default MetadataPanel;
