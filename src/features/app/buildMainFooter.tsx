import type { ReactNode } from 'react'

import type { BrowserMode, ImageItem, ImagePackage, VideoItem } from '../../types'

interface BuildMainFooterParams {
  mode: BrowserMode
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  focusedVideo: VideoItem | null
  sidebarFocusedPath: string | null
  nodeBrowseMode: boolean
  normalizedPageIndex: number
  imageTotalPages: number
  onPrevPage: () => void
  onNextPage: () => void
}

export function buildMainFooter({
  mode,
  focusedImage,
  focusedImagePackage,
  focusedVideo,
  sidebarFocusedPath,
  nodeBrowseMode,
  normalizedPageIndex,
  imageTotalPages,
  onPrevPage,
  onNextPage,
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
  }

  const showPagination = mode === 'image' && !nodeBrowseMode && imageTotalPages > 1

  return (
    <>
      <div className="main-footer-meta">
        <span>{primary}</span>
        {mode === 'image' ? <span>{secondary}</span> : null}
        {mode === 'image' ? <span>{tertiary}</span> : null}
      </div>

      {showPagination ? (
        <div className="main-footer-pagination">
          <button type="button" onClick={onPrevPage}>
            上一页
          </button>
          <span>{`第 ${normalizedPageIndex + 1} / ${imageTotalPages} 页`}</span>
          <button type="button" onClick={onNextPage}>
            下一页
          </button>
        </div>
      ) : null}
    </>
  )
}
