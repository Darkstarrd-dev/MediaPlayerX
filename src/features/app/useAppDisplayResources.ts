import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useEffectiveDisplayState } from "./useEffectiveDisplayState";
import { useMetadataWriteBindings } from "./useMetadataWriteBindings";
import { buildCoverImageLocator } from "./mediaPathUtils";
import {
  resolveAdReviewPageDerivations,
  shouldGroupAdReviewByPackageRows,
} from "./workspaceAdReviewPageDerivations";
import { resolveAdReviewSidebarContext } from "./workspaceAdReviewSidebarContext";
import { resolveRefsInPageForDisplay } from "./workspaceImageDerivations";
import { useResolvedMediaState } from "./useResolvedMediaState";
import type { AppReadAndNavigationResult } from "./useAppReadAndNavigation";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { AppManageBindingsResult } from "./useAppManageBindings";
import type { MediaStateResult } from "../media/useMediaState";
import type { UiBenchSettings } from "../perf/benchSettings";
import { useLiveSubtitles } from "../subtitles/useLiveSubtitles";
import type { MediaLocator } from "../../types";
import { useI18n } from "../../i18n/useI18n";
import { toErrorDetailWithCode } from "./errorCode";
import { FIXED_SUBTITLE_MODEL_ID } from "../subtitles/fixedModel";
import {
  AUTO_SUBTITLE_ID,
  NODE_BROWSE_WARMUP_MAX_TARGETS,
  buildSubtitleOverlayStyle,
  isSyncSubtitleRepository,
  toAutoSubtitleLanguageLabel,
  toAutoSubtitleUiMessage,
  toLocatorDto,
} from "./useAppDisplayResources.helpers";

export interface VideoSubtitleOption {
  id: string;
  label: string;
  format: "vtt" | "srt" | "ass" | "ssa";
  locator: MediaLocator;
}

interface UseAppDisplayResourcesParams {
  appSettings: AppSettingsStoreSnapshot;
  benchSettings: UiBenchSettings;
  mediaRepository: RepositoryBootstrapDataResult["mediaRepository"];
  importBusy: boolean;
  sessionState: AppSessionStateResult;
  mediaState: MediaStateResult;
  readNavigationState: AppReadAndNavigationResult;
  manageBindings: AppManageBindingsResult;
}

