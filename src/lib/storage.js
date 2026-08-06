// one64garage — local persistence layer.
// Everything lives in localStorage. No backend, no accounts.
// Keys are namespaced so this app can safely share a browser with other localStorage users.

const KEYS = {
  CUSTOM_CARS: 'dg.customCars',      // cars added through the UI (not in the seed JSON)
  HIDDEN_SEED_CARS: 'dg.hiddenSeedCars', // seed-car ids the user has removed from their garage
  RECORDS: 'dg.records',             // per-car user data: diecast, journal, driver dev
  SESSIONS: 'dg.sessions',           // "Take this car out" session log
  THEME: 'dg.theme',
  DISPLAY_PREFS: 'dg.displayPrefs',  // garage grid density, sort order, make filter
  LAST_EXPORT: 'dg.lastExport',      // timestamp of the last successful backup export
};

const DRIVEN_WINDOW_DAYS = 30;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('one64garage: storage write failed', e);
    return false;
  }
}

// ---------- Custom cars (added via the UI, merged with the seed JSON at runtime) ----------

export function getCustomCars() {
  return read(KEYS.CUSTOM_CARS, []);
}

export function saveCustomCar(car) {
  const cars = getCustomCars();
  const idx = cars.findIndex((c) => c.id === car.id);
  if (idx >= 0) {
    cars[idx] = { ...cars[idx], ...car };
  } else {
    cars.push({ ...car, addedAt: car.addedAt || new Date().toISOString() });
  }
  write(KEYS.CUSTOM_CARS, cars);
  return car;
}

export function deleteCustomCar(id) {
  const cars = getCustomCars().filter((c) => c.id !== id);
  write(KEYS.CUSTOM_CARS, cars);
}

// ---------- Hidden seed cars ----------
// The 3 example cars in src/data/cars.json are bundled into the app code and
// can't be truly deleted — instead we track which ones a user has removed
// and filter them out everywhere the garage is built.

export function getHiddenSeedCars() {
  return read(KEYS.HIDDEN_SEED_CARS, []);
}

export function hideSeedCar(id) {
  const hidden = getHiddenSeedCars();
  if (!hidden.includes(id)) {
    hidden.push(id);
    write(KEYS.HIDDEN_SEED_CARS, hidden);
  }
}

export function restoreSeedCar(id) {
  write(KEYS.HIDDEN_SEED_CARS, getHiddenSeedCars().filter((h) => h !== id));
}

export function restoreAllSeedCars() {
  write(KEYS.HIDDEN_SEED_CARS, []);
}

// ---------- Per-car records: diecast / GT journal / driver development ----------

const emptyRecord = () => ({
  diecast: {
    brand: '',
    scale: '1:64',
    colour: '',
    releaseType: '',
    photo: '', // data URL
    notes: '',
  },
  gt: {
    game: '',
    inGameModel: '',
    drivingTips: '',
    rating: 0, // 0-5 star driving enjoyment rating
    photo: '', // data URL — GT screenshot, shown alongside the diecast photo
  },
  driverDev: [], // [{ id, date, note }] — the notes timeline, now part of the GT Journal tab
  status: null, // null | 'studying'  ("driven this month" is computed from sessions, not stored)
  updatedAt: null,
});

export function getAllRecords() {
  return read(KEYS.RECORDS, {});
}

export function getRecord(carId) {
  const all = getAllRecords();
  const base = emptyRecord();
  const saved = all[carId] || {};
  return {
    ...base,
    ...saved,
    diecast: { ...base.diecast, ...saved.diecast },
    gt: { ...base.gt, ...saved.gt },
  };
}

export function saveRecord(carId, record) {
  const all = getAllRecords();
  all[carId] = { ...record, updatedAt: new Date().toISOString() };
  write(KEYS.RECORDS, all);
  return all[carId];
}

export function addDriverDevNote(carId, note) {
  const record = getRecord(carId);
  const entry = { id: crypto.randomUUID(), date: new Date().toISOString(), note };
  record.driverDev = [...(record.driverDev || []), entry];
  return saveRecord(carId, record);
}

