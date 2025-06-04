const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  showConfirmDialog: (message) => ipcRenderer.invoke('show-confirm-dialog', message)
});

// Expose database API
contextBridge.exposeInMainWorld('database', {
  // Database operations will be implemented here
});
