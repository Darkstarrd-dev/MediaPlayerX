import { useCallback, useEffect, useRef } from "react";

import {
  SHORTCUT_DEFINITIONS,
  shortcutMatches,
  shortcutWheelMatches,
  type ShortcutAction,
  type ShortcutMap,
} from "../../shortcuts";
import type { BrowserMode } from "../../types";
import { dispatchFullscreenRatingFeedback } from "../../utils/fullscreenRatingFeedback";
import { isEditableTarget } from "../../utils/ui";

const IMAGE_NAV_REPEAT_MIN_INTERVAL_MS = 100;
const VIDEO_FRAME_STEP_SECONDS = 1 / 30;

function hasActiveTextSelection(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return false;
  }

  return selection.toString().trim().length > 0;
}

type AlignDirection = "up" | "down" | "left" | "right";

interface UseShortcutEngineParams {
  shortcuts: ShortcutMap;
  suspended?: boolean;
  mode: BrowserMode;
  /** 全屏连续翻页最小间隔（ms）；限制按住/连发翻页速率，空闲后首次按键不受限 */
  imageNavMinIntervalMs?: number;
  vectorMode: boolean;
  settingsOpen: boolean;
  sidebarFocus: "sidebar" | "main";
  fullscreenActive: boolean;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  fullscreenVideoFocus: boolean;
  imageFocusActive: boolean;
  manageMode: boolean;
  videoShortcutActive: boolean;
  handleSidebarNavigationKey: (event: KeyboardEvent) => boolean;
  onSetImageFocusActive: (active: boolean) => void;
  onEscapeFromVideoPlaybackToNodeBrowse: () => boolean;
  onSetFullscreenActive: (
    value: boolean | ((previous: boolean) => boolean),
  ) => void;
  onToggleWindowFullscreen: () => void;
  onToggleFullscreenPaneFocus: () => void;
  onToggleFullscreenDualDisplay: () => void;
  onToggleFullscreenSwapSides: () => void;
  onToggleFullscreenDeleteMark: (pane: "image" | "video") => void;
  onToggleSidebarFocus: () => void;
  onMoveImage: (delta: number) => void;
  onMoveImageVertical: (direction: "up" | "down") => void;
  onJumpImageBoundary: (target: "first" | "last") => void;
  onGoPackage: (delta: number) => void;
  onAlignFocus: (direction: AlignDirection) => void;
  onToggleAutoplay: () => void;
  onApplyAutoplayIntervalByIndex: (index: 0 | 1 | 2 | 3 | 4) => void;
  onSetPackageGrade: (grade: number | null) => void;
  onSetVideoGrade: (grade: number | null) => void;
  onRequestManageOrganize: () => void;
  onTriggerImageConvertShortcut: () => void;
  onAddFocusedVideoToPlaylist: () => void;
  onRemoveFocusedVideoFromPlaylist: () => void;
  onToggleVideoPlaying: () => void;
  onGoPlaylist: (delta: number) => void;
  onSeekVideoBy: (deltaSeconds: number) => void;
  onAdjustVideoRate: (delta: number) => void;
  onAdjustVideoVolume: (delta: number) => void;
  onToggleVideoMute: () => void;
  onSaveVideoCover: () => void;
  onToggleVideoSubtitle: () => void;
  onAdjustVideoSubtitleOffset: (delta: number) => void;
  onCycleVideoFitMode: () => void;
  onImageWheelNavigatePage: (direction: "next" | "prev") => void;
  onImageCtrlWheelNavigateSidebar: (direction: "next" | "prev") => void;
  onCopyFocusedImageToClipboard: () => boolean;
  onCopyFocusedVideoFrameToClipboard: () => boolean;
}

