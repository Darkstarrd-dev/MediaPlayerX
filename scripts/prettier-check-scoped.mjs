import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PRETTIER_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".ts",
  ".tsx",
]);

const ROOT_INCLUDE_FILES = new Set([
  "electron-builder.config.cjs",
  "eslint.config.js",
  "index.html",
  "package.json",
  "vite.config.ts",
]);

const INCLUDED_PREFIXES = ["electron/", "scripts/", "src/"];
const EXCLUDED_PREFIXES = ["docs/ref/"];

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function splitLines(value) {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function hasAllowedExtension(filePath) {
  for (const extension of PRETTIER_EXTENSIONS) {
    if (filePath.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

function isIncludedPath(filePath) {
  if (EXCLUDED_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
    return false;
  }
  if (ROOT_INCLUDE_FILES.has(filePath)) {
    return true;
  }
  if (!INCLUDED_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
    return false;
  }
  return hasAllowedExtension(filePath);
}

function unique(values) {
  return [...new Set(values)];
}

function readDiffFiles(rangeArgs) {
  try {
    return splitLines(
      runGit(["diff", "--name-only", "--diff-filter=ACMR", ...rangeArgs]),
    );
  } catch {
    return [];
  }
}

function collectCiChangedFiles() {
  const pullRequestBase = process.env.GITHUB_BASE_REF;
  if (pullRequestBase) {
    const remoteRef = `origin/${pullRequestBase}`;
    let files = readDiffFiles([`${remoteRef}...HEAD`]);
    if (files.length > 0) {
      return files;
    }
    try {
      runGit(["fetch", "--no-tags", "--depth=1", "origin", pullRequestBase]);
    } catch {
      return [];
    }
    return readDiffFiles([`${remoteRef}...HEAD`]);
  }
  return readDiffFiles(["HEAD~1...HEAD"]);
}

function collectLocalChangedFiles() {
  const unstaged = readDiffFiles(["HEAD"]);
  const staged = readDiffFiles(["--cached"]);
  let untracked = [];
  try {
    untracked = splitLines(
      runGit(["ls-files", "--others", "--exclude-standard"]),
    );
  } catch {
    untracked = [];
  }
  return [...unstaged, ...staged, ...untracked];
}

function resolveChangedFiles() {
  const isCi = process.env.CI === "true";
  const rawFiles = isCi ? collectCiChangedFiles() : collectLocalChangedFiles();
  return unique(rawFiles.map((filePath) => filePath.replace(/\\/gu, "/")))
    .filter((filePath) => existsSync(filePath))
    .filter(isIncludedPath);
}

const mode = process.argv.includes("--write") ? "--write" : "--check";
const targetFiles = resolveChangedFiles();

if (targetFiles.length === 0) {
  console.log("No scoped files changed for Prettier check.");
  process.exit(0);
}

const prettierResult = spawnSync("npx", ["prettier", mode, ...targetFiles], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (typeof prettierResult.status === "number") {
  process.exit(prettierResult.status);
}

if (prettierResult.error) {
  throw prettierResult.error;
}

process.exit(1);
