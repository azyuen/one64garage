// one64garage vehicle lookup.
//
// Wikidata is the primary source for MATCHING and structured facts (manufacturer,
// country of origin, production years) — it's genuinely structured data with a
// real, fast, CORS-friendly API, unlike a wikitext article.
//
// Wikipedia's rendered infobox (parsed as HTML via DOMParser, not the old fragile
// wikitext-regex approach) fills in technical specs Wikidata doesn't carry —
// engine, power, torque, transmission, layout — when a matching article exists.
//
// If Wikidata can't find (or can't fully specify) a match, a direct Wikipedia
// text search is used as a secondary fallback — more forgiving than Wikidata's
// exact entity search, at the cost of being plain search rather than structured
// matching. Both are public, keyless, CORS-enabled APIs reachable directly from
// the browser, which matters here since this app has no backend to proxy through.

const WD_API = 'https://www.wikidata.org/w/api.php';
const WP_API = 'https://en.wikipedia.org/w/api.php';

async function wdGet(params) {
  const url = `${WD_API}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikidata request failed (${res.status})`);
  return res.json();
}

async function wpGet(params) {
  const url = `${WP_API}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia request failed (${res.status})`);
  return res.json();
}

// ---------- Wikidata claim helpers ----------

function claimEntityIds(claims, prop) {
  const c = claims?.[prop];
  if (!c) return [];
  return c.map((cl) => cl.mainsnak?.datavalue?.value?.id).filter(Boolean);
}

