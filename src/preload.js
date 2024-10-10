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