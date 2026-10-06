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
 *   - FIRST WRITE WINS. A later, deeper search never rewrites a verdict the
 *     student already heard; the deeper search is for the lines it shows.
 *   - FAIL-OPEN. A storage error means "no stored verdict" and the caller
 *     grades as before — never a lost review.
 */
import { db } from '../db/schema';
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

/** Store a verdict unless one already exists for the move (first write wins). */
export async function saveVerdict(v: Omit<MoveVerdictRecord, 'key' | 'recordedAt'> & { fenBefore: string; san: string }): Promise<void> {
  try {
    const key = verdictKey(v.fenBefore, v.san);
    await db.transaction('rw', db.moveVerdicts, async () => {
      if (await db.moveVerdicts.get(key)) return;
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
