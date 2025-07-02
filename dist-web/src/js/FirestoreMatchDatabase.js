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
    await this.collection.add(match);
  }

  // Firestoreの試合データを更新
  async updateMatch(match) {
    if (!match.id) return;
    await this.collection.doc(match.id).set(match);
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

  // Firestoreの購読解除
  unsubscribeDatabase() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

// グローバルに公開
window.FirestoreMatchDatabase = FirestoreMatchDatabase;