export type FullscreenRatingFeedbackPane = 'image' | 'video'

export interface FullscreenRatingFeedbackDetail {
  grade: number | null
  pane: FullscreenRatingFeedbackPane
}

export const FULLSCREEN_RATING_FEEDBACK_EVENT = 'mpx:fullscreen-rating-feedback'

function isWindowAvailable(): boolean {
  return typeof window !== 'undefined'
}

export function dispatchFullscreenRatingFeedback(
  detail: FullscreenRatingFeedbackDetail,
): void {
  if (!isWindowAvailable()) {
    return
  }

  window.dispatchEvent(
    new CustomEvent<FullscreenRatingFeedbackDetail>(
      FULLSCREEN_RATING_FEEDBACK_EVENT,
      { detail },
    ),
  )
}

export function onFullscreenRatingFeedback(
  listener: (detail: FullscreenRatingFeedbackDetail) => void,
): () => void {
  if (!isWindowAvailable()) {
    return () => undefined
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FullscreenRatingFeedbackDetail>).detail
    if (!detail) {
      return
    }
    const normalizedGrade =
      typeof detail.grade === 'number' && Number.isFinite(detail.grade)
        ? Math.round(detail.grade)
        : null
    const normalizedPane = detail.pane === 'video' ? 'video' : 'image'
    listener({
      grade:
        normalizedGrade === null
          ? null
          : Math.max(1, Math.min(5, normalizedGrade)),
      pane: normalizedPane,
    })
  }

  window.addEventListener(FULLSCREEN_RATING_FEEDBACK_EVENT, handler)
  return () => {
    window.removeEventListener(FULLSCREEN_RATING_FEEDBACK_EVENT, handler)
  }
}
