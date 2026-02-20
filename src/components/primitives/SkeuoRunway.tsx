import type {
  ChangeEventHandler,
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  TouchEventHandler,
} from 'react'

type SkeuoRunwayFillTone = 'gold' | 'graphite'
type SkeuoRunwayThumbTone = 'pearl' | 'graphite'

interface SkeuoRunwayProps {
  ariaLabel: string
  value: number
  min: number
  max: number
  step: number
  rangePercent: number
  className?: string
  inputClassName?: string
  fillTone?: SkeuoRunwayFillTone
  thumbTone?: SkeuoRunwayThumbTone
  style?: CSSProperties
  onChange: ChangeEventHandler<HTMLInputElement>
  onMouseUp?: MouseEventHandler<HTMLInputElement>
  onTouchEnd?: TouchEventHandler<HTMLInputElement>
  onBlur?: FocusEventHandler<HTMLInputElement>
  onKeyUp?: KeyboardEventHandler<HTMLInputElement>
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

export function SkeuoRunway({
  ariaLabel,
  value,
  min,
  max,
  step,
  rangePercent,
  className,
  inputClassName,
  fillTone = 'gold',
  thumbTone = 'pearl',
  style,
  onChange,
  onMouseUp,
  onTouchEnd,
  onBlur,
  onKeyUp,
}: SkeuoRunwayProps) {
  const clampedPercent = Math.max(0, Math.min(100, rangePercent))
  const runwayStyle = {
    ...(style ?? {}),
    '--mpx-skeuo-range-pct': `${clampedPercent}%`,
  } as CSSProperties

  return (
    <div
      className={joinClassNames(
        'mpx-runway',
        fillTone === 'graphite' ? 'is-fill-graphite' : 'is-fill-gold',
        thumbTone === 'graphite' ? 'is-thumb-graphite' : 'is-thumb-pearl',
        className,
      )}
      style={runwayStyle}
    >
      <input
        aria-label={ariaLabel}
        className={joinClassNames('mpx-runway-input', inputClassName)}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={onChange}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        onBlur={onBlur}
        onKeyUp={onKeyUp}
      />
      <div className="mpx-runway-groove" aria-hidden="true" />
      <div className="mpx-runway-fill" aria-hidden="true" />
      <div className="mpx-runway-thumb" aria-hidden="true">
        <div className="mpx-runway-thumb-core" />
      </div>
    </div>
  )
}
