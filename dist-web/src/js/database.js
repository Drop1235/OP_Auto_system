// Database implementation using localStorage for offline storage
class TennisMatchDatabase {
  constructor() {
    this.tournamentId = localStorage.getItem('currentTournamentId') || 'default';
    this.storageKey = 'tennisTournamentMatches_' + this.tournamentId;
    this.matches = [];
    this.nextId = 1;
    this.db = {}; // Compatibility placeholder
    this.initDatabase();
  }

  // Initialize the database
  async initDatabase() {
    try {
      // データベースがすでに初期化されているか確認
      if (this.db === true) {
        console.log('Database already initialized');
        return true;
      }
      
      console.log('Initializing database...');
      
      // Load existing matches from localStorage
      // 大会IDが途中で変わる場合に備えて毎回取得
      this.tournamentId = localStorage.getItem('currentTournamentId') || 'default';
      this.storageKey = 'tennisTournamentMatches_' + this.tournamentId;
      const storedData = localStorage.getItem(this.storageKey);
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          this.matches = parsedData.matches || [];
          this.nextId = parsedData.nextId || 1;
          console.log(`Loaded ${this.matches.length} matches from localStorage`);
        } catch (parseError) {
          console.error('Error parsing stored data:', parseError);
          // 保存データが壊れている場合は初期化
          this.matches = [];
          this.nextId = 1;
          localStorage.removeItem(this.storageKey);
        }
      } else {
        console.log('No stored data found, starting with empty database');
        this.matches = [];
        this.nextId = 1;
      }
      
      // Find the highest ID to ensure new IDs are unique
      if (this.matches.length > 0) {
        const maxId = Math.max(...this.matches.map(match => match.id));
        this.nextId = maxId + 1;
        console.log(`Set next ID to ${this.nextId}`);
      }
      
      console.log('Database initialized successfully');
      this.db = true; // Set db to true for compatibility checks
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      // エラーが発生してもアプリが起動できるようにする
      this.matches = [];
      this.nextId = 1;
      this.db = true; // Still set to true to allow app to function
      return true;
    }
  }

  // Save current state to localStorage
  _saveToStorage() {
    try {
      const dataToStore = {
        matches: this.matches,
        nextId: this.nextId
      };
      // 保存先キーを大会ごとに分離
      this.tournamentId = localStorage.getItem('currentTournamentId') || 'default';
      this.storageKey = 'tennisTournamentMatches_' + this.tournamentId;
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  // Add a new match
  async addMatch(match) {
    try {
      // 既存のIDがある場合はそれを使用、ない場合は新しいIDを生成
      const matchId = match.id || this.nextId++;
      
      // IDが既に存在する場合は、nextIdを更新
      if (match.id && match.id >= this.nextId) {
        this.nextId = match.id + 1;
      }
      
      // Create a new match with default values
      const newMatch = {
        id: matchId,
        playerA: match.playerA,
        playerB: match.playerB,
        gameFormat: match.gameFormat || '5game', // 試合形式を追加
        scheduledStartTime: match.scheduledStartTime,
        actualStartTime: match.actualStartTime || null,
        actualEndTime: match.actualEndTime || null,
        status: match.status || 'Unassigned',
        courtNumber: match.courtNumber || null,
        rowPosition: match.rowPosition || null,
        scoreA: match.scoreA || '',
        scoreB: match.scoreB || '',
        setScores: match.setScores || { A: [], B: [] },
        tieBreakA: match.tieBreakA || '',
        tieBreakB: match.tieBreakB || '',
        winner: match.winner || null,
        memo: match.memo || '',
        tiebreakScore: match.tiebreakScore || null, // タイブレークスコア（負けた方のスコアのみ）
        createdAt: match.createdAt || new Date().toISOString()
      };
      
      console.log('[DATABASE] Adding new match with game format:', newMatch.gameFormat);
      
      // 既存のマッチに同じIDがないかチェック
      const existingIndex = this.matches.findIndex(m => m.id === matchId);
      if (existingIndex !== -1) {
        console.log('[DATABASE] Match with same ID already exists, updating instead');
        this.matches[existingIndex] = newMatch;
      } else {
        // Add to matches array
        this.matches.push(newMatch);
      }
      
      // Save to localStorage
      this._saveToStorage();
      
      return newMatch;
    } catch (error) {
      console.error('Error adding match:', error);
      throw new Error('Failed to add match');
    }
  }

  // Update an existing match
  async updateMatch(match) {
    try {
      // Find the match by ID
      const index = this.matches.findIndex(m => m.id === match.id);
      
      if (index === -1) {
        console.warn(`[DATABASE] Match with ID ${match.id} not found, attempting to add as new match`);
        // マッチが見つからない場合は新しいマッチとして追加
        const newMatch = await this.addMatch(match);
        return newMatch;
      }
      
      // Update match properties
      const existingMatch = this.matches[index];
      const updatedMatch = { ...existingMatch, ...match };
      
      // Replace in array
      this.matches[index] = updatedMatch;
      
      // Save to localStorage
      this._saveToStorage();
      
      return updatedMatch;
    } catch (error) {
      console.error('Error updating match:', error);
      // エラーが発生してもアプリケーションを停止させない
      console.warn('Continuing without database update for match:', match.id);
      return match; // 元のマッチデータを返す
    }
  }

  // Get all matches
  async getAllMatches() {
    return [...this.matches]; // Return a copy to prevent direct modification
  }

  // Get a specific match by ID
  getMatch(id) {
    return this.matches.find(match => match.id === id);
  }

  // Get matches by status
  async getMatchesByStatus(status) {
    return this.matches.filter(match => match.status === status);
  }

  // Get matches by court number
  async getMatchesByCourt(courtNumber) {
    return this.matches.filter(match => match.courtNumber === courtNumber);
  }

  // Get completed matches (for history view)
  async getCompletedMatches() {
    return this.matches.filter(match => 
      match.winner && 
      match.actualEndTime && 
      (match.status === 'Completed' || match.status === 'Finished')
    );
  }
  
  // Clear all completed matches from history
  async clearCompletedMatches() {
    try {
      // フィルタリングして完了した試合のみを削除
      this.matches = this.matches.filter(match => !match.winner);
      
      // ローカルストレージを更新
      this.saveToLocalStorage();
      
      console.log('Completed matches cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing completed matches:', error);
      return false;
    }
  }

  // Delete a match
  async deleteMatch(id) {
    try {
      // Find the match by ID
      const index = this.matches.findIndex(m => m.id === id);
      
      if (index === -1) {
        throw new Error('Match not found');
      }
      
      // Remove from array
      this.matches.splice(index, 1);
      
      // Save to localStorage
      this._saveToStorage();
      
      console.log('Match deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting match:', error);
      return false;
    }
  }

  // Delete all matches
  async deleteAllMatches() {
    try {
      // Clear all matches
      this.matches = [];
      
      // Save to localStorage
      this._saveToStorage();
      
      console.log('All matches deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting all matches:', error);
      return false;
    }
  }
}

// Choose backend: Firestore if firebase loaded, else localStorage
let db;
if (window.firebase && window.firestore && window.FirestoreMatchDatabase) {
  db = new window.FirestoreMatchDatabase();
  db.initDatabase();
  console.log('Using Firestore backend');
} else {
  db = new TennisMatchDatabase();
  console.log('Using localStorage backend');
}

// Export database instance

// グローバル変数としてdbを設定
window.db = db;
