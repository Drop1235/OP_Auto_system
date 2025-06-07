document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('error-message');
  
  // 初期パスワード - 実際の運用では適切に変更してください
  const initialPassword = 'tennis2025';
  
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const enteredPassword = passwordInput.value;
    
    if (enteredPassword === initialPassword) {
      // パスワードが正しい場合、ログイン状態を保存してメイン画面へリダイレクト
      localStorage.setItem('isAuthenticated', 'true');
      window.location.href = 'index.html';
    } else {
      // パスワードが間違っている場合、エラーメッセージを表示
      errorMessage.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  });
  
  // すでにログイン済みの場合は直接メイン画面へリダイレクト
  if (localStorage.getItem('isAuthenticated') === 'true') {
    window.location.href = 'index.html';
  }
});
