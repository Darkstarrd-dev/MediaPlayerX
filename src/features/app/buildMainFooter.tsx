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
  void nodeBrowseMode
  let primary = sidebarFocusedPath ?? '-'

  if (mode === 'image' && (focusedImagePackage || focusedImage)) {
    primary = focusedImagePackage?.absolutePath ?? primary
  }

  if (mode === 'video' && focusedVideo) {
    primary = focusedVideo.absolutePath
  }

  if (mode === 'music' && focusedAudio) {
    primary = focusedAudio.mediaLocator.kind === 'filesystem' ? focusedAudio.mediaLocator.absolutePath : focusedAudio.absolutePath
  }

  const showPagination = (mode === 'image' || (mode === 'video' && nodeBrowseMode)) && imageTotalPages > 1

  return (
    <>
      <div className="main-footer-meta" data-slot="fg-main-footer-meta">
        <span>{primary}</span>
      </div>

      {showPagination ? (
        <div className="main-footer-pagination" data-slot="fg-main-footer-pagination">
          <button
            className="toolbar-icon-btn"
            type="button"
            aria-label={translate('a11y.common.prevPage')}
            data-tooltip-label={translate('tip.common.prevPage')}
            onClick={onPrevPage}
          >
            <VideoControlIcon className="main-ui-icon" name="prev" />
          </button>
          <span>{translate('ui.footer.pageSummary', { current: normalizedPageIndex + 1, total: imageTotalPages })}</span>
          <button
            className="toolbar-icon-btn"
            type="button"
            aria-label={translate('a11y.common.nextPage')}
            data-tooltip-label={translate('tip.common.nextPage')}
            onClick={onNextPage}
          >
            <VideoControlIcon className="main-ui-icon" name="next" />
          </button>
        </div>
      ) : null}
    </>
  )
}
