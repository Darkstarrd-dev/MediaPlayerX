import { describe, expect, it } from 'vitest'

import { buildA11yProps } from './a11y'

describe('buildA11yProps', () => {
  it('returns stable data-a11y-id and aria-label', () => {
    const props = buildA11yProps({
      id: 'header.search',
      labelKey: 'a11y.header.search',
      t: (key) => `translated:${key}`,
    })

    expect(props).toEqual({
      'data-a11y-id': 'header.search',
      'aria-label': 'translated:a11y.header.search',
    })
  })

  it('includes title when titleKey exists', () => {
    const props = buildA11yProps({
      id: 'header.settings',
      labelKey: 'a11y.header.settings',
      titleKey: 'tip.header.settings',
      t: (key) => `translated:${key}`,
    })

    expect(props.title).toBe('translated:tip.header.settings')
  })
})
