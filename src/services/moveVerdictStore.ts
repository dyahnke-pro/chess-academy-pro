/**
 * ONE VERDICT PER MOVE (David 2026-10-06: "We also need the same strength engine
 * for learn play and review so they stop contradicting each other").
 *
 * Each surface used to grade the same move itself: Play at depth 10, Learn from
 * a 1.5-second pre-move read, Review at 12 then 16 on pool workers — three
 * reads, three budgets, and a move called a mistake live and fine in review.
 * The grading RULE was already shared (`gradeMove`); the INPUTS were not, and
 * a time-capped search on a phone never lands on the same depth twice.
 *
 * So the first surface to grade a move from a position stores the verdict, and
 * every later surface reads it instead of grading again. Two answers for one
 * move cannot exist because the move is graded once. Keyed by the position
 * (4-field FEN — move counters do not change the move) and the move's SAN.
 *
 * The rules:
 *   - FIRST WRITE WINS for a grade the student heard live (Learn, Play): a
 *     later, deeper search never contradicts it.
 *   - A REVIEW grade below VERDICT_TRUST_DEPTH is a draft, and a deeper read
 *     replaces it (2026-10-13 — a draft that could never be corrected kept a
 *     false "mistake" forever). Once trusted, it is never rewritten.
 *   - FAIL-OPEN. A storage error means "no stored verdict" and the caller
 *     grades as before — never a lost review.
 */
import { db } from '../db/schema';
import { REVIEW_READ_DEPTH } from './engineConstants';
import type { MoveClassification } from '../types';

export type VerdictSource = 'learn' | 'play' | 'review';

/** The faults a verdict can carry; anything else is "no fault". */
export type VerdictLabel = 'fine' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveVerdictRecord {
  /** `${4-field FEN}|${SAN without +/#}` — see `verdictKey`. */
  key: string;
  label: VerdictLabel;
  /** What the move cost the mover, in centipawns, when the grader had it. */
  cpLoss: number | null;
  /** The engine's move from that position (UCI), when the grader had it. */
  bestUci: string | null;
  /** The depth the grading read reached, when known. */
  depth: number | null;
  source: VerdictSource;
  recordedAt: number;
}

export function verdictKey(fenBefore: string, san: string): string {
  const fen4 = fenBefore.trim().split(/\s+/).slice(0, 4).join(' ');
  return `${fen4}|${san.replace(/[+#!?]+$/, '')}`;
}

/** A classification (review's, or Learn's label) as a verdict label. */
export function toVerdictLabel(c: MoveClassification | 'best' | null | undefined): VerdictLabel {
  return c === 'inaccuracy' || c === 'mistake' || c === 'blunder' ? c : 'fine';
}

/** 🔒 THE DEPTH AT WHICH A VERDICT IS TRUSTED (review of chesscom-1040709576,
 *  2026-10-13). "First write wins" let the SHALLOWEST read lock a move forever:
 *  the phone's first review open graded from a 200 ms draft read, stored those
 *  grades, and the depth-16 pass that followed was overruled by them, so 6...e6
 *  (0.05 points) stayed a "mistake" on every later open. First write still wins
 *  among TRUSTED verdicts; a verdict below this depth is a draft that any deeper
 *  read replaces. Equal to the review's deep depth (REVIEW_DEEP_DEPTH). */
export const VERDICT_TRUST_DEPTH = REVIEW_READ_DEPTH;

/** Does a stored verdict decide a move this grader read at `ownDepth`?
 *  A verdict the student HEARD live (Learn, Play) always does — David's
 *  2026-10-06 rule that a heard grade is never contradicted. A review verdict
 *  does once it is trusted; below that it was graded from the review's draft
 *  read, and it decides only against a read no deeper than itself. */
export function verdictOutranks(stored: Pick<MoveVerdictRecord, 'depth' | 'source'>, ownDepth: number | null): boolean {
  if (stored.source !== 'review') return true;
  const d = stored.depth ?? 0;
  return d >= VERDICT_TRUST_DEPTH || d >= (ownDepth ?? 0);
}

/** Store a verdict. First write wins once a verdict is trusted; until then a
 *  deeper read replaces a shallower one (see VERDICT_TRUST_DEPTH). */
export async function saveVerdict(v: Omit<MoveVerdictRecord, 'key' | 'recordedAt'> & { fenBefore: string; san: string }): Promise<void> {
  try {
    const key = verdictKey(v.fenBefore, v.san);
    await db.transaction('rw', db.moveVerdicts, async () => {
      const prev = await db.moveVerdicts.get(key);
      if (prev && verdictOutranks(prev, v.depth)) return;
      await db.moveVerdicts.put({ key, label: v.label, cpLoss: v.cpLoss, bestUci: v.bestUci, depth: v.depth, source: v.source, recordedAt: Date.now() });
    });
  } catch { /* fail-open: the move is simply graded again next time */ }
}

/** The stored verdicts for `keys`, by key. One bulkGet. */
export async function getVerdicts(keys: readonly string[]): Promise<Map<string, MoveVerdictRecord>> {
  const out = new Map<string, MoveVerdictRecord>();
  if (keys.length === 0) return out;
  try {
    const rows = await db.moveVerdicts.bulkGet([...keys]);
    rows.forEach((r) => { if (r) out.set(r.key, r); });
  } catch { /* fail-open */ }
  return out;
}

/**
 * Apply a stored verdict to a classification a surface computed itself. The
 * verdict decides WHETHER it was a fault and which one; a surface's own
 * positive flavour (brilliant / great / book / good) survives when the stored
 * verdict says the move was fine. Book still wins over a small fault, the same
 * exemption every grader applies.
 */
export function applyVerdict(own: MoveClassification, stored: MoveVerdictRecord | undefined, isBook: boolean): MoveClassification {
  if (!stored) return own;
  if (stored.label === 'fine') return toVerdictLabel(own) === 'fine' ? own : (isBook ? 'book' : 'good');
  if (isBook && stored.label !== 'blunder') return 'book';
  return stored.label;
}
