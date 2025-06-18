const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  showConfirmDialog: (message) => ipcRenderer.invoke('show-confirm-dialog', message),
  focusWindow: () => ipcRenderer.invoke('focus-window'),
  showLogin: () => ipcRenderer.invoke('show-login')
});

// Expose API for taking screenshots
contextBridge.exposeInMainWorld('api', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  showConfirmDialog: (message) => ipcRenderer.invoke('show-confirm-dialog', message),
  // スクリーンショット機能
  takeScreenshot: (filename) => ipcRenderer.invoke('take-screenshot', filename),
  // ウィンドウ再作成機能
  restartWindow: () => ipcRenderer.invoke('restart-window')
});

// Expose database API
contextBridge.exposeInMainWorld('database', {
  // Database operations will be implemented here
});
