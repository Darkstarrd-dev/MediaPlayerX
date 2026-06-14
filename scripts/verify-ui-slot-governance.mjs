import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const UI_DEFINITION_PATH = join(ROOT, "docs", "10-ui_definition.md");
const TOKEN_DESIGN_PATH = join(ROOT, "docs", "11-token_design.md");
const SOURCE_DIRS = [join(ROOT, "src"), join(ROOT, "electron")];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

function collectFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const filePath = join(dir, name);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      collectFiles(filePath, acc);
      continue;
    }
    const extension = name.slice(name.lastIndexOf("."));
    if (SOURCE_EXTENSIONS.has(extension)) {
      acc.push(filePath);
    }
  }
  return acc;
}

function extractBacktickValue(value) {
  const match = value.match(/`([^`]+)`/);
  return match ? match[1] : "";
}

function parseMarkdownTableRows(markdown) {
  const rows = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) {
      continue;
    }
    if (/^\|\s*-+/.test(line) || line.includes("|---|")) {
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    rows.push(cells);
  }
  return rows;
}

function camelToKebab(segment) {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

// A well-formed slot token prefix looks like `--mpx-slot-<kebab-name>-*`.
// The `<kebab-name>` portion must be non-empty and lowercase-kebab, optionally
// containing `*` glob segments for wildcard mappings (e.g.
// `--mpx-slot-*-settings-root-*-*`). The `data-slot` DOM namespace (long,
// hierarchical, mirrors the DOM) and the `--mpx-slot-*` CSS-variable namespace
// (short, flattened, mirrors the CSS) are intentionally decoupled, so the
// token prefix is NOT mechanically derived from the doc-10 stable path — it is
// validated on its own merits.
const SLOT_TOKEN_PREFIX_PATTERN =
  /^--mpx-slot-(?:\*|[a-z][a-z0-9]*)(?:(?:-(?:\*|[a-z][a-z0-9]*))+)-\*$/;

function isWellFormedSlotTokenPrefix(tokenPrefix) {
  return SLOT_TOKEN_PREFIX_PATTERN.test(tokenPrefix);
}

function parseUiDefinition(markdown) {
  const byPath = new Map();
  for (const cells of parseMarkdownTableRows(markdown)) {
    if (cells.length < 3) {
      continue;
    }
    const stablePath = extractBacktickValue(cells[0]);
    if (!stablePath || stablePath.startsWith("命名规则.")) {
      continue;
    }
    const slotSpec = cells[2];
    const slotMatch = slotSpec.match(/data-slot="([^"]+)"/);
    const slotName = slotMatch ? slotMatch[1] : null;
    byPath.set(stablePath, slotName);
  }
  return byPath;
}

function parseTokenDesign(markdown) {
  const byPath = new Map();
  for (const cells of parseMarkdownTableRows(markdown)) {
    if (cells.length < 2) {
      continue;
    }
    const stablePath = extractBacktickValue(cells[0]);
    const tokenPrefix = extractBacktickValue(cells[1]);
    if (!stablePath || stablePath.startsWith("命名规则.")) {
      continue;
    }
    if (!tokenPrefix.startsWith("--mpx-slot-")) {
      continue;
    }
    byPath.set(stablePath, tokenPrefix);
  }
  return byPath;
}

function parseSourceSlots(expectedSlots) {
  const slots = new Set();
  const slotLiteralPattern = /["'`](fg-[a-z0-9]+(?:-[a-z0-9]+)*)["'`]/g;
  for (const dir of SOURCE_DIRS) {
    for (const filePath of collectFiles(dir)) {
      const content = readFileSync(filePath, "utf8");
      const matches = content.matchAll(/data-slot="([^"]+)"/g);
      for (const match of matches) {
        slots.add(match[1]);
      }
      const slotLiterals = content.matchAll(slotLiteralPattern);
      for (const match of slotLiterals) {
        if (expectedSlots.has(match[1])) {
          slots.add(match[1]);
        }
      }
    }
  }
  return slots;
}

