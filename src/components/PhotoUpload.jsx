import { useRef, useState } from 'react';
import StoredImage from './StoredImage';

// onChange receives the original File for uploads, or null when removing.
// The caller persists the File in IndexedDB and stores only its small reference
// in the car record. No resizing/recompression occurs here.
export default function PhotoUpload({ value, onChange, label = 'Photo', variant = 'tile', buttonLabel }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBusy(true);
      await onChange(file);
    } catch (err) {
      console.error('one64garage: photo upload failed', err);
      alert('Could not save that photo. Your existing photo has been left unchanged.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      setBusy(true);
      await onChange(null);
    } catch (err) {
      console.error('one64garage: photo removal failed', err);
      alert('Could not remove that photo.');
    } finally {
      setBusy(false);
    }
  }

  const input = <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />;

  if (variant === 'button') {
    return (
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy} className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50" onClick={() => inputRef.current?.click()}>
          {busy ? 'Saving…' : buttonLabel || (value ? `Replace ${label}` : `Upload ${label}`)}
        </button>
        {value && (
          <button type="button" disabled={busy} className="text-xs text-ink-soft dark:text-paper-soft hover:text-vermilion underline disabled:opacity-50" onClick={remove}>
            Remove
          </button>
        )}
        {input}
      </div>
    );
  }

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-start gap-3">
        <div className="w-24 h-24 card-surface flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => !busy && inputRef.current?.click()}>
          {value ? (
            <StoredImage photoRef={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-mono text-[10px] text-ink-soft dark:text-paper-soft text-center px-1">ADD PHOTO</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={busy} className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50" onClick={() => inputRef.current?.click()}>
            {busy ? 'Saving…' : value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button type="button" disabled={busy} className="text-xs text-ink-soft dark:text-paper-soft hover:text-vermilion underline disabled:opacity-50" onClick={remove}>Remove</button>
          )}
        </div>
        {input}
      </div>
    </div>
  );
}
