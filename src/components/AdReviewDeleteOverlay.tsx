import bannerImage from '../assets/banner.png'
import { useI18n } from '../i18n/useI18n'

interface AdReviewDeleteOverlayProps {
  active: boolean
  completedCount: number
  totalCount: number
}

function AdReviewDeleteOverlay({
  active,
  completedCount,
  totalCount,
}: AdReviewDeleteOverlayProps) {
  const { t } = useI18n()

  if (!active) {
    return null
  }

  const normalizedTotal = Number.isFinite(totalCount)
    ? Math.max(0, Math.floor(totalCount))
    : 0
  const normalizedCompleted = Number.isFinite(completedCount)
    ? Math.max(0, Math.floor(completedCount))
    : 0
  const clampedCompleted =
    normalizedTotal > 0
      ? Math.min(normalizedCompleted, normalizedTotal)
      : normalizedCompleted
  const progressPercent =
    normalizedTotal > 0
      ? Math.round((clampedCompleted / normalizedTotal) * 100)
      : 0

  return (
    <div
      className="ad-review-delete-overlay"
      data-slot="fg-main-toolbar-image-delete-progress-ovl"
      role="dialog"
      aria-modal="true"
      aria-label={t('a11y.manage.deleteOverlay')}
    >
      <section className="ad-review-delete-overlay-card">
        <img
          src={bannerImage}
          alt=""
          className="ad-review-delete-overlay-banner"
          loading="eager"
          decoding="sync"
        />
        <div className="ad-review-delete-overlay-content">
          <strong>{t('ui.manage.deleteOverlayTitle')}</strong>
          <p>{t('ui.manage.deleteOverlayDescription')}</p>
          <p className="ad-review-delete-overlay-progress-text">
            {normalizedTotal > 0
              ? t('ui.manage.deleteOverlayProgress', {
                  completed: clampedCompleted,
                  total: normalizedTotal,
                  percent: progressPercent,
                })
              : t('ui.manage.deleteOverlayPreparing')}
          </p>
          <div
            className="ad-review-delete-overlay-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={normalizedTotal > 0 ? normalizedTotal : 100}
            aria-valuenow={normalizedTotal > 0 ? clampedCompleted : progressPercent}
          >
            <span
              className="ad-review-delete-overlay-progress-fill"
              style={{ width: `${normalizedTotal > 0 ? progressPercent : 22}%` }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdReviewDeleteOverlay
