document.addEventListener('DOMContentLoaded', () => {
  console.log('[AUTH] DOM content loaded, initializing auth system');
  
  // ローカルストレージベースのシステムでは認証をスキップ
  // 自動的に認証済み状態に設定
  localStorage.setItem('isAuthenticated', 'true');
  
  // ログアウトボタンを非表示にする
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.style.display = 'none';
  }
  
  // ローカルストレージマネージャーの初期化を待つ
  const initDataManagement = () => {
    if (window.localStorageManager) {
      console.log('[AUTH] LocalStorageManager found, adding data management buttons');
      addDataManagementButtons();
    } else {
      console.log('[AUTH] LocalStorageManager not ready, waiting...');
      setTimeout(initDataManagement, 100);
    }
  };
  
  initDataManagement();
});

// データ管理ボタンを追加する関数
function addDataManagementButtons() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  
  // オンライン/オフライン状態表示
  const statusIndicator = document.createElement('span');
  statusIndicator.id = 'connection-status';
  statusIndicator.style.cssText = 'margin-right: 10px; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;';
  updateConnectionStatus(statusIndicator);
  
  // データ保存ボタン
  const saveButton = document.createElement('button');
  saveButton.id = 'save-data-btn';
  saveButton.className = 'btn-secondary';
  saveButton.innerHTML = '💾 データ保存';
  saveButton.title = 'データをJSONファイルとして保存';
  
  // データ読込ボタン
  const loadButton = document.createElement('button');
  loadButton.id = 'load-data-btn';
  loadButton.className = 'btn-secondary';
  loadButton.innerHTML = '📁 データ読込';
  loadButton.title = 'JSONファイルからデータを読み込み';
  
  // データ情報ボタン
  const infoButton = document.createElement('button');
  infoButton.id = 'data-info-btn';
  infoButton.className = 'btn-secondary';
  infoButton.innerHTML = '📊 データ情報';
  infoButton.title = 'ストレージ使用量を表示';
  
  // ボタンをナビゲーションに追加
  nav.appendChild(statusIndicator);
  nav.appendChild(saveButton);
  nav.appendChild(loadButton);
  nav.appendChild(infoButton);
  
  // オンライン/オフライン状態の監視
  window.addEventListener('online', () => updateConnectionStatus(statusIndicator));
  window.addEventListener('offline', () => updateConnectionStatus(statusIndicator));
  
  // イベントリスナーを追加
  setupDataManagementEvents();
}

// オンライン/オフライン状態を更新する関数
function updateConnectionStatus(statusElement) {
  if (navigator.onLine) {
    statusElement.innerHTML = '🟢 オンライン';
    statusElement.style.backgroundColor = '#e8f5e8';
    statusElement.style.color = '#2e7d32';
    statusElement.title = 'インターネットに接続されています（ローカルストレージ使用中）';
  } else {
    statusElement.innerHTML = '🔴 オフライン';
    statusElement.style.backgroundColor = '#ffebee';
    statusElement.style.color = '#c62828';
    statusElement.title = 'オフラインモード（ローカルストレージ使用中）';
  }
}

// データ管理イベントを設定
function setupDataManagementEvents() {
  console.log('[AUTH] Setting up data management events');
  
  // データ保存
  document.getElementById('save-data-btn')?.addEventListener('click', () => {
    console.log('[AUTH] Save data button clicked');
    console.log('[AUTH] LocalStorageManager available:', !!window.localStorageManager);
    
    if (window.localStorageManager) {
      try {
        console.log('[AUTH] Calling exportAllData method');
        window.localStorageManager.exportAllData();
      } catch (error) {
        console.error('[AUTH] Error calling exportAllData:', error);
        alert('データ保存中にエラーが発生しました: ' + error.message);
      }
    } else {
      alert('データ管理システムが初期化されていません。');
    }
  });
  
  // データ読込
  document.getElementById('load-data-btn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file && window.localStorageManager) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const jsonData = event.target.result;
            window.localStorageManager.importAllData(jsonData);
          } catch (error) {
            alert('ファイルの読み込みに失敗しました: ' + error.message);
          }
        };
        reader.readAsText(file);
      } else if (!window.localStorageManager) {
        alert('データ管理システムが初期化されていません。');
      }
    };
    input.click();
  });
  
  // データ情報
  document.getElementById('data-info-btn')?.addEventListener('click', () => {
    if (window.localStorageManager) {
      const info = window.localStorageManager.getStorageInfo();
      alert(`ストレージ使用量:\n大会数: ${info.tournaments}\n試合数: ${info.matches}\n使用容量: ${info.size}`);
    } else {
      alert('データ管理システムが初期化されていません。');
    }
  });
}
