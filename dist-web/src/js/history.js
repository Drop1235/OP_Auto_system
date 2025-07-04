// History Component for managing the history view
class History {
  constructor() {
    // View containers and elements
    this.historyCardViewContainer = document.getElementById('history-card-view'); // Main container for card view
    this.historyCardGrid = document.getElementById('history-court-grid'); // Grid where cards are placed

    // Filter elements
    this.courtFilter = document.getElementById('court-filter');
    this.dateFilter = document.getElementById('date-filter');
    this.clearDateFilterBtn = document.getElementById('clear-date-filter');
    
    this.sortColumn = 'endTime'; // Default sort
    this.sortDirection = 'desc';
    this.filteredMatches = [];
    // currentViewMode is no longer needed as we only have card view
    
    // Ensure card view is visible by default if it was hidden
    if (this.historyCardViewContainer && this.historyCardViewContainer.classList.contains('hidden')) {
      this.historyCardViewContainer.classList.remove('hidden');
    }

    // Create export button if it doesn't exist
    if (!document.getElementById('export-csv-btn')) {
      this.createExportButton();
    }
    
    // Create clear history button if it doesn't exist
    if (!document.getElementById('clear-history-btn')) {
      this.createClearHistoryButton();
    }
    
    this.init();
  }

  // Initialize the history view
  async init() {
    await this.loadCompletedMatches();
    this.setupFilters();
    this.setupSorting();
    this.setupEventListeners();
  }

  // Load completed matches from the database
  async loadCompletedMatches() {
    try {
      const completedMatches = await db.getCompletedMatches();
      this.filteredMatches = [...completedMatches];
      this.renderHistory(); // Changed from renderHistoryTable
      this.populateCourtFilter(completedMatches);
    } catch (error) {
      console.error('Error loading completed matches:', error);
    }
  }

  // Render the history card view with the filtered and sorted matches
  renderHistory() { // Renamed from renderHistoryTable
    const sortedMatches = this.sortMatches(this.filteredMatches);

    this.historyCardGrid.innerHTML = ''; // Clear the grid where cards are placed
    if (sortedMatches.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = '履歴データが見つかりません。試合を完了するとここに表示されます。(ウェブ版ではローカルの試合データは表示されません)';
      emptyMessage.style.textAlign = 'center';
      this.historyCardGrid.appendChild(emptyMessage);
    } else {
      this.renderCardView(sortedMatches); // This should populate this.historyCardGrid
    }
  }

  // カードビューをレンダリング
  renderCardView(matches) {
    // this.historyCardGrid is already cleared by renderHistoryTable

    // 1. Group matches by courtNumber
    const matchesByCourt = matches.reduce((acc, match) => {
      const court = match.courtNumber || 'N/A'; // Handle matches with no court number
      if (!acc[court]) {
        acc[court] = [];
      }
      acc[court].push(match);
      return acc;
    }, {});

    // Get sorted court numbers to maintain a consistent order of columns
    const sortedCourtNumbers = Object.keys(matchesByCourt).sort((a, b) => {
      if (a === 'N/A') return 1; // Push 'N/A' to the end
      if (b === 'N/A') return -1;
      // Attempt to sort numerically, fallback to string sort if not purely numeric
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a).localeCompare(String(b)); // Fallback for non-numeric or mixed court names
    });

    // 2. For each court, sort matches by endTime and create cards
    sortedCourtNumbers.forEach(courtNumber => {
      const courtMatches = matchesByCourt[courtNumber];

      // Sort matches within this court by actualEndTime (ascending)
      courtMatches.sort((a, b) => {
        const timeA = a.actualEndTime ? new Date(a.actualEndTime).getTime() : Infinity;
        const timeB = b.actualEndTime ? new Date(b.actualEndTime).getTime() : Infinity;
        return timeA - timeB; // Ascending order (earliest ended first)
      });

      // Create a column div for this court
      const courtColumnDiv = document.createElement('div');
      courtColumnDiv.className = 'history-court-column';
      
      // コート毎の色付きヘッダーを追加
      const columnHeader = document.createElement('div');
      columnHeader.className = 'court-column-header';
      columnHeader.textContent = `コート ${courtNumber}`;
      
      // コートヘッダーの色をコート4のピンク色で統一
      const pinkColor = '#e91e63'; // コート4のピンク色
      
      // 全てのコートに同じ色を適用
      columnHeader.style.backgroundColor = pinkColor;
      courtColumnDiv.appendChild(columnHeader);

      courtMatches.forEach((match, index) => {
        const sequenceNumber = index + 1; // 1-based sequence
        const matchCard = this.createHistoryMatchCard(match, sequenceNumber);
        courtColumnDiv.appendChild(matchCard);
      });

      this.historyCardGrid.appendChild(courtColumnDiv);
    });

