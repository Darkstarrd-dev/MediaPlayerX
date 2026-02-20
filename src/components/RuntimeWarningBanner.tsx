import { useI18n } from '../i18n/useI18n'

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
  const { t } = useI18n()

  if (!visible) {
    return null
  }

  const resolveStatusLabel = (status: RuntimeWarningItem['status']): string => {
    if (status === 'available') {
      return t('ui.runtimeWarning.status.available')
    }
    if (status === 'degraded') {
      return t('ui.runtimeWarning.status.degraded')
    }
    return t('ui.runtimeWarning.status.unavailable')
  }

  return (
    <section className="runtime-warning-banner" data-slot="fg-sysinfo-runtime-warning" role="status" aria-live="polite">
      <header>
        <strong>{t('ui.runtimeWarning.title')}</strong>
        <button type="button" onClick={onDismiss}>
          {t('ui.runtimeWarning.dismiss')}
        </button>
      </header>
      <ul>
        {warnings.map((item) => (
          <li key={item.capability}>
            <span>{t('ui.runtimeWarning.capabilityStatus', { capability: item.capability, status: resolveStatusLabel(item.status) })}</span>
            <span>{item.note}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RuntimeWarningBanner
