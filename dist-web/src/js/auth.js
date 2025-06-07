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
      localStorage.removeItem('isAuthenticated');
      window.location.href = 'login.html';
    });
  }
});
