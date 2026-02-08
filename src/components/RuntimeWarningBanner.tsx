interface RuntimeWarningItem {
  capability: string
  status: 'available' | 'degraded' | 'unavailable'
  note: string
}

interface RuntimeWarningBannerProps {
  visible: boolean
  warnings: RuntimeWarningItem[]
  onDismiss: () => void
}

function RuntimeWarningBanner({ visible, warnings, onDismiss }: RuntimeWarningBannerProps) {
  if (!visible) {
    return null
  }

  return (
    <section className="runtime-warning-banner" role="status" aria-live="polite">
      <header>
        <strong>运行时降级策略已生效</strong>
        <button type="button" onClick={onDismiss}>
          忽略此告警
        </button>
      </header>
      <ul>
        {warnings.map((item) => (
          <li key={item.capability}>
            <span>{`${item.capability} (${item.status})`}</span>
            <span>{item.note}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RuntimeWarningBanner
