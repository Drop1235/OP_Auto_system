// Firestore-backed implementation matching TennisMatchDatabase interface

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
    const id = match.id || this.nextId++;
    const newMatch = { ...match, id };
    await this._doc(id).set(newMatch);
    return newMatch;
  }

  async updateMatch(match) {
    await this._doc(match.id).update(match);
    return match;
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
