const electron = require('electron');
const path = require('path');
const fs = require('fs');

// Extract required components from electron
const { app, BrowserWindow, ipcMain, dialog, screen } = electron;

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
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');
  
  // 開発ツールを自動的に開く
  mainWindow.webContents.openDevTools();

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

// スクリーンショット機能のIPC handler
ipcMain.handle('take-screenshot', async (event, filename) => {
  try {
    // キャプチャするウィンドウを取得
    if (!mainWindow) {
      throw new Error('メインウィンドウが存在しません');
    }
    
    // スクリーンショットを撮影
    const image = await mainWindow.webContents.capturePage();
    
    // 保存先のパスを取得（ユーザーに選択させる）
    const options = {
      title: 'スクリーンショットの保存',
      defaultPath: path.join(app.getPath('pictures'), filename),
      filters: [
        { name: 'Images', extensions: ['png'] }
      ]
    };
    
    const { canceled, filePath } = await dialog.showSaveDialog(options);
    
    if (canceled || !filePath) {
      return { success: false, message: '保存がキャンセルされました' };
    }
    
    // PNGとして保存
    fs.writeFileSync(filePath, image.toPNG());
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('スクリーンショットエラー:', error);
    return { success: false, message: error.message };
  }
});
