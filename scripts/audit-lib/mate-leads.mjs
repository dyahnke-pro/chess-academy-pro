// A FORCED MATE LEADS ITS LINE (2026-10-13). Learn said "Rooks belong on open
// files … Kc6 was a blunder — it let them force mate in 2", the mate last,
// and every row passed. A spoken line that names a forced mate names it in its
// first sentence. One pattern for every audit.
const MATE = /\b(force|forced|forcing)\s+mate\b|\bmate in \d+\b|\bmate in (one|two|three|four|five)\b/i;

/** The spoken lines that name a forced mate somewhere other than their first sentence. */
export function linesWithBuriedMate(lines) {
  return lines.filter((t) => {
    const s = String(t);
    if (!MATE.test(s)) return false;
    const first = s.split(/(?<=[.!?])\s+/)[0] ?? '';
    return !MATE.test(first);
  });
}
