import { useMemo, useState } from 'react';
import { useCars } from '../lib/useCars';
import CarCard from '../components/CarCard';
import CarListRow from '../components/CarListRow';
import { Link } from 'react-router-dom';
import { getDisplayPrefs, setDisplayPrefs, getSessions, isDrivenThisMonth } from '../lib/storage';

const STATUS_FILTERS = [
  { key: 'all', label: 'All Cars' },
  { key: 'driven', label: 'Driven This Month' },
  { key: 'studying', label: 'Studying' },
];

const SORTS = [
  { key: 'make-asc', label: 'Make, A–Z' },
  { key: 'year-desc', label: 'Year, Newest First' },
  { key: 'year-asc', label: 'Year, Oldest First' },
  { key: 'recent', label: 'Recently Added' },
];

const RATING_FILTERS = [
  { key: 'all', label: 'Any Rating' },
  { key: '5', label: '★★★★★ only' },
  { key: '4', label: '★★★★+ and up' },
  { key: '3', label: '★★★+ and up' },
  { key: '2', label: '★★+ and up' },
  { key: '1', label: '★+ and up' },
];

export default function Garage() {
  const { cars, records } = useCars();
  const [prefs, setPrefs] = useState(() => getDisplayPrefs());

  function updatePrefs(patch) {
    setPrefs(setDisplayPrefs(patch));
  }

  const sessions = getSessions();

  const makes = useMemo(() => {
    const set = new Set(cars.map((c) => c.make).filter(Boolean));
    return Array.from(set).sort();
  }, [cars]);

  const drivetrains = useMemo(() => {
    const set = new Set(cars.map((c) => c.tech?.drivetrain).filter(Boolean));
    return Array.from(set).sort();
  }, [cars]);

  const visible = useMemo(() => {
    let list = [...cars];

    if (prefs.statusFilter === 'studying') {
      list = list.filter((c) => records[c.id]?.status === 'studying');
    } else if (prefs.statusFilter === 'driven') {
      list = list.filter((c) => isDrivenThisMonth(c.id, sessions));
    }
    if (prefs.makeFilter !== 'all') {
      list = list.filter((c) => c.make === prefs.makeFilter);
    }
    if (prefs.driveFilter !== 'all') {
      list = list.filter((c) => c.tech?.drivetrain === prefs.driveFilter);
    }
    if (prefs.ratingFilter !== 'all') {
      const min = Number(prefs.ratingFilter);
      list = list.filter((c) => (records[c.id]?.gt?.rating || 0) >= min);
    }

    switch (prefs.sort) {
      case 'year-desc':
        list.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
        break;
      case 'year-asc':
        list.sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0));
        break;
      case 'recent':
        list.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
        break;
      case 'make-asc':
      default:
        list.sort((a, b) => (a.make + a.model).localeCompare(b.make + b.model));
        break;
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars, records, prefs]);

  const compact = prefs.columns === 2;
  const gridClass = compact
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-12">
      <div className="mb-8">
        <p className="plate-label mb-2">{cars.length.toString().padStart(3, '0')} vehicles on record</p>
        <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">The Garage</h1>
        <p className="mt-2 text-sm text-ink-soft dark:text-paper-soft max-w-md">
          A personal record of cars discovered through model and simulation — one plate, one exhibit, one car at a time.
        </p>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto no-scrollbar">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => updatePrefs({ statusFilter: f.key })}
            className={`px-3.5 py-1.5 text-xs tracking-wide whitespace-nowrap border transition-colors ${
              prefs.statusFilter === f.key
                ? 'border-vermilion text-vermilion'
                : 'border-canvas-line dark:border-garage-line text-ink-soft dark:text-paper-soft hover:text-ink dark:hover:text-paper'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort / make / drivetrain / rating / view controls */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select
          className="field-input w-auto text-xs py-1.5"
          value={prefs.sort}
          onChange={(e) => updatePrefs({ sort: e.target.value })}
          aria-label="Sort cars"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>

        <select
          className="field-input w-auto text-xs py-1.5"
          value={prefs.makeFilter}
          onChange={(e) => updatePrefs({ makeFilter: e.target.value })}
          aria-label="Filter by make"
        >
          <option value="all">All Makes ({cars.length})</option>
          {makes.map((m) => (
            <option key={m} value={m}>
              {m} ({cars.filter((c) => c.make === m).length})
            </option>
          ))}
        </select>

        <select
          className="field-input w-auto text-xs py-1.5"
          value={prefs.driveFilter}
          onChange={(e) => updatePrefs({ driveFilter: e.target.value })}
          aria-label="Filter by drivetrain"
        >
          <option value="all">All Drivetrains</option>
          {drivetrains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className="field-input w-auto text-xs py-1.5"
          value={prefs.ratingFilter}
          onChange={(e) => updatePrefs({ ratingFilter: e.target.value })}
          aria-label="Filter by driving enjoyment rating"
        >
          {RATING_FILTERS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1 border border-canvas-line dark:border-garage-line">
          <button
            onClick={() => updatePrefs({ view: 'grid' })}
            aria-label="Card view"
            className={`px-2.5 h-8 flex items-center justify-center text-xs ${
              prefs.view === 'grid' ? 'text-vermilion' : 'text-ink-soft dark:text-paper-soft'
            }`}
          >
            Cards
          </button>
          <span className="w-px h-4 bg-canvas-line dark:bg-garage-line" />
          <button
            onClick={() => updatePrefs({ view: 'list' })}
            aria-label="List view"
            className={`px-2.5 h-8 flex items-center justify-center text-xs ${
              prefs.view === 'list' ? 'text-vermilion' : 'text-ink-soft dark:text-paper-soft'
            }`}
          >
            List
          </button>
        </div>

        {prefs.view === 'grid' && (
          <div className="flex items-center gap-1 border border-canvas-line dark:border-garage-line sm:hidden">
            <button
              onClick={() => updatePrefs({ columns: 1 })}
              aria-label="One column"
              className={`w-8 h-8 flex items-center justify-center text-xs ${
                prefs.columns === 1 ? 'text-vermilion' : 'text-ink-soft dark:text-paper-soft'
              }`}
            >
              1×
            </button>
            <span className="w-px h-4 bg-canvas-line dark:bg-garage-line" />
            <button
              onClick={() => updatePrefs({ columns: 2 })}
              aria-label="Two columns"
              className={`w-8 h-8 flex items-center justify-center text-xs ${
                prefs.columns === 2 ? 'text-vermilion' : 'text-ink-soft dark:text-paper-soft'
              }`}
            >
              2×
            </button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-ink-soft dark:text-paper-soft mb-4">
            {cars.length === 0
              ? 'No cars in the garage yet.'
              : 'No cars match these filters.'}
          </p>
          <Link to="/add" className="btn-primary">
            Add a car
          </Link>
        </div>
      ) : prefs.view === 'list' ? (
        <div className="card-surface">
          {visible.map((car, i) => (
            <CarListRow
              key={car.id}
              car={car}
              record={records[car.id]}
              index={i}
              drivenThisMonth={isDrivenThisMonth(car.id, sessions)}
            />
          ))}
        </div>
      ) : (
        <div className={gridClass}>
          {visible.map((car, i) => (
            <CarCard
              key={car.id}
              car={car}
              record={records[car.id]}
              index={i}
              compact={compact}
              drivenThisMonth={isDrivenThisMonth(car.id, sessions)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
