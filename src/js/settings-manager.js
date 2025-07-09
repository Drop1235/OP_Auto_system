// Netlify設定UI・トークン管理

const TOKEN_KEY = 'netlify_access_token';
const SITEID_KEY = 'netlify_site_id';

export function saveNetlifySettings(token, siteId) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(SITEID_KEY, siteId);
}

export function loadNetlifySettings() {
    return {
        accessToken: localStorage.getItem(TOKEN_KEY) || '',
        siteId: localStorage.getItem(SITEID_KEY) || ''
    };
}

export function showSettingsDialog() {
    const current = loadNetlifySettings();
    const token = prompt('Netlifyアクセストークンを入力', current.accessToken);
    if (token !== null) {
        const siteId = prompt('Netlify Site IDを入力', current.siteId);
        if (siteId !== null) {
            saveNetlifySettings(token, siteId);
            alert('設定を保存しました');
        }
    }
}