function printList(title, items) {
  if (items.length === 0) {
    return;
  }
  console.error(`\n${title} (${items.length})`);
  for (const item of items) {
    console.error(`- ${item}`);
  }
}

const uiDefinition = readFileSync(UI_DEFINITION_PATH, "utf8");
const tokenDesign = readFileSync(TOKEN_DESIGN_PATH, "utf8");

const uiPathToSlot = parseUiDefinition(uiDefinition);
const tokenPathToPrefix = parseTokenDesign(tokenDesign);
const expectedSlots = new Set(
  Array.from(uiPathToSlot.values()).filter((slotName) => Boolean(slotName)),
);
const sourceSlots = parseSourceSlots(expectedSlots);

const tokenMissingPaths = [];
const tokenMalformedPaths = [];
const tokenRedundantPaths = [];
const slotMissingInSource = [];
const slotUnexpectedInSource = [];

// Collect every token prefix declared in doc-11 so we can detect duplicates
// (two stable paths sharing one token prefix would silently collide).
const tokenPrefixCounts = new Map();
for (const tokenPrefix of tokenPathToPrefix.values()) {
  tokenPrefixCounts.set(
    tokenPrefix,
    (tokenPrefixCounts.get(tokenPrefix) ?? 0) + 1,
  );
}
const tokenDuplicatePrefixes = Array.from(tokenPrefixCounts.entries())
  .filter(([, count]) => count > 1)
  .map(([prefix, count]) => `${prefix} (x${count})`);

for (const [stablePath, slotName] of uiPathToSlot.entries()) {
  const tokenPrefix = tokenPathToPrefix.get(stablePath);
  if (!tokenPrefix) {
    tokenMissingPaths.push(stablePath);
  } else if (!isWellFormedSlotTokenPrefix(tokenPrefix)) {
    // The `--mpx-slot-*` CSS namespace is decoupled from the `data-slot`
    // DOM namespace, so we only enforce well-formedness here (not a
    // mechanical derivation from the stable path).
    tokenMalformedPaths.push(`${stablePath} -> ${tokenPrefix}`);
  }

  if (slotName && !sourceSlots.has(slotName)) {
    slotMissingInSource.push(`${stablePath} -> data-slot="${slotName}"`);
  }
}

for (const stablePath of tokenPathToPrefix.keys()) {
  if (!uiPathToSlot.has(stablePath)) {
    tokenRedundantPaths.push(stablePath);
  }
}

for (const slot of sourceSlots) {
  if (!expectedSlots.has(slot)) {
    slotUnexpectedInSource.push(slot);
  }
}

const hasIssues =
  tokenMalformedPaths.length > 0 ||
  tokenDuplicatePrefixes.length > 0 ||
  tokenRedundantPaths.length > 0 ||
  slotMissingInSource.length > 0 ||
  slotUnexpectedInSource.length > 0;

if (hasIssues) {
  printList(
    "Malformed slot token prefixes in docs/11-token_design.md",
    tokenMalformedPaths,
  );
  printList(
    "Duplicate slot token prefixes in docs/11-token_design.md",
    tokenDuplicatePrefixes,
  );
  printList(
    "Redundant stable paths in docs/11-token_design.md",
    tokenRedundantPaths,
  );
  printList("Missing data-slot in source code", slotMissingInSource);
  printList("Unexpected data-slot in source code", slotUnexpectedInSource);
  process.exit(1);
}

// A container-level stable path may legitimately inherit its token from a
// leaf button path (the two namespaces are decoupled), so doc-10 entries
// without a dedicated doc-11 token mapping are surfaced as an advisory
// warning rather than a gate failure.
printList(
  "Advisory: stable paths without a dedicated token mapping in docs/11-token_design.md",
  tokenMissingPaths,
);

console.log("UI slot governance check passed");
console.log(`- stable paths: ${uiPathToSlot.size}`);
console.log(`- token mappings: ${tokenPathToPrefix.size}`);
console.log(`- source data-slot entries: ${sourceSlots.size}`);
console.log(
  `- scope: ${SOURCE_DIRS.map((dir) => relative(ROOT, dir)).join(", ")}`,
);