    // If no matches at all (across all courts) and grid is still empty
    // This specific check might be redundant if renderHistoryTable already handles empty sortedMatches for card view
    if (matches.length > 0 && this.historyCardGrid.innerHTML === '' && sortedCourtNumbers.length === 0) {
      // This case implies matches exist but couldn't be grouped or rendered, which is unlikely with 'N/A' handling
      // Or if all matches were 'N/A' and something went wrong.
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'No completed matches found to display in card view.';
      emptyMessage.style.textAlign = 'center';
      this.historyCardGrid.appendChild(emptyMessage);
    }
  }

  // 履歴用のマッチカードを作成
  createHistoryMatchCard(match, sequenceNumber) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.dataset.matchId = match.id;
    
    // カード上部（リーグ名とメモ）
    const headerDiv = document.createElement('div');
    headerDiv.className = 'match-card-header';
    
    // 削除ボタン (×) - ヘッダーの最初に追加
    const deleteButton = document.createElement('span');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = '×';
    deleteButton.title = 'この試合を削除'; // ツールチップ
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteMatch(match.id);
    });
    headerDiv.appendChild(deleteButton);
    
    // 試合形式表示
    const gameFormatDisplay = document.createElement('div');
    gameFormatDisplay.className = 'match-card-game-format-display';
    
    // 試合形式のラベルを取得
    const gameFormatOptions = {
      '5game': '5G',
      '4game1set': '4G1set',
      '6game1set': '6G1set',
      '8game1set': '8G-Pro',
      '4game2set': '4G2set+10MTB',
      '6game2set': '6G2set+10MTB',
      '4game3set': '4G3set',
      '6game3set': '6G3set',
    };
    const currentFormat = match.gameFormat || '5game';
    const formatLabel = gameFormatOptions[currentFormat] || currentFormat;
    
    // 試合形式の表示を設定
    gameFormatDisplay.textContent = formatLabel;
    headerDiv.appendChild(gameFormatDisplay);
    
    // 実際の終了時間表示
    const endTimeDisplay = document.createElement('div');
    endTimeDisplay.className = 'match-end-time-display';
    if (match.actualEndTime) {
      const endTime = new Date(match.actualEndTime);
      const hours = endTime.getHours().toString().padStart(2, '0');
      const minutes = endTime.getMinutes().toString().padStart(2, '0');
      endTimeDisplay.textContent = `${hours}:${minutes}`;
    }
    headerDiv.appendChild(endTimeDisplay);
    
    card.appendChild(headerDiv);
    
    // メモ表示
    if (match.memo) {
      const memoDisplay = document.createElement('input');
      memoDisplay.className = 'match-card-memo';
      memoDisplay.value = match.memo;
      memoDisplay.readOnly = true;
      card.appendChild(memoDisplay);
    }
    
    // プレイヤー情報（縦に配置）
    const playersContainer = document.createElement('div');
    playersContainer.className = 'match-card-players-container';
    
    // プレイヤーA
    const playerADiv = document.createElement('div');
    playerADiv.className = 'match-card-player';
    
    // プレイヤーAラベルは不要
    
    // プレイヤーA名とスコアのコンテナ
    const playerInfoA = document.createElement('div');
    playerInfoA.style.display = 'flex';
    playerInfoA.style.justifyContent = 'space-between';
    playerInfoA.style.alignItems = 'center';
    playerInfoA.style.width = '100%';
    
    // プレイヤーA名
    const playerAName = document.createElement('input');
    playerAName.className = 'player-name-input';
    playerAName.value = match.playerA;
    playerAName.readOnly = true;
    playerAName.style.flexGrow = '1';
    playerInfoA.appendChild(playerAName);
    
    // 右側のスコアとチェックマークのコンテナ
    const scoreWinContainerA = document.createElement('div');
    scoreWinContainerA.style.display = 'flex';
    scoreWinContainerA.style.alignItems = 'center';
    scoreWinContainerA.style.gap = '5px';
    scoreWinContainerA.style.width = '150px'; // 幅をさらに広げてセットスコアとチェックマークが収まるように
    
    // スコア表示用コンテナ
    const scoreContainerA = document.createElement('div');
    scoreContainerA.className = 'set-scores-container';
    scoreContainerA.style.display = 'flex';
    scoreContainerA.style.justifyContent = 'flex-end';
    
    // スコア表示
    if (match.gameFormat === '6game3set' || match.gameFormat === '4game3set' || 
        match.gameFormat === '4game2set' || match.gameFormat === '6game2set') {
      // BO3形式の場合はセットスコアを表示
      if (match.setScores && match.setScores.A) {
        // セットスコア表示用のコンテナ
        const setScoresDisplayA = document.createElement('div');
        setScoresDisplayA.style.display = 'flex';
        setScoresDisplayA.style.gap = '1px';
        
        // 各セットのスコアを表示
        for (let i = 0; i < match.setScores.A.length; i++) {
          if (match.setScores.A[i] > 0) { // スコアがある場合のみ表示
            const setScore = document.createElement('input');
            setScore.type = 'number';
            setScore.className = 'set-score-input';
            setScore.value = match.setScores.A[i];
            setScore.readOnly = true;
            setScore.style.width = '20px';
            setScore.style.textAlign = 'center';
            setScoresDisplayA.appendChild(setScore);
          }
        }
        
        scoreContainerA.appendChild(setScoresDisplayA);
      } else {
        // セットスコアがない場合は通常のスコアを表示
        const scoreA = document.createElement('input');
        scoreA.className = 'score-input';
        scoreA.value = match.scoreA || '';
        scoreA.readOnly = true;
        scoreA.style.width = '40px';
        scoreA.style.textAlign = 'center';
        scoreContainerA.appendChild(scoreA);
      }
    } else {
      // 通常のスコア表示
      const scoreA = document.createElement('input');
      scoreA.className = 'score-input';
      scoreA.value = match.scoreA || '';
      scoreA.readOnly = true;
      scoreA.style.width = '40px';
      scoreA.style.textAlign = 'center';
      scoreContainerA.appendChild(scoreA);
    }
    
    // タイブレークスコア表示
    if (match.tieBreakA) {
      const tiebreakA = document.createElement('input');
      tiebreakA.className = 'tiebreak-input';
      tiebreakA.value = match.tieBreakA;
      tiebreakA.readOnly = true;
      tiebreakA.style.width = '30px';
      scoreContainerA.appendChild(tiebreakA);
    }
    
    scoreWinContainerA.appendChild(scoreContainerA);
    
    // Winラベル
    if (match.winner === 'A') {
      const winALabel = document.createElement('div');
      winALabel.className = 'win-label';
      winALabel.textContent = '✓'; // チェックマーク
      winALabel.style.color = 'green';
      winALabel.style.fontWeight = 'bold';
      winALabel.style.fontSize = '1.2em';
      winALabel.style.marginLeft = '5px';
      winALabel.style.marginRight = '5px';
      scoreWinContainerA.appendChild(winALabel);
    }
    
    playerInfoA.appendChild(scoreWinContainerA);
    playerADiv.appendChild(playerInfoA);
    
    playersContainer.appendChild(playerADiv);
    
    // プレイヤーB
    const playerBDiv = document.createElement('div');
    playerBDiv.className = 'match-card-player';
    
    // プレイヤーBラベルは不要
    
    // プレイヤーB名とスコアのコンテナ
    const playerInfoB = document.createElement('div');
    playerInfoB.style.display = 'flex';
    playerInfoB.style.justifyContent = 'space-between';
    playerInfoB.style.alignItems = 'center';
    playerInfoB.style.width = '100%';
    
    // プレイヤーB名
    const playerBName = document.createElement('input');
    playerBName.className = 'player-name-input';
    playerBName.value = match.playerB;
    playerBName.readOnly = true;
    playerBName.style.flexGrow = '1';
    playerInfoB.appendChild(playerBName);
    
    // 右側のスコアとチェックマークのコンテナ
    const scoreWinContainerB = document.createElement('div');
    scoreWinContainerB.style.display = 'flex';
    scoreWinContainerB.style.alignItems = 'center';
    scoreWinContainerB.style.gap = '5px';
    scoreWinContainerB.style.width = '150px'; // 幅をさらに広げてセットスコアとチェックマークが収まるように
    
    // スコア表示用コンテナ
    const scoreContainerB = document.createElement('div');
    scoreContainerB.className = 'set-scores-container';
    scoreContainerB.style.display = 'flex';
    scoreContainerB.style.justifyContent = 'flex-end';
    
    // スコア表示
    if (match.gameFormat === '6game3set' || match.gameFormat === '4game3set' || 
        match.gameFormat === '4game2set' || match.gameFormat === '6game2set') {
      // BO3形式の場合はセットスコアを表示
      if (match.setScores && match.setScores.B) {
        // セットスコア表示用のコンテナ
        const setScoresDisplayB = document.createElement('div');
        setScoresDisplayB.style.display = 'flex';
        setScoresDisplayB.style.gap = '1px';
        
        // 各セットのスコアを表示
        for (let i = 0; i < match.setScores.B.length; i++) {
          if (match.setScores.B[i] > 0) { // スコアがある場合のみ表示
            const setScore = document.createElement('input');
            setScore.type = 'number';
            setScore.className = 'set-score-input';
            setScore.value = match.setScores.B[i];
            setScore.readOnly = true;
            setScore.style.width = '20px';
            setScore.style.textAlign = 'center';
            setScoresDisplayB.appendChild(setScore);
          }
        }
        
        scoreContainerB.appendChild(setScoresDisplayB);
      } else {
        // セットスコアがない場合は通常のスコアを表示
        const scoreB = document.createElement('input');
        scoreB.className = 'score-input';
        scoreB.value = match.scoreB || '';
        scoreB.readOnly = true;
        scoreB.style.width = '40px';
        scoreB.style.textAlign = 'center';
        scoreContainerB.appendChild(scoreB);
      }
    } else {
      // 通常のスコア表示
      const scoreB = document.createElement('input');
      scoreB.className = 'score-input';
      scoreB.value = match.scoreB || '';
      scoreB.readOnly = true;
      scoreB.style.width = '40px';
      scoreB.style.textAlign = 'center';
      scoreContainerB.appendChild(scoreB);
    }
    
    // タイブレークスコア表示
    if (match.tieBreakB) {
      const tiebreakB = document.createElement('input');
      tiebreakB.className = 'tiebreak-input';
      tiebreakB.value = match.tieBreakB;
      tiebreakB.readOnly = true;
      tiebreakB.style.width = '30px';
      scoreContainerB.appendChild(tiebreakB);
    }
    
    scoreWinContainerB.appendChild(scoreContainerB);
    
    // Winラベル
    if (match.winner === 'B') {
      const winBLabel = document.createElement('div');
      winBLabel.className = 'win-label';
      winBLabel.textContent = '✓'; // チェックマーク
      winBLabel.style.color = 'green';
      winBLabel.style.fontWeight = 'bold';
      winBLabel.style.fontSize = '1.2em';
      winBLabel.style.marginLeft = '5px';
      winBLabel.style.marginRight = '5px';
      scoreWinContainerB.appendChild(winBLabel);
    }
    
    playerInfoB.appendChild(scoreWinContainerB);
    playerBDiv.appendChild(playerInfoB);
    
    playersContainer.appendChild(playerBDiv);
    card.appendChild(playersContainer);
    
    // 下部の終了時間表示は不要 (上部にあるため)
    
    return card;
  }

  // Win表示を判定
  shouldShowWin(match, player) {
    // 完了していない試合は勝者表示しない
    if (!match.actualEndTime) return false;

    // スコアがない場合は勝者表示しない
    if (match.scoreA === undefined || match.scoreB === undefined) return false;
    
    const scoreA = parseInt(match.scoreA) || 0;
    const scoreB = parseInt(match.scoreB) || 0;
    
    // 単純にスコアで勝者を判定
    if (player === 'A' && scoreA > scoreB) return true;
    if (player === 'B' && scoreB > scoreA) return true;
    
    // タイブレークの場合
    if (scoreA === scoreB) {
      const tieBreakA = parseInt(match.tieBreakA) || 0;
      const tieBreakB = parseInt(match.tieBreakB) || 0;
      
      if (player === 'A' && tieBreakA > tieBreakB) return true;
      if (player === 'B' && tieBreakB > tieBreakA) return true;
    }
    
    // winnerプロパティが明示的に設定されていればそれを使用
    if (match.winner) {
      return match.winner === player;
    }
    
    return false;
  }

  // Sort matches based on the current sort column and direction
  sortMatches(matches) {
    return [...matches].sort((a, b) => {
      let valueA, valueB;
      
      // Handle different column types
      switch (this.sortColumn) {
        case 'court':
          valueA = a.courtNumber || 0;
          valueB = b.courtNumber || 0;
          break;
        case 'playerA':
          valueA = a.playerA.toLowerCase();
          valueB = b.playerA.toLowerCase();
          break;
        case 'playerB':
          valueA = a.playerB.toLowerCase();
          valueB = b.playerB.toLowerCase();
          break;
        case 'startTime':
          valueA = a.actualStartTime ? new Date(a.actualStartTime).getTime() : 0;
          valueB = b.actualStartTime ? new Date(b.actualStartTime).getTime() : 0;
          break;
        case 'endTime':
          valueA = a.actualEndTime ? new Date(a.actualEndTime).getTime() : 0;
          valueB = b.actualEndTime ? new Date(b.actualEndTime).getTime() : 0;
          break;
        default:
          valueA = a.id;
          valueB = b.id;
      }
      
      // Apply sort direction
      if (this.sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  // Populate the court filter dropdown with available courts
  populateCourtFilter(matches) {
    // Clear existing options except the "All Courts" option
    while (this.courtFilter.options.length > 1) {
      this.courtFilter.remove(1);
    }
    
    // Get unique court numbers
    const courtNumbers = [...new Set(matches.map(match => match.courtNumber).filter(Boolean))];
    courtNumbers.sort((a, b) => a - b);
    
    // Add options for each court number
    courtNumbers.forEach(courtNumber => {
      const option = document.createElement('option');
      option.value = courtNumber;
      option.textContent = `Court ${courtNumber}`;
      this.courtFilter.appendChild(option);
    });
  }

  // Set up filter controls
  setupFilters() {
    // Court filter
    this.courtFilter.addEventListener('change', () => {
      this.applyFilters();
    });
    
    // Date filter
    this.dateFilter.addEventListener('change', () => {
      this.applyFilters();
    });
    
    // Clear date filter
    this.clearDateFilterBtn.addEventListener('click', () => {
      this.dateFilter.value = '';
      this.applyFilters();
    });
  }

  // Apply filters to the matches
  async applyFilters() {
    try {
      // Get all completed matches
      const completedMatches = await db.getCompletedMatches();
      
      // Apply court filter
      const courtValue = this.courtFilter.value;
      let filtered = completedMatches;
      
      if (courtValue !== 'all') {
        const courtNumber = parseInt(courtValue);
        filtered = filtered.filter(match => match.courtNumber === courtNumber);
      }
      
      // Apply date filter
      const dateValue = this.dateFilter.value;
      if (dateValue) {
        const filterDate = new Date(dateValue);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        filtered = filtered.filter(match => {
          if (!match.actualEndTime) return false;
          
          const endTime = new Date(match.actualEndTime);
          return endTime >= filterDate && endTime < nextDay;
        });
      }
      
      this.filteredMatches = filtered;
      this.renderHistoryTable();
      
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  }

  // Set up sorting functionality
  setupSorting() {
    const headers = document.querySelectorAll('#history-table th[data-sort]');
    
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.dataset.sort;
        
        // Toggle direction if clicking the same column
        if (column === this.sortColumn) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = column;
          this.sortDirection = 'asc';
        }
        
        // Update UI to show sort direction
        headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        header.classList.add(`sort-${this.sortDirection}`);
        
        this.renderHistoryTable();
      });
    });
  }

  // Set up event listeners
  setupEventListeners() {
    // Listen for history updates
    document.addEventListener('history-updated', async () => {
      await this.loadCompletedMatches();
    });
    
    // Export button event listener
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportToCSV();
      });
    }
  } // Closes setupEventListeners
  
  // 試合を削除する
  async handleDeleteMatch(matchId) {
    try {
      // 確認ダイアログを表示
      const confirmed = confirm('この試合を履歴から削除しますか？');
      
      if (confirmed) {
        // データベースから試合を削除
        await db.deleteMatch(matchId);
        
        // 履歴表示を更新
        await this.loadCompletedMatches();
        
        // 成功メッセージ
        console.log('試合が削除されました。ID:', matchId);
      }
    } catch (error) {
      console.error('試合の削除中にエラーが発生しました:', error);
      alert('試合の削除中にエラーが発生しました: ' + error.message);
    }
  }

  // 書き出しボタンとオプションを作成
  createExportButton() {
    const filterControls = document.querySelector('.filter-controls');
    if (!filterControls) return;
    
    // 書き出し方法を選択するセレクトボックス
    const exportTypeSelect = document.createElement('select');
    exportTypeSelect.id = 'export-type-select';
    exportTypeSelect.className = 'export-type-select';
    
    // CSV出力オプション
    const csvOption = document.createElement('option');
    csvOption.value = 'csv';
    csvOption.textContent = 'CSV形式';
    exportTypeSelect.appendChild(csvOption);
    
    // スクリーンショットオプション
    const screenshotOption = document.createElement('option');
    screenshotOption.value = 'screenshot';
    screenshotOption.textContent = 'スクリーンショット';
    exportTypeSelect.appendChild(screenshotOption);
    
    // 書き出しボタン
    const exportBtn = document.createElement('button');
    exportBtn.id = 'export-btn';
    exportBtn.className = 'export-btn';
    exportBtn.textContent = '書き出し';
    
    // ボタンクリック時の処理
    exportBtn.addEventListener('click', () => {
      const exportType = exportTypeSelect.value;
      
      if (exportType === 'csv') {
        this.exportToCSV();
      } else if (exportType === 'screenshot') {
        this.exportScreenshot();
      }
    });
    
    // コンテナの作成
    const exportContainer = document.createElement('div');
    exportContainer.className = 'filter-group export-group';
    exportContainer.style.display = 'flex';
    exportContainer.style.alignItems = 'center';
    exportContainer.style.gap = '10px';
    
    // ラベル追加
    const exportLabel = document.createElement('span');
    exportLabel.textContent = '出力形式:';
    exportLabel.style.marginRight = '5px';
    
    exportContainer.appendChild(exportLabel);
    exportContainer.appendChild(exportTypeSelect);
    exportContainer.appendChild(exportBtn);
    
    filterControls.appendChild(exportContainer);
  }
  
  // Create clear history button
  createClearHistoryButton() {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-history-btn';
    clearBtn.className = 'btn btn-danger';
    clearBtn.textContent = '履歴クリア';
    clearBtn.style.marginLeft = '10px';
    
    clearBtn.addEventListener('click', async () => {
      // 確認ダイアログを表示
      const confirmed = await window.api.showConfirmDialog('試合履歴をすべてクリアしますか？この操作は元に戻せません。');
      
      if (confirmed) {
        try {
          // データベースから履歴をクリア
          const success = await db.clearCompletedMatches();
          
          if (success) {
            // 履歴表示を更新
            this.filteredMatches = [];
            this.renderHistory();
            
            // コートフィルターをリセット
            this.populateCourtFilter([]);
            
            // 成功メッセージ
            alert('試合履歴がクリアされました。');
          } else {
            alert('履歴のクリアに失敗しました。');
          }
        } catch (error) {
          console.error('Error clearing history:', error);
          alert('エラーが発生しました: ' + error.message);
        }
      }
    });
    
    const historyHeader = document.querySelector('.history-header');
    if (historyHeader) {
      historyHeader.appendChild(clearBtn);
    }
  }

  // CSV形式でマッチをエクスポート
  async exportToCSV() {
    try {
      // ソートしたマッチを取得
      const sortedMatches = this.sortMatches(this.filteredMatches);
      
      if (sortedMatches.length === 0) {
        alert('書き出し可能な試合データがありません');
        return;
      }
      
      // CSVヘッダー作成
      let csvContent = 'コート,プレイヤーA,プレイヤーB,予定開始時刻,実際開始時刻,実際終了時刻\n';
      
      // 各マッチを行として追加
      sortedMatches.forEach(match => {
        const courtNumber = match.courtNumber || 'N/A';
        const playerA = `"${match.playerA.replace(/"/g, '""')}"`; // 引用符のエスケープ
        const playerB = `"${match.playerB.replace(/"/g, '""')}"`;
        const scheduledStart = match.scheduledStartTime ? new Date(match.scheduledStartTime).toLocaleString() : 'N/A';
        const actualStart = match.actualStartTime ? new Date(match.actualStartTime).toLocaleString() : 'N/A';
        const actualEnd = match.actualEndTime ? new Date(match.actualEndTime).toLocaleString() : 'N/A';
        
        csvContent += `${courtNumber},${playerA},${playerB},${scheduledStart},${actualStart},${actualEnd}\n`;
      });
      
      // Electron APIを使って保存先を選択する
      const defaultFilename = `テニス試合記録_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.csv`;
      
      // window.apiが存在する場合はネイティブ方式で保存
      if (window.api && window.api.saveCSVFile) {
        try {
          const result = await window.api.saveCSVFile(csvContent, defaultFilename);
          if (result.success) {
            console.log('ファイルが保存されました:', result.path);
          } else if (result.canceled) {
            console.log('CSV保存がキャンセルされました');
          } else {
            console.error('CSV保存エラー:', result.error);
            alert('ファイルの保存に失敗しました: ' + result.error);
          }
        } catch (error) {
          console.error('CSV保存APIエラー:', error);
          this._fallbackCSVSave(csvContent, defaultFilename); // フォールバック処理
        }
      } else {
        // APIが利用できない場合は従来のブラウザ方式で保存
        console.warn('ネイティブのCSV保存APIが利用できないため、ブラウザの保存機能を使用します');
        this._fallbackCSVSave(csvContent, defaultFilename);
      }
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
      alert('データの書き出し中にエラーが発生しました');
    }
  }
  
  // ブラウザベースの保存処理（フォールバック用）
  _fallbackCSVSave(csvContent, filename) {
    try {
      // BOM付きUTF-8で保存
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const csvData = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
      
      const url = URL.createObjectURL(csvData);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('フォールバック保存エラー:', error);
      alert('ファイルの保存に失敗しました');
    }
  }

  // スクリーンショットをエクスポート
  exportScreenshot() {
    // Electron APIを使ってスクリーンショットを撮影
    if (window.api && window.api.takeScreenshot) {
      try {
        // 要素を非表示にしてからスクリーンショットを撮影
        const exportContainer = document.querySelector('.export-group');
        const tempStyle = exportContainer ? exportContainer.style.display : null;
        if (exportContainer) {
          exportContainer.style.display = 'none';
        }
        
        // スクリーンショットの前に少し待つ
        setTimeout(async () => {
          try {
            // Electronのプリロードスクリプト経由でスクリーンショット撮影
            await window.api.takeScreenshot(`テニス試合記録_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.png`);
            alert('スクリーンショットを保存しました');
          } catch (error) {
            console.error('スクリーンショット撮影エラー:', error);
            alert('スクリーンショットの撮影に失敗しました');
          } finally {
            // 非表示にした要素を元に戻す
            if (exportContainer && tempStyle !== null) {
              exportContainer.style.display = tempStyle;
            }
          }
        }, 100);
      } catch (error) {
        console.error('スクリーンショット処理エラー:', error);
        alert('スクリーンショット機能でエラーが発生しました');
      }
    } else {
      // Electron APIが利用できない場合はエラーメッセージ
      alert('この機能はデスクトップアプリでのみ利用可能です');
      console.warn('スクリーンショットAPIが見つかりません');
    }
  }
  
  // Delete a match from the database
  async deleteMatch(matchId) {
    if (!matchId) return;
    
    // Confirm deletion
    if (!confirm('この試合を削除してもよろしいですか？')) {
      return;
    }
    
    try {
      // Delete from database
      await db.deleteMatch(matchId);
      
      // UI update will be handled by reloading matches
      
      // Reload matches to update filters and card view
      await this.loadCompletedMatches();
      
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('試合の削除に失敗しました。もう一度お試しください。');
    }
  }
}
