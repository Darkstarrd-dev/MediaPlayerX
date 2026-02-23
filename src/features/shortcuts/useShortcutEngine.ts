import { useCallback, useEffect, useRef } from "react";

import {
  SHORTCUT_DEFINITIONS,
  shortcutMatches,
  shortcutWheelMatches,
  type ShortcutAction,
  type ShortcutMap,
} from "../../shortcuts";
import type { BrowserMode } from "../../types";
import { isEditableTarget } from "../../utils/ui";

const IMAGE_NAV_REPEAT_MIN_INTERVAL_MS = 72;
const VIDEO_FRAME_STEP_SECONDS = 1 / 30;

type AlignDirection = "up" | "down" | "left" | "right";

interface UseShortcutEngineParams {
  shortcuts: ShortcutMap;
  suspended?: boolean;
  mode: BrowserMode;
  vectorMode: boolean;
  settingsOpen: boolean;
  sidebarFocus: "sidebar" | "main";
  fullscreenActive: boolean;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  imageFocusActive: boolean;
  manageMode: boolean;
  videoShortcutActive: boolean;
  handleSidebarNavigationKey: (event: KeyboardEvent) => boolean;
  onSetImageFocusActive: (active: boolean) => void;
  onSetFullscreenActive: (
    value: boolean | ((previous: boolean) => boolean),
  ) => void;
  onToggleFullscreenPaneFocus: () => void;
  onToggleFullscreenDualDisplay: () => void;
  onToggleFullscreenSwapSides: () => void;
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
}

export function useShortcutEngine({
  shortcuts,
  suspended = false,
  mode,
  vectorMode,
  settingsOpen,
  sidebarFocus,
  fullscreenActive,
  fullscreenDisplay,
  imageFocusActive,
  manageMode,
  videoShortcutActive,
  handleSidebarNavigationKey,
  onSetImageFocusActive,
  onSetFullscreenActive,
  onToggleFullscreenPaneFocus,
  onToggleFullscreenDualDisplay,
  onToggleFullscreenSwapSides,
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
}: UseShortcutEngineParams): void {
  const lastImageNavAtRef = useRef(0);

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
          if (
            fullscreenActive &&
            (fullscreenDisplay === "image-only" ||
              (fullscreenDisplay === "dual" && imageFocusActive))
          ) {
            onToggleAutoplay();
          }
          return;
        case "autoplayInterval1":
          if (
            fullscreenActive &&
            (fullscreenDisplay === "image-only" ||
              (fullscreenDisplay === "dual" && imageFocusActive))
          ) {
            onApplyAutoplayIntervalByIndex(0);
          }
          return;
        case "autoplayInterval2":
          if (
            fullscreenActive &&
            (fullscreenDisplay === "image-only" ||
              (fullscreenDisplay === "dual" && imageFocusActive))
          ) {
            onApplyAutoplayIntervalByIndex(1);
          }
          return;
        case "autoplayInterval3":
          if (
            fullscreenActive &&
            (fullscreenDisplay === "image-only" ||
              (fullscreenDisplay === "dual" && imageFocusActive))
          ) {
            onApplyAutoplayIntervalByIndex(2);
          }
          return;
        case "autoplayInterval4":
          if (
            fullscreenActive &&
            (fullscreenDisplay === "image-only" ||
              (fullscreenDisplay === "dual" && imageFocusActive))
          ) {
            onApplyAutoplayIntervalByIndex(3);
          }
          return;
        case "autoplayInterval5":
          if (
            fullscreenActive &&
            (fullscreenDisplay === "image-only" ||
              (fullscreenDisplay === "dual" && imageFocusActive))
          ) {
            onApplyAutoplayIntervalByIndex(4);
          }
          return;
        case "rating0":
          if (mode === "video") {
            onSetVideoGrade(null);
            return;
          }
          onSetPackageGrade(null);
          return;
        case "rating1":
          if (mode === "video") {
            onSetVideoGrade(1);
            return;
          }
          onSetPackageGrade(1);
          return;
        case "rating2":
          if (mode === "video") {
            onSetVideoGrade(2);
            return;
          }
          onSetPackageGrade(2);
          return;
        case "rating3":
          if (mode === "video") {
            onSetVideoGrade(3);
            return;
          }
          onSetPackageGrade(3);
          return;
        case "rating4":
          if (mode === "video") {
            onSetVideoGrade(4);
            return;
          }
          onSetPackageGrade(4);
          return;
        case "rating5":
          if (mode === "video") {
            onSetVideoGrade(5);
            return;
          }
          onSetPackageGrade(5);
          return;
        case "enterFullscreen":
          onSetFullscreenActive(true);
          return;
        case "fullscreenToggle":
          onSetFullscreenActive((value) => !value);
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
      fullscreenActive,
      fullscreenDisplay,
      imageFocusActive,
      mode,
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
      onSetPackageGrade,
      onSetVideoGrade,
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
        mode === "image" &&
        !vectorMode &&
        imageFocusActive
      ) {
        event.preventDefault();
        onSetImageFocusActive(false);
        return;
      }

      if (
        event.key === "Tab" &&
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
        fullscreenActive &&
        fullscreenDisplay === "dual" &&
        imageFocusActive &&
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

        if (event.repeat) {
          const now = performance.now();
          if (
            now - lastImageNavAtRef.current <
            IMAGE_NAV_REPEAT_MIN_INTERVAL_MS
          ) {
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
    fullscreenActive,
    handleSidebarNavigationKey,
    imageFocusActive,
    mode,
    onSetFullscreenActive,
    onSetImageFocusActive,
    onToggleFullscreenDualDisplay,
    onToggleFullscreenPaneFocus,
    onToggleFullscreenSwapSides,
    onTriggerImageConvertShortcut,
    onGoPackage,
    onAlignFocus,
    onImageCtrlWheelNavigateSidebar,
    onImageWheelNavigatePage,
    settingsOpen,
    shortcuts,
    suspended,
    sidebarFocus,
    fullscreenDisplay,
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
        const now = performance.now();
        if (
          now - lastImageNavAtRef.current <
          IMAGE_NAV_REPEAT_MIN_INTERVAL_MS
        ) {
          event.preventDefault();
          return;
        }
        lastImageNavAtRef.current = now;
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
    mode,
    settingsOpen,
    shortcuts,
    suspended,
    videoShortcutActive,
  ]);
}
