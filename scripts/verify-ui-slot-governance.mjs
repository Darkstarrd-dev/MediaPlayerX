import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const UI_DEFINITION_PATH = join(ROOT, 'docs', 'ui_definition.md')
const TOKEN_DESIGN_PATH = join(ROOT, 'docs', 'token_design.md')
const SOURCE_DIRS = [join(ROOT, 'src'), join(ROOT, 'electron')]
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

function collectFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const filePath = join(dir, name)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      collectFiles(filePath, acc)
      continue
    }
    const extension = name.slice(name.lastIndexOf('.'))
    if (SOURCE_EXTENSIONS.has(extension)) {
      acc.push(filePath)
    }
  }
  return acc
}

function extractBacktickValue(value) {
  const match = value.match(/`([^`]+)`/)
  return match ? match[1] : ''
}

function parseMarkdownTableRows(markdown) {
  const rows = []
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('|')) {
      continue
    }
    if (/^\|\s*-+/.test(line) || line.includes('|---|')) {
      continue
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
    rows.push(cells)
  }
  return rows
}

function camelToKebab(segment) {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

function stablePathToSlotName(stablePath) {
  return stablePath
    .split('.')
    .map((segment) => camelToKebab(segment))
    .join('-')
}

function stablePathToTokenPrefix(stablePath) {
  return `--mpx-slot-${stablePathToSlotName(stablePath)}-*`
}

function parseUiDefinition(markdown) {
  const byPath = new Map()
  for (const cells of parseMarkdownTableRows(markdown)) {
    if (cells.length < 3) {
      continue
    }
    const stablePath = extractBacktickValue(cells[0])
    if (!stablePath || stablePath.startsWith('命名规则.')) {
      continue
    }
    const slotSpec = cells[2]
    const slotMatch = slotSpec.match(/data-slot="([^"]+)"/)
    const slotName = slotMatch ? slotMatch[1] : null
    byPath.set(stablePath, slotName)
  }
  return byPath
}

function parseTokenDesign(markdown) {
  const byPath = new Map()
  for (const cells of parseMarkdownTableRows(markdown)) {
    if (cells.length < 2) {
      continue
    }
    const stablePath = extractBacktickValue(cells[0])
    const tokenPrefix = extractBacktickValue(cells[1])
    if (!stablePath || stablePath.startsWith('命名规则.')) {
      continue
    }
    if (!tokenPrefix.startsWith('--mpx-slot-')) {
      continue
    }
    byPath.set(stablePath, tokenPrefix)
  }
  return byPath
}

function parseSourceSlots() {
  const slots = new Set()
  for (const dir of SOURCE_DIRS) {
    for (const filePath of collectFiles(dir)) {
      const content = readFileSync(filePath, 'utf8')
      const matches = content.matchAll(/data-slot="([^"]+)"/g)
      for (const match of matches) {
        slots.add(match[1])
      }
    }
  }
  return slots
}

function printList(title, items) {
  if (items.length === 0) {
    return
  }
  console.error(`\n${title} (${items.length})`)
  for (const item of items) {
    console.error(`- ${item}`)
  }
}

const uiDefinition = readFileSync(UI_DEFINITION_PATH, 'utf8')
const tokenDesign = readFileSync(TOKEN_DESIGN_PATH, 'utf8')

const uiPathToSlot = parseUiDefinition(uiDefinition)
const tokenPathToPrefix = parseTokenDesign(tokenDesign)
const sourceSlots = parseSourceSlots()

const tokenMissingPaths = []
const tokenUnexpectedPrefixPaths = []
const tokenRedundantPaths = []
const slotMissingInSource = []
const slotUnexpectedInSource = []

for (const [stablePath, slotName] of uiPathToSlot.entries()) {
  const tokenPrefix = tokenPathToPrefix.get(stablePath)
  if (!tokenPrefix) {
    tokenMissingPaths.push(stablePath)
  } else {
    const expectedPrefix = stablePathToTokenPrefix(stablePath)
    if (tokenPrefix !== expectedPrefix) {
      tokenUnexpectedPrefixPaths.push(`${stablePath} -> expected ${expectedPrefix}, got ${tokenPrefix}`)
    }
  }

  if (slotName && !sourceSlots.has(slotName)) {
    slotMissingInSource.push(`${stablePath} -> data-slot="${slotName}"`)
  }
}

for (const stablePath of tokenPathToPrefix.keys()) {
  if (!uiPathToSlot.has(stablePath)) {
    tokenRedundantPaths.push(stablePath)
  }
}

const expectedSlots = new Set(
  Array.from(uiPathToSlot.values()).filter((slotName) => Boolean(slotName)),
)

for (const slot of sourceSlots) {
  if (!expectedSlots.has(slot)) {
    slotUnexpectedInSource.push(slot)
  }
}

const hasIssues =
  tokenMissingPaths.length > 0 ||
  tokenUnexpectedPrefixPaths.length > 0 ||
  tokenRedundantPaths.length > 0 ||
  slotMissingInSource.length > 0 ||
  slotUnexpectedInSource.length > 0

if (hasIssues) {
  printList('Missing stable paths in docs/token_design.md', tokenMissingPaths)
  printList('Invalid token prefixes in docs/token_design.md', tokenUnexpectedPrefixPaths)
  printList('Redundant stable paths in docs/token_design.md', tokenRedundantPaths)
  printList('Missing data-slot in source code', slotMissingInSource)
  printList('Unexpected data-slot in source code', slotUnexpectedInSource)
  process.exit(1)
}

console.log('UI slot governance check passed')
console.log(`- stable paths: ${uiPathToSlot.size}`)
console.log(`- token mappings: ${tokenPathToPrefix.size}`)
console.log(`- source data-slot entries: ${sourceSlots.size}`)
console.log(`- scope: ${SOURCE_DIRS.map((dir) => relative(ROOT, dir)).join(', ')}`)
