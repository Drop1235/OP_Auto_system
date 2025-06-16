// Board Component for managing the court grid
class Board {
  constructor(numberOfCourts = 12) {
    console.log('[BOARD] Constructor called');
    this.numberOfCourts = numberOfCourts;
    this.courtGrid = document.getElementById('court-grid');
    this.matchCards = new Map(); // Map to store match card instances by ID
    this.courtNames = {}; // Map to store custom court names
    
    // コート設定の要素を取得
    this.courtCountDisplay = document.getElementById('court-count-display');
    this.decreaseCourtsBtn = document.getElementById('decrease-courts-btn');
    this.increaseCourtsBtn = document.getElementById('increase-courts-btn');
    this.deleteAllMatchesBtn = document.getElementById('delete-all-matches-btn');
    
    // ローカルストレージからコート名を読み込む
    this.loadCourtNames();
    
    // グローバルスコープに自身を設定
    window.boardInstance = this;
    
    this.init();
  }

  // Initialize the board
  async init() {
    this.createCourtGrid();
    await this.loadMatches();
    this.setupEventListeners();
    // this.loadGameFormat() は定義されていないため削除
    this.setupCourtSettings(); // This will also set up game format control
    this.updateCourtSelectOptions(); // Populate court select options on init
    this.setupUnassignedArea(); // 未割当エリアのドラッグ＆ドロップ機能を設定
  }

  // Create the court grid with the specified number of courts
  createCourtGrid() {
    this.courtGrid.innerHTML = '';
    
    for (let i = 1; i <= this.numberOfCourts; i++) {
      const courtSlot = document.createElement('div');
      courtSlot.className = 'court-slot';
      courtSlot.dataset.courtNumber = i;
      
      const courtHeader = document.createElement('div');
      courtHeader.className = 'court-header';
      
      // コート名の編集機能を追加
      const courtNameSpan = document.createElement('span');
      courtNameSpan.className = 'court-name-edit';
      courtNameSpan.textContent = this.getCourtName(i);
      courtNameSpan.dataset.courtNumber = i;
      courtNameSpan.addEventListener('click', this.handleCourtNameClick.bind(this));
      
      courtHeader.appendChild(courtNameSpan);
      
      const courtRows = document.createElement('div');
      courtRows.className = 'court-rows';
      
      // Create the three rows for each court
      const currentRow = this.createCourtRow('current', '現在の試合');
      const nextRow = this.createCourtRow('next', '次の試合');
      const next2Row = this.createCourtRow('next2', '次々の試合');
      
      courtRows.appendChild(currentRow);
      courtRows.appendChild(nextRow);
      courtRows.appendChild(next2Row);
      
      courtSlot.appendChild(courtHeader);
      courtSlot.appendChild(courtRows);
      
      this.courtGrid.appendChild(courtSlot);
    }
    
    // コート数表示を更新
    if (this.courtCountDisplay) {
      this.courtCountDisplay.textContent = this.numberOfCourts;
    }
  }

