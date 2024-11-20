// @see https://www.electron.build/configuration/configuration
import dotenv from 'dotenv';
dotenv.config({ path: ['.env.development.local', '.env.development', '.env'] });

export default {
  $schema:
    'https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json',
  productName: 'BoosterKiosk',
  appId: 'kr.co.boosteron.kiosk',
  directories: {
    output: 'release',
    buildResources: 'src/assets',
  },
  files: [
    'dist/**/*',
    'src/main/**/*',
    'src/services/**/*',
    'src/preload.js',
    'package.json',
    '!**/node_modules/*',
  ],
  extraResources: {
    from: 'dist',
    to: 'dist',
    filter: ['**/*'],
  },
  npmRebuild: false,
  asar: true,
  asarUnpack: [],
  publish: {
    provider: 's3',
    bucket: 'boosteron',
    path: `/apps/kiosk${process.env.VITE_APP_ENV !== 'production' ? '-dev' : ''}/`,
  },
  win: {
    icon: 'src/assets/icons/win/icon.ico',
    publisherName: 'booster',
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  nsis: {
    oneClick: true,
    include: 'nsh-scripts/installer.nsh',
    allowToChangeInstallationDirectory: false,
    createDesktopShortcut: true,
    runAfterFinish: true,
  },
};