export function useShortcutEngine({
  shortcuts,
  suspended = false,
  mode,
  imageNavMinIntervalMs,
  vectorMode,
  settingsOpen,
  sidebarFocus,
  fullscreenActive,
  fullscreenDisplay,
  fullscreenVideoFocus,
  imageFocusActive,
  manageMode,
  videoShortcutActive,
  handleSidebarNavigationKey,
  onSetImageFocusActive,
  onEscapeFromVideoPlaybackToNodeBrowse,
  onSetFullscreenActive,
  onToggleWindowFullscreen,
  onToggleFullscreenPaneFocus,
  onToggleFullscreenDualDisplay,
  onToggleFullscreenSwapSides,
  onToggleFullscreenDeleteMark,
  onToggleSidebarFocus,
  onMoveImage,
  onMoveImageVertical,
  onJumpImageBoundary,
  onGoPackage,
  onAlignFocus,
  onToggleAutoplay,
  onApplyAutoplayIntervalByIndex,
  onSetPackageGrade,
  onSetVideoGrade,
  onRequestManageOrganize,
  onTriggerImageConvertShortcut,
  onAddFocusedVideoToPlaylist,
  onRemoveFocusedVideoFromPlaylist,
  onToggleVideoPlaying,
  onGoPlaylist,
  onSeekVideoBy,
  onAdjustVideoRate,
  onAdjustVideoVolume,
  onToggleVideoMute,
  onSaveVideoCover,
  onToggleVideoSubtitle,
  onAdjustVideoSubtitleOffset,
  onCycleVideoFitMode,
  onImageWheelNavigatePage,
  onImageCtrlWheelNavigateSidebar,
  onCopyFocusedImageToClipboard,
  onCopyFocusedVideoFrameToClipboard,
}: UseShortcutEngineParams): void {
  const lastImageNavAtRef = useRef(0);
  // 连续翻页最小间隔：未配置或非法时回退到默认值；0 表示不限速
  const effectiveImageNavIntervalMs =
    typeof imageNavMinIntervalMs === "number" &&
    Number.isFinite(imageNavMinIntervalMs) &&
    imageNavMinIntervalMs >= 0
      ? imageNavMinIntervalMs
      : IMAGE_NAV_REPEAT_MIN_INTERVAL_MS;
  const autoplayShortcutEnabled =
    fullscreenActive && fullscreenDisplay !== "video-only";

  const emitFullscreenRatingFeedback = useCallback(
    (grade: number | null) => {
      if (!fullscreenActive || (mode !== "image" && mode !== "video")) {
        return;
      }

      const pane =
        fullscreenDisplay === "dual"
          ? fullscreenVideoFocus
            ? "video"
            : "image"
          : fullscreenDisplay === "video-only"
            ? "video"
            : "image";

      dispatchFullscreenRatingFeedback({
        grade,
        pane,
      });
    },
    [fullscreenActive, fullscreenDisplay, fullscreenVideoFocus, mode],
  );

  const applyRatingShortcut = useCallback(
    (grade: number | null) => {
      if (mode === "video") {
        onSetVideoGrade(grade);
      } else {
        onSetPackageGrade(grade);
      }

      emitFullscreenRatingFeedback(grade);
    },
    [emitFullscreenRatingFeedback, mode, onSetPackageGrade, onSetVideoGrade],
  );

  const executeShortcut = useCallback(
    (action: ShortcutAction) => {
      switch (action) {
        case "focusSwitch":
          if (!fullscreenActive) {
            onToggleSidebarFocus();
          }
          return;
        case "imagePrev":
          onMoveImage(-1);
          return;
        case "imageNext":
          onMoveImage(1);
          return;
        case "imageFirst":
          if (fullscreenActive) {
            onJumpImageBoundary("first");
            return;
          }
          onMoveImageVertical("up");
          return;
        case "imageLast":
          if (fullscreenActive) {
            onJumpImageBoundary("last");
            return;
          }
          onMoveImageVertical("down");
          return;
        case "packagePrev":
          onGoPackage(-1);
          return;
        case "packageNext":
          onGoPackage(1);
          return;
        case "alignUp":
          if (fullscreenActive) {
            onAlignFocus("up");
          }
          return;
        case "alignDown":
          if (fullscreenActive) {
            onAlignFocus("down");
          }
          return;
        case "alignLeft":
          if (fullscreenActive) {
            onAlignFocus("left");
          }
          return;
        case "alignRight":
          if (fullscreenActive) {
            onAlignFocus("right");
          }
          return;
        case "autoplayToggle":
          if (autoplayShortcutEnabled) {
            onToggleAutoplay();
          }
          return;
        case "autoplayInterval1":
          if (autoplayShortcutEnabled) {
            onApplyAutoplayIntervalByIndex(0);
          }
          return;
        case "autoplayInterval2":
          if (autoplayShortcutEnabled) {
            onApplyAutoplayIntervalByIndex(1);
          }
          return;
        case "autoplayInterval3":
          if (autoplayShortcutEnabled) {
            onApplyAutoplayIntervalByIndex(2);
          }
          return;
        case "autoplayInterval4":
          if (autoplayShortcutEnabled) {
            onApplyAutoplayIntervalByIndex(3);
          }
          return;
        case "autoplayInterval5":
          if (autoplayShortcutEnabled) {
            onApplyAutoplayIntervalByIndex(4);
          }
          return;
        case "rating0":
          applyRatingShortcut(null);
          return;
        case "rating1":
          applyRatingShortcut(1);
          return;
        case "rating2":
          applyRatingShortcut(2);
          return;
        case "rating3":
          applyRatingShortcut(3);
          return;
        case "rating4":
          applyRatingShortcut(4);
          return;
        case "rating5":
          applyRatingShortcut(5);
          return;
        case "enterFullscreen":
          onSetFullscreenActive(true);
          return;
        case "fullscreenToggle":
          onSetFullscreenActive((value) => !value);
          return;
        case "windowFullscreenToggle":
          if (!fullscreenActive) {
            onToggleWindowFullscreen();
          }
          return;
        case "videoPlayPause":
          if (videoShortcutActive) {
            onToggleVideoPlaying();
          }
          return;
        case "videoPlaylistAdd":
          if (videoShortcutActive) {
            onAddFocusedVideoToPlaylist();
          }
          return;
        case "videoPlaylistRemove":
          if (videoShortcutActive) {
            onRemoveFocusedVideoFromPlaylist();
          }
          return;
        case "manageOrganize":
          if (manageMode) {
            onRequestManageOrganize();
          }
          return;
        case "videoPrev":
          if (videoShortcutActive) {
            onGoPlaylist(-1);
          }
          return;
        case "videoNext":
          if (videoShortcutActive) {
            onGoPlaylist(1);
          }
          return;
        case "videoSeekBackwardShort":
          if (videoShortcutActive) {
            onSeekVideoBy(-5);
          }
          return;
        case "videoSeekForwardShort":
          if (videoShortcutActive) {
            onSeekVideoBy(5);
          }
          return;
        case "videoSeekBackwardLong":
          if (videoShortcutActive) {
            onSeekVideoBy(-30);
          }
          return;
        case "videoSeekForwardLong":
          if (videoShortcutActive) {
            onSeekVideoBy(30);
          }
          return;
        case "videoSeekBackwardFrame":
          if (videoShortcutActive) {
            onSeekVideoBy(-VIDEO_FRAME_STEP_SECONDS);
          }
          return;
        case "videoSeekForwardFrame":
          if (videoShortcutActive) {
            onSeekVideoBy(VIDEO_FRAME_STEP_SECONDS);
          }
          return;
        case "videoSpeedDown":
          if (videoShortcutActive) {
            onAdjustVideoRate(-0.25);
          }
          return;
        case "videoSpeedUp":
          if (videoShortcutActive) {
            onAdjustVideoRate(0.25);
          }
          return;
        case "videoVolumeDown":
          if (videoShortcutActive) {
            onAdjustVideoVolume(-5);
          }
          return;
        case "videoVolumeUp":
          if (videoShortcutActive) {
            onAdjustVideoVolume(5);
          }
          return;
        case "videoMute":
          if (videoShortcutActive) {
            onToggleVideoMute();
          }
          return;
        case "videoSaveCover":
          if (videoShortcutActive) {
            onSaveVideoCover();
          }
          return;
        case "videoSubtitleToggle":
          if (videoShortcutActive) {
            onToggleVideoSubtitle();
          }
          return;
        case "videoSubtitleOffsetUp":
          if (videoShortcutActive) {
            onAdjustVideoSubtitleOffset(16);
          }
          return;
        case "videoSubtitleOffsetDown":
          if (videoShortcutActive) {
            onAdjustVideoSubtitleOffset(-16);
          }
          return;
        case "videoFitCycle":
          if (videoShortcutActive) {
            onCycleVideoFitMode();
          }
          return;
        default:
          return;
      }
    },
    [
      autoplayShortcutEnabled,
      fullscreenActive,
      onAdjustVideoRate,
      onAdjustVideoVolume,
      onApplyAutoplayIntervalByIndex,
      onGoPackage,
      onGoPlaylist,
      onSeekVideoBy,
      onMoveImage,
      onMoveImageVertical,
      onJumpImageBoundary,
      onAlignFocus,
      onSetFullscreenActive,
      onToggleWindowFullscreen,
      applyRatingShortcut,
      onRequestManageOrganize,
      onAddFocusedVideoToPlaylist,
      onRemoveFocusedVideoFromPlaylist,
      onToggleAutoplay,
      onToggleSidebarFocus,
      onToggleVideoMute,
      onToggleVideoPlaying,
      onSaveVideoCover,
      onToggleVideoSubtitle,
      onAdjustVideoSubtitleOffset,
      onCycleVideoFitMode,
      manageMode,
      videoShortcutActive,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (suspended) {
        return;
      }

      const imageConvertExecuting =
        document.documentElement.dataset.mpxImageConvertExecuting === "1";
      const imageAdjustPanelOpen =
        document.documentElement.dataset.mpxImageAdjustPanelOpen === "1";

      if (imageAdjustPanelOpen && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("mpx:image-adjust-cancel"));
        return;
      }

      if (imageAdjustPanelOpen && event.key !== "Escape") {
        return;
      }

      if (imageConvertExecuting && event.key !== "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key === "Escape" && fullscreenActive) {
        event.preventDefault();
        onSetFullscreenActive(false);
        return;
      }

      if (
        event.key === "Escape" &&
        mode === "video" &&
        !fullscreenActive &&
        onEscapeFromVideoPlaybackToNodeBrowse()
      ) {
        event.preventDefault();
        return;
      }

      if (
        event.key === "Escape" &&
        mode === "image" &&
        !vectorMode &&
        imageFocusActive
      ) {
        event.preventDefault();
        onSetImageFocusActive(false);
        return;
      }

      if (
        (event.key === "Tab" || event.code === "NumpadDecimal") &&
        fullscreenActive &&
        fullscreenDisplay === "dual"
      ) {
        event.preventDefault();
        onToggleFullscreenPaneFocus();
        return;
      }

      if (fullscreenActive && mode === "image") {
        if (shortcutMatches(shortcuts.packagePrev, event)) {
          event.preventDefault();
          onGoPackage(-1);
          return;
        }
        if (shortcutMatches(shortcuts.packageNext, event)) {
          event.preventDefault();
          onGoPackage(1);
          return;
        }
      }

      if (fullscreenActive) {
        if (shortcutMatches(shortcuts.alignUp, event)) {
          event.preventDefault();
          onAlignFocus("up");
          return;
        }
        if (shortcutMatches(shortcuts.alignDown, event)) {
          event.preventDefault();
          onAlignFocus("down");
          return;
        }
        if (shortcutMatches(shortcuts.alignLeft, event)) {
          event.preventDefault();
          onAlignFocus("left");
          return;
        }
        if (shortcutMatches(shortcuts.alignRight, event)) {
          event.preventDefault();
          onAlignFocus("right");
          return;
        }
      }

      if (settingsOpen && isEditableTarget(event.target)) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (
        fullscreenActive &&
        (mode === "image" || mode === "video") &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        event.code === "Delete"
      ) {
        const targetPane: "image" | "video" =
          fullscreenDisplay === "dual"
            ? fullscreenVideoFocus
              ? "video"
              : "image"
            : fullscreenDisplay === "video-only"
              ? "video"
              : "image";
        event.preventDefault();
        onToggleFullscreenDeleteMark(targetPane);
        return;
      }

      if (
        fullscreenActive &&
        (mode === "image" || mode === "video") &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        event.code === "KeyD"
      ) {
        event.preventDefault();
        onToggleFullscreenDualDisplay();
        return;
      }

      if (
        !fullscreenActive &&
        mode === "image" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        event.code === "KeyS"
      ) {
        event.preventDefault();
        onTriggerImageConvertShortcut();
        return;
      }

      if (
        fullscreenActive &&
        fullscreenDisplay === "dual" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        event.code === "KeyS"
      ) {
        event.preventDefault();
        onToggleFullscreenSwapSides();
        return;
      }

      if (
        event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        event.code === "KeyC"
      ) {
        if (hasActiveTextSelection()) {
          return;
        }

        let handled = false;

        if (fullscreenActive) {
          if (fullscreenDisplay === "dual") {
            handled = fullscreenVideoFocus
              ? onCopyFocusedVideoFrameToClipboard()
              : onCopyFocusedImageToClipboard();
          } else if (fullscreenDisplay === "video-only") {
            handled = onCopyFocusedVideoFrameToClipboard();
          } else {
            handled = onCopyFocusedImageToClipboard();
          }
        } else if (sidebarFocus === "main") {
          if (mode === "image") {
            handled = onCopyFocusedImageToClipboard();
          } else if (mode === "video") {
            handled = onCopyFocusedVideoFrameToClipboard();
          }
        }

        if (handled) {
          event.preventDefault();
          return;
        }
      }

      if (
        fullscreenActive &&
        fullscreenDisplay === "dual" &&
        autoplayShortcutEnabled &&
        shortcutMatches(shortcuts.autoplayToggle, event)
      ) {
        event.preventDefault();
        executeShortcut("autoplayToggle");
        return;
      }

      if (
        !fullscreenActive &&
        mode === "image" &&
        event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey
      ) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onImageWheelNavigatePage("prev");
          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          onImageWheelNavigatePage("next");
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          onImageCtrlWheelNavigateSidebar("prev");
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          onImageCtrlWheelNavigateSidebar("next");
          return;
        }
      }

      if (
        !fullscreenActive &&
        sidebarFocus === "sidebar" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey
      ) {
        const handledBySidebar = handleSidebarNavigationKey(event);
        if (handledBySidebar) {
          event.preventDefault();
          return;
        }
      }

      const allowedScopes = new Set(["global"]);
      if (videoShortcutActive) {
        allowedScopes.add("video");
      }

      const matchedDefinition = [...SHORTCUT_DEFINITIONS]
        .filter((definition) => {
          if (!allowedScopes.has(definition.scope)) {
            return false;
          }
          return shortcutMatches(shortcuts[definition.action], event);
        })
        .sort((left, right) => {
          const leftPriority =
            videoShortcutActive && left.scope === "video" ? 0 : 1;
          const rightPriority =
            videoShortcutActive && right.scope === "video" ? 0 : 1;
          return leftPriority - rightPriority;
        })[0];

      if (!matchedDefinition) {
        return;
      }

      const imageNavigationActions: ShortcutAction[] = [
        "imagePrev",
        "imageNext",
        "imageFirst",
        "imageLast",
      ];
      if (
        mode === "image" &&
        imageNavigationActions.includes(matchedDefinition.action)
      ) {
        document.documentElement.dataset.mpxThumbInput = "keyboard";

        // 连续翻页限速：仅对按住产生的自动重复事件节流，单次/离散按键始终响应。
        // 间隔由设置项 fullscreenImageNavMaxPerSecond 决定（默认 100ms = 10 张/秒）。
        if (event.repeat && effectiveImageNavIntervalMs > 0) {
          const now = performance.now();
          if (now - lastImageNavAtRef.current < effectiveImageNavIntervalMs) {
            event.preventDefault();
            return;
          }
          lastImageNavAtRef.current = now;
        }

        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLElement &&
          (activeElement.classList.contains("thumb-card") ||
            activeElement.classList.contains("thumb-card-main") ||
            activeElement.classList.contains("name-list-row") ||
            activeElement.classList.contains("name-list-row-main"))
        ) {
          activeElement.blur();
        }
      }

      event.preventDefault();
      executeShortcut(matchedDefinition.action);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    executeShortcut,
    autoplayShortcutEnabled,
    effectiveImageNavIntervalMs,
    fullscreenActive,
    handleSidebarNavigationKey,
    imageFocusActive,
    mode,
    onEscapeFromVideoPlaybackToNodeBrowse,
    onSetFullscreenActive,
    onSetImageFocusActive,
    onToggleFullscreenDualDisplay,
    onToggleFullscreenPaneFocus,
    onToggleFullscreenSwapSides,
    onToggleFullscreenDeleteMark,
    onTriggerImageConvertShortcut,
    onGoPackage,
    onAlignFocus,
    onImageCtrlWheelNavigateSidebar,
    onImageWheelNavigatePage,
    onCopyFocusedImageToClipboard,
    onCopyFocusedVideoFrameToClipboard,
    settingsOpen,
    shortcuts,
    suspended,
    sidebarFocus,
    fullscreenDisplay,
    fullscreenVideoFocus,
    vectorMode,
    videoShortcutActive,
  ]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (suspended) {
        return;
      }

      if (document.documentElement.dataset.mpxImageConvertExecuting === "1") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (settingsOpen && isEditableTarget(event.target)) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const allowedScopes = new Set(["global"]);
      if (videoShortcutActive) {
        allowedScopes.add("video");
      }

      const matchedDefinition = [...SHORTCUT_DEFINITIONS]
        .filter((definition) => {
          if (!allowedScopes.has(definition.scope)) {
            return false;
          }
          return shortcutWheelMatches(shortcuts[definition.action], event);
        })
        .sort((left, right) => {
          const leftPriority =
            videoShortcutActive && left.scope === "video" ? 0 : 1;
          const rightPriority =
            videoShortcutActive && right.scope === "video" ? 0 : 1;
          return leftPriority - rightPriority;
        })[0];

      if (!matchedDefinition) {
        return;
      }

      const imageNavigationActions: ShortcutAction[] = [
        "imagePrev",
        "imageNext",
        "imageFirst",
        "imageLast",
      ];
      if (
        mode === "image" &&
        imageNavigationActions.includes(matchedDefinition.action)
      ) {
        if (effectiveImageNavIntervalMs > 0) {
          const now = performance.now();
          if (now - lastImageNavAtRef.current < effectiveImageNavIntervalMs) {
            event.preventDefault();
            return;
          }
          lastImageNavAtRef.current = now;
        }
      }

      event.preventDefault();
      executeShortcut(matchedDefinition.action);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [
    executeShortcut,
    effectiveImageNavIntervalMs,
    mode,
    settingsOpen,
    shortcuts,
    suspended,
    videoShortcutActive,
  ]);
}
