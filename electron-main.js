import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'url';

// __dirname / __filename Polyfill for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 禁止 multiple instance
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: false,
    },
  });

  // dist-web/index.html（管理画面フル機能版）を読み込む
  mainWindow.loadFile(path.join(__dirname, 'dist-web', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  // macOS 以外はウインドウがすべて閉じたら終了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // macOS: dock アイコンから再度アクティブになったとき
  if (mainWindow === null) {
    createMainWindow();
  }
});
