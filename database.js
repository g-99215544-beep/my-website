// database.js
// Modul untuk urus Firebase Realtime Database

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

// Konfigurasi dari cikgu
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

// Lokasi data dalam Realtime Database
// Struktur di root:
// currentSchedule: {...}
// archive: [...]
//
// weekStart: "YYYY-MM-DD"
// weekLabel: "M32" / "Minggu 2" / dll
// classOptions: ["", "1B", ...]
// subjectOptions: ["", "SJ", ...]
// lastRolloverDate: "YYYY-MM-DD"
const PATHS = {
  schedule: "currentSchedule",
  archive: "archive",
  weekStart: "weekStart",
  weekLabel: "weekLabel",
  classOptions: "classOptions",
  subjectOptions: "subjectOptions",
  lastRolloverDate: "lastRolloverDate"
};

// Helper: baca root data sekaligus
async function readRoot() {
  const rootRef = ref(db, "/");
  const snap = await get(rootRef);
  if (snap.exists()) {
    return snap.val();
  }
  return {};
}

// === EXPORT FUNCTIONS ===

/**
 * loadInitialData()
 * Dipanggil sekali masa init() dalam index.html
 * Return:
 * {
 *   schedule,
 *   archive,
 *   weekStart,
 *   weekLabel,
 *   classOptions,
 *   subjectOptions,
 *   lastRolloverDate
 * }
 */
export async function loadInitialData() {
  const data = await readRoot();

  return {
    schedule: data[PATHS.schedule] || null,
    archive: data[PATHS.archive] || [],
    weekStart: data[PATHS.weekStart] || null,
    weekLabel: data[PATHS.weekLabel] || "",
    classOptions: data[PATHS.classOptions] || null,
    subjectOptions: data[PATHS.subjectOptions] || null,
    lastRolloverDate: data[PATHS.lastRolloverDate] || null
  };
}

// Simpan jadual semasa
export async function saveScheduleToDB(scheduleObj) {
  const scheduleRef = ref(db, PATHS.schedule);
  await set(scheduleRef, scheduleObj || {});
}

// Simpan keseluruhan arkib (array)
export async function saveArchiveToDB(archiveArray) {
  const archiveRef = ref(db, PATHS.archive);
  await set(archiveRef, archiveArray || []);
}

// Simpan tarikh mula minggu (Isnin)
export async function saveWeekStartToDB(isoDateString) {
  const weekStartRef = ref(db, PATHS.weekStart);
  await set(weekStartRef, isoDateString || null);
}

// Simpan label minggu semasa (cth: "M32", "Minggu 2")
export async function saveWeekLabelToDB(label) {
  const weekLabelRef = ref(db, PATHS.weekLabel);
  await set(weekLabelRef, label || "");
}

// Simpan pilihan class & subject (array)
export async function saveOptionsToDB(classOptions, subjectOptions) {
  const updates = {};
  updates[PATHS.classOptions] = classOptions || [];
  updates[PATHS.subjectOptions] = subjectOptions || [];
  await update(ref(db, "/"), updates);
}

// Simpan tarikh rollover terakhir (Sabtu)
export async function saveLastRolloverDateToDB(isoDateString) {
  const lastRef = ref(db, PATHS.lastRolloverDate);
  await set(lastRef, isoDateString || null);
}
