import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCars } from '../lib/useCars';
import { getRecord, logSession, getSessions } from '../lib/storage';
import { toText } from '../lib/format';
import { useDriveModeEligible } from '../lib/useDriveMode';
import DriveMode from '../components/DriveMode';

export default function TakeOut() {
  const [params, setParams] = useSearchParams();
  const { cars, refresh } = useCars();
  const [carId, setCarId] = useState(params.get('car') || '');
  const [selectedMake, setSelectedMake] = useState('');
  const [reflection, setReflection] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [driveModeActive, setDriveModeActive] = useState(false);
  const [driveModeDismissed, setDriveModeDismissed] = useState(false);
  const { eligible, isIPad } = useDriveModeEligible();

  function rollSuggestion(list) {
    if (!list.length) {
      setSuggestion(null);
      return;
    }
    const pick = list[Math.floor(Math.random() * list.length)];
    setSuggestion(pick);
  }

  useEffect(() => {
    if (cars.length && !suggestion) rollSuggestion(cars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars.length]);

  useEffect(() => {
    const fromUrl = params.get('car');
    if (fromUrl) setCarId(fromUrl);
  }, [params]);

  const car = cars.find((c) => c.id === carId);
  const record = car ? getRecord(car.id) : null;
  const allSessions = useMemo(() => getSessions(), [confirmed]);
  const sessions = useMemo(() => (car ? allSessions.filter((s) => s.carId === car.id) : []), [allSessions, car]);

  // Keep the Make dropdown in sync whenever the car changes from elsewhere
  // (a direct link, the shuffle suggestion) — otherwise the two-step
  // selector would look out of sync with reality.
  useEffect(() => {
    if (car) setSelectedMake(car.make);
  }, [car]);

  const makes = useMemo(() => Array.from(new Set(cars.map((c) => c.make).filter(Boolean))).sort(), [cars]);
  const modelsForMake = useMemo(
    () =>
      cars
        .filter((c) => c.make === selectedMake)
        .sort((a, b) => (a.model + a.variant).localeCompare(b.model + b.variant)),
    [cars, selectedMake]
  );

  // Auto-enter Drive Mode once a car is selected on a landscape,
  // tablet-width screen. There's no web API for "device unlocked" (browsers
  // don't expose lock-screen state), so orientation + width is the closest
  // real signal. Resets if you pick a different car, so exiting manually
  // doesn't get immediately overridden while you're still deciding.
  useEffect(() => {
    setDriveModeDismissed(false);
  }, [carId]);

  useEffect(() => {
    if (eligible && car && !driveModeDismissed) setDriveModeActive(true);
    if (!eligible) setDriveModeActive(false);
  }, [eligible, car, driveModeDismissed]);

  function exitDriveMode() {
    setDriveModeActive(false);
    setDriveModeDismissed(true);
  }

  const lastDevNote = record?.driverDev?.length ? [...record.driverDev].slice(-1)[0] : null;
  const lastDevNoteText = lastDevNote ? toText(lastDevNote.note) : '';
  const drivingTipsText = toText(record?.gt?.drivingTips);

  // This is a reflection prompt, not a pre-drive plan — the point is to
  // capture what you noticed after driving, not to decide a focus beforehand.
  const reflectionPrompt = !record
    ? ''
    : lastDevNoteText
    ? `Last time: "${lastDevNoteText.slice(0, 80)}${lastDevNoteText.length > 80 ? '…' : ''}" — how did it feel this time?`
    : drivingTipsText
    ? `Keep in mind: ${drivingTipsText.slice(0, 70)}`
    : 'What did you notice? Handling, setup changes, anything memorable…';

  function selectMake(make) {
    setSelectedMake(make);
    if (car && car.make !== make) selectCar('');
  }

  function selectCar(id) {
    setCarId(id);
    setParams(id ? { car: id } : {});
    setReflection('');
    setConfirmed(false);
  }

  function recordSession(focusText) {
    if (!car) return;
    logSession({ carId: car.id, focus: focusText });
    refresh();
    setConfirmed(true);
  }

  function logSessionFromForm() {
    const focus = reflection.trim() || reflectionPrompt;
    recordSession(focus);
    setReflection('');
  }

  if (driveModeActive && car) {
    return <DriveMode car={car} record={record} sessions={allSessions} onExit={exitDriveMode} onLogSession={recordSession} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-12">
      <p className="plate-label mb-2">The Driving Journal</p>
      <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight mb-6">Take This Car Out</h1>

      <div className="card-surface p-5 mb-6 space-y-4">
        <div>
          <span className="field-label">1. Select make</span>
          <select className="field-input" value={selectedMake} onChange={(e) => selectMake(e.target.value)}>
            <option value="">Select a make…</option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="field-label">2. Select model</span>
          <select
            className="field-input"
            value={carId}
            onChange={(e) => selectCar(e.target.value)}
            disabled={!selectedMake}
          >
            <option value="">{selectedMake ? 'Select a model…' : 'Choose a make first'}</option>
            {modelsForMake.map((c) => (
              <option key={c.id} value={c.id}>
                {c.model} {c.variant} ({c.year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!car && suggestion && (
        <button
          type="button"
          onClick={() => selectCar(suggestion.id)}
          className="w-full text-left card-surface p-5 mb-6 flex items-center gap-4 hover:border-vermilion transition-colors group"
        >
          <div className="w-14 h-14 flex-shrink-0 bg-canvas dark:bg-garage border border-canvas-line dark:border-garage-line overflow-hidden flex items-center justify-center">
            {getRecord(suggestion.id)?.diecast?.photo || suggestion.heroImage ? (
              <img
                src={getRecord(suggestion.id)?.diecast?.photo || suggestion.heroImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-mono text-[8px] text-ink-soft dark:text-paper-soft">NO PHOTO</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="plate-label mb-1">Feeling undecided?</p>
            <p className="font-display font-bold text-base group-hover:text-vermilion transition-colors">
              Why not take the {toText(suggestion.make)} {toText(suggestion.model)} {toText(suggestion.variant)} for a spin?
            </p>
          </div>
          <span
            role="button"
            tabIndex={0}
            aria-label="Shuffle suggestion"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              rollSuggestion(cars);
            }}
            className="flex-shrink-0 font-mono text-[10px] tracking-plate uppercase text-ink-soft dark:text-paper-soft hover:text-vermilion px-2 py-1 border border-canvas-line dark:border-garage-line"
          >
            Shuffle
          </span>
        </button>
      )}

      {car && record && (
        <div className="space-y-6">
          <div className="card-surface overflow-hidden">
            <div className="aspect-[16/9] bg-canvas dark:bg-garage border-b border-canvas-line dark:border-garage-line flex items-center justify-center overflow-hidden">
              {record.diecast.photo || car.heroImage ? (
                <img src={record.diecast.photo || car.heroImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono text-xs tracking-plate text-ink-soft dark:text-paper-soft">NO PHOTO YET</span>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="plate-label mb-1">{toText(car.make)} · {toText(car.year)}</p>
                  <h2 className="font-display font-black text-xl">
                    {toText(car.model)} <span className="text-ink-soft dark:text-paper-soft font-medium">{toText(car.variant)}</span>
                  </h2>
                  <p className="font-mono text-xs text-ink-soft dark:text-paper-soft mt-2">
                    {record.gt.game || 'GT version not set'} {record.gt.inGameModel ? `· ${record.gt.inGameModel}` : ''}
                  </p>
                  {record.gt.rating > 0 && (
                    <p className="text-vermilion mt-2" aria-label={`${record.gt.rating} out of 5 stars`}>
                      {'★'.repeat(record.gt.rating)}
                      <span className="text-canvas-line dark:text-garage-line">{'★'.repeat(5 - record.gt.rating)}</span>
                    </p>
                  )}
                </div>
                {isIPad && (
                  <button
                    onClick={() => {
                      setDriveModeDismissed(false);
                      setDriveModeActive(true);
                    }}
                    className="btn-ghost text-xs px-3 py-1.5 flex-shrink-0"
                  >
                    Drive Mode
                  </button>
                )}
              </div>
              {isIPad && !eligible && (
                <p className="text-[11px] text-ink-soft dark:text-paper-soft mt-2">
                  Drive Console works best in landscape — rotate your iPad, or tap "Drive Mode" to try it anyway.
                </p>
              )}
            </div>
          </div>

          {lastDevNote && (
            <div className="card-surface p-5">
              <p className="plate-label mb-2">Previous notes</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{lastDevNoteText}</p>
            </div>
          )}

          <div className="card-surface p-5 space-y-4">
            <div>
              <p className="plate-label mb-1">What I Learned</p>
              <p className="text-xs text-ink-soft dark:text-paper-soft">
                Go drive it in Gran Turismo, then come back and log your reflections — impressions, setup notes, anything
                worth remembering.
              </p>
            </div>
            <textarea
              className="field-textarea"
              placeholder={reflectionPrompt}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
            <p className="text-xs text-ink-soft dark:text-paper-soft">
              Prompt: <span className="italic">{reflectionPrompt}</span>
            </p>
            <button className="btn-primary" onClick={logSessionFromForm}>
              Log session
            </button>
            {confirmed && (
              <p className="font-mono text-[11px] tracking-plate uppercase text-vermilion">Session logged. Nice drive.</p>
            )}
          </div>

          {sessions.length > 0 && (
            <div className="card-surface p-5">
              <p className="plate-label mb-3">Session history</p>
              <ul className="space-y-3">
                {sessions.slice(0, 6).map((s) => (
                  <li key={s.id} className="text-sm">
                    <span className="font-mono text-[10px] text-ink-soft dark:text-paper-soft block mb-0.5">
                      {new Date(s.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    {toText(s.focus)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!car && cars.length === 0 && (
        <p className="text-sm text-ink-soft dark:text-paper-soft">Add a car to the garage first.</p>
      )}
    </div>
  );
}
