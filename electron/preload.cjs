const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noa', {
  getSettings: () => ipcRenderer.invoke('noa:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('noa:save-settings', settings),
  testOpenAI: () => ipcRenderer.invoke('noa:test-openai'),
  sendChat: (payload) => ipcRenderer.invoke('noa:chat', payload),
  getDiagnostics: () => ipcRenderer.invoke('noa:get-diagnostics'),
  checkForUpdates: () => ipcRenderer.invoke('noa:check-for-updates')
});
