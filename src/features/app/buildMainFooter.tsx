import type { ReactNode } from 'react'

import { VideoControlIcon } from '../../components/VideoControlIcon'
import type { TranslateFn } from '../../i18n/context'
import type { AudioItem, BrowserMode, ImageItem, ImagePackage, VideoItem } from '../../types'

interface BuildMainFooterParams {
  t?: TranslateFn
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
  t,
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
  const translate: TranslateFn = t ?? ((key) => key)
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
          <button
            className="main-icon-square-btn"
            type="button"
            aria-label={translate('a11y.common.prevPage')}
            title={translate('tip.common.prevPage')}
            onClick={onPrevPage}
          >
            <VideoControlIcon className="main-ui-icon" name="prev" />
          </button>
          <span>{`第 ${normalizedPageIndex + 1} / ${imageTotalPages} 页`}</span>
          <button
            className="main-icon-square-btn"
            type="button"
            aria-label={translate('a11y.common.nextPage')}
            title={translate('tip.common.nextPage')}
            onClick={onNextPage}
          >
            <VideoControlIcon className="main-ui-icon" name="next" />
          </button>
        </div>
      ) : null}
    </>
  )
}