export function useAppDisplayResources({
  appSettings,
  benchSettings,
  mediaRepository,
  importBusy,
  sessionState,
  mediaState,
  readNavigationState,
  manageBindings,
}: UseAppDisplayResourcesParams) {
  const { t } = useI18n();
  const { showNamesOnly } = appSettings;
  const isVideoMode = appSettings.mode === "video";
  const syncMediaRepository = isSyncSubtitleRepository(mediaRepository)
    ? mediaRepository
    : null;
  const isSynchronousSubtitleMode =
    import.meta.env.MODE === "test" && Boolean(syncMediaRepository);
  const {
    imageFocusActive,
    manageMode,
    metadataManageMode,
    adReviewFocusTaskId,
    adReviewPageIndex,
    selectedSidebarNodeId,
    setManageOperationHint,
  } = sessionState;

  const {
    selectedVideoId,
    videoTime,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
    fullscreenActive,
  } = mediaState;

  const {
    backendRead,
    vectorResultsActive,
    packageByIdEffective,
    scopedImageSourcesEffective,
    videoByIdEffective,
    audioByIdEffective,
    audiosForSidebar,
    videosForSidebar,
    selectedAudioId,
    focusedRef,
    focusedImage,
    activePackage,
    visibleImageRefs,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    thumbnailColumns,
    metadataImagePackage,
    currentGrade,
    actualCellWidth,
    actualMediaHeight,
    orderedRootScopedImageRefs,
    imageTreeForSidebar,
    sidebarCheckedNodeIds,
    imageCheckedIdSet,
    sidebarNodeById,
  } = readNavigationState;

  const {
    backendPageSnapshot,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedAudio,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
  } = useEffectiveDisplayState({
    backendPageData: backendRead.page.data,
    backendPageSnapshot: backendRead.page.snapshot,
    backendMetadataData: backendRead.metadata.data,
    backendMetadataSnapshot: backendRead.metadata.snapshot,
    vectorResultsActive,
    imageFocusActive,
    focusedRef,
    focusedImage,
    activePackage,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    showNamesOnly,
    packageById: packageByIdEffective,
    metadataImagePackage,
    currentGrade,
    selectedVideoId,
    selectedAudioId,
    videosForSidebar,
    audiosForSidebar,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
  });

  const { adReviewFocusTask, adReviewResultsMode, selectedSidebarNode } =
    resolveAdReviewSidebarContext({
      mode: appSettings.mode,
      adReviewFocusTaskId,
      queueTasks: manageBindings.manageAdReview.queueTasks,
      packageByIdEffective,
      sidebarNodeById,
      selectedSidebarNodeId,
      imageTreeForSidebar,
    });
  const adReviewGroupByPackageRows = shouldGroupAdReviewByPackageRows(
    adReviewResultsMode,
    selectedSidebarNode,
  );

  const nodeBrowseMode =
    appSettings.mode === "image" &&
    !vectorResultsActive &&
    !metadataManageMode &&
    !adReviewResultsMode &&
    Boolean(
      selectedSidebarNode &&
      selectedSidebarNode.imageNodeType === "folder" &&
      selectedSidebarNode.children.length > 0,
    );

  const canWarmupNodeBrowseCoverThumbnails =
    !importBusy &&
    !(backendRead.library?.loading ?? false) &&
    !(backendRead.sidebar?.loading ?? false) &&
    !(backendRead.page?.loading ?? false) &&
    !(backendRead.metadata?.loading ?? false);

  const nodeBrowseCoverThumbnailLocators = useMemo(() => {
    if (
      !nodeBrowseMode ||
      !canWarmupNodeBrowseCoverThumbnails ||
      !selectedSidebarNode
    ) {
      return [];
    }

    const next: Array<{
      sourceId: string;
      imageId: string;
      locator: MediaLocator;
    }> = [];
    const seenImageIds = new Set<string>();

    for (const child of selectedSidebarNode.children) {
      if (next.length >= NODE_BROWSE_WARMUP_MAX_TARGETS) {
        break;
      }

      const sourceId = child.coverSourceId?.trim() ?? "";
      const imageId = child.coverImageId?.trim() ?? "";
      if (!sourceId || !imageId || seenImageIds.has(imageId)) {
        continue;
      }

      const source = packageByIdEffective.get(sourceId);
      if (!source || source.sourceCover?.coverImagePath) {
        continue;
      }

      const image = source.images.find(
        (item) => item.id === imageId && !item.hidden,
      );
      if (!image) {
        continue;
      }

      seenImageIds.add(imageId);
      next.push({
        sourceId,
        imageId,
        locator: image.mediaLocator,
      });
    }

    return next;
  }, [
    canWarmupNodeBrowseCoverThumbnails,
    nodeBrowseMode,
    packageByIdEffective,
    selectedSidebarNode,
  ]);

  const { refsInPageBase } = resolveAdReviewPageDerivations({
    adReviewResultsMode,
    orderedRootScopedImageRefs,
    packageByIdEffective,
    adReviewFocusTask,
    selectedSidebarNode,
    pagedPageSize,
    thumbnailColumns,
    adReviewGroupByPackageRows,
    adReviewPageIndex,
    normalizedPageIndexEffective,
    visibleImageRefs,
    refsInPageEffective,
    pageStartEffective,
    imageTotalPagesEffective,
  });

  const refsInPageForResolve = resolveRefsInPageForDisplay(refsInPageBase, {
    manageMode,
    hideUncheckedNonChecked: false,
    imageCheckedIdSet,
    packageByIdEffective,
  });

  const metadataWriteBindings = useMetadataWriteBindings({
    metadataManageMode,
    backendWrite: manageBindings.backendWrite,
    packageById: packageByIdEffective,
    videoById: videoByIdEffective,
    audioById: audioByIdEffective,
    metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    focusedAudioId: focusedAudio?.id ?? null,
    sidebarCheckedNodeIds,
    sidebarNodeById,
    setManageOperationHint,
  });

  const {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    videoUrlById,
    audioUrlById,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
  } = useResolvedMediaState({
    repository: mediaRepository,
    benchSettings,
    maxConcurrent: appSettings.thumbnailResolveConcurrency,
    importBusy,
    actualCellWidth,
    actualMediaHeight,
    thumbnailQuality: appSettings.thumbnailQuality,
    thumbnailWidth: appSettings.thumbnailWidth,
    thumbnailGenerationConcurrency: appSettings.thumbnailGenerationConcurrency,
    packageById: packageByIdEffective,
    focusedImage,
    metadataImage: metadataImageEffective,
    focusedRef,
    orderedRootScopedImageRefs,
    fullscreenActive,
    fullscreenPrefetchRadius: appSettings.fullscreenPrefetchRadius,
    fullscreenResamplingEnabled: appSettings.fullscreenResamplingEnabled,
    fullscreenUpsamplingKernel: appSettings.fullscreenUpsamplingKernel,
    fullscreenDownsamplingKernel: appSettings.fullscreenDownsamplingKernel,
    showNamesOnly,
    refsInPage: refsInPageForResolve,
    visibleImageRefs,
    normalizedPageIndex: normalizedPageIndexEffective,
    imageTotalPages: imageTotalPagesEffective,
    pagedPageSize,
    thumbnailWarmupRadius: appSettings.thumbnailWarmupRadius,
    thumbnailWarmupConcurrency: appSettings.thumbnailWarmupConcurrency,
    focusedVideo,
    focusedAudio,
    focusedVideoCoverImageLocator,
    nodeBrowseCoverThumbnailLocators,
    sourceCoverLocators: scopedImageSourcesEffective
      .map((source) => {
        const locator = buildCoverImageLocator(
          source.sourceCover?.coverImagePath ?? null,
        );
        if (!locator) {
          return null;
        }
        return {
          sourceId: source.id,
          locator,
        };
      })
      .filter(
        (
          item,
        ): item is {
          sourceId: string;
          locator: NonNullable<ReturnType<typeof buildCoverImageLocator>>;
        } => Boolean(item),
      ),
  });

  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [subtitleOptions, setSubtitleOptions] = useState<VideoSubtitleOption[]>(
    [],
  );
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(
    null,
  );
  const [selectedSubtitleLocator, setSelectedSubtitleLocator] =
    useState<MediaLocator | null>(null);
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null);
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleMessage, setSubtitleMessage] = useState<string | null>(null);
  const [subtitleReloadNonce, setSubtitleReloadNonce] = useState(0);
  const [manualSubtitleOverride, setManualSubtitleOverride] = useState(false);
  const [autoLoadAttemptedRef] = useState(() => ({
    current: new Set<string>(),
  }));
  const subtitleOptionsRef = useRef<VideoSubtitleOption[]>([]);
  const [mainVideoElement, setMainVideoElement] =
    useState<HTMLVideoElement | null>(null);
  const [fullscreenVideoElement, setFullscreenVideoElement] =
    useState<HTMLVideoElement | null>(null);

  const subtitleModelDir = (appSettings.subtitleModelDir ?? "").trim();
  const subtitleModelId = FIXED_SUBTITLE_MODEL_ID;
  const autoSubtitleConfigured =
    appSettings.subtitleFeatureEnabled && subtitleModelDir.length > 0;
  const autoSubtitleApiAvailable =
    typeof mediaRepository.startSubtitleSession === "function" &&
    typeof mediaRepository.stopSubtitleSession === "function" &&
    typeof mediaRepository.resetSubtitleSession === "function" &&
    typeof mediaRepository.flushSubtitleSession === "function" &&
    typeof mediaRepository.pushSubtitleAudio === "function";
  const autoSubtitleActive =
    isVideoMode && autoSubtitleConfigured && autoSubtitleApiAvailable;
  const autoSubtitleRunning = autoSubtitleActive && !manualSubtitleOverride;

  const activeVideoElement = fullscreenActive
    ? fullscreenVideoElement
    : mainVideoElement;
  const liveSubtitle = useLiveSubtitles({
    enabled: autoSubtitleRunning,
    videoElement: activeVideoElement,
    videoPath: focusedVideoEffective?.absolutePath ?? null,
    currentTimeSec: Math.max(0, videoTime),
    modelDir: subtitleModelDir,
    modelId: subtitleModelId,
    providerPreference: "cpu",
    language: appSettings.subtitleLanguage,
    validPlaybackRateThreshold: appSettings.subtitleValidPlaybackRateThreshold,
    renderMode: appSettings.subtitleRenderMode,
    advancedOptions: {
      vad: {
        preset: appSettings.subtitleAdvancedVadPreset,
        threshold: appSettings.subtitleAdvancedVadThreshold,
        minSilenceSec: appSettings.subtitleAdvancedVadMinSilenceSec,
        minSpeechSec: appSettings.subtitleAdvancedVadMinSpeechSec,
        maxSpeechSec: appSettings.subtitleAdvancedVadMaxSpeechSec,
      },
      speaker: {
        similarityThreshold: appSettings.subtitleAdvancedSpeakerThreshold,
      },
    },
    repository: mediaRepository,
  });
  const autoSubtitleUiMessage = toAutoSubtitleUiMessage(
    liveSubtitle.message,
    t,
  );
  const subtitleOverlayStyle = buildSubtitleOverlayStyle(appSettings);
  const configuredSubtitleLanguage = (appSettings.subtitleLanguage ?? "auto")
    .trim()
    .toLowerCase();
  const autoSubtitleStatusMessage = autoSubtitleUiMessage
    ? autoSubtitleUiMessage
    : configuredSubtitleLanguage !== "auto"
      ? t("ui.media.autoSubtitleUsingLanguage", {
          language: toAutoSubtitleLanguageLabel(configuredSubtitleLanguage, t),
        })
      : t("ui.media.autoSubtitleDetectingLanguage", {
          language: toAutoSubtitleLanguageLabel(
            liveSubtitle.detectedLanguage,
            t,
          ),
        });

  const refreshSubtitleOptions = useCallback(() => {
    setSubtitleReloadNonce((value) => value + 1);
  }, []);
  const subtitleSelectionByVideoId = appSettings.subtitleSelectionByVideoId;
  const subtitleSelectionByVideoIdRef = useRef(subtitleSelectionByVideoId);

  const selectSubtitleById = useCallback(
    async (subtitleId: string, sourceOptions?: VideoSubtitleOption[]) => {
      if (subtitleId === AUTO_SUBTITLE_ID) {
        setManualSubtitleOverride(false);
        setSelectedSubtitleId(AUTO_SUBTITLE_ID);
        setSelectedSubtitleLocator(null);
        setSubtitleTrackUrl(null);
        setSubtitleVisible(true);
        if (focusedVideoEffective?.id) {
          const currentMap = subtitleSelectionByVideoIdRef.current;
          const current = currentMap[focusedVideoEffective.id] ?? "";
          if (current !== AUTO_SUBTITLE_ID) {
            appSettings.updateSettings({
              subtitleSelectionByVideoId: {
                ...currentMap,
                [focusedVideoEffective.id]: AUTO_SUBTITLE_ID,
              },
            });
          }
        }
        return;
      }

      const option = (sourceOptions ?? subtitleOptionsRef.current).find(
        (item) => item.id === subtitleId,
      );
      if (!option) {
        return;
      }

      setSubtitleLoading(true);
      setSubtitleMessage(null);
      try {
        let locator = option.locator;
        if (option.format !== "vtt") {
          if (!mediaRepository.prepareSubtitleTrack) {
            throw new Error(t("ui.media.subtitleConverterUnsupported"));
          }
          const prepared = await mediaRepository.prepareSubtitleTrack({
            subtitle_id: option.id,
            format: option.format,
            locator: toLocatorDto(locator),
          });
          locator =
            prepared.locator.kind === "filesystem"
              ? {
                  kind: "filesystem",
                  absolutePath: prepared.locator.absolute_path,
                  extension: prepared.locator.extension,
                  mediaType: prepared.locator.media_type,
                  mimeType: prepared.locator.mime_type,
                }
              : {
                  kind: "archive-entry",
                  archivePath: prepared.locator.archive_path,
                  archiveFormat: prepared.locator.archive_format,
                  entryName: prepared.locator.entry_name,
                  extension: prepared.locator.extension,
                  mediaType: prepared.locator.media_type,
                  mimeType: prepared.locator.mime_type,
                };
        }

        setManualSubtitleOverride(true);
        setSelectedSubtitleId(option.id);
        setSelectedSubtitleLocator(locator);
        setSubtitleVisible(true);
        if (focusedVideoEffective?.id) {
          const currentMap = subtitleSelectionByVideoIdRef.current;
          const current = currentMap[focusedVideoEffective.id] ?? "";
          if (current !== option.id) {
            appSettings.updateSettings({
              subtitleSelectionByVideoId: {
                ...currentMap,
                [focusedVideoEffective.id]: option.id,
              },
            });
          }
        }
      } catch (error: unknown) {
        console.error("[Subtitle] Failed to load subtitle:", error);
        setSubtitleMessage(
          t("ui.media.subtitleSelectFailed", {
            message: toErrorDetailWithCode(error, t),
          }),
        );
        setSubtitleVisible(false);
      } finally {
        setSubtitleLoading(false);
      }
    },
    [appSettings, focusedVideoEffective?.id, mediaRepository, t],
  );

  useEffect(() => {
    subtitleSelectionByVideoIdRef.current = subtitleSelectionByVideoId;
  }, [subtitleSelectionByVideoId]);

  useEffect(() => {
    subtitleOptionsRef.current = subtitleOptions;
  }, [subtitleOptions]);

  const clearPersistedSubtitleSelection = useCallback(
    (videoId: string) => {
      const currentMap = subtitleSelectionByVideoIdRef.current;
      if (!(videoId in currentMap)) {
        return;
      }
      const next = { ...currentMap };
      delete next[videoId];
      appSettings.updateSettings({ subtitleSelectionByVideoId: next });
    },
    [appSettings],
  );

  useEffect(() => {
    // 检查持久化选择，如果是自动字幕则不设置 override
    const videoId = focusedVideoEffective?.id;
    if (!videoId) {
      setManualSubtitleOverride(false);
      return;
    }
    const persistedSubtitleId =
      subtitleSelectionByVideoIdRef.current[videoId] ?? null;
    if (persistedSubtitleId === AUTO_SUBTITLE_ID) {
      setManualSubtitleOverride(false);
    } else if (persistedSubtitleId) {
      setManualSubtitleOverride(true);
    } else {
      setManualSubtitleOverride(false);
    }
  }, [focusedVideoEffective?.id]);

  useEffect(() => {
    if (!autoSubtitleActive) {
      return;
    }
    setSubtitleVisible(true);
    // 只清理手动字幕的状态，不要清除 selectedSubtitleId（可能是 AUTO_SUBTITLE_ID）
    setSelectedSubtitleLocator(null);
    setSubtitleTrackUrl(null);
  }, [autoSubtitleActive]);

  useEffect(() => {
    const api = mediaRepository.listVideoSubtitles;
    const apiSync = syncMediaRepository?.listVideoSubtitlesSync;
    const videoId = isVideoMode ? (focusedVideoEffective?.id ?? null) : null;
    if (!isVideoMode || !videoId || (!api && !apiSync)) {
      setSubtitleOptions((previous) => (previous.length === 0 ? previous : []));
      setSelectedSubtitleId(null);
      setSelectedSubtitleLocator(null);
      setSubtitleTrackUrl(null);
      setSubtitleVisible(false);
      setSubtitleLoading(false);
      setSubtitleMessage(null);
      return;
    }

    if (isSynchronousSubtitleMode && apiSync) {
      const response = apiSync({ video_id: videoId });
      const options = response.subtitles.map((item) => ({
        id: item.id,
        label: item.label,
        format: item.format,
        locator: {
          kind: item.locator.kind,
          ...(item.locator.kind === "filesystem"
            ? {
                absolutePath: item.locator.absolute_path,
                extension: item.locator.extension,
                mediaType: item.locator.media_type,
                mimeType: item.locator.mime_type,
              }
            : {
                archivePath: item.locator.archive_path,
                archiveFormat: item.locator.archive_format,
                entryName: item.locator.entry_name,
                extension: item.locator.extension,
                mediaType: item.locator.media_type,
                mimeType: item.locator.mime_type,
              }),
        } as MediaLocator,
      }));
      // 如果自动字幕可用，添加自动字幕选项
      const finalOptions = autoSubtitleActive
        ? [
            {
              id: AUTO_SUBTITLE_ID,
              label: t("ui.media.autoSubtitleOption"),
              format: "vtt" as const,
              locator: null as unknown as MediaLocator, // 自动字幕不需要 locator
            },
            ...options,
          ]
        : options;
      setSubtitleOptions(finalOptions);
      const persistedSubtitleId =
        subtitleSelectionByVideoIdRef.current[videoId] ?? null;
      const autoLoadKey = `${videoId}:${persistedSubtitleId}`;

      // 不要在用户刚选择自动字幕后立即自动加载手动字幕
      const currentlySelectedIsAuto = selectedSubtitleId === AUTO_SUBTITLE_ID;
      if (
        persistedSubtitleId &&
        finalOptions.some((item) => item.id === persistedSubtitleId) &&
        !autoSubtitleRunning &&
        !currentlySelectedIsAuto
      ) {
        setSelectedSubtitleId(persistedSubtitleId);
        if (!autoLoadAttemptedRef.current.has(autoLoadKey)) {
          autoLoadAttemptedRef.current.add(autoLoadKey);
          void selectSubtitleById(persistedSubtitleId, finalOptions);
        }
      } else if (
        persistedSubtitleId &&
        !finalOptions.some((item) => item.id === persistedSubtitleId)
      ) {
        clearPersistedSubtitleSelection(videoId);
        setSelectedSubtitleId(null);
      }
      if (finalOptions.length === 0) {
        setSubtitleVisible(false);
        setSubtitleMessage(t("ui.media.subtitleNotFoundInDirectory"));
      }
      setSubtitleLoading(false);
      return;
    }

    if (!api) {
      setSubtitleOptions((previous) => (previous.length === 0 ? previous : []));
      setSelectedSubtitleId(null);
      setSelectedSubtitleLocator(null);
      setSubtitleTrackUrl(null);
      setSubtitleVisible(false);
      setSubtitleLoading(false);
      setSubtitleMessage(null);
      return;
    }

    let active = true;
    // 不要重置 subtitleVisible，保持用户的选择
    // setSelectedSubtitleId(null);
    // setSelectedSubtitleLocator(null);
    // setSubtitleTrackUrl(null);
    // setSubtitleVisible(false);
    setSubtitleLoading(true);
    setSubtitleMessage(null);

    void api({ video_id: videoId })
      .then((response) => {
        if (!active) {
          return;
        }
        const options = response.subtitles.map((item) => ({
          id: item.id,
          label: item.label,
          format: item.format,
          locator: {
            kind: item.locator.kind,
            ...(item.locator.kind === "filesystem"
              ? {
                  absolutePath: item.locator.absolute_path,
                  extension: item.locator.extension,
                  mediaType: item.locator.media_type,
                  mimeType: item.locator.mime_type,
                }
              : {
                  archivePath: item.locator.archive_path,
                  archiveFormat: item.locator.archive_format,
                  entryName: item.locator.entry_name,
                  extension: item.locator.extension,
                  mediaType: item.locator.media_type,
                  mimeType: item.locator.mime_type,
                }),
          } as MediaLocator,
        }));
        // 如果自动字幕可用，添加自动字幕选项
        const finalOptions = autoSubtitleActive
          ? [
              {
                id: AUTO_SUBTITLE_ID,
                label: t("ui.media.autoSubtitleOption"),
                format: "vtt" as const,
                locator: null as unknown as MediaLocator, // 自动字幕不需要 locator
              },
              ...options,
            ]
          : options;
        setSubtitleOptions(finalOptions);
        const persistedSubtitleId =
          subtitleSelectionByVideoIdRef.current[videoId] ?? null;
        const autoLoadKey = `${videoId}:${persistedSubtitleId}`;

        // 不要在用户刚选择自动字幕后立即自动加载手动字幕
        const currentlySelectedIsAuto = selectedSubtitleId === AUTO_SUBTITLE_ID;
        if (
          persistedSubtitleId &&
          finalOptions.some((item) => item.id === persistedSubtitleId) &&
          !autoSubtitleRunning &&
          !currentlySelectedIsAuto
        ) {
          setSelectedSubtitleId(persistedSubtitleId);
          if (!autoLoadAttemptedRef.current.has(autoLoadKey)) {
            autoLoadAttemptedRef.current.add(autoLoadKey);
            void selectSubtitleById(persistedSubtitleId, finalOptions);
          }
        } else if (
          persistedSubtitleId &&
          !finalOptions.some((item) => item.id === persistedSubtitleId)
        ) {
          clearPersistedSubtitleSelection(videoId);
          setSelectedSubtitleId(null);
        }
        if (finalOptions.length === 0) {
          setSubtitleVisible(false);
          setSubtitleMessage(t("ui.media.subtitleNotFoundInDirectory"));
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const message = toErrorDetailWithCode(error, t);
        setSubtitleOptions((previous) =>
          previous.length === 0 ? previous : [],
        );
        setSelectedSubtitleId(null);
        setSelectedSubtitleLocator(null);
        setSubtitleTrackUrl(null);
        setSubtitleVisible(false);
        setSubtitleMessage(t("ui.media.subtitleLoadFailed", { message }));
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setSubtitleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    focusedVideoEffective?.id,
    selectedSubtitleId,
    isSynchronousSubtitleMode,
    isVideoMode,
    mediaRepository,
    autoSubtitleActive,
    autoSubtitleRunning,
    subtitleReloadNonce,
    syncMediaRepository,
    clearPersistedSubtitleSelection,
    selectSubtitleById,
    autoLoadAttemptedRef,
    t,
  ]);

  useEffect(() => {
    if (
      autoSubtitleRunning ||
      !isVideoMode ||
      !focusedVideoEffective?.id ||
      !selectedSubtitleLocator
    ) {
      setSubtitleTrackUrl(null);
      return;
    }

    if (isSynchronousSubtitleMode && syncMediaRepository) {
      const response = syncMediaRepository.resolveMediaResourceSync({
        locator: toLocatorDto(selectedSubtitleLocator),
        preferred_variant: "original",
      });
      setSubtitleTrackUrl(response.resource_url);
      return;
    }

    let active = true;
    void mediaRepository
      .resolveMediaResource({
        locator: toLocatorDto(selectedSubtitleLocator),
        preferred_variant: "original",
      })
      .then((response) => {
        if (!active) {
          return;
        }
        setSubtitleTrackUrl(response.resource_url);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        console.error("[Subtitle Track] Failed to resolve track URL:", error);
        setSubtitleTrackUrl(null);
        setSubtitleMessage(
          t("ui.media.subtitleResolveFailed", {
            message: toErrorDetailWithCode(error, t),
          }),
        );
      });

    return () => {
      active = false;
    };
  }, [
    focusedVideoEffective?.id,
    autoSubtitleRunning,
    isSynchronousSubtitleMode,
    isVideoMode,
    mediaRepository,
    selectedSubtitleLocator,
    syncMediaRepository,
    t,
  ]);

  return {
    backendPageSnapshot,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedAudio,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
    metadataWriteBindings,
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    videoUrlById,
    audioUrlById,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
    subtitleVisible,
    subtitleOptions,
    selectedSubtitleId,
    subtitleTrackUrl: autoSubtitleRunning ? null : subtitleTrackUrl,
    subtitleLoading: autoSubtitleRunning
      ? liveSubtitle.loading
      : subtitleLoading,
    subtitleMessage: autoSubtitleRunning
      ? autoSubtitleStatusMessage
      : subtitleMessage,
    autoSubtitleActive: autoSubtitleRunning,
    liveSubtitleText: liveSubtitle.activeText,
    subtitleOverlayStyle,
    bindMainVideoElement: setMainVideoElement,
    bindFullscreenVideoElement: setFullscreenVideoElement,
    setSubtitleVisible,
    selectSubtitleById,
    refreshSubtitleOptions,
  };
}

export type AppDisplayResourcesResult = ReturnType<
  typeof useAppDisplayResources
>;
