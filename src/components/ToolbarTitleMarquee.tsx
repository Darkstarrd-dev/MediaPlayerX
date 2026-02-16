import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

interface ToolbarTitleMarqueeProps {
  text: string
  className?: string
}

export function ToolbarTitleMarquee({ text, className = 'main-toolbar-title' }: ToolbarTitleMarqueeProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null)
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
    () => ({ '--mpx-main-toolbar-marquee-duration': `${Math.max(8, Math.min(30, Math.round(text.length * 0.22)))}s` }) as CSSProperties,
    [text.length],
  )

  return (
    <strong className={className} title={text}>
      <span className={`main-toolbar-title-marquee ${overflowing ? 'is-overflow' : ''}`} ref={hostRef} style={marqueeStyle}>
        <span className="main-toolbar-title-marquee-item" ref={textRef}>{text}</span>
        {overflowing ? <span aria-hidden="true" className="main-toolbar-title-marquee-item">{text}</span> : null}
      </span>
    </strong>
  )
}
