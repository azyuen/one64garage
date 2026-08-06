import { useEffect, useMemo, useState } from 'react';
import { toText } from '../lib/format';
import driveModeSkin from '../assets/drive-mode-skin.webp';

// ---------------------------------------------------------------------------
// Visual-only layout note: this component's state, effects, and handlers are
// unchanged from the previous version. What changed is purely how they're
// rendered — the dashboard PNG (src/assets/drive-mode-skin.webp) is now a
// fixed foreground "skin", and every existing piece of UI (timer, rating,
// vehicle info, LCD tabs/content, Drive/Notes/Illum buttons) is repositioned
// underneath it using percentage coordinates measured directly from the
// image's transparent cutouts, so it lines up as real viewports into the
// live app rather than a redrawn imitation of one.
// ---------------------------------------------------------------------------

const ILLUM_STEPS = ['day', 'dusk', 'night'];
const ILLUM_LABEL = { day: 'DAY', dusk: 'DUSK', night: 'NIGHT' };

function themeFor(illum) {
  const isNight = illum === 'night';
  return {
    text: isNight ? 'text-console-glow-night' : 'text-console-glow',
    border: isNight ? 'border-console-glow-night/25' : 'border-console-glow/30',
    dim: illum === 'day' ? 'opacity-95' : illum === 'dusk' ? 'opacity-85' : 'opacity-70',
  };
}

