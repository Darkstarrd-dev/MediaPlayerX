import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

const localeCatalogs = [
  { locale: 'zh-CN', baseName: 'zh-CN' },
  { locale: 'en-US', baseName: 'en-US' },
]
const localeDir = resolve(projectRoot, 'src/i18n/locales')

function parseCatalogEntries(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const entryPattern = /(["'])([^"'\\]+)\1\s*:\s*(["'])((?:\\.|(?!\3)[\s\S])*)\3/g
  const entries = new Map()

  for (const match of source.matchAll(entryPattern)) {
    const key = match[2]
    const rawValue = match[4]
    const value = rawValue.replace(/\\'/g, "'").replace(/\\"/g, '"')
    if (entries.has(key)) {
      throw new Error(`Duplicate key '${key}' in ${filePath}`)
    }
    entries.set(key, value)
  }

  return entries
}

function getLocaleSourceFiles(baseName) {
  const directFile = resolve(localeDir, `${baseName}.ts`)
  const partFiles = readdirSync(localeDir)
    .filter((name) => name.startsWith(`${baseName}.part`) && name.endsWith('.ts'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((name) => resolve(localeDir, name))

  return [directFile, ...partFiles]
}

function parseLocaleEntries(baseName) {
  const files = getLocaleSourceFiles(baseName)
  const entries = new Map()

  for (const filePath of files) {
    const fileEntries = parseCatalogEntries(filePath)
    for (const [key, value] of fileEntries) {
      if (entries.has(key)) {
        throw new Error(`Duplicate key '${key}' across locale files for ${baseName}`)
      }
      entries.set(key, value)
    }
  }

  if (entries.size === 0) {
    throw new Error(`Unable to parse catalog entries for locale ${baseName}`)
  }

  return entries
}

function fail(lines) {
  for (const line of lines) {
    console.error(line)
  }
  process.exit(1)
}

const parsedCatalogs = localeCatalogs.map(({ locale, baseName }) => ({
  locale,
  entries: parseLocaleEntries(baseName),
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
