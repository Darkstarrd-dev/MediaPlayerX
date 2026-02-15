const DEFAULT_ALLOWED_EXTERNAL_URL_HOSTS = ['nhentai.net', 'e-hentai.org', 'exhentai.org']

const LOCALHOST_EXTERNAL_URL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function normalizeHost(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/^\.+/, '')
  return normalized.length > 0 ? normalized : null
}

export function getAllowedExternalUrlHosts(rawAllowlist = process.env.MEDIA_PLAYERX_EXTERNAL_URL_ALLOWLIST): string[] {
  const merged = [...DEFAULT_ALLOWED_EXTERNAL_URL_HOSTS, ...(rawAllowlist ?? '').split(',')]
  const deduped = new Set<string>()

  for (const item of merged) {
    const normalized = normalizeHost(item)
    if (normalized) {
      deduped.add(normalized)
    }
  }

  return [...deduped]
}

function isAllowedHost(hostname: string, allowedHosts: readonly string[]): boolean {
  for (const allowedHost of allowedHosts) {
    if (hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)) {
      return true
    }
  }

  return false
}

export function isExternalUrlAllowed(rawUrl: string, allowedHosts: readonly string[]): boolean {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return false
  }

  const protocol = parsedUrl.protocol.toLowerCase()
  if (protocol !== 'https:' && protocol !== 'http:') {
    return false
  }

  const hostname = normalizeHost(parsedUrl.hostname)
  if (!hostname) {
    return false
  }

  if (LOCALHOST_EXTERNAL_URL_HOSTS.has(hostname)) {
    return true
  }

  if (protocol !== 'https:') {
    return false
  }

  return isAllowedHost(hostname, allowedHosts)
}
