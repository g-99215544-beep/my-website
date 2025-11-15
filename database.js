// database.js
// Semua fungsi untuk baca/tulis Realtime Database

import { db } from './firebase-config.js';
import {
  ref,
  get,
  set
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Helper umum
async function getValue(path, defaultValue = null) {
  try {
    const snapshot = await get(ref(db, path));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return defaultValue;
  } catch (err) {
    console.error('Firebase get error at', path, err);
    return defaultValue;
  }
}

async function setValue(path, value) {
  try {
    await set(ref(db, path), value);
  } catch (err) {
    console.error('Firebase set error at', path, err);
    throw err;
  }
}

// ==== FUNGSI UTAMA DIPANGGIL DARI index.html ====

// 1. Muat semua data awal sekali gus
export async function loadInitialData() {
  const [
    schedule,
    weekStart,
    weekLabel,
    archive,
    classOptions,
    subjectOptions,
    lastRolloverDate
  ] = await Promise.all([
    getValue('current/schedule', null),
    getValue('current/weekStart', null),
    getValue('current/weekLabel', ''),
    getValue('archive', []),
    getValue('options/classes', null),
    getValue('options/subjects', null),
    getValue('meta/lastRolloverDate', null)
  ]);

  return {
    schedule,
    weekStart,
    weekLabel,
    archive,
    classOptions,
    subjectOptions,
    lastRolloverDate
  };
}

// 2. Simpan jadual semasa
export async function saveScheduleToDB(scheduleObj) {
  await setValue('current/schedule', scheduleObj);
}

// 3. Simpan arkib mingguan (array penuh)
export async function saveArchiveToDB(archiveArray) {
  await setValue('archive', archiveArray || []);
}

// 4. Simpan tarikh mula minggu semasa (Isnin)
export async function saveWeekStartToDB(dateStr) {
  await setValue('current/weekStart', dateStr);
}

// 5. Simpan label minggu semasa (cth: "M32", "Minggu 1")
export async function saveWeekLabelToDB(label) {
  await setValue('current/weekLabel', label || '');
}

// 6. Simpan pilihan dropdown (kelas & subjek)
export async function saveOptionsToDB(classOptions, subjectOptions) {
  await Promise.all([
    setValue('options/classes', classOptions || []),
    setValue('options/subjects', subjectOptions || [])
  ]);
}

// 7. Simpan tarikh rollover terakhir (untuk auto-rollover Sabtu)
export async function saveLastRolloverDateToDB(dateStr) {
  await setValue('meta/lastRolloverDate', dateStr);
}
