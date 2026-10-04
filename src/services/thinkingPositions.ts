// thinkingPositions — choosing the board a "Learn how to think" question is
// asked on (plan: docs/plans/2026-10-04-learn-how-to-think.md, "A fair answer
// key" + "Positions").
//
// A tap answer is only FAIR when the answer set is crisp: every key square is
// clearly right, nothing the student could reasonably call right is marked
// wrong, and there are few enough to tap. The SAME step computer that grades a
// tap decides whether a position may be used — so difficulty is a property of
// the position, never a guess.
//
// Order of preference (David 2026-10-04): the student's OWN games first (their
// own mistakes teach best), then real puzzles. Never an invented position (G3).
// A position already used for this step is never served again.
//
// PURE: candidates and the key function come in; no Dexie, no engine.
import type { Square } from 'chess.js';

export type LessonPositionOrigin = 'game' | 'puzzle';

export interface LessonPositionCandidate {
  fen: string;
  origin: LessonPositionOrigin;
  /** The game this came from (own games) — the provenance the coach can name. */
  gameId?: string;
  ply?: number;
  puzzleId?: string;
  /** A line spoken before the question, from the record ("You played the
   *  bishop to f7 here."). Only steps that ask about a played move use it. */
  lead?: string;
  /** The move the student actually played from this board (own games). */
  playedSan?: string;
  /** The opponent's move that produced this board (own games). */
  prevSan?: string;
  /** The board before that move (own games). */
  beforeFen?: string;
  /** A real solution line from this board, in SAN (puzzles). */
  line?: string[];
  /** The engine's top moves on this board with what each costs the side to
   *  move against the best (computed by a step's `enrich`, never authored). */
  topMoves?: Array<{ san: string; cpLoss: number }>;
}

/** What a step computer says about one position. */
export interface FairKey {
  /** The squares the student must find. */
  key: Square[];
  /** Squares a student could reasonably tap and be "wrong" for a subtle reason
   *  the step has not taught yet. Any near miss makes the position unfair. */
  nearMiss: Square[];
}

/** The answer set must be tappable: 1 to MAX_KEY_SIZE squares. */
export const MAX_KEY_SIZE = 4;

export interface ChosenLessonPosition extends LessonPositionCandidate {
  key: Square[];
}

/** The identity of a board for the "never repeat" memory: piece placement plus
 *  side to move (move counters ignored, so a transposition is the same board). */
export function boardIdentity(fen: string): string {
  const [placement = '', turn = 'w'] = fen.trim().split(/\s+/);
  return `${placement} ${turn}`;
}

export function isFairKey(k: FairKey | null): k is FairKey {
  return !!k && k.key.length >= 1 && k.key.length <= MAX_KEY_SIZE && k.nearMiss.length === 0;
}

/**
 * The first candidate, own games before puzzles and otherwise in the given
 * order, whose key is fair and whose board has not been used for this step.
 * Returns null when nothing qualifies — the caller says so rather than serving
 * an unfair board.
 */
export function pickFairPosition(
  candidates: readonly LessonPositionCandidate[],
  keyFor: (fen: string, candidate?: LessonPositionCandidate) => FairKey | null,
  seen: ReadonlySet<string>,
): ChosenLessonPosition | null {
  const ordered = [
    ...candidates.filter((c) => c.origin === 'game'),
    ...candidates.filter((c) => c.origin === 'puzzle'),
  ];
  const tried = new Set<string>();
  for (const c of ordered) {
    const id = boardIdentity(c.fen);
    if (seen.has(id) || tried.has(id)) continue;
    tried.add(id);
    let k: FairKey | null = null;
    try { k = keyFor(c.fen, c); } catch { k = null; }
    if (isFairKey(k)) return { ...c, key: [...new Set(k.key)] };
  }
  return null;
}
