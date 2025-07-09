// Front-end glue code for Netlify auto deploy buttons
// Requires contextBridge exposure or nodeIntegration true.

let { deployToNetlify } = window.require ? window.require('../js/auto-deploy.js') : {};
let settings = window.require ? window.require('../js/settings-manager.js') : {};

// Browser fallback (nodeIntegration が無い場合)
if (!window.require) {
  // 簡易 SettingsManager 実装
  const TOKEN_KEY = 'netlify_access_token';
  const SITEID_KEY = 'netlify_site_id';
  settings = {
    loadNetlifySettings() {
      return {
        accessToken: localStorage.getItem(TOKEN_KEY) || '',
        siteId: localStorage.getItem(SITEID_KEY) || ''
      };
    },
    showSettingsDialog() {
      const current = this.loadNetlifySettings();
      const token = prompt('Netlifyアクセストークンを入力', current.accessToken);
      if (token !== null) {
        const siteId = prompt('Netlify Site IDを入力', current.siteId);
        if (siteId !== null) {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(SITEID_KEY, siteId);
          alert('設定を保存しました');
        }
      }
    }
  };

  // ブラウザではデプロイ処理は利用不可
  deployToNetlify = async () => {
    throw new Error('ブラウザ環境では公開処理は利用できません (Electron 版をご利用ください)');
  };
}

window.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settings-btn');
  const publishBtn  = document.getElementById('publish-btn');
  if (!settingsBtn || !publishBtn) return;

  settingsBtn.addEventListener('click', () => {
    if (settings.showSettingsDialog) settings.showSettingsDialog();
  });

  publishBtn.addEventListener('click', async () => {
    try {
      publishBtn.disabled = true;
      publishBtn.textContent = '公開中...';
      // -------------------- ローカル viewer 用 JSON 出力 --------------------
      if (window.require && window.boardInstance) {
        try {
          const fs   = window.require('fs');
          const path = window.require('path');
          const matches = Array.from(window.boardInstance.matchCards.values()).map(c => c.match);
          const outPath = path.join(__dirname, '..', '..', 'public-viewer', 'tennis-data-backup.json');
          fs.writeFileSync(outPath, JSON.stringify(matches, null, 2), 'utf8');
          console.log('[PUBLISH] Wrote viewer JSON:', outPath);
        } catch (err) {
          console.error('[PUBLISH] Failed to write viewer JSON:', err);
        }
      }
      // --------------------------------------------------------------------

      const { accessToken, siteId } = settings.loadNetlifySettings();
      const res = await deployToNetlify({ accessToken, siteId });
      alert('デプロイ完了: ' + res.deploy_ssl_url);
    } catch (e) {
      alert('デプロイ失敗: ' + e.message);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = '📤 公開';
    }
  });
});
