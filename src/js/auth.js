document.addEventListener('DOMContentLoaded', () => {
  // 認証状態をチェック
  if (localStorage.getItem('isAuthenticated') !== 'true') {
    // 認証されていない場合はログイン画面にリダイレクト
    window.location.href = 'login.html';
  }
  
  // ログアウト機能
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      if (confirm('本当にログアウトしますか？')) {
        localStorage.removeItem('isAuthenticated');
        
        // ログイン画面への遷移前にローカルストレージにフラグを設定
        localStorage.setItem('justLoggedOut', 'true');
        
        // メインプロセスにログイン画面表示を依頼（フォーカス確保）
        if (window.electronAPI && window.electronAPI.showLogin) {
          window.electronAPI.showLogin();
        }
      }
    });
  }
});
