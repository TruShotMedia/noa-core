const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noa', {
  getSettings: () => ipcRenderer.invoke('noa:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('noa:save-settings', settings),
  testOpenAI: () => ipcRenderer.invoke('noa:test-openai'),
  testNotion: () => ipcRenderer.invoke('noa:test-notion'),
  sendChat: (payload) => ipcRenderer.invoke('noa:chat', payload),
  getDiagnostics: () => ipcRenderer.invoke('noa:get-diagnostics'),
  startupHealthCheck: () => ipcRenderer.invoke('noa:startup-health-check'),
  getKnowledgeGraph: () => ipcRenderer.invoke('noa:get-knowledge-graph'),
  checkForUpdates: () => ipcRenderer.invoke('noa:check-for-updates')
});
