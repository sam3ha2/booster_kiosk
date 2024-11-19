import * as electronUpdater from 'electron-updater';
import log from 'electron-log';

const { NsisUpdater } = electronUpdater;

let updaterTimer = null;
const updateUrl = `https://image.boosteron.co.kr/apps/kiosk${process.env.VITE_APP_ENV !== 'production' ? '-dev' : ''}`;

const autoUpdater =  new NsisUpdater({
  provider: 'generic',
  url: updateUrl
});

function setupAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    log.debug(`업데이트 파일이 발견되어 업데이트를 진행합니다.`);
  });

  autoUpdater.on('error', (error, message) => {
    updateTimerInput();
  });

  autoUpdater.on('update-not-available', (info) => {
    updateTimerInput();
  });

  autoUpdater.on('update-downloaded', (event) => {
    log.debug(`업데이트 파일 다운로드가 완료되었습니다.`);
    autoUpdater.quitAndInstall();
  });
}

function updateTimerInput() {
  clearTimeout(updaterTimer);
  updaterTimer = setTimeout(() => {
    checkUpdate();
  }, 20 * 1000);
}

function checkUpdate() {
  autoUpdater.checkForUpdates();
}
export default setupAutoUpdater;
