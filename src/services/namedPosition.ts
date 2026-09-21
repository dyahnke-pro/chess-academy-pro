/**
 * namedPosition — the model names a position; CODE supplies the board (2026-09-21).
 *
 * 🔒 THE OTHER HALF OF THE G0 FIX. `positionProvenance` says a raw FEN is only
 * acceptable when the app produced it. That alone would break a legitimate and
 * common teaching request — "set up the Lucena", "show me a back-rank mate",
 * "put up the wrong-rook-pawn draw" — because those positions were never
 * computed during the conversation; they live in the app's own corpora.
 *
 * The G0-correct answer is not to let the model type the FEN from memory. It is
 * the same split the whole file family rests on: **the model does the LANGUAGE
 * work (which position does the student mean) and code does the CHESS work
 * (what board is that)**. So the tool takes a NAME and this resolves it against
 * data the app ships. A name the corpora do not carry resolves to null, and the
 * coach says so — which is the honest answer, and is what "empty > generic >
 * invented" means here.
 *
 * 🚨 IT READS THE EXISTING SERVICES, NOT THE JSON. `endgameService` and
 * `endgameLessonsService` already own these corpora. Re-importing the JSON
 * beside them would be the duplicated-source rot this repo keeps paying for: two
 * readers that drift the day one corpus gains a field or a filter. This module
 * owns exactly one thing — matching a spoken name to an entry — and nothing
 * about the data itself.
 */
import { getAllPatterns } from './endgameService';
import { getAllEndgameLessons } from './endgameLessonsService';

export interface NamedPositionHit {
  /** The board, straight from the corpus. */
  readonly fen: string;
  /** The corpus entry's own name, so the coach says what the app calls it
   *  rather than echoing the student's phrasing back as if it were canonical. */
  readonly name: string;
  readonly id: string;
  readonly corpus: 'mating-pattern' | 'endgame-lesson';
  /** The entry's own words about this position, when it carries any. Handed
   *  to the voice as a computed fact — never re-written from memory. */
  readonly note?: string;
}

function norm(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(the|a|an|position|pattern|endgame|ending|mate|setup|set up)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Candidate {
  readonly hit: NamedPositionHit;
  /** Every spelling this entry answers to, normalised. */
  readonly names: readonly string[];
}

function candidates(): Candidate[] {
  const out: Candidate[] = [];

  for (const p of getAllPatterns()) {
    // The RECOGNITION position is the finished pattern — what "show me a
    // back-rank mate" means. `getRecognitionPosition` picks it by movesToMate,
    // so this does not re-derive that rule; it takes the first lesson position
    // as the fallback only when a pattern carries no mate-in-1.
    const recognition = p.lessonPositions.find((l) => l.movesToMate === 1)
      ?? p.lessonPositions[0];
    if (!recognition?.fen) continue;
    out.push({
      hit: {
        fen: recognition.fen,
        name: p.name,
        id: p.id,
        corpus: 'mating-pattern',
        note: recognition.sourceComment,
      },
      names: [p.name, p.id, ...(p.aliases ?? [])].map(norm).filter(Boolean),
    });
  }

  for (const l of getAllEndgameLessons()) {
    const first = l.positions?.[0];
    if (!first?.fen) continue;
    out.push({
      hit: {
        fen: first.fen,
        name: l.name,
        id: l.id,
        corpus: 'endgame-lesson',
        note: first.explanation,
      },
      names: [l.name, l.id, first.title].filter(Boolean).map(norm).filter(Boolean),
    });
  }

  return out;
}

/**
 * Resolve a spoken position name to a real board, or null.
 *
 * Matching is deliberately CONSERVATIVE — exact normalised match, then a
 * whole-name containment either way. No fuzzy scoring: a near-miss that returns
 * the WRONG position is worse than a null, because the coach would then teach a
 * confidently-narrated board the student never asked for. Null is recoverable;
 * a plausible wrong board is the hallucination in a different costume.
 */
export function resolveNamedPosition(query: string): NamedPositionHit | null {
  const q = norm(query);
  if (q.length < 3) return null;

  const all = candidates();
  for (const c of all) {
    if (c.names.includes(q)) return c.hit;
  }
  // Containment in ONE direction only: the student said a SHORTER form of a
  // name we carry ("rook" → "Rook Mate"). Longest name first so a query does
  // not land on an entry that merely shares a word with a better one.
  //
  // 🚨 THE OTHER DIRECTION IS A TRAP AND THIS IS WHY IT IS GONE. Allowing
  // `q.includes(n)` — the query containing a corpus name — meant "the Zurich
  // 1953 rook ending" matched the entry "Rook Mate", because "rook" survives
  // normalisation on both sides. That is precisely the near-miss the doc block
  // above promises not to make: a confidently-narrated board the student never
  // asked for. Caught by this module's own test, which is why the test names a
  // real-sounding position the corpora do not carry rather than only `xyzzy`.
  // A longer, more specific query is evidence the student means something we
  // do NOT have — never licence to match the fragment we do.
  const byLen = all
    .flatMap((c) => c.names.map((n) => ({ n, hit: c.hit })))
    .sort((a, b) => b.n.length - a.n.length);
  for (const { n, hit } of byLen) {
    if (q.length >= 4 && n.includes(q)) return hit;
  }
  return null;
}

/** Every name the coach can set by name — for a refusal that tells the student
 *  what IS available instead of just saying no. */
export function namedPositionNames(): string[] {
  return candidates().map((c) => c.hit.name).sort();
}
