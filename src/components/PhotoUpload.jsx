import { useRef } from 'react';

// Downscales the image before storing, since localStorage has a small quota
// and this app has no backend to upload full-resolution photos to.
function downscale(file, maxDim = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// variant="tile" (default) shows a square preview thumbnail alongside the buttons.
// variant="button" is just the buttons — used where a photo preview already
// exists elsewhere on the page (e.g. the car's main hero image).
export default function PhotoUpload({ value, onChange, label = 'Photo', variant = 'tile', buttonLabel }) {
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await downscale(file);
      onChange(dataUrl);
    } catch {
      alert('Could not read that image. Try a different file.');
    }
  }

  const input = <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />;

  if (variant === 'button') {
    return (
      <div className="flex items-center gap-3">
        <button type="button" className="btn-ghost text-xs px-3 py-1.5" onClick={() => inputRef.current?.click()}>
          {buttonLabel || (value ? `Replace ${label}` : `Upload ${label}`)}
        </button>
        {value && (
          <button
            type="button"
            className="text-xs text-ink-soft dark:text-paper-soft hover:text-vermilion underline"
            onClick={() => onChange('')}
          >
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
        <div
          className="w-24 h-24 card-surface flex items-center justify-center overflow-hidden cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-mono text-[10px] text-ink-soft dark:text-paper-soft text-center px-1">
              ADD PHOTO
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="btn-ghost text-xs px-3 py-1.5" onClick={() => inputRef.current?.click()}>
            {value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              className="text-xs text-ink-soft dark:text-paper-soft hover:text-vermilion underline"
              onClick={() => onChange('')}
            >
              Remove
            </button>
          )}
        </div>
        {input}
      </div>
    </div>
  );
}