function formatElapsed(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Percentage coordinates measured directly from the dashboard skin's actual
// transparent regions (and, for the title/knob, from its baked-in label
// positions) — see the design notes in README.md for how these were derived.
const LAYOUT = {
  title: { left: '53%', top: '4.3%', width: '33%', height: '5.5%' },
  driveTimer: { left: '19.24%', top: '16.51%', width: '14.54%', height: '19.54%' },
  garageRating: { left: '42.02%', top: '16.41%', width: '14.68%', height: '19.64%' },
  vehicleInfo: { left: '64.68%', top: '16.51%', width: '14.75%', height: '19.54%' },
  lcd: { left: '16.89%', top: '40.99%', width: '65.88%', height: '31.78%' },
  driveBtn: { left: '15.35%', top: '84.54%', width: '11.60%', height: '8.25%' },
  notesBtn: { left: '32.37%', top: '84.63%', width: '11.39%', height: '8.06%' },
  illumBtn: { left: '48.99%', top: '84.63%', width: '11.26%', height: '8.06%' },
  knob: { left: '70%', top: '77%', width: '16%', height: '21%' },
};

export default function DriveMode({ car, record, sessions, onExit, onLogSession }) {
  const [screen, setScreen] = useState('drive'); // 'drive' | 'notes'
  const [illum, setIllum] = useState('day');
  const [noteText, setNoteText] = useState('');
  const [logged, setLogged] = useState(false);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running, startedAt]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function toggleTimer() {
    if (running) {
      setRunning(false);
    } else {
      setStartedAt(Date.now() - elapsedSec * 1000);
      setRunning(true);
    }
  }

  function resetTimer() {
    setRunning(false);
    setElapsedSec(0);
  }

  function cycleIllum() {
    setIllum((i) => ILLUM_STEPS[(ILLUM_STEPS.indexOf(i) + 1) % ILLUM_STEPS.length]);
  }

  const theme = themeFor(illum);

  const lastSession = useMemo(() => {
    if (!car) return null;
    return sessions
      .filter((s) => s.carId === car.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }, [sessions, car]);

  const tipLines = useMemo(() => {
    const text = toText(record?.gt?.drivingTips);
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }, [record]);

  function submitNote() {
    if (!car || !noteText.trim()) return;
    onLogSession(noteText.trim());
    setNoteText('');
    setLogged(true);
    setTimeout(() => setLogged(false), 2500);
  }

  const tabBtn = (active) =>
    `font-mono uppercase leading-none ${active ? `${theme.text} ${theme.dim}` : `${theme.text} opacity-35 hover:opacity-55`}`;

  return (
    <div className="fixed inset-0 z-50 bg-console-screen flex items-center justify-center p-3">
      <button
        onClick={onExit}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 font-mono text-[10px] tracking-plate uppercase text-white/30 hover:text-white/70 px-2 py-1"
      >
        Exit
      </button>

      {/* Fixed-aspect-ratio stage — scales to fit the viewport (letterboxed,
          never stretched or cropped), everything inside is positioned as a
          percentage of this box so it scales proportionally with it. */}
      <div
        className="relative"
        style={{
          width: 'min(100%, calc((100vh - 1.5rem) * 1492 / 1054))',
          aspectRatio: '1492 / 1054',
        }}
      >
        {!car ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-digital text-sm text-console-glow/60">NO VEHICLE SELECTED</p>
          </div>
        ) : (
          <>
            {/* Title window */}
            <div className="absolute flex items-center justify-center overflow-hidden" style={LAYOUT.title}>
              <p
                className={`font-mono ${theme.text} console-glow ${theme.dim} tracking-[0.12em] uppercase leading-none truncate text-center`}
                style={{ fontSize: 'clamp(7px, 1.3vw, 15px)' }}
              >
                {[toText(car.make), toText(car.model), toText(car.variant), toText(car.year)].filter(Boolean).join(' ')}
              </p>
            </div>

            {/* Drive Timer — left gauge */}
            <div className="absolute flex flex-col items-center justify-center gap-0.5 px-1" style={LAYOUT.driveTimer}>
              <span className={`font-digital ${theme.text} console-glow ${theme.dim} leading-none`} style={{ fontSize: 'clamp(9px, 1.6vw, 19px)' }}>
                {formatElapsed(elapsedSec)}
              </span>
              <span className={`font-mono ${theme.text} opacity-50 leading-none`} style={{ fontSize: 'clamp(5px, 0.55vw, 8px)' }}>
                HRS MIN SEC
              </span>
              <button
                onClick={toggleTimer}
                onDoubleClick={resetTimer}
                className={`mt-1 font-mono uppercase border ${theme.border} ${theme.text} rounded-full px-2 py-0.5`}
                style={{ fontSize: 'clamp(6px, 0.7vw, 9px)' }}
              >
                {running ? 'Stop' : elapsedSec > 0 ? 'Resume' : 'Start'}
              </button>
            </div>

            {/* Garage Rating — centre gauge */}
            <div className="absolute flex flex-col items-center justify-center gap-0.5 px-1" style={LAYOUT.garageRating}>
              <span className={`${theme.text} console-glow ${theme.dim} leading-none`} style={{ fontSize: 'clamp(9px, 1.45vw, 16px)' }}>
                {record?.gt?.rating > 0 ? '★'.repeat(record.gt.rating) + '☆'.repeat(5 - record.gt.rating) : '☆☆☆☆☆'}
              </span>
              <span className={`font-digital ${theme.text} opacity-70 leading-none`} style={{ fontSize: 'clamp(7px, 0.95vw, 11px)' }}>
                {record?.gt?.rating > 0 ? `${record.gt.rating}.0 / 5` : '\u2014 / 5'}
              </span>
            </div>

            {/* Vehicle Info — right gauge */}
            <div className="absolute flex flex-col items-center justify-center gap-0.5 px-1" style={LAYOUT.vehicleInfo}>
              <span className={`font-digital ${theme.text} console-glow ${theme.dim} leading-none`} style={{ fontSize: 'clamp(9px, 1.6vw, 19px)' }}>
                {toText(car.tech?.horsepower) || '\u2014'}
              </span>
              <span className={`w-4 border-t ${theme.border} my-0.5`} />
              <span className={`font-digital ${theme.text} opacity-80 leading-none`} style={{ fontSize: 'clamp(8px, 1.25vw, 14px)' }}>
                {toText(car.tech?.drivetrain) || '\u2014'}
              </span>
            </div>

            {/* Main LCD content */}
            <div className="absolute flex flex-col" style={{ ...LAYOUT.lcd, padding: '2.2% 2.8%' }}>
              <div className="flex items-center justify-between flex-shrink-0 pb-[1%]">
                <div className="flex items-center gap-3">
                  <button onClick={() => setScreen('drive')} className={tabBtn(screen === 'drive')} style={{ fontSize: 'clamp(7px, 0.8vw, 11px)' }}>
                    Driving Tips &amp; Last Note
                  </button>
                  <button onClick={() => setScreen('notes')} className={tabBtn(screen === 'notes')} style={{ fontSize: 'clamp(7px, 0.8vw, 11px)' }}>
                    Add Session Note
                  </button>
                </div>
                <span className={`font-mono ${theme.text} opacity-45 flex-shrink-0`} style={{ fontSize: 'clamp(7px, 0.75vw, 10px)' }}>
                  {screen === 'drive' ? '1' : '2'} / 2
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                {screen === 'drive' ? (
                  <div className="space-y-3">
                    <div>
                      <p className={`font-mono uppercase ${theme.text} ${theme.dim} mb-1.5`} style={{ fontSize: 'clamp(7px, 0.8vw, 10px)' }}>
                        Key Driving Tips
                      </p>
                      {tipLines.length > 0 ? (
                        <ul className="space-y-1">
                          {tipLines.map((line, i) => (
                            <li
                              key={i}
                              className={`font-digital ${theme.text} console-glow ${theme.dim} leading-snug flex gap-1.5`}
                              style={{ fontSize: 'clamp(9px, 1.15vw, 15px)' }}
                            >
                              <span className="opacity-60">&middot;</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`font-digital ${theme.text} opacity-55`} style={{ fontSize: 'clamp(9px, 1.1vw, 14px)' }}>
                          No tips recorded yet.
                        </p>
                      )}
                    </div>

                    <div className={`border-t ${theme.border} pt-2.5`}>
                      <div className="flex items-baseline justify-between mb-1">
                        <p className={`font-mono uppercase ${theme.text}`} style={{ fontSize: 'clamp(7px, 0.8vw, 10px)' }}>
                          Last Session Note
                        </p>
                        {lastSession && (
                          <span className={`font-mono ${theme.text} opacity-45`} style={{ fontSize: 'clamp(6px, 0.7vw, 9px)' }}>
                            {new Date(lastSession.date).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className={`font-digital ${theme.text} console-glow ${theme.dim} leading-relaxed`} style={{ fontSize: 'clamp(9px, 1.15vw, 15px)' }}>
                        {lastSession ? `\u201C${toText(lastSession.focus)}\u201D` : 'No sessions logged yet.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col gap-2">
                    <p className={`font-mono uppercase ${theme.text} flex-shrink-0`} style={{ fontSize: 'clamp(7px, 0.8vw, 10px)' }}>
                      What did you learn this drive?
                    </p>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Impressions, setup notes, anything worth remembering…"
                      className={`flex-1 min-h-0 bg-transparent border ${theme.border} ${theme.text} font-digital p-2 rounded-sm focus:outline-none placeholder:opacity-35 resize-none`}
                      style={{ fontSize: 'clamp(9px, 1.1vw, 14px)' }}
                    />
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={submitNote}
                        disabled={!noteText.trim()}
                        className={`font-mono uppercase border ${theme.border} ${theme.text} px-3 py-1.5 rounded-sm disabled:opacity-30`}
                        style={{ fontSize: 'clamp(7px, 0.8vw, 10px)' }}
                      >
                        Save Note
                      </button>
                      {logged && (
                        <span className={`font-mono uppercase ${theme.text}`} style={{ fontSize: 'clamp(7px, 0.8vw, 10px)' }}>
                          Saved to driving journal.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 flex-shrink-0 pt-[1%]">
                <span className={`w-1.5 h-1.5 rounded-full ${screen === 'drive' ? `bg-console-glow ${theme.dim}` : 'bg-white/15'}`} />
                <span className={`w-1.5 h-1.5 rounded-full ${screen === 'notes' ? `bg-console-glow ${theme.dim}` : 'bg-white/15'}`} />
              </div>
            </div>

            {/* Button state indicators + hit targets — sized to the image's
                actual small transparent windows beneath each physical label,
                which are already drawn into the skin. */}
            <button
              onClick={() => setScreen('drive')}
              aria-label="Drive"
              className="absolute flex items-center justify-center"
              style={LAYOUT.driveBtn}
            >
              {screen === 'drive' && <span className={`w-2/3 h-1/3 rounded-sm bg-console-glow/15 border ${theme.border}`} />}
            </button>
            <button
              onClick={() => setScreen('notes')}
              aria-label="Notes"
              className="absolute flex items-center justify-center"
              style={LAYOUT.notesBtn}
            >
              {screen === 'notes' && <span className={`w-2/3 h-1/3 rounded-sm bg-console-glow/15 border ${theme.border}`} />}
            </button>
            <button
              onClick={cycleIllum}
              aria-label="Illumination — push to cycle Day, Dusk, Night"
              className="absolute flex items-center justify-center"
              style={LAYOUT.illumBtn}
            >
              <span className={`font-mono uppercase ${theme.text} ${theme.dim}`} style={{ fontSize: 'clamp(6px, 0.75vw, 9px)' }}>
                {ILLUM_LABEL[illum]}
              </span>
            </button>
          </>
        )}

        {/* Rotary knob — decorative per the dashboard skin; click cycles
            illumination, the same interaction this control already had. */}
        <button
          onClick={cycleIllum}
          aria-label="Push select — cycle illumination"
          className="absolute rounded-full"
          style={LAYOUT.knob}
        />

        {/* Dashboard skin — fixed, never stretched/cropped, sits on top with
            pointer-events disabled so every click passes through to the
            real controls positioned beneath it. */}
        <img
          src={driveModeSkin}
          alt=""
          draggable="false"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
        />
      </div>
    </div>
  );
}
