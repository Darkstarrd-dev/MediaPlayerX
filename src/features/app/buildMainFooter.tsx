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

  if (mode === 'image' && (focusedImagePackage || focusedImage)) {
    primary = focusedImagePackage?.absolutePath ?? primary
  }

  if (mode === 'video' && focusedVideo) {
    primary = focusedVideo.absolutePath
  }

  const showPagination = mode === 'image' && !nodeBrowseMode && imageTotalPages > 1

  return (
    <>
      <div className="main-footer-meta">
        <span>{primary}</span>
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
