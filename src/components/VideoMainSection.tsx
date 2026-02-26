import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { MainUiIcon } from "./MainUiIcon";
import { MusicControlIcon } from "./MusicControlIcon";
import { SkeuoRunway } from "./primitives/SkeuoRunway";
import SubtitleCleanupPanel from "./subtitles/SubtitleCleanupPanel";
import SubtitleOverlay from "./subtitles/SubtitleOverlay";
import { ToolbarTitleMarquee } from "./ToolbarTitleMarquee";
import { VideoControlIcon } from "./VideoControlIcon";
import { useMediaPreloadWindow } from "./useMediaPreloadWindow";
import { useVideoSeekDraft } from "./useVideoSeekDraft";
import { useI18n } from "../i18n/useI18n";
import type { VideoItem } from "../types";
import type { VideoFitMode } from "../features/media/videoFitMode";
import type {
  ReadManageSubtitleCleanupTaskResponseDto,
  RunManageSubtitleCleanupResponseDto,
  SaveManageSubtitleCleanupResponseDto,
  StartManageSubtitleCleanupResponseDto,
} from "../contracts/backend";
import { clamp, formatSeconds } from "../utils/ui";

type VideoPopoverKey = "volume" | "subtitle" | "speed" | "fit" | "playlist";

interface VideoMainSectionProps {
  manageMode: boolean;
  metadataManageMode: boolean;
  sidebarSelectedCount: number;
  imageSelectedCount: number;
  activeSelectionScope: "sidebar" | "image" | null;
  pendingManageAction: boolean;
  manageOperationHint: string | null;
  canManageDelete: boolean;
  canManageMoveNodes?: boolean;
  canManageAddToPlaylist?: boolean;
  canManageHide: boolean;
  canManageUnhide: boolean;
  onManageDelete: () => void;
  onManageRename?: () => void;
  onManageGroup?: () => void;
  onManageMove?: () => void;
  onManageAddToPlaylist?: () => void;
  onManageHide: () => void;
  onManageUnhide: () => void;
  onClearManageSelection: () => void;
  metadataPending: boolean;
  onMetadataSyncName: () => void;
  canJumpToManga: boolean;
  canJumpToMusic: boolean;
  onJumpToManga: () => void;
  onJumpToMusic: () => void;
  durationSec: number;
  videoTime: number;
  videoPlaying: boolean;
  videoRate: number;
  videoVolume: number;
  videoMuted: boolean;
  videoFitMode: VideoFitMode;
  videoLoopMode: "single" | "list";
  videoLoopModeLabel: string;
  mediaPreloadMemoryBudgetMb: number;
  videoPreloadItems: Array<{ id: string; src: string; sizeMb: number }>;
  videoSourceUrl: string | null;
  popoverDebugPinned: boolean;
  subtitleTrackUrl: string | null;
  subtitleVisible: boolean;
  subtitleLoading: boolean;
  subtitleMessage: string | null;
  subtitleOptions: Array<{
    id: string;
    label: string;
    format: "vtt" | "srt" | "ass" | "ssa";
  }>;
  selectedSubtitleId: string | null;
  autoSubtitleActive: boolean;
  liveSubtitleText: string | null;
  subtitleOverlayStyle: CSSProperties;
  bindVideoElement: (element: HTMLVideoElement | null) => void;
  onRequestMainFocus: () => void;
  fullscreenActive: boolean;
  coverImageUrl: string | null;
  focusedVideo: VideoItem | null;
  subtitleCleanupVideoId: string | null;
  subtitleCleanupLlmEndpoint: string;
  subtitleCleanupLlmModel: string;
  subtitleCleanupLlmPrompt: string;
  startSubtitleCleanup?: (request: {
    video_id: string;
  }) => Promise<StartManageSubtitleCleanupResponseDto>;
  readSubtitleCleanupTask?: (request: {
    task_id: string;
  }) => Promise<ReadManageSubtitleCleanupTaskResponseDto>;
  runSubtitleCleanup?: (request: {
    task_id: string;
    llm_endpoint: string;
    llm_model: string;
    llm_prompt?: string;
  }) => Promise<RunManageSubtitleCleanupResponseDto>;
  saveSubtitleCleanup?: (request: {
    task_id: string;
    cleaned_subtitle_text: string;
  }) => Promise<SaveManageSubtitleCleanupResponseDto>;
  onSubtitleCleanupSaved: () => void;
  onSubtitleCleanupLlmEndpointChange: (value: string) => void;
  onSubtitleCleanupLlmModelChange: (value: string) => void;
  active: boolean;
  onTogglePlay: () => void;
  onPrevVideo: () => void;
  onNextVideo: () => void;
  onVideoEnded: () => void;
  onSeekVideo: (time: number) => void;
  onVideoTimeUpdate: (time: number) => void;
  onVideoDurationDetected: (duration: number) => void;
  onToggleMute: () => void;
  onToggleSubtitle: () => void;
  onSelectSubtitle: (subtitleId: string) => void;
  onChangeVolume: (volume: number) => void;
  onChangeRate: (rate: number) => void;
  onCycleVideoLoopMode: () => void;
  onCycleVideoFitMode: () => void;
  onSetVideoFitMode: (mode: VideoFitMode) => void;
  onSaveCover: () => void;
  onEnterFullscreen: () => void;
}

