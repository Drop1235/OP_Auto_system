// Main application script
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for database initialization
  await new Promise(resolve => {
    const checkDbInterval = setInterval(() => {
      if (db.db) {
        clearInterval(checkDbInterval);
        console.log('[APP] Database considered initialized (db.db is true).');
        resolve();
      }
    }, 100);
  });
  
  // ローカルストレージからコート数を取得（保存されていない場合はデフォルト値の12を使用）
  const savedCourtCount = localStorage.getItem('courtCount');
  const initialCourtCount = savedCourtCount ? parseInt(savedCourtCount) : 12;
  
  // Initialize components
  console.log('[APP] Creating Board instance.');
  
  // 既存の board インスタンスがあるか確認
  if (window.boardInstance) {
    console.log('[APP] Found existing boardInstance, using it');
    window.board = window.boardInstance;
  } else {
    console.log('[APP] No existing boardInstance found, creating new Board');
    // グローバル変数として board を設定
    window.board = new Board(initialCourtCount);
  }
  
  const history = new History();
  
  // Set up navigation
  const boardViewBtn = document.getElementById('board-view-btn');
  const historyViewBtn = document.getElementById('history-view-btn');
  const boardView = document.getElementById('board-view');
  const historyView = document.getElementById('history-view');
  
  boardViewBtn.addEventListener('click', () => {
    boardView.classList.add('active-view');
    historyView.classList.remove('active-view');
    boardView.classList.remove('hidden-view');
    historyView.classList.add('hidden-view');
    
    boardViewBtn.classList.add('active');
    historyViewBtn.classList.remove('active');
  });
  
  historyViewBtn.addEventListener('click', () => {
    historyView.classList.add('active-view');
    boardView.classList.remove('active-view');
    historyView.classList.remove('hidden-view');
    boardView.classList.add('hidden-view');
    
    historyViewBtn.classList.add('active');
    boardViewBtn.classList.remove('active');
  });
  
  // Set up add match modal
  const addMatchBtn = document.getElementById('add-match-btn');
  const addMatchModal = document.getElementById('add-match-modal');
  const closeModal = document.querySelector('.close-modal');
  const addMatchForm = document.getElementById('add-match-form');
  const courtSelect = document.getElementById('court-select');
  const positionSelect = document.getElementById('position-select');

  // 「Win」入力時の時刻表示機能
  const playerAInput = document.getElementById('player-a');
  const playerBInput = document.getElementById('player-b');

  function handleWinInput(event) {
      const inputElement = event.target;
      // inputElement とその親ノードが存在することを確認
      if (!inputElement || !inputElement.parentNode) {
          console.warn('[APP] 「Win」検出のための入力要素またはその親が見つかりません。');
          return;
      }

      const existingTimeDisplayId = inputElement.id + '-time-display';
      let timeDisplayElement = document.getElementById(existingTimeDisplayId);

      // 大文字・小文字を区別せずに "win" をチェック
      if (inputElement.value.toLowerCase().includes('win')) {
          if (!timeDisplayElement) {
              timeDisplayElement = document.createElement('span');
              timeDisplayElement.id = existingTimeDisplayId;
              timeDisplayElement.style.marginLeft = '5px'; // マージン調整
              timeDisplayElement.classList.add('win-time-display'); // CSSでのスタイリング用クラス
              // 入力フィールドの直後に時刻表示スパンを挿入
              if (inputElement.nextSibling) {
                  inputElement.parentNode.insertBefore(timeDisplayElement, inputElement.nextSibling);
              } else {
                  inputElement.parentNode.appendChild(timeDisplayElement);
              }
          }
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          const timeString = `${hours}:${minutes}:${seconds}`;
          timeDisplayElement.textContent = `(${timeString})`; // 表示形式: (HH:MM:SS)
      } else {
          // 入力値に "win" が含まれていない場合、時刻表示が存在すれば削除
          if (timeDisplayElement) {
              timeDisplayElement.remove();
          }
      }
  }

  if (playerAInput) {
      playerAInput.addEventListener('input', handleWinInput);
  }
  if (playerBInput) {
      playerBInput.addEventListener('input', handleWinInput);
  }
  // 「Win」入力時の時刻表示機能ここまで
  
  // コート選択オプションは board.updateCourtSelectOptions() で更新されるため、ここでは不要
  
  // 予定開始時刻欄は削除したため、このコードは不要になりました
  
  // Function to update position select options
  const updatePositionSelectOptions = () => {
    const selectedCourtValue = courtSelect.value;
    let occupiedPositions = [];

    if (selectedCourtValue && window.board) { // Check if a specific court is selected and board exists
      occupiedPositions = window.board.getOccupiedRowPositions(selectedCourtValue);
    }

    for (const option of positionSelect.options) {
      if (option.value === "") { // "Unassigned" option
        option.disabled = false;
        option.style.display = '';
      } else if (selectedCourtValue === "") { // If "Unassigned" court is selected, all positions are available
        option.disabled = false;
        option.style.display = '';
      } else {
        if (occupiedPositions.includes(option.value)) {
          option.disabled = true;
          option.style.display = 'none'; // Hide occupied slots
        } else {
          option.disabled = false;
          option.style.display = '';
        }
      }
    }
    // Ensure the current selection is valid, if not, select "Unassigned"
    if (positionSelect.selectedOptions.length > 0 && positionSelect.selectedOptions[0].disabled) {
        positionSelect.value = "";
    }
  };

  // Open modal
  addMatchBtn.addEventListener('click', () => {
    addMatchForm.reset(); // Reset form first
    updatePositionSelectOptions(); // Then update position options based on (potentially reset) court selection
    addMatchModal.style.display = 'block';
  });

  // Update position select when court selection changes
  courtSelect.addEventListener('change', updatePositionSelectOptions);
  
  // Close modal
  closeModal.addEventListener('click', () => {
    addMatchModal.style.display = 'none';
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === addMatchModal) {
      addMatchModal.style.display = 'none';
    }
  });
  
  // コート数の変更を保存
  const saveCourtsCount = () => {
    localStorage.setItem('courtCount', window.board.numberOfCourts);
  };
  
  // コート数変更ボタンのイベントリスナーを追加
  const decreaseCourtsBtn = document.getElementById('decrease-courts-btn');
  const increaseCourtsBtn = document.getElementById('increase-courts-btn');
  
  if (decreaseCourtsBtn) {
    decreaseCourtsBtn.addEventListener('click', saveCourtsCount);
  }
  
  if (increaseCourtsBtn) {
    increaseCourtsBtn.addEventListener('click', saveCourtsCount);
  }
  
  // Handle form submission
  addMatchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[APP] Form submission started');
    
    const playerA = document.getElementById('player-a').value.trim();
    const playerB = document.getElementById('player-b').value.trim();
    const courtNumber = document.getElementById('court-select').value;
    const position = document.getElementById('position-select').value;
    
    console.log('[APP] Form data:', { playerA, playerB, courtNumber, position });
    
    try {
      // Create new match object
      const newMatch = {
        playerA,
        playerB,
        // 予定開始時刻は設定しない
        status: position ? 
          (position === 'current' ? 'Current' : 
           position === 'next' ? 'Next' : 
           position === 'next2' ? 'Next2' : 'Unassigned') : 'Unassigned',
        courtNumber: courtNumber ? parseInt(courtNumber) : null,
        rowPosition: position || null
      };
      
      // Add match to database
      console.log('[APP] Adding match to database:', newMatch);
      const addedMatch = await db.addMatch(newMatch);
      console.log('[APP] Match added to database, returned match:', addedMatch);
      
      // 確認のため、board オブジェクトが存在するか確認
      console.log('[APP] Before event dispatch - Board object exists:', !!window.board);
      console.log('[APP] Board object details:', window.board);
      console.log('[APP] Board methods:', Object.getOwnPropertyNames(window.board.__proto__));
      
      // Dispatch event to notify board of new match
      const addEvent = new CustomEvent('match-added', {
        detail: { match: addedMatch }
      });
      console.log('[APP] Dispatching match-added event for match ID:', addedMatch.id, addedMatch);
      
      // イベント発行前にイベントリスナーが登録されているか確認
      const listeners = window.board && typeof window.board._checkEventListeners === 'function' 
        ? window.board._checkEventListeners('match-added') 
        : 'Cannot check event listeners';
      console.log('[APP] Event listeners for match-added:', listeners);
      
      document.dispatchEvent(addEvent);
      console.log('[APP] Event dispatched');
      
      // Reset form and close modal
      addMatchForm.reset();
      addMatchModal.style.display = 'none';
      
    } catch (error) {
      console.error('Error adding match:', error);
      alert('試合の追加に失敗しました。もう一度お試しください。');
    }
  });
  
  // Handle drag from board to history
  const historyTable = document.getElementById('history-table-body');
  historyTable.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    historyTable.classList.add('row-highlight');
  });
  
  historyTable.addEventListener('dragleave', () => {
    historyTable.classList.remove('row-highlight');
  });
  
  historyTable.addEventListener('drop', async (e) => {
    e.preventDefault();
    historyTable.classList.remove('row-highlight');
    
    // Get the match ID from the dragged card
    const matchId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!matchId) return;
    
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
      
      // Set match as completed
      const actualEndTime = new Date().toISOString();
      
      // Update the match in the database
      const updatedMatch = await db.updateMatch({
        id: matchId,
        status: 'Completed',
        actualEndTime
      });
      
      // Dispatch an event to notify the board to update
      const updateEvent = new CustomEvent('match-updated', {
        detail: { match: updatedMatch }
      });
      document.dispatchEvent(updateEvent);
      
    } catch (error) {
      console.error('Error completing match:', error);
    }
  });
});
