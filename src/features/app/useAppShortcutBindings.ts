import type { Dispatch, SetStateAction } from "react";

import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { FullscreenAlignDirection } from "./useFullscreenPlaybackBindings";
import { useShortcutEngine } from "../shortcuts/useShortcutEngine";

type ShortcutEngineParams = Parameters<typeof useShortcutEngine>[0];

interface UseAppShortcutBindingsParams {
  shortcuts: ShortcutEngineParams["shortcuts"];
  featureTagPickerOpen: boolean;
  adReviewDeletePending: boolean;
  mode: ShortcutEngineParams["mode"];
  vectorResultsActive: boolean;
  settingsOpen: boolean;
  sidebarFocus: ShortcutEngineParams["sidebarFocus"];
  fullscreenActive: boolean;
  fullscreenDisplay: ShortcutEngineParams["fullscreenDisplay"];
  fullscreenVideoFocus: boolean;
  imageFocusActive: boolean;
  manageMode: boolean;
  videoShortcutActive: boolean;
  handleSidebarNavigationKey: ShortcutEngineParams["handleSidebarNavigationKey"];
  setImageFocusActive: Dispatch<SetStateAction<boolean>>;
  onEscapeFromVideoPlaybackToNodeBrowse: ShortcutEngineParams["onEscapeFromVideoPlaybackToNodeBrowse"];
  setFullscreenActiveWithAutoStop: ShortcutEngineParams["onSetFullscreenActive"];
  setFullscreenEntryDisplay: Dispatch<
    SetStateAction<"image-only" | "video-only">
  >;
  setFullscreenDisplay: Dispatch<
    SetStateAction<"dual" | "video-only" | "image-only">
  >;
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>;
  setFullscreenSwapped: Dispatch<SetStateAction<boolean>>;
  onToggleFullscreenDeleteMark: (pane: "image" | "video") => void;
  onFullscreenBackspaceRemove: () => void;
  moveImage: ShortcutEngineParams["onMoveImage"];
  moveImageVertical: ShortcutEngineParams["onMoveImageVertical"];
  jumpImageBoundary: ShortcutEngineParams["onJumpImageBoundary"];
  goPackage: ShortcutEngineParams["onGoPackage"];
  requestFullscreenAlign: (direction: FullscreenAlignDirection) => void;
  autoPlayEnabled: boolean;
  applyAutoplayIntervalByIndex: ShortcutEngineParams["onApplyAutoplayIntervalByIndex"];
  applyPackageGrade: ShortcutEngineParams["onSetPackageGrade"];
  applyVideoGrade: ShortcutEngineParams["onSetVideoGrade"];
  requestManageOrganize: ShortcutEngineParams["onRequestManageOrganize"];
  onTriggerImageConvertShortcut: ShortcutEngineParams["onTriggerImageConvertShortcut"];
  addFocusedVideoToPlaylist: ShortcutEngineParams["onAddFocusedVideoToPlaylist"];
  removeFocusedVideoFromPlaylist: ShortcutEngineParams["onRemoveFocusedVideoFromPlaylist"];
  setVideoPlaying: Dispatch<SetStateAction<boolean>>;
  goPlaylist: ShortcutEngineParams["onGoPlaylist"];
  seekVideoBy: ShortcutEngineParams["onSeekVideoBy"];
  adjustVideoRate: ShortcutEngineParams["onAdjustVideoRate"];
  adjustVideoVolume: ShortcutEngineParams["onAdjustVideoVolume"];
  toggleVideoMute: ShortcutEngineParams["onToggleVideoMute"];
  saveVideoCover: ShortcutEngineParams["onSaveVideoCover"];
  toggleVideoSubtitle: ShortcutEngineParams["onToggleVideoSubtitle"];
  adjustVideoSubtitleOffset: ShortcutEngineParams["onAdjustVideoSubtitleOffset"];
  cycleVideoFitMode: ShortcutEngineParams["onCycleVideoFitMode"];
  onImageWheelNavigatePage: ShortcutEngineParams["onImageWheelNavigatePage"];
  onImageCtrlWheelNavigateSidebar: ShortcutEngineParams["onImageCtrlWheelNavigateSidebar"];
  onCopyFocusedImageToClipboard: ShortcutEngineParams["onCopyFocusedImageToClipboard"];
  onCopyFocusedVideoFrameToClipboard: ShortcutEngineParams["onCopyFocusedVideoFrameToClipboard"];
  onToggleGroupFilter: ShortcutEngineParams["onToggleGroupFilter"];
  onJoinCurrentToGroup: ShortcutEngineParams["onJoinCurrentToGroup"];
  onRemoveCurrentFromGroup: ShortcutEngineParams["onRemoveCurrentFromGroup"];
  onOpenFullscreenGroupPicker: ShortcutEngineParams["onOpenFullscreenGroupPicker"];
  /** 全屏连续翻页速度上限（张/秒），转为最小间隔传入引擎 */
  fullscreenImageNavMaxPerSecond: number;
  updateSettings: AppSettingsStoreSnapshot["updateSettings"];
}

