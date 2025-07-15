// データクリアスクリプト
// ブラウザのコンソールで実行してください

console.log('データクリア開始...');

// ローカルストレージの全データをクリア
localStorage.clear();
console.log('ローカルストレージをクリアしました');

// セッションストレージもクリア
sessionStorage.clear();
console.log('セッションストレージをクリアしました');

// IndexedDBのクリア（もしあれば）
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      console.log(`IndexedDB "${db.name}" を削除中...`);
      indexedDB.deleteDatabase(db.name);
    });
  }).catch(error => {
    console.log('IndexedDBのクリア中にエラー:', error);
  });
}

// キャッシュのクリア（Service Workerがあれば）
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        console.log(`キャッシュ "${cacheName}" を削除中...`);
        return caches.delete(cacheName);
      })
    );
  }).then(() => {
    console.log('全てのキャッシュをクリアしました');
  }).catch(error => {
    console.log('キャッシュのクリア中にエラー:', error);
  });
}

console.log('データクリア完了！ページを再読み込みしてください。');

// 自動でページをリロード
setTimeout(() => {
  window.location.reload();
}, 2000);
