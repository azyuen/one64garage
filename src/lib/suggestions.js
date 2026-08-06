// Builds "you've typed this before" suggestion lists from existing records,
// so fields like diecast brand/colour/release type get faster to fill in
// the more of the collection you've logged.

export function collectFieldValues(records, path) {
  const counts = {};
  Object.values(records || {}).forEach((r) => {
    let v = r;
    for (const p of path) v = v?.[p];
    if (typeof v === 'string' && v.trim()) {
      const key = v.trim();
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}
