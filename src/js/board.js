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
          this.numberOfCourts--;
          this.createCourtGrid();
          this.loadMatches();
          this.updateCourtSelectOptions();
        }
      });
    }
    
    if (this.increaseCourtsBtn) {
      this.increaseCourtsBtn.addEventListener('click', () => {
        if (this.numberOfCourts < 24) { // 最大24コートまで
          this.numberOfCourts++;
          this.createCourtGrid();
          this.loadMatches();
          this.updateCourtSelectOptions();
        }
      });
    }

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
    const courtSelect = document.getElementById('court-select');
    if (!courtSelect) return;
    
    // 既存のオプションをクリア（最初の「未割当」オプションは残す）
    while (courtSelect.options.length > 1) {
      courtSelect.remove(1);
    }
    
    // 新しいオプションを追加
    for (let i = 1; i <= this.numberOfCourts; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = this.getCourtName(i);
      courtSelect.appendChild(option);
    }
    
    // 履歴ビューのフィルターも更新
    const courtFilter = document.getElementById('court-filter');
    if (courtFilter) {
      // 既存のオプションをクリア（最初の「All Courts」オプションは残す）
      while (courtFilter.options.length > 1) {
        courtFilter.remove(1);
      }
      
      // 新しいオプションを追加
      for (let i = 1; i <= this.numberOfCourts; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = this.getCourtName(i);
        courtFilter.appendChild(option);
      }
    }
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
        // 未割当の場合は未割当エリアに配置
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
    const occupiedPositions = [];
    if (!courtNumber) { // If courtNumber is null or undefined (e.g., "Unassigned" court)
      return []; // No specific positions are occupied for "Unassigned" court
    }

    const numericCourtNumber = parseInt(courtNumber);

    for (const card of this.matchCards.values()) {
      if (card.match.courtNumber === numericCourtNumber && card.match.rowPosition) {
        // Ensure rowPosition is one of the valid types before adding
        if (['current', 'next', 'next2'].includes(card.match.rowPosition)) {
          occupiedPositions.push(card.match.rowPosition);
        }
      }
    }
    return [...new Set(occupiedPositions)]; // Return unique positions
  }
}
