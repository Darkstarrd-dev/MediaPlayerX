import type { Dispatch, SetStateAction } from 'react'

import type { ImageItem } from '../../types'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { FullscreenAlignDirection } from './useFullscreenPlaybackBindings'
import { useShortcutEngine } from '../shortcuts/useShortcutEngine'

type ShortcutEngineParams = Parameters<typeof useShortcutEngine>[0]

interface UseAppShortcutBindingsParams {
  shortcuts: ShortcutEngineParams['shortcuts']
  featureTagPickerOpen: boolean
  adReviewDeletePending: boolean
  mode: ShortcutEngineParams['mode']
  vectorResultsActive: boolean
  settingsOpen: boolean
  sidebarFocus: ShortcutEngineParams['sidebarFocus']
  fullscreenActive: boolean
  fullscreenDisplay: ShortcutEngineParams['fullscreenDisplay']
  fullscreenVideoFocus: boolean
  imageFocusActive: boolean
  manageMode: boolean
  videoShortcutActive: boolean
  focusedImage: ImageItem | null
  handleSidebarNavigationKey: ShortcutEngineParams['handleSidebarNavigationKey']
  setImageFocusActive: Dispatch<SetStateAction<boolean>>
  setFullscreenActiveWithAutoStop: ShortcutEngineParams['onSetFullscreenActive']
  setFullscreenEntryDisplay: Dispatch<SetStateAction<'image-only' | 'video-only'>>
  setFullscreenDisplay: Dispatch<SetStateAction<'dual' | 'video-only' | 'image-only'>>
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>
  setFullscreenSwapped: Dispatch<SetStateAction<boolean>>
  moveImage: ShortcutEngineParams['onMoveImage']
  moveImageVertical: ShortcutEngineParams['onMoveImageVertical']
  jumpImageBoundary: ShortcutEngineParams['onJumpImageBoundary']
  goPackage: ShortcutEngineParams['onGoPackage']
  requestFullscreenAlign: (direction: FullscreenAlignDirection) => void
  autoPlayEnabled: boolean
  applyAutoplayIntervalByIndex: ShortcutEngineParams['onApplyAutoplayIntervalByIndex']
  applyPackageGrade: ShortcutEngineParams['onSetPackageGrade']
  applyVideoGrade: ShortcutEngineParams['onSetVideoGrade']
  requestManageOrganize: ShortcutEngineParams['onRequestManageOrganize']
  addFocusedVideoToPlaylist: ShortcutEngineParams['onAddFocusedVideoToPlaylist']
  removeFocusedVideoFromPlaylist: ShortcutEngineParams['onRemoveFocusedVideoFromPlaylist']
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: ShortcutEngineParams['onGoPlaylist']
  seekVideoBy: ShortcutEngineParams['onSeekVideoBy']
  adjustVideoRate: ShortcutEngineParams['onAdjustVideoRate']
  adjustVideoVolume: ShortcutEngineParams['onAdjustVideoVolume']
  toggleVideoMute: ShortcutEngineParams['onToggleVideoMute']
  saveVideoCover: ShortcutEngineParams['onSaveVideoCover']
  toggleVideoSubtitle: ShortcutEngineParams['onToggleVideoSubtitle']
  cycleVideoFitMode: ShortcutEngineParams['onCycleVideoFitMode']
  onImageWheelNavigatePage: ShortcutEngineParams['onImageWheelNavigatePage']
  onImageCtrlWheelNavigateSidebar: ShortcutEngineParams['onImageCtrlWheelNavigateSidebar']
  updateSettings: AppSettingsStoreSnapshot['updateSettings']
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
  focusedImage,
  handleSidebarNavigationKey,
  setImageFocusActive,
  setFullscreenActiveWithAutoStop,
  setFullscreenEntryDisplay,
  setFullscreenDisplay,
  setFullscreenVideoFocus,
  setFullscreenSwapped,
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
  cycleVideoFitMode,
  onImageWheelNavigatePage,
  onImageCtrlWheelNavigateSidebar,
  updateSettings,
}: UseAppShortcutBindingsParams) {
  useShortcutEngine({
    shortcuts,
    suspended: featureTagPickerOpen || adReviewDeletePending,
    mode,
    vectorMode: vectorResultsActive,
    settingsOpen,
    sidebarFocus,
    fullscreenActive,
    fullscreenDisplay,
    imageFocusActive,
    manageMode,
    videoShortcutActive,
    hasFocusedImage: Boolean(focusedImage),
    handleSidebarNavigationKey,
    onSetImageFocusActive: setImageFocusActive,
    onSetFullscreenActive: setFullscreenActiveWithAutoStop,
    onToggleFullscreenPaneFocus: () => {
      if (fullscreenDisplay !== 'dual') {
        return
      }
      setFullscreenVideoFocus((value) => !value)
    },
    onToggleFullscreenDualDisplay: () => {
      if (!fullscreenActive || (mode !== 'image' && mode !== 'video')) {
        return
      }

      if (fullscreenDisplay === 'dual') {
        const nextSingleDisplay = fullscreenVideoFocus ? 'video-only' : 'image-only'
        setFullscreenEntryDisplay(nextSingleDisplay)
        setFullscreenDisplay(nextSingleDisplay)
        return
      }

      const currentSingleDisplay = fullscreenDisplay === 'video-only' ? 'video-only' : 'image-only'
      setFullscreenEntryDisplay(currentSingleDisplay)
      setFullscreenDisplay('dual')
      setFullscreenVideoFocus(currentSingleDisplay === 'video-only')
    },
    onToggleFullscreenSwapSides: () => {
      if (!fullscreenActive || fullscreenDisplay !== 'dual') {
        return
      }
      setFullscreenSwapped((value) => !value)
    },
    onToggleSidebarFocus: () => {
      if (vectorResultsActive) {
        return
      }
      updateSettings({ sidebarFocus: sidebarFocus === 'sidebar' ? 'main' : 'sidebar' })
    },
    onMoveImage: moveImage,
    onMoveImageVertical: moveImageVertical,
    onJumpImageBoundary: jumpImageBoundary,
    onGoPackage: goPackage,
    onAlignFocus: requestFullscreenAlign,
    onToggleAutoplay: () => {
      updateSettings({ autoPlayEnabled: !autoPlayEnabled })
    },
    onApplyAutoplayIntervalByIndex: applyAutoplayIntervalByIndex,
    onSetPackageGrade: applyPackageGrade,
    onSetVideoGrade: applyVideoGrade,
    onRequestManageOrganize: requestManageOrganize,
    onAddFocusedVideoToPlaylist: addFocusedVideoToPlaylist,
    onRemoveFocusedVideoFromPlaylist: removeFocusedVideoFromPlaylist,
    onToggleVideoPlaying: () => {
      setVideoPlaying((value) => !value)
    },
    onGoPlaylist: goPlaylist,
    onSeekVideoBy: seekVideoBy,
    onAdjustVideoRate: adjustVideoRate,
    onAdjustVideoVolume: adjustVideoVolume,
    onToggleVideoMute: toggleVideoMute,
    onSaveVideoCover: saveVideoCover,
    onToggleVideoSubtitle: toggleVideoSubtitle,
    onCycleVideoFitMode: cycleVideoFitMode,
    onImageWheelNavigatePage,
    onImageCtrlWheelNavigateSidebar,
  })
}
