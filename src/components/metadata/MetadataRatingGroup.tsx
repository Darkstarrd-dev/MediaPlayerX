import { useI18n } from '../../i18n/useI18n'
import { RatingFavoriteControl } from './RatingFavoriteControl'

interface MetadataRatingGroupProps {
  title: string
  groupAriaLabel: string
  clearAriaLabel: string
  value: number | null
  pending: boolean
  onChange: (next: number | null) => void
}

export function MetadataRatingGroup({
  title,
  groupAriaLabel,
  clearAriaLabel,
  value,
  pending,
  onChange,
}: MetadataRatingGroupProps) {
  const { t } = useI18n()

  return (
    <div className="feature-rating-group metadata-rating-group">
      <strong>{title}</strong>
      <div
        className="metadata-rating-clear-zone"
        role="button"
        tabIndex={0}
        aria-label={clearAriaLabel}
        onMouseDown={(event) => {
          if (pending || event.button !== 0) {
            return
          }

          const target = event.target as HTMLElement
          if (target.closest('.metadata-rating-stars')) {
            return
          }

          onChange(null)
        }}
        onKeyDown={(event) => {
          if (pending) {
            return
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onChange(null)
          }
        }}
      >
        <div className="metadata-rating-stars-wrap">
          <RatingFavoriteControl
            className="metadata-rating-stars"
            groupAriaLabel={groupAriaLabel}
            value={value}
            pending={pending}
            allowDrag
            evaluationLabel={t('ui.metadata.ratingEvaluationLabel')}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  )
}
