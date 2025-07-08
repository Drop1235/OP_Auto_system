import { app, BrowserWindow } from 'electron';
import path from 'node:path';

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
      // フロントは通常のブラウザコンテキストとして動作させる
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // 任意。なければ無視される
      nodeIntegration: false,
    },
  });

  // index.html（管理画面）を読み込む
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

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