function claimYear(claims, prop) {
  const t = claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.time;
  if (!t) return null;
  const m = t.match(/^\+?(-?\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}

// ---------- Search + candidate resolution (primary: Wikidata) ----------

export async function searchCandidates(query) {
  const searchText = [query.make, query.model, query.variant].filter(Boolean).join(' ').trim();
  if (!searchText) return [];

  const searchData = await wdGet({
    action: 'wbsearchentities',
    search: searchText,
    language: 'en',
    type: 'item',
    limit: 10,
  });
  const results = searchData?.search || [];
  if (results.length === 0) return [];

  const ids = results.map((r) => r.id);
  const entityData = await wdGet({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'claims|labels|descriptions|sitelinks',
    languages: 'en',
    sitefilter: 'enwiki',
  });
  const entities = entityData?.entities || {};

  let candidates = results.map((r) => {
    const entity = entities[r.id] || {};
    const claims = entity.claims || {};
    return {
      id: r.id,
      label: r.label || r.id,
      description: r.description || '',
      manufacturerIds: claimEntityIds(claims, 'P176'),
      countryIds: claimEntityIds(claims, 'P495'),
      inception: claimYear(claims, 'P571'),
      startTime: claimYear(claims, 'P580'),
      endTime: claimYear(claims, 'P582'),
      wikipediaTitle: entity.sitelinks?.enwiki?.title || null,
      source: 'wikidata',
    };
  });

  // Batch-resolve manufacturer/country labels in one follow-up call.
  const refIds = [...new Set(candidates.flatMap((c) => [...c.manufacturerIds, ...c.countryIds]))];
  if (refIds.length) {
    const labelData = await wdGet({
      action: 'wbgetentities',
      ids: refIds.slice(0, 50).join('|'),
      props: 'labels',
      languages: 'en',
    });
    const labelMap = {};
    Object.entries(labelData?.entities || {}).forEach(([id, e]) => {
      labelMap[id] = e.labels?.en?.value || '';
    });
    candidates = candidates.map((c) => ({
      ...c,
      manufacturerLabel: labelMap[c.manufacturerIds[0]] || '',
      countryLabel: labelMap[c.countryIds[0]] || '',
    }));
  } else {
    candidates = candidates.map((c) => ({ ...c, manufacturerLabel: '', countryLabel: '' }));
  }

  candidates = candidates
    .map((c) => ({ ...c, confidence: scoreCandidate(query, c) }))
    .sort((a, b) => b.confidence - a.confidence);

  return candidates;
}

// ---------- Search fallback (secondary: plain Wikipedia text search) ----------
// Used when Wikidata's exact entity search comes up empty or low-confidence —
// Wikipedia's search is far more forgiving of loose/partial names.

export async function searchWikipediaFallback(query) {
  const searchText = [query.make, query.model, query.variant].filter(Boolean).join(' ').trim();
  if (!searchText) return [];

  const data = await wpGet({ action: 'query', list: 'search', srsearch: searchText, srlimit: 8 });
  const results = data?.query?.search || [];

  return results
    .map((r) => {
      const description = r.snippet.replace(/<[^>]+>/g, '');
      return {
        id: `wp:${r.title}`,
        label: r.title,
        description,
        manufacturerLabel: '',
        countryLabel: '',
        inception: null,
        startTime: null,
        endTime: null,
        wikipediaTitle: r.title,
        source: 'wikipedia',
        confidence: scoreCandidate(query, { label: r.title, description, manufacturerLabel: '' }),
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}

function scoreCandidate(query, candidate) {
  let score = 0;
  const label = candidate.label.toLowerCase();
  const desc = candidate.description.toLowerCase();
  const manu = candidate.manufacturerLabel.toLowerCase();

  if (query.make) {
    const make = query.make.toLowerCase();
    if (label.includes(make) || manu.includes(make) || desc.includes(make)) score += 35;
  }
  if (query.model) {
    const tokens = query.model.toLowerCase().split(/\s+/).filter(Boolean);
    const matched = tokens.filter((t) => label.includes(t));
    if (tokens.length && matched.length === tokens.length) score += 45;
    else if (tokens.length && matched.length >= Math.ceil(tokens.length / 2)) score += 25;
  }
  if (query.variant) {
    const variant = query.variant.toLowerCase();
    if (label.includes(variant) || desc.includes(variant)) score += 10;
  }
  if (query.year) {
    const y = Number(query.year);
    if (!Number.isNaN(y)) {
      const start = candidate.startTime ?? candidate.inception;
      const end = candidate.endTime;
      if (start != null && end != null) {
        if (y >= start && y <= end) score += 10;
        else if (Math.abs(y - start) <= 2 || Math.abs(y - end) <= 2) score += 5;
      } else if (start != null && Math.abs(y - start) <= 3) {
        score += 7;
      } else if (label.includes(String(y))) {
        score += 5;
      }
    }
  }

  const autoKeywords = ['car', 'automobile', 'vehicle', 'sedan', 'coupe', 'suv', 'truck', 'roadster', 'hatchback', 'wagon'];
  if (desc && !autoKeywords.some((k) => desc.includes(k))) score -= 15;

  return Math.max(0, Math.min(100, score));
}

// ---------- Wikipedia infobox (HTML, not wikitext — far more reliable to parse) ----------

async function fetchInfoboxFields(title) {
  const data = await wpGet({ action: 'parse', page: title, prop: 'text' });
  const html = data?.parse?.text?.['*'];
  if (!html) return {};

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const infobox = doc.querySelector('.infobox');
  if (!infobox) return {};

  const fields = {};
  infobox.querySelectorAll('tr').forEach((tr) => {
    const th = tr.querySelector('th');
    const td = tr.querySelector('td');
    if (!th || !td) return;
    const label = th.textContent.trim().toLowerCase();
    const value = td.textContent.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
    if (label && value) fields[label] = value;
  });
  return fields;
}

// Broad keyword coverage — real infoboxes are inconsistent about labeling
// (e.g. "power output" vs "max power" vs "bhp"), and this was the actual
// weak point causing "found the article but couldn't extract the fields".
function firstMatch(fields, keywords) {
  for (const [label, value] of Object.entries(fields)) {
    if (keywords.some((k) => label.includes(k))) return value;
  }
  return '';
}

async function fetchIntroFact(title) {
  try {
    const data = await wpGet({ action: 'query', prop: 'extracts', exintro: true, explaintext: true, titles: title });
    const page = Object.values(data?.query?.pages || {})[0];
    const extract = page?.extract || '';
    // Keep only the opening sentence or two — Wikipedia's lead sentence is
    // typically the most purely factual/definitional part of an article.
    const match = extract.match(/^(.*?[.!?])\s(.*?[.!?])?/);
    return (match ? [match[1], match[2]].filter(Boolean).join(' ') : extract).slice(0, 280);
  } catch {
    return '';
  }
}

function guessDrivetrain(layoutText) {
  if (!layoutText) return '';
  const t = layoutText.toLowerCase();
  if (t.includes('four-wheel') || t.includes('all-wheel') || t.includes('awd')) return 'AWD';
  if (t.includes('4wd')) return '4WD';
  if (t.includes('mid-engine') || t.includes('mid engine')) return 'MR';
  if (t.includes('rear-engine')) return 'RWD';
  if (t.includes('rear-wheel')) return 'RWD';
  if (t.includes('front-wheel')) return 'FWD';
  return '';
}

function extractDisplacement(engineText) {
  const m = engineText.match(/\d+(?:\.\d+)?\s?L\b/i) || engineText.match(/\d{3,5}\s?cc\b/i);
  return m ? m[0] : '';
}

function extractConfiguration(engineText) {
  const m = engineText.match(/\b(I[3-8]|V[6-9]|V1[0-2]|Flat-[4-6]|Boxer-[4-6]|Inline-[3-8])\b/i);
  return m ? m[0] : '';
}

// ---------- Historical notes — built from structured Wikidata facts where ----------
// ---------- available; falls back to Wikipedia's lead sentence only when ----------
// ---------- no Wikidata facts exist at all (the Wikipedia-search fallback path). ----

function buildHistoricalNote(candidate) {
  const parts = [];
  if (candidate.manufacturerLabel) parts.push(`Manufactured by ${candidate.manufacturerLabel}.`);
  if (candidate.startTime && candidate.endTime) {
    parts.push(`Produced ${candidate.startTime}\u2013${candidate.endTime}.`);
  } else if (candidate.startTime) {
    parts.push(`Production began in ${candidate.startTime}.`);
  } else if (candidate.inception) {
    parts.push(`Introduced in ${candidate.inception}.`);
  }
  return parts.join(' ');
}

function deriveMakeModel(candidate) {
  const make = candidate.manufacturerLabel || '';
  let model = candidate.label || '';
  if (make && model.toLowerCase().startsWith(make.toLowerCase())) {
    model = model.slice(make.length).trim();
  }
  return { make, model: model || candidate.label || '' };
}

// ---------- Public: build the full draft for a chosen candidate ----------

export async function fetchVehicleDraft(candidate) {
  let infobox = {};
  if (candidate.wikipediaTitle) {
    try {
      infobox = await fetchInfoboxFields(candidate.wikipediaTitle);
    } catch {
      infobox = {};
    }
  }

  const engineText = firstMatch(infobox, ['engine', 'powerplant', 'motor']);
  const { make, model } = deriveMakeModel(candidate);

  let whyItMatters = buildHistoricalNote(candidate);
  // Only reach for Wikipedia prose if Wikidata gave us nothing structured at
  // all — keeps historical notes factual-first per the stated priority.
  if (!whyItMatters && candidate.wikipediaTitle) {
    whyItMatters = await fetchIntroFact(candidate.wikipediaTitle);
  }

  return {
    make,
    model,
    countryOfOrigin: candidate.countryLabel || '',
    bodyType: firstMatch(infobox, ['body style', 'body type', 'class']),
    year: candidate.startTime ? String(candidate.startTime) : candidate.inception ? String(candidate.inception) : '',
    tech: {
      engine: engineText,
      configuration: extractConfiguration(engineText),
      displacement: extractDisplacement(engineText),
      horsepower: firstMatch(infobox, ['power output', 'max power', 'power', 'bhp']),
      torque: firstMatch(infobox, ['max torque', 'torque output', 'torque']),
      weight: firstMatch(infobox, ['curb weight', 'kerb weight', 'unladen weight', 'weight', 'mass']),
      drivetrain: guessDrivetrain(firstMatch(infobox, ['layout', 'drivetrain', 'powertrain'])),
      transmission: firstMatch(infobox, ['transmission', 'gearbox']),
    },
    history: {
      whyItMatters,
    },
    sources: {
      wikidata: /^Q\d+$/.test(candidate.id) ? `https://www.wikidata.org/wiki/${candidate.id}` : null,
      wikipedia: candidate.wikipediaTitle
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(candidate.wikipediaTitle.replace(/ /g, '_'))}`
        : null,
    },
    hasSpecs: Object.keys(infobox).length > 0,
    fromFallback: candidate.source === 'wikipedia',
  };
}
