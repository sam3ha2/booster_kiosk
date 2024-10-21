const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('machineIPC', {
  carWashCommand: (args) => ipcRenderer.invoke('car-wash-command', args),
  subscribeUpdates: (machineId, callback) => {
    const listener = (event, data) => {
      if (data.machineId === machineId) {
        callback(data.state);
      }
    };
    ipcRenderer.on('state-update', listener);
    ipcRenderer.send('subscribe-updates', machineId);
    return () => {
      ipcRenderer.removeListener('state-update', listener);
      ipcRenderer.send('unsubscribe-updates', machineId);
    };
  },
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
