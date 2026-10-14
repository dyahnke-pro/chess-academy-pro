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
    // THE MOVE'S OWN ANNOUNCEMENT IS NOT A LESSON (2026-10-14: "Check. Watch
    // out — they have mate in one…" — "Check." says what their move was, and
    // the mate is the first thing taught). A bare "Check." / "Checkmate." is
    // skipped; any sentence with content before the mate still counts.
    const sents = s.split(/(?<=[.!?])\s+/);
    const first = sents.find((x) => !/^check(mate)?[.!]?$/i.test(x.trim())) ?? '';
    return !MATE.test(first);
  });
}
