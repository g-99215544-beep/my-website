// firebase-config.js
// Sambungan asas Firebase (App + Realtime Database)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJ-eGCASGs7ZWoHtFgzcfcc2Y30jt_CWo",
  authDomain: "jadual-makmal-sksa.firebaseapp.com",
  databaseURL: "https://jadual-makmal-sksa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jadual-makmal-sksa",
  storageBucket: "jadual-makmal-sksa.firebasestorage.app",
  messagingSenderId: "660473497546",
  appId: "1:660473497546:web:97fc1bf2b25e6e6b583133"
};

// Init app & db
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { app, db };