export function deleteDriverDevNote(carId, entryId) {
  const record = getRecord(carId);
  record.driverDev = (record.driverDev || []).filter((n) => n.id !== entryId);
  return saveRecord(carId, record);
}

// ---------- "Take this car out" sessions ----------

export function getSessions() {
  return read(KEYS.SESSIONS, []);
}

export function logSession(session) {
  const sessions = getSessions();
  const entry = { id: crypto.randomUUID(), date: new Date().toISOString(), ...session };
  sessions.unshift(entry);
  write(KEYS.SESSIONS, sessions);
  return entry;
}

// A car counts as "driven this month" automatically once a session has been
// logged for it in the last 30 days — this replaces the old manual status.
export function isDrivenThisMonth(carId, sessions) {
  const list = sessions || getSessions();
  const cutoff = Date.now() - DRIVEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return list.some((s) => s.carId === carId && new Date(s.date).getTime() >= cutoff);
}

// ---------- Theme ----------

export function getTheme() {
  return read(KEYS.THEME, null); // null = follow system preference
}

export function setTheme(theme) {
  write(KEYS.THEME, theme);
}

// ---------- Garage display preferences ----------

const defaultDisplayPrefs = () => ({
  view: 'grid',      // 'grid' | 'list'
  columns: 2,        // 1 or 2 — mobile grid density (grid view only)
  sort: 'make-asc',  // make-asc | year-asc | year-desc | recent
  statusFilter: 'all', // all | studying | driven
  makeFilter: 'all',
  driveFilter: 'all',
  ratingFilter: 'all', // all | '5' | '4' | '3' | '2' | '1'  (minimum stars)
});

export function getDisplayPrefs() {
  return { ...defaultDisplayPrefs(), ...read(KEYS.DISPLAY_PREFS, {}) };
}

export function setDisplayPrefs(patch) {
  const next = { ...getDisplayPrefs(), ...patch };
  write(KEYS.DISPLAY_PREFS, next);
  return next;
}

export function getLastExportAt() {
  return read(KEYS.LAST_EXPORT, null);
}

export function setLastExportAt(iso) {
  write(KEYS.LAST_EXPORT, iso);
}

// ---------- Storage usage ----------
// Informational only — used to give a real, current answer to "should this
// move to IndexedDB yet?" instead of guessing.

export function getLocalStorageBytes() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      total += key.length + (localStorage.getItem(key) || '').length;
    }
    return total * 2; // JS strings are UTF-16 — roughly 2 bytes per character
  } catch {
    return null;
  }
}

// Browser-reported figure where available (Storage API) — covers the origin's
// full storage quota, not just localStorage, so it's the more meaningful
// number long-term if this ever does move to IndexedDB.
export async function getStorageEstimate() {
  try {
    if (navigator.storage?.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage, quota };
    }
  } catch {
    // Storage API not available/denied — caller falls back to getLocalStorageBytes()
  }
  return null;
}

// ---------- Export / import (simple backup, since there is no backend) ----------

export function exportAllData() {
  return {
    version: 1,
    customCars: getCustomCars(),
    hiddenSeedCars: getHiddenSeedCars(),
    records: getAllRecords(),
    sessions: getSessions(),
    displayPrefs: getDisplayPrefs(),
    theme: getTheme(),
    exportedAt: new Date().toISOString(),
  };
}

// A true restore: the app's data ends up exactly matching the backup, not
// merged with whatever was already there. Anything the backup doesn't
// specify resets to empty/default rather than silently keeping stale data.
export function importAllData(data) {
  write(KEYS.CUSTOM_CARS, Array.isArray(data.customCars) ? data.customCars : []);
  write(KEYS.HIDDEN_SEED_CARS, Array.isArray(data.hiddenSeedCars) ? data.hiddenSeedCars : []);
  write(KEYS.RECORDS, data.records && typeof data.records === 'object' ? data.records : {});
  write(KEYS.SESSIONS, Array.isArray(data.sessions) ? data.sessions : []);
  write(KEYS.DISPLAY_PREFS, data.displayPrefs && typeof data.displayPrefs === 'object' ? data.displayPrefs : defaultDisplayPrefs());
  write(KEYS.THEME, 'theme' in data ? data.theme : null);
}
