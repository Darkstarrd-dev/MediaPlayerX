import { MainUiIcon } from './MainUiIcon'
import { buildA11yProps } from '../i18n/a11y'
import { useI18n } from '../i18n/useI18n'

export interface HelpPanelProps {
  helpOpen: boolean
  settingsFontSize: number
  onClose: () => void
}

function HelpPanel({ helpOpen, settingsFontSize, onClose }: HelpPanelProps) {
  const { t } = useI18n()

  if (!helpOpen) {
    return null
  }

  const helpPanelA11y = buildA11yProps({
    id: 'help.panel',
    labelKey: 'a11y.help.panel',
    t,
  })
  const helpCloseA11y = buildA11yProps({
    id: 'help.close',
    labelKey: 'a11y.help.close',
    titleKey: 'tip.help.close',
    t,
  })

  return (
    <div {...helpPanelA11y} className="settings-mask" role="dialog" aria-modal="true" data-overlay-close="help">
      <section className="settings-panel" style={{ fontSize: `${settingsFontSize}px` }}>
        <div className="settings-head">
          <span className="settings-head-spacer" aria-hidden="true" />
          <h2>{t('ui.help.panel')}</h2>
          <button {...helpCloseA11y} className="settings-icon-btn main-icon-square-btn" type="button" onClick={onClose}>
            <MainUiIcon name="close" />
          </button>
        </div>

        <div className="settings-shell">
          <main className="settings-main">
            <section className="settings-section">
              <p className="settings-placeholder">{t('ui.help.placeholder')}</p>
            </section>
          </main>
        </div>
      </section>
    </div>
  )
}

export default HelpPanel
