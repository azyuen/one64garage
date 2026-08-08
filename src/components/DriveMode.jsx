import { useEffect, useMemo, useRef, useState } from 'react';
import { toText } from '../lib/format';
import driveModeSkin from '../assets/drive-mode-skin.webp';

// ---------------------------------------------------------------------------
// Visual/interaction layer only — state, effects, and data access follow the
// same patterns as the rest of the app (storage.js, useCars). The dashboard
// PNG (src/assets/drive-mode-skin.webp) is a fixed foreground skin; every
// piece of UI is positioned underneath it using percentage coordinates
// measured directly from the image's transparent cutouts (see README.md).
// ---------------------------------------------------------------------------

const ILLUM_STEPS = ['day', 'dusk', 'night'];

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

// Coordinates measured directly from the dashboard skin's actual transparent
// regions (and, for opaque button graphics, from their baked-in positions).
const LAYOUT = {
  header: { left: '17.23%', top: '7.04%', width: '60.81%', height: '5.84%' },
  gaugeLeft: { left: '19.01%', top: '17.05%', width: '12.35%', height: '17.05%' },
  gaugeCenter: { left: '43.38%', top: '17.05%', width: '12.63%', height: '17.05%' },
  gaugeRight: { left: '68.09%', top: '17.05%', width: '12.42%', height: '17.05%' },
  lcd: { left: '14.55%', top: '40.32%', width: '70.56%', height: '41.24%' },
  driveIndicator: { left: '26.29%', top: '89.99%', width: '1.99%', height: '1.58%' },
  notesIndicator: { left: '52.92%', top: '89.99%', width: '1.92%', height: '1.58%' },
  driveBtn: { left: '17.98%', top: '81.74%', width: '27%', height: '13.16%' },
  notesBtn: { left: '45%', top: '81.74%', width: '26.92%', height: '13.16%' },
  illumBtn: { left: '9.5%', top: '83.5%', width: '13%', height: '14%' },
  selectBtn: { left: '76.5%', top: '83.5%', width: '13.5%', height: '14%' },
  returnBtn: { left: '78%', top: '4%', width: '10%', height: '9%' },
};

// Shrinks text to fit its container's actual rendered width rather than a
// fixed breakpoint — a long car name on a big iPad Pro gets more room (and
// so stays larger) than the same name on a smaller iPad, and nothing ever
// overflows the header cutout regardless of name length.
function useFitText(text, maxPx, minPx = 12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = maxPx;
    el.style.fontSize = size + 'px';
    let guard = 0;
    while (el.scrollWidth > el.clientWidth && size > minPx && guard < 60) {
      size -= 1;
      el.style.fontSize = size + 'px';
      guard++;
    }
  }, [text, maxPx, minPx]);
  return ref;
}

