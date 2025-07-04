// Match Card Component
class MatchCard {
  constructor(match) {
    this.match = match;
    this.element = null;
    this.dragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialLeft = 0;
    this.initialTop = 0;
    this.dragThreshold = 5; // px
    
    // スコア文字列をパースしてセットスコアを算出
    const numSets = this._getNumberOfSets(); // 試合形式に応じたセット数
    this.scoresA = this._parseScores(this.match.scoreA, numSets);
    this.scoresB = this._parseScores(this.match.scoreB, numSets);

    // setScores が未定義、または長さが一致しない場合は、パース結果で上書き
    this.match.setScores = {
      A: [...this.scoresA],
      B: [...this.scoresB]
    };

    // 旧ロジック互換のため scoreA / scoreB 文字列も整形して保持
    this.match.scoreA = this._stringifyScores(this.scoresA);
    this.match.scoreB = this._stringifyScores(this.scoresB);

    // 勝者情報の初期化
    if (this.match.winner === undefined) {
      this.match.winner = null; // null, 'A', 'B' のいずれか
    }

    // Initialize game format options (should match modal)
    this.gameFormatOptions = {
      '5game': '5G',
      '4game1set': '4G1set',
      '6game1set': '6G1set',
      '8game1set': '8G-Pro',
      '4game2set': '4G2set+10MTB',
      '6game2set': '6G2set+10MTB',
      '4game3set': '4G3set',
      '6game3set': '6G3set',
    };
    
    // gameFormatが設定されていない場合のみデフォルト値を設定
    if (!this.match.gameFormat) {
      this.match.gameFormat = '5game'; // Default to '5game'
    }

    if (!this.match.memo) this.match.memo = '';
    this.match.tieBreakA = this.match.tieBreakA || '';
    this.match.tieBreakB = this.match.tieBreakB || '';
    
    this.element = this.createCardElement();
    this.setupDragAndDrop();
    // These methods below will require significant updates later:
    this.updateScoreInputsInteractivity(); 
    this.updateWinStatus(); 
    this.updateEndTimeDisplay();
    this.addDoubleClickToHistoryListener();
  }

  _getNumberOfSets() {
    // ゲーム形式に応じて必要なセット数を返す
    switch (this.match.gameFormat) {
      // BO3（3セット先取）
      case '4game3set':
      case '6game3set':
        return 3;
      // BO3（2セット先取）
      case '4game2set':
      case '6game2set':
        return 2;
      // それ以外（ワンセットマッチ等）
      default:
        return 1;
    }
  }

  _parseScores(scoreString, numSets) {
    const defaultScores = Array(numSets).fill(null);
    if (typeof scoreString !== 'string' || scoreString.trim() === '') {
      return defaultScores;
    }
    const parts = scoreString.split(',');
    const scores = parts.map(s => {
      const num = parseInt(s, 10);
      return isNaN(num) ? null : num;
    });
    // Ensure the array has the correct number of sets, padding with null if necessary
    while (scores.length < numSets) {
      scores.push(null);
    }
    return scores.slice(0, numSets); // Truncate if too long (e.g., format change)
  }

  _stringifyScores(scoresArray) {
    if (!Array.isArray(scoresArray)) return '';
    return scoresArray.map(s => (s === null || s === undefined || s === '') ? '' : String(s)).join(',');
  }

