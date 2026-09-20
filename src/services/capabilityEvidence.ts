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

/** How many clean answers in a row earn GREEN. Lives here, beside the profile
 *  that computes the streak, so the bar and the evidence cannot drift; it used
 *  to sit in `needScore`, which is only one of its two readers. */
export const HELD_FOR_PROVEN = 3;

/** …and they must span at least this many DISTINCT GAMES. The loop's unit is
 *  the game: green's claim is "you did it again NEXT TIME", which a single
 *  game cannot evidence however many times the board asked inside it. */
export const PROVEN_MIN_GAMES = 2;

/** Per tag: the lifetime counts, plus the RECENT clean streak that decides
 *  green. A tag absent from the map is UNKNOWN — NOT broken and NOT held. */
export interface CapabilityProfileEntry {
  held: number;
  broken: number;
  /** Consecutive `held` rows at the END of this tag's history (newest first,
   *  stopped by the first `broken`). Prompted rows are skipped entirely, so
   *  being TOLD the answer neither proves nor breaks anything. */
  heldStreak: number;
  /** Distinct `sourceGameId`s inside that streak. Rows with no game id count
   *  toward the streak but not toward this — honest rather than invented. */
  streakGames: number;
}

/**
 * IS THIS CAPABILITY PROVEN — the ONE definition, read by every consumer.
 *
 * It was written twice (`needScore.capabilityTerm` and
 * `studentMomentBoost.isUnproven`), which is the duplicated-judgement the rot
 * rule bans: two readers of the same question that can drift apart silently.
 *
 * MEASURED 2026-09-20, and both halves of this rule come from the numbers:
 *  • `held >= 3` alone is satisfiable INSIDE ONE GAME — 6 of 6 real game-seats
 *    proved a capability off a single game — and it does not hold: one
 *    student's `neglected-development` was proven after game 1 and BROKEN in
 *    game 5, so the coach would have gone quiet for four games and then
 *    watched them do it again. Hence the distinct-GAMES requirement.
 *  • the old rule also demanded a LIFETIME `broken === 0`, so a single break
 *    ever barred a tag from green permanently — a student who FIXES a weakness
 *    could never go green, which is the one thing the heat map exists to say.
 *    Hence a RECENT STREAK rather than a lifetime count: a break resets the
 *    streak, it does not close the door.
 */
export function capabilityProven(
  e: CapabilityProfileEntry | undefined,
  /** Thresholds, defaulted to the shipped bar. Parameterised ONLY so a
   *  calibration pass can sweep the real rule rather than re-deriving it —
   *  a measurement that re-implements what it measures measures itself.
   *  Production callers pass nothing. */
  bar: { minStreak?: number; minGames?: number } = {},
): boolean {
  if (!e) return false;                                   // GREY — never asked is never proven
  return e.heldStreak >= (bar.minStreak ?? HELD_FOR_PROVEN)
    && e.streakGames >= (bar.minGames ?? PROVEN_MIN_GAMES);
}

/**
 * The profile as a PURE function of rows — the same walk `getCapabilityProfile`
 * does, minus the Dexie read, so a calibration can replay real recorded
 * evidence under different thresholds without touching the engine or the DB.
 */
export function summariseEvidence(all: CapabilityEvidenceRecord[]): CapabilityProfile {
  const profile: CapabilityProfile = new Map();
  const rows = [...all].sort((a, b) => a.recordedAt - b.recordedAt);
  const history = new Map<MisconceptionTagId, CapabilityEvidenceRecord[]>();
  for (const r of rows) {
    if (r.prompted) continue;
    if (!isMisconceptionTagId(r.tag)) continue;
    const e = profile.get(r.tag) ?? { held: 0, broken: 0, heldStreak: 0, streakGames: 0 };
    if (r.outcome === 'held') e.held += 1; else e.broken += 1;
    profile.set(r.tag, e);
    const h = history.get(r.tag) ?? [];
    h.push(r);
    history.set(r.tag, h);
  }
  for (const [tag, h] of history) {
    const e = profile.get(tag);
    if (!e) continue;
    const games = new Set<string>();
    let streak = 0;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].outcome !== 'held') break;
      streak += 1;
      if (h[i].sourceGameId) games.add(h[i].sourceGameId as string);
    }
    e.heldStreak = streak;
    e.streakGames = games.size;
  }
  return profile;
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
  try {
    return summariseEvidence(await db.capabilityEvidence.toArray());
  } catch {
    return new Map();   // no store yet — an empty profile is the honest answer
  }
}

/** @deprecated Renamed to `recordCapabilityEvidence` — it no longer only
 *  records what was SHOWN. Kept so the rename is a one-line change at each
 *  call site rather than a flag day; delete once the last caller moves. */
export const recordCapabilitiesShown = recordCapabilityEvidence;
