// ローカルストレージを使用したデータ管理クラス
class LocalStorageManager {
  constructor() {
    this.storageKeys = {
      tournaments: 'tennis_tournaments',
      currentTournament: 'current_tournament',
      matches: 'tennis_matches',
      players: 'tennis_players'
    };
  }

  // 大会データの保存・取得
  async saveTournament(tournamentData) {
    try {
      const tournaments = this.getTournaments();
      const existingIndex = tournaments.findIndex(t => t.id === tournamentData.id);
      
      if (existingIndex >= 0) {
        tournaments[existingIndex] = tournamentData;
      } else {
        tournaments.push(tournamentData);
      }
      
      localStorage.setItem(this.storageKeys.tournaments, JSON.stringify(tournaments));
      return { success: true };
    } catch (error) {
      console.error('大会データの保存に失敗:', error);
      return { success: false, error: error.message };
    }
  }

  getTournaments() {
    try {
      const data = localStorage.getItem(this.storageKeys.tournaments);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('大会データの取得に失敗:', error);
      return [];
    }
  }

  async getTournament(tournamentId) {
    try {
      const tournaments = this.getTournaments();
      return tournaments.find(t => t.id === tournamentId) || null;
    } catch (error) {
      console.error('大会データの取得に失敗:', error);
      return null;
    }
  }

  async deleteTournament(tournamentId) {
    try {
      const tournaments = this.getTournaments();
      const filteredTournaments = tournaments.filter(t => t.id !== tournamentId);
      localStorage.setItem(this.storageKeys.tournaments, JSON.stringify(filteredTournaments));
      
      // 関連する試合データも削除
      this.deleteMatchesByTournament(tournamentId);
      
      return { success: true };
    } catch (error) {
      console.error('大会データの削除に失敗:', error);
      return { success: false, error: error.message };
    }
  }

  // 現在の大会の設定・取得
  setCurrentTournament(tournamentId) {
    localStorage.setItem(this.storageKeys.currentTournament, tournamentId);
  }

  getCurrentTournament() {
    return localStorage.getItem(this.storageKeys.currentTournament);
  }

  // 試合データの保存・取得
  async saveMatch(matchData) {
    try {
      const matches = this.getMatches();
      const existingIndex = matches.findIndex(m => m.id === matchData.id);
      
      if (existingIndex >= 0) {
        matches[existingIndex] = matchData;
      } else {
        matches.push(matchData);
      }
      
      localStorage.setItem(this.storageKeys.matches, JSON.stringify(matches));
      return { success: true };
    } catch (error) {
      console.error('試合データの保存に失敗:', error);
      return { success: false, error: error.message };
    }
  }

  getMatches(tournamentId = null) {
    try {
      const data = localStorage.getItem(this.storageKeys.matches);
      const matches = data ? JSON.parse(data) : [];
      
      if (tournamentId) {
        return matches.filter(m => m.tournamentId === tournamentId);
      }
      
      return matches;
    } catch (error) {
      console.error('試合データの取得に失敗:', error);
      return [];
    }
  }

  async getMatch(matchId) {
    try {
      const matches = this.getMatches();
      return matches.find(m => m.id === matchId) || null;
    } catch (error) {
      console.error('試合データの取得に失敗:', error);
      return null;
    }
  }

  async deleteMatch(matchId) {
    try {
      const matches = this.getMatches();
      const filteredMatches = matches.filter(m => m.id !== matchId);
      localStorage.setItem(this.storageKeys.matches, JSON.stringify(filteredMatches));
      return { success: true };
    } catch (error) {
      console.error('試合データの削除に失敗:', error);
      return { success: false, error: error.message };
    }
  }

  deleteMatchesByTournament(tournamentId) {
    try {
      const matches = this.getMatches();
      const filteredMatches = matches.filter(m => m.tournamentId !== tournamentId);
      localStorage.setItem(this.storageKeys.matches, JSON.stringify(filteredMatches));
      return { success: true };
    } catch (error) {
      console.error('大会の試合データ削除に失敗:', error);
      return { success: false, error: error.message };
    }
  }

  // プレイヤーデータの保存・取得
  async savePlayers(tournamentId, playersData) {
    try {
      const allPlayers = this.getAllPlayers();
      allPlayers[tournamentId] = playersData;
      localStorage.setItem(this.storageKeys.players, JSON.stringify(allPlayers));
      return { success: true };
    } catch (error) {
      console.error('プレイヤーデータの保存に失敗:', error);
      return { success: false, error: error.message };
    }
  }

  getPlayers(tournamentId) {
    try {
      const allPlayers = this.getAllPlayers();
      return allPlayers[tournamentId] || [];
    } catch (error) {
      console.error('プレイヤーデータの取得に失敗:', error);
      return [];
    }
  }

  getAllPlayers() {
    try {
      const data = localStorage.getItem(this.storageKeys.players);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('全プレイヤーデータの取得に失敗:', error);
      return {};
    }
  }

