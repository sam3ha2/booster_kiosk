const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('machineIPC', {
  carWashCommand: (args) => ipcRenderer.invoke('car-wash-command', args),
  subscribeProcessUpdates: (machineId, callback) => {
    ipcRenderer.on('process-update', (event, data) => {
      if (data.machineId === machineId) {
        callback(data.process);
      }
    });
    ipcRenderer.send('subscribe-process-updates', machineId);
  },
  unsubscribeProcessUpdates: (machineId) => {
    ipcRenderer.removeAllListeners('process-update');
    ipcRenderer.send('unsubscribe-process-updates', machineId);
  },
});