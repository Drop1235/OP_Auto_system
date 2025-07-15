import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
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

// -----------------------------------------------------------------------------
// IPC: "publish-site" -> Run update.js to push static site and deploy via Netlify
// -----------------------------------------------------------------------------
ipcMain.handle('publish-site', async (event, boardHtml) => {
  // Save board-view.html received from renderer
  try {
    if (typeof boardHtml === 'string') {
      const fs = await import('node:fs/promises');
      const htmlPath = path.join(__dirname, 'dist-web', 'board-view.html');
      await fs.writeFile(htmlPath, boardHtml, 'utf8');
      console.log('board-view.html saved to', htmlPath);
    }
  } catch (e) {
    console.error('Failed to write board-view.html', e);
  }
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const image = await mainWindow.capturePage();
      const fs = await import('node:fs/promises');
      const screenshotPath = path.join(__dirname, 'dist-web', 'screenshot.png');
      await fs.writeFile(screenshotPath, image.toPNG());
      console.log('Screenshot saved to', screenshotPath);
    }
  } catch (capErr) {
    console.error('Failed to capture screenshot', capErr);
  }
  return await new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(__dirname, 'update.js');
      const distWebPath = path.join(__dirname, 'dist-web');
      const proc = spawn(process.execPath, [scriptPath, distWebPath], {
        cwd: __dirname,
        stdio: 'inherit',
      });
      proc.on('close', code => {
        if (code === 0) {
          resolve('公開が完了しました。Netlify がデプロイを開始しました。');
        } else {
          reject(new Error(`update.js exited with code ${code}`));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
});

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