  // Create the match card DOM element
  createCardElement() {
    console.log('[MATCH_CARD] createCardElement called for match ID:', this.match.id);
    
    const card = document.createElement('div');
    card.className = 'match-card';
    card.id = `match-${this.match.id}`;
    card.setAttribute('draggable', 'true');
    card.dataset.matchId = this.match.id;

    // カード上部（リーグ名とメモ）
    const headerDiv = document.createElement('div');
    headerDiv.className = 'match-card-header';
    
    // 削除ボタン (×) - ヘッダーの最初に追加
    const deleteButton = document.createElement('span');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = '×';
    deleteButton.title = 'この試合を削除'; // ツールチップ
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation(); // カード全体のドラッグイベント等に影響しないように
      this.handleDeleteMatch();
    });
    headerDiv.appendChild(deleteButton);
    
    // 試合形式を表示のみにするテキスト要素を追加
    const gameFormatDisplay = document.createElement('div');
    gameFormatDisplay.className = 'match-card-game-format-display';
    
    // 現在の試合形式のラベルを取得
    const currentFormat = (this.match.gameFormat || '').toLowerCase();
    const formatLabel = this.gameFormatOptions[currentFormat] || currentFormat;
    
    // 試合形式の表示を設定
    gameFormatDisplay.textContent = formatLabel;
    gameFormatDisplay.title = '試合形式は変更できません。変更する場合は新規に試合を作成してください。ダブルクリックで試合を完了して履歴に移動します。';
    
    // ダブルクリックで試合を完了させて履歴に移動するイベントを追加
    gameFormatDisplay.addEventListener('dblclick', async (e) => {
      e.stopPropagation(); // 他のイベントへの伝播を防止
      
      try {
        // 確認ダイアログを表示
        const confirmMove = confirm('この試合を完了して履歴に移動しますか？');
        
        if (confirmMove) {
          // 試合を完了状態に更新
          const updatedMatch = await db.updateMatch({
            id: this.match.id,
            status: 'Completed',
            actualEndTime: new Date().toISOString()
          });
          
          // 更新イベントを発行
          const updateEvent = new CustomEvent('match-updated', {
            detail: { match: updatedMatch }
          });
          document.dispatchEvent(updateEvent);
        }
      } catch (error) {
        console.error('試合の完了処理中にエラーが発生しました:', error);
        alert('試合の完了処理中にエラーが発生しました');
      }
    });
    
    console.log('[MATCH_CARD] Setting game format display:', formatLabel);
    
    headerDiv.appendChild(gameFormatDisplay);

    // 実際の終了時間
    const endTimeInput = document.createElement('input');
    endTimeInput.type = 'time';
    endTimeInput.className = 'match-end-time-input';
    if (this.match.actualEndTime) {
      const endTime = new Date(this.match.actualEndTime);
      const hours = endTime.getHours().toString().padStart(2, '0');
      const minutes = endTime.getMinutes().toString().padStart(2, '0');
      endTimeInput.value = `${hours}:${minutes}`;
    }
    endTimeInput.addEventListener('change', (e) => {
      if (e.target.value) {
        // 現在の日付を取得し、時間だけ変更
        const now = new Date();
        const [hours, minutes] = e.target.value.split(':');
        now.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        this.updateMatchData({ actualEndTime: now.toISOString() });
      } else {
        this.updateMatchData({ actualEndTime: null });
      }
      this.checkLeagueWinCondition();
    });
    
    headerDiv.appendChild(endTimeInput);
  
  // プレイヤー情報（縦に配置）
    const playersContainer = document.createElement('div');
    playersContainer.className = 'match-card-players-container';
    
    // プレイヤーA
    const playerADiv = document.createElement('div');
    playerADiv.className = 'match-card-player';
    // プレイヤー名
    const playerAInput = document.createElement('input');
    playerAInput.type = 'text';
    playerAInput.className = 'player-name-input';
    playerAInput.dataset.player = 'A'; // Add data-player attribute
    playerAInput.value = this.match.playerA;
    playerAInput.addEventListener('change', (e) => {
      this.updateMatchData({ playerA: e.target.value });
    });
    
    // プレイヤー名の入力欄をそのまま追加
    playerADiv.appendChild(playerAInput);
    
    // スコア入力A
    if (this.match.gameFormat === '6game3set' || this.match.gameFormat === '4game3set' || 
        this.match.gameFormat === '4game2set' || this.match.gameFormat === '6game2set') {
      // BO3形式の場合は3セット分のスコア入力欄を表示
      const setScoresContainerA = document.createElement('div');
      setScoresContainerA.className = 'set-scores-container';
      
      // 3セット分のスコア入力欄を作成
      for (let i = 0; i < 3; i++) {
        const setScoreInput = document.createElement('input');
        setScoreInput.type = 'number';
        setScoreInput.min = '0';
        setScoreInput.max = '99';
        setScoreInput.className = 'set-score-input';
        setScoreInput.dataset.player = 'A';
        setScoreInput.dataset.set = i;
        setScoreInput.value = this.match.setScores?.A[i] || '';
        
        setScoreInput.addEventListener('change', (e) => {
          // セットスコアを更新
          if (!this.match.setScores) {
            this.match.setScores = { A: [0, 0, 0], B: [0, 0, 0] };
          }
          this.match.setScores.A[i] = parseInt(e.target.value) || 0;
          
          // 全体のスコアを計算（勝ったセット数）
          this.calculateTotalScore();
          
          // DB更新
          this.updateMatchData({
            scoreA: this.match.scoreA,
            scoreB: this.match.scoreB,
            setScores: this.match.setScores
          });
          
          this.updateDynamicElements();
          this.checkLeagueWinCondition();
        });
        
        setScoreInput.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        
        setScoresContainerA.appendChild(setScoreInput);
      }
      
      playerADiv.appendChild(setScoresContainerA);
      
      // 合計スコア表示用の要素
      const totalScoreA = document.createElement('div');
      totalScoreA.className = 'total-score';
      totalScoreA.textContent = this.match.scoreA || '0';
      totalScoreA.dataset.player = 'A';
      playerADiv.appendChild(totalScoreA);
    } else {
      // 通常のスコア入力欄
      const scoreAInput = document.createElement('input');
      scoreAInput.type = 'number';
      scoreAInput.min = '0';
      scoreAInput.max = '99';
      scoreAInput.className = 'score-input';
      scoreAInput.dataset.player = 'A';
      scoreAInput.value = (this.match.scoreA === null || this.match.scoreA === undefined) ? '' : this.match.scoreA;
      this.scoreAInput = scoreAInput; // Assign to instance property
      
      scoreAInput.addEventListener('change', (e) => {
        this.match.scoreA = parseInt(e.target.value) || 0;
        this.updateMatchData({ scoreA: this.match.scoreA });
        this.updateDynamicElements();
        console.log('[DEBUG] scoreA changed:', this.match.scoreA, 'gameFormat:', this.match.gameFormat);
        this.checkLeagueWinCondition();
      });
      
      scoreAInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      // スコア入力欄の上にタイブレーク入力欄を表示するコンテナ
      const scoreContainerA = document.createElement('div');
      scoreContainerA.style.display = 'flex';
      scoreContainerA.style.flexDirection = 'column';
      scoreContainerA.style.alignItems = 'center';
      scoreContainerA.style.gap = '2px';
      
      // タイブレーク入力欄のクローンを作成
      const tiebreakDivA = document.createElement('div');
      tiebreakDivA.className = 'tiebreak-score-container-a';
      tiebreakDivA.style.display = 'none'; // 初期状態では非表示
      tiebreakDivA.style.marginTop = '2px'; // スコア入力欄との間隔
      
      // タイブレークスコア入力フィールド
      const tiebreakInputA = document.createElement('input');
      tiebreakInputA.type = 'number';
      tiebreakInputA.min = '0';
      tiebreakInputA.max = '99';
      tiebreakInputA.className = 'tiebreak-score-input';
      tiebreakInputA.dataset.tiebreak = 'A'; // data-tiebreak属性を追加
      tiebreakInputA.style.width = '30px'; // 幅を小さく
      tiebreakInputA.style.height = '20px'; // 高さを小さく
      tiebreakInputA.style.fontSize = '0.8em'; // フォントサイズを小さく
      tiebreakInputA.style.padding = '0 2px'; // パディングを小さく
      tiebreakInputA.placeholder = 'TB';
      // 既存のタイブレークスコア値を設定
      tiebreakInputA.value = this.match.tieBreakA || '';
      
      // カッコで囲む
      const tbOpenParenA = document.createElement('span');
      tbOpenParenA.textContent = '(';
      tbOpenParenA.style.fontSize = '0.8em';
      
      const tbCloseParenA = document.createElement('span');
      tbCloseParenA.textContent = ')';
      tbCloseParenA.style.fontSize = '0.8em';
      
      tiebreakDivA.appendChild(tbOpenParenA);
      tiebreakDivA.appendChild(tiebreakInputA);
      tiebreakDivA.appendChild(tbCloseParenA);
      
      // タイブレーク入力のイベントリスナーを設定
      tiebreakInputA.addEventListener('change', (e) => {
        const value = e.target.value;
        const score = value === '' ? null : parseInt(value, 10);
        this.match.tieBreakA = score;
        this.updateMatchData({ tieBreakA: this.match.tieBreakA });
      });
      
      tiebreakInputA.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      // スコア入力欄を先に追加し、その後にタイブレーク入力欄を追加
      scoreContainerA.appendChild(scoreAInput);
      scoreContainerA.appendChild(tiebreakDivA);
      
      this.tiebreakDivA = tiebreakDivA;
      this.tiebreakInputA = tiebreakInputA;
      
      playerADiv.appendChild(scoreContainerA);
    }
    
    // Win表示/ボタン（プレイヤーA）
    const winADiv = document.createElement('div');
    winADiv.className = 'win-label';
    winADiv.dataset.player = 'A';
    
    // 常にクリックイベントを追加するように修正
    winADiv.textContent = this.match.winner === 'A' ? '✔' : '●';
    winADiv.style.color = this.match.winner === 'A' ? 'red' : '';
    if (this.match.winner === 'A') {
      winADiv.classList.remove('win-button');
    } else {
      winADiv.classList.add('win-button');
    }
    
    // Winボタンのクリックイベントを追加
    winADiv.addEventListener('click', (e) => {
      e.stopPropagation(); // ダブルクリックイベントの伝播を防止
      
      // 現在の勝者をクリア
      if (this.match.winner === 'A') {
        this.match.winner = null;
        // Win状態が解除されたときに終了時刻をクリア
        this.match.actualEndTime = null;
      } else {
        // Aを勝者に設定
        this.match.winner = 'A';
        // Win状態になったときに現在時刻を自動設定
        const now = new Date();
        this.match.actualEndTime = now.toISOString();
      }
      
      // DB更新
      this.updateMatchData({ 
        winner: this.match.winner,
        actualEndTime: this.match.actualEndTime 
      });
      
      // UI更新
      this.updateWinStatus();
      this.updateEndTimeDisplay();
    });
    winADiv.dataset.player = 'A';
    playerADiv.appendChild(winADiv);
    
    // プレイヤーB
    const playerBDiv = document.createElement('div');
    playerBDiv.className = 'match-card-player';
    // プレイヤー名
    const playerBInput = document.createElement('input');
    playerBInput.type = 'text';
    playerBInput.className = 'player-name-input';
    playerBInput.dataset.player = 'B'; // Add data-player attribute
    playerBInput.value = this.match.playerB;
    playerBInput.addEventListener('change', (e) => {
      this.updateMatchData({ playerB: e.target.value });
    });
    playerBDiv.appendChild(playerBInput);
    
    // スコア入力B
    if (this.match.gameFormat === '6game3set' || this.match.gameFormat === '4game3set' || 
        this.match.gameFormat === '4game2set' || this.match.gameFormat === '6game2set') {
      // BO3形式の場合は3セット分のスコア入力欄を表示
      const setScoresContainerB = document.createElement('div');
      setScoresContainerB.className = 'set-scores-container';
      
      // 3セット分のスコア入力欄を作成
      for (let i = 0; i < 3; i++) {
        const setScoreInput = document.createElement('input');
        setScoreInput.type = 'number';
        setScoreInput.min = '0';
        setScoreInput.max = '99';
        setScoreInput.className = 'set-score-input';
        setScoreInput.dataset.player = 'B';
        setScoreInput.dataset.set = i;
        setScoreInput.value = this.match.setScores?.B[i] || '';
        
        setScoreInput.addEventListener('change', (e) => {
          // セットスコアを更新
          if (!this.match.setScores) {
            this.match.setScores = { A: [0, 0, 0], B: [0, 0, 0] };
          }
          this.match.setScores.B[i] = parseInt(e.target.value) || 0;
          
          // 全体のスコアを計算（勝ったセット数）
          this.calculateTotalScore();
          
          // DB更新
          this.updateMatchData({
            scoreA: this.match.scoreA,
            scoreB: this.match.scoreB,
            setScores: this.match.setScores
          });
          
          this.updateDynamicElements();
          this.checkLeagueWinCondition();
        });
        
        setScoreInput.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        
        setScoresContainerB.appendChild(setScoreInput);
      }
      
      playerBDiv.appendChild(setScoresContainerB);
      
      // 合計スコア表示用の要素
      const totalScoreB = document.createElement('div');
      totalScoreB.className = 'total-score';
      totalScoreB.textContent = this.match.scoreB || '0';
      totalScoreB.dataset.player = 'B';
      playerBDiv.appendChild(totalScoreB);
    } else {
      // 通常のスコア入力欄
      const scoreBInput = document.createElement('input');
      scoreBInput.type = 'number';
      scoreBInput.min = '0';
      scoreBInput.max = '99';
      scoreBInput.className = 'score-input';
      scoreBInput.dataset.player = 'B';
      scoreBInput.value = (this.match.scoreB === null || this.match.scoreB === undefined) ? '' : this.match.scoreB;
      this.scoreBInput = scoreBInput; // Assign to instance property
      
      scoreBInput.addEventListener('change', (e) => {
        this.match.scoreB = parseInt(e.target.value) || 0;
        this.updateMatchData({ scoreB: this.match.scoreB });
        this.updateDynamicElements();
        console.log('[DEBUG] scoreB changed:', this.match.scoreB, 'gameFormat:', this.match.gameFormat);
        this.checkLeagueWinCondition();
      });  
      
      scoreBInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      // スコア入力欄の上にタイブレーク入力欄を表示するコンテナ
      const scoreContainerB = document.createElement('div');
      scoreContainerB.style.display = 'flex';
      scoreContainerB.style.flexDirection = 'column';
      scoreContainerB.style.alignItems = 'center';
      scoreContainerB.style.gap = '2px';
      
      // タイブレーク入力欄のクローンを作成
      const tiebreakDivB = document.createElement('div');
      tiebreakDivB.className = 'tiebreak-score-container-b';
      tiebreakDivB.style.display = 'none'; // 初期状態では非表示
      tiebreakDivB.style.marginTop = '2px'; // スコア入力欄との間隔
      
      // タイブレークスコア入力フィールド
      const tiebreakInputB = document.createElement('input');
      tiebreakInputB.type = 'number';
      tiebreakInputB.min = '0';
      tiebreakInputB.max = '99';
      tiebreakInputB.className = 'tiebreak-score-input';
      tiebreakInputB.dataset.tiebreak = 'B'; // data-tiebreak属性を追加
      tiebreakInputB.style.width = '30px'; // 幅を小さく
      tiebreakInputB.style.height = '20px'; // 高さを小さく
      tiebreakInputB.style.fontSize = '0.8em'; // フォントサイズを小さく
      tiebreakInputB.style.padding = '0 2px'; // パディングを小さく
      tiebreakInputB.placeholder = 'TB';
      // 既存のタイブレークスコア値を設定
      tiebreakInputB.value = this.match.tieBreakB || '';
      
      // カッコで囲む
      const tbOpenParenB = document.createElement('span');
      tbOpenParenB.textContent = '(';
      tbOpenParenB.style.fontSize = '0.8em';
      
      const tbCloseParenB = document.createElement('span');
      tbCloseParenB.textContent = ')';
      tbCloseParenB.style.fontSize = '0.8em';
      
      tiebreakDivB.appendChild(tbOpenParenB);
      tiebreakDivB.appendChild(tiebreakInputB);
      tiebreakDivB.appendChild(tbCloseParenB);
      
      // タイブレーク入力のイベントリスナーを設定
      tiebreakInputB.addEventListener('change', (e) => {
        const value = e.target.value;
        const score = value === '' ? null : parseInt(value, 10);
        this.match.tieBreakB = score;
        this.updateMatchData({ tieBreakB: this.match.tieBreakB });
      });
      
      tiebreakInputB.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      // スコア入力欄を先に追加し、その後にタイブレーク入力欄を追加
      scoreContainerB.appendChild(scoreBInput);
      scoreContainerB.appendChild(tiebreakDivB);
      
      this.tiebreakDivB = tiebreakDivB;
      this.tiebreakInputB = tiebreakInputB;
      
      playerBDiv.appendChild(scoreContainerB);
    }
    
    // Win表示/ボタン（プレイヤーB）
    const winBDiv = document.createElement('div');
    winBDiv.className = 'win-label';
    winBDiv.dataset.player = 'B';
    
    // 常にクリックイベントを追加するように修正
    winBDiv.textContent = this.match.winner === 'B' ? '✔' : '●';
    winBDiv.style.color = this.match.winner === 'B' ? 'red' : '';
    if (this.match.winner === 'B') {
      winBDiv.classList.remove('win-button');
    } else {
      winBDiv.classList.add('win-button');
    }
    
    // Winボタンのクリックイベントを追加
    winBDiv.addEventListener('click', (e) => {
      e.stopPropagation(); // ダブルクリックイベントの伝播を防止
      
      // 現在の勝者をクリア
      if (this.match.winner === 'B') {
        this.match.winner = null;
        // Win状態が解除されたときに終了時刻をクリア
        this.match.actualEndTime = null;
      } else {
        // Bを勝者に設定
        this.match.winner = 'B';
        // Win状態になったときに現在時刻を自動設定
        const now = new Date();
        this.match.actualEndTime = now.toISOString();
      }
      
      // DB更新
      this.updateMatchData({ 
        winner: this.match.winner,
        actualEndTime: this.match.actualEndTime 
      });
      
      // UI更新
      this.updateWinStatus();
      this.updateEndTimeDisplay();
    });
    winBDiv.dataset.player = 'B';
    playerBDiv.appendChild(winBDiv);
    
    // プレイヤーAとプレイヤーBを追加
    playersContainer.appendChild(playerADiv);
    playersContainer.appendChild(playerBDiv);
    
    // タイブレーク入力欄のイベントリスナーはスコア入力欄の作成時に設定されるため、ここでは設定しない

  card.appendChild(headerDiv);
  card.appendChild(playersContainer);



    this._checkAndToggleTiebreakUI();
  return card;
} // End of createCardElement

  // Handles changes in the tiebreak score input fields
  _handleTiebreakChange(event) {
    const player = event.target.dataset.player;
    const value = event.target.value;
    const score = value === '' ? null : parseInt(value, 10);

    if (player === 'A') {
      this.match.tieBreakA = score;
      this.updateMatchData({ tieBreakA: this.match.tieBreakA });
    } else if (player === 'B') {
      this.match.tieBreakB = score;
      this.updateMatchData({ tieBreakB: this.match.tieBreakB });
    }
    // console.log(`[MATCH_CARD] Tiebreak score updated for player ${player}:`, score, this.match);
  }

  // Checks conditions and shows/hides the tiebreak UI
  _checkAndToggleTiebreakUI() {
    console.log('[DEBUG] Checking Tiebreak UI. Format:', this.match.gameFormat, 'Score A:', this.match.scoreA, 'Score B:', this.match.scoreB); // <--- Debug log added

    if (!this.tiebreakDivA || !this.tiebreakInputA || !this.tiebreakDivB || !this.tiebreakInputB) {
      // Tiebreak elements might not exist if card creation failed or for different match types
      console.warn('[MATCH_CARD] Tiebreak UI elements not found for match ID:', this.match.id);
      return;
    }

    const format = this.match.gameFormat;
    // スコアは入力要素の value 経由で文字列として保持されていることがあるため、確実に数値へ変換する
    let scoreA = parseInt(this.match.scoreA, 10);
    let scoreB = parseInt(this.match.scoreB, 10);
    if (isNaN(scoreA)) scoreA = -1;
    if (isNaN(scoreB)) scoreB = -1;
    let showTiebreak = false;

    // Define conditions for showing tiebreak input
    // Based on user request: "4G,6G,8Gの試合はそれぞれ4対5,6対7.8対9はタイブレークが発生"
    // Show tiebreak input when scores indicate a tiebreak was played (e.g., 4-5, 5-4, 6-7, 7-6, etc.)
    
    // 5game format
    if (format === '5game' && ((scoreA === 5 && scoreB === 4) || (scoreA === 4 && scoreB === 5))) {
      showTiebreak = true;
    }
    // 6game1set or 6game3set format
    else if ((format === '6game1set' || format === '6game3set') && 
             ((scoreA === 7 && scoreB === 6) || (scoreA === 6 && scoreB === 7))) {
      showTiebreak = true;
    }
    // 8game1set format
    else if (format === '8game1set' && 
             ((scoreA === 9 && scoreB === 8) || (scoreA === 8 && scoreB === 9))) {
      showTiebreak = true;
    }
    // Add more conditions if other formats also have tiebreaks under specific scores

    if (showTiebreak) {
      // プレイヤーA側のみタイブレーク入力欄を表示し、B側は常に非表示にする（ユーザー要望）
      this.tiebreakDivA.style.display = 'inline-block';
      this.tiebreakInputA.value = this.match.tieBreakA !== null ? this.match.tieBreakA : '';
      this.tiebreakDivB.style.display = 'none';
    } else {
      this.tiebreakDivA.style.display = 'none'; // タイブレーク入力欄を非表示
      this.tiebreakDivB.style.display = 'none'; // プレイヤーBのタイブレーク入力欄を非表示
      // オプション: メインスコアがタイブレークの条件を満たさなくなった場合、タイブレークスコアをクリアすることも検討
      // if (this.match.tieBreakA !== null) {
      //   this.match.tieBreakA = null;
      //   this.updateMatchData({ tieBreakA: null });
      // }
      // if (this.match.tieBreakB !== null) {
      //   this.match.tieBreakB = null;
      //   this.updateMatchData({ tieBreakB: null });
      // }
    }
  }

