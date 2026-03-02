import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'

import { useI18n } from '../../i18n/useI18n'
import { useRandomSweepAnimation } from '../useRandomSweepAnimation'

interface RatingMaterialIds {
  recessedGradient: string
  recessedFilter: string
  grayGradient: string
  ironGradient: string
  bronzeGradient: string
  bronzeFilter: string
  silverGradient: string
  silverFilter: string
  goldGradient: string
  goldFilter: string
  heartGradient: string
  heartFilter: string
}

interface RatingFavoriteControlProps {
  className?: string
  groupAriaLabel: string
  value: number | null
  pending?: boolean
  allowDrag?: boolean
  toggleScoreOnRepeat?: boolean
  evaluationLabel: string
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

function buildRatingMaterialIds(prefix: string): RatingMaterialIds {
  return {
    recessedGradient: `${prefix}-grad-recessed`,
    recessedFilter: `${prefix}-filter-recessed`,
    grayGradient: `${prefix}-grad-gray`,
    ironGradient: `${prefix}-grad-iron`,
    bronzeGradient: `${prefix}-grad-bronze`,
    bronzeFilter: `${prefix}-filter-bronze`,
    silverGradient: `${prefix}-grad-silver`,
    silverFilter: `${prefix}-filter-silver`,
    goldGradient: `${prefix}-grad-pure-gold`,
    goldFilter: `${prefix}-filter-pure-gold`,
    heartGradient: `${prefix}-grad-heart`,
    heartFilter: `${prefix}-filter-heart`,
  }
}

function RatingMaterialDefs({ ids }: { ids: RatingMaterialIds }) {
  return (
    <svg width="0" height="0" aria-hidden="true" className="feature-rating-material-defs">
      <defs>
        <linearGradient id={ids.recessedGradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8e5df" />
          <stop offset="100%" stopColor="#f5f3ef" />
        </linearGradient>

        <filter id={ids.recessedFilter} x="-100%" y="-100%" width="300%" height="300%">
          <feOffset dx="1" dy="1" />
          <feGaussianBlur stdDeviation="2" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="#d1ccc0" floodOpacity="0.8" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>

        <linearGradient id={ids.grayGradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d6d3d1" />
          <stop offset="100%" stopColor="#a8a29e" />
        </linearGradient>

        <linearGradient id={ids.ironGradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        <linearGradient id={ids.bronzeGradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        <filter id={ids.bronzeFilter} x="-100%" y="-100%" width="300%" height="300%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#78350f" floodOpacity="0.3" result="shadow" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
          <feSpecularLighting in="blur" surfaceScale="0.8" specularConstant="0.5" specularExponent="15" lightingColor="#ffffff" result="specOut">
            <fePointLight x="-10" y="-10" z="30" />
          </feSpecularLighting>
          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
          <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="litPaint" />
          </feMerge>
        </filter>

        <linearGradient id={ids.silverGradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <filter id={ids.silverFilter} x="-100%" y="-100%" width="300%" height="300%">
          <feDropShadow dx="1" dy="4" stdDeviation="2" floodColor="#64748b" floodOpacity="0.3" result="shadow" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
          <feSpecularLighting in="blur" surfaceScale="1.5" specularConstant="0.8" specularExponent="25" lightingColor="#ffffff" result="specOut">
            <fePointLight x="-10" y="-10" z="40" />
          </feSpecularLighting>
          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
          <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="litPaint" />
          </feMerge>
        </filter>

        <linearGradient id={ids.goldGradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffdef" />
          <stop offset="25%" stopColor="#ffda54" />
          <stop offset="50%" stopColor="#e4aa1a" />
          <stop offset="75%" stopColor="#ffda54" />
          <stop offset="100%" stopColor="#9b6800" />
        </linearGradient>

        <filter id={ids.goldFilter} x="-100%" y="-100%" width="300%" height="300%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#8c5e00" floodOpacity="0.18" result="shadow1" />
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#543800" floodOpacity="0.12" result="shadow2" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
          <feSpecularLighting in="blur" surfaceScale="2.5" specularConstant="1.5" specularExponent="40" lightingColor="#ffffff" result="specOut">
            <fePointLight x="-10" y="-20" z="50" />
          </feSpecularLighting>
          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
          <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
          <feMerge>
            <feMergeNode in="shadow1" />
            <feMergeNode in="shadow2" />
            <feMergeNode in="litPaint" />
          </feMerge>
        </filter>

        <linearGradient id={ids.heartGradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f4d8de" />
          <stop offset="30%" stopColor="#b94a61" />
          <stop offset="70%" stopColor="#8f1d3e" />
          <stop offset="100%" stopColor="#5f1028" />
        </linearGradient>

        <filter id={ids.heartFilter} x="-100%" y="-100%" width="300%" height="300%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.2" floodColor="#9f1239" floodOpacity="0.2" result="shadow1" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
          <feSpecularLighting in="blur" surfaceScale="1.6" specularConstant="0.9" specularExponent="22" lightingColor="#ffffff" result="specOut">
            <fePointLight x="-8" y="-12" z="36" />
          </feSpecularLighting>
          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
          <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
          <feMerge>
            <feMergeNode in="shadow1" />
            <feMergeNode in="litPaint" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}

function RatingStarLayer({
  materialLevel,
  ids,
}: {
  materialLevel: number
  ids: RatingMaterialIds
}) {
  const starPath = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

  const isRecessed = materialLevel === 0
  const isLevel1 = materialLevel === 1
  const isLevel2 = materialLevel === 2
  const isLevel3 = materialLevel === 3
  const isLevel4 = materialLevel === 4
  const isLevel5 = materialLevel === 5

  return (
    <span className="feature-rating-star-layer">
      <svg viewBox="0 0 24 24" className={`feature-rating-star-svg feature-rating-star-svg-recessed ${isRecessed ? 'is-visible' : ''}`}>
        <path d={starPath} fill={`url(#${ids.recessedGradient})`} filter={`url(#${ids.recessedFilter})`} />
      </svg>

      <svg viewBox="0 0 24 24" className={`feature-rating-star-svg feature-rating-star-svg-l1 ${isLevel1 ? 'is-visible' : ''}`}>
        <path d={starPath} fill={`url(#${ids.grayGradient})`} />
      </svg>

      <svg viewBox="0 0 24 24" className={`feature-rating-star-svg feature-rating-star-svg-l2 ${isLevel2 ? 'is-visible' : ''}`}>
        <path d={starPath} fill={`url(#${ids.ironGradient})`} />
      </svg>

      <svg viewBox="0 0 24 24" className={`feature-rating-star-svg feature-rating-star-svg-l3 ${isLevel3 ? 'is-visible' : ''}`}>
        <path d={starPath} fill={`url(#${ids.bronzeGradient})`} filter={`url(#${ids.bronzeFilter})`} />
      </svg>

      <svg viewBox="0 0 24 24" className={`feature-rating-star-svg feature-rating-star-svg-l4 ${isLevel4 ? 'is-visible' : ''}`}>
        <path d={starPath} fill={`url(#${ids.silverGradient})`} filter={`url(#${ids.silverFilter})`} />
      </svg>

      <svg viewBox="0 0 24 24" className={`feature-rating-star-svg feature-rating-star-svg-l5 ${isLevel5 ? 'is-visible' : ''}`}>
        <path d={starPath} fill={`url(#${ids.goldGradient})`} filter={`url(#${ids.goldFilter})`} />
      </svg>
    </span>
  )
}

export function RatingFavoriteControl({
  className,
  groupAriaLabel,
  value,
  pending = false,
  allowDrag = false,
  toggleScoreOnRepeat = false,
  evaluationLabel,
  onChange,
}: RatingFavoriteControlProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(value !== null)
  const [localValue, setLocalValue] = useState<number | null>(value)
  const [hoverRating, setHoverRating] = useState(0)
  const [dragging, setDragging] = useState(false)
  const previousValueRef = useRef<number | null>(value)
  const lastDragScoreRef = useRef<number | null>(null)

  const rawId = useId()
  const idPrefix = useMemo(() => `mpx-rating-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId])
  const materialIds = useMemo(() => buildRatingMaterialIds(idPrefix), [idPrefix])

  useEffect(() => {
    setLocalValue(value)
    if (value !== null) {
      setExpanded(true)
    }
    if (value === null && previousValueRef.current !== null) {
      setExpanded(false)
    }
    previousValueRef.current = value
  }, [value])

  useEffect(() => {
    if (!dragging) {
      return
    }
    const stopDragging = () => {
      setDragging(false)
    }
    window.addEventListener('mouseup', stopDragging)
    return () => {
      window.removeEventListener('mouseup', stopDragging)
    }
  }, [dragging])

  const selectedValue = localValue
  const activeRating = hoverRating > 0 ? hoverRating : selectedValue ?? 0
  const sweepingEnabled = (selectedValue ?? 0) >= 4
  const { sweeping: starSweeping, onAnimationEnd: handleStarSweepAnimationEnd } =
    useRandomSweepAnimation({
      enabled: sweepingEnabled,
      animationName: 'mpx-rating-sheen-horizontal',
      initialDelayRangeMs: [120, 420],
      repeatDelayRangeMs: [1800, 4200],
    })

  const commitScore = (nextScore: number | null, mode: 'click' | 'drag') => {
    if (pending) {
      return
    }
    if (mode === 'drag') {
      if (lastDragScoreRef.current === nextScore) {
        return
      }
      lastDragScoreRef.current = nextScore
    }
    setLocalValue(nextScore)
    onChange(nextScore)
  }

  const handleHeartToggle = () => {
    if (pending) {
      return
    }
    if (expanded) {
      setExpanded(false)
      setLocalValue(null)
      setHoverRating(0)
      onChange(null)
      return
    }
    setExpanded(true)
    setLocalValue(null)
  }

  const heartAriaLabel = expanded
    ? t('a11y.metadata.favoriteDisableWithGroup', { group: groupAriaLabel })
    : t('a11y.metadata.favoriteEnableWithGroup', { group: groupAriaLabel })

  const heartPath =
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

  return (
    <div className={`feature-rating-stars ${className ?? ''}`.trim()} role="group" aria-label={groupAriaLabel}>
      <RatingMaterialDefs ids={materialIds} />

      <button
        aria-label={heartAriaLabel}
        data-tooltip-label={heartAriaLabel}
        aria-pressed={expanded}
        className={`feature-rating-heart ${expanded ? 'is-active' : ''}`}
        type="button"
        disabled={pending}
        onClick={handleHeartToggle}
      >
        <span className="feature-rating-heart-layer" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="feature-rating-heart-svg feature-rating-heart-svg-outline">
            <path d={heartPath} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg viewBox="0 0 24 24" className="feature-rating-heart-svg feature-rating-heart-svg-fill">
            <path d={heartPath} fill={`url(#${materialIds.heartGradient})`} filter={`url(#${materialIds.heartFilter})`} />
          </svg>
        </span>
      </button>

      {expanded ? (
        <>
          <span className="feature-rating-evaluation-label">{evaluationLabel}</span>

          <div
            className={`feature-rating-star-buttons ${sweepingEnabled && starSweeping ? 'is-sweeping' : ''}`}
            style={{ '--mpx-rating-active-count': String(selectedValue ?? 0) } as CSSProperties}
            onAnimationEnd={(event) => {
              if (event.animationName !== 'mpx-rating-sheen-horizontal') {
                return
              }
              handleStarSweepAnimationEnd(event)
            }}
            onMouseDown={(event) => {
              if (!allowDrag || pending || event.button !== 0) {
                return
              }
              event.preventDefault()
              const score = resolveRatingByClientX(event.clientX, event.currentTarget)
              lastDragScoreRef.current = null
              commitScore(score, 'drag')
              setDragging(true)
            }}
            onMouseMove={(event) => {
              if (!allowDrag || !dragging || pending) {
                return
              }
              const score = resolveRatingByClientX(event.clientX, event.currentTarget)
              commitScore(score, 'drag')
            }}
            onMouseUp={() => {
              setDragging(false)
              lastDragScoreRef.current = null
            }}
            onMouseLeave={() => {
              setDragging(false)
              lastDragScoreRef.current = null
              setHoverRating(0)
            }}
          >
            <span className="feature-rating-star-sheen-overlay" aria-hidden="true">
              <span className="feature-rating-star-sheen-beam" />
            </span>

            {[1, 2, 3, 4, 5].map((score) => {
              const isSelected = selectedValue !== null && score <= selectedValue
              const materialLevel = score <= activeRating ? activeRating : 0
              return (
                <button
                  key={score}
                  aria-label={t('a11y.metadata.ratingStarsWithGroup', {
                    group: groupAriaLabel,
                    score,
                  })}
                  data-tooltip-label={t('a11y.metadata.ratingStarsWithGroup', {
                    group: groupAriaLabel,
                    score,
                  })}
                  aria-pressed={selectedValue === score}
                  className={`feature-rating-star-btn ${isSelected ? 'is-active' : ''}`}
                  type="button"
                  disabled={pending}
                  onMouseEnter={() => {
                    setHoverRating(score)
                    if (allowDrag && dragging) {
                      commitScore(score, 'drag')
                    }
                  }}
                  onClick={(event) => {
                    if (pending) {
                      return
                    }
                    if (allowDrag && event.detail > 0) {
                      return
                    }
                    if (toggleScoreOnRepeat && selectedValue === score) {
                      commitScore(null, 'click')
                      return
                    }
                    if (!toggleScoreOnRepeat && selectedValue === score) {
                      return
                    }
                    commitScore(score, 'click')
                  }}
                >
                  <RatingStarLayer materialLevel={materialLevel} ids={materialIds} />
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
