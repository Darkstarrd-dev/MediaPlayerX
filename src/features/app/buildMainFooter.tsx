import type { ReactNode } from 'react'

import type { BrowserMode, ImageItem, ImagePackage, VideoItem } from '../../types'

interface BuildMainFooterParams {
  mode: BrowserMode
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  focusedVideo: VideoItem | null
  sidebarFocusedPath: string | null
}

export function buildMainFooter({
  mode,
  focusedImage,
  focusedImagePackage,
  focusedVideo,
  sidebarFocusedPath,
}: BuildMainFooterParams): ReactNode {
  let primary = sidebarFocusedPath ?? '-'
  let secondary = '-'
  let tertiary = '-'

  if (mode === 'image' && focusedImage && focusedImagePackage) {
    primary =
      focusedImage.mediaLocator.kind === 'filesystem'
        ? focusedImage.mediaLocator.absolutePath
        : `${focusedImage.mediaLocator.archivePath} #${focusedImage.ordinal}`
    secondary = `${focusedImage.sizeKb}KB`
    tertiary = focusedImage.width > 0 && focusedImage.height > 0 ? `${focusedImage.width}x${focusedImage.height}` : '-'
  }

  if (mode === 'video' && focusedVideo) {
    primary = focusedVideo.absolutePath
    return <span>{primary}</span>
  }

  return (
    <>
      <span>{primary}</span>
      <span>{secondary}</span>
      <span>{tertiary}</span>
    </>
  )
}
