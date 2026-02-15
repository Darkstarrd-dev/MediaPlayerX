import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { resetUiStoreState, useUiStore } from '../store/useUiStore'
import { I18nProvider } from './I18nProvider'
import { useI18n } from './useI18n'

function Probe() {
  const { locale, t } = useI18n()
  return (
    <div data-testid="probe" data-locale={locale}>
      {t('ui.header.search')}
    </div>
  )
}

describe('I18nProvider', () => {
  afterEach(() => {
    act(() => {
      resetUiStoreState()
    })
  })

  it('uses explicit locale preference from settings', () => {
    act(() => {
      useUiStore.getState().updateSettings({ uiLocale: 'en-US' })
    })

    render(
      <I18nProvider browserLocale="zh-CN">
        <Probe />
      </I18nProvider>,
    )

    const probe = screen.getByTestId('probe')
    expect(probe).toHaveAttribute('data-locale', 'en-US')
    expect(probe).toHaveTextContent('Search')
  })

  it('resolves auto locale from browser locale', () => {
    render(
      <I18nProvider browserLocale="en-GB">
        <Probe />
      </I18nProvider>,
    )

    const probe = screen.getByTestId('probe')
    expect(probe).toHaveAttribute('data-locale', 'en-US')
    expect(probe).toHaveTextContent('Search')
  })

  it('reacts to locale changes from store updates', () => {
    render(
      <I18nProvider browserLocale="zh-CN">
        <Probe />
      </I18nProvider>,
    )

    const probe = screen.getByTestId('probe')
    expect(probe).toHaveAttribute('data-locale', 'zh-CN')
    expect(probe).toHaveTextContent('检索')

    act(() => {
      useUiStore.getState().updateSettings({ uiLocale: 'en-US' })
    })

    expect(probe).toHaveAttribute('data-locale', 'en-US')
    expect(probe).toHaveTextContent('Search')
  })

  it('supports template parameters', () => {
    function TemplateProbe() {
      const { t } = useI18n()
      return <div data-testid="template-probe">{t('unknown.template', { count: 3 })}</div>
    }

    render(
      <I18nProvider browserLocale="zh-CN">
        <TemplateProbe />
      </I18nProvider>,
    )

    expect(screen.getByTestId('template-probe')).toHaveTextContent('unknown.template')
  })
})
