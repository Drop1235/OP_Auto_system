// publish-ipc.js
// Electron renderer -> main process publish handler
if (window.require) {
  const { ipcRenderer } = window.require('electron');
  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('publish-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        btn.disabled = true;
        const original = btn.textContent;
        btn.textContent = '公開中...';
        // Capture board-view as PNG via html2canvas and save to dist-web/screenshot.png
        try {
          const board = document.getElementById('board-view');
          if (board && window.html2canvas) {
            const canvas = await window.html2canvas(board);
            const dataURL = canvas.toDataURL('image/png');
            const base64 = dataURL.split(',')[1];
            const buf = Buffer.from(base64, 'base64');
            const fs = window.require('fs');
            const path = window.require('path');
            const screenshotPath = path.join(__dirname, '..', '..', 'screenshot.png');
            fs.writeFileSync(screenshotPath, buf);
            console.log('screenshot saved to', screenshotPath);
          }
        } catch (capErr) {
          console.error('Failed to capture screenshot', capErr);
        }
        const result = await ipcRenderer.invoke('publish-site');
        alert(result);
      } catch (err) {
        alert('公開に失敗しました:\n' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '📤 公開';
      }
    });
  });
}
