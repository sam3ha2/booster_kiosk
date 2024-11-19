import * as electronUpdater from 'electron-updater';
import log from 'electron-log';
import { dialog } from 'electron';

const { autoUpdater } = electronUpdater;

function setupAutoUpdater() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 로깅 설정
  // ESM 변경 후 logger undefined 에러 발생
  // autoUpdater.logger = log;
  // autoUpdater.logger.transports.file.level = 'debug';
  log.info('Auto Updater setup starting...');

  // 개발 환경에서도 업데이트 확인 강제
  autoUpdater.forceDevUpdateConfig = isDevelopment;
  
  // GitHub 토큰 설정
  if (process.env.GH_TOKEN) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'sam3ha2',
      repo: 'booster_kiosk',
      token: process.env.GH_TOKEN
    });
    log.info('GitHub feed URL has been set');
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...');
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('현재 최신버전입니다.', info);
    // dialog.showMessageBox({
    //   type: 'info',
    //   title: '업데이트 없음',
    //   message: '현재 최신 버전을 사용 중입니다.'
    // });
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    log.error(err.stack);
    dialog.showErrorBox('업데이트 오류', err.message);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "다운로드 속도: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - 현재 ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
  });

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '업데이트 가능',
      message: '새 버전이 있습니다. 지금 다운로드하시겠습니까?',
      buttons: ['예', '아니오']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate(); // 업데이트 다운로드
      }
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '업데이트 준비 완료',
      message: '새 버전이 다운로드되었습니다. 지금 설치하시겠습니까?',
      buttons: ['지금 설치', '나중에']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(); // 설치 후 앱 종료
      }
    });
  });

  // 업데이트 확인 시작
  try {
    log.info('Checking for updates...');
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Update check failed:', err);
    });
  } catch (error) {
    log.error('Error in checkForUpdates:', error);
  }
}

export default setupAutoUpdater;
