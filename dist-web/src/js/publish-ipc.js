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
            // board-view要素のHTMLとPNG画像を生成してmainプロセスに送信
            const html = board.innerHTML;
            let pngBase64 = null;
            if (window.html2canvas) {
              const canvas = await window.html2canvas(board, {
                backgroundColor: '#ffffff',
                scale: 1,
                useCORS: true,
                allowTaint: true,
                logging: false
              });
              pngBase64 = canvas.toDataURL('image/png');
            }
            const result = await ipcRenderer.invoke('publish-site', { html, png: pngBase64 });
            alert(result);
          }
        } catch (snapErr) {
          console.error('Failed to save board-view snapshot', snapErr);
        }
      } catch (err) {
        alert('公開に失敗しました:\n' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '📤 公開';
      }
    });
  });
}
