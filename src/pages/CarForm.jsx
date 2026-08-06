import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCars } from '../lib/useCars';
import { saveCustomCar } from '../lib/storage';
import { toText } from '../lib/format';
import VehicleLookup from '../components/VehicleLookup';

const BLANK = {
  make: '',
  model: '',
  variant: '',
  year: '',
  generation: '',
  bodyType: '',
  countryOfOrigin: '',
  heroImage: '',
  tech: {
    engine: '',
    configuration: '',
    displacement: '',
    horsepower: '',
    torque: '',
    weight: '',
    drivetrain: '',
    transmission: '',
  },
  history: {
    whyItMatters: '',
  },
};

function slugify(make, model, variant, year) {
  return [make, model, variant, year]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toFormShape(car) {
  return { ...BLANK, ...car, tech: { ...BLANK.tech, ...car.tech }, history: { ...BLANK.history, ...car.history } };
}

export default function CarForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCar, cars, refresh } = useCars();
  const editing = Boolean(id);
  const existing = editing ? getCar(id) : null;
  const importInputRef = useRef(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [loadedExisting, setLoadedExisting] = useState(false);

  const [form, setForm] = useState(() => (existing ? toFormShape(existing) : BLANK));
  const [lookupSources, setLookupSources] = useState(existing?.lookupSources || null);

  // The car list loads asynchronously, so on the very first render after
  // navigating straight to an edit link, `existing` can still be undefined.
  // This catches it once the data arrives and pre-populates the form —
  // without it, editing a car showed a blank form instead of its values.
  useEffect(() => {
    if (editing && existing && !loadedExisting) {
      setForm(toFormShape(existing));
      setLookupSources(existing.lookupSources || null);
      setLoadedExisting(true);
    }
  }, [editing, existing, loadedExisting]);

  const generatedId = useMemo(
    () => (editing ? id : slugify(form.make, form.model, form.variant, form.year)),
    [editing, id, form.make, form.model, form.variant, form.year]
  );

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function setTech(field, value) {
    setForm((f) => ({ ...f, tech: { ...f.tech, [field]: value } }));
  }
  function setHistory(field, value) {
    setForm((f) => ({ ...f, history: { ...f.history, [field]: value } }));
  }

  function handleLookupApply(patch, sources) {
    setForm((f) => ({
      ...f,
      ...(patch.make !== undefined ? { make: patch.make } : {}),
      ...(patch.model !== undefined ? { model: patch.model } : {}),
      ...(patch.countryOfOrigin !== undefined ? { countryOfOrigin: patch.countryOfOrigin } : {}),
      ...(patch.bodyType !== undefined ? { bodyType: patch.bodyType } : {}),
      ...(patch.year !== undefined ? { year: patch.year } : {}),
      tech: { ...f.tech, ...patch.tech },
      history: { ...f.history, ...patch.history },
    }));
    setLookupSources(sources);
  }

  function uniqueId(base, taken) {
    let id = base;
    let n = 2;
    while (taken.has(id)) {
      id = `${base}-${n}`;
      n++;
    }
    taken.add(id);
    return id;
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setImporting(false);
      setImportResult({ added: 0, errors: ['Could not read that file.'] });
    };
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const list = Array.isArray(parsed) ? parsed : parsed?.cars;
        if (!Array.isArray(list)) {
          setImporting(false);
          setImportResult({ added: 0, errors: ['Expected a JSON array of car objects (or an object with a "cars" array).'] });
          return;
        }

        const taken = new Set(cars.map((c) => c.id));
        const errors = [];
        let added = 0;

        list.forEach((entry, i) => {
          if (!entry?.make || !entry?.model) {
            errors.push(`Item ${i + 1}: missing make/model, skipped.`);
            return;
          }
          const base = entry.id || slugify(entry.make, entry.model, entry.variant, entry.year);
          if (!base) {
            errors.push(`Item ${i + 1}: could not generate an ID, skipped.`);
            return;
          }
          const id = uniqueId(base, taken);
          saveCustomCar({
            ...BLANK,
            ...entry,
            id,
            tech: { ...BLANK.tech, ...entry.tech },
            history: { ...BLANK.history, ...entry.history },
          });
          added++;
        });

        refresh();
        setImporting(false);
        setImportResult({ added, errors });
      } catch (err) {
        setImporting(false);
        setImportResult({ added: 0, errors: ['That file is not valid JSON.'] });
      }
    };
    reader.readAsText(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.make || !form.model) {
      alert('Make and model are required.');
      return;
    }
    if (!generatedId) {
      alert('Could not generate an ID for this car — check the make/model fields.');
      return;
    }
    saveCustomCar({ ...form, id: generatedId, lookupSources: lookupSources || undefined });
    refresh();
    navigate(`/car/${generatedId}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-12">
      <p className="plate-label mb-2">{editing ? 'Edit exhibit' : 'New exhibit'}</p>
      <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight mb-6">
        {editing ? `Editing ${toText(existing?.make)} ${toText(existing?.model)}`.trim() : 'Add a Car'}
      </h1>

      <VehicleLookup form={form} onApply={handleLookupApply} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card-surface p-5">
          <p className="plate-label mb-4">Basic Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="field-label">Make *</span>
              <input className="field-input" value={form.make} onChange={(e) => set('make', e.target.value)} required />
            </div>
            <div>
              <span className="field-label">Model *</span>
              <input className="field-input" value={form.model} onChange={(e) => set('model', e.target.value)} required />
            </div>
            <div>
              <span className="field-label">Variant</span>
              <input className="field-input" value={form.variant} onChange={(e) => set('variant', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Year</span>
              <input className="field-input" value={form.year} onChange={(e) => set('year', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Generation</span>
              <input className="field-input" value={form.generation} onChange={(e) => set('generation', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Body type</span>
              <input className="field-input" value={form.bodyType} onChange={(e) => set('bodyType', e.target.value)} />
            </div>
            <div className="col-span-2">
              <span className="field-label">Country of origin</span>
              <input className="field-input" value={form.countryOfOrigin} onChange={(e) => set('countryOfOrigin', e.target.value)} />
            </div>
          </div>
          {generatedId && (
            <p className="font-mono text-[10px] text-ink-soft dark:text-paper-soft mt-3">ID: {generatedId}</p>
          )}
        </section>

        <section className="card-surface p-5">
          <p className="plate-label mb-4">Technical Specification</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="field-label">Engine</span>
              <input className="field-input" value={form.tech.engine} onChange={(e) => setTech('engine', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Configuration</span>
              <input className="field-input" value={form.tech.configuration} onChange={(e) => setTech('configuration', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Displacement</span>
              <input className="field-input" value={form.tech.displacement} onChange={(e) => setTech('displacement', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Horsepower</span>
              <input className="field-input" value={form.tech.horsepower} onChange={(e) => setTech('horsepower', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Torque</span>
              <input className="field-input" value={form.tech.torque} onChange={(e) => setTech('torque', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Weight</span>
              <input className="field-input" value={form.tech.weight} onChange={(e) => setTech('weight', e.target.value)} />
            </div>
            <div>
              <span className="field-label">Drivetrain</span>
              <select className="field-input" value={form.tech.drivetrain} onChange={(e) => setTech('drivetrain', e.target.value)}>
                <option value="">Select…</option>
                <option value="FWD">FWD — Front-Wheel Drive</option>
                <option value="RWD">RWD — Rear-Wheel Drive</option>
                <option value="AWD">AWD — All-Wheel Drive</option>
                <option value="4WD">4WD — Four-Wheel Drive</option>
                <option value="MR">MR — Mid-Engine RWD</option>
              </select>
            </div>
            <div>
              <span className="field-label">Transmission</span>
              <input className="field-input" value={form.tech.transmission} onChange={(e) => setTech('transmission', e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card-surface p-5 space-y-4">
          <p className="plate-label">Historical Notes</p>
          <div>
            <span className="field-label">Why this car matters</span>
            <textarea className="field-textarea" value={form.history.whyItMatters} onChange={(e) => setHistory('whyItMatters', e.target.value)} />
          </div>
          {lookupSources && (
            <p className="text-[11px] text-ink-soft dark:text-paper-soft">
              Populated via{' '}
              <a href={lookupSources.wikidata} target="_blank" rel="noreferrer" className="underline hover:text-vermilion">
                Wikidata
              </a>
              {lookupSources.wikipedia && (
                <>
                  {' '}and{' '}
                  <a href={lookupSources.wikipedia} target="_blank" rel="noreferrer" className="underline hover:text-vermilion">
                    Wikipedia
                  </a>
                </>
              )}
              . Double-check before saving, especially specs pulled from Wikipedia's infobox.
            </p>
          )}
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">
            {editing ? 'Save changes' : 'Add to garage'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>

      {!editing && (
        <div className="card-surface p-5 mt-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="plate-label mb-1">Bulk Import from JSON</p>
              <p className="text-xs text-ink-soft dark:text-paper-soft">
                Rarely needed — upload a JSON array of car objects (same shape as{' '}
                <code className="font-mono">src/data/cars.json</code>) to add many at once.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost text-xs px-3 py-1.5 flex-shrink-0"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? 'Importing…' : 'Choose file'}
            </button>
            <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
          </div>

          {importResult && (
            <div className="mt-4 pt-4 hairline text-sm space-y-2">
              <p className={importResult.added ? 'text-vermilion font-semibold' : ''}>
                {importResult.added > 0
                  ? `Imported ${importResult.added} car${importResult.added === 1 ? '' : 's'}.`
                  : 'No cars were imported.'}
              </p>
              {importResult.errors?.length > 0 && (
                <ul className="text-xs text-ink-soft dark:text-paper-soft list-disc pl-4 space-y-0.5">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult.errors.length > 10 && <li>…and {importResult.errors.length - 10} more.</li>}
                </ul>
              )}
              {importResult.added > 0 && (
                <button type="button" onClick={() => navigate('/')} className="btn-primary text-xs px-4 py-2 mt-1">
                  View garage
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
