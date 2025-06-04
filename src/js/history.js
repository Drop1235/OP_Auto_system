// History Component for managing the history view
class History {
  constructor() {
    // View containers and elements
    this.historyTableView = document.getElementById('history-table-view');
    this.historyCardViewContainer = document.getElementById('history-card-view');
    this.historyCardGrid = document.getElementById('history-court-grid'); // Where cards are actually placed
    this.historyTableBody = document.getElementById('history-table-body');

    // View toggle buttons
    this.tableViewBtn = document.getElementById('table-view-btn');
    this.cardViewBtn = document.getElementById('card-view-btn');

    // Filter elements
    this.courtFilter = document.getElementById('court-filter');
    this.dateFilter = document.getElementById('date-filter');
    this.clearDateFilterBtn = document.getElementById('clear-date-filter');
    
    this.sortColumn = 'endTime'; // Default sort
    this.sortDirection = 'desc';
    this.filteredMatches = [];
    this.currentViewMode = 'card'; // Default view mode, matches initial HTML state
    
    // Create export button if it doesn't exist
    if (!document.getElementById('export-csv-btn')) {
      this.createExportButton();
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
      this.renderHistoryTable();
      this.populateCourtFilter(completedMatches);
    } catch (error) {
      console.error('Error loading completed matches:', error);
    }
  }

  // Render the history table or card view with the filtered and sorted matches
  renderHistoryTable() {
    const sortedMatches = this.sortMatches(this.filteredMatches);

    if (this.currentViewMode === 'table') {
      this.historyTableBody.innerHTML = ''; // Clear only the table body
      if (sortedMatches.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = document.querySelectorAll('#history-table th').length || 6; // Dynamic colspan
        emptyCell.textContent = '履歴データが見つかりません。試合を完了するとここに表示されます。(ウェブ版ではローカルの試合データは表示されません)';
        emptyCell.style.textAlign = 'center';
        emptyRow.appendChild(emptyCell);
        this.historyTableBody.appendChild(emptyRow);
      } else {
        this.renderTableView(sortedMatches); // This should populate this.historyTableBody
      }
    } else if (this.currentViewMode === 'card') {
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
      
      // Optional: Add a header to the column
      // const columnHeader = document.createElement('h4');
      // columnHeader.textContent = `コート ${courtNumber}`;
      // courtColumnDiv.appendChild(columnHeader);

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
    card.className = 'match-card history-card';
    card.dataset.matchId = match.id;
    
    // カードヘッダー
    const headerDiv = document.createElement('div');
    headerDiv.className = 'match-card-header';
    
    // メモ表示
    const memoDisplay = document.createElement('div');
    memoDisplay.className = 'match-card-memo-display';
    memoDisplay.textContent = match.memo || '';
    headerDiv.appendChild(memoDisplay);
    
    // コート番号とシーケンス
    const courtInfoDiv = document.createElement('div');
    courtInfoDiv.className = 'match-card-court-info'; // New class for potentially different styling
    let courtText = `コート ${match.courtNumber || 'N/A'}`;
    if (sequenceNumber) {
      courtText += ` - ${sequenceNumber}番目`;
    }
    courtInfoDiv.textContent = courtText;
    headerDiv.appendChild(courtInfoDiv);
    
    card.appendChild(headerDiv);
    
    // プレイヤー情報
    const playersDiv = document.createElement('div');
    playersDiv.className = 'match-card-players';
    
    // プレイヤーA
    const playerADiv = document.createElement('div');
    playerADiv.className = 'match-card-player';
    
    const playerAName = document.createElement('div');
    playerAName.className = 'player-name';
    playerAName.textContent = match.playerA;
    playerADiv.appendChild(playerAName);
    
    // スコア表示
    if (match.scoreA !== undefined && match.scoreA !== null) {
      const scoreA = document.createElement('div');
      scoreA.className = 'player-score';
      scoreA.textContent = match.scoreA;
      playerADiv.appendChild(scoreA);
    }
    
    // Winラベル
    const winALabel = document.createElement('div');
    winALabel.className = 'win-label';
    if (this.shouldShowWin(match, 'A')) {
      winALabel.textContent = 'Win';
      winALabel.style.color = 'red';
    }
    playerADiv.appendChild(winALabel);
    
    // プレイヤーB
    const playerBDiv = document.createElement('div');
    playerBDiv.className = 'match-card-player';
    
    const playerBName = document.createElement('div');
    playerBName.className = 'player-name';
    playerBName.textContent = match.playerB;
    playerBDiv.appendChild(playerBName);
    
    // スコア表示
    if (match.scoreB !== undefined && match.scoreB !== null) {
      const scoreB = document.createElement('div');
      scoreB.className = 'player-score';
      scoreB.textContent = match.scoreB;
      playerBDiv.appendChild(scoreB);
    }
    
    // Winラベル
    const winBLabel = document.createElement('div');
    winBLabel.className = 'win-label';
    if (this.shouldShowWin(match, 'B')) {
      winBLabel.textContent = 'Win';
      winBLabel.style.color = 'red';
    }
    playerBDiv.appendChild(winBLabel);
    
    playersDiv.appendChild(playerADiv);
    playersDiv.appendChild(playerBDiv);
    card.appendChild(playersDiv);
    
    // 時間情報
    const timeInfo = document.createElement('div');
    timeInfo.className = 'match-card-time-info';
    
    // 実際の終了時間
    if (match.actualEndTime) {
      const endTime = document.createElement('div');
      endTime.className = 'match-end-time';
      endTime.textContent = `終了: ${new Date(match.actualEndTime).toLocaleTimeString()}`;
      timeInfo.appendChild(endTime);
    }
    
    card.appendChild(timeInfo);
    
    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn card-delete-btn';
    deleteBtn.innerHTML = '&#10006;';
    deleteBtn.title = '削除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // カードクリックイベントの伝播を防止
      this.deleteMatch(match.id);
    });
    card.appendChild(deleteBtn);
    
