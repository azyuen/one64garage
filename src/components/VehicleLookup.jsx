import { useState } from 'react';
import { searchCandidates, searchWikipediaFallback, fetchVehicleDraft } from '../lib/vehicleLookup';

const FIELD_GROUPS = [
  {
    title: 'Basic Information',
    fields: [
      ['make', 'Make', (d) => d.make],
      ['model', 'Model', (d) => d.model],
      ['year', 'Year', (d) => d.year],
      ['bodyType', 'Body type', (d) => d.bodyType],
      ['countryOfOrigin', 'Country of origin', (d) => d.countryOfOrigin],
    ],
  },
  {
    title: 'Technical Specifications',
    fields: [
      ['tech.engine', 'Engine', (d) => d.tech.engine],
      ['tech.configuration', 'Configuration', (d) => d.tech.configuration],
      ['tech.displacement', 'Displacement', (d) => d.tech.displacement],
      ['tech.horsepower', 'Horsepower', (d) => d.tech.horsepower],
      ['tech.torque', 'Torque', (d) => d.tech.torque],
      ['tech.weight', 'Weight', (d) => d.tech.weight],
      ['tech.drivetrain', 'Drivetrain', (d) => d.tech.drivetrain],
      ['tech.transmission', 'Transmission', (d) => d.tech.transmission],
    ],
  },
  {
    title: 'Historical Notes',
    fields: [['history.whyItMatters', 'Why this car matters', (d) => d.history.whyItMatters]],
  },
];

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function confidenceBand(score) {
  if (score >= 95) return { label: 'Exact match', color: 'text-vermilion border-vermilion' };
  if (score >= 75) return { label: 'Likely match', color: 'text-ink dark:text-paper border-ink-soft dark:border-paper-soft' };
  return { label: 'Needs confirmation', color: 'text-ink-soft dark:text-paper-soft border-canvas-line dark:border-garage-line' };
}

