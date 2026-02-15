import { app, type BrowserWindow } from 'electron'
import path from 'node:path'
import { promises as fs } from 'node:fs'

type ThemeGalleryScenePreset =
  | 'image-default'
  | 'image-manage'
  | 'image-metadata'
  | 'image-search'
  | 'video-default'
  | 'music-default'
  | 'settings-layout'

interface ThemeGalleryScene {
  id: string
  label: string
  preset: ThemeGalleryScenePreset
  waitMs: number | null
}

interface ThemeGalleryConfig {
  outDir: string
  runTag: string
  width: number
  height: number
  waitAfterLoadMs: number
  waitAfterApplyMs: number
  styles: string[]
  palettes: string[]
  scenes: ThemeGalleryScene[]
}

interface ThemeGalleryCaptureRecord {
  index: number
  sceneId: string
  sceneLabel: string
  scenePreset: ThemeGalleryScenePreset
  styleId: string
  paletteId: string
  fileName: string
  filePath: string
}

const THEME_GALLERY_CONFIG_ENV = 'MEDIA_PLAYERX_THEME_GALLERY_CONFIG_JSON'

const DEFAULT_STYLES = ['flush', 'liquid-glass', 'neobrutalism', 'soft-skeuomorphic']
const DEFAULT_PALETTES = ['parchment', 'tokyo-night', 'skeuomorphic-light', 'skeuomorphic-dark']
const DEFAULT_SCENES: ThemeGalleryScene[] = [
  { id: 'image-default', label: 'Image Default', preset: 'image-default', waitMs: null },
  { id: 'image-manage', label: 'Image Manage', preset: 'image-manage', waitMs: null },
  { id: 'image-metadata', label: 'Image Metadata', preset: 'image-metadata', waitMs: null },
  { id: 'video-default', label: 'Video Default', preset: 'video-default', waitMs: null },
  { id: 'music-default', label: 'Music Default', preset: 'music-default', waitMs: null },
  { id: 'settings-layout', label: 'Settings Layout', preset: 'settings-layout', waitMs: null },
]

let captureRunRequested = false

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function toSafePart(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '_')
  return normalized.length > 0 ? normalized.slice(0, 96) : 'item'
}

function parsePositiveInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function parseStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback
}

function isScenePreset(value: string): value is ThemeGalleryScenePreset {
  return (
    value === 'image-default'
    || value === 'image-manage'
    || value === 'image-metadata'
    || value === 'image-search'
    || value === 'video-default'
    || value === 'music-default'
    || value === 'settings-layout'
  )
}

function parseScenes(value: unknown): ThemeGalleryScene[] {
  if (!Array.isArray(value)) {
    return DEFAULT_SCENES
  }

  const parsed: ThemeGalleryScene[] = []
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index]

    if (typeof item === 'string') {
      const preset = item.trim()
      if (!isScenePreset(preset)) {
        continue
      }
      parsed.push({ id: preset, label: preset, preset, waitMs: null })
      continue
    }

    if (!isRecord(item)) {
      continue
    }

    const presetRaw = typeof item.preset === 'string' ? item.preset.trim() : ''
    if (!isScenePreset(presetRaw)) {
      continue
    }

    const idRaw = typeof item.id === 'string' ? item.id.trim() : ''
    const labelRaw = typeof item.label === 'string' ? item.label.trim() : ''
    const waitMsRaw = typeof item.waitMs === 'number' && Number.isFinite(item.waitMs)
      ? Math.max(0, Math.floor(item.waitMs))
      : null

    parsed.push({
      id: idRaw || presetRaw,
      label: labelRaw || idRaw || presetRaw,
      preset: presetRaw,
      waitMs: waitMsRaw,
    })
  }

  return parsed.length > 0 ? parsed : DEFAULT_SCENES
}

