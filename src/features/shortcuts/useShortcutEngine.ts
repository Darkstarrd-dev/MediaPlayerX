import { useCallback, useEffect } from 'react'

import {
  SHORTCUT_DEFINITIONS,
  shortcutMatches,
  type ShortcutAction,
  type ShortcutMap,
} from '../../shortcuts'
import { isEditableTarget } from '../../utils/ui'

type AlignDirection = 'up' | 'down' | 'left' | 'right'

interface UseShortcutEngineParams {
  shortcuts: ShortcutMap
  suspended?: boolean
  mode: 'image' | 'video'
  vectorMode: boolean
  settingsOpen: boolean
  sidebarFocus: 'sidebar' | 'main'
  fullscreenActive: boolean
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  imageFocusActive: boolean
  videoShortcutActive: boolean
  hasFocusedImage: boolean
  handleSidebarNavigationKey: (event: KeyboardEvent) => boolean
  onSetImageFocusActive: (active: boolean) => void
  onSetFullscreenActive: (value: boolean | ((previous: boolean) => boolean)) => void
  onToggleFullscreenPaneFocus: () => void
  onToggleSidebarFocus: () => void
  onMoveImage: (delta: number) => void
  onMoveImageVertical: (direction: 'up' | 'down') => void
  onJumpImageBoundary: (target: 'first' | 'last') => void
  onGoPackage: (delta: number) => void
  onAlignFocus: (direction: AlignDirection) => void
  onToggleAutoplay: () => void
  onApplyAutoplayIntervalByIndex: (index: 0 | 1 | 2 | 3 | 4) => void
  onSetPackageGrade: (grade: number | null) => void
  onToggleVideoPlaying: () => void
  onGoPlaylist: (delta: number) => void
  onAdjustVideoRate: (delta: number) => void
  onAdjustVideoVolume: (delta: number) => void
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
  videoShortcutActive,
  hasFocusedImage,
  handleSidebarNavigationKey,
  onSetImageFocusActive,
  onSetFullscreenActive,
  onToggleFullscreenPaneFocus,
  onToggleSidebarFocus,
  onMoveImage,
  onMoveImageVertical,
  onJumpImageBoundary,
  onGoPackage,
  onAlignFocus,
  onToggleAutoplay,
  onApplyAutoplayIntervalByIndex,
  onSetPackageGrade,
  onToggleVideoPlaying,
  onGoPlaylist,
  onAdjustVideoRate,
  onAdjustVideoVolume,
}: UseShortcutEngineParams): void {
  const executeShortcut = useCallback(
    (action: ShortcutAction) => {
      switch (action) {
        case 'focusSwitch':
          if (!fullscreenActive) {
            onToggleSidebarFocus()
          }
          return
        case 'imagePrev':
          onMoveImage(-1)
          return
        case 'imageNext':
          onMoveImage(1)
          return
        case 'imageFirst':
          if (fullscreenActive) {
            onJumpImageBoundary('first')
            return
          }
          onMoveImageVertical('up')
          return
        case 'imageLast':
          if (fullscreenActive) {
            onJumpImageBoundary('last')
            return
          }
          onMoveImageVertical('down')
          return
        case 'packagePrev':
          onGoPackage(-1)
          return
        case 'packageNext':
          onGoPackage(1)
          return
        case 'alignUp':
          if (fullscreenActive) {
            onAlignFocus('up')
          }
          return
        case 'alignDown':
          if (fullscreenActive) {
            onAlignFocus('down')
          }
          return
        case 'alignLeft':
          if (fullscreenActive) {
            onAlignFocus('left')
          }
          return
        case 'alignRight':
          if (fullscreenActive) {
            onAlignFocus('right')
          }
          return
        case 'autoplayToggle':
          if (mode === 'image') {
            onToggleAutoplay()
          }
          return
        case 'autoplayInterval1':
          onApplyAutoplayIntervalByIndex(0)
          return
        case 'autoplayInterval2':
          onApplyAutoplayIntervalByIndex(1)
          return
        case 'autoplayInterval3':
          onApplyAutoplayIntervalByIndex(2)
          return
        case 'autoplayInterval4':
          onApplyAutoplayIntervalByIndex(3)
          return
        case 'autoplayInterval5':
          onApplyAutoplayIntervalByIndex(4)
          return
        case 'rating0':
          onSetPackageGrade(null)
          return
        case 'rating1':
          onSetPackageGrade(1)
          return
        case 'rating2':
          onSetPackageGrade(2)
          return
        case 'rating3':
          onSetPackageGrade(3)
          return
        case 'rating4':
          onSetPackageGrade(4)
          return
        case 'rating5':
          onSetPackageGrade(5)
          return
        case 'enterFullscreen':
          if (mode === 'image' && !hasFocusedImage) {
            return
          }
          onSetFullscreenActive(true)
          return
        case 'fullscreenToggle':
          if (mode === 'image' && !hasFocusedImage) {
            return
          }
          onSetFullscreenActive((value) => !value)
          return
        case 'videoPlayPause':
          if (videoShortcutActive) {
            onToggleVideoPlaying()
          }
          return
        case 'videoPrev':
          if (videoShortcutActive) {
            onGoPlaylist(-1)
          }
          return
        case 'videoNext':
          if (videoShortcutActive) {
            onGoPlaylist(1)
          }
          return
        case 'videoSpeedDown':
          if (videoShortcutActive) {
            onAdjustVideoRate(-0.25)
          }
          return
        case 'videoSpeedUp':
          if (videoShortcutActive) {
            onAdjustVideoRate(0.25)
          }
          return
        case 'videoVolumeDown':
          if (videoShortcutActive) {
            onAdjustVideoVolume(-5)
          }
          return
        case 'videoVolumeUp':
          if (videoShortcutActive) {
            onAdjustVideoVolume(5)
          }
          return
        default:
          return
      }
    },
    [
      fullscreenActive,
      hasFocusedImage,
      mode,
      onAdjustVideoRate,
      onAdjustVideoVolume,
      onApplyAutoplayIntervalByIndex,
      onGoPackage,
      onGoPlaylist,
      onMoveImage,
      onMoveImageVertical,
      onJumpImageBoundary,
      onAlignFocus,
      onSetFullscreenActive,
      onSetPackageGrade,
      onToggleAutoplay,
      onToggleSidebarFocus,
      onToggleVideoPlaying,
      videoShortcutActive,
    ],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (suspended) {
        return
      }

      if (event.key === 'Escape' && fullscreenActive) {
        event.preventDefault()
        onSetFullscreenActive(false)
        return
      }

      if (event.key === 'Escape' && mode === 'image' && !vectorMode && imageFocusActive) {
        event.preventDefault()
        onSetImageFocusActive(false)
        return
      }

      if (event.key === 'Tab' && fullscreenActive && fullscreenDisplay === 'dual') {
        event.preventDefault()
        onToggleFullscreenPaneFocus()
        return
      }

      if (fullscreenActive && mode === 'image') {
        if (shortcutMatches(shortcuts.packagePrev, event)) {
          event.preventDefault()
          onGoPackage(-1)
          return
        }
        if (shortcutMatches(shortcuts.packageNext, event)) {
          event.preventDefault()
          onGoPackage(1)
          return
        }
      }

      if (fullscreenActive) {
        if (shortcutMatches(shortcuts.alignUp, event)) {
          event.preventDefault()
          onAlignFocus('up')
          return
        }
        if (shortcutMatches(shortcuts.alignDown, event)) {
          event.preventDefault()
          onAlignFocus('down')
          return
        }
        if (shortcutMatches(shortcuts.alignLeft, event)) {
          event.preventDefault()
          onAlignFocus('left')
          return
        }
        if (shortcutMatches(shortcuts.alignRight, event)) {
          event.preventDefault()
          onAlignFocus('right')
          return
        }
      }

      if (settingsOpen && isEditableTarget(event.target)) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (!fullscreenActive && sidebarFocus === 'sidebar') {
        const handledBySidebar = handleSidebarNavigationKey(event)
        if (handledBySidebar) {
          event.preventDefault()
          return
        }
      }

      const allowedScopes = new Set(['global'])
      if (videoShortcutActive) {
        allowedScopes.add('video')
      }

      const matchedDefinition = SHORTCUT_DEFINITIONS.find((definition) => {
        if (!allowedScopes.has(definition.scope)) {
          return false
        }
        return shortcutMatches(shortcuts[definition.action], event)
      })

      if (!matchedDefinition) {
        return
      }

      const imageNavigationActions: ShortcutAction[] = ['imagePrev', 'imageNext', 'imageFirst', 'imageLast']
      if (mode === 'image' && imageNavigationActions.includes(matchedDefinition.action)) {
        const activeElement = document.activeElement
        if (
          activeElement instanceof HTMLElement &&
          (activeElement.classList.contains('thumb-card') || activeElement.classList.contains('name-list-row'))
        ) {
          activeElement.blur()
        }
      }

      event.preventDefault()
      executeShortcut(matchedDefinition.action)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    executeShortcut,
    fullscreenActive,
    handleSidebarNavigationKey,
    imageFocusActive,
    mode,
    onSetFullscreenActive,
    onSetImageFocusActive,
    onToggleFullscreenPaneFocus,
    onGoPackage,
    onAlignFocus,
    settingsOpen,
    shortcuts,
    suspended,
    sidebarFocus,
    fullscreenDisplay,
    vectorMode,
    videoShortcutActive,
  ])
}