// 動的要素を更新するメソッド - スコア入力時に呼び出される
updateDynamicElements() {
  // スコアに基づいて動的に変更が必要な要素を更新
  this._checkAndToggleTiebreakUI();
  
  // 必要に応じて他の動的要素の更新処理を追加
}

updateScoreInputsInteractivity() {
  // スコア入力のインタラクティビティに関するロジックがあればここに追加
  // 古いタイブレーク入力欄のコードは削除済み
}

updateEndTimeDisplay() {
    const endTimeInput = this.element.querySelector('.match-end-time-input');
    if (endTimeInput) {
      if (this.match.actualEndTime) {
        const endTime = new Date(this.match.actualEndTime);
        const hours = endTime.getHours().toString().padStart(2, '0');
        const minutes = endTime.getMinutes().toString().padStart(2, '0');
        if (endTimeInput.value !== `${hours}:${minutes}`) {
          endTimeInput.value = `${hours}:${minutes}`;
        }
      } else {
        if (endTimeInput.value !== '') {
          endTimeInput.value = '';
        }
      }
    }
}

async updateMatchData(updatedData) {
    this.match = { ...this.match, ...updatedData };
    if (window.db && typeof window.db.updateMatch === 'function') {
      try {
        await window.db.updateMatch({ id: this.match.id, ...this.match });
      } catch (error) {
        console.error('Failed to update match in DB:', error);
      }
    } else {
      console.warn('db.updateMatch function not found. Match data updated in component state only.');
    }
    this.updateWinStatus();
    this.updateEndTimeDisplay();
    this.updateScoreInputsInteractivity();
    this.checkLeagueWinCondition(); // スコアや試合形式変更後に勝敗条件を再チェック
}