function resolveThemeGalleryConfigFromEnv(): ThemeGalleryConfig | null {
  const raw = (process.env[THEME_GALLERY_CONFIG_ENV] ?? '').trim()
  if (!raw) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(parsed)) {
    return null
  }

  const runTagRaw = typeof parsed.runTag === 'string' ? parsed.runTag.trim() : ''
  const runTag = runTagRaw || new Date().toISOString().replace(/[:.]/g, '-')

  const outDirRaw = typeof parsed.outDir === 'string' ? parsed.outDir.trim() : ''
  const outDir = path.resolve(outDirRaw || path.join(process.cwd(), 'docs', 'ui', 'theme-gallery'))

  return {
    outDir,
    runTag,
    width: parsePositiveInt(parsed.width, 1680, 1024, 4096),
    height: parsePositiveInt(parsed.height, 980, 640, 4096),
    waitAfterLoadMs: parsePositiveInt(parsed.waitAfterLoadMs, 600, 0, 15_000),
    waitAfterApplyMs: parsePositiveInt(parsed.waitAfterApplyMs, 260, 0, 10_000),
    styles: parseStringArray(parsed.styles, DEFAULT_STYLES),
    palettes: parseStringArray(parsed.palettes, DEFAULT_PALETTES),
    scenes: parseScenes(parsed.scenes),
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function buildSceneApplyScript(styleId: string, paletteId: string, scenePreset: ThemeGalleryScenePreset): string {
  const payload = JSON.stringify({ styleId, paletteId, scenePreset })

  return `(() => {
  const payload = ${payload}
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const waitFor = async (predicate, timeoutMs = 6000, stepMs = 40) => {
    const startedAt = Date.now()
    while (Date.now() - startedAt <= timeoutMs) {
      if (predicate()) {
        return true
      }
      await wait(stepMs)
    }
    return false
  }

  const query = (selector) => document.querySelector(selector)

  const ensureButtonActive = async (button, enabled) => {
    if (!button) {
      return
    }
    const active = button.classList.contains('is-active')
    if (active !== enabled) {
      button.click()
      await wait(120)
    }
  }

  const ensureMode = async (mode) => {
    const selectorByMode = {
      image: 'button[data-a11y-id="header.mode.image"]',
      video: 'button[data-a11y-id="header.mode.video"]',
      music: 'button[data-a11y-id="header.mode.music"]',
    }
    const labelByMode = {
      image: '图片模式',
      video: '视频模式',
      music: '音乐模式',
    }
    const button = query(selectorByMode[mode])
      || query('.mode-switch button[aria-label="' + labelByMode[mode] + '"]')
    if (!button) {
      throw new Error('mode button not found: ' + mode)
    }
    if (!button.classList.contains('is-active')) {
      button.click()
      await wait(160)
    }
  }

  const ensureSearchPanel = async (enabled) => {
    const button = query('button[data-a11y-id="header.search"]')
      || query('.header-group-search .search-trigger-btn[aria-label="检索"]')
    await ensureButtonActive(button, enabled)
  }

  const ensureManageMode = async (enabled) => {
    const button = query('button[data-a11y-id="header.manage"]')
      || query('.header-group-search .search-trigger-btn[aria-label="文件管理"]')
    await ensureButtonActive(button, enabled)
  }

  const ensureMetadataManageMode = async (enabled) => {
    const preferred = query('button[data-a11y-id="header.metadataToggle"]')
      || query('.header-group-search .search-trigger-btn[aria-label="切换到图像模式"]')
      || query('.header-group-search .search-trigger-btn[aria-label="切换到元数据模式"]')
    const fallback = Array.from(document.querySelectorAll('.header-group-search .search-trigger-btn'))[2] || null
    const button = preferred || fallback
    await ensureButtonActive(button, enabled)
  }

  const ensureSettingsOpen = async (enabled) => {
    const isOpen = () => Boolean(query('.settings-mask'))
    if (enabled) {
      if (!isOpen()) {
        const button = query('button[data-a11y-id="header.settings"]')
          || query('.header-group-primary .header-settings-btn[aria-label="设置"]')
          || query('button[aria-label="设置"]')
        if (!button) {
          throw new Error('settings open button not found')
        }
        button.click()
        await waitFor(isOpen, 4000)
      }
      return
    }

    if (isOpen()) {
      const closeButton = query('.settings-mask .settings-head button[data-a11y-id="settings.close"]')
        || query('.settings-mask .settings-head button[aria-label="关闭"]')
      if (!closeButton) {
        throw new Error('settings close button not found')
      }
      closeButton.click()
      await waitFor(() => !isOpen(), 4000)
    }
  }

  return (async () => {
    const appReady = await waitFor(() => Boolean(query('.app')) && Boolean(query('.app-header')) && Boolean(query('.workspace')))
    if (!appReady) {
      throw new Error('app shell not ready')
    }

    document.documentElement.dataset.mpxStyle = payload.styleId
    document.documentElement.dataset.mpxPalette = payload.paletteId
    document.documentElement.dataset.mpxTheme = payload.paletteId
    await wait(100)

    await ensureSettingsOpen(false)

    switch (payload.scenePreset) {
      case 'image-default': {
        await ensureMode('image')
        await ensureManageMode(false)
        await ensureMetadataManageMode(false)
        await ensureSearchPanel(false)
        await ensureSettingsOpen(false)
        break
      }
      case 'image-manage': {
        await ensureMode('image')
        await ensureMetadataManageMode(false)
        await ensureSearchPanel(false)
        await ensureManageMode(true)
        await ensureSettingsOpen(false)
        break
      }
      case 'image-metadata': {
        await ensureMode('image')
        await ensureManageMode(false)
        await ensureSearchPanel(false)
        await ensureMetadataManageMode(true)
        await ensureSettingsOpen(false)
        break
      }
      case 'image-search': {
        await ensureMode('image')
        await ensureManageMode(false)
        await ensureMetadataManageMode(false)
        await ensureSearchPanel(true)
        await ensureSettingsOpen(false)
        break
      }
      case 'video-default': {
        await ensureMode('video')
        await ensureManageMode(false)
        await ensureMetadataManageMode(false)
        await ensureSearchPanel(false)
        await ensureSettingsOpen(false)
        break
      }
      case 'music-default': {
        await ensureMode('music')
        await ensureManageMode(false)
        await ensureMetadataManageMode(false)
        await ensureSearchPanel(false)
        await ensureSettingsOpen(false)
        break
      }
      case 'settings-layout': {
        await ensureMode('image')
        await ensureManageMode(false)
        await ensureMetadataManageMode(false)
        await ensureSearchPanel(false)
        await ensureSettingsOpen(true)
        break
      }
      default:
        throw new Error('unsupported scene preset: ' + payload.scenePreset)
    }

    window.dispatchEvent(new Event('resize'))
    await wait(80)

    return {
      ok: true,
      scenePreset: payload.scenePreset,
      styleId: payload.styleId,
      paletteId: payload.paletteId,
    }
  })()
})()`
}

function buildGalleryHtml(captures: ThemeGalleryCaptureRecord[], manifestFileName: string): string {
  const cardsHtml = captures
    .map((item) => {
      return [
        '<article class="card">',
        `  <img loading="lazy" src="images/${item.fileName}" alt="${item.sceneId} | ${item.styleId} | ${item.paletteId}">`,
        '  <div class="meta">',
        `    <div><strong>Scene:</strong> ${item.sceneLabel}</div>`,
        `    <div><strong>Style:</strong> ${item.styleId}</div>`,
        `    <div><strong>Palette:</strong> ${item.paletteId}</div>`,
        `    <div><a href="images/${item.fileName}" target="_blank" rel="noreferrer">Open PNG</a></div>`,
        '  </div>',
        '</article>',
      ].join('\n')
    })
    .join('\n')

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>Theme Gallery</title>',
    '  <style>',
    '    :root { color-scheme: light dark; }',
    '    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #101216; color: #e6ebf2; }',
    '    header { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(8px); background: rgba(16,18,22,0.75); border-bottom: 1px solid rgba(255,255,255,0.12); padding: 12px 16px; }',
    '    h1 { margin: 0; font-size: 16px; }',
    '    .sub { margin-top: 6px; opacity: 0.8; font-size: 12px; }',
    '    main { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }',
    '    .card { border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.04); }',
    '    .card img { width: 100%; display: block; background: #0a0d12; }',
    '    .meta { padding: 10px 12px; display: grid; gap: 4px; font-size: 12px; }',
    '    .meta a { color: #8ec5ff; text-decoration: none; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <header>',
    '    <h1>MediaPlayerX Theme Gallery</h1>',
    `    <div class="sub">Manifest: <a href="${manifestFileName}" target="_blank" rel="noreferrer">${manifestFileName}</a></div>`,
    '  </header>',
    '  <main>',
    cardsHtml,
    '  </main>',
    '</body>',
    '</html>',
  ].join('\n')
}

