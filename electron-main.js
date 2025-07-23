const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
// CommonJSでは__dirname/__filenameは自動定義されるのでポリフィル不要

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
      const fs = require('fs');
      const htmlPath = path.join(__dirname, 'dist-web', 'board-view.html');
      fs.writeFileSync(htmlPath, boardHtml, 'utf8');
      console.log('board-view.html saved to', htmlPath);
    }
  } catch (e) {
    console.error('Failed to write board-view.html', e);
  }
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const image = await mainWindow.capturePage();
      const fs = require('fs');
      const screenshotPath = path.join(__dirname, 'dist-web', 'screenshot.png');
      fs.writeFileSync(screenshotPath, image.toPNG());
      console.log('Screenshot saved to', screenshotPath);
    }
  } catch (capErr) {
    console.error('Failed to capture screenshot', capErr);
  }
  // In dev we spawn a separate Node process. In production (packaged) Node binary is not
  // available on the end-user PC,なので同一プロセスで実行する。
  if (app.isPackaged) {
    try {
      require(path.join(__dirname, 'update.cjs'));
      return '公開が完了しました。Netlify がデプロイを開始しました。';
    } catch (err) {
      console.error('update.cjs failed', err);
      throw err;
    }
  }
  return await new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(__dirname, 'update.cjs');
      const distWebPath = path.join(__dirname, 'dist-web');
      const proc = spawn(process.execPath, [scriptPath, distWebPath], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: process.platform === 'win32', // allow paths with spaces like "Program Files"
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
    height: 2500,
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
