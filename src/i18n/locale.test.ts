import { describe, expect, it } from 'vitest'

import { resolveActiveLocale, resolveSupportedLocale } from './locale'

describe('i18n locale resolver', () => {
  it('resolves explicit locale preference directly', () => {
    expect(resolveActiveLocale('zh-CN', 'en-US')).toBe('zh-CN')
    expect(resolveActiveLocale('en-US', 'zh-CN')).toBe('en-US')
  })

  it('resolves auto locale from browser locale', () => {
    expect(resolveActiveLocale('auto', 'zh-CN')).toBe('zh-CN')
    expect(resolveActiveLocale('auto', 'en-US')).toBe('en-US')
  })

  it('normalizes browser locale formats before matching', () => {
    expect(resolveSupportedLocale('ZH_cn')).toBe('zh-CN')
    expect(resolveSupportedLocale('en_us')).toBe('en-US')
  })

  it('falls back by language code when exact locale is unsupported', () => {
    expect(resolveSupportedLocale('zh-HK')).toBe('zh-CN')
    expect(resolveSupportedLocale('en-GB')).toBe('en-US')
  })

  it('returns default locale when value is missing or unknown', () => {
    expect(resolveSupportedLocale(undefined)).toBe('zh-CN')
    expect(resolveSupportedLocale('')).toBe('zh-CN')
    expect(resolveSupportedLocale('fr-FR')).toBe('zh-CN')
  })
})
