const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('configIPC', {
  loadConfig: () => ipcRenderer.invoke('config:load'),
});

contextBridge.exposeInMainWorld('machineIPC', {
  startWash: (mode) => ipcRenderer.invoke('machine:start-wash', mode),
  stopWash: () => ipcRenderer.invoke('machine:stop-wash'),
  reset: () => ipcRenderer.invoke('machine:reset'),
  onStatusUpdate: (callback) => {
    ipcRenderer.removeAllListeners('status-update');
    ipcRenderer.on('status-update', (event, data) => callback(data));
  },
  offStatusUpdate: (callback) => ipcRenderer.removeListener('status-update', callback),
  getMachineStatus: () => ipcRenderer.invoke('machine:getStatus'),
  connectMachine: () => ipcRenderer.invoke('machine:connect'),
  disconnectMachine: () => ipcRenderer.invoke('machine:disconnect'),
});

contextBridge.exposeInMainWorld('scannerIPC', {
  connect: () => ipcRenderer.invoke('scanner:connect'),
  disconnect: () => ipcRenderer.invoke('scanner:disconnect'),
  getStatus: () => ipcRenderer.invoke('scanner:getStatus'),
  beep: () => ipcRenderer.invoke('scanner:beep'),
  toggleLight: (isOn) => ipcRenderer.invoke('scanner:light', isOn),
  onQrCodeScanned: (callback) => {
    ipcRenderer.removeAllListeners('qrCodeScanned');
    ipcRenderer.on('qrCodeScanned', (event, data) => callback(data));
  },
  offQrCodeScanned: (callback) => ipcRenderer.removeListener('qrCodeScanned', callback),
  onScannerError: (callback) => {
    ipcRenderer.removeAllListeners('scannerError');
    ipcRenderer.on('scannerError', (event, error) => callback(error));
  },
  offScannerError: (callback) => ipcRenderer.removeListener('scannerError', callback),
});

contextBridge.exposeInMainWorld('printerIPC', {
  connect: () => ipcRenderer.invoke('printer:connect'),
  disconnect: () => ipcRenderer.invoke('printer:disconnect'),
  getStatus: () => ipcRenderer.invoke('printer:getStatus'),
  printReceipt: (data) => ipcRenderer.invoke('printer:print', data),
  printTest: () => ipcRenderer.invoke('printer:printTest'),
});

contextBridge.exposeInMainWorld('paymentIPC', {
  connect: () => ipcRenderer.invoke('payment:connect'),
  disconnect: () => ipcRenderer.invoke('payment:disconnect'),
  getStatus: () => ipcRenderer.invoke('payment:getStatus'),
  processApproval: (params) => ipcRenderer.invoke('payment:approval', params),
  processCancel: (params) => ipcRenderer.invoke('payment:cancel', params),
});

contextBridge.exposeInMainWorld('databaseIPC', {
  getPaymentsByDate: (date) => ipcRenderer.invoke('db:payment:get-payments-by-date', date),
  registerPayment: (params) => ipcRenderer.invoke('db:payment:register', params),
  updatePaymentSuccess: (id, date, result) =>
    ipcRenderer.invoke('db:payment:update', id, date, 'APPROVED', result),
  updatePaymentFailure: (id, date, error) =>
    ipcRenderer.invoke('db:payment:update', id, date, 'FAILED', error),
  updatePaymentCancel: (id, date, result) =>
    ipcRenderer.invoke('db:payment:update', id, date, 'CANCELED', result),
});

contextBridge.exposeInMainWorld('appControl', {
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  quit: () => ipcRenderer.invoke('app:quit'),
  toggleKiosk: (enable) => ipcRenderer.invoke('app:toggle-kiosk', enable),
  getKioskState: () => ipcRenderer.invoke('app:get-kiosk-state'),
});
