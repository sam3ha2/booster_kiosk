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

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  const devToolWidth = isDevelopment ? 400 : 0;
  mainWindow = new BrowserWindow({
    width: 1080 + devToolWidth,
    height: 1920,
    fullscreen: !isDevelopment,
    kiosk: !isDevelopment,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
    },
    icon: path.join(__dirname, './src/assets/icons/png/64x64.png'),
  });

  mainWindow.setMenuBarVisibility(false);

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

  // 핸들러 먼저 초기화(*)
  initIPCHandlers();
  // 디바이스 초기화
  initDevices();
}

function initIPCHandlers() {
  setMachineHandlers();
  setScannerHandlers();
  setPrinterHandlers();
  setPaymentHandlers();
  setDatabaseHandlers();
  setAppHandlers();
}

function initDevices() {
  try {
    carWashManager.initialize();
  } catch (error) {
    console.error(error);
  }
  
  try {
    scannerManager.initialize();
  } catch (error) {
    console.error(error);
  }

  try {
    printerManager.initialize();
  } catch (error) {
    console.error(error);
  }

  try {
    paymentManager.initialize();
  } catch (error) {
    console.error(error);
  }


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

// IPC handlers
function setMachineHandlers() {
  ipcMain.handle('machine:start-wash', carWashManager.startWash.bind(carWashManager));
  ipcMain.handle('machine:stop-wash', carWashManager.stopWash.bind(carWashManager));
  ipcMain.handle('machine:reset', carWashManager.reset.bind(carWashManager));
  ipcMain.handle('machine:getStatus', carWashManager.getMachineStatus.bind(carWashManager));
  ipcMain.handle('machine:connect', carWashManager.connectDevice.bind(carWashManager));
  ipcMain.handle('machine:disconnect', carWashManager.disconnectDevice.bind(carWashManager));
}

function setScannerHandlers() {
  ipcMain.handle('scanner:connect', async (event) => {
    scannerManager.initialize();
    return scannerManager.getDeviceStatus();
  });

  ipcMain.handle('scanner:disconnect', async (event) => {
    scannerManager.disconnect();
    return scannerManager.getDeviceStatus();
  });

  ipcMain.handle('scanner:getStatus', async (event) => {
    return scannerManager.getDeviceStatus();
  });

  ipcMain.handle('scanner:beep', () => {
    scannerManager.beep();
    return true;
  });

  ipcMain.handle('scanner:light', (event, isOn) => {
    scannerManager.toggleLight(isOn);
    return true;
  });

  // 스캐너 이벤트 리스너 설정
  scannerManager.on('data', (data) => {
    mainWindow.webContents.send('qrCodeScanned', data);
  });

  scannerManager.on('error', (error) => {
    mainWindow.webContents.send('scannerError', error.message);
  });
}

function setPrinterHandlers() {
  ipcMain.handle('printer:connect', async (event) => {
    printerManager.initialize();
    return printerManager.getDeviceStatus();
  });

  ipcMain.handle('printer:disconnect', async (event) => {
    printerManager.disconnect();
    return printerManager.getDeviceStatus();
  });

  ipcMain.handle('printer:getStatus', async (event) => {
    return printerManager.getDeviceStatus();
  });

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

  ipcMain.handle('printer:printTest', async (event) => {
    return await printerManager.print({
      text: [
        { content: '123456789012345678901234567890123456789012345678901234567890', encoding: 'EUC-KR' },
        { content: 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz', encoding: 'EUC-KR' },
        { content: '가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하', encoding: 'EUC-KR' },
      ]
    });
  });
}

function setPaymentHandlers() {
  ipcMain.handle('payment:connect', async (event) => {
    paymentManager.initialize();
    return paymentManager.getDeviceStatus();
  });

  ipcMain.handle('payment:disconnect', async (event) => {
    paymentManager.terminate();
    return paymentManager.getDeviceStatus();
  });

  ipcMain.handle('payment:getStatus', async (event) => {
    return paymentManager.getDeviceStatus();
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
    try {
      const result = await paymentManager.requestCancel(params);
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  });
}

function setDatabaseHandlers() {
  ipcMain.handle('db:payment:get-payments-by-date', async (event, date) => {
    return await paymentStore.getPaymentsByDate(date);
  });

  ipcMain.handle('db:payment:register', async (event, params) => {
    return await paymentStore.registerPayment(params);
  });

  ipcMain.handle('db:payment:update', async (event, id, date, status, result) => {
    return await paymentStore.updatePayment(id, date, status, result);
  });
}

function setAppHandlers() {
  ipcMain.handle('app:toggle-kiosk', (event, enable) => {
    try {
      if (mainWindow) {
        mainWindow.setKiosk(enable);
        mainWindow.setFullScreen(enable);
        return { success: true, isKiosk: enable };
      }
      return { success: false, error: 'Window not found' };
    } catch (error) {
      console.error('키오스크 모드 설정 실패:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('app:get-kiosk-state', () => {
    return { 
      isKiosk: mainWindow ? mainWindow.isKiosk() : false 
    };
  });
  
  ipcMain.handle('app:relaunch', () => {
    app.relaunch();
    app.quit();
  });
  
  ipcMain.handle('app:quit', () => {
    app.quit();
  });
}
