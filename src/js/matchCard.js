// Match Card Component
class MatchCard {
  constructor(match) { // gameFormat引数を削除
    this.match = match;
    if (!this.match.gameFormat) { // gameFormatプロパティがなければデフォルトで 'league' を設定
      this.match.gameFormat = 'league';
    }
    // スコアがない場合は初期化
    if (!this.match.scoreA) this.match.scoreA = 0;
    if (!this.match.scoreB) this.match.scoreB = 0;
    if (!this.match.memo) this.match.memo = '';
    this.match.tieBreakA = this.match.tieBreakA || '';
    this.match.tieBreakB = this.match.tieBreakB || '';
    
    this.element = this.createCardElement();
    this.setupDragAndDrop();
    this.updateScoreInputsInteractivity();
    this.updateWinStatus();
    this.updateEndTimeDisplay();
    this.addDoubleClickToHistoryListener();
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
    
    // 試合形式選択ドロップダウンを追加
    const gameFormatSelect = document.createElement('select');
    gameFormatSelect.className = 'match-card-game-format'; // 新しいクラス名

    const optionLeague = document.createElement('option');
    optionLeague.value = 'league';
    optionLeague.textContent = 'リーグ';
    gameFormatSelect.appendChild(optionLeague);
    
    const optionPlayoff = document.createElement('option');
    optionPlayoff.value = 'playoff'; // 代表決定戦の内部的な値
    optionPlayoff.textContent = '代表決定戦';
    gameFormatSelect.appendChild(optionPlayoff);
    
    // 保存された値かデフォルト値を設定
    gameFormatSelect.value = this.match.gameFormat;
    
    // 変更時のイベントリスナーを追加
    gameFormatSelect.addEventListener('change', (e) => {
      this.match.gameFormat = e.target.value;
      this.updateMatchData({ gameFormat: this.match.gameFormat });
      // UIの動的更新処理を呼び出す
      this.updateDynamicElements();
    });
    
    headerDiv.appendChild(gameFormatSelect);

    /* // 試合形式ドロップダウン関連のコードを削除
    const optionPlayoff = document.createElement('option');
    optionPlayoff.value = 'playoff'; // 代表決定戦の内部的な値
    optionPlayoff.textContent = '代表決定戦';
    gameFormatSelect.appendChild(optionPlayoff);

    gameFormatSelect.value = this.match.gameFormat; // 保存された値かデフォルト値を設定

    gameFormatSelect.addEventListener('change', (e) => {
      this.match.gameFormat = e.target.value;
      this.updateMatchData({ gameFormat: this.match.gameFormat, memo: '' }); // メモ欄はなくなったので空にするか、別途管理
      // UIの動的更新処理を呼び出す (後で実装)
      this.updateDynamicElements(); 
    });
    */
    // headerDiv.appendChild(gameFormatSelect); // 試合形式ドロップダウンを削除

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
    playerADiv.appendChild(playerAInput);
    
    // スコア入力A
    const scoreAInput = document.createElement('input');
    scoreAInput.type = 'number';
    scoreAInput.min = '0';
    scoreAInput.max = '99';
    scoreAInput.className = 'score-input';
    scoreAInput.dataset.player = 'A'; // Add data-player attribute
    scoreAInput.value = this.match.scoreA || 0;
    scoreAInput.addEventListener('change', (e) => {
      this.match.scoreA = parseInt(e.target.value) || 0;
      if (this.match.gameFormat === 'playoff' && e.target.value !== '') {
        if (this.match.scoreA === 5) {
          this.match.scoreB = 7;
        } else {
          this.match.scoreB = 6;
        }
        scoreBInput.value = this.match.scoreB;
      }
      this.updateMatchData({ scoreA: this.match.scoreA, scoreB: this.match.scoreB });
      this.updateDynamicElements();
      this.checkLeagueWinCondition();
    });
    scoreAInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    playerADiv.appendChild(scoreAInput);
    
    // Win表示（プレイヤーA）
    const winADiv = document.createElement('div');
    winADiv.className = 'win-label';
    if (this.shouldShowWin('A')) {
      winADiv.textContent = 'Win';
      winADiv.style.color = 'red';
    }
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
    const scoreBInput = document.createElement('input');
    scoreBInput.type = 'number';
    scoreBInput.min = '0';
    scoreBInput.max = '99';
    scoreBInput.className = 'score-input';
    scoreBInput.dataset.player = 'B'; // Add data-player attribute
    scoreBInput.value = this.match.scoreB || 0;
    scoreBInput.addEventListener('change', (e) => {
      this.match.scoreB = parseInt(e.target.value) || 0;
      if (this.match.gameFormat === 'playoff' && e.target.value !== '') {
        if (this.match.scoreB === 5) {
          this.match.scoreA = 7;
        } else {
          this.match.scoreA = 6;
        }
        scoreAInput.value = this.match.scoreA;
      }
      this.updateMatchData({ scoreA: this.match.scoreA, scoreB: this.match.scoreB });
      this.updateDynamicElements();
      this.checkLeagueWinCondition();
    });
    scoreBInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    playerBDiv.appendChild(scoreBInput);
    
    // Win表示（プレイヤーB）
    const winBDiv = document.createElement('div');
    winBDiv.className = 'win-label';
    if (this.shouldShowWin('B')) {
      winBDiv.textContent = 'Win';
      winBDiv.style.color = 'red';
    }
    playerBDiv.appendChild(winBDiv);
    
    playersContainer.appendChild(playerADiv);
    playersContainer.appendChild(playerBDiv);

  card.appendChild(headerDiv);
  card.appendChild(playersContainer);

  // タイブレークスコア入力フィールド（代表決定戦 7-6 or 6-7 の場合のみ表示）
  this.tieBreakScoreInput = document.createElement('input');
  this.tieBreakScoreInput.type = 'number';
  this.tieBreakScoreInput.min = '0';
  this.tieBreakScoreInput.className = 'tiebreak-score-input'; // CSSでスタイル調整が必要
  this.tieBreakScoreInput.placeholder = 'TB';
  this.tieBreakScoreInput.value = this.match.tieBreakScore === undefined ? '' : this.match.tieBreakScore;
  this.tieBreakScoreInput.style.display = 'none'; // 初期非表示
  this.tieBreakScoreInput.addEventListener('change', (e) => {
    const value = e.target.value;
    this.updateMatchData({ tieBreakScore: value === '' ? '' : parseInt(value) }); 
    // updateWinStatus と checkLeagueWinCondition は updateMatchData から呼ばれる
  });
  this.tieBreakScoreInput.addEventListener('click', (e) => e.stopPropagation());
  card.appendChild(this.tieBreakScoreInput);

  return card;
} // End of createCardElement

updateScoreInputsInteractivity() {
    const scoreA = parseInt(this.match.scoreA) || 0;
    const scoreB = parseInt(this.match.scoreB) || 0;

    if (this.tieBreakScoreInput) { 
      if (this.match.gameFormat === 'playoff' &&
          ((scoreA === 7 && scoreB === 6) || (scoreA === 6 && scoreB === 7))) {
        this.tieBreakScoreInput.style.display = 'inline-block';
      } else {
        this.tieBreakScoreInput.style.display = 'none';
        if (this.match.tieBreakScore !== undefined && this.match.tieBreakScore !== '') {
          // UIから消えたときにデータもクリアする場合
          // this.updateMatchData({ tieBreakScore: '' }); 
        }
      }
    }
    // 他にスコア入力のインタラクティビティに関するロジックがあればここに追加
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
  const winADiv = this.element.querySelector('.match-card-player:first-child .win-label');
  const winBDiv = this.element.querySelector('.match-card-player:last-child .win-label');
  if (!winADiv || !winBDiv) return;

  const showWinA = this.shouldShowWin('A');
  const showWinB = this.shouldShowWin('B');

  winADiv.textContent = showWinA ? 'Win' : '';
  winADiv.style.color = showWinA ? 'red' : '';
  winBDiv.textContent = showWinB ? 'Win' : '';
  winBDiv.style.color = showWinB ? 'red' : '';
}

shouldShowWin(player) {
  const scoreA = parseInt(this.match.scoreA) || 0;
  const scoreB = parseInt(this.match.scoreB) || 0;
  const tieBreakScoreValue = this.match.tieBreakScore;
  const tieBreakPlayed = tieBreakScoreValue !== undefined && tieBreakScoreValue !== '' && !isNaN(parseInt(tieBreakScoreValue));

  if (this.match.gameFormat === 'league') {
    if ((scoreA + scoreB) >= 5) {
      if (player === 'A' && scoreA > scoreB) return true;
      if (player === 'B' && scoreB > scoreA) return true;
    }
  } else if (this.match.gameFormat === 'playoff') {
    if (scoreA === 7 && scoreB === 6 && tieBreakPlayed) {
      return player === 'A'; 
    }
    if (scoreA === 6 && scoreB === 7 && tieBreakPlayed) {
      return player === 'B';
    }
    if (!((scoreA === 7 && scoreB === 6) || (scoreA === 6 && scoreB === 7))) { // Not a tie-break situation
      if (player === 'A') {
        if (scoreA === 6 && scoreB < 5) return true; 
        if (scoreA === 7 && scoreB === 5) return true; 
      }
      if (player === 'B') {
        if (scoreB === 6 && scoreA < 5) return true; 
        if (scoreB === 7 && scoreA === 5) return true; 
      }
    }
  }
  return false;
}

async checkLeagueWinCondition() { // Renamed in thought process, but keeping for now
  if (this.match.gameFormat === 'league') {
    const scoreA = parseInt(this.match.scoreA) || 0;
    const scoreB = parseInt(this.match.scoreB) || 0;
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
    const confirmed = await window.electronAPI.showConfirmDialog('この対戦カードを本当に削除してもよろしいですか？');
    if (confirmed) {
      try {
        console.log(`Simulating delete for match ID: ${this.match.id}. DB call commented out.`);
        if (this.element) {
          this.element.remove();
        }
        const event = new CustomEvent('match-deleted', { detail: { matchId: this.match.id } });
        document.dispatchEvent(event);
        console.log(`Match ${this.match.id} visual element removed and event dispatched.`);
      } catch (error) {
        console.error('Error during match deletion process:', error);
        alert('試合の削除中にエラーが発生しました。');
      }
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

    this.updateScoreInputsInteractivity();
    this.updateWinStatus();
    this.updateEndTimeDisplay();
    // checkLeagueWinCondition is called from updateMatchData if scores change, 
    // or directly if gameFormat changes. If only names/memo change, it's not strictly needed here
    // but calling it ensures consistency if other logic depends on it.
    this.checkLeagueWinCondition(); 
}

addDoubleClickToHistoryListener() {
    if (this.element) {
      this.element.addEventListener('dblclick', async () => {
        try {
          console.log(`[MATCH_CARD] Double-clicked match ID: ${this.match.id}`);
          
          // 確認ダイアログを表示
          const confirmed = await window.electronAPI.showConfirmDialog('この試合を履歴に移動しますか？');
          
          // キャンセルされた場合は処理を中止
          if (!confirmed) {
            console.log(`[MATCH_CARD] Moving match ID: ${this.match.id} to history was cancelled by user.`);
            return;
          }
          
          // 試合ステータスを更新
          const updatedMatchData = {
            id: this.match.id,
            status: 'Completed',
            actualEndTime: new Date().toISOString(),
            // courtNumber と rowPosition は変更しないか、履歴用の特別な値に設定
            // ここでは変更しないでおく。board.js側で履歴エリアへの移動時に処理される想定
          };

          await db.updateMatch(updatedMatchData);
          console.log(`[MATCH_CARD] Match ID: ${this.match.id} status updated to Completed in DB.`);

          // ボードに試合更新を通知するイベントを発行
          const event = new CustomEvent('match-updated', {
            detail: { match: { ...this.match, ...updatedMatchData } }
          });
          document.dispatchEvent(event);
          console.log(`[MATCH_CARD] Dispatched match-updated event for match ID: ${this.match.id}`);

        } catch (error) {
          console.error('Error moving match to history on double-click:', error);
          alert('試合の履歴への移動に失敗しました。');
        } // try-catch
      }); // event listener
    } // if (this.element)
  } // addDoubleClickToHistoryListener method
} // MatchCard CLASS END
