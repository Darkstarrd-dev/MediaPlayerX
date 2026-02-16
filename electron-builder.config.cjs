const enableWindowsSigning = ['1', 'true', 'yes'].includes(String(process.env.MPX_WINDOWS_SIGN ?? '').toLowerCase())

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
  ],
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
  },
}
