const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noa', {
  getVersion: () => ipcRenderer.invoke('noa:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('noa:check-for-updates')
});