updateWinStatus() {
  console.log('[MATCH_CARD] updateWinStatus called, winner:', this.match.winner);
  
  // セレクタを修正して、データ属性で正確に要素を取得
  const winADiv = this.element.querySelector('.win-label[data-player="A"]');
  const winBDiv = this.element.querySelector('.win-label[data-player="B"]');
  
  if (!winADiv || !winBDiv) {
    console.error('[MATCH_CARD] Win elements not found');
    return;
  }

  // プレイヤーAのWin状態を設定
  if (this.match.winner === 'A') {
    winADiv.textContent = '✔'; // チェックマークに変更
    winADiv.style.color = 'red';
    winADiv.style.fontWeight = 'bold';
    winADiv.classList.remove('win-button');
    winADiv.classList.add('win-check');
  } else {
    winADiv.textContent = '●'; // 小さい黒丸に変更
    winADiv.style.color = '';
    winADiv.style.fontWeight = '';
    winADiv.classList.add('win-button');
    winADiv.classList.remove('win-check');
  }
  
  // プレイヤーBのWin状態を設定
  if (this.match.winner === 'B') {
    winBDiv.textContent = '✔'; // チェックマークに変更
    winBDiv.style.color = 'red';
    winBDiv.style.fontWeight = 'bold';
    winBDiv.classList.remove('win-button');
    winBDiv.classList.add('win-check');
  } else {
    winBDiv.textContent = '●'; // 小さい黒丸に変更
    winBDiv.style.color = '';
    winBDiv.style.fontWeight = '';
    winBDiv.classList.add('win-button');
    winBDiv.classList.remove('win-check');
  }
  
  console.log('[MATCH_CARD] Win status updated: A=', winADiv.textContent, 'B=', winBDiv.textContent);
}

