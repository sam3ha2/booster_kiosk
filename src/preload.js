const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('machineIPC', {
  carWashCommand: (params) => ipcRenderer.invoke('car-wash-command', params),
});