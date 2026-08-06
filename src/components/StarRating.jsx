export default function StarRating({ value = 0, onChange, label = 'Rating' }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="text-2xl leading-none transition-colors"
          >
            <span className={n <= value ? 'text-vermilion' : 'text-canvas-line dark:text-garage-line'}>★</span>
          </button>
        ))}
        {value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="ml-2 font-mono text-[10px] text-ink-soft dark:text-paper-soft hover:text-vermilion underline"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
}