    return card;
  }

  // Win表示を判定
  shouldShowWin(match, player) {
    if (!match.actualEndTime) return false;
    
    const scoreA = parseInt(match.scoreA) || 0;
    const scoreB = parseInt(match.scoreB) || 0;
    
    if (player === 'A') {
      return scoreA > scoreB;
    } else {
      return scoreB > scoreA;
    }
  }

  // テーブルビューをレンダリング
  renderTableView(matches) {
    // Create a row for each match
    matches.forEach(match => {
      const row = document.createElement('tr');
      row.dataset.matchId = match.id;
      
      // Court number
      const courtCell = document.createElement('td');
      courtCell.textContent = match.courtNumber || 'N/A';
      
      // Player A
      const playerACell = document.createElement('td');
      playerACell.textContent = match.playerA;
      
      // Player B
      const playerBCell = document.createElement('td');
      playerBCell.textContent = match.playerB;
      
      // Actual start time
      const startTimeCell = document.createElement('td');
      startTimeCell.textContent = match.actualStartTime 
        ? new Date(match.actualStartTime).toLocaleString() 
        : 'N/A';
      
      // Actual end time
      const endTimeCell = document.createElement('td');
      endTimeCell.textContent = match.actualEndTime 
        ? new Date(match.actualEndTime).toLocaleString() 
        : 'N/A';
      
      // Actions cell
      const actionsCell = document.createElement('td');
      actionsCell.className = 'actions-cell';
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '&#10006;'; // X symbol
      deleteBtn.title = 'Delete match';
      deleteBtn.addEventListener('click', () => this.deleteMatch(match.id));
      
      actionsCell.appendChild(deleteBtn);
      
      row.appendChild(courtCell);
      row.appendChild(playerACell);
      row.appendChild(playerBCell);
      row.appendChild(startTimeCell);
      row.appendChild(endTimeCell);
      row.appendChild(actionsCell);
      
      this.historyTableBody.appendChild(row);
    });
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

    // View toggle button listeners
    if (this.tableViewBtn) {
      this.tableViewBtn.addEventListener('click', () => {
        if (this.currentViewMode !== 'table') {
          this.currentViewMode = 'table';
          this.tableViewBtn.classList.add('active');
          this.cardViewBtn.classList.remove('active');
          this.historyTableView.classList.remove('hidden');
          this.historyCardViewContainer.classList.add('hidden');
          this.renderHistoryTable();
        }
      });
    }

    if (this.cardViewBtn) {
      this.cardViewBtn.addEventListener('click', () => {
        if (this.currentViewMode !== 'card') {
          this.currentViewMode = 'card';
          this.cardViewBtn.classList.add('active');
          this.tableViewBtn.classList.remove('active');
          this.historyCardViewContainer.classList.remove('hidden');
          this.historyTableView.classList.add('hidden');
          this.renderHistoryTable();
        }
      });
    }
  }

  // Create export button
  createExportButton() {
    const filterControls = document.querySelector('.filter-controls');
    if (!filterControls) return;
    
    const exportBtn = document.createElement('button');
    exportBtn.id = 'export-csv-btn';
    exportBtn.className = 'export-btn';
    exportBtn.textContent = 'Export to CSV';
    
    // Create a container for the export button
    const exportContainer = document.createElement('div');
    exportContainer.className = 'filter-group export-group';
    exportContainer.appendChild(exportBtn);
    
    filterControls.appendChild(exportContainer);
  }
  
  // Export filtered matches to CSV
  exportToCSV() {
    // Get sorted matches
    const sortedMatches = this.sortMatches(this.filteredMatches);
    
    if (sortedMatches.length === 0) {
      alert('No matches to export');
      return;
    }
    
    // Create CSV header
    let csvContent = 'Court,Player A,Player B,Scheduled Start,Actual Start,Actual End\n';
    
    // Add each match as a row
    sortedMatches.forEach(match => {
      const courtNumber = match.courtNumber || 'N/A';
      const playerA = `"${match.playerA.replace(/"/g, '""')}"`; // Escape quotes
      const playerB = `"${match.playerB.replace(/"/g, '""')}"`;
      const scheduledStart = match.scheduledStartTime ? new Date(match.scheduledStartTime).toLocaleString() : 'N/A';
      const actualStart = match.actualStartTime ? new Date(match.actualStartTime).toLocaleString() : 'N/A';
      const actualEnd = match.actualEndTime ? new Date(match.actualEndTime).toLocaleString() : 'N/A';
      
      csvContent += `${courtNumber},${playerA},${playerB},${scheduledStart},${actualStart},${actualEnd}\n`;
    });
    
    // Create a download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tennis_matches_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Delete a match from the database
  async deleteMatch(matchId) {
    if (!matchId) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this match?')) {
      return;
    }
    
    try {
      // Delete from database
      await db.deleteMatch(matchId);
      
      // Remove from UI
      const row = document.querySelector(`tr[data-match-id="${matchId}"]`);
      if (row) {
        row.remove();
      }
      
      // Reload matches to update filters and table
      await this.loadCompletedMatches();
      
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Failed to delete match. Please try again.');
    }
  }
}
