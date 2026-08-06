// Guards against "Objects are not valid as a React child" crashes when car
// data comes from hand-edited or bulk-imported JSON that doesn't perfectly
// match the expected shape (e.g. a field that should be a string ends up as
// an object or array). Always render text through this instead of raw JSX.

export function toText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    return Object.values(v).map(toText).filter(Boolean).join(' ');
  }
  return String(v);
}
