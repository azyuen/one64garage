import { getAllRecords, replaceAllRecords } from './storage';
import { dataUrlToBlob, savePhotoBlob, isIndexedPhotoRef } from './photoStore';

const MIGRATION_KEY = 'dg.indexedPhotoMigrationVersion';
const VERSION = '1';

// Move legacy Base64 photos out of localStorage and into IndexedDB. This keeps
// old installations working while immediately freeing the storage that caused
// photos to disappear. Existing image bytes are preserved exactly as stored.
export async function migrateLegacyPhotosOnce() {
  try {
    if (localStorage.getItem(MIGRATION_KEY) === VERSION) return false;
    const records = getAllRecords();
    let changed = false;

    for (const [carId, record] of Object.entries(records)) {
      for (const slot of ['diecast', 'gt']) {
        const value = record?.[slot]?.photo;
        if (!value || isIndexedPhotoRef(value) || !String(value).startsWith('data:image/')) continue;
        const blob = dataUrlToBlob(value);
        const ref = await savePhotoBlob(blob, { carId, slot, type: blob.type });
        record[slot] = { ...record[slot], photo: ref };
        changed = true;
      }
    }

    if (changed && !replaceAllRecords(records)) {
      throw new Error('Could not update photo references in localStorage.');
    }
    localStorage.setItem(MIGRATION_KEY, VERSION);
    return changed;
  } catch (err) {
    console.warn('one64garage: legacy photo migration will retry next launch', err);
    return false;
  }
}
