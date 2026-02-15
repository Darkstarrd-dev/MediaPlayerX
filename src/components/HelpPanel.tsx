import { useMemo, useState } from 'react'

import type { ShortcutMap } from '../shortcuts'
import { MainUiIcon } from './MainUiIcon'
import { buildA11yProps } from '../i18n/a11y'
import { useI18n } from '../i18n/useI18n'

export interface HelpPanelProps {
  helpOpen: boolean
  settingsFontSize: number
  shortcuts: ShortcutMap
  onClose: () => void
}

type HelpSectionId = 'image'

function renderShortcutBinding(binding: string | undefined, fallback: string): string {
  if (!binding || binding.trim().length === 0) {
    return fallback
  }
  return binding
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' / ')
}

function HelpPanel({ helpOpen, settingsFontSize, shortcuts, onClose }: HelpPanelProps) {
  const { t } = useI18n()
  const [activeSection, setActiveSection] = useState<HelpSectionId>('image')

  const imageModeShortcutRows = useMemo(
    () => [
      {
        key: 'image-left-right',
        shortcut: renderShortcutBinding(shortcuts.imagePrev, t('ui.help.shortcutNotSet')),
        action: t('ui.help.image.keyboard.arrowLeftRight'),
      },
      {
        key: 'image-up-down',
        shortcut: `${renderShortcutBinding(shortcuts.imageFirst, t('ui.help.shortcutNotSet'))} / ${renderShortcutBinding(shortcuts.imageLast, t('ui.help.shortcutNotSet'))}`,
        action: t('ui.help.image.keyboard.arrowUpDown'),
      },
      {
        key: 'image-ctrl-left-right',
        shortcut: t('ui.help.image.keyboard.fixedCtrlLeftRightShortcut'),
        action: t('ui.help.image.keyboard.ctrlLeftRight'),
      },
      {
        key: 'image-ctrl-up-down',
        shortcut: t('ui.help.image.keyboard.fixedCtrlUpDownShortcut'),
        action: t('ui.help.image.keyboard.ctrlUpDown'),
      },
      {
        key: 'image-enter-fullscreen',
        shortcut: renderShortcutBinding(shortcuts.enterFullscreen, t('ui.help.shortcutNotSet')),
        action: t('ui.help.image.keyboard.enterFullscreen'),
      },
      {
        key: 'image-toggle-fullscreen',
        shortcut: renderShortcutBinding(shortcuts.fullscreenToggle, t('ui.help.shortcutNotSet')),
        action: t('ui.help.image.keyboard.toggleFullscreen'),
      },
      {
        key: 'image-focus-switch',
        shortcut: renderShortcutBinding(shortcuts.focusSwitch, t('ui.help.shortcutNotSet')),
        action: t('ui.help.image.keyboard.focusSwitch'),
      },
      {
        key: 'image-autoplay-toggle',
        shortcut: renderShortcutBinding(shortcuts.autoplayToggle, t('ui.help.shortcutNotSet')),
        action: t('ui.help.image.keyboard.autoplayToggle'),
      },
      {
        key: 'image-autoplay-interval',
        shortcut: [
          renderShortcutBinding(shortcuts.autoplayInterval1, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.autoplayInterval2, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.autoplayInterval3, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.autoplayInterval4, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.autoplayInterval5, t('ui.help.shortcutNotSet')),
        ].join(' / '),
        action: t('ui.help.image.keyboard.autoplayIntervals'),
      },
      {
        key: 'image-rating',
        shortcut: [
          renderShortcutBinding(shortcuts.rating0, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.rating1, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.rating2, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.rating3, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.rating4, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.rating5, t('ui.help.shortcutNotSet')),
        ].join(' / '),
        action: t('ui.help.image.keyboard.rating'),
      },
    ],
    [shortcuts, t],
  )

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
          <aside className="settings-side" aria-label={t('a11y.help.sections')}>
            <button
              type="button"
              className={activeSection === 'image' ? 'is-active' : ''}
              onClick={() => setActiveSection('image')}
            >
              {t('ui.help.section.image')}
            </button>
          </aside>

          <main className="settings-main">
            {activeSection === 'image' ? (
              <section className="settings-block help-block">
                <p className="settings-group-head">{t('ui.help.image.sectionTitle')}</p>

                <div className="settings-group">
                  <p className="help-group-title">{t('ui.help.image.groupMouse')}</p>
                  <ul className="help-list" aria-label={t('a11y.help.imageMouseList')}>
                    <li>{t('ui.help.image.mouse.clickSelect')}</li>
                    <li>{t('ui.help.image.mouse.doubleClickFullscreen')}</li>
                    <li>{t('ui.help.image.mouse.wheelPage')}</li>
                    <li>{t('ui.help.image.mouse.ctrlWheelSidebar')}</li>
                    <li>{t('ui.help.image.mouse.nodeBrowseClick')}</li>
                    <li>{t('ui.help.image.mouse.manageDragToggle')}</li>
                    <li>{t('ui.help.image.mouse.manageMarquee')}</li>
                  </ul>
                </div>

                <div className="settings-group">
                  <p className="help-group-title">{t('ui.help.image.groupKeyboard')}</p>
                  <ul className="help-list" aria-label={t('a11y.help.imageKeyboardList')}>
                    {imageModeShortcutRows.map((row) => (
                      <li key={row.key} className="help-shortcut-row">
                        <span className="help-shortcut-chip">{row.shortcut}</span>
                        <span>{row.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </section>
    </div>
  )
}

export default HelpPanel
