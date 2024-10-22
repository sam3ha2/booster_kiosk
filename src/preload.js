const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('machineIPC', {
  startWash: (machineId, mode) => ipcRenderer.invoke('start-wash', machineId, mode),
  stopWash: (machineId) => ipcRenderer.invoke('stop-wash', machineId),
  requestStatus: (machineId, turnOn) => ipcRenderer.send('request-status', machineId, turnOn),
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
