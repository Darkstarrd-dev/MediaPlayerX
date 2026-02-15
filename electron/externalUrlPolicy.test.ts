import { describe, expect, it } from 'vitest'

import { getAllowedExternalUrlHosts, isExternalUrlAllowed } from './externalUrlPolicy'

describe('externalUrlPolicy', () => {
  it('builds allowlist from defaults and env values', () => {
    const allowedHosts = getAllowedExternalUrlHosts('example.com,sub.example.com, .foo.bar ,example.com')

    expect(allowedHosts).toEqual([
      'nhentai.net',
      'e-hentai.org',
      'exhentai.org',
      'example.com',
      'sub.example.com',
      'foo.bar',
    ])
  })

  it('allows https links to allowlisted hosts and subdomains', () => {
    const allowedHosts = getAllowedExternalUrlHosts('example.com')

    expect(isExternalUrlAllowed('https://nhentai.net/g/123', allowedHosts)).toBe(true)
    expect(isExternalUrlAllowed('https://g.e-hentai.org/g/456', allowedHosts)).toBe(true)
    expect(isExternalUrlAllowed('https://sub.example.com/path', allowedHosts)).toBe(true)
  })

  it('allows localhost debug links over http', () => {
    const allowedHosts = getAllowedExternalUrlHosts()

    expect(isExternalUrlAllowed('http://localhost:5173', allowedHosts)).toBe(true)
    expect(isExternalUrlAllowed('http://127.0.0.1:3000', allowedHosts)).toBe(true)
  })

  it('rejects unsafe protocol and non-allowlisted remote hosts', () => {
    const allowedHosts = getAllowedExternalUrlHosts('example.com')

    expect(isExternalUrlAllowed('javascript:alert(1)', allowedHosts)).toBe(false)
    expect(isExternalUrlAllowed('file:///C:/Windows/System32/calc.exe', allowedHosts)).toBe(false)
    expect(isExternalUrlAllowed('http://example.com/path', allowedHosts)).toBe(false)
    expect(isExternalUrlAllowed('https://evil-example.com/path', allowedHosts)).toBe(false)
  })
})
