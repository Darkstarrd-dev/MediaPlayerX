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
  imageFocusActive: boolean
  videoShortcutActive: boolean
  focusedImage: ImageItem | null
  handleSidebarNavigationKey: ShortcutEngineParams['handleSidebarNavigationKey']
  setImageFocusActive: Dispatch<SetStateAction<boolean>>
  setFullscreenActiveWithAutoStop: ShortcutEngineParams['onSetFullscreenActive']
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>
  moveImage: ShortcutEngineParams['onMoveImage']
  moveImageVertical: ShortcutEngineParams['onMoveImageVertical']
  jumpImageBoundary: ShortcutEngineParams['onJumpImageBoundary']
  goPackage: ShortcutEngineParams['onGoPackage']
  requestFullscreenAlign: (direction: FullscreenAlignDirection) => void
  autoPlayEnabled: boolean
  applyAutoplayIntervalByIndex: ShortcutEngineParams['onApplyAutoplayIntervalByIndex']
  applyPackageGrade: ShortcutEngineParams['onSetPackageGrade']
  applyVideoGrade: ShortcutEngineParams['onSetVideoGrade']
  setVideoPlaying: Dispatch<SetStateAction<boolean>>
  goPlaylist: ShortcutEngineParams['onGoPlaylist']
  adjustVideoRate: ShortcutEngineParams['onAdjustVideoRate']
  adjustVideoVolume: ShortcutEngineParams['onAdjustVideoVolume']
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
  imageFocusActive,
  videoShortcutActive,
  focusedImage,
  handleSidebarNavigationKey,
  setImageFocusActive,
  setFullscreenActiveWithAutoStop,
  setFullscreenVideoFocus,
  moveImage,
  moveImageVertical,
  jumpImageBoundary,
  goPackage,
  requestFullscreenAlign,
  autoPlayEnabled,
  applyAutoplayIntervalByIndex,
  applyPackageGrade,
  applyVideoGrade,
  setVideoPlaying,
  goPlaylist,
  adjustVideoRate,
  adjustVideoVolume,
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
    onToggleVideoPlaying: () => {
      setVideoPlaying((value) => !value)
    },
    onGoPlaylist: goPlaylist,
    onAdjustVideoRate: adjustVideoRate,
    onAdjustVideoVolume: adjustVideoVolume,
    onImageWheelNavigatePage,
    onImageCtrlWheelNavigateSidebar,
  })
}
