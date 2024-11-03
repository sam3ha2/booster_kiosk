const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('machineIPC', {
  startWash: (machineId, mode) => ipcRenderer.invoke('start-wash', machineId, mode),
  stopWash: (machineId) => ipcRenderer.invoke('stop-wash', machineId),
  onStatusUpdate: (callback) => ipcRenderer.on('status-update', (event, data) => callback(data)),
  offStatusUpdate: (callback) => ipcRenderer.removeListener('status-update', callback),
});

contextBridge.exposeInMainWorld('scannerAPI', {
  getInitialScannerState: () => ipcRenderer.invoke('getInitialScannerState'),
  beep: () => ipcRenderer.invoke('beep'),
  toggleLight: (isOn) => ipcRenderer.invoke('toggleLight', isOn),
  onQrCodeScanned: (callback) => ipcRenderer.on('qrCodeScanned', (event, data) => callback(data)),
  offQrCodeScanned: (callback) => ipcRenderer.removeListener('qrCodeScanned', callback),
  onScannerError: (callback) => ipcRenderer.on('scannerError', (event, error) => callback(error)),
  offScannerError: (callback) => ipcRenderer.removeListener('scannerError', callback),
  onScannerInitFailed: (callback) => ipcRenderer.on('scannerInitFailed', (event, message) => callback(message)),
  offScannerInitFailed: (callback) => ipcRenderer.removeListener('scannerInitFailed', callback),
});

contextBridge.exposeInMainWorld('printerIPC', {
  printReceipt: (data) => ipcRenderer.invoke('printer:print', data),
});

contextBridge.exposeInMainWorld('paymentIPC', {
  processApproval: (params) => ipcRenderer.invoke('payment:approval', params),
  processCancel: (params) => ipcRenderer.invoke('payment:cancel', params),
});

contextBridge.exposeInMainWorld('databaseIPC', {
  getPaymentsByDate: (date) => ipcRenderer.invoke('db:payment:get-payments-by-date', date),
  registerPayment: (params) => ipcRenderer.invoke('db:payment:register', params),
  updatePaymentSuccess: (id, date, result) => ipcRenderer.invoke('db:payment:update', id, date, 'APPROVED', result),
  updatePaymentFailure: (id, date, error) => ipcRenderer.invoke('db:payment:update', id, date, 'FAILED', error),
  updatePaymentCancel: (id, date, result) => ipcRenderer.invoke('db:payment:update', id, date, 'CANCELED', result),
}); 
