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
        // Save board-view HTML snapshot to dist-web/board-view.html
        try {
          const board = document.getElementById('board-view');
          if (board) {
            const fs = window.require('fs');
            const path = window.require('path');
            const htmlPath = path.join(__dirname, '..', '..', 'board-view.html');
            fs.writeFileSync(htmlPath, board.innerHTML, 'utf8');
            console.log('Saved board-view snapshot to', htmlPath);
            window.alert('対戦表を保存しました。デプロイを開始します。');
          }
        } catch (snapErr) {
          console.error('Failed to save board-view snapshot', snapErr);
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
