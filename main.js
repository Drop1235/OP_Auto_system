const electron = require('electron');
const path = require('path');

// Extract required components from electron
const { app, BrowserWindow, ipcMain, dialog } = electron;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;

// Create the browser window when Electron has finished initializing
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');
  
  // Uncomment to open DevTools automatically
  // mainWindow.webContents.openDevTools();

  // Clear the reference when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron is ready
app.on('ready', createWindow);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create window on macOS when dock icon is clicked
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

// IPC handler for showing confirm dialog
ipcMain.handle('show-confirm-dialog', (event, message) => {
  const options = {
    type: 'question',
    buttons: ['OK', 'キャンセル'],
    defaultId: 0, // Default button (OK)
    cancelId: 1,  // Button for cancel
    title: '確認',
    message: message,
  };
  const result = dialog.showMessageBoxSync(mainWindow, options);
  return result === 0; // Return true if OK was pressed, false otherwise
});
