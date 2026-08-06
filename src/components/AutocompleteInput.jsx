import { useEffect, useRef, useState } from 'react';

export default function AutocompleteInput({ value, onChange, suggestions = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, []);

  const filtered = suggestions
    .filter((s) => s.toLowerCase() !== (value || '').trim().toLowerCase())
    .filter((s) => !value || s.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="relative" ref={wrapRef}>
      <input
        className="field-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 card-surface max-h-44 overflow-y-auto shadow-lg">
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-canvas dark:hover:bg-garage transition-colors"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