function VideoMainSection({
  manageMode,
  metadataManageMode,
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pendingManageAction,
  manageOperationHint,
  canManageDelete,
  canManageMoveNodes = false,
  canManageAddToPlaylist = false,
  onManageDelete,
  onManageRename = () => undefined,
  onManageGroup = () => undefined,
  onManageAddToPlaylist = () => undefined,
  metadataPending,
  onMetadataSyncName,
  canJumpToManga,
  canJumpToMusic,
  onJumpToManga,
  onJumpToMusic,
  durationSec,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
  videoLoopMode,
  videoLoopModeLabel,
  mediaPreloadMemoryBudgetMb,
  videoPreloadItems,
  videoSourceUrl,
  popoverDebugPinned,
  subtitleTrackUrl,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  autoSubtitleActive,
  liveSubtitleText,
  subtitleOverlayStyle,
  bindVideoElement,
  onRequestMainFocus,
  fullscreenActive,
  coverImageUrl,
  focusedVideo,
  subtitleCleanupVideoId,
  subtitleCleanupLlmEndpoint,
  subtitleCleanupLlmModel,
  subtitleCleanupLlmPrompt,
  startSubtitleCleanup,
  readSubtitleCleanupTask,
  runSubtitleCleanup,
  saveSubtitleCleanup,
  onSubtitleCleanupSaved,
  onSubtitleCleanupLlmEndpointChange,
  onSubtitleCleanupLlmModelChange,
  active,
  onTogglePlay,
  onPrevVideo,
  onNextVideo,
  onVideoEnded,
  onSeekVideo,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onToggleMute,
  onToggleSubtitle,
  onSelectSubtitle,
  onChangeVolume,
  onChangeRate,
  onCycleVideoLoopMode,
  onCycleVideoFitMode,
  onSetVideoFitMode,
  onSaveCover,
  onEnterFullscreen,
}: VideoMainSectionProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previousVideoTimePropRef = useRef(videoTime);
  const [hasPlayedCurrentSource, setHasPlayedCurrentSource] = useState(false);
  const [hasSeekPreviewCurrentSource, setHasSeekPreviewCurrentSource] =
    useState(false);
  const [openPopover, setOpenPopover] = useState<VideoPopoverKey | null>(null);
  const [subtitleCleanupPanelOpen, setSubtitleCleanupPanelOpen] =
    useState(false);
  const [manualSubtitleText, setManualSubtitleText] = useState<string | null>(
    null,
  );
  const clampedTime =
    durationSec > 0
      ? Math.min(Math.max(0, videoTime), durationSec)
      : Math.max(0, videoTime);
  const {
    displayTime,
    progressPercent,
    volumePercent,
    setSeekDraftTime,
    commitSeekDraft,
    commitSeekDraftAndBlur,
    previewSeekDuringDrag,
    resetSeekDraft,
  } = useVideoSeekDraft({
    durationSec,
    currentTime: clampedTime,
    videoMuted,
    videoVolume,
    onSeekVideo,
  });
  const showVideoFrame = Boolean(
    videoSourceUrl &&
    (videoPlaying ||
      hasPlayedCurrentSource ||
      hasSeekPreviewCurrentSource ||
      !coverImageUrl),
  );
  const showCover = Boolean(videoSourceUrl && !showVideoFrame && coverImageUrl);
  const videoScreenBackground =
    "var(--mpx-screen-bg, var(--mpx-video-screen-bg, var(--mpx-bg-elevated)))";
  const videoObjectFit = videoFitMode === "original" ? "none" : videoFitMode;
  const subtitleToggleLabel = subtitleVisible
    ? t("a11y.media.subtitleOn")
    : t("a11y.media.subtitleOff");
  const subtitlePanelContentText = subtitleMessage ? subtitleMessage : null;
  const subtitlePanelHasContent =
    subtitleLoading ||
    Boolean(subtitlePanelContentText) ||
    subtitleOptions.length > 0;
  const subtitleOverlayText = autoSubtitleActive
    ? liveSubtitleText
    : manualSubtitleText;

  const videoFitLabel =
    videoFitMode === "fill"
      ? t("a11y.media.videoFitFill")
      : videoFitMode === "original"
        ? t("a11y.media.videoFitOriginal")
        : t("a11y.media.videoFitContain");
  const toolbarAuthor = focusedVideo?.author.trim() ?? "";
  const toolbarVideoSummary = focusedVideo
    ? [
        focusedVideo.workTitle.trim() || focusedVideo.fileName,
        toolbarAuthor && toolbarAuthor !== t("ui.common.unknown")
          ? `[${toolbarAuthor}]`
          : null,
        `${focusedVideo.width}x${focusedVideo.height}`,
        `${focusedVideo.sizeMb}MB`,
      ]
        .filter((value): value is string => Boolean(value))
        .join("    ")
    : t("a11y.media.videoPreview");
  const manageSummary =
    activeSelectionScope === "sidebar"
      ? t("a11y.manage.selectedSidebarNodes", { count: sidebarSelectedCount })
      : activeSelectionScope === "image"
        ? t("a11y.manage.selectedMediaItems", { count: imageSelectedCount })
        : t("a11y.manage.noSelection");
  const hasAnyManageSelection =
    sidebarSelectedCount > 0 || imageSelectedCount > 0;

  const closePopover = () => {
    if (popoverDebugPinned) {
      return;
    }
    setOpenPopover(null);
  };

  const handleStopPlayback = () => {
    onSeekVideo(0);
    if (videoPlaying) {
      onTogglePlay();
    }
  };

  const handleTogglePlayback = () => {
    if (videoPlaying) {
      const currentTime = videoRef.current?.currentTime;
      if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
        onVideoTimeUpdate(currentTime);
      }
    }
    onTogglePlay();
  };

  const handleVideoElementRef = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      bindVideoElement(element);
    },
    [bindVideoElement],
  );

  useMediaPreloadWindow({
    mediaType: "video",
    items: videoPreloadItems,
    activeId: focusedVideo?.id ?? null,
    budgetMb: mediaPreloadMemoryBudgetMb,
    lookBehind: 1,
    lookAhead: 2,
  });

  useEffect(() => {
    setHasPlayedCurrentSource(false);
    setHasSeekPreviewCurrentSource(false);
    resetSeekDraft();
  }, [resetSeekDraft, videoSourceUrl]);

  useEffect(() => {
    if (videoPlaying && videoSourceUrl) {
      setHasPlayedCurrentSource(true);
    }
  }, [videoPlaying, videoSourceUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.playbackRate = clamp(videoRate, 0.1, 10);
    video.muted = videoMuted;
    video.volume = clamp(videoVolume / 100, 0, 1);

    if (!active) {
      video.pause();
      return;
    }

    if (videoPlaying) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [
    active,
    clampedTime,
    videoMuted,
    videoPlaying,
    videoRate,
    videoSourceUrl,
    videoVolume,
  ]);

  useEffect(() => {
    const previousVideoTime = previousVideoTimePropRef.current;
    previousVideoTimePropRef.current = videoTime;

    const video = videoRef.current;
    if (!video || !videoSourceUrl) {
      return;
    }

    const propJump = Math.abs(videoTime - previousVideoTime) > 0.35;
    if (!propJump) {
      return;
    }

    if (Math.abs(video.currentTime - clampedTime) <= 0.2) {
      return;
    }

    video.currentTime = clampedTime;
  }, [clampedTime, videoSourceUrl, videoTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSourceUrl) {
      return;
    }

    const tracks = video.textTracks;
    for (let index = 0; index < tracks.length; index += 1) {
      if (autoSubtitleActive || !subtitleTrackUrl || !subtitleVisible) {
        tracks[index].mode = "disabled";
      } else {
        tracks[index].mode = "hidden";
      }
    }
  }, [autoSubtitleActive, subtitleTrackUrl, subtitleVisible, videoSourceUrl]);

  useEffect(() => {
    setManualSubtitleText(null);

    const video = videoRef.current;
    if (
      !video ||
      !videoSourceUrl ||
      autoSubtitleActive ||
      !subtitleTrackUrl ||
      !subtitleVisible
    ) {
      return;
    }

    const track = video.textTracks[0];
    if (!track) {
      return;
    }

    const syncManualSubtitle = () => {
      const activeCues = track.activeCues;
      if (!activeCues || activeCues.length === 0) {
        setManualSubtitleText(null);
        return;
      }

      const lines: string[] = [];
      for (let i = 0; i < activeCues.length; i += 1) {
        const cue = activeCues[i] as VTTCue;
        const cueText = typeof cue?.text === "string" ? cue.text : "";
        const normalized = cueText
          .replace(/<[^>]+>/g, "")
          .replace(/\r?\n+/g, "\n")
          .trim();
        if (normalized) {
          lines.push(normalized);
        }
      }

      const text = lines.length > 0 ? lines.join("\n") : null;
      setManualSubtitleText(text);
    };

    syncManualSubtitle();
    track.addEventListener("cuechange", syncManualSubtitle);
    video.addEventListener("timeupdate", syncManualSubtitle);

    return () => {
      track.removeEventListener("cuechange", syncManualSubtitle);
      video.removeEventListener("timeupdate", syncManualSubtitle);
    };
  }, [autoSubtitleActive, subtitleTrackUrl, subtitleVisible, videoSourceUrl]);

  return (
    <>
      <div className="main-toolbar" data-slot="fg-main-toolbar">
        {manageMode ? (
          <>
            <span hidden data-slot="fg-main-toolbar-state-manage" />
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.media.addToPlaylist")}
                data-tooltip-label={t("tip.media.addToPlaylist")}
                disabled={!canManageAddToPlaylist || pendingManageAction}
                onClick={onManageAddToPlaylist}
              >
                <MainUiIcon name="playlistAdd" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.organize")}
                data-tooltip-label={t("tip.common.organize")}
                disabled={!canManageMoveNodes || pendingManageAction}
                onClick={onManageGroup}
              >
                <MainUiIcon name="organize" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.rename")}
                data-tooltip-label={t("tip.common.rename")}
                disabled={!hasAnyManageSelection || pendingManageAction}
                onClick={onManageRename}
              >
                <MainUiIcon name="rename" />
              </button>
              <button
                className="vector-search-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.delete")}
                data-tooltip-label={t("tip.common.delete")}
                disabled={!canManageDelete || pendingManageAction}
                onClick={onManageDelete}
              >
                <MainUiIcon name="delete" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("ui.media.subtitleCleanupTitle")}
                data-tooltip-label={t("ui.media.subtitleCleanupTitle")}
                disabled={!subtitleCleanupVideoId}
                onClick={() => setSubtitleCleanupPanelOpen(true)}
              >
                <MainUiIcon name="getMetaData" />
              </button>
              {manageOperationHint ? (
                <span className="main-toolbar-hint">{manageOperationHint}</span>
              ) : null}
            </div>
            <strong className="main-toolbar-summary" data-tooltip-label={manageSummary}>
              {manageSummary}
            </strong>
          </>
        ) : metadataManageMode ? (
          <>
            <span hidden data-slot="fg-main-toolbar-state-metadata" />
            <strong className="main-toolbar-title">
              {t("ui.header.metadataManage")}
            </strong>
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.syncName")}
                data-tooltip-label={t("tip.common.syncName")}
                disabled={metadataPending}
                onClick={onMetadataSyncName}
              >
                <MainUiIcon name="refresh" />
              </button>
              {manageOperationHint ? (
                <span className="main-toolbar-hint">{manageOperationHint}</span>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <span hidden data-slot="fg-main-toolbar-state-normal" />
            <ToolbarTitleMarquee
              className="main-toolbar-title is-video"
              text={toolbarVideoSummary}
            />
            {canJumpToManga || canJumpToMusic ? (
              <div className="toolbar-actions">
                {canJumpToManga ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t("a11y.media.manga")}
                    data-tooltip-label={t("tip.media.manga")}
                    onClick={onJumpToManga}
                  >
                    <MainUiIcon name="imageMode" />
                  </button>
                ) : null}
                {canJumpToMusic ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t("a11y.media.music")}
                    data-tooltip-label={t("tip.media.music")}
                    onClick={onJumpToMusic}
                  >
                    <MainUiIcon name="musicMode" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div
        className="video-preview"
        data-slot="fg-main-content-video-preview"
        onPointerDownCapture={onRequestMainFocus}
      >
        <div
          className="video-screen"
          data-slot="fg-main-content-video-preview-screen"
          style={{ background: videoScreenBackground }}
        >
          {videoSourceUrl ? (
            <video
              ref={handleVideoElementRef}
              className="video-screen-media"
              data-slot="fg-main-content-video-preview-media"
              style={{
                opacity: showVideoFrame ? 1 : 0,
                objectFit: videoObjectFit,
                objectPosition: "center center",
              }}
              src={videoSourceUrl}
              crossOrigin="anonymous"
              preload="metadata"
              playsInline
              onTimeUpdate={() => {
                const currentTime = videoRef.current?.currentTime ?? 0;
                if (currentTime > 0.05) {
                  setHasSeekPreviewCurrentSource(true);
                }
                onVideoTimeUpdate(currentTime);
              }}
              onLoadedMetadata={() => {
                const duration = videoRef.current?.duration ?? 0;
                if (Number.isFinite(duration) && duration > 0) {
                  onVideoDurationDetected(duration);
                }
                const restoreTime = clamp(
                  clampedTime,
                  0,
                  Number.isFinite(duration) && duration > 0
                    ? duration
                    : Math.max(0, clampedTime),
                );
                if (
                  restoreTime > 0.05 &&
                  videoRef.current &&
                  Math.abs(videoRef.current.currentTime - restoreTime) > 0.05
                ) {
                  videoRef.current.currentTime = restoreTime;
                }
                if (clampedTime <= 0 && !videoPlaying && !coverImageUrl) {
                  const video = videoRef.current;
                  if (video && video.duration > 0) {
                    video.currentTime = Math.min(0.001, video.duration);
                  }
                }
              }}
              onSeeked={() => {
                const currentTime = videoRef.current?.currentTime ?? 0;
                if (currentTime > 0.05) {
                  setHasSeekPreviewCurrentSource(true);
                }
                onVideoTimeUpdate(currentTime);
              }}
              onEnded={() => {
                onVideoEnded();
              }}
            >
              {!autoSubtitleActive && subtitleTrackUrl ? (
                <track
                  default
                  kind="subtitles"
                  label={t("ui.media.subtitleTrack")}
                  src={subtitleTrackUrl}
                />
              ) : null}
            </video>
          ) : null}

          <SubtitleOverlay
            text={subtitleOverlayText}
            visible={subtitleVisible}
            style={subtitleOverlayStyle}
          />

          {showCover && coverImageUrl ? (
            <img
              className="video-screen-cover-image"
              data-slot="fg-main-content-video-preview-cover"
              style={{
                objectFit: videoObjectFit,
                objectPosition: "center center",
              }}
              src={coverImageUrl}
              alt={t("ui.media.videoCoverAlt")}
            />
          ) : null}

          {!videoSourceUrl ? (
            <div
              className="video-screen-empty"
              data-slot="fg-main-content-video-preview-empty"
            >
              <span>{t("ui.media.noVideoSource")}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="video-controls-shell"
        data-slot="fg-main-content-video-controls"
        onPointerDownCapture={onRequestMainFocus}
      >
        <div
          className="video-controls-progress"
          data-slot="fg-main-content-video-controls-progress"
        >
          <span className="video-progress-time">{`${formatSeconds(displayTime)} / ${formatSeconds(durationSec)}`}</span>
          <SkeuoRunway
            ariaLabel={t("a11y.media.progress")}
            className="is-progress"
            fillTone="gold"
            max={durationSec}
            min={0}
            rangePercent={progressPercent}
            step={0.1}
            thumbTone="pearl"
            value={displayTime}
            onChange={(event) => {
              setHasSeekPreviewCurrentSource(true);
              const nextTime = clamp(
                Number(event.target.value),
                0,
                Math.max(0, durationSec),
              );
              setSeekDraftTime(nextTime);
              previewSeekDuringDrag(nextTime);
            }}
            onMouseUp={(event) => commitSeekDraftAndBlur(event.currentTarget)}
            onTouchEnd={(event) => commitSeekDraftAndBlur(event.currentTarget)}
            onBlur={commitSeekDraft}
            onKeyUp={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                commitSeekDraft();
              }
            }}
          />
        </div>

        <div className="video-controls-row video-controls">
          <div
            className="video-controls-group is-left mpx-skeuo-well"
            data-slot="fg-main-content-video-controls-left"
          >
            {fullscreenActive ? (
              <button
                aria-label={t("a11y.media.dualModeFullscreenOnly")}
                className="video-action-btn video-action-dual"
                data-tooltip-label={t("tip.media.dualModeInFullscreen")}
                type="button"
              >
                <VideoControlIcon name="dual" />
              </button>
            ) : null}

            <div
              className={`video-ctrl-popover ${popoverDebugPinned || openPopover === "fit" ? "is-open" : ""}`}
              onMouseEnter={() => setOpenPopover("fit")}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-fit"
                aria-expanded={popoverDebugPinned || openPopover === "fit"}
                aria-haspopup="dialog"
                className="video-action-btn video-action-fit"
                aria-label={videoFitLabel}
                data-tooltip-label={videoFitLabel}
                type="button"
                onClick={onCycleVideoFitMode}
              >
                <VideoControlIcon name="aspect" />
              </button>
              <div
                className="video-ctrl-panel is-fit"
                data-slot="fg-main-content-video-controls-fit-pop"
                hidden={!popoverDebugPinned && openPopover !== "fit"}
                id="video-main-popover-fit"
                role="dialog"
              >
                <div className="video-ctrl-panel-options">
                  {[
                    {
                      label: t("a11y.media.videoFitContain"),
                      mode: "contain" as const,
                    },
                    {
                      label: t("a11y.media.videoFitFill"),
                      mode: "fill" as const,
                    },
                    {
                      label: t("a11y.media.videoFitOriginal"),
                      mode: "original" as const,
                    },
                  ].map((option) => (
                    <button
                      aria-pressed={videoFitMode === option.mode}
                      className={`video-ctrl-panel-option ${videoFitMode === option.mode ? "is-active" : ""}`}
                      key={option.mode}
                      type="button"
                      onClick={() => {
                        onSetVideoFitMode(option.mode);
                        closePopover();
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`video-ctrl-popover ${popoverDebugPinned || openPopover === "subtitle" ? "is-open" : ""}`}
              onMouseEnter={() => {
                if (subtitlePanelHasContent) {
                  setOpenPopover("subtitle");
                }
              }}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-subtitle"
                aria-expanded={popoverDebugPinned || openPopover === "subtitle"}
                aria-haspopup="dialog"
                className="video-action-btn video-action-subtitle"
                aria-label={subtitleToggleLabel}
                data-tooltip-label={subtitleToggleLabel}
                type="button"
                onClick={onToggleSubtitle}
              >
                <VideoControlIcon name="subtitle" />
              </button>
              <div
                className="video-ctrl-panel"
                data-slot="fg-main-content-video-controls-subtitle-pop"
                hidden={
                  !popoverDebugPinned &&
                  (openPopover !== "subtitle" || !subtitlePanelHasContent)
                }
                id="video-main-popover-subtitle"
                role="dialog"
              >
                {subtitleLoading ? (
                  <span className="video-ctrl-panel-note">
                    {t("ui.common.loading")}
                  </span>
                ) : null}
                {subtitlePanelContentText ? (
                  <span className="video-ctrl-panel-note">
                    {subtitlePanelContentText}
                  </span>
                ) : null}
                <div className="video-ctrl-panel-options">
                  {subtitleOptions.map((option) => (
                    <button
                      aria-pressed={selectedSubtitleId === option.id}
                      className={`video-ctrl-panel-option ${selectedSubtitleId === option.id ? "is-active" : ""}`}
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onSelectSubtitle(option.id);
                        closePopover();
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`video-ctrl-popover ${popoverDebugPinned || openPopover === "speed" ? "is-open" : ""}`}
              onMouseEnter={() => setOpenPopover("speed")}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-speed"
                aria-expanded={popoverDebugPinned || openPopover === "speed"}
                aria-haspopup="dialog"
                className="video-action-btn video-action-speed"
                aria-label={t("a11y.media.playbackRate", {
                  rate: videoRate.toFixed(2),
                })}
                data-tooltip-label={t("a11y.media.playbackRate", {
                  rate: videoRate.toFixed(2),
                })}
                type="button"
              >
                <VideoControlIcon name="speed" />
              </button>
              <div
                className="video-ctrl-panel is-speed"
                data-slot="fg-main-content-video-controls-speed-pop"
                hidden={!popoverDebugPinned && openPopover !== "speed"}
                id="video-main-popover-speed"
                role="dialog"
              >
                <div className="video-ctrl-panel-options">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                    (rate) => (
                      <button
                        aria-pressed={Math.abs(videoRate - rate) < 0.01}
                        className={`video-ctrl-panel-option ${Math.abs(videoRate - rate) < 0.01 ? "is-active" : ""}`}
                        key={rate}
                        type="button"
                        onClick={() => {
                          onChangeRate(rate);
                          closePopover();
                        }}
                      >
                        {`${rate}x`}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            <button
              aria-label={t("a11y.media.hotkeyFullscreen")}
              className="video-action-btn video-action-fullscreen video-fullscreen-btn"
              data-tooltip-label={t("a11y.media.hotkeyFullscreen")}
              type="button"
              onClick={onEnterFullscreen}
            >
              <VideoControlIcon name="fullscreenExpand" />
            </button>
          </div>

          <div
            className="video-controls-group is-center"
            data-slot="fg-main-content-video-controls-center"
          >
            <button
              aria-label={t("a11y.media.prev")}
              className="video-action-btn video-action-prev"
              data-tooltip-label={t("a11y.media.prev")}
              type="button"
              onClick={onPrevVideo}
            >
              <VideoControlIcon name="prev" />
            </button>
            <button
              aria-label={
                videoPlaying ? t("a11y.media.pause") : t("a11y.media.play")
              }
              className="video-action-btn video-action-play"
              data-tooltip-label={
                videoPlaying ? t("a11y.media.pause") : t("a11y.media.play")
              }
              type="button"
              onClick={handleTogglePlayback}
            >
              <VideoControlIcon name={videoPlaying ? "pause" : "play"} />
            </button>
            <button
              aria-label={t("a11y.media.stop")}
              className="video-action-btn video-action-stop"
              data-tooltip-label={t("a11y.media.stop")}
              type="button"
              onClick={handleStopPlayback}
            >
              <VideoControlIcon name="stop" />
            </button>
            <button
              aria-label={t("a11y.media.next")}
              className="video-action-btn video-action-next"
              data-tooltip-label={t("a11y.media.next")}
              type="button"
              onClick={onNextVideo}
            >
              <VideoControlIcon name="next" />
            </button>
          </div>

          <div
            className="video-controls-group is-right mpx-skeuo-well"
            data-slot="fg-main-content-video-controls-right"
          >
            <button
              aria-label={t("a11y.media.saveAsCover")}
              className="video-action-btn video-action-save-cover"
              data-tooltip-label={t("a11y.media.saveAsCover")}
              type="button"
              onClick={onSaveCover}
            >
              <VideoControlIcon name="camera" />
            </button>

            {fullscreenActive ? (
              <div
                className={`video-ctrl-popover ${popoverDebugPinned || openPopover === "playlist" ? "is-open" : ""}`}
                onMouseEnter={() => setOpenPopover("playlist")}
                onMouseLeave={closePopover}
              >
                <button
                  aria-controls="video-main-popover-playlist"
                  aria-expanded={
                    popoverDebugPinned || openPopover === "playlist"
                  }
                  aria-haspopup="dialog"
                  aria-label={t("a11y.media.playlistFullscreenOnly")}
                  className="video-action-btn video-action-playlist"
                  data-tooltip-label={t("tip.media.playlistInFullscreen")}
                  type="button"
                >
                  <VideoControlIcon name="playlist" />
                </button>
                <div
                  className="video-ctrl-panel"
                  data-slot="fg-main-content-video-controls-playlist-pop"
                  hidden={!popoverDebugPinned && openPopover !== "playlist"}
                  id="video-main-popover-playlist"
                  role="dialog"
                >
                  <span className="video-ctrl-panel-title">
                    {t("ui.media.playlist")}
                  </span>
                  <span className="video-ctrl-panel-note">
                    {t("ui.media.playlistFullscreenHint")}
                  </span>
                </div>
              </div>
            ) : null}

            <button
              aria-label={t("a11y.media.videoLoopMode", {
                label: videoLoopModeLabel,
              })}
              className="video-action-btn video-action-loop-mode"
              data-tooltip-label={t("tip.media.videoLoopMode", {
                label: videoLoopModeLabel,
              })}
              type="button"
              onClick={onCycleVideoLoopMode}
            >
              <MusicControlIcon
                className="video-action-icon"
                name={videoLoopMode === "single" ? "repeatOne" : "repeatAlbum"}
              />
            </button>

            <div
              className={`video-ctrl-popover ${popoverDebugPinned || openPopover === "volume" ? "is-open" : ""}`}
              onMouseEnter={() => setOpenPopover("volume")}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-volume"
                aria-expanded={popoverDebugPinned || openPopover === "volume"}
                aria-haspopup="dialog"
                className="video-action-btn video-action-mute"
                aria-label={
                  videoMuted ? t("a11y.media.unmute") : t("a11y.media.mute")
                }
                data-tooltip-label={
                  videoMuted ? t("a11y.media.unmute") : t("a11y.media.mute")
                }
                type="button"
                onClick={onToggleMute}
              >
                <VideoControlIcon
                  name={videoMuted ? "volumeMuted" : "volume"}
                />
              </button>
              <div
                className="video-ctrl-panel is-volume"
                data-slot="fg-main-content-video-controls-volume-pop"
                hidden={!popoverDebugPinned && openPopover !== "volume"}
                id="video-main-popover-volume"
                role="dialog"
              >
                <div className="video-ctrl-volume-axis">
                  <SkeuoRunway
                    ariaLabel={t("a11y.media.volumeSlider")}
                    className="is-volume"
                    fillTone="graphite"
                    inputClassName="video-ctrl-volume-range"
                    max={100}
                    min={0}
                    rangePercent={volumePercent}
                    step={1}
                    thumbTone="graphite"
                    value={videoMuted ? 0 : videoVolume}
                    onChange={(event) =>
                      onChangeVolume(Number(event.target.value))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SubtitleCleanupPanel
        open={subtitleCleanupPanelOpen}
        videoId={subtitleCleanupVideoId}
        videoLabel={
          focusedVideo?.workTitle?.trim() || focusedVideo?.fileName || "-"
        }
        llmEndpoint={subtitleCleanupLlmEndpoint}
        llmModel={subtitleCleanupLlmModel}
        llmPrompt={subtitleCleanupLlmPrompt}
        startSubtitleCleanup={startSubtitleCleanup}
        readSubtitleCleanupTask={readSubtitleCleanupTask}
        runSubtitleCleanup={runSubtitleCleanup}
        saveSubtitleCleanup={saveSubtitleCleanup}
        onSaved={onSubtitleCleanupSaved}
        onClose={() => setSubtitleCleanupPanelOpen(false)}
        onLlmEndpointChange={onSubtitleCleanupLlmEndpointChange}
        onLlmModelChange={onSubtitleCleanupLlmModelChange}
      />
    </>
  );
}

export default VideoMainSection;
