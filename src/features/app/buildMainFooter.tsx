import type { ReactNode } from 'react'

import { VideoControlIcon } from '../../components/VideoControlIcon'
import type { AudioItem, BrowserMode, ImageItem, ImagePackage, VideoItem } from '../../types'

interface BuildMainFooterParams {
  mode: BrowserMode
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  focusedVideo: VideoItem | null
  focusedAudio: AudioItem | null
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
  focusedAudio,
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

  if (mode === 'music' && focusedAudio) {
    primary = focusedAudio.absolutePath
  }

  const showPagination = mode === 'image' && !nodeBrowseMode && imageTotalPages > 1

  return (
    <>
      <div className="main-footer-meta">
        <span>{primary}</span>
      </div>

      {showPagination ? (
        <div className="main-footer-pagination">
          <button className="main-icon-square-btn" type="button" aria-label="上一页" title="上一页" onClick={onPrevPage}>
            <VideoControlIcon className="main-ui-icon" name="prev" />
          </button>
          <span>{`第 ${normalizedPageIndex + 1} / ${imageTotalPages} 页`}</span>
          <button className="main-icon-square-btn" type="button" aria-label="下一页" title="下一页" onClick={onNextPage}>
            <VideoControlIcon className="main-ui-icon" name="next" />
          </button>
        </div>
      ) : null}
    </>
  )
}
