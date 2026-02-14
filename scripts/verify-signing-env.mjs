const REQUIRED_SIGNING_ENV_KEYS = [
  ['WIN_CSC_LINK', 'CSC_LINK'],
  ['WIN_CSC_KEY_PASSWORD', 'CSC_KEY_PASSWORD'],
]

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function resolveMissingKeys() {
  const missing = []
  for (const aliases of REQUIRED_SIGNING_ENV_KEYS) {
    const found = aliases.some((key) => hasValue(process.env[key]))
    if (!found) {
      missing.push(aliases.join(' or '))
    }
  }
  return missing
}

export function verifySigningEnvironment() {
  const missing = resolveMissingKeys()
  if (missing.length === 0) {
    return
  }

  throw new Error(
    [
      'Windows signing env is incomplete.',
      `Missing: ${missing.join(', ')}`,
      'Expected certificate env can be file path or base64/data-url link (electron-builder standard).',
    ].join(' '),
  )
}

const currentFilePath = fileURLToPath(import.meta.url)
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null

if (entryFilePath && path.resolve(currentFilePath) === entryFilePath) {
  try {
    verifySigningEnvironment()
    console.log('[signing] environment check passed')
  } catch (error) {
    console.error(`[signing] ${(error instanceof Error ? error.message : String(error))}`)
    process.exit(1)
  }
}
import path from 'node:path'
import { fileURLToPath } from 'node:url'
