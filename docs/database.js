// ==========================================
// database.js — Firebase Module (Stable + Chat Comments + Maintenance)
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

// ==============================
// FIREBASE CONFIG — MILIK CIKGU
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyAJ-eGCASGs7ZWoHtFgzcfcc2Y30jt_CWo",
  authDomain: "jadual-makmal-sksa.firebaseapp.com",
  databaseURL: "https://jadual-makmal-sksa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jadual-makmal-sksa",
  storageBucket: "jadual-makmal-sksa.firebasestorage.app",
  messagingSenderId: "660473497546",
  appId: "1:660473497546:web:97fc1bf2b25e6e6b583133"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==============================
// PATH DALAM Realtime Database
// ==============================
const PATHS = {
  schedule: "currentSchedule",
  archive: "archive",
  weekStart: "weekStart",
  weekLabel: "weekLabel",
  classOptions: "classOptions",
  subjectOptions: "subjectOptions",
  lastRolloverDate: "lastRolloverDate",
  weekComments: "weekComments",     // chat minggu semasa (array)
  maintenance: "maintenance"        // slot maintenance
};

// ==============================
// Helper: Baca root database
// ==============================
async function readRoot() {
  try {
    const rootRef = ref(db, "/");
    const snap = await get(rootRef);
    return snap.exists() ? snap.val() : {};
  } catch (err) {
    console.error("❌ Firebase readRoot error:", err);
    return {};
  }
}

// ==============================
// EXPORT: loadInitialData()
// ==============================
export async function loadInitialData() {
  const data = await readRoot();

  return {
    schedule: data[PATHS.schedule] || null,
    archive: data[PATHS.archive] || [],
    weekStart: data[PATHS.weekStart] || null,
    weekLabel: data[PATHS.weekLabel] || "",
    classOptions: data[PATHS.classOptions] || [],
    subjectOptions: data[PATHS.subjectOptions] || [],
    lastRolloverDate: data[PATHS.lastRolloverDate] || null,
    // Chat minggu semasa (array mesej)
    weekComments: data[PATHS.weekComments] || [],
    // Peta maintenance (hari -> period -> true/false)
    maintenance: data[PATHS.maintenance] || null
  };
}

// ==============================
// Simpan Jadual Mingguan
// ==============================
export async function saveScheduleToDB(scheduleObj) {
  try {
    await set(ref(db, PATHS.schedule), scheduleObj || {});
  } catch (err) {
    console.error("❌ Error simpan jadual:", err);
  }
}

// ==============================
// Simpan Arkib Mingguan
// ==============================
export async function saveArchiveToDB(archiveArray) {
  try {
    await set(ref(db, PATHS.archive), archiveArray || []);
  } catch (err) {
    console.error("❌ Error simpan arkib:", err);
  }
}

// ==============================
// Simpan Tarikh Mula Minggu
// ==============================
export async function saveWeekStartToDB(dateString) {
  try {
    await set(ref(db, PATHS.weekStart), dateString || null);
  } catch (err) {
    console.error("❌ Error simpan weekStart:", err);
  }
}

// ==============================
// Simpan Label Minggu
// ==============================
export async function saveWeekLabelToDB(label) {
  try {
    await set(ref(db, PATHS.weekLabel), label || "");
  } catch (err) {
    console.error("❌ Error simpan weekLabel:", err);
  }
}

// ==============================
// Simpan Pilihan Dropdown
// ==============================
export async function saveOptionsToDB(classOptions, subjectOptions) {
  try {
    await update(ref(db, "/"), {
      [PATHS.classOptions]: classOptions || [],
      [PATHS.subjectOptions]: subjectOptions || []
    });
  } catch (err) {
    console.error("❌ Error simpan options:", err);
  }
}

// ==============================
// Simpan Tarikh Auto-Rollover
// ==============================
export async function saveLastRolloverDateToDB(dateString) {
  try {
    await set(ref(db, PATHS.lastRolloverDate), dateString || null);
  } catch (err) {
    console.error("❌ Error simpan lastRolloverDate:", err);
  }
}

// ==============================
// Simpan CHAT minggu semasa
// weekComments = [{id, name, text, time}, ...]
// ==============================
export async function saveWeekCommentsToDB(commentsArray) {
  try {
    await set(ref(db, PATHS.weekComments), commentsArray || []);
  } catch (err) {
    console.error("❌ Error simpan weekComments:", err);
  }
}

// ==============================
// Simpan Peta Maintenance Slot
// ==============================
export async function saveMaintenanceToDB(maintenanceObj) {
  try {
    await set(ref(db, PATHS.maintenance), maintenanceObj || {});
  } catch (err) {
    console.error("❌ Error simpan maintenance:", err);
  }
}