// 勝者表示の条件をシンプル化（手動選択のみ）
shouldShowWin(player) {
  return this.match.winner === player;
}

async checkLeagueWinCondition() {
    // デバッグ情報を画面上に表示する関数（本番環境では表示しない）
    function showDebug(msg) {
      // デバッグモードがオフの場合は何もしない
      const debugMode = false; // デバッグモードをオフに設定
      if (!debugMode) return;
      
      let dbg = document.getElementById('cascade-debug');
      if (!dbg) {
        dbg = document.createElement('div');
        dbg.id = 'cascade-debug';
        dbg.style.position = 'fixed';
        dbg.style.top = '10px';
        dbg.style.right = '10px';
        dbg.style.background = 'yellow';
        dbg.style.zIndex = 9999;
        dbg.style.fontSize = '16px';
        dbg.style.padding = '8px';
        document.body.appendChild(dbg);
      }
      dbg.innerHTML += msg + '<br>';
    }
    
    // 試合形式を小文字に統一
    const format = (this.match.gameFormat || '').toLowerCase();
    
    // 両方のスコアが入力されているか確認
    const scoreAEntered = this.match.scoreA !== null && this.match.scoreA !== undefined && this.match.scoreA !== '';
    const scoreBEntered = this.match.scoreB !== null && this.match.scoreB !== undefined && this.match.scoreB !== '';
    
    // スコアを数値化
    let scoreA = scoreAEntered ? parseInt(this.match.scoreA, 10) : null;
    let scoreB = scoreBEntered ? parseInt(this.match.scoreB, 10) : null;
    let newWinner = null;
    let newStatus = this.match.status;
    
    showDebug('[DEBUG] checkLeagueWinCondition called');
    showDebug('[DEBUG] format: ' + format);
    showDebug('[DEBUG] scoreA: ' + scoreA + ', scoreB: ' + scoreB);
    
    // 6G1set形式の勝者判定
    if (format.includes('6g') || format.includes('6game')) {
      showDebug('[DEBUG] 6G1set判定: scoreA=' + scoreA + ' scoreB=' + scoreB);
      
      if (scoreAEntered && scoreBEntered) {
        showDebug('[DEBUG] 両方のスコアが入力済み');
        
        // 6ゲーム到達かつ2ゲーム差以上
        if ((scoreA >= 6 || scoreB >= 6) && Math.abs(scoreA - scoreB) >= 2) {
          showDebug('[DEBUG] 6到達＆2差クリア');
          if (scoreA > scoreB) {
            newWinner = 'A';
            newStatus = 'Win';
          } else if (scoreB > scoreA) {
            newWinner = 'B';
            newStatus = 'Win';
          }
        }
        // 7ゲーム到達で即勝利
        else if (scoreA >= 7 || scoreB >= 7) {
          showDebug('[DEBUG] 7到達で即勝利');
          if (scoreA > scoreB) {
            newWinner = 'A';
            newStatus = 'Win';
          } else if (scoreB > scoreA) {
            newWinner = 'B';
            newStatus = 'Win';
          }
        }
      } else {
        showDebug('[DEBUG] 両方のスコアが入力されていません');
        // 片方のスコアしか入力されていない場合は勝者をクリア
        newWinner = null;
        newStatus = 'Pending';
      }
      
      // 勝者・ステータス変更があれば直接this.matchに代入しUI更新
      if (this.match.winner !== newWinner || this.match.status !== newStatus) {
        showDebug('[DEBUG] 勝者変更: ' + this.match.winner + ' → ' + newWinner);
        this.match.winner = newWinner;
        this.match.status = newStatus;
        this.updateWinStatus();
        this.updateEndTimeDisplay();
        
        // データベースに保存
        const db = window.db;
        if (db) {
          db.updateMatch(this.match.id, { winner: newWinner, status: newStatus });
        }
      }
      
      return; // 6G1set判定後は処理終了
    }
    
    // その他の形式（元のコード）
    if (this.match.gameFormat === 'league') {
    const scoreA = parseInt(this.match.scoreA, 10) || 0;
    let scoreB = parseInt(this.match.scoreB, 10) || 0;
    showDebug('[DEBUG] scoreA: ' + scoreA + ', scoreB: ' + scoreB);
    let newWinner = null;
    let newStatus = this.match.status;

    if ((scoreA + scoreB) >= 5) {
      if (scoreA > scoreB) newWinner = this.match.playerA;
      else if (scoreB > scoreA) newWinner = this.match.playerB;
      if (newWinner) newStatus = 'Win';
    } else {
      newWinner = null; // Reset winner if score drops below threshold
      newStatus = 'Pending'; // Reset status
    }
    if (this.match.winner !== newWinner || this.match.status !== newStatus) {
       const updatePayload = { winner: newWinner, status: newStatus };
       if (newWinner && !this.match.actualEndTime) { // 勝者が決まり、かつ終了時刻がまだ設定されていない場合
         updatePayload.actualEndTime = new Date().toISOString();
       }
       this.updateMatchData(updatePayload); // updateMatchData内でactualEndTimeが設定される
    }
  } else if (this.match.gameFormat === 'playoff') {
      let newWinner = null;
      let newStatus = 'Pending'; // Default to pending

      if (this.shouldShowWin('A')) {
        newWinner = this.match.playerA;
        newStatus = 'Win';
      } else if (this.shouldShowWin('B')) {
        newWinner = this.match.playerB;
        newStatus = 'Win';
      }
      // If neither player is shown as a winner, but scores might imply a completed game without a clear win (e.g. scores reset)
      // we might need additional logic here if status should change from 'Win' back to 'Pending'
      // For now, if no one is winning, winner remains as is or null, status might go to Pending if not already Win.
      if (newWinner === null && this.match.status === 'Win') {
        // If previously was 'Win' but now no one is winning according to shouldShowWin
        // (e.g. score was changed making it no longer a win), reset status.
        // Keep actualEndTime as it was, user can manually clear it if needed.
        newStatus = 'Pending'; 
      }

      if (this.match.winner !== newWinner || this.match.status !== newStatus) {
        const updatePayload = { winner: newWinner, status: newStatus };
        if (newWinner && !this.match.actualEndTime) { // If a new winner is determined and no end time is set
          updatePayload.actualEndTime = new Date().toISOString();
        } else if (newWinner === null && this.match.status === 'Win' && newStatus === 'Pending') {
          // If winner is removed (e.g. score changed), we don't automatically clear actualEndTime here.
          // User might want to keep it or clear it manually.
        }
        // Only call updateMatchData if there's a change in winner or status
        // updateMatchData will then call checkLeagueWinCondition again, ensure no infinite loop
        if (this.match.winner !== updatePayload.winner || this.match.status !== updatePayload.status || (updatePayload.actualEndTime && this.match.actualEndTime !== updatePayload.actualEndTime)) {
             this.updateMatchData(updatePayload); // Pass the payload to updateMatchData
        }
      }
  }
  // this.updateWinStatus(); // Called from updateMatchData
} // End of checkLeagueWinCondition