  // Create a court row with the specified type and placeholder text
  createCourtRow(rowType, placeholderText) {
    const row = document.createElement('div');
    row.className = `court-row ${rowType}-row`;
    row.dataset.rowType = rowType;
    
    // Add placeholder text for empty rows
    const placeholder = document.createElement('div');
    placeholder.className = 'row-placeholder';
    placeholder.textContent = placeholderText;
    row.appendChild(placeholder);
    
    // カードコンテナを追加
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    row.appendChild(cardContainer);
    
    // Set up drop zone functionality
    // DragDropUtilsの機能を直接実装
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      // Add highlight to the target row
      if (e.target.classList.contains('court-row')) {
        e.target.classList.add('row-highlight');
      } else if (e.target.closest('.court-row')) {
        e.target.closest('.court-row').classList.add('row-highlight');
      }
    });
    
    row.addEventListener('dragleave', (e) => {
      // Remove highlight from the row
      if (e.target.classList.contains('court-row')) {
        e.target.classList.remove('row-highlight');
      } else if (e.target.closest('.court-row')) {
        e.target.closest('.court-row').classList.remove('row-highlight');
      }
    });
    
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      
      // Remove highlight from all rows
      document.querySelectorAll('.row-highlight').forEach(row => {
        row.classList.remove('row-highlight');
      });
      
      // Get the match ID from the dragged card
      const matchId = parseInt(e.dataTransfer.getData('text/plain'));
      if (!matchId) return;
      
      // Get the target court row
      let targetRow = null;
      if (e.target.classList.contains('court-row')) {
        targetRow = e.target;
      } else if (e.target.closest('.court-row')) {
        targetRow = e.target.closest('.court-row');
      }
      
      if (!targetRow) return;
      
      // Get the court number and row type
      const courtSlot = targetRow.closest('.court-slot');
      const courtNumber = parseInt(courtSlot.dataset.courtNumber);
      const rowType = targetRow.dataset.rowType;
      
      // Get the source court and row
      const sourceCourtNumber = parseInt(e.dataTransfer.getData('source-court')) || null;
      const sourceRowType = e.dataTransfer.getData('source-row') || null;
      
      try {
        // Get the match from the database
        const matches = await db.getAllMatches();
        const match = matches.find(m => m.id === matchId);
        
        if (!match) {
          console.error('Match not found:', matchId);
          return;
        }
        
        // Update match status based on the target row
        let newStatus = 'Unassigned';
        let actualStartTime = match.actualStartTime;
        let actualEndTime = match.actualEndTime;
        
        if (rowType === 'current') {
          newStatus = 'Current';
          // Set actual start time if moving to current row
          if (match.status !== 'Current') {
            actualStartTime = new Date().toISOString();
          }
        } else if (rowType === 'next') {
          newStatus = 'Next';
        } else if (rowType === 'next2') {
          newStatus = 'Next2';
        }
        
        // Check if moving from current to history
        if (sourceRowType === 'current' && rowType === 'history') {
          newStatus = 'Completed';
          actualEndTime = new Date().toISOString();
        }
        
        // Update the match in the database
        const updatedMatch = await db.updateMatch({
          id: matchId,
          courtNumber,
          rowPosition: rowType,
          status: newStatus,
          actualStartTime,
          actualEndTime
        });
        
        // Dispatch an event to notify the board to update
        const updateEvent = new CustomEvent('match-updated', {
          detail: { match: updatedMatch }
        });
        document.dispatchEvent(updateEvent);
        
      } catch (error) {
        console.error('Error updating match:', error);
      }
    });
    
    return row;
  }

  // Load matches from the database and place them on the board
  async loadMatches() {
    try {
      // Get all matches from the database
      const matches = await db.getAllMatches();
      
      // Clear existing match cards
      this.matchCards.clear();
      
      // Place matches on the board based on their court and row position
      matches.forEach(match => {
        if (match.status === 'Completed') {
          // Don't place completed matches on the board
          return;
        }
        
        this.createAndPlaceMatchCard(match); // createAndPlaceMatchCard will handle assigned/unassigned
      });
      
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  }

  // Create a match card and place it on the board
  createAndPlaceMatchCard(match) {
    console.log('[BOARD] createAndPlaceMatchCard called with match:', match);
    console.log('[BOARD] Match game format:', match.gameFormat);
    
    if (!match) {
      console.error('[BOARD] Error: match is undefined or null');
      return null;
    }
    
    if (!match.id) {
      console.error('[BOARD] Error: match.id is undefined or null');
      return null;
    }
    
    // Create the match card
    console.log('[BOARD] Creating new MatchCard instance');
    const matchCard = new MatchCard(match);
    console.log('[BOARD] MatchCard created:', matchCard);
    console.log('[BOARD] MatchCard match game format:', matchCard.match.gameFormat);
    console.log('[BOARD] MatchCard element:', matchCard.element);
    this.matchCards.set(match.id, matchCard);
    
    // 未割当の場合は未割当カードエリアに配置
    if (!match.courtNumber || !match.rowPosition) {
      const unassignedCards = document.getElementById('unassigned-cards');
      if (unassignedCards) {
        unassignedCards.appendChild(matchCard.element);
        return matchCard;
      }
    }
    
    // Find the target court and row
    const courtSlot = document.querySelector(`.court-slot[data-court-number="${match.courtNumber}"]`);
    if (!courtSlot) return;
    
    const row = courtSlot.querySelector(`.court-row[data-row-type="${match.rowPosition}"]`);
    if (!row) return;
    
    // Clear the placeholder if it exists
    const placeholder = row.querySelector('.row-placeholder');
    if (placeholder) {
      placeholder.style.display = 'none';
    }
    
    // カードコンテナを取得し、カードを追加
    const cardContainer = row.querySelector('.card-container');
    if (cardContainer) {
      cardContainer.appendChild(matchCard.element);
    } else {
      // 後方互換性のためにカードコンテナがない場合は行に直接追加
      row.appendChild(matchCard.element);
    }
  }

  // Set up event listeners for board-related events
  setupEventListeners() {
    console.log('[BOARD] Setting up event listeners');
    
    // Listen for match updates
    document.addEventListener('match-updated', (e) => {
      const { match } = e.detail;
      console.log('[BOARD] Received match-updated event');
      
      // Handle the updated match
      this.handleMatchUpdate(match);
    });
    
    // Listen for deleted matches
  document.addEventListener('match-deleted', (e) => {
    const { matchId } = e.detail;
    console.log('[BOARD] Received match-deleted event for match ID:', matchId);

    // Remove from map
    if (this.matchCards.has(matchId)) {
      const matchCard = this.matchCards.get(matchId);
      // Ensure UI element is removed (safety)
      if (matchCard && matchCard.element) {
        matchCard.element.remove();
      }
      this.matchCards.delete(matchId);
    }

    // そのコートのプレースホルダー表示を更新
    if (e.detail.courtNumber) {
      this.showPlaceholderIfEmpty(e.detail.courtNumber, e.detail.rowPosition);
    }
  });

  // Listen for new matches
    document.addEventListener('match-added', (e) => {
      const { match } = e.detail;
      console.log('[BOARD] Received match-added event for match ID:', match.id, match);
      
      // Add the new match to the board.
      // createAndPlaceMatchCard will handle whether it's assigned or unassigned.
      this.createAndPlaceMatchCard(match);
    });
    
    console.log('[BOARD] Event listeners setup complete');
  }
  
  // デバッグ用：イベントリスナーが登録されているか確認するメソッド
  _checkEventListeners(eventName) {
    return 'Event listeners check - This is just a placeholder. Real DOM event listeners cannot be directly inspected.';
  }
  
  // コート設定と試合形式設定の機能をセットアップ
  setupCourtSettings() {
    // コート数の増減ボタンのイベントリスナーを設定
    if (this.decreaseCourtsBtn) {
      this.decreaseCourtsBtn.addEventListener('click', () => {
        if (this.numberOfCourts > 1) {
          // 削除されるコートにマッチカードがあるかチェック
          const matchesInLastCourt = this.getMatchesInCourt(this.numberOfCourts);
          
          if (matchesInLastCourt.length > 0) {
            // 確認ダイアログを表示
            const confirmMessage = `コート${this.numberOfCourts}に${matchesInLastCourt.length}件のマッチカードがあります。\nコートを減らすとこれらのマッチカードの履歴も削除されますがよろしいですか？`;
            
            if (confirm(confirmMessage)) {
              // ユーザーがOKした場合、該当するマッチを削除
              this.deleteMatchesInCourt(this.numberOfCourts);
              this.numberOfCourts--;
              this.updateCourtGrid();
            }
            // ユーザーがキャンセルした場合は何もしない
          } else {
            // 削除されるコートにマッチカードがない場合はそのまま減らす
            this.numberOfCourts--;
            this.updateCourtGrid();
          }
        }
      });
    }
    
    if (this.increaseCourtsBtn) {
      this.increaseCourtsBtn.addEventListener('click', () => {
        if (this.numberOfCourts < 24) { // 最大24コートまで
          this.numberOfCourts++;
          this.updateCourtGrid();
        }
      });
    }
    
    if (this.deleteAllMatchesBtn) {
      this.deleteAllMatchesBtn.addEventListener('click', () => {
        // 現在のマッチカード数を取得
        const matchCount = this.matchCards.size;
        
        if (matchCount === 0) {
          alert('削除するマッチカードがありません。');
          return;
        }
        
        // 確認ダイアログを表示
        const confirmMessage = `全ての試合カード（${matchCount}件）を削除しますがよろしいですか？\nこの操作は取り消せません。`;
        
        if (confirm(confirmMessage)) {
          // ユーザーがOKした場合、全マッチカードを削除
          this.deleteAllMatches();
        }
      });
    }

  }

  // コートグリッドを更新（既存のマッチカードデータを保持）
  updateCourtGrid() {
    console.log('[BOARD] updateCourtGrid called');
    
    // 現在のマッチカードの状態を保存
    const currentMatchStates = new Map();
    console.log('[BOARD] Current matchCards size:', this.matchCards.size);
    
    this.matchCards.forEach((matchCard, matchId) => {
      console.log('[BOARD] Processing matchCard ID:', matchId, 'matchCard:', matchCard);
      
      if (matchCard && matchCard.match) {
        // スコアやその他の状態を保存
        const scoreA = matchCard.getScoreA ? matchCard.getScoreA() : matchCard.match.scoreA;
        const scoreB = matchCard.getScoreB ? matchCard.getScoreB() : matchCard.match.scoreB;
        const setScores = matchCard.getSetScores ? matchCard.getSetScores() : matchCard.match.setScores;
        const tiebreakScore = matchCard.getTiebreakScore ? matchCard.getTiebreakScore() : {
          A: matchCard.match.tieBreakA || '',
          B: matchCard.match.tieBreakB || ''
        };
        
        console.log('[BOARD] Saving state for match', matchId, '- ScoreA:', scoreA, 'ScoreB:', scoreB);
        
        const currentState = {
          ...matchCard.match,
          scoreA: scoreA,
          scoreB: scoreB,
          setScores: setScores,
          tieBreakA: tiebreakScore.A,
          tieBreakB: tiebreakScore.B,
          winner: matchCard.match.winner
        };
        currentMatchStates.set(matchId, currentState);
      }
    });

    console.log('[BOARD] Saved states count:', currentMatchStates.size);

    // マッチカードマップをクリア
    this.matchCards.clear();

    // コートグリッドを再作成
    this.createCourtGrid();
    
    // 保存した状態でマッチカードを復元
    currentMatchStates.forEach((matchState, matchId) => {
      console.log('[BOARD] Restoring match', matchId, 'with scoreA:', matchState.scoreA, 'scoreB:', matchState.scoreB);
      
      // データベースから最新のマッチデータを取得
      let matchData = null;
      if (window.db) {
        try {
          matchData = window.db.getMatch(matchId);
        } catch (error) {
          console.warn('Failed to get match from database:', error);
        }
      }
      
      // マッチデータが見つからない場合は、保存された状態をそのまま使用
      if (!matchData) {
        matchData = matchState;
      } else {
        // データベースのマッチデータに保存されたスコア値をマージ
        matchData.scoreA = matchState.scoreA;
        matchData.scoreB = matchState.scoreB;
        matchData.setScores = matchState.setScores;
        matchData.tieBreakA = matchState.tieBreakA;
        matchData.tieBreakB = matchState.tieBreakB;
        matchData.winner = matchState.winner;
        
        console.log('[BOARD] Merged match data:', matchData);
      }
      
      // データベースの該当マッチも更新
      if (window.db) {
        window.db.updateMatch(matchData).catch(error => {
          console.warn('Failed to update match in database during court grid update:', error);
        });
      }
      
      // マッチカードを再作成して配置
      this.createAndPlaceMatchCard(matchData);
    });
    
    // コート選択オプションを更新
    this.updateCourtSelectOptions();
    
    console.log('[BOARD] updateCourtGrid completed');
  }

  // コート名をクリックした時の処理
  handleCourtNameClick(event) {
    const span = event.target;
    const courtNumber = parseInt(span.dataset.courtNumber);
    const currentName = span.textContent;
    
    // 入力フィールドを作成
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'court-name-input';
    input.value = currentName;
    input.dataset.courtNumber = courtNumber;
    
    // スパンを入力フィールドに置き換え
    span.parentNode.replaceChild(input, span);
    input.focus();
    
    // 入力完了時の処理
    const finishEdit = () => {
      const newName = input.value.trim() || `コート ${courtNumber}`;
      this.setCourtName(courtNumber, newName);
      
      // 入力フィールドをスパンに戻す
      const newSpan = document.createElement('span');
      newSpan.className = 'court-name-edit';
      newSpan.textContent = newName;
      newSpan.dataset.courtNumber = courtNumber;
      newSpan.addEventListener('click', this.handleCourtNameClick.bind(this));
      
      input.parentNode.replaceChild(newSpan, input);
      
      // コート選択オプションも更新
      this.updateCourtSelectOptions();
    };
    
    // イベントリスナーを設定
    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishEdit();
      }
    });
  }

  // コート名を取得
  getCourtName(courtNumber) {
    return this.courtNames[courtNumber] || `コート ${courtNumber}`;
  }
  
  // コート名を設定
  setCourtName(courtNumber, name) {
    this.courtNames[courtNumber] = name;
    this.saveCourtNames();
  }
  
  // コート名をローカルストレージに保存
  saveCourtNames() {
    localStorage.setItem('courtNames', JSON.stringify(this.courtNames));
  }
  
  // コート名をローカルストレージから読み込む
  loadCourtNames() {
    const savedNames = localStorage.getItem('courtNames');
    if (savedNames) {
      this.courtNames = JSON.parse(savedNames);
    }
  }
  
  // コート選択オプションを更新
  updateCourtSelectOptions() {
    // 1. 既存の .court-select すべてを更新
    const courtSelects = document.querySelectorAll('.court-select');
    courtSelects.forEach(select => {
      // 現在の選択値を保存
      const currentValue = select.value;
      // オプションをクリア
      select.innerHTML = '';
      // 未割当オプションを追加
      const unassignedOption = document.createElement('option');
      unassignedOption.value = '';
      unassignedOption.textContent = '未割当';
      select.appendChild(unassignedOption);
      // コートオプションを追加
      for (let i = 1; i <= this.numberOfCourts; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = this.getCourtName(i);
        select.appendChild(option);
      }
    });
    // 2. 新規試合追加モーダルのcourt-select(id="court-select")も必ず更新
    const modalCourtSelect = document.getElementById('court-select');
    if (modalCourtSelect) {
      const prevValue = modalCourtSelect.value;
      modalCourtSelect.innerHTML = '';
      const unassignedOption = document.createElement('option');
      unassignedOption.value = '';
      unassignedOption.textContent = '未割当';
      modalCourtSelect.appendChild(unassignedOption);
      for (let i = 1; i <= this.numberOfCourts; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = this.getCourtName(i);
        modalCourtSelect.appendChild(option);
      }
      // 可能なら前の選択値を復元
      if ([...modalCourtSelect.options].some(opt => opt.value === prevValue)) {
        modalCourtSelect.value = prevValue;
      }
    }
  }

  // 未割当エリアのドラッグ＆ドロップ機能を設定
  setupUnassignedArea() {
    const unassignedArea = document.getElementById('unassigned-cards');
    if (!unassignedArea) return;
    
    // ドラッグオーバー時のイベント
    unassignedArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      unassignedArea.classList.add('drag-over');
    });
    
    // ドラッグリーブ時のイベント
    unassignedArea.addEventListener('dragleave', (e) => {
      unassignedArea.classList.remove('drag-over');
    });
    
    // ドロップ時のイベント
    unassignedArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      unassignedArea.classList.remove('drag-over');
      
      // ドラッグされたカードのIDを取得
      const matchId = parseInt(e.dataTransfer.getData('text/plain'));
      if (!matchId) return;
      
      // ソースのコートと行を取得
      const sourceCourtNumber = parseInt(e.dataTransfer.getData('source-court')) || null;
      const sourceRowType = e.dataTransfer.getData('source-row') || null;
      
      try {
        // データベースから試合を取得
        const matches = await db.getAllMatches();
        const match = matches.find(m => m.id === matchId);
        
        if (!match) {
          console.error('Match not found:', matchId);
          return;
        }
        
        // 試合のステータスを未割当に更新
        const updatedMatch = await db.updateMatch({
          id: matchId,
          courtNumber: null,
          rowPosition: null,
          status: 'Unassigned'
        });
        
        // ボードに更新を通知するイベントを発行
        const updateEvent = new CustomEvent('match-updated', {
          detail: { match: updatedMatch }
        });
        document.dispatchEvent(updateEvent);
        
      } catch (error) {
        console.error('Error updating match:', error);
      }
    });
  }
  
  // Handle match updates
  handleMatchUpdate(match) {
    // Get the existing match card
    const existingCard = this.matchCards.get(match.id);
    
    if (existingCard) {
      // If the match is completed, remove it from the board
      if (match.status === 'Completed') {
        existingCard.element.remove();
        this.matchCards.delete(match.id);
        
        // Show the placeholder if the row is now empty
        if (match.courtNumber && match.rowPosition) {
          this.showPlaceholderIfEmpty(match.courtNumber, match.rowPosition);
        }
        
        // Dispatch an event to notify the history view to update
        const historyEvent = new CustomEvent('history-updated');
        document.dispatchEvent(historyEvent);
        
        return;
      }
      
      // 既存のカードの位置が変更された場合
      const oldCourtNumber = existingCard.match.courtNumber;
      const oldRowPosition = existingCard.match.rowPosition;
      const newCourtNumber = match.courtNumber;
      const newRowPosition = match.rowPosition;
      
      // 既存のカードを現在の位置から削除
      existingCard.element.remove();
      
      // 古い位置がコートの行だった場合、プレースホルダーを表示
      if (oldCourtNumber && oldRowPosition) {
        this.showPlaceholderIfEmpty(oldCourtNumber, oldRowPosition);
      }
      
      // カードデータを更新
      existingCard.update(match);
      
      // 新しい位置に配置
      if (!newCourtNumber || !newRowPosition) {
        // 未割当の場合は未割当カードエリアに配置
        const unassignedCards = document.getElementById('unassigned-cards');
        if (unassignedCards) {
          unassignedCards.appendChild(existingCard.element);
        }
      } else {
        // コートの行に配置
        const courtSlot = document.querySelector(`.court-slot[data-court-number="${newCourtNumber}"]`);
        if (!courtSlot) return;
        
        const row = courtSlot.querySelector(`.court-row[data-row-type="${newRowPosition}"]`);
        if (!row) return;
        
        // プレースホルダーを非表示
        const placeholder = row.querySelector('.row-placeholder');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
        
        // カードコンテナに追加
        const cardContainer = row.querySelector('.card-container');
        cardContainer.appendChild(existingCard.element);
      }
    } else if (match.status !== 'Completed') {
      // 新規カードの場合は作成して配置
      this.createAndPlaceMatchCard(match);
    }
  }

  // Show the placeholder if a row is empty
  showPlaceholderIfEmpty(courtNumber, rowPosition) {
    const courtSlot = document.querySelector(`.court-slot[data-court-number="${courtNumber}"]`);
    if (!courtSlot) return;
    
    const row = courtSlot.querySelector(`.court-row[data-row-type="${rowPosition}"]`);
    if (!row) return;
    
    // Check if the row has any match cards
    const hasMatchCards = row.querySelector('.match-card');
    
    // Show the placeholder if there are no match cards
    const placeholder = row.querySelector('.row-placeholder');
    if (placeholder && !hasMatchCards) {
      placeholder.style.display = 'block';
    }
  }

  // Add a new match to the board
  addMatch(match) {
    if (match.courtNumber && match.rowPosition) {
      this.createAndPlaceMatchCard(match);
    }
  }

  getOccupiedRowPositions(courtNumber) {
    // 修正: カードが削除された後も正しく位置を取得できるようにする
    const occupiedPositions = [];
    if (!courtNumber) { // If courtNumber is null or undefined (e.g., "Unassigned" court)
      return []; // No specific positions are occupied for "Unassigned" court
    }

    const numericCourtNumber = parseInt(courtNumber);

    // 実際のDOMから現在の状態を確認する
    const courtSlot = document.querySelector(`.court-slot[data-court-number="${numericCourtNumber}"]`);
    if (courtSlot) {
      const rows = courtSlot.querySelectorAll('.court-row');
      rows.forEach(row => {
        const rowType = row.dataset.rowType;
        // カードコンテナ内のカードを確認
        const cardContainer = row.querySelector('.card-container');
        const hasCard = cardContainer && cardContainer.querySelector('.match-card');
        
        // カードがない場合は空き状態と判断
        if (!hasCard && ['current', 'next', 'next2'].includes(rowType)) {
          // 空き状態なのでoccupiedPositionsには追加しない
        } else if (hasCard && ['current', 'next', 'next2'].includes(rowType)) {
          occupiedPositions.push(rowType);
        }
      });
    }
    
    return [...new Set(occupiedPositions)]; // Return unique positions
  }

  // コートに配置されているマッチカードを取得
  getMatchesInCourt(courtNumber) {
    const matches = [];
    this.matchCards.forEach((matchCard, matchId) => {
      if (matchCard.match.courtNumber === courtNumber) {
        matches.push(matchCard.match);
      }
    });
    return matches;
  }

  // コートに配置されているマッチカードを削除
  deleteMatchesInCourt(courtNumber) {
    this.matchCards.forEach((matchCard, matchId) => {
      if (matchCard.match.courtNumber === courtNumber) {
        // UI要素を削除
        matchCard.element.remove();
        
        // データベースからも削除
        if (window.db) {
          window.db.deleteMatch(matchId).catch(error => {
            console.warn('Failed to delete match from database:', error);
          });
        }
        
        // マッチカードマップから削除
        this.matchCards.delete(matchId);
      }
    });
  }

  // 全マッチカードを削除（UIブロックを回避するためにアイドル時間で分割実行）
  deleteAllMatches() {
    const allCards = Array.from(document.querySelectorAll('.match-card'));
    const BATCH_SIZE = 200; // 一度に削除するカード数
    const removeBatch = (start = 0) => {
      const end = Math.min(start + BATCH_SIZE, allCards.length);
      for (let i = start; i < end; i++) {
        allCards[i].remove();
      }
      if (end < allCards.length) {
        // 残りがあれば次のアイドルタイムで続行
        if (window.requestIdleCallback) {
          requestIdleCallback(() => removeBatch(end));
        } else {
          setTimeout(() => removeBatch(end), 0);
        }
      } else {
        // すべて削除完了
        this.matchCards.clear();
        // データベース削除は UI 操作が落ち着いた後のアイドルタイムで実行
        const deleteDb = () => {
          if (window.db) {
            window.db.deleteAllMatches().catch(err => console.warn('Failed to delete all matches from database:', err));
          }
        };
        if (window.requestIdleCallback) {
          requestIdleCallback(deleteDb);
        } else {
          setTimeout(deleteDb, 0);
        }
      }
    };
    removeBatch();
  }
}
