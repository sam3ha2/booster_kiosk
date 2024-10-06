const { app, BrowserWindow } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const log = require('electron-log');

// .env 파일 로드
dotenv.config();

// 로그 설정
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../../dist/index.html')}`;
  
  win.loadURL(startUrl);

  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }

  log.info('애플리케이션 창이 생성되었습니다.');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 예외 처리
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});
