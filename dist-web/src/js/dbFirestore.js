// Firestore-backed implementation matching TennisMatchDatabase interface

/**
 * Recursively remove properties whose value is `undefined` from an object or array.
 * Firestore does not accept `undefined` in any nested field, so we sanitise the
 * payload deeply before calling `set`/`update`.
 *
 * @param {any} value The value to clean.
 * @returns {any} The cleaned value with all `undefined` removed. Arrays keep
 *          ordering but filter out `undefined` items.
 */
function removeUndefinedDeep(value) {
  if (Array.isArray(value)) {
    // Clean each item and remove undefined elements
    return value
      .map(v => removeUndefinedDeep(v))
      .filter(v => v !== undefined);
  }
  if (value !== null && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([k, v]) => {
      const cleaned = removeUndefinedDeep(v);
      if (cleaned !== undefined) {
        result[k] = cleaned;
      }
    });
    return result;
  }
  // Primitive value: keep it unless it is undefined
  return value !== undefined ? value : undefined;
}

class FirestoreMatchDatabase {
  constructor() {
    this.matches = [];
    this.nextId = 1;
    this.tournamentId = null;
    this.unsubscribe = null;
  }

  async initDatabase() {
    // Wait for Firebase init
    if (!window.firestore) throw new Error('Firestore not initialised');
    // Ensure tournament id exists
    this.tournamentId = localStorage.getItem('currentTournamentId') || 'default';
    this._collection = window.firestore.collection('tournaments').doc(this.tournamentId).collection('matches');

    // Listen for realtime updates
    this.unsubscribe = this._collection.onSnapshot(snapshot => {
      this.matches = snapshot.docs.map(d => d.data());
      // Keep nextId in sync
      if (this.matches.length) {
        const max = Math.max(...this.matches.map(m => m.id));
        this.nextId = max + 1;
      }
    });
    return true;
  }

  _doc(id) {
    return this._collection.doc(id.toString());
  }

  async addMatch(match) {
    try {
      // 新しいIDを生成（既存のIDがある場合はそれを使用）
      const id = match.id || this.nextId++;
      
      // 必須フィールドを明示的に初期化
      const now = new Date().toISOString();
      const newMatch = {
        id,
        playerA: match.playerA || null,
        playerB: match.playerB || null,
        playerC: match.playerC || null,
        playerD: match.playerD || null,
        teamA: match.teamA || null,
        teamB: match.teamB || null,
        courtNumber: match.courtNumber || null,
        rowPosition: match.rowPosition || null,
        status: match.status || 'Unassigned',
        gameFormat: match.gameFormat || '8game',
        winner: match.winner || null,
        scores: match.scores || {},
        setScores: match.setScores || {},
        tieBreakScore: match.tieBreakScore || {},
        actualStartTime: match.actualStartTime || null,  // 明示的に初期化
        actualEndTime: match.actualEndTime || null,      // 明示的に初期化
        scheduledStartTime: match.scheduledStartTime || null,
        scheduledEndTime: match.scheduledEndTime || null,
        createdAt: match.createdAt || now,
        updatedAt: now,
        isCompleted: match.isCompleted || false,
        isWalkover: match.isWalkover || false,
        isRetired: match.isRetired || false,
        notes: match.notes || '',
        players: Array.isArray(match.players) ? [...match.players] : []
      };
      
      // デバッグ用にペイロードをログ出力
      console.log('[Firestore] addMatch payload:', {
        ...newMatch,
        scores: newMatch.scores ? '{...}' : null,
        setScores: newMatch.setScores ? '{...}' : null,
        tieBreakScore: newMatch.tieBreakScore ? '{...}' : null
      });
      
      // Firestoreに保存
      await this._doc(id).set(newMatch);
      console.log(`[Firestore] Successfully added match ${id}`);
      return { ...newMatch };
    } catch (error) {
      console.error('[Firestore] Error in addMatch:', error);
      throw error; // エラーを再スローして呼び出し元で処理できるようにする
    }
  }

  // ヘルパー関数: オブジェクトからundefinedを完全に除去
  _deepCleanObject(obj) {
    // プリミティブ型、Date、nullの場合はそのまま返す
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
      return obj;
    }
    
    // 配列の場合は各要素を再帰的にクリーニング
    if (Array.isArray(obj)) {
      return obj.map(item => this._deepCleanObject(item));
    }
    
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // undefinedの場合はnullに変換（Firestoreはundefinedを許可しない）
      if (value === undefined) {
        cleaned[key] = null;
        console.log(`[Firestore] Converting undefined value to null for key '${key}'`);
        continue;
      }
      