export default function VehicleLookup({ form, onApply }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState({
    make: form.make || '',
    model: form.model || '',
    variant: form.variant || '',
    year: form.year || '',
  });
  const [status, setStatus] = useState('idle'); // idle | searching | loading | error
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState(null); // null = not searched yet
  const [usedFallback, setUsedFallback] = useState(false);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [checked, setChecked] = useState({});

  async function runSearch(e) {
    e.preventDefault();
    setStatus('searching');
    setError('');
    setCandidates(null);
    setUsedFallback(false);
    setSelected(null);
    setDraft(null);
    try {
      const results = await searchCandidates(query);
      setCandidates(results);
      setStatus('idle');
    } catch {
      setStatus('error');
      setError('Could not reach Wikidata. Check your connection and try again.');
    }
  }

  async function runFallbackSearch() {
    setStatus('searching');
    setError('');
    try {
      const results = await searchWikipediaFallback(query);
      setCandidates(results);
      setUsedFallback(true);
      setStatus('idle');
    } catch {
      setStatus('error');
      setError('Could not reach Wikipedia either. Try different search terms, or enter details manually below.');
    }
  }

  async function pickCandidate(candidate) {
    setSelected(candidate);
    setStatus('loading');
    setError('');
    try {
      const d = await fetchVehicleDraft(candidate);
      setDraft(d);
      // Default: pre-check fields that are currently blank, leave existing values unchecked.
      const initialChecked = {};
      FIELD_GROUPS.forEach((group) => {
        group.fields.forEach(([path, , getValue]) => {
          const value = getValue(d);
          if (!value) return;
          const current = getPath(form, path);
          initialChecked[path] = !current;
        });
      });
      setChecked(initialChecked);
      setStatus('idle');
    } catch {
      setStatus('error');
      setError('Could not fetch details for that match. Try a different candidate.');
    }
  }

  function toggleField(path) {
    setChecked((c) => ({ ...c, [path]: !c[path] }));
  }

  function applySelected() {
    if (!draft) return;
    const patch = { tech: {}, history: {} };
    FIELD_GROUPS.forEach((group) => {
      group.fields.forEach(([path, , getValue]) => {
        if (!checked[path]) return;
        const value = getValue(draft);
        if (!value) return;
        if (path.startsWith('tech.')) patch.tech[path.slice(5)] = value;
        else if (path.startsWith('history.')) patch.history[path.slice(8)] = value;
        else patch[path] = value;
      });
    });
    onApply(patch, draft.sources);
    reset();
    setOpen(false);
  }

  function reset() {
    setCandidates(null);
    setUsedFallback(false);
    setSelected(null);
    setDraft(null);
    setChecked({});
    setStatus('idle');
    setError('');
  }

  const anyChecked = Object.values(checked).some(Boolean);
  const bestConfidence = candidates?.length ? Math.max(...candidates.map((c) => c.confidence)) : 0;
  const offerFallback = !usedFallback && candidates && (candidates.length === 0 || bestConfidence < 50);

  return (
    <div className="card-surface p-5 mb-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="plate-label mb-1">Fetch Vehicle Data</p>
          <p className="text-xs text-ink-soft dark:text-paper-soft">
            Searches Wikidata for a structured match, with Wikipedia's spec sheet where available. Nothing is saved until you
            review and approve it below.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost text-xs px-3 py-1.5 flex-shrink-0"
          onClick={() => {
            setOpen((o) => !o);
            if (open) reset();
          }}
        >
          {open ? 'Close' : 'Search'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {!draft && (
            <form onSubmit={runSearch} className="grid grid-cols-2 gap-2">
              <input
                className="field-input"
                placeholder="Make"
                value={query.make}
                onChange={(e) => setQuery((q) => ({ ...q, make: e.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Model"
                value={query.model}
                onChange={(e) => setQuery((q) => ({ ...q, model: e.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Variant (optional)"
                value={query.variant}
                onChange={(e) => setQuery((q) => ({ ...q, variant: e.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Year (optional)"
                value={query.year}
                onChange={(e) => setQuery((q) => ({ ...q, year: e.target.value }))}
              />
              <button type="submit" className="btn-ghost text-xs col-span-2" disabled={status === 'searching'}>
                {status === 'searching' ? 'Searching…' : 'Search'}
              </button>
            </form>
          )}

          {error && <p className="text-xs text-vermilion">{error}</p>}
          {status === 'loading' && (
            <p className="text-xs text-ink-soft dark:text-paper-soft">Fetching structured data…</p>
          )}

          {/* Candidate list */}
          {candidates && !draft && (
            <>
              {candidates.length === 0 ? (
                <p className="text-sm text-ink-soft dark:text-paper-soft">
                  {usedFallback
                    ? 'No reliable match found on Wikipedia either. Nothing has been changed — enter details manually below.'
                    : 'No reliable match found on Wikidata.'}
                </p>
              ) : (
                <ul className="divide-y divide-canvas-line dark:divide-garage-line border border-canvas-line dark:border-garage-line">
                  {candidates.map((c) => {
                    const band = confidenceBand(c.confidence);
                    const years = c.startTime && c.endTime ? `${c.startTime}–${c.endTime}` : c.startTime || c.inception || '';
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => pickCandidate(c)}
                          disabled={status === 'loading'}
                          className="w-full text-left px-3 py-2.5 hover:bg-canvas dark:hover:bg-garage transition-colors flex items-center justify-between gap-3"
                        >
                          <span className="min-w-0">
                            <span className="text-sm font-semibold block truncate">{c.label}</span>
                            <span className="text-xs text-ink-soft dark:text-paper-soft block truncate">
                              {[c.manufacturerLabel, years].filter(Boolean).join(' · ') || c.description}
                            </span>
                          </span>
                          <span className={`font-mono text-[10px] tracking-plate uppercase px-2 py-1 border flex-shrink-0 ${band.color}`}>
                            {c.confidence}% · {band.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {offerFallback && (
                <button type="button" onClick={runFallbackSearch} className="btn-ghost text-xs px-4 py-2" disabled={status === 'searching'}>
                  {status === 'searching' ? 'Searching Wikipedia…' : 'Try Wikipedia search instead'}
                </button>
              )}
            </>
          )}

          {/* Review + approve */}
          {draft && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{selected?.label}</p>
                <button type="button" onClick={reset} className="text-xs text-ink-soft dark:text-paper-soft hover:text-vermilion underline">
                  Choose a different match
                </button>
              </div>

              {!draft.hasSpecs && (
                <p className="text-xs text-ink-soft dark:text-paper-soft">
                  {draft.fromFallback
                    ? "This came from a Wikipedia text search rather than a structured Wikidata match, and no spec infobox was found on the article either — check the fields below carefully."
                    : "No linked Wikipedia article with a spec table was found — only Wikidata's structured facts are available for this match."}
                </p>
              )}

              {FIELD_GROUPS.map((group) => {
                const rows = group.fields.filter(([, , getValue]) => getValue(draft));
                if (rows.length === 0) return null;
                return (
                  <div key={group.title}>
                    <p className="field-label mb-2">{group.title}</p>
                    <div className="space-y-2">
                      {rows.map(([path, label, getValue]) => {
                        const proposed = getValue(draft);
                        const current = getPath(form, path);
                        return (
                          <label key={path} className="flex items-start gap-2.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={Boolean(checked[path])}
                              onChange={() => toggleField(path)}
                            />
                            <span className="min-w-0">
                              <span className="text-xs text-ink-soft dark:text-paper-soft">{label}</span>
                              {current && (
                                <span className="block text-xs text-ink-soft dark:text-paper-soft line-through decoration-vermilion/50">
                                  {current}
                                </span>
                              )}
                              <span className="block break-words">{proposed}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={applySelected} disabled={!anyChecked} className="btn-primary text-xs px-4 py-2 disabled:opacity-40">
                  Apply Selected Fields
                </button>
                <span className="font-mono text-[10px] text-ink-soft dark:text-paper-soft">
                  {Object.values(checked).filter(Boolean).length} field{Object.values(checked).filter(Boolean).length === 1 ? '' : 's'} selected
                </span>
              </div>

              <p className="text-[11px] text-ink-soft dark:text-paper-soft">
                Source:{' '}
                {draft.sources.wikidata && (
                  <>
                    <a href={draft.sources.wikidata} target="_blank" rel="noreferrer" className="underline hover:text-vermilion">
                      Wikidata
                    </a>
                  </>
                )}
                {draft.sources.wikidata && draft.sources.wikipedia && ' · '}
                {draft.sources.wikipedia && (
                  <a href={draft.sources.wikipedia} target="_blank" rel="noreferrer" className="underline hover:text-vermilion">
                    Wikipedia
                  </a>
                )}
                . Facts only — review before saving, especially specs pulled from Wikipedia's infobox.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
