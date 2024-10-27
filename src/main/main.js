const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const log = require('electron-log');
const CarWashManager = require('../services/car_wash/car_wash_manager');
const ScannerManager = require('../services/scanner/scanner_manager');
const setupAutoUpdater = require('./autoUpdater');
const PrinterManager = require('../services/printer/printer_manager');

// .env 파일 로드
dotenv.config();

// 로그 설정
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

const carWashManager = new CarWashManager();
const scannerManager = new ScannerManager();
const printerManager = new PrinterManager();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
    },
    icon: path.join(__dirname, '../../assets/images/icon.png'),
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(process.resourcesPath, 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
    console.log('Loading URL:', mainWindow.getURL());
  }

  log.info('애플리케이션 창이 생성되었습니다.');

  carWashManager.addMachine({
    type: 'FL30',
    config: {
      id: '0',
      portName: process.env.PORT_NAME || '/dev/ttys022',
      address: 0x01
    }
  });

  // 스캐너 초기화
  scannerManager.initialize();

  // 스캐너 이벤트 리스너 설정
  scannerManager.on('data', (data) => {
    mainWindow.webContents.send('qrCodeScanned', data);
  });

  scannerManager.on('error', (error) => {
    mainWindow.webContents.send('scannerError', error.message);
  });

  scannerManager.on('initFailed', (message) => {
    mainWindow.webContents.send('scannerInitFailed', message);
  });
}

// app.whenReady().then(createWindow);

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

app.on('ready', () => {
  createWindow();
  setupAutoUpdater();
});

// 예외 처리
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

// ipc 설정
ipcMain.handle('printer:print', async (event, data) => {
  try {
    if (!printerManager) {
      throw new Error('프린터가 초기화되지 않았습니다.');
    }
    return await printerManager.printReceipt(data);
  } catch (error) {
    log.error('영수증 출력 실패:', error);
    throw error;
  }
});