      // オブジェクトの場合は再帰的にクリーニング
      if (value !== null && typeof value === 'object') {
        cleaned[key] = this._deepCleanObject(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    // 重要なフィールドが欠けている場合はデフォルト値を設定
    if (obj.id && !cleaned.id) {
      cleaned.id = obj.id;
    }
    
    // 日付フィールドの最終チェック
    if (obj.actualStartTime !== undefined && cleaned.actualStartTime === undefined) {
      cleaned.actualStartTime = obj.actualStartTime || null;
    }
    
    if (obj.actualEndTime !== undefined && cleaned.actualEndTime === undefined) {
      cleaned.actualEndTime = obj.actualEndTime || null;
    }
    
    console.log('[Firestore] Cleaned object:', JSON.stringify(cleaned));
    return cleaned;
  }

  // マッチデータをFirestore用に正規化
  _normalizeMatchData(match) {
    if (!match) {
      throw new Error('Match data is required');
    }
    
    // 安全なコピーを作成（null/undefinedチェック付き）
    const normalized = match ? { ...match } : {};
    
    // 重要なフィールドのデフォルト値を設定
    const requiredFields = {
      actualStartTime: null,
      actualEndTime: null,
      status: 'Unassigned',
      courtNumber: 0,
      rowPosition: 'unassigned'
    };
    
    // 必須フィールドを設定（undefinedまたはnullの場合はデフォルト値を使用）
    Object.entries(requiredFields).forEach(([key, defaultValue]) => {
      if (normalized[key] === undefined || normalized[key] === null) {
        normalized[key] = defaultValue;
      }
    });
    
    // 日付フィールドの最終チェック
    if (normalized.actualStartTime === undefined || normalized.actualStartTime === null) {
      normalized.actualStartTime = null;
    }
    
    if (normalized.actualEndTime === undefined || normalized.actualEndTime === null) {
      normalized.actualEndTime = null;
    }
    
    return normalized;
  }

  async updateMatch(match) {
    try {
      if (!match || !match.id) {
        throw new Error('Invalid match data or missing ID');
      }
      
      console.log('[Firestore] Starting updateMatch for match:', match.id);
      
      // 現在のマッチデータを取得（存在する場合）
      let currentMatch = null;
      try {
        const doc = await this._doc(match.id).get();
        if (doc.exists) {
          currentMatch = doc.data();
          console.log(`[Firestore] Found existing match data for ID: ${match.id}`);
        } else {
          console.log(`[Firestore] No existing match found for ID: ${match.id}, creating new`);
        }
      } catch (error) {
        console.warn(`[Firestore] Could not fetch current match data: ${error.message}`);
      }
      
      // 更新用のペイロードを作成（現在のデータとマージ）
      const now = new Date().toISOString();
      const updatePayload = {
        // 現在のデータをベースに更新
        ...currentMatch,
        // 新しいデータで上書き
        ...match,
        // 重要なフィールドを明示的に設定
        updatedAt: now,
        // 日付フィールドがundefinedの場合はnullを設定
        actualStartTime: match.actualStartTime !== undefined ? match.actualStartTime : 
                        (currentMatch?.actualStartTime !== undefined ? currentMatch.actualStartTime : null),
        actualEndTime: match.actualEndTime !== undefined ? match.actualEndTime : 
                      (currentMatch?.actualEndTime !== undefined ? currentMatch.actualEndTime : null)
      };
      
      // 必須フィールドの最終チェック
      if (updatePayload.actualStartTime === undefined) updatePayload.actualStartTime = null;
      if (updatePayload.actualEndTime === undefined) updatePayload.actualEndTime = null;
      
      // デバッグ用にペイロードをログ出力（大きなオブジェクトは省略）
      const logPayload = {
        ...updatePayload,
        scores: updatePayload.scores ? '{...}' : null,
        setScores: updatePayload.setScores ? '{...}' : null,
        tieBreakScore: updatePayload.tieBreakScore ? '{...}' : null,
        players: Array.isArray(updatePayload.players) ? `[Array(${updatePayload.players.length})]` : null
      };
      
      console.log('[Firestore] updateMatch payload:', logPayload);
      
      // Firestoreに保存する前に深いクリーニングを実施
      const sanitizedPayload = this._deepCleanObject(updatePayload);
      
      // 再度 critical fields をチェック（万全を期す）
      if (sanitizedPayload.actualStartTime === undefined) sanitizedPayload.actualStartTime = null;
      if (sanitizedPayload.actualEndTime === undefined) sanitizedPayload.actualEndTime = null;
      
      console.log('[Firestore] Sanitized payload:', {
        ...sanitizedPayload,
        scores: sanitizedPayload.scores ? '{...}' : null,
        setScores: sanitizedPayload.setScores ? '{...}' : null
      });
      
      // 最終的に removeUndefinedDeep を使用して undefined を完全除去
      const finalPayload = removeUndefinedDeep({ ...sanitizedPayload });
      if (finalPayload.actualStartTime === undefined) finalPayload.actualStartTime = null;
      if (finalPayload.actualEndTime === undefined) finalPayload.actualEndTime = null;
      console.log('[Firestore] Final payload before set:', {
        ...finalPayload,
        scores: finalPayload.scores ? '{...}' : null,
        setScores: finalPayload.setScores ? '{...}' : null
      });
      
      // Firestoreに保存（merge: true で既存データを保持）
      await this._doc(match.id).set(finalPayload, { merge: true });
      console.log(`[Firestore] Successfully updated match ${match.id}`);
      
      return { ...updatePayload };
      
    } catch (error) {
      console.error(`[Firestore] Error updating match ${match?.id || 'unknown'}:`, error);
      throw error; // エラーを再スローして呼び出し元で処理できるようにする
    }
  }

  async getAllMatches() {
    return [...this.matches];
  }

  getMatch(id) {
    return this.matches.find(m => m.id === id);
  }

  async getMatchesByStatus(status) {
    return this.matches.filter(m => m.status === status);
  }

  async getMatchesByCourt(court) {
    return this.matches.filter(m => m.courtNumber === court);
  }

  async getCompletedMatches() {
    return this.matches.filter(m => m.winner);
  }

  async clearCompletedMatches() {
    const batch = window.firestore.batch();
    this.matches.filter(m => m.winner).forEach(m => batch.delete(this._doc(m.id)));
    await batch.commit();
    return true;
  }

  async deleteMatch(id) {
    await this._doc(id).delete();
    return true;
  }

  async deleteAllMatches() {
    const batch = window.firestore.batch();
    this.matches.forEach(m => batch.delete(this._doc(m.id)));
    await batch.commit();
    return true;
  }
}

window.FirestoreMatchDatabase = FirestoreMatchDatabase;
