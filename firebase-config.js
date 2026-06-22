// firebase-config.js
// ─────────────────────────────────────────────────────────────
// STEP 1: Go to https://console.firebase.google.com
// STEP 2: Create a new project (free Spark plan is enough)
// STEP 3: Go to Project Settings > Your Apps > Add Web App
// STEP 4: Copy your firebaseConfig values below
// STEP 5: Go to Realtime Database > Create Database > Start in TEST mode
// ─────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyAcnzFI_y-lH0H7T4QIKphfECKwh_z-FEU",
  authDomain: "aj-game-systems.firebaseapp.com",
  databaseURL: "https://aj-game-systems-default-rtdb.firebaseio.com/",
  projectId: "aj-game-systems",
  storageBucket: "aj-game-systems.firebasestorage.app",
  messagingSenderId: "Y946027816654",
  appId: "1:946027816654:web:2575ec23496bc42256129f",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
