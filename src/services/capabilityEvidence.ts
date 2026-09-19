/**
 * capabilityEvidence — THE POSITIVE HALF OF THE STUDENT MODEL.
 *
 * David 2026-09-17: "Not elo based. I want it to be capabilities of our system."
 *
 * The student model is a profile over the app's OWN closed vocabulary — the 25
 * `MISCONCEPTION_TAGS` — not a scalar rating. A scalar is lossy exactly where it
 * matters: two students at 1200, one who hangs pieces but calculates well and
 * one who never hangs but has no plan, get identical teaching, and the app
 * already knows the difference.
 *
 * WHAT WAS MISSING, precisely (measured 2026-09-17 — the first reading of this
 * was too broad and is corrected here). The app DOES record success, in exactly
 * ONE place: `misconceptionService.recordTagDrillResult`, called from two puzzle
 * pages. It walks `db.misconceptionTags.where('tag').equals(tag)` — so:
 *
 *   1. a success for a tag the student was NEVER CAUGHT FAILING matches zero
 *      rows and records NOTHING. There is no path to "they can do this"; only
 *      "this hole is getting better";
 *   2. REAL PLAY contributes nothing positive at all. Forty clean moves in a
 *      game record zero. Only drills count.
 *
 * So a capability could be `broken` or `unknown`, never `held`, and a profile
 * built on it can only ever degrade.
 *
 * WHAT COUNTS AS `held` — BOTH HALVES COMPUTED, NEITHER GUESSED.
 * "They didn't fail" is not evidence (absent ≠ silent, the ALGO-BASED rule). A
 * student who plays forty moves without hanging a piece has shown nothing if
 * nothing was ever en prise. So a `held` record requires:
 *
 *   • the BOARD POSED the question — the fundamental was live on this position,
 *     which `MoveFundamental.importance` already measures; and
 *   • the STUDENT ANSWERED it — the move they played served that fundamental
 *     and was not itself a mistake.
 *
 * Both come from `leadingFundamentals`, whose own doc comment has said since it
 * was extracted that "a caller that wants to RECORD what the student got right
 * calls this" — and until now nothing did. The tag join is
 * `MOVE_FUNDAMENTAL_TAG`, the same `Record<Union, …>` the negative half uses, so
 * the positive and negative evidence file under ONE vocabulary rather than two
 * that drift.
 */
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import { leadingFundamentals, MOVE_FUNDAMENTAL_TAG } from './moveFundamentals';
import { isMisconceptionTagId, type MisconceptionTagId } from '../data/misconceptionTags';

/** How live the fundamental had to be on THIS board before answering it counts
 *  as evidence. `importance` is 0-100 and already rates the board, not the move,
 *  so this is the "was the question asked" bar — not a cap on what is recorded
 *  (G4.5): every fundamental clearing it is written, however many that is. */
const POSED_IMPORTANCE_MIN = 45;

/** A move that cost this much or more is not a demonstration of anything, even
 *  if it happened to serve a fundamental on the way past. */
const MISTAKE_CP = 100;

export type CapabilityOutcome = 'held' | 'broken';

export interface CapabilityEvidenceRecord {
  id: string;
  /** The capability, named in the app's closed vocabulary. */
  tag: MisconceptionTagId;
  outcome: CapabilityOutcome;
  /** The position that POSED the question. */
  fen: string;
  /** The move that answered it. */
  playedSan: string;
  /** How live the fundamental was on that board, 0-100. */
  posedImportance: number;
  recordedAt: number;
  /** Which surface saw it — an honest null is better than a guess. */
  origin: 'play' | 'review' | 'learn' | 'drill';
  /**
   * WAS THE STUDENT TOLD? REQUIRED, so a new writer has to answer.
   *
   * A move found after the coach announced the moment, or after a hint was
   * revealed, is NOT evidence the student can do it unaided — and counting it
   * as `held` would let the coach's own teaching inflate the model it uses to
   * decide whether to teach. The profile therefore counts a prompted row as
   * NEITHER held nor broken: the tag stays GREY, grey raises the ranker, and
   * the coach keeps teaching it until they do it on their own.
   *
   * Required rather than optional because the wrong default here is invisible
   * and self-reinforcing: every prompted row silently reading as unaided
   * evidence would make a capability look proven precisely because the app
   * kept helping with it.
   */
  prompted: boolean;
  sourceGameId?: string;
}

/** `held` minus `broken` per tag, plus the raw counts. A tag absent from the map
 *  is UNKNOWN — which is NOT the same as broken and NOT the same as held. */
export interface CapabilityProfileEntry {
  held: number;
  broken: number;
}
export type CapabilityProfile = Map<MisconceptionTagId, CapabilityProfileEntry>;

function newId(): string {
  return `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Read the capabilities a MOVE demonstrated. Pure — no DB, no side effects — so
 * it can be unit-tested against a board and reused by any surface.
 *
 * Returns [] when the move cost too much to demonstrate anything, or when no
 * fundamental was live enough on that board for the answer to mean something.
 */
export function capabilitiesShown(
  fenBefore: string,
  playedSan: string,
  moverColor: 'white' | 'black',
  cpLoss: number | null,
): Array<{ tag: MisconceptionTagId; posedImportance: number }> {
  if (!movePlayedCleanly(cpLoss)) return [];
  return capabilitiesPosed(fenBefore, playedSan, moverColor);
}

/**
 * WAS THE MOVE CLEAN ENOUGH TO DEMONSTRATE ANYTHING — the one place that
 * judgement is made, so no caller re-derives the threshold.
 */
export function movePlayedCleanly(cpLoss: number | null): boolean {
  return !(cpLoss != null && cpLoss >= MISTAKE_CP);
}

/**
 * WHAT THE BOARD ASKED, regardless of how the student answered.
 *
 * This is the same computer as `capabilitiesShown` MINUS the mistake guard, and
 * the split matters because the two halves of the student model need different
 * things from it:
 *
 *  • GREEN ("they can do this") needs posed AND answered cleanly — a move that
 *    dropped a pawn demonstrates nothing, which is why `capabilitiesShown`
 *    guards.
 *  • NEED ("do they need teaching here") needs only POSED. A ply where the
 *    student's known hole was live is exactly where teaching belongs, and it is
 *    MOST live on the plies they got wrong — so applying the green guard there
 *    would blind the coach precisely at the moment it should speak.
 *
 * Extracted rather than copied: one computer, two consumers, the guard visible
 * at the boundary instead of hidden in which list a caller happened to be
 * handed.
 */
export function capabilitiesPosed(
  fenBefore: string,
  playedSan: string,
  moverColor: 'white' | 'black',
): Array<{ tag: MisconceptionTagId; posedImportance: number }> {
  const out: Array<{ tag: MisconceptionTagId; posedImportance: number }> = [];
  const seen = new Set<string>();
  for (const f of leadingFundamentals(fenBefore, playedSan, moverColor)) {
    if (f.weight < POSED_IMPORTANCE_MIN) continue;   // the board never asked
    const tag = MOVE_FUNDAMENTAL_TAG[f.id];
    if (!tag || seen.has(tag)) continue;                 // honest null, not a guess
    seen.add(tag);
    out.push({ tag, posedImportance: f.weight });
  }
  return out;
}

/**
 * Record what a move demonstrated — OR FAILED TO. Fire-and-forget; never throws
 * into a caller's turn — a student model that can break the board is worse than
 * no student model. Returns the number of rows written so a gate can prove it
 * FIRED ("a wire that does not fire is not a wire").
 *
 * 🔒 ONE COMPUTER, BOTH DIRECTIONS (2026-09-19). This wrote `held` and nothing
 * else, so `CapabilityOutcome` declared two members and the store only ever
 * contained one — and BOTH readers (`needScore.capabilityTerm`,
 * `studentMomentBoost`) guarded on `broken > 0`, which made those guards
 * unreachable code describing a state that could not exist. The half that was
 * missing is the same computer with the guard flipped: `capabilitiesPosed` says
 * what the board ASKED, and `movePlayedCleanly` says whether they answered it.
 * Clean answer → `held`. Costly answer → `broken`. Neither is inferred from the
 * other and neither is guessed.
 *
 * It is deliberately NOT a second weakness spine: the negative half still owns
 * RED and the drill queue. This records whether a capability the board actually
 * POSED was demonstrated, which is the only thing that can turn a tag GREEN —
 * and therefore the only thing that can turn it back.
 */
export async function recordCapabilityEvidence(args: {
  fenBefore: string;
  playedSan: string;
  moverColor: 'white' | 'black';
  cpLoss: number | null;
  origin: CapabilityEvidenceRecord['origin'];
  /** See `CapabilityEvidenceRecord.prompted` — required, never inferred. */
  prompted: boolean;
  sourceGameId?: string;
}): Promise<number> {
  try {
    // ASKED, regardless of how it went — the outcome is decided once, below,
    // so the two directions can never disagree about what the board posed.
    const posed = capabilitiesPosed(args.fenBefore, args.playedSan, args.moverColor);
    if (posed.length === 0) return 0;
    const outcome: CapabilityOutcome = movePlayedCleanly(args.cpLoss) ? 'held' : 'broken';
    const shown = posed;
    const now = Date.now();
    const rows: CapabilityEvidenceRecord[] = shown.map((s) => ({
      id: newId(),
      tag: s.tag,
      outcome,
      fen: args.fenBefore,
      playedSan: args.playedSan,
      posedImportance: s.posedImportance,
      recordedAt: now,
      origin: args.origin,
      prompted: args.prompted,
      ...(args.sourceGameId ? { sourceGameId: args.sourceGameId } : {}),
    }));
    await db.capabilityEvidence.bulkAdd(rows);
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'capabilityEvidence.recordCapabilitiesShown',
      summary: `${outcome} x${rows.length} [${rows.map((r) => r.tag).join(', ')}] from ${args.origin}`,
      details: JSON.stringify({ origin: args.origin, outcome, tags: rows.map((r) => r.tag) }),
      fen: args.fenBefore,
    });
    return rows.length;
  } catch {
    return 0;   // never break the caller's turn over telemetry
  }
}

/**
 * The capability profile. ABSENT means UNKNOWN — the caller must not read a
 * missing tag as either mastery or a hole (absent ≠ silent).
 */
export async function getCapabilityProfile(): Promise<CapabilityProfile> {
  const profile: CapabilityProfile = new Map();
  try {
    const rows = await db.capabilityEvidence.toArray();
    for (const r of rows) {
      if (!isMisconceptionTagId(r.tag)) continue;
      // A PROMPTED ROW IS NEITHER. The student answered a question the coach
      // had already answered for them, so it proves nothing either way — and
      // counting it would let the app's own teaching mark a capability proven
      // and then go quiet about it. Skipped entirely rather than recorded as
      // `broken`, because being told is not failing.
      //
      // Legacy rows (written before this field existed) read as unprompted,
      // which is what they were: nothing prompted back then.
      // Legacy rows have no `prompted` field; `undefined` is falsy and reads
      // as unprompted, which is exactly what they were — nothing prompted
      // before this existed.
      if (r.prompted) continue;
      const e = profile.get(r.tag) ?? { held: 0, broken: 0 };
      if (r.outcome === 'held') e.held += 1; else e.broken += 1;
      profile.set(r.tag, e);
    }
  } catch { /* no store yet — an empty profile is the honest answer */ }
  return profile;
}

/** @deprecated Renamed to `recordCapabilityEvidence` — it no longer only
 *  records what was SHOWN. Kept so the rename is a one-line change at each
 *  call site rather than a flag day; delete once the last caller moves. */
export const recordCapabilitiesShown = recordCapabilityEvidence;
