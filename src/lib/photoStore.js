// one64garage — high-resolution photo persistence.
// Photos live as Blobs in IndexedDB so they do not consume localStorage and
// are retained at the resolution supplied by the user.

const DB_NAME = 'one64garage';
const DB_VERSION = 1;
const STORE = 'photos';
const REF_PREFIX = 'idb-photo:';

let dbPromise;

function openDb() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open photo database.'));
      request.onblocked = () => reject(new Error('Photo database upgrade is blocked by another open tab.'));
    });
  }
  return dbPromise;
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction was aborted.'));
  });
}

export function isIndexedPhotoRef(value) {
  return typeof value === 'string' && value.startsWith(REF_PREFIX);
}

function idFromRef(ref) {
  return isIndexedPhotoRef(ref) ? ref.slice(REF_PREFIX.length) : null;
}

export async function savePhotoBlob(blob, meta = {}) {
  if (!(blob instanceof Blob)) throw new Error('Photo must be a Blob or File.');
  const db = await openDb();
  const id = crypto.randomUUID();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({
    id,
    blob,
    name: meta.name || (blob instanceof File ? blob.name : ''),
    type: blob.type || meta.type || 'application/octet-stream',
    size: blob.size,
    carId: meta.carId || null,
    slot: meta.slot || null,
    createdAt: new Date().toISOString(),
  });
  await transactionDone(tx);
  return `${REF_PREFIX}${id}`;
}

// Used by backup restore so existing metadata references remain valid.
async function savePhotoWithId(id, blob, meta = {}) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({
    id,
    blob,
    name: meta.name || '',
    type: blob.type || meta.type || 'application/octet-stream',
    size: blob.size,
    carId: meta.carId || null,
    slot: meta.slot || null,
    createdAt: meta.createdAt || new Date().toISOString(),
  });
  await transactionDone(tx);
  return `${REF_PREFIX}${id}`;
}

export async function getPhotoBlob(ref) {
  const id = idFromRef(ref);
  if (!id) return null;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const row = await requestAsPromise(tx.objectStore(STORE).get(id));
  return row?.blob || null;
}

export async function deletePhoto(ref) {
  const id = idFromRef(ref);
  if (!id) return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await transactionDone(tx);
}

export async function clearAllPhotos() {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  await transactionDone(tx);
}

export async function getAllPhotoRows() {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  return requestAsPromise(tx.objectStore(STORE).getAll());
}

export function dataUrlToBlob(dataUrl) {
  const [header, payload] = String(dataUrl).split(',', 2);
  if (!header || !payload) throw new Error('Invalid image data URL.');
  const mime = header.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read photo for backup.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export async function exportPhotosForBackup() {
  const rows = await getAllPhotoRows();
  const result = [];
  for (const row of rows) {
    result.push({
      ref: `${REF_PREFIX}${row.id}`,
      dataUrl: await blobToDataUrl(row.blob),
      name: row.name || '',
      type: row.type || row.blob?.type || '',
      carId: row.carId || null,
      slot: row.slot || null,
      createdAt: row.createdAt || null,
    });
  }
  return result;
}

export async function importPhotosFromBackup(photos) {
  await clearAllPhotos();
  if (!Array.isArray(photos)) return;
  for (const item of photos) {
    if (!item?.ref || !item?.dataUrl) continue;
    const id = idFromRef(item.ref);
    if (!id) continue;
    const blob = dataUrlToBlob(item.dataUrl);
    await savePhotoWithId(id, blob, item);
  }
}

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    // Persistence is a browser policy decision; failure does not stop IndexedDB.
  }
  return false;
}