export default function DriveMode({ car, record, sessions, onExit, onLogSession }) {
  const [screen, setScreen] = useState('drive'); // 'drive' | 'notes'
  const [illum, setIllum] = useState('day');
  const [noteText, setNoteText] = useState('');
  const [logged, setLogged] = useState(false);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const scrollRef = useRef(null);

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

  // The physical Select/scroll button pages through whichever screen is
  // currently showing, wrapping back to the top once it reaches the end.
  function scrollSelect() {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    el.scrollTo({ top: atEnd ? 0 : el.scrollTop + el.clientHeight * 0.85, behavior: 'smooth' });
  }

  const theme = themeFor(illum);

  const carSessions = useMemo(() => {
    if (!car) return [];
    return sessions.filter((s) => s.carId === car.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sessions, car]);

  const lastSession = carSessions[0] || null;

  const tipLines = useMemo(() => {
    const text = toText(record?.gt?.drivingTips);
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }, [record]);

  const historicalNote = toText(car?.history?.whyItMatters);

  function submitNote() {
    if (!car || !noteText.trim()) return;
    onLogSession(noteText.trim());
    setNoteText('');
    setLogged(true);
    setTimeout(() => setLogged(false), 2500);
  }

  const titleText = car ? [toText(car.make), toText(car.model), toText(car.variant), toText(car.year)].filter(Boolean).join(' ') : '';
  const titleRef = useFitText(titleText, 30, 13);

  return (
    <div className="fixed inset-0 z-50 bg-console-screen flex items-center justify-center p-3">
      {/* Fixed-aspect-ratio stage — scales to fit the viewport (letterboxed,
          never stretched or cropped); everything inside is positioned as a
          percentage of this box so it scales proportionally with it. */}
      <div
        className="relative"
        style={{
          width: 'min(100%, calc((100vh - 1.5rem) * 1457 / 1079))',
          aspectRatio: '1457 / 1079',
        }}
      >
        {!car ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-digital text-sm text-console-glow/60">NO VEHICLE SELECTED</p>
          </div>
        ) : (
          <>
            {/* Vehicle info header — right-aligned, shrinks to fit */}
            <div className="absolute flex items-center justify-end overflow-hidden px-[1.5%]" style={LAYOUT.header}>
              <p
                ref={titleRef}
                className={`font-mono ${theme.text} console-glow ${theme.dim} tracking-[0.08em] uppercase leading-none whitespace-nowrap text-right`}
              >
                {titleText}
              </p>
            </div>

            {/* Drive Timer — left gauge */}
            <div className="absolute flex flex-col items-center justify-center gap-0.5 px-1" style={LAYOUT.gaugeLeft}>
              <span className={`font-digital ${theme.text} console-glow ${theme.dim} leading-none`} style={{ fontSize: 'clamp(10px, 1.7vw, 20px)' }}>
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
            <div className="absolute flex flex-col items-center justify-center gap-0.5 px-1" style={LAYOUT.gaugeCenter}>
              <span className={`${theme.text} console-glow ${theme.dim} leading-none`} style={{ fontSize: 'clamp(10px, 1.5vw, 17px)' }}>
                {record?.gt?.rating > 0 ? '★'.repeat(record.gt.rating) + '☆'.repeat(5 - record.gt.rating) : '☆☆☆☆☆'}
              </span>
              <span className={`font-digital ${theme.text} opacity-70 leading-none`} style={{ fontSize: 'clamp(7px, 1vw, 12px)' }}>
                {record?.gt?.rating > 0 ? `${record.gt.rating}.0 / 5` : '\u2014 / 5'}
              </span>
            </div>

            {/* Vehicle Info — right gauge */}
            <div className="absolute flex flex-col items-center justify-center gap-0.5 px-1" style={LAYOUT.gaugeRight}>
              <span className={`font-digital ${theme.text} console-glow ${theme.dim} leading-none`} style={{ fontSize: 'clamp(10px, 1.7vw, 20px)' }}>
                {toText(car.tech?.horsepower) || '\u2014'}
              </span>
              <span className={`w-4 border-t ${theme.border} my-0.5`} />
              <span className={`font-digital ${theme.text} opacity-80 leading-none`} style={{ fontSize: 'clamp(9px, 1.3vw, 15px)' }}>
                {toText(car.tech?.drivetrain) || '\u2014'}
              </span>
            </div>

            {/* Main LCD content — larger opening, more room, minimal chrome */}
            <div className="absolute" style={LAYOUT.lcd}>
              <div ref={scrollRef} className="w-full h-full overflow-y-auto px-[3%] py-[2.5%]">
                {screen === 'drive' ? (
                  <div className="space-y-4">
                    <div>
                      <p className={`font-mono uppercase ${theme.text} ${theme.dim} mb-2`} style={{ fontSize: 'clamp(9px, 1vw, 13px)' }}>
                        Driving Tips
                      </p>
                      {tipLines.length > 0 ? (
                        <ul className="space-y-1.5">
                          {tipLines.map((line, i) => (
                            <li
                              key={i}
                              className={`font-digital ${theme.text} console-glow ${theme.dim} leading-snug flex gap-2`}
                              style={{ fontSize: 'clamp(13px, 1.7vw, 22px)' }}
                            >
                              <span className="opacity-60">&middot;</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`font-digital ${theme.text} opacity-55`} style={{ fontSize: 'clamp(12px, 1.5vw, 19px)' }}>
                          No tips recorded yet.
                        </p>
                      )}
                    </div>

                    <div className={`border-t ${theme.border} pt-3`}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <p className={`font-mono uppercase ${theme.text}`} style={{ fontSize: 'clamp(9px, 1vw, 13px)' }}>
                          Last Session Note
                        </p>
                        {lastSession && (
                          <span className={`font-mono ${theme.text} opacity-45`} style={{ fontSize: 'clamp(8px, 0.85vw, 11px)' }}>
                            {new Date(lastSession.date).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className={`font-digital ${theme.text} console-glow ${theme.dim} leading-relaxed`} style={{ fontSize: 'clamp(13px, 1.7vw, 22px)' }}>
                        {lastSession ? `\u201C${toText(lastSession.focus)}\u201D` : 'No sessions logged yet.'}
                      </p>
                    </div>

                    {historicalNote && (
                      <div className={`border-t ${theme.border} pt-3`}>
                        <p className={`font-mono uppercase ${theme.text} mb-1.5`} style={{ fontSize: 'clamp(9px, 1vw, 13px)' }}>
                          Historical Notes
                        </p>
                        <p className={`font-digital ${theme.text} ${theme.dim} leading-relaxed`} style={{ fontSize: 'clamp(12px, 1.5vw, 19px)' }}>
                          {historicalNote}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className={`font-mono uppercase ${theme.text} mb-2`} style={{ fontSize: 'clamp(9px, 1vw, 13px)' }}>
                        What did you learn this drive?
                      </p>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Impressions, setup notes, anything worth remembering…"
                        rows={3}
                        className={`w-full bg-transparent border ${theme.border} ${theme.text} font-digital p-2.5 rounded-sm focus:outline-none placeholder:opacity-35 resize-none`}
                        style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}
                      />
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={submitNote}
                          disabled={!noteText.trim()}
                          className={`font-mono uppercase border ${theme.border} ${theme.text} px-3 py-1.5 rounded-sm disabled:opacity-30`}
                          style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}
                        >
                          Save Note
                        </button>
                        {logged && (
                          <span className={`font-mono uppercase ${theme.text}`} style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}>
                            Saved.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`border-t ${theme.border} pt-3`}>
                      <p className={`font-mono uppercase ${theme.text} mb-2`} style={{ fontSize: 'clamp(9px, 1vw, 13px)' }}>
                        Session History
                      </p>
                      {carSessions.length > 0 ? (
                        <ul className="space-y-2.5">
                          {carSessions.map((s) => (
                            <li key={s.id}>
                              <span className={`font-mono ${theme.text} opacity-45 block`} style={{ fontSize: 'clamp(8px, 0.85vw, 11px)' }}>
                                {new Date(s.date).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                              </span>
                              <span className={`font-digital ${theme.text} ${theme.dim} leading-snug`} style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
                                {toText(s.focus)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`font-digital ${theme.text} opacity-55`} style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
                          No sessions logged yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drive/Notes active-state indicator pills (genuinely transparent
                in the skin) + their click targets */}
            <button onClick={() => setScreen('drive')} aria-label="Drive" className="absolute" style={LAYOUT.driveBtn} />
            <span
              className={`absolute rounded-full pointer-events-none ${screen === 'drive' ? `bg-console-glow ${theme.dim} console-glow` : 'bg-white/10'}`}
              style={LAYOUT.driveIndicator}
            />
            <button onClick={() => setScreen('notes')} aria-label="Notes" className="absolute" style={LAYOUT.notesBtn} />
            <span
              className={`absolute rounded-full pointer-events-none ${screen === 'notes' ? `bg-console-glow ${theme.dim} console-glow` : 'bg-white/10'}`}
              style={LAYOUT.notesIndicator}
            />
          </>
        )}

        {/* Illumination — cycles Day / Dusk / Night */}
        <button onClick={cycleIllum} aria-label="Illumination — cycle Day, Dusk, Night" className="absolute rounded-full" style={LAYOUT.illumBtn} />

        {/* Select/scroll — pages through the current screen's content */}
        <button onClick={scrollSelect} aria-label="Scroll display content" className="absolute rounded-full" style={LAYOUT.selectBtn} />

        {/* Return — back to the main app */}
        <button onClick={onExit} aria-label="Return to one64garage" className="absolute" style={LAYOUT.returnBtn} />

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
