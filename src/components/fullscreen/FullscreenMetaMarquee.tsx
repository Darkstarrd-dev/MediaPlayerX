import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

interface FullscreenMetaMarqueeProps {
  text: string
}

export function FullscreenMetaMarquee({ text }: FullscreenMetaMarqueeProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const hostElement = hostRef.current
    const textElement = textRef.current
    if (!hostElement || !textElement) {
      return
    }

    const updateOverflowState = () => {
      setOverflowing(textElement.scrollWidth > hostElement.clientWidth)
    }

    updateOverflowState()
    window.addEventListener('resize', updateOverflowState)

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => updateOverflowState())
      : null
    if (resizeObserver) {
      resizeObserver.observe(hostElement)
      resizeObserver.observe(textElement)
    }

    return () => {
      window.removeEventListener('resize', updateOverflowState)
      resizeObserver?.disconnect()
    }
  }, [text])

  const marqueeStyle = useMemo(
    () => ({ '--mpx-fullscreen-marquee-duration': `${Math.max(8, Math.min(30, Math.round(text.length * 0.24)))}s` }) as CSSProperties,
    [text.length],
  )

  return (
    <div className={`fullscreen-meta-marquee ${overflowing ? 'is-overflow' : ''}`} ref={hostRef} style={marqueeStyle}>
      <span className="fullscreen-meta-marquee-item" ref={textRef}>{text}</span>
      {overflowing ? <span aria-hidden="true" className="fullscreen-meta-marquee-item">{text}</span> : null}
    </div>
  )
}
