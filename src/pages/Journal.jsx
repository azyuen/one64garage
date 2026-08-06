import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCars } from '../lib/useCars';
import { getSessions, exportAllData, importAllData, getLastExportAt, setLastExportAt, getLocalStorageBytes, getStorageEstimate } from '../lib/storage';
import { toText } from '../lib/format';

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

const PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: '3months', label: 'Last 3 Months' },
  { key: 'year', label: 'This Year' },
];

function periodStartFor(period) {
  const now = new Date();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === '3months') return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  return null;
}

function topCounts(sessionList, cars, keyFn, limit = 3) {
  const counts = {};
  sessionList.forEach((s) => {
    const car = cars.find((c) => c.id === s.carId);
    if (!car) return;
    const key = keyFn(car);
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export default function Journal() {
  const { cars, records, hiddenSeedCars, unhideSeedCar, unhideAllSeedCars } = useCars();
  const sessions = getSessions();
  const restoreInputRef = useRef(null);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [period, setPeriod] = useState('all');
  const [lastExportAt, setLastExportAtState] = useState(() => getLastExportAt());
  const [storageEstimate, setStorageEstimate] = useState(null);

  useEffect(() => {
    getStorageEstimate().then(setStorageEstimate);
  }, []);

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `one64garage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const now = new Date().toISOString();
    setLastExportAt(now);
    setLastExportAtState(now);
  }

  function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.customCars && !data.records && !data.sessions) {
          setRestoreMsg('That file doesn\u2019t look like a one64garage backup.');
          return;
        }
        const confirmed = confirm(
          'Restoring will completely replace everything currently in the app — all cars, diecast records, journal entries, and sessions — with the contents of this backup. This can\u2019t be undone. Continue?'
        );
        if (!confirmed) return;
        importAllData(data);
        setRestoreMsg('Backup restored — reloading\u2026');
        setTimeout(() => window.location.reload(), 600);
      } catch {
        setRestoreMsg('That file is not valid JSON.');
      }
    };
    reader.readAsText(file);
  }

  const stats = useMemo(() => {
    const studyingCount = cars.filter((c) => records[c.id]?.status === 'studying').length;

    const now = new Date();
    const sessionsThisCalendarMonth = sessions.filter((s) => {
      const d = new Date(s.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const carsDrivenThisCalendarMonth = new Set(sessionsThisCalendarMonth.map((s) => s.carId)).size;
    const uniqueCarsDriven = new Set(sessions.map((s) => s.carId)).size;

    const ratings = cars.map((c) => records[c.id]?.gt?.rating).filter((r) => r > 0);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

    // Last 6 months of session activity, oldest to newest.
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }
    const countsByMonth = Object.fromEntries(months.map((k) => [k, 0]));
    sessions.forEach((s) => {
      const k = monthKey(s.date);
      if (k in countsByMonth) countsByMonth[k]++;
    });
    const monthly = months.map((k) => ({ key: k, label: monthLabel(k), count: countsByMonth[k] }));
    const maxMonthly = Math.max(1, ...monthly.map((m) => m.count));

    // Most driven cars, all time.
    const sessionCounts = {};
    sessions.forEach((s) => {
      sessionCounts[s.carId] = (sessionCounts[s.carId] || 0) + 1;
    });
    const mostDriven = Object.entries(sessionCounts)
      .map(([carId, count]) => ({ car: cars.find((c) => c.id === carId), count }))
      .filter((e) => e.car)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Driving habits for the selected period.
    const periodStart = periodStartFor(period);
    const periodSessions = periodStart ? sessions.filter((s) => new Date(s.date) >= periodStart) : sessions;
    const topMakes = topCounts(periodSessions, cars, (c) => c.make);
    const topDrivetrains = topCounts(periodSessions, cars, (c) => c.tech?.drivetrain);

    // Combined recent activity feed: driver dev notes + take-out sessions.
    // Each session only ever produces one feed entry — sessions no longer
    // also create a duplicate driver-development note.
    const feed = [];
    cars.forEach((c) => {
      (records[c.id]?.driverDev || []).forEach((n) => {
        feed.push({ id: `note-${n.id}`, date: n.date, carId: c.id, text: n.note, type: 'Note' });
      });
    });
    sessions.forEach((s) => {
      feed.push({ id: `session-${s.id}`, date: s.date, carId: s.carId, text: s.focus, type: 'Session' });
    });
    feed.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      studyingCount,
      uniqueCarsDriven,
      sessionsThisMonth: sessionsThisCalendarMonth.length,
      carsDrivenThisMonth: carsDrivenThisCalendarMonth,
      avgRating,
      totalSessions: sessions.length,
      monthly,
      maxMonthly,
      mostDriven,
      topMakes,
      topDrivetrains,
      feed: feed.slice(0, 12),
    };
  }, [cars, records, sessions, period]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-12">
      <p className="plate-label mb-2">The Log Book</p>
      <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight mb-6">Journal</h1>

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
        {[
          ['Cars', cars.length],
          ['Unique Cars Driven', stats.uniqueCarsDriven],
          ['Studying', stats.studyingCount],
          ['Sessions Logged', stats.totalSessions],
          ['Sessions This Month', stats.sessionsThisMonth],
          ['Cars Driven This Month', stats.carsDrivenThisMonth],
          ['Avg. Driving Enjoyment', stats.avgRating ? `${stats.avgRating}★` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="card-surface p-4">
            <p className="font-mono text-2xl font-bold">{value}</p>
            <p className="plate-label mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Driving habits */}
      <section className="card-surface p-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p className="plate-label">Driving Habits</p>
          <select
            className="field-input w-auto text-xs py-1.5"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Time period"
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {stats.topMakes.length === 0 ? (
          <p className="text-sm text-ink-soft dark:text-paper-soft">No sessions logged in this period yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="field-label mb-2">Most Driven Manufacturer</p>
              <ul className="space-y-2">
                {stats.topMakes.map((m, i) => (
                  <li key={m.key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-ink-soft dark:text-paper-soft w-3">{i + 1}</span>
                      <span className="truncate">{m.key}</span>
                    </span>
                    <span className="font-mono text-xs text-ink-soft dark:text-paper-soft flex-shrink-0">
                      {m.count} session{m.count === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="field-label mb-2">Favourite Drivetrain</p>
              <ul className="space-y-2">
                {stats.topDrivetrains.map((d, i) => (
                  <li key={d.key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-ink-soft dark:text-paper-soft w-3">{i + 1}</span>
                      <span className="truncate">{d.key}</span>
                    </span>
                    <span className="font-mono text-xs text-ink-soft dark:text-paper-soft flex-shrink-0">
                      {d.count} session{d.count === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Drives per month */}
      <section className="card-surface p-5 mb-6">
        <p className="plate-label mb-4">Drives Per Month</p>
        {stats.totalSessions === 0 ? (
          <p className="text-sm text-ink-soft dark:text-paper-soft">
            No sessions logged yet — use "Take This Car Out" to start building a driving history.
          </p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-32">
            {stats.monthly.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-mono text-[10px] text-ink-soft dark:text-paper-soft">{m.count || ''}</span>
                <div
                  className={`w-full ${m.count ? 'bg-vermilion' : 'bg-canvas-line dark:bg-garage-line'}`}
                  style={{ height: `${Math.max(4, (m.count / stats.maxMonthly) * 100)}%` }}
                />
                <span className="font-mono text-[10px] tracking-plate uppercase text-ink-soft dark:text-paper-soft">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Most driven */}
      <section className="card-surface p-5 mb-6">
        <p className="plate-label mb-4">Most Driven Cars</p>
        {stats.mostDriven.length === 0 ? (
          <p className="text-sm text-ink-soft dark:text-paper-soft">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-3">
            {stats.mostDriven.map(({ car, count }, i) => (
              <li key={car.id}>
                <Link to={`/car/${car.id}`} className="flex items-center justify-between gap-3 group">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-ink-soft dark:text-paper-soft w-4">{i + 1}</span>
                    <span className="text-sm font-semibold truncate group-hover:text-vermilion transition-colors">
                      {toText(car.make)} {toText(car.model)} {toText(car.variant)}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-ink-soft dark:text-paper-soft flex-shrink-0">
                    {count} session{count === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent activity feed */}
      <section className="card-surface p-5">
        <p className="plate-label mb-4">Recent Journal Activity</p>
        {stats.feed.length === 0 ? (
          <p className="text-sm text-ink-soft dark:text-paper-soft">
            Nothing here yet. Driver development notes and take-out sessions will show up as you log them.
          </p>
        ) : (
          <ul className="space-y-4">
            {stats.feed.map((entry) => {
              const car = cars.find((c) => c.id === entry.carId);
              return (
                <li key={entry.id} className="hairline pt-4 first:pt-0 first:border-t-0">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <Link to={`/car/${entry.carId}`} className="text-sm font-semibold hover:text-vermilion transition-colors truncate">
                      {car ? `${toText(car.make)} ${toText(car.model)} ${toText(car.variant)}` : 'Unknown car'}
                    </Link>
                    <span className="font-mono text-[10px] tracking-plate uppercase text-ink-soft dark:text-paper-soft flex-shrink-0">
                      {entry.type} · {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-ink-soft dark:text-paper-soft leading-relaxed line-clamp-2">{toText(entry.text)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Hidden example cars */}
      {hiddenSeedCars().length > 0 && (
        <section className="card-surface p-5 mt-6">
          <p className="plate-label mb-1">Hidden Example Cars</p>
          <p className="text-xs text-ink-soft dark:text-paper-soft mb-4">
            Built-in example cars you've removed from your garage on this device.
          </p>
          <ul className="space-y-2">
            {hiddenSeedCars().map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  {toText(c.make)} {toText(c.model)} <span className="text-ink-soft dark:text-paper-soft">{toText(c.variant)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => unhideSeedCar(c.id)}
                  className="font-mono text-[10px] tracking-plate uppercase text-vermilion hover:underline flex-shrink-0"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
          {hiddenSeedCars().length > 1 && (
            <button
              type="button"
              onClick={unhideAllSeedCars}
              className="btn-ghost text-xs px-4 py-2 mt-4"
            >
              Restore all
            </button>
          )}
        </section>
      )}

      {/* Backup */}
      <section className="card-surface p-5 mt-6">
        <p className="plate-label mb-1">Backup Your Data</p>
        <p className="text-xs text-ink-soft dark:text-paper-soft mb-1">
          Everything here lives only in this browser. Export a backup occasionally, or before switching devices.
        </p>
        <p className="font-mono text-[11px] text-ink-soft dark:text-paper-soft mb-1">
          {lastExportAt
            ? `Last exported: ${new Date(lastExportAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
            : 'No backup exported yet on this device.'}
        </p>
        <p className="font-mono text-[11px] text-ink-soft dark:text-paper-soft mb-4">
          {storageEstimate?.quota
            ? `Using ~${(storageEstimate.usage / 1024 / 1024).toFixed(1)} MB of ~${(storageEstimate.quota / 1024 / 1024).toFixed(0)} MB available in this browser.`
            : `Using ~${((getLocalStorageBytes() || 0) / 1024).toFixed(0)} KB of local storage.`}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleExport} className="btn-ghost text-xs px-4 py-2">
            Export backup
          </button>
          <button type="button" onClick={() => restoreInputRef.current?.click()} className="btn-ghost text-xs px-4 py-2">
            Restore from backup
          </button>
          <input ref={restoreInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleRestoreFile} />
        </div>
        {restoreMsg && <p className="text-xs text-vermilion mt-3">{restoreMsg}</p>}

        <details className="mt-4">
          <summary className="text-xs text-ink-soft dark:text-paper-soft cursor-pointer hover:text-vermilion">
            Syncing between iPhone and iPad?
          </summary>
          <div className="text-xs text-ink-soft dark:text-paper-soft mt-2 space-y-2 leading-relaxed">
            <p>
              Browsers deliberately don't let a website remember or reopen a specific folder on your device between visits —
              that's a privacy boundary, not something this app can switch on, and it's especially locked down in Safari on
              iOS. So there's no "export to last saved location" this app can offer honestly.
            </p>
            <p>
              What does help: tap <strong>Export backup</strong>, then in the share sheet choose{' '}
              <strong>Save to Files → iCloud Drive</strong> and pick (or create) a folder like "one64garage" — do that once,
              and iOS's own Save dialog will often default back to that same folder next time on its own, independent of
              anything this app does. Do that on both devices and <strong>Restore from backup</strong> on the other one
              afterwards to bring it across.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
