// Independent-verification sources for masterclass narration (David 2026-05-25:
// "use independent verification — books, online resources — that's the gate").
// Narration IDEAS must be verified against a source OUTSIDE the model's training
// recall, and that source RECORDED so it can be spot-checked. A `sources` ref is
// one of:
//   • `concept:<id>`  — a tagged passage in chess-concepts.json (the book corpus)
//   • `book:<openingId>` — per-opening pages in opening-book-pages.json / the
//                          concept corpus's `openings` map (classical openings only)
//   • a reputable chess URL (https) — for openings the pre-1930s books don't cover
// The gate (per surface) requires every masterclass narration unit to carry at
// least one source that resolves here. This can't prove the prose was truly
// derived from the source — but it makes skipping verification visible and
// blocks ship without a recorded, resolvable reference.
import conceptsRaw from './chess-concepts.json';
import bookPagesRaw from './opening-book-pages.json';

const conceptIds = new Set((conceptsRaw as { concepts: Array<{ id: string }> }).concepts.map((c) => c.id));
const bookOpenings = new Set<string>([
  ...Object.keys((bookPagesRaw as { pages: Record<string, unknown> }).pages ?? {}),
  ...Object.keys((conceptsRaw as { openings?: Record<string, unknown> }).openings ?? {}),
]);

// Reputable chess references accepted for openings the corpus doesn't cover.
const REPUTABLE_DOMAINS = [
  'wikipedia.org', 'chess.com', 'chessable.com', 'lichess.org', '365chess.com',
  'chessgames.com', 'britannica.com', 'chesstempo.com', 'chessbase.com',
  'chess24.com', 'thechessworld.com', 'gameknot.com', 'chesspathways.com',
];

export function isResolvableSource(ref: string): boolean {
  if (typeof ref !== 'string' || !ref.trim()) return false;
  const r = ref.trim();
  if (r.startsWith('concept:')) return conceptIds.has(r.slice('concept:'.length));
  if (r.startsWith('book:')) return bookOpenings.has(r.slice('book:'.length));
  if (/^https?:\/\//i.test(r)) {
    try {
      const host = new URL(r).hostname.toLowerCase();
      return REPUTABLE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
    } catch { return false; }
  }
  return false;
}

/** True when the unit has at least one source and every source resolves. */
export function sourcesAreValid(sources: readonly string[] | undefined): boolean {
  return Array.isArray(sources) && sources.length > 0 && sources.every(isResolvableSource);
}

export const _internals = { conceptIds, bookOpenings, REPUTABLE_DOMAINS };
