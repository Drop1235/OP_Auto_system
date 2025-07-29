import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Supabaseクライアントの初期化
const supabaseModule = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
const createClient = supabaseModule.createClient;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ローカルバックアップ(JSON)を取得するフォールバック
async function fetchBackupData() {
  try {
    const res = await fetch('tennis-data-backup.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('バックアップJSONが見つかりません');
    const json = await res.json();
    console.log('[VIEWER] バックアップJSONを読み込みました', json);
    return Array.isArray(json) ? json : (json.matches || []);
  } catch (e) {
    console.warn('[VIEWER] バックアップ読み込み失敗:', e);
    return [];
  }
}

// 最新のmatch_dataレコードを取得
async function fetchLatestMatchData() {
  const { data, error } = await supabase
    .from('match_data')
    .select('id, data')
    .order('id', { ascending: false })
    .limit(1);
  if (error) {
    console.error('[VIEWER] Supabase取得エラー:', error);
    return [];
  }
  if (!data || data.length === 0) return [];
  try {
    // data[0].dataは配列のはず
    return typeof data[0].data === 'string' ? JSON.parse(data[0].data) : data[0].data;
  } catch (e) {
    console.error('[VIEWER] JSONパースエラー:', e);
    return [];
  }
}

// コートごとのカードを描画
function renderCourts(matchData) {
  // 動的にコート数を算出
  const maxCourt = Math.max(...matchData.map(m => Number.isFinite(m.courtNumber) ? m.courtNumber : 0), 0);
  const courts = Array.from({ length: maxCourt }, () => []);
  const unassigned = [];

  // コート割当と未割当を分類
  for (const match of matchData) {
    const cNum = Number(match.courtNumber);
    if (Number.isInteger(cNum) && cNum >= 1 && cNum <= courts.length) {
      courts[cNum - 1].push(match);
    } else {
      unassigned.push(match);
    }
  }

  const container = document.getElementById('courts-container');
  container.innerHTML = '';
  for (let i = 0; i < courts.length; i++) {
    const col = document.createElement('div');
    col.className = 'court-column';
    col.innerHTML = `<div class="court-title">コート${i+1}</div>`;
    courts[i].forEach(match => {
      col.appendChild(createMatchCard(match));
    });
    container.appendChild(col);
  }

  // 未割当
  const uaList = document.getElementById('unassigned-list');
  uaList.innerHTML = '';
  if (unassigned.length === 0) {
    uaList.textContent = '未割当の試合はありません';
  } else {
    unassigned.forEach(match => {
      uaList.appendChild(createMatchCard(match));
    });
  }
}

// 1試合分のカードを生成（編集・削除ボタンなし、閲覧専用）
function createMatchCard(match) {
  const card = document.createElement('div');
  card.className = 'match-card';
  // 上部: 形式・時間
  const header = document.createElement('div');
  header.className = 'match-header';
  header.innerHTML = `<span class="match-format">${match.gameFormat || ''}</span>` +
    (match.time ? `<span class="match-time">${match.time}</span>` : '');
  card.appendChild(header);
  // プレイヤーA
  const rowA = document.createElement('div');
  rowA.className = 'match-row';
  rowA.innerHTML = `<input class="match-player" value="${match.playerA || ''}" disabled>` +
    (match.winner === 'A' ? '<span class="match-winner">✔</span>' : '') +
    `<input class="match-score" value="${match.scoreA ?? ''}" disabled>`;
  card.appendChild(rowA);
  // プレイヤーB
  const rowB = document.createElement('div');
  rowB.className = 'match-row';
  rowB.innerHTML = `<input class="match-player" value="${match.playerB || ''}" disabled>` +
    (match.winner === 'B' ? '<span class="match-winner">✔</span>' : '') +
    `<input class="match-score" value="${match.scoreB ?? ''}" disabled>`;
  card.appendChild(rowB);
  return card;
}

// 初期化
(async () => {
  let matchData = await fetchLatestMatchData();
  if (matchData.length === 0) {
    console.info('[VIEWER] Supabaseからデータが取得できなかったためバックアップを読み込みます');
    matchData = await fetchBackupData();
  }
  if (matchData.length === 0) {
    alert('表示できる試合データが見つかりませんでした。管理画面から「📤 最新情報を公開」するか、public-viewer フォルダに backup JSON を置いてください。');
  }
  // 履歴へ移動した試合は除外（status が 'Completed' または 'History' のものを除く）
  matchData = matchData.filter(m => !m.status || (m.status !== 'Completed' && m.status !== 'History'));
  console.log('[VIEWER] 最終的に使用するmatchData:', matchData);
  renderCourts(matchData);
})();

document.addEventListener('DOMContentLoaded', function () {
  const publishBtn = document.getElementById('publish-btn');
  const publishTimestamp = document.getElementById('publish-timestamp');
  if (publishBtn && publishTimestamp) {
    publishBtn.addEventListener('click', function () {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      publishTimestamp.textContent = `公開: ${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    });
  }
});