export function useAppShortcutBindings({
  shortcuts,
  featureTagPickerOpen,
  adReviewDeletePending,
  mode,
  vectorResultsActive,
  settingsOpen,
  sidebarFocus,
  fullscreenActive,
  fullscreenDisplay,
  fullscreenVideoFocus,
  imageFocusActive,
  manageMode,
  videoShortcutActive,
  handleSidebarNavigationKey,
  setImageFocusActive,
  onEscapeFromVideoPlaybackToNodeBrowse,
  setFullscreenActiveWithAutoStop,
  setFullscreenEntryDisplay,
  setFullscreenDisplay,
  setFullscreenVideoFocus,
  setFullscreenSwapped,
  onToggleFullscreenDeleteMark,
  onFullscreenBackspaceRemove,
  moveImage,
  moveImageVertical,
  jumpImageBoundary,
  goPackage,
  requestFullscreenAlign,
  autoPlayEnabled,
  applyAutoplayIntervalByIndex,
  applyPackageGrade,
  applyVideoGrade,
  requestManageOrganize,
  onTriggerImageConvertShortcut,
  addFocusedVideoToPlaylist,
  removeFocusedVideoFromPlaylist,
  setVideoPlaying,
  goPlaylist,
  seekVideoBy,
  adjustVideoRate,
  adjustVideoVolume,
  toggleVideoMute,
  saveVideoCover,
  toggleVideoSubtitle,
  adjustVideoSubtitleOffset,
  cycleVideoFitMode,
  onImageWheelNavigatePage,
  onImageCtrlWheelNavigateSidebar,
  onCopyFocusedImageToClipboard,
  onCopyFocusedVideoFrameToClipboard,
  onToggleGroupFilter,
  onJoinCurrentToGroup,
  onRemoveCurrentFromGroup,
  onOpenFullscreenGroupPicker,
  fullscreenImageNavMaxPerSecond,
  updateSettings,
}: UseAppShortcutBindingsParams) {
  useShortcutEngine({
    shortcuts,
    suspended: featureTagPickerOpen || adReviewDeletePending,
    mode,
    imageNavMinIntervalMs:
      fullscreenImageNavMaxPerSecond > 0
        ? Math.round(1000 / fullscreenImageNavMaxPerSecond)
        : 0,
    vectorMode: vectorResultsActive,
    settingsOpen,
    sidebarFocus,
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    imageFocusActive,
    manageMode,
    videoShortcutActive,
    handleSidebarNavigationKey,
    onSetImageFocusActive: setImageFocusActive,
    onEscapeFromVideoPlaybackToNodeBrowse,
    onSetFullscreenActive: setFullscreenActiveWithAutoStop,
    onToggleWindowFullscreen: () => {
      const windowApi =
        typeof window !== "undefined" ? window.mediaPlayerWindow : undefined;
      if (!windowApi?.setFullscreen || !windowApi.isFullscreen) {
        return;
      }

      void windowApi
        .isFullscreen()
        .then((isFullscreen) => windowApi.setFullscreen(!isFullscreen))
        .catch(() => undefined);
    },
    onToggleFullscreenPaneFocus: () => {
      if (fullscreenDisplay !== "dual") {
        return;
      }
      setFullscreenVideoFocus((value) => !value);
    },
    onToggleFullscreenDualDisplay: () => {
      if (!fullscreenActive || (mode !== "image" && mode !== "video")) {
        return;
      }

      if (fullscreenDisplay === "dual") {
        const nextSingleDisplay = fullscreenVideoFocus
          ? "video-only"
          : "image-only";
        setFullscreenEntryDisplay(nextSingleDisplay);
        setFullscreenDisplay(nextSingleDisplay);
        return;
      }

      const currentSingleDisplay =
        fullscreenDisplay === "video-only" ? "video-only" : "image-only";
      setFullscreenEntryDisplay(currentSingleDisplay);
      setFullscreenDisplay("dual");
      setFullscreenVideoFocus(currentSingleDisplay === "video-only");
    },
    onToggleFullscreenSwapSides: () => {
      if (!fullscreenActive || fullscreenDisplay !== "dual") {
        return;
      }
      setFullscreenSwapped((value) => !value);
    },
    onToggleFullscreenDeleteMark,
    onFullscreenBackspaceRemove,
    onToggleSidebarFocus: () => {
      if (vectorResultsActive) {
        return;
      }
      updateSettings({
        sidebarFocus: sidebarFocus === "sidebar" ? "main" : "sidebar",
      });
    },
    onMoveImage: moveImage,
    onMoveImageVertical: moveImageVertical,
    onJumpImageBoundary: jumpImageBoundary,
    onGoPackage: goPackage,
    onAlignFocus: requestFullscreenAlign,
    onToggleAutoplay: () => {
      updateSettings({ autoPlayEnabled: !autoPlayEnabled });
    },
    onApplyAutoplayIntervalByIndex: applyAutoplayIntervalByIndex,
    onSetPackageGrade: applyPackageGrade,
    onSetVideoGrade: applyVideoGrade,
    onRequestManageOrganize: requestManageOrganize,
    onTriggerImageConvertShortcut,
    onAddFocusedVideoToPlaylist: addFocusedVideoToPlaylist,
    onRemoveFocusedVideoFromPlaylist: removeFocusedVideoFromPlaylist,
    onToggleVideoPlaying: () => {
      setVideoPlaying((value) => !value);
    },
    onGoPlaylist: goPlaylist,
    onSeekVideoBy: seekVideoBy,
    onAdjustVideoRate: adjustVideoRate,
    onAdjustVideoVolume: adjustVideoVolume,
    onToggleVideoMute: toggleVideoMute,
    onSaveVideoCover: saveVideoCover,
    onToggleVideoSubtitle: toggleVideoSubtitle,
    onAdjustVideoSubtitleOffset: adjustVideoSubtitleOffset,
    onCycleVideoFitMode: cycleVideoFitMode,
    onImageWheelNavigatePage,
    onImageCtrlWheelNavigateSidebar,
    onCopyFocusedImageToClipboard,
    onCopyFocusedVideoFrameToClipboard,
    onToggleGroupFilter,
    onJoinCurrentToGroup,
    onRemoveCurrentFromGroup,
    onOpenFullscreenGroupPicker,
  });
}
