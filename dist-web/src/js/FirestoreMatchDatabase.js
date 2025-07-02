console.log('FirestoreMatchDatabase.js loaded');

/**
 * 再帰的に undefined を除外するユーティリティ。
 * Firestore はネストしたフィールドにおいても undefined を許容しないため、
 * 送信前に完全に除去する必要がある。
 */
function removeUndefinedDeep(value) {
  if (Array.isArray(value)) {
    return value.map(v => removeUndefinedDeep(v)).filter(v => v !== undefined);
  }
  if (value !== null && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([k, v]) => {
      const cleaned = removeUndefinedDeep(v);
      if (cleaned !== undefined) result[k] = cleaned;
    });
    return result;
  }
  return value !== undefined ? value : undefined;
}
// Firestoreと連携する大会データベース
class FirestoreMatchDatabase {
  constructor() {
    this.collection = window.firestore.collection("matches");
    this.matches = [];
    this.unsubscribe = null;
  }

  // Firestoreからリアルタイムでデータを取得
  async initDatabase() {
    this.unsubscribe = this.collection.onSnapshot(snapshot => {
      this.matches = [];
      snapshot.forEach(doc => {
        this.matches.push({ id: doc.id, ...doc.data() });
      });
      // 必要なら画面を再描画する関数をここで呼ぶ
      if (window.onMatchesUpdated) window.onMatchesUpdated(this.matches);
    });
  }

  // Firestoreに新しい試合を追加
  async addMatch(match) {
    try {
      const safeMatch = { ...match };
      // Ensure critical date fields are never undefined
      if (safeMatch.actualStartTime === undefined) safeMatch.actualStartTime = null;
      if (safeMatch.actualEndTime === undefined) safeMatch.actualEndTime = null;

      // Deep clean to convert any nested undefined → null and strip remaining undefined
      const cleaned = this._deepCleanObject ? this._deepCleanObject(safeMatch) : removeUndefinedDeep(safeMatch);
      const finalPayload = removeUndefinedDeep({ ...cleaned });
      if (finalPayload.actualStartTime === undefined) finalPayload.actualStartTime = null;
      if (finalPayload.actualEndTime === undefined) finalPayload.actualEndTime = null;

      console.log('[Firestore] addMatch payload:', finalPayload);
      const docRef = await this.collection.add(finalPayload);
      console.log(`[Firestore] Successfully added match ${docRef.id}`);
      return { id: docRef.id, ...finalPayload };
    } catch (error) {
      console.error('[Firestore] Error in addMatch:', error);
      throw error;
    }
  }


  // Helper: deeply clean an object converting undefined → null while preserving structure.
  _deepCleanObject(obj) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this._deepCleanObject(item));
    }
    const cleaned = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) {
        cleaned[k] = null;
        continue;
      }
      cleaned[k] = this._deepCleanObject(v);
    }
    return cleaned;
  }

  // Firestoreの試合データを更新
  async updateMatch(match) {
    try {
      if (!match || !match.id) {
        throw new Error('Invalid match data or missing ID');
      }

      console.log('[Firestore] Starting updateMatch for match:', match.id);

      // Fetch current data to merge safely
      let currentMatch = null;
      try {
        const doc = await this.collection.doc(match.id).get();
        if (doc.exists) {
          currentMatch = doc.data();
          console.log(`[Firestore] Found existing match data for ID: ${match.id}`);
        }
      } catch (err) {
        console.warn(`[Firestore] Could not fetch current match data: ${err.message}`);
      }

      const now = new Date().toISOString();
      const updatePayload = {
        ...currentMatch,
        ...match,
        updatedAt: now,
        actualStartTime: match.actualStartTime !== undefined ? match.actualStartTime : (currentMatch?.actualStartTime ?? null),
        actualEndTime: match.actualEndTime !== undefined ? match.actualEndTime : (currentMatch?.actualEndTime ?? null)
      };

      if (updatePayload.actualStartTime === undefined) updatePayload.actualStartTime = null;
      if (updatePayload.actualEndTime === undefined) updatePayload.actualEndTime = null;

      const sanitized = this._deepCleanObject ? this._deepCleanObject(updatePayload) : removeUndefinedDeep(updatePayload);
      const finalPayload = removeUndefinedDeep({ ...sanitized });
      if (finalPayload.actualStartTime === undefined) finalPayload.actualStartTime = null;
      if (finalPayload.actualEndTime === undefined) finalPayload.actualEndTime = null;

      console.log('[Firestore] Final payload before set:', finalPayload);

      // Use set with merge to avoid overwriting untouched fields
      await this.collection.doc(match.id).set(finalPayload, { merge: true });
      console.log(`[Firestore] Successfully updated match ${match.id}`);
      return { ...updatePayload };
    } catch (error) {
      console.error(`[Firestore] Error updating match ${match?.id || 'unknown'}:`, error);
      throw error;
    }
  }

  // すべての試合を削除（バッチ処理）
  async deleteAllMatches() {
    try {
      console.log('[Firestore] deleteAllMatches: fetching documents...');
      const snapshot = await this.collection.get();
      if (snapshot.empty) {
        console.log('[Firestore] No matches to delete');
        return true;
      }
      // Firestore free tierは一度に500件まで書き込み可能
      const BATCH_LIMIT = 400;
      let batch = window.firestore.batch();
      let opCount = 0;
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        opCount++;
        // バッチ上限が近づいたらコミットして新しいバッチを開始
        if (opCount >= BATCH_LIMIT) {
          await batch.commit();
          console.log(`[Firestore] Committed ${opCount} deletes`);
          batch = window.firestore.batch();
          opCount = 0;
        }
      }
      // 残りをコミット
      if (opCount > 0) {
        await batch.commit();
        console.log(`[Firestore] Committed remaining ${opCount} deletes`);
      }
      console.log('[Firestore] All matches deleted successfully');
      return true;
    } catch (error) {
      console.error('[Firestore] Error deleting all matches:', error);
      throw error;
    }
  }

  // Firestoreから試合を削除
  async deleteMatch(id) {
    await this.collection.doc(id).delete();
  }

  // Firestoreから全試合を取得
  async getAllMatches() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // 完了した試合のみ取得（History 画面で使用）
  async getCompletedMatches() {
    const snapshot = await this.collection
      .where('winner', '!=', null)
      .get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(match => match.actualEndTime);
  }

  // Firestoreの購読解除
  unsubscribeDatabase() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

// グローバルに公開
window.FirestoreMatchDatabase = FirestoreMatchDatabase;