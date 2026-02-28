const enableWindowsSigning = ['1', 'true', 'yes'].includes(String(process.env.MPX_WINDOWS_SIGN ?? '').toLowerCase())
const fs = require('node:fs')
const path = require('node:path')

const bundledMpvDir = (() => {
  const raw = String(process.env.MPX_MPV_DIR ?? '').trim()
  if (raw) {
    const resolved = path.resolve(raw)
    return fs.existsSync(resolved) ? resolved : null
  }

  const defaultDir = path.resolve('vendor', 'mpv', 'win32-x64')
  return fs.existsSync(defaultDir) ? defaultDir : null
})()

const bundledFfmpegDir = (() => {
  const raw = String(process.env.MPX_FFMPEG_DIR ?? '').trim()
  if (raw) {
    const resolved = path.resolve(raw)
    return fs.existsSync(resolved) ? resolved : null
  }

  const defaultDir = path.resolve('vendor', 'ffmpeg', 'win32-x64')
  return fs.existsSync(defaultDir) ? defaultDir : null
})()

const offlineSubtitleComponentDir = (() => {
  const raw = String(process.env.MPX_OFFLINE_SUBTITLE_COMPONENT_DIR ?? '').trim()
  if (!raw) {
    return null
  }

  const resolved = path.resolve(raw)
  return fs.existsSync(resolved) ? resolved : null
})()

const extraResources = []

if (bundledMpvDir) {
  extraResources.push({
    from: bundledMpvDir,
    to: 'vendor/mpv',
    filter: ['**/*'],
  })
}

if (bundledFfmpegDir) {
  extraResources.push({
    from: bundledFfmpegDir,
    to: 'vendor/ffmpeg',
    filter: ['**/*'],
  })
}

if (offlineSubtitleComponentDir) {
  extraResources.push({
    from: offlineSubtitleComponentDir,
    to: 'optional/offline-subtitles',
    filter: ['**/*'],
  })
}

module.exports = {
  appId: 'com.darkstarrd.mediaplayerx',
  productName: 'MediaPlayerX',
  compression: 'maximum',
  removePackageScripts: true,
  asar: true,
  electronLanguages: ['en-US', 'zh-CN'],
  directories: {
    output: 'release',
  },
  files: [
    'dist/**',
    'dist-electron/**',
    'build/icons/**',
    'package.json',
    '!dist-electron/**/*.map',
    '!dist/**/*.map',
    '!node_modules/**/test/**',
    '!node_modules/**/tests/**',
    '!node_modules/**/__tests__/**',
    '!node_modules/**/*.map',
    '!node_modules/**/*.md',
    '!node_modules/**/*.markdown',
    '!node_modules/**/*.d.ts',
    '!node_modules/**/*.ts',
    '!node_modules/**/*.tsx',
    '!node_modules/sherpa-onnx-node/**',
    '!node_modules/sherpa-onnx-*/**',
  ],
  extraResources,
  asarUnpack: ['**/*.node'],
  win: {
    icon: 'build/icons/icon.ico',
    signAndEditExecutable: enableWindowsSigning,
    forceCodeSigning: enableWindowsSigning,
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  mac: {
    icon: 'build/icons/icon.icns',
  },
  linux: {
    icon: 'build/icons/512x512.png',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    include: 'build/installer.nsh',
  },
}
