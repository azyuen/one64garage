import { useState } from 'react';
import { matchGT7Cars } from '../lib/gt7data';

export default function GT7Matcher({ make, model, year, onPick }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  async function runSearch() {
    setOpen(true);
    setStatus('loading');
    setError('');
    try {
      const matches = await matchGT7Cars(make, model, year);
      setResults(matches);
      setStatus('idle');
    } catch {
      setStatus('error');
      setError('Could not reach the GT7 car list. Check your connection, or enter the in-game name manually.');
    }
  }

  return (
    <div>
      <button type="button" onClick={runSearch} className="font-mono text-[10px] tracking-plate uppercase text-vermilion hover:underline">
        Find exact GT7 name
      </button>

      {open && (
        <div className="mt-2 card-surface p-3">
          {status === 'loading' && <p className="text-xs text-ink-soft dark:text-paper-soft">Searching GT7's car list…</p>}
          {error && <p className="text-xs text-vermilion">{error}</p>}
          {results && results.length === 0 && (
            <p className="text-xs text-ink-soft dark:text-paper-soft">
              No match found in GT7's car list for "{make} {model}". It may not be in the game, or may need a different
              search — type the in-game name manually instead.
            </p>
          )}
          {results && results.length > 0 && (
            <ul className="divide-y divide-canvas-line dark:divide-garage-line">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(r.name);
                      setOpen(false);
                    }}
                    className="w-full text-left py-1.5 flex items-center justify-between gap-3 hover:text-vermilion transition-colors"
                  >
                    <span className="text-sm truncate">{r.name}</span>
                    <span className="font-mono text-[9px] text-ink-soft dark:text-paper-soft flex-shrink-0">{r.confidence}%</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-ink-soft dark:text-paper-soft mt-2">
            GT7 only, from the community-maintained{' '}
            <a href="https://github.com/ddm999/gt7info" target="_blank" rel="noreferrer" className="underline hover:text-vermilion">
              gt7info
            </a>{' '}
            car list. Other GT titles don't have a reliable structured source, so those still need manual entry.
          </p>
        </div>
      )}
    </div>
  );
}
