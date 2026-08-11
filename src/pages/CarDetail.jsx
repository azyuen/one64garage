import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCars } from '../lib/useCars';
import { getRecord, saveRecord, addDriverDevNote, deleteDriverDevNote, getSessions, isDrivenThisMonth } from '../lib/storage';
import { collectFieldValues } from '../lib/suggestions';
import { toText, formatDuration } from '../lib/format';
import PhotoUpload from '../components/PhotoUpload';
import PhotoGallery from '../components/PhotoGallery';
import CompletionRing from '../components/CompletionRing';
import StarRating from '../components/StarRating';
import AutocompleteInput from '../components/AutocompleteInput';
import GT7Matcher from '../components/GT7Matcher';

const TABS = ['Overview', 'Diecast', 'GT Journal'];

function Field({ label, value }) {
  const text = toText(value);
  if (!text) return null;
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="font-mono text-sm">{text}</p>
    </div>
  );
}

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCar, isCustom, removeCar, refresh, records: allRecords } = useCars();
  const car = getCar(id);
  const [tab, setTab] = useState('Overview');
  const [record, setRecord] = useState(() => getRecord(id));
  const [devNote, setDevNote] = useState('');
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    setRecord(getRecord(id));
  }, [id]);

  const brandSuggestions = useMemo(() => collectFieldValues(allRecords, ['diecast', 'brand']), [allRecords]);
  const releaseTypeSuggestions = useMemo(() => collectFieldValues(allRecords, ['diecast', 'releaseType']), [allRecords]);
  const colourSuggestions = useMemo(() => collectFieldValues(allRecords, ['diecast', 'colour']), [allRecords]);
  const carSessions = useMemo(
    () =>
      getSessions()
        .filter((s) => s.carId === id)
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [id, record]
  );

  if (!car) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-sm text-ink-soft dark:text-paper-soft mb-4">This car isn't in the garage.</p>
        <Link to="/" className="btn-primary">
          Back to Garage
        </Link>
      </div>
    );
  }

  function persist(next) {
    setRecord(next);
    saveRecord(id, next);
    refresh();
  }

  function updateDiecast(patch) {
    persist({ ...record, diecast: { ...record.diecast, ...patch } });
  }

  function updateGt(patch) {
    persist({ ...record, gt: { ...record.gt, ...patch } });
  }

  function toggleStudying() {
    persist({ ...record, status: record.status === 'studying' ? null : 'studying' });
  }

  function submitDevNote(e) {
    e.preventDefault();
    if (!devNote.trim()) return;
    const updated = addDriverDevNote(id, devNote.trim());
    setRecord(updated);
    setDevNote('');
    refresh();
  }

  function removeDevNote(entryId) {
    const updated = deleteDriverDevNote(id, entryId);
    setRecord(updated);
    refresh();
  }

  function handleDelete() {
    const message = isCustom(id)
      ? `Remove ${car.make} ${car.model} from the garage? This cannot be undone.`
      : `Remove ${car.make} ${car.model} from your garage? It's one of the built-in example cars, so this just hides it on this device — you can bring it back later from the Journal tab.`;
    if (!confirm(message)) return;
    removeCar(id);
    navigate('/');
  }

  const drivenThisMonth = isDrivenThisMonth(car.id, getSessions());
  const galleryPhotos = [
    { src: record.diecast.photo || car.heroImage, label: 'Diecast' },
    { src: record.gt.photo, label: 'GT Photo' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-12">
      {/* Header plate */}
      <div className="card-surface overflow-hidden mb-6">
        <div className="border-b border-canvas-line dark:border-garage-line">
          <PhotoGallery photos={galleryPhotos} />
        </div>
        <div className="p-5 flex items-start justify-between gap-4">
          <div>
            <p className="plate-label mb-1">
              {toText(car.make)} · {toText(car.year)}
            </p>
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
              {toText(car.model)} <span className="text-ink-soft dark:text-paper-soft font-medium">{toText(car.variant)}</span>
            </h1>
            <p className="font-mono text-xs text-ink-soft dark:text-paper-soft mt-2">
              {toText(car.generation)} · {toText(car.bodyType)} · {toText(car.countryOfOrigin)}
            </p>
          </div>
          <CompletionRing record={record} size={48} />
        </div>
        <div className="hairline px-5 py-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleStudying}
            className={`font-mono text-[10px] tracking-plate uppercase px-2.5 py-1 border transition-colors ${
              record.status === 'studying'
                ? 'border-vermilion text-vermilion'
                : 'border-canvas-line dark:border-garage-line text-ink-soft dark:text-paper-soft'
            }`}
          >
            {record.status === 'studying' ? '✓ Studying' : 'Mark as Studying'}
          </button>
          {drivenThisMonth && (
            <span className="font-mono text-[10px] tracking-plate uppercase px-2.5 py-1 border border-vermilion text-vermilion">
              Driven This Month
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link to={`/take-out?car=${car.id}`} className="font-mono text-[10px] tracking-plate uppercase text-vermilion hover:underline">
              Take this car out →
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 text-xs tracking-wide whitespace-nowrap border transition-colors ${
              tab === t
                ? 'border-vermilion text-vermilion'
                : 'border-canvas-line dark:border-garage-line text-ink-soft dark:text-paper-soft hover:text-ink dark:hover:text-paper'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-6">
          <section className="card-surface p-5">
            <p className="plate-label mb-4">Technical Specification</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
              <Field label="Engine" value={car.tech?.engine} />
              <Field label="Configuration" value={car.tech?.configuration} />
              <Field label="Displacement" value={car.tech?.displacement} />
              <Field label="Horsepower" value={car.tech?.horsepower} />
              <Field label="Torque" value={car.tech?.torque} />
              <Field label="Weight" value={car.tech?.weight} />
              <Field label="Drivetrain" value={car.tech?.drivetrain} />
              <Field label="Transmission" value={car.tech?.transmission} />
            </div>
          </section>

          <section className="card-surface p-5">
            <p className="plate-label mb-4">Why This Car Matters</p>
            {toText(car.history?.whyItMatters) ? (
              <p className="text-sm leading-relaxed">{toText(car.history.whyItMatters)}</p>
            ) : (
              <p className="text-sm text-ink-soft dark:text-paper-soft">Not written yet.</p>
            )}
          </section>

          <div className="flex items-center gap-4">
            <Link to={`/car/${car.id}/edit`} className="btn-ghost text-xs px-4 py-2">
              Edit car record
            </Link>
            <button onClick={handleDelete} className="text-xs text-ink-soft dark:text-paper-soft hover:text-vermilion underline">
              Remove from garage
            </button>
          </div>
          {!isCustom(car.id) && (
            <p className="text-xs text-ink-soft dark:text-paper-soft">
              This car ships with one64garage as a built-in example. Removing it only hides it on this device — it can be
              brought back from the Journal tab. To edit its base specs directly instead, update{' '}
              <code className="font-mono">src/data/cars.json</code>, or use "Edit car record" to override it in this browser.
            </p>
          )}
        </div>
      )}

      {tab === 'Diecast' && (
        <div className="card-surface p-5 space-y-5">
          <p className="plate-label">Physical Model</p>
          <PhotoUpload variant="button" value={record.diecast.photo} onChange={(v) => updateDiecast({ photo: v })} label="Diecast Photo" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="field-label">Brand</span>
              <AutocompleteInput
                value={record.diecast.brand}
                onChange={(v) => updateDiecast({ brand: v })}
                suggestions={brandSuggestions}
                placeholder="Hot Wheels, Tomica, Tarmac Works…"
              />
            </div>
            <div>
              <span className="field-label">Scale</span>
              <input
                className="field-input"
                value={record.diecast.scale}
                onChange={(e) => updateDiecast({ scale: e.target.value })}
              />
            </div>
            <div>
              <span className="field-label">Colour</span>
              <AutocompleteInput
                value={record.diecast.colour}
                onChange={(v) => updateDiecast({ colour: v })}
                suggestions={colourSuggestions}
              />
            </div>
            <div>
              <span className="field-label">Release type</span>
              <AutocompleteInput
                value={record.diecast.releaseType}
                onChange={(v) => updateDiecast({ releaseType: v })}
                suggestions={releaseTypeSuggestions}
                placeholder="Basic, Premium, Limited…"
              />
            </div>
          </div>
          <div>
            <span className="field-label">Notes</span>
            <textarea
              className="field-textarea"
              placeholder="Where you found it, tampo details, casting quirks…"
              value={record.diecast.notes}
              onChange={(e) => updateDiecast({ notes: e.target.value })}
            />
          </div>
        </div>
      )}

      {tab === 'GT Journal' && (
        <div className="space-y-4">
          {/* Permanent GT journal fields */}
          <div className="card-surface p-5 space-y-5">
            <p className="plate-label">Gran Turismo Garage</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="field-label">Game</span>
                <select className="field-input" value={record.gt.game} onChange={(e) => updateGt({ game: e.target.value })}>
                  <option value="">Select…</option>
                  <option>Gran Turismo 5</option>
                  <option>Gran Turismo 6</option>
                  <option>Gran Turismo Sport</option>
                  <option>Gran Turismo 7</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <span className="field-label">In-game model</span>
                <input
                  className="field-input"
                  placeholder="Exact GT model name"
                  value={record.gt.inGameModel}
                  onChange={(e) => updateGt({ inGameModel: e.target.value })}
                />
                {record.gt.game === 'Gran Turismo 7' && (
                  <div className="mt-1.5">
                    <GT7Matcher make={car.make} model={car.model} year={car.year} onPick={(name) => updateGt({ inGameModel: name })} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between gap-4 flex-wrap">
              <StarRating value={record.gt.rating} onChange={(n) => updateGt({ rating: n })} label="Driving enjoyment" />
              <PhotoUpload
                variant="button"
                value={record.gt.photo}
                onChange={(v) => updateGt({ photo: v })}
                label="GT Photo"
                buttonLabel={record.gt.photo ? 'Replace GT Photo' : 'Upload GT Photo'}
              />
            </div>

            <div>
              <span className="field-label">Driving tips</span>
              <textarea
                className="field-textarea"
                placeholder="How does it behave? What's the trick to driving it well?"
                value={record.gt.drivingTips}
                onChange={(e) => updateGt({ drivingTips: e.target.value })}
              />
            </div>
          </div>

          {/* Session history — logged from Take This Car Out */}
          {carSessions.length > 0 && (
            <div className="card-surface p-5">
              <p className="plate-label mb-3">Session History</p>
              <ul className="space-y-2.5">
                {(showAllSessions ? carSessions : carSessions.slice(0, 3)).map((s) => (
                  <li key={s.id} className="text-sm">
                    <span className="font-mono text-[10px] text-ink-soft dark:text-paper-soft block mb-0.5">
                      {new Date(s.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      {s.durationSec ? ` · ${formatDuration(s.durationSec)}` : ''}
                    </span>
                    {toText(s.focus)}
                  </li>
                ))}
              </ul>
              {carSessions.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllSessions((s) => !s)}
                  className="font-mono text-[10px] tracking-plate uppercase text-vermilion hover:underline mt-3"
                >
                  {showAllSessions ? 'Show fewer' : `Show all ${carSessions.length} sessions`}
                </button>
              )}
            </div>
          )}

          {/* Log a new note */}
          <div className="card-surface p-5">
            <p className="plate-label mb-3">Log New Note</p>
            <form onSubmit={submitDevNote} className="space-y-3">
              <textarea
                className="field-textarea"
                placeholder="What did you learn about this car today?"
                value={devNote}
                onChange={(e) => setDevNote(e.target.value)}
              />
              <button type="submit" className="btn-primary text-xs px-4 py-2">
                Add note
              </button>
            </form>
          </div>

          {/* Timeline of notes — the record of progression with this car */}
          {record.driverDev.length > 0 ? (
            <ol className="relative border-l border-canvas-line dark:border-garage-line ml-2">
              {[...record.driverDev].reverse().map((entry) => (
                <li key={entry.id} className="ml-5 mb-5 relative">
                  <span className="absolute -left-[26px] top-1 w-2.5 h-2.5 bg-vermilion" />
                  <p className="font-mono text-[10px] tracking-plate uppercase text-ink-soft dark:text-paper-soft mb-1">
                    {new Date(entry.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="card-surface p-4 flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{toText(entry.note)}</p>
                    <button
                      onClick={() => removeDevNote(entry.id)}
                      className="text-ink-soft dark:text-paper-soft hover:text-vermilion flex-shrink-0"
                      aria-label="Delete note"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-soft dark:text-paper-soft px-1">
              No notes yet. Log how your understanding of this car changes each time you drive it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
