import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const TABS = [
  { to: '/', label: 'Garage', match: (p) => p === '/' },
  { to: '/take-out', label: 'Take Out', match: (p) => p.startsWith('/take-out') },
  { to: '/journal', label: 'Journal', match: (p) => p.startsWith('/journal') },
  { to: '/add', label: 'Add Car', match: (p) => p.startsWith('/add') },
];

export default function Nav() {
  const { pathname } = useLocation();

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-canvas/90 dark:bg-garage/90 backdrop-blur border-b border-canvas-line dark:border-garage-line pt-safe">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display font-black text-lg tracking-tight">one64garage</span>
            <span className="hidden sm:inline font-mono text-[10px] tracking-plate text-ink-soft dark:text-paper-soft">
              壱号車庫
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {TABS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className={`px-4 py-2 text-sm tracking-wide transition-colors ${
                  t.match(pathname)
                    ? 'text-vermilion'
                    : 'text-ink-soft dark:text-paper-soft hover:text-ink dark:hover:text-paper'
                }`}
              >
                {t.label}
              </Link>
            ))}
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </div>
          <div className="sm:hidden">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Bottom tab bar — mobile only */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-canvas/95 dark:bg-garage/95 backdrop-blur border-t border-canvas-line dark:border-garage-line pb-safe">
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-col items-center justify-center gap-1 py-3.5 min-h-[52px] text-[11px] tracking-wide ${
                t.match(pathname) ? 'text-vermilion' : 'text-ink-soft dark:text-paper-soft'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
