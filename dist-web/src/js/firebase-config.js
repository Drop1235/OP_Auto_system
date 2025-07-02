// Firebase configuration placeholder
// 1. Create a Firebase project → Webアプリ追加 → 以下の値を埋める
// 2. セキュリティ: Firestore ルールを適切に設定してください

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase only once
if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore and Auth
window.firestore = firebase.firestore();
window.firebaseAuth = firebase.auth();
