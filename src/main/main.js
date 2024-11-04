const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const log = require('electron-log');
const CarWashManager = require('../services/car_wash/car_wash_manager');
const ScannerManager = require('../services/scanner/scanner_manager');
const setupAutoUpdater = require('./autoUpdater');
const PaymentManager = require('../services/payment/payment_manager');
const PrinterManager = require('../services/printer/printer_manager');
const PaymentStore = require('../services/database/payment_store');

// .env 파일 로드
dotenv.config();

// 로그 설정
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

const carWashManager = new CarWashManager();
const scannerManager = new ScannerManager();
const printerManager = new PrinterManager();
const paymentManager = new PaymentManager();
const paymentStore = new PaymentStore();

const isKiosk = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  const devToolWidth = isDevelopment ? 600 : 0;
  mainWindow = new BrowserWindow({
    width: isKiosk ? 1080 : (1080 + devToolWidth) * 0.4,
    height: isKiosk ? 1920 : 1920 * 0.4,
    fullscreen: isKiosk,
    kiosk: isKiosk,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
    },
    icon: path.join(__dirname, '../../assets/images/icon.png'),
  });

  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(process.resourcesPath, 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
    console.log('Loading URL:', mainWindow.getURL());
  }

  log.info('애플리케이션 창이 생성되었습니다.');

  // 세차기 초기화
  carWashManager.initialize();

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
    paymentManager.terminate();
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

ipcMain.handle('payment:approval', async (event, params) => {
  try {
    const result = await paymentManager.requestPayment(params);
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
});

ipcMain.handle('payment:cancel', async (event, params) => {
  const result = await paymentManager.requestCancel(params);
  return result;
});

ipcMain.handle('db:payment:get-payments-by-date', async (event, date) => {
  return await paymentStore.getPaymentsByDate(date);
});

ipcMain.handle('db:payment:register', async (event, params) => {
  return await paymentStore.registerPayment(params);
});

ipcMain.handle('db:payment:update', async (event, id, date, status, result) => {
  return await paymentStore.updatePayment(id, date, status, result);
});
