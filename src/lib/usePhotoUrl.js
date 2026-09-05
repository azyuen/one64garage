import { useEffect, useState } from 'react';
import { getPhotoBlob, isIndexedPhotoRef } from './photoStore';

// Resolves an IndexedDB photo reference into a temporary object URL.
// The URL is revoked automatically when the component no longer needs it.
export function usePhotoUrl(photoRef, fallback = '') {
  const [url, setUrl] = useState(() => (isIndexedPhotoRef(photoRef) ? '' : photoRef || fallback || ''));

  useEffect(() => {
    let alive = true;
    let objectUrl = null;

    if (!photoRef) {
      setUrl(fallback || '');
      return () => {};
    }

    if (!isIndexedPhotoRef(photoRef)) {
      setUrl(photoRef);
      return () => {};
    }

    setUrl('');
    getPhotoBlob(photoRef)
      .then((blob) => {
        if (!alive) return;
        if (!blob) {
          setUrl(fallback || '');
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => {
        console.warn('one64garage: could not load stored photo', err);
        if (alive) setUrl(fallback || '');
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoRef, fallback]);

  return url;
}
