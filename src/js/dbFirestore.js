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

  // Helper function: deeply clean an object, converting any `undefined` values
  // to `null` (Firestore does not allow undefined) while preserving structure.
  _deepCleanObject(obj) {
    // Primitive, Date, or null – return as-is
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
      return obj;
    }

    // Array – clean each element recursively
    if (Array.isArray(obj)) {
      return obj.map(item => this._deepCleanObject(item));
    }

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        cleaned[key] = null; // Firestore safe fallback
        console.log(`[Firestore] Converting undefined value to null for key '${key}'`);
        continue;
      }
      cleaned[key] = this._deepCleanObject(value);
    }

    // Ensure important fields always exist
    if (obj.id && cleaned.id === undefined) {
      cleaned.id = obj.id;
    }
    if (cleaned.actualStartTime === undefined) {
      cleaned.actualStartTime = null;
    }
    if (cleaned.actualEndTime === undefined) {
      cleaned.actualEndTime = null;
    }

    return cleaned;
  }

  async addMatch(match) {
    const id = match.id || this.nextId++;
    // actualStartTime / actualEndTime が undefined の場合は null を設定
    const safeMatch = { ...match };
    if (safeMatch.actualStartTime === undefined) {
      safeMatch.actualStartTime = null;
    }
    if (safeMatch.actualEndTime === undefined) {
      safeMatch.actualEndTime = null;
    }
    
    // 深い階層も含めて `undefined` を除外
    let cleaned = removeUndefinedDeep(safeMatch);
    // 念のためトップレベルで undefined を削除
    Object.keys(cleaned).forEach(k => {
      if (cleaned[k] === undefined) delete cleaned[k];
    });
    
    const newMatch = { ...cleaned, id };
    // 最終念押しで深い undefined 除去
    const finalPayload = removeUndefinedDeep(newMatch);
    console.log('[Firestore] addMatch payload:', JSON.stringify(finalPayload));
    await this._doc(id).set(finalPayload);
    return newMatch;
  }

  async updateMatch(match) {
    try {
      if (!match || !match.id) {
        throw new Error('Invalid match data or missing ID');
      }

      console.log('[Firestore] Starting updateMatch for match:', match.id);

      // Fetch current match data if it already exists so we can merge safely
      let currentMatch = null;
      try {
        const doc = await this._doc(match.id).get();
        if (doc.exists) {
          currentMatch = doc.data();
          console.log(`[Firestore] Found existing match data for ID: ${match.id}`);
        }
      } catch (err) {
        console.warn(`[Firestore] Could not fetch current match data: ${err.message}`);
      }

      const now = new Date().toISOString();

      // Merge incoming changes with existing data – incoming values take priority
      const updatePayload = {
        ...currentMatch,
        ...match,
        updatedAt: now,
        actualStartTime:
          match.actualStartTime !== undefined
            ? match.actualStartTime
            : currentMatch?.actualStartTime !== undefined
            ? currentMatch.actualStartTime
            : null,
        actualEndTime:
          match.actualEndTime !== undefined
            ? match.actualEndTime
            : currentMatch?.actualEndTime !== undefined
            ? currentMatch.actualEndTime
            : null
      };

      // Final safety – convert any lingering undefined to null
      if (updatePayload.actualStartTime === undefined) updatePayload.actualStartTime = null;
      if (updatePayload.actualEndTime === undefined) updatePayload.actualEndTime = null;

      // Deep clean, then strip any undefined that may remain
      const sanitized = this._deepCleanObject(updatePayload);
      const finalPayload = removeUndefinedDeep({ ...sanitized });

      if (finalPayload.actualStartTime === undefined) finalPayload.actualStartTime = null;
      if (finalPayload.actualEndTime === undefined) finalPayload.actualEndTime = null;

      console.log('[Firestore] Final payload before set:', {
        ...finalPayload,
        scores: finalPayload.scores ? '{...}' : null,
        setScores: finalPayload.setScores ? '{...}' : null
      });

      // Persist with merge so we never blow away untouched data
      await this._doc(match.id).set(finalPayload, { merge: true });
      console.log(`[Firestore] Successfully updated match ${match.id}`);

      return { ...updatePayload };
    } catch (error) {
      console.error(`[Firestore] Error updating match ${match?.id || 'unknown'}:`, error);
      throw error;
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
