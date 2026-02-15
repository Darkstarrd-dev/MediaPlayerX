import { useState } from 'react'

import { useI18n } from '../../i18n/useI18n'

interface MetadataRatingGroupProps {
  title: string
  groupAriaLabel: string
  clearAriaLabel: string
  value: number | null
  pending: boolean
  onChange: (next: number | null) => void
}

function resolveRatingByClientX(clientX: number, element: HTMLElement): number {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0) {
    return 1
  }
  const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left))
  const ratio = relativeX / rect.width
  const rating = Math.floor(ratio * 5) + 1
  return Math.max(1, Math.min(5, rating))
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
  const [dragging, setDragging] = useState(false)

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
        <div
          className="feature-rating-stars metadata-rating-stars"
          role="group"
          aria-label={groupAriaLabel}
          onMouseDown={(event) => {
            if (pending || event.button !== 0) {
              return
            }
            event.preventDefault()
            const score = resolveRatingByClientX(event.clientX, event.currentTarget)
            onChange(score)
            setDragging(true)
          }}
          onMouseMove={(event) => {
            if (!dragging || pending) {
              return
            }
            const score = resolveRatingByClientX(event.clientX, event.currentTarget)
            onChange(score)
          }}
          onMouseUp={() => {
            setDragging(false)
          }}
          onMouseLeave={() => {
            setDragging(false)
          }}
        >
          <button
            aria-label={t('a11y.metadata.ratingNoneWithGroup', { group: groupAriaLabel })}
            aria-pressed={value === null}
            className={`is-clear ${value === null ? 'is-active' : ''}`}
            type="button"
            disabled={pending}
            onClick={() => {
              onChange(null)
            }}
          >
            ×
          </button>

          {[1, 2, 3, 4, 5].map((score) => {
            const isActive = value !== null && score <= value
            return (
              <button
                key={score}
                aria-label={t('a11y.metadata.ratingStarsWithGroup', { group: groupAriaLabel, score })}
                aria-pressed={value === score}
                className={isActive ? 'is-active' : ''}
                type="button"
                disabled={pending}
                onClick={() => {
                  onChange(score)
                }}
              >
                {isActive ? '★' : '☆'}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