setupDragAndDrop() {
    this.element.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', this.match.id);
      e.dataTransfer.effectAllowed = 'move';
      this.element.classList.add('dragging');
    });
    this.element.addEventListener('dragend', () => {
      this.element.classList.remove('dragging');
    });
}

async moveToHistory() {
    // Placeholder for actual implementation
}

async handleDeleteMatch() {
  try {
    // window.electronAPIが存在する場合はそれを使用、存在しない場合はwindow.confirmを使用
    let confirmed;
    if (window.electronAPI && typeof window.electronAPI.showConfirmDialog === 'function') {
      confirmed = await window.electronAPI.showConfirmDialog('この対戦カードを本当に削除してもよろしいですか？');
    } else {
      confirmed = window.confirm('この対戦カードを本当に削除してもよろしいですか？');
    }
    
    if (confirmed) {
      try {
        console.log(`Deleting match ID: ${this.match.id}`);
        // DBからの削除処理を実行
        if (window.db && typeof window.db.deleteMatch === 'function') {
          await window.db.deleteMatch(this.match.id);
          console.log(`Match ${this.match.id} deleted from DB successfully`);
        } else {
          console.warn('window.db or deleteMatch function not available, skipping DB deletion');
        }
        
        // UIから要素を削除
        if (this.element) {
          this.element.remove();
        }
        
        // イベントを発行
        const event = new CustomEvent('match-deleted', { detail: { matchId: this.match.id } });
        document.dispatchEvent(event);
        console.log(`Match ${this.match.id} visual element removed and event dispatched.`);
      } catch (error) {
        console.error('Error during match deletion process:', error);
        alert('試合の削除中にエラーが発生しました。');
      }
    }
  } catch (error) {
    console.error('Error showing confirmation dialog:', error);
    alert('確認ダイアログの表示中にエラーが発生しました。');
  }
}

