import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

const localeFiles = [
  { locale: 'zh-CN', relativePath: 'src/i18n/locales/zh-CN.ts' },
  { locale: 'en-US', relativePath: 'src/i18n/locales/en-US.ts' },
]

function parseCatalogEntries(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const entryPattern = /'([^'\\]+)'\s*:\s*'((?:\\'|[^'])*)'/g
  const entries = new Map()

  for (const match of source.matchAll(entryPattern)) {
    const key = match[1]
    const value = match[2].replace(/\\'/g, "'")
    if (entries.has(key)) {
      throw new Error(`Duplicate key '${key}' in ${filePath}`)
    }
    entries.set(key, value)
  }

  if (entries.size === 0) {
    throw new Error(`Unable to parse catalog entries in ${filePath}`)
  }

  return entries
}

function fail(lines) {
  for (const line of lines) {
    console.error(line)
  }
  process.exit(1)
}

const parsedCatalogs = localeFiles.map(({ locale, relativePath }) => ({
  locale,
  relativePath,
  entries: parseCatalogEntries(resolve(projectRoot, relativePath)),
}))

const baselineCatalog = parsedCatalogs.find((item) => item.locale === 'zh-CN')
if (!baselineCatalog) {
  fail(['[i18n:check] Missing baseline locale zh-CN'])
}

const baselineKeys = [...baselineCatalog.entries.keys()]
const baselineKeySet = new Set(baselineKeys)
const errors = []

for (const { locale, entries } of parsedCatalogs) {
  const missingKeys = baselineKeys.filter((key) => !entries.has(key))
  const extraKeys = [...entries.keys()].filter((key) => !baselineKeySet.has(key))
  const emptyValueKeys = [...entries.entries()]
    .filter(([, value]) => value.trim().length === 0)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    errors.push(`[i18n:check] ${locale} missing keys:`)
    for (const key of missingKeys) {
      errors.push(`  - ${key}`)
    }
  }

  if (extraKeys.length > 0) {
    errors.push(`[i18n:check] ${locale} has extra keys:`)
    for (const key of extraKeys) {
      errors.push(`  - ${key}`)
    }
  }

  if (emptyValueKeys.length > 0) {
    errors.push(`[i18n:check] ${locale} has empty values:`)
    for (const key of emptyValueKeys) {
      errors.push(`  - ${key}`)
    }
  }
}

if (errors.length > 0) {
  fail(errors)
}

console.log(`[i18n:check] OK (${baselineKeys.length} keys, ${parsedCatalogs.length} locales)`)