async function runThemeGalleryCapture(window: BrowserWindow, config: ThemeGalleryConfig): Promise<void> {
  const runDir = path.join(config.outDir, toSafePart(config.runTag))
  const imagesDir = path.join(runDir, 'images')
  const manifestFileName = 'manifest.json'
  const galleryFileName = 'index.html'
  const manifestPath = path.join(runDir, manifestFileName)
  const galleryPath = path.join(runDir, galleryFileName)

  await fs.mkdir(imagesDir, { recursive: true })

  if (window.isMinimized()) {
    window.restore()
  }
  if (!window.isVisible()) {
    window.show()
  }
  window.setContentSize(config.width, config.height)
  window.focus()

  await delay(config.waitAfterLoadMs)

  const captures: ThemeGalleryCaptureRecord[] = []
  let captureIndex = 1

  for (const styleId of config.styles) {
    for (const paletteId of config.palettes) {
      for (const scene of config.scenes) {
        const script = buildSceneApplyScript(styleId, paletteId, scene.preset)
        await window.webContents.executeJavaScript(script, true)

        const delayMs = scene.waitMs ?? config.waitAfterApplyMs
        if (delayMs > 0) {
          await delay(delayMs)
        }

        const image = await window.capturePage()
        const fileName = `${String(captureIndex).padStart(3, '0')}_${toSafePart(scene.id)}__${toSafePart(styleId)}__${toSafePart(paletteId)}.png`
        const filePath = path.join(imagesDir, fileName)

        await fs.writeFile(filePath, image.toPNG())

        captures.push({
          index: captureIndex,
          sceneId: scene.id,
          sceneLabel: scene.label,
          scenePreset: scene.preset,
          styleId,
          paletteId,
          fileName,
          filePath,
        })

        captureIndex += 1
      }
    }
  }

  const manifest = {
    generatedAtMs: Date.now(),
    runDir,
    imagesDir,
    config,
    captures,
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  await fs.writeFile(galleryPath, buildGalleryHtml(captures, manifestFileName), 'utf8')

  console.log('[theme-gallery] capture completed', {
    runDir,
    imageCount: captures.length,
    manifestPath,
    galleryPath,
  })
}

function runAndQuit(window: BrowserWindow, config: ThemeGalleryConfig): void {
  void runThemeGalleryCapture(window, config)
    .then(async () => {
      await delay(80)
      app.quit()
    })
    .catch(async (error: unknown) => {
      console.error('[theme-gallery] capture failed', error)
      app.exitCode = 1
      await delay(80)
      app.quit()
    })
}

export function runThemeGalleryCaptureIfEnabled(window: BrowserWindow): void {
  if (captureRunRequested) {
    return
  }

  const config = resolveThemeGalleryConfigFromEnv()
  if (!config) {
    return
  }

  captureRunRequested = true

  if (window.webContents.isLoadingMainFrame()) {
    window.webContents.once('did-finish-load', () => {
      runAndQuit(window, config)
    })
    return
  }

  runAndQuit(window, config)
}
