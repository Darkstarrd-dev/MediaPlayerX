#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = next
    index += 1
  }
  return args
}

function resolveNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function resolveElectronBinary(projectRoot) {
  return process.platform === 'win32'
    ? path.join(projectRoot, 'node_modules', '.bin', 'electron.cmd')
    : path.join(projectRoot, 'node_modules', '.bin', 'electron')
}

function splitCsv(value, fallback) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return items.length > 0 ? Array.from(new Set(items)) : fallback
}

function parsePositiveInt(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function buildRunTag() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function resolveScenes(sceneIds) {
  const byId = {
    'image-default': { id: 'image-default', label: 'Image Default', preset: 'image-default' },
    'image-manage': { id: 'image-manage', label: 'Image Manage', preset: 'image-manage' },
    'image-metadata': { id: 'image-metadata', label: 'Image Metadata', preset: 'image-metadata' },
    'image-search': { id: 'image-search', label: 'Image Search', preset: 'image-search' },
    'video-default': { id: 'video-default', label: 'Video Default', preset: 'video-default' },
    'music-default': { id: 'music-default', label: 'Music Default', preset: 'music-default' },
    'settings-layout': { id: 'settings-layout', label: 'Settings Layout', preset: 'settings-layout' },
  }

  return sceneIds
    .map((sceneId) => byId[sceneId])
    .filter(Boolean)
}

async function runCommand(projectRoot, command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve(undefined)
        return
      }
      reject(new Error(`command failed: ${command} ${args.join(' ')} (exit ${code ?? 'null'})`))
    })
  })
}

const args = parseArgs(process.argv.slice(2))
const projectRoot = process.cwd()

const outDir = path.resolve(String(args['out-dir'] ?? path.join(projectRoot, 'docs', 'ui', 'theme-gallery')))
const runTag = String(args['run-tag'] ?? buildRunTag())
const width = parsePositiveInt(args.width, 1680, 1024, 4096)
const height = parsePositiveInt(args.height, 980, 640, 4096)
const waitAfterLoadMs = parsePositiveInt(args['wait-after-load-ms'], 600, 0, 20_000)
const waitAfterApplyMs = parsePositiveInt(args['wait-after-apply-ms'], 260, 0, 10_000)

const styles = splitCsv(args.styles, ['flush', 'liquid-glass', 'neobrutalism', 'soft-skeuomorphic'])
const palettes = splitCsv(args.palettes, ['parchment', 'tokyo-night', 'skeuomorphic-light', 'skeuomorphic-dark'])
const sceneIds = splitCsv(args.scenes, [
  'image-default',
  'image-manage',
  'image-metadata',
  'video-default',
  'music-default',
  'settings-layout',
])
const scenes = resolveScenes(sceneIds)

if (scenes.length === 0) {
  throw new Error('no valid scenes configured; pass --scenes with supported IDs')
}

const config = {
  outDir,
  runTag,
  width,
  height,
  waitAfterLoadMs,
  waitAfterApplyMs,
  styles,
  palettes,
  scenes,
}

await mkdir(outDir, { recursive: true })

const skipBuild = Boolean(args['skip-build'])
if (!skipBuild) {
  const npm = resolveNpmCommand()
  await runCommand(projectRoot, npm, ['run', 'desktop:build'], process.env)
}

const electronBinary = resolveElectronBinary(projectRoot)
const env = {
  ...process.env,
  MEDIA_PLAYERX_BENCH: 'gallery',
  VITE_MEDIA_REPOSITORY_MODE: 'mock',
  MEDIA_PLAYERX_SPLASH_MIN_DURATION_MS: '0',
  MEDIA_PLAYERX_THEME_GALLERY_CONFIG_JSON: JSON.stringify(config),
}

await runCommand(projectRoot, electronBinary, ['dist-electron/main.cjs'], env)

const runDir = path.join(outDir, runTag.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 96))
const galleryPath = path.join(runDir, 'index.html')
const manifestPath = path.join(runDir, 'manifest.json')

process.stdout.write(`\n[theme-gallery] done\n`)
process.stdout.write(`[theme-gallery] gallery:  ${galleryPath}\n`)
process.stdout.write(`[theme-gallery] manifest: ${manifestPath}\n`)
