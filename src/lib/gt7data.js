// Matches a real-world car (make/model/year) against Gran Turismo 7's actual
// in-game car list, to suggest the exact in-game name (e.g. "R32 GT-R V-spec
// II '94") instead of leaving it to be typed from memory.
//
// Data source: ddm999/gt7info — a community-maintained, actively-updated
// GT7 car database published as plain CSV on GitHub Pages. It's relied on by
// several third-party GT7 tools (telemetry loggers, dashboards), which is
// good evidence it's stable and genuinely meant for this kind of external
// use. See https://github.com/ddm999/gt7info
//
// Honest limitation: this dataset only covers GT7. There's no equivalent
// live, structured, CORS-friendly source for GT5/GT6/Sport that this app
// could verify — matching for those games still relies on manual entry.

const CARS_URL = 'https://ddm999.github.io/gt7info/data/db/cars.csv';
const MAKER_URL = 'https://ddm999.github.io/gt7info/data/db/maker.csv';
const CACHE_KEY = 'dg.gt7cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — the source updates "as soon as possible" after game updates

let memoryCache = null;

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GT7 data request failed (${res.status})`);
  return res.text();
}

// The observed data has no quoted/embedded commas in either file, so a plain
// split is sufficient — kept intentionally simple rather than pulling in a
// CSV parsing library for two small files.
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',').map((h) => h.trim());
  return lines
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(',');
      const row = {};
      header.forEach((h, i) => {
        row[h] = (cols[i] ?? '').trim();
      });
      return row;
    });
}

async function loadGT7Data() {
  if (memoryCache) return memoryCache;

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      memoryCache = cached;
      return memoryCache;
    }
  } catch {
    // corrupt cache — fall through to a fresh fetch
  }

  const [carsText, makerText] = await Promise.all([fetchText(CARS_URL), fetchText(MAKER_URL)]);
  const carRows = parseCSV(carsText);
  const makerRows = parseCSV(makerText);

  // Column names in maker.csv aren't guaranteed, so resolve them by keyword
  // rather than hard-coded position.
  const makerKeys = Object.keys(makerRows[0] || {});
  const idKey = makerKeys.find((k) => /id/i.test(k)) || makerKeys[0];
  const nameKey = makerKeys.find((k) => /name/i.test(k)) || makerKeys[1];
  const makerMap = {};
  makerRows.forEach((r) => {
    makerMap[r[idKey]] = r[nameKey];
  });

  const cars = carRows.map((r) => ({
    id: r.ID,
    name: r.ShortName,
    makerId: r.Maker,
    makerName: makerMap[r.Maker] || '',
  }));

  memoryCache = { cars, fetchedAt: Date.now() };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // localStorage full/unavailable — just won't persist across sessions
  }
  return memoryCache;
}

export async function matchGT7Cars(make, model, year) {
  const { cars } = await loadGT7Data();
  const makeL = (make || '').toLowerCase().trim();
  const modelTokens = (model || '').toLowerCase().split(/\s+/).filter(Boolean);
  const y = year ? Number(year) : null;

  return cars
    .filter((c) => !makeL || c.makerName.toLowerCase().includes(makeL) || makeL.includes(c.makerName.toLowerCase()))
    .map((c) => {
      const nameL = c.name.toLowerCase();
      let score = 0;
      if (modelTokens.length) {
        const matched = modelTokens.filter((t) => nameL.includes(t));
        score += (matched.length / modelTokens.length) * 70;
      }
      if (y && !Number.isNaN(y)) {
        // GT7 short names typically end in a two-digit year, e.g. "R32 GT-R V-spec II '94"
        const m = c.name.match(/'(\d{2})$/);
        if (m) {
          const yy = parseInt(m[1], 10);
          const fullYear = yy <= 30 ? 2000 + yy : 1900 + yy;
          if (fullYear === y) score += 30;
          else if (Math.abs(fullYear - y) <= 1) score += 15;
        }
      }
      return { ...c, confidence: Math.round(Math.min(100, score)) };
    })
    .filter((c) => c.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}
