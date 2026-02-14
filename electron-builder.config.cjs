const enableWindowsSigning = ['1', 'true', 'yes'].includes(String(process.env.MPX_WINDOWS_SIGN ?? '').toLowerCase())

module.exports = {
  appId: 'com.darkstarrd.mediaplayerx',
  productName: 'MediaPlayerX',
  directories: {
    output: 'release',
  },
  files: ['dist/**', 'dist-electron/**', 'build/icons/**', 'node_modules/**', 'package.json'],
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
