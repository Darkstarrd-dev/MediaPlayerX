import type { ReactNode } from 'react'

import type { BrowserMode, ImageItem, ImagePackage, VideoItem } from '../../types'

interface BuildMainFooterParams {
  mode: BrowserMode
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  focusedVideo: VideoItem | null
}

export function buildMainFooter({ mode, focusedImage, focusedImagePackage, focusedVideo }: BuildMainFooterParams): ReactNode {
  return (
    <>
      {mode === 'image' && focusedImage && focusedImagePackage ? (
        <>
          <span>
            {focusedImage.mediaLocator.kind === 'filesystem'
              ? focusedImage.mediaLocator.absolutePath
              : `${focusedImage.mediaLocator.archivePath} #${focusedImage.ordinal}`}
          </span>
          <span>{`${focusedImage.sizeKb}KB`}</span>
          <span>{focusedImage.width > 0 && focusedImage.height > 0 ? `${focusedImage.width}x${focusedImage.height}` : '-'}</span>
        </>
      ) : null}

      {mode === 'video' && focusedVideo ? (
        <>
          <span>{focusedVideo.absolutePath}</span>
          <span>{`${focusedVideo.sizeMb}MB`}</span>
          <span>{`${focusedVideo.width}x${focusedVideo.height}`}</span>
        </>
      ) : null}
    </>
  )
}
