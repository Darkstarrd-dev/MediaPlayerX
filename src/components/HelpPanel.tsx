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

type HelpSectionId = 'image' | 'fullscreen'

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
        key: 'image-mode-switch',
        shortcut: t('ui.help.image.keyboard.fixedModeSwitchShortcut'),
        action: t('ui.help.image.keyboard.modeSwitchF1F3'),
      },
      {
        key: 'image-panel-switch',
        shortcut: t('ui.help.image.keyboard.fixedPanelSwitchShortcut'),
        action: t('ui.help.image.keyboard.panelSwitchCtrl1Ctrl3'),
      },
      {
        key: 'image-series-jump-switch',
        shortcut: t('ui.help.image.keyboard.fixedSeriesJumpShortcut'),
        action: t('ui.help.image.keyboard.seriesJumpCtrlF1F3'),
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
      {
        key: 'video-playlist-add',
        shortcut: renderShortcutBinding(shortcuts.videoPlaylistAdd, t('ui.help.shortcutNotSet')),
        action: t('ui.help.image.keyboard.videoPlaylistAdd'),
      },
      {
        key: 'video-playlist-remove',
        shortcut: renderShortcutBinding(shortcuts.videoPlaylistRemove, t('ui.help.shortcutNotSet')),
        action: t('ui.help.image.keyboard.videoPlaylistRemove'),
      },
      {
        key: 'manage-organize',
        shortcut: renderShortcutBinding(shortcuts.manageOrganize, t('ui.help.shortcutNotSet')),
        action: t('ui.help.image.keyboard.manageOrganize'),
      },
    ],
    [shortcuts, t],
  )

  const fullscreenShortcutRows = useMemo(
    () => [
      {
        key: 'fullscreen-left-right',
        shortcut: renderShortcutBinding(shortcuts.imagePrev, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.arrowLeftRight'),
      },
      {
        key: 'fullscreen-up-down',
        shortcut: `${renderShortcutBinding(shortcuts.imageFirst, t('ui.help.shortcutNotSet'))} / ${renderShortcutBinding(shortcuts.imageLast, t('ui.help.shortcutNotSet'))}`,
        action: t('ui.help.fullscreen.keyboard.arrowUpDown'),
      },
      {
        key: 'fullscreen-package-prev-next',
        shortcut: `${renderShortcutBinding(shortcuts.packagePrev, t('ui.help.shortcutNotSet'))} / ${renderShortcutBinding(shortcuts.packageNext, t('ui.help.shortcutNotSet'))}`,
        action: t('ui.help.fullscreen.keyboard.packagePrevNext'),
      },
      {
        key: 'fullscreen-align',
        shortcut: [
          renderShortcutBinding(shortcuts.alignUp, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.alignDown, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.alignLeft, t('ui.help.shortcutNotSet')),
          renderShortcutBinding(shortcuts.alignRight, t('ui.help.shortcutNotSet')),
        ].join(' / '),
        action: t('ui.help.fullscreen.keyboard.align'),
      },
      {
        key: 'fullscreen-focus-switch',
        shortcut: renderShortcutBinding(shortcuts.focusSwitch, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.focusSwitch'),
      },
      {
        key: 'fullscreen-toggle',
        shortcut: renderShortcutBinding(shortcuts.fullscreenToggle, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.toggleFullscreen'),
      },
      {
        key: 'fullscreen-escape',
        shortcut: 'Escape',
        action: t('ui.help.fullscreen.keyboard.escapeExit'),
      },
      {
        key: 'fullscreen-tab-dual',
        shortcut: 'Tab',
        action: t('ui.help.fullscreen.keyboard.tabDualFocusSwitch'),
      },
      {
        key: 'fullscreen-autoplay-toggle',
        shortcut: renderShortcutBinding(shortcuts.autoplayToggle, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.autoplayToggle'),
      },
      {
        key: 'fullscreen-video-seek-short',
        shortcut: `${renderShortcutBinding(shortcuts.videoSeekBackwardShort, t('ui.help.shortcutNotSet'))} / ${renderShortcutBinding(shortcuts.videoSeekForwardShort, t('ui.help.shortcutNotSet'))}`,
        action: t('ui.help.fullscreen.keyboard.videoSeekShort'),
      },
      {
        key: 'fullscreen-video-play-pause',
        shortcut: renderShortcutBinding(shortcuts.videoPlayPause, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.videoPlayPause'),
      },
      {
        key: 'fullscreen-video-seek-long',
        shortcut: `${renderShortcutBinding(shortcuts.videoSeekBackwardLong, t('ui.help.shortcutNotSet'))} / ${renderShortcutBinding(shortcuts.videoSeekForwardLong, t('ui.help.shortcutNotSet'))}`,
        action: t('ui.help.fullscreen.keyboard.videoSeekLong'),
      },
      {
        key: 'fullscreen-video-seek-frame',
        shortcut: `${renderShortcutBinding(shortcuts.videoSeekBackwardFrame, t('ui.help.shortcutNotSet'))} / ${renderShortcutBinding(shortcuts.videoSeekForwardFrame, t('ui.help.shortcutNotSet'))}`,
        action: t('ui.help.fullscreen.keyboard.videoSeekFrame'),
      },
      {
        key: 'fullscreen-video-volume',
        shortcut: `${renderShortcutBinding(shortcuts.videoVolumeUp, t('ui.help.shortcutNotSet'))} / ${renderShortcutBinding(shortcuts.videoVolumeDown, t('ui.help.shortcutNotSet'))}`,
        action: t('ui.help.fullscreen.keyboard.videoVolumeStep'),
      },
      {
        key: 'fullscreen-video-mute',
        shortcut: renderShortcutBinding(shortcuts.videoMute, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.videoMuteToggle'),
      },
      {
        key: 'fullscreen-video-prev-next',
        shortcut: `${renderShortcutBinding(shortcuts.videoPrev, t('ui.help.shortcutNotSet'))} / ${renderShortcutBinding(shortcuts.videoNext, t('ui.help.shortcutNotSet'))}`,
        action: t('ui.help.fullscreen.keyboard.videoPrevNext'),
      },
      {
        key: 'fullscreen-video-save-cover',
        shortcut: renderShortcutBinding(shortcuts.videoSaveCover, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.videoSaveCover'),
      },
      {
        key: 'fullscreen-video-subtitle',
        shortcut: renderShortcutBinding(shortcuts.videoSubtitleToggle, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.videoSubtitleToggle'),
      },
      {
        key: 'fullscreen-video-fit-cycle',
        shortcut: renderShortcutBinding(shortcuts.videoFitCycle, t('ui.help.shortcutNotSet')),
        action: t('ui.help.fullscreen.keyboard.videoFitCycle'),
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
            <button
              type="button"
              className={activeSection === 'fullscreen' ? 'is-active' : ''}
              onClick={() => setActiveSection('fullscreen')}
            >
              {t('ui.help.section.fullscreen')}
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

            {activeSection === 'fullscreen' ? (
              <section className="settings-block help-block">
                <p className="settings-group-head">{t('ui.help.fullscreen.sectionTitle')}</p>

                <div className="settings-group">
                  <p className="help-group-title">{t('ui.help.fullscreen.groupMouse')}</p>
                  <ul className="help-list" aria-label={t('a11y.help.fullscreenMouseList')}>
                    <li>{t('ui.help.fullscreen.mouse.wheelStepMedia')}</li>
                    <li>{t('ui.help.fullscreen.mouse.ctrlWheelZoom')}</li>
                    <li>{t('ui.help.fullscreen.mouse.dragPanImage')}</li>
                    <li>{t('ui.help.fullscreen.mouse.dragVideoDual')}</li>
                    <li>{t('ui.help.fullscreen.mouse.clickPaneFocus')}</li>
                    <li>{t('ui.help.fullscreen.mouse.dragSplitDivider')}</li>
                    <li>{t('ui.help.fullscreen.mouse.moveBottomShowFooter')}</li>
                  </ul>
                </div>

                <div className="settings-group">
                  <p className="help-group-title">{t('ui.help.fullscreen.groupKeyboard')}</p>
                  <ul className="help-list" aria-label={t('a11y.help.fullscreenKeyboardList')}>
                    {fullscreenShortcutRows.map((row) => (
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