update(newMatchData) {
  this.match = { ...this.match, ...newMatchData };

  const playerAInput = this.element.querySelector('.player-name-input[data-player="A"]');
  if (playerAInput && playerAInput.value !== this.match.playerA) {
    playerAInput.value = this.match.playerA;
  }
  const playerBInput = this.element.querySelector('.player-name-input[data-player="B"]');
  if (playerBInput && playerBInput.value !== this.match.playerB) {
    playerBInput.value = this.match.playerB;
  }
  const scoreAInput = this.element.querySelector('.score-input[data-player="A"]');
  if (scoreAInput && parseInt(scoreAInput.value) !== this.match.scoreA) {
    scoreAInput.value = this.match.scoreA;
  }
  const scoreBInput = this.element.querySelector('.score-input[data-player="B"]');
  if (scoreBInput && parseInt(scoreBInput.value) !== this.match.scoreB) {
    scoreBInput.value = this.match.scoreB;
  }
  const memoInput = this.element.querySelector('.match-card-memo');
  if (memoInput && memoInput.value !== this.match.memo) {
    memoInput.value = this.match.memo;
  }

  // スコア文字列 → セットスコア配列を同期（読み込み時のスコア消失防止）
  const numSetsUpdate = this._getNumberOfSets();
  this.match.setScores = {
    A: this._parseScores(this.match.scoreA, numSetsUpdate),
    B: this._parseScores(this.match.scoreB, numSetsUpdate)
  };

  this.updateScoreInputsInteractivity();
  this.updateWinStatus();
  this.updateEndTimeDisplay();
  // checkLeagueWinCondition is called from updateMatchData if scores change, 
  // or directly if gameFormat changes. If only names/memo change, it's not strictly needed here
  // but calling it ensures consistency if other logic depends on it.
  this.checkLeagueWinCondition(); 
}

  // セットスコアから合計スコアを計算するメソッド
  calculateTotalScore() {
    if (!this.match.setScores) return;
    
    console.log('[MATCH_CARD] calculateTotalScore - gameFormat:', this.match.gameFormat);
    console.log('[MATCH_CARD] calculateTotalScore - setScores:', this.match.setScores);
    
    // 各セットで勝った回数をカウント
    let winsA = 0;
    let winsB = 0;
    
    // 試合形式に応じた勝利条件を適用
    const gameFormat = this.match.gameFormat || '5game';
    
    // 各セットの勝者を判定
    for (let i = 0; i < 3; i++) {
      const scoreA = this.match.setScores.A[i] || 0;
      const scoreB = this.match.setScores.B[i] || 0;
      
      // セットが空の場合はスキップ
      if (scoreA === 0 && scoreB === 0) continue;
      
      // 試合形式に応じた勝利条件を適用
      switch (gameFormat) {
        case '5game': // 5G→スコアの合計が5になり、かつ大きい数字の方にカウントする
          if ((scoreA + scoreB) >= 5 && scoreA > scoreB) {
            winsA++;
          } else if ((scoreA + scoreB) >= 5 && scoreB > scoreA) {
            winsB++;
          }
          break;
          
        case '4game1set': // 4G1set→どちらかのスコアが4or5になり、かつ相手より大きい数字の方にカウントする
          if ((scoreA >= 4 && scoreA > scoreB) || (scoreA === 5 && scoreA > scoreB)) {
            winsA++;
          } else if ((scoreB >= 4 && scoreB > scoreA) || (scoreB === 5 && scoreB > scoreA)) {
            winsB++;
          }
          break;
          
        case '6game1set': // 6G1set→どちらかのスコアが6or7になり、かつ相手より大きい数字の方にカウントする
          if ((scoreA >= 6 && scoreA > scoreB) || (scoreA === 7 && scoreA > scoreB)) {
            winsA++;
          } else if ((scoreB >= 6 && scoreB > scoreA) || (scoreB === 7 && scoreB > scoreA)) {
            winsB++;
          }
          break;
          
        case '8game-pro': // 8G-Pro→どちらかのスコアが8or9になり、かつ相手より大きい数字の方にカウントする
          if ((scoreA >= 8 && scoreA > scoreB) || (scoreA === 9 && scoreA > scoreB)) {
            winsA++;
          } else if ((scoreB >= 8 && scoreB > scoreA) || (scoreB === 9 && scoreB > scoreA)) {
            winsB++;
          }
          break;
          
        case '4game2set': // 4G2set+10TB
        case '4game3set': // 4G3set
          // セット毎に異なる勝利条件を適用
          if (i === 2 && gameFormat === '4game2set') {
            // 3セット目はどちらかのスコアが10以上で相手より大きい数字の方にカウントする
            if (scoreA >= 10 && scoreA > scoreB) {
              winsA++;
            } else if (scoreB >= 10 && scoreB > scoreA) {
              winsB++;
            }
          } else {
            // 1,2セット目はどちらかのスコアが4or5になり、かつ相手より大きい数字の方にカウントする
            if ((scoreA >= 4 && scoreA > scoreB) || (scoreA === 5 && scoreA > scoreB)) {
              winsA++;
            } else if ((scoreB >= 4 && scoreB > scoreA) || (scoreB === 5 && scoreB > scoreA)) {
              winsB++;
            }
          }
          break;
          
        case '6game2set': // 6G2set+10TB
        case '6game3set': // 6G3set
          // セット毎に異なる勝利条件を適用
          if (i === 2 && gameFormat === '6game2set') {
            // 3セット目はどちらかのスコアが10以上で相手より大きい数字の方にカウントする
            if (scoreA >= 10 && scoreA > scoreB) {
              winsA++;
            } else if (scoreB >= 10 && scoreB > scoreA) {
              winsB++;
            }
          } else {
            // 1,2セット目はどちらかのスコアが6or7になり、かつ相手より大きい数字の方にカウントする
            if ((scoreA >= 6 && scoreA > scoreB) || (scoreA === 7 && scoreA > scoreB)) {
              winsA++;
            } else if ((scoreB >= 6 && scoreB > scoreA) || (scoreB === 7 && scoreB > scoreA)) {
              winsB++;
            }
          }
          break;
          
        default: // デフォルトの場合は単純にスコアの大小で判定
          if (scoreA > scoreB) {
            winsA++;
          } else if (scoreB > scoreA) {
            winsB++;
          }
          break;
      }
    }
    
    console.log('[MATCH_CARD] calculateTotalScore - winsA:', winsA, 'winsB:', winsB);
    
    // 合計スコアを更新
    this.match.scoreA = winsA;
    this.match.scoreB = winsB;
    
    // UIを更新
    if (this.element) {
      const totalScoreA = this.element.querySelector('.total-score[data-player="A"]');
      const totalScoreB = this.element.querySelector('.total-score[data-player="B"]');
      
      if (totalScoreA) totalScoreA.textContent = winsA;
      if (totalScoreB) totalScoreB.textContent = winsB;
    }
  }
  
  // ダブルクリックで履歴へ移動する機能は無効化
  addDoubleClickToHistoryListener() {
    // 機能を無効化したので何もしない
    return;
  } // addDoubleClickToHistoryListener method

  // スコア取得メソッド - コート数変更時の状態保持用
  getScoreA() {
    if (this.element) {
      // スコア入力欄を特定（プレイヤー名入力欄を除外）
      const scoreInput = this.element.querySelector('input.score-input[data-player="A"], input.set-score-input[data-player="A"]');
      if (scoreInput) {
        // セットスコア形式の場合は合計スコアを取得
        if (scoreInput.classList.contains('set-score-input')) {
          const totalScoreElement = this.element.querySelector('.total-score[data-player="A"]');
          return totalScoreElement ? totalScoreElement.textContent : this.match.scoreA;
        } else {
          return scoreInput.value;
        }
      }
    }
    return this.match.scoreA;
  }

  getScoreB() {
    if (this.element) {
      // スコア入力欄を特定（プレイヤー名入力欄を除外）
      const scoreInput = this.element.querySelector('input.score-input[data-player="B"], input.set-score-input[data-player="B"]');
      if (scoreInput) {
        // セットスコア形式の場合は合計スコアを取得
        if (scoreInput.classList.contains('set-score-input')) {
          const totalScoreElement = this.element.querySelector('.total-score[data-player="B"]');
          return totalScoreElement ? totalScoreElement.textContent : this.match.scoreB;
        } else {
          return scoreInput.value;
        }
      }
    }
    return this.match.scoreB;
  }

  getTiebreakScore() {
    if (this.element) {
      const tiebreakInputA = this.element.querySelector('input[data-tiebreak="A"]');
      const tiebreakInputB = this.element.querySelector('input[data-tiebreak="B"]');
      return {
        A: tiebreakInputA ? tiebreakInputA.value : (this.match.tieBreakA || ''),
        B: tiebreakInputB ? tiebreakInputB.value : (this.match.tieBreakB || '')
      };
    }
    return {
      A: this.match.tieBreakA || '',
      B: this.match.tieBreakB || ''
    };
  }

  // セットスコアを取得
  getSetScores() {
    const setScores = { A: [], B: [] };
    if (this.element) {
      const setInputsA = this.element.querySelectorAll('input[data-set-player="A"]');
      const setInputsB = this.element.querySelectorAll('input[data-set-player="B"]');
      
      setInputsA.forEach((input, index) => {
        setScores.A[index] = input.value || null;
      });
      
      setInputsB.forEach((input, index) => {
        setScores.B[index] = input.value || null;
      });
    } else {
      // フォールバック: match.setScoresから取得
      setScores.A = this.match.setScores?.A || [];
      setScores.B = this.match.setScores?.B || [];
    }
    return setScores;
  }
} // MatchCard CLASS END