  // データのエクスポート・インポート（バックアップ用）
  async exportAllData() {
    try {
      console.log('[EXPORT] Starting data export...');
      
      // 実際のデータベースからデータを取得
      let matches = [];
      let tournaments = [];
      let players = {};
      let currentTournament = null;
      
      // window.dbが利用可能な場合は、そこからデータを取得
      if (window.db && typeof window.db.getAllMatches === 'function') {
        console.log('[EXPORT] Getting matches from window.db...');
        matches = await window.db.getAllMatches();
        console.log('[EXPORT] Found', matches.length, 'matches');
      } else {
        console.log('[EXPORT] window.db not available, using localStorage directly');
        // 直接ローカルストレージからデータを取得
        const currentTournamentId = localStorage.getItem('currentTournamentId') || 'default';
        const storageKey = 'tennisTournamentMatches_' + currentTournamentId;
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          matches = parsedData.matches || [];
        }
      }
      
      // 大会データを取得
      const tournamentData = localStorage.getItem('tournaments');
      if (tournamentData) {
        tournaments = JSON.parse(tournamentData);
      }
      
      // プレイヤーデータを取得
      const playerData = localStorage.getItem('players');
      if (playerData) {
        players = JSON.parse(playerData);
      }
      
      // 現在の大会を取得
      const currentTournamentId = localStorage.getItem('currentTournamentId');
      if (currentTournamentId && tournaments.length > 0) {
        currentTournament = tournaments.find(t => t.id === currentTournamentId) || null;
      }
      
      const data = {
        tournaments: tournaments,
        matches: matches,
        players: players,
        currentTournament: currentTournament,
        currentTournamentId: currentTournamentId,
        exportDate: new Date().toISOString()
      };
      
      console.log('[EXPORT] Export data prepared:', {
        tournaments: data.tournaments.length,
        matches: data.matches.length,
        players: Object.keys(data.players).length,
        currentTournament: data.currentTournament ? data.currentTournament.name : 'none'
      });
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `tennis-data-backup-${dateStr}-${timeStr}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`データを保存しました: ${filename}\n大会: ${data.tournaments.length}件\n試合: ${data.matches.length}件`);
      return jsonString;
    } catch (error) {
      console.error('データのエクスポートに失敗:', error);
      alert('データの保存に失敗しました: ' + error.message);
      return null;
    }
  }

  async importAllData(jsonData) {
    try {
      console.log('[IMPORT] Starting data import...');
      const data = JSON.parse(jsonData);
      
      console.log('[IMPORT] Import data contains:', {
        tournaments: data.tournaments ? data.tournaments.length : 0,
        matches: data.matches ? data.matches.length : 0,
        players: data.players ? Object.keys(data.players).length : 0,
        currentTournament: data.currentTournament ? data.currentTournament.name : 'none'
      });
      
      // 大会データを復元
      if (data.tournaments) {
        localStorage.setItem('tournaments', JSON.stringify(data.tournaments));
        console.log('[IMPORT] Tournaments restored:', data.tournaments.length);
      }
      
      // プレイヤーデータを復元
      if (data.players) {
        localStorage.setItem('players', JSON.stringify(data.players));
        console.log('[IMPORT] Players restored:', Object.keys(data.players).length);
      }
      
      // 現在の大会を復元
      if (data.currentTournamentId) {
        localStorage.setItem('currentTournamentId', data.currentTournamentId);
        console.log('[IMPORT] Current tournament ID restored:', data.currentTournamentId);
      }
      
      // 試合データを復元（database.jsの形式に合わせて）
      if (data.matches && data.matches.length > 0) {
        const currentTournamentId = data.currentTournamentId || 'default';
        const storageKey = 'tennisTournamentMatches_' + currentTournamentId;
        
        // 最大IDを計算
        const maxId = Math.max(...data.matches.map(match => match.id || 0));
        const nextId = maxId + 1;
        
        const matchData = {
          matches: data.matches,
          nextId: nextId
        };
        
        localStorage.setItem(storageKey, JSON.stringify(matchData));
        console.log('[IMPORT] Matches restored:', data.matches.length, 'to key:', storageKey);
      }
      
      alert(`データの読み込みが完了しました。\n大会: ${data.tournaments ? data.tournaments.length : 0}件\n試合: ${data.matches ? data.matches.length : 0}件\n\nページを再読み込みします。`);
      
      // 少し遅延してからリロード（アラートを読む時間を与える）
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      return { success: true };
    } catch (error) {
      console.error('データのインポートに失敗:', error);
      alert('データの読み込みに失敗しました: ' + error.message);
      return { success: false, error: error.message };
    }
  }

  // ストレージの使用量確認
  getStorageInfo() {
    try {
      let totalSize = 0;
      const tournaments = this.getTournaments();
      const matches = this.getMatches();
      
      Object.values(this.storageKeys).forEach(key => {
        const data = localStorage.getItem(key);
        const size = data ? new Blob([data]).size : 0;
        totalSize += size;
      });
      
      const sizeKB = Math.round(totalSize / 1024 * 100) / 100;
      const sizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;
      
      return {
        tournaments: tournaments.length,
        matches: matches.length,
        size: sizeMB > 1 ? `${sizeMB}MB` : `${sizeKB}KB`
      };
    } catch (error) {
      console.error('ストレージ情報の取得に失敗:', error);
      return {
        tournaments: 0,
        matches: 0,
        size: '0KB'
      };
    }
  }

  // データのクリア
  clearAllData() {
    try {
      Object.values(this.storageKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      return { success: true };
    } catch (error) {
      console.error('データのクリアに失敗:', error);
      return { success: false, error: error.message };
    }
  }
}

// グローバルインスタンスを作成
console.log('[LOCAL_STORAGE] Creating LocalStorageManager instance...');
window.localStorageManager = new LocalStorageManager();
console.log('[LOCAL_STORAGE] LocalStorageManager created successfully:', window.localStorageManager);

// Firebaseの代替として使用するためのエイリアス
window.dataManager = window.localStorageManager;
console.log('[LOCAL_STORAGE] LocalStorageManager initialization complete');

// メソッドの存在を確認
console.log('[LOCAL_STORAGE] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.localStorageManager)));
console.log('[LOCAL_STORAGE] exportAllData method exists:', typeof window.localStorageManager.exportAllData === 'function');
