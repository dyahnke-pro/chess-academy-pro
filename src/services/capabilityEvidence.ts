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
import { MISTAKE_CP } from './engineConstants';
import { logAppAudit } from './appAuditor';
import { emitWeaknessModelChanged } from './weaknessModelEvents';
import { leadingFundamentals, MOVE_FUNDAMENTAL_TAG } from './moveFundamentals';
import { skillQuestions } from './skillQuestions';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import { pvUciToSan } from './principleAttribution';
import { namedShotTag, namedShotTags, SHOT_CATCH_ALL } from './motifNaming';
import { stalemateWatch } from './stalemateWatch';
import { captureAbandonsDuty, cPawnBlock } from './exchangeIdeas';
import { Chess } from 'chess.js';
import { matesInOne } from './opponentMoveReads';
import { asIfToMove } from './positionReadingService';
import { isMisconceptionTagId, type MisconceptionTagId } from '../data/misconceptionTags';
import { positionOf } from '../utils/samePosition';
import { memoOverTable, type TableMemo } from './tableMemo';
import { evidenceMirror, slipMirror } from './recordMirror';
import {
  holdRecords, holdState, NEVER_POSED, HOLD_WINDOW, HOLD_MIN_POSED, HOLD_GREEN, HOLD_SHORT,
  type HoldRecord,
} from './holdRate';
import type { MisconceptionTagRecord } from '../types';

/** How live the fundamental had to be on THIS board before answering it counts
 *  as evidence. `importance` is 0-100 and already rates the board, not the move,
 *  so this is the "was the question asked" bar — not a cap on what is recorded
 *  (G4.5): every fundamental clearing it is written, however many that is. */
const POSED_IMPORTANCE_MIN = 45;

/** A move that cost this much or more is not a demonstration of anything, even
 *  if it happened to serve a fundamental on the way past.
 *
 *  Imported, NOT retyped (2026-09-20): this was a local `= 100` sitting beside
 *  the same number declared in `engineConstants`, so "mistake" had a second
 *  definition here that no change to the first would ever reach. `engineConstants`
 *  has zero imports, so taking it costs this module nothing. */

export type CapabilityOutcome = 'held' | 'broken';

/** Every surface that writes a row. A new member fails to compile until
 *  `EVIDENCE_READING` below says whether it proves KNOW or USE. */
export type EvidenceOrigin = 'play' | 'review' | 'learn' | 'drill' | 'puzzle' | 'lesson' | 'reading';

/**
 * KNOW vs USE (David 2026-10-04, decision #2: "Lessons prove KNOW, games prove
 * USE"). A lesson tap or a reading question is the most CONTROLLED evidence the
 * app gets — position, question and key all known — but it says the student
 * KNOWS the idea, not that they USE it at the board. The two are read through
 * the SAME bar (`capabilityProven`), on disjoint rows, so a capability can be
 * known and not yet used — the gap the coach acts on — and the heat map's USE
 * reading is unchanged by lesson data.
 *
 * Exhaustive over the origin union: a new origin fails to compile until
 * someone decides which half it proves.
 */
export type EvidenceReading = 'know' | 'use';
export const EVIDENCE_READING = {
  play: 'use',
  review: 'use',
  learn: 'use',
  drill: 'use',
  puzzle: 'use',
  lesson: 'know',
  reading: 'know',
} as const satisfies Record<EvidenceOrigin, EvidenceReading>;

/** True for a row the USE reading (the heat map, need, the ranker) counts.
 *  Readers of RAW rows (the skill timeline, trap meetings) filter with this so
 *  a lesson tap never reads as a game. */
export function isUseEvidence(r: Pick<CapabilityEvidenceRecord, 'origin'>): boolean {
  return EVIDENCE_READING[r.origin] === 'use';
}

/** Who helped before the answer landed, weakest first. `nudge` ("one more")
 *  reveals neither a square nor the count, so it does not make a row
 *  prompted; `hint`, `show` and `dont-know` do. */
export type AnswerHelp = 'none' | 'nudge' | 'hint' | 'show' | 'dont-know';

/** What a student's ANSWER looked like — the widened row (Learn how to think
 *  C2: "the highest-trust data in the app"). Unindexed, so no Dexie bump. */
export interface AnswerDetail {
  /** Every tap in order, with whether it was in the key. */
  taps: Array<{ square: string; right: boolean }>;
  /** Taps outside the key, in order (guess-proofing: each one is wrong). */
  extras: string[];
  /** Wrong answers before it settled: wrong taps, or wrong typed submits. */
  wrongAttempts: number;
  /** The help already given when the FIRST wrong answer landed. A miss made
   *  before any hint is clean evidence the student did not know — the hint
   *  that followed it does not turn that failure into "they were told". */
  firstMissHelp?: AnswerHelp;
  /** ms from the question appearing to the first tap/answer; null = none. */
  msToFirst: number | null;
  /** ms between consecutive taps. */
  msBetween: number[];
  help: AnswerHelp;
  /** Answered by voice rather than by tap/typing. */
  spoken: boolean;
  /** How far down a follow-up chain this question sat (0 = the first ask). */
  chainDepth: number;
  /** The misconception each wrong tap mapped to (`wrongTapTag`), deduped. */
  wrongTags: MisconceptionTagId[];
  /** Free text when the answer was typed rather than tapped. */
  typed?: string;
  /** Which question on the surface (`ReadingQuestion.id`) and its key size. */
  questionId?: string;
  keySize?: number;
  /** The surface that asked, for the audit (`analysis-practice`, `review-reading`, …). */
  surface?: string;
}

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
  /** Which surface saw it — an honest null is better than a guess.
   *  `puzzle` = a GENERIC position (Lichess puzzle), not one from the
   *  student's own games. It carries no `sourceGameId`, so it counts toward a
   *  held streak but never toward the distinct-GAMES bar: generic puzzles can
   *  support a capability and can break one, but can never prove it alone.
   *  `lesson` / `reading` = an ANSWER to a question the coach put on a board
   *  (a lesson tap, Analysis Practice, the Review reading card). Those are
   *  KNOW evidence and are read apart from the rest (`EVIDENCE_READING`). */
  origin: EvidenceOrigin;
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
  /** The student took this move back (Learn): still a slip on the record, marked so an exploration reads apart from a move they kept. */
  takenBack?: true;
  /** The coach steered the game into this question (a Learn focus game). A
   *  steered HOLD counts half in the hold rate; a steered miss counts in full. */
  steered?: true;
  /** Present on an ANSWER row (a KNOW origin): how the student answered. */
  answer?: AnswerDetail;
}

/**
 * HOW HARD THE BOARD'S QUESTION HAD TO BE for answering it to count as
 * evidence. This is the variable that decides green; everything else was
 * noise.
 *
 * MEASURED, 15 games / 198 held rows / one student, sweeping the floor and
 * counting how many capabilities the coach DECLARED and then watched fail:
 *
 *   floor   proven   flipped
 *     65      4         2
 *     74      3         1
 *     78      3         1
 *     80      2         0     ← the knee, and a plateau (80/82/84 identical)
 *     86      1         0
 *
 * Below 80 the coach goes quiet about a capability the student then fails;
 * above it green is merely rarer for no gain. At the shipped floor (the old
 * rule effectively took anything, min observed 48) the same 15 games produced
 * NINETEEN flip events across 2 tags — the coach repeatedly declaring a
 * weakness fixed and then watching it happen again.
 *
 * A hold BELOW this floor is not counted and does not break the streak — it
 * is not failure, it is simply not evidence. Only a `broken` row resets.
 *
 * NB `POSED_IMPORTANCE_MIN` (45) is a different question — whether the board
 * asked AT ALL, i.e. whether to record a row. The lowest importance actually
 * observed on a real hold was 48, so that floor never bites in practice.
 */
export const PROVEN_MIN_IMPORTANCE = 80;

/** Per tag: the lifetime counts, the recent clean streak (descriptive), and
 *  the HOLD RATE that decides green. A tag absent from the map is UNKNOWN —
 *  NOT broken and NOT held. */
export interface CapabilityProfileEntry {
  held: number;
  broken: number;
  /** Consecutive `held` rows at the END of this tag's history (newest first,
   *  stopped by the first `broken`). Prompted rows are skipped entirely, so
   *  being TOLD the answer neither proves nor breaks anything. */
  heldStreak: number;
  /** Distinct SOURCES inside that streak. USE: `sourceGameId`s — rows with no
   *  game id count toward the streak but not toward this, honest rather than
   *  invented. KNOW: distinct POSITIONS (`positionSourceKey`), because a lesson
   *  is not a game; the claim green makes is "did it again on a different
   *  board", which two positions evidence the way two games do. */
  streakGames: number;
  /** THE PROOF IN CREDIT, not rows (2026-10-18): a sharp question answered is
   *  1, a ROUTINE one (the board poses development, space, rook activity, the
   *  pawn break and the plan below the sharp bar, by construction) is
   *  `ROUTINE_CREDIT`. Before this, those skills could never turn green for
   *  anyone — Carlsen, 40 games, development posed 218 times, never proven —
   *  so the coach kept teaching a 2800 to develop his pieces. Absent on old
   *  callers = `heldStreak`. */
  streakCredit?: number;
  /** THE STATE (`holdRate`): held vs missed over the last 20 times posed,
   *  slips included. `capabilityProven` reads this and nothing else. */
  hold: HoldRecord;
}

/** What a ROUTINE question (posed, below the sharp bar) is worth toward the
 *  proof: half — twice the clean answers, the same games bar. */
const ROUTINE_CREDIT = 0.5;

/**
 * IS THIS CAPABILITY PROVEN — the ONE definition, read by every consumer: the
 * hold rate is green (≥ 90% held over the last 20 times posed, at least 8
 * posed; `holdRate`). It REPLACES the held streak (2 in a row across 2 games,
 * 2026-09-20), which called a skill proven while the record held hundreds of
 * open misses for it (David's hung-material, 2026-10-19). There is no second
 * bar: the heat map, the fade, the threat voice, the need score and the
 * ranker boost all read this.
 */
export function capabilityProven(e: CapabilityProfileEntry | undefined): boolean {
  return holdState(e?.hold) === 'green';
}

/**
 * The profile as a PURE function of rows — the same walk `getCapabilityProfile`
 * does, minus the Dexie read, so a calibration can replay real recorded
 * evidence under different thresholds without touching the engine or the DB.
 */
export function summariseEvidence(
  all: readonly CapabilityEvidenceRecord[],
  /** The student's recorded slips — the other half of the record (REQUIRED:
   *  a profile read off the answers alone called proven what the slips said
   *  was still being missed). Game slips count for the USE reading only. */
  slips: readonly MisconceptionTagRecord[],
  /** The difficulty floor, defaulted to the shipped one. Parameterised for
   *  the same reason `capabilityProven`'s bar is: a calibration must be able
   *  to sweep BELOW the shipped value, and baking it in made the sweep report
   *  zero flips at every floor — an instrument that cannot vary its variable
   *  is green for free. Production callers pass nothing. */
  bar: { minImportance?: number } = {},
  /** Which half of the record to read (decision #2). Defaults to USE — every
   *  existing consumer (heat map, need, ranker) — so lesson answers never
   *  change what a game proved. */
  reading: EvidenceReading = 'use',
): CapabilityProfile {
  const minImportance = bar.minImportance ?? PROVEN_MIN_IMPORTANCE;
  const profile: CapabilityProfile = new Map();
  const rows = [...all].sort((a, b) => a.recordedAt - b.recordedAt);
  const history = new Map<MisconceptionTagId, CapabilityEvidenceRecord[]>();
  const read: CapabilityEvidenceRecord[] = [];
  for (const r of rows) {
    // A row whose origin is not in the table (a future build's row read by an
    // older one) is read as USE — the reading every row was before the split.
    if (((EVIDENCE_READING as Partial<Record<string, EvidenceReading>>)[r.origin] ?? 'use') !== reading) continue;
    if (r.prompted) continue;
    if (!isMisconceptionTagId(r.tag)) continue;
    // "Posed" is the board asking at all (`POSED_IMPORTANCE_MIN`); a row below
    // it is on the record but is not one of the times the board asked.
    if ((r.posedImportance ?? 0) >= POSED_IMPORTANCE_MIN) read.push(r);
    const e = profile.get(r.tag) ?? { held: 0, broken: 0, heldStreak: 0, streakGames: 0, hold: NEVER_POSED };
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
    let credit = 0;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].outcome !== 'held') break;            // a FAILURE resets the streak
      // …but an easy hold is not a failure and not evidence: skip it and keep
      // walking, so a quiet game neither proves nor un-proves anything. A
      // ROUTINE question (posed, below the sharp bar) counts at half.
      const imp = h[i].posedImportance ?? 0;
      const step = imp >= minImportance ? 1 : imp >= POSED_IMPORTANCE_MIN ? ROUTINE_CREDIT : 0;
      if (step === 0) continue;
      streak += 1;
      credit += step;
      const source = reading === 'know' ? positionSourceKey(h[i].fen) : h[i].sourceGameId;
      if (source) games.add(source);
    }
    e.heldStreak = streak;
    e.streakCredit = credit;
    e.streakGames = games.size;
  }
  // THE STATE: the hold rate over both halves. A skill with slips and no
  // answers gets an entry too — the board posed it and they missed it.
  for (const [tag, hold] of holdRecords(read, reading === 'use' ? slips : [])) {
    const e = profile.get(tag) ?? { held: 0, broken: 0, heldStreak: 0, streakGames: 0, hold };
    e.hold = hold;
    profile.set(tag, e);
  }
  return profile;
}
export type CapabilityProfile = Map<MisconceptionTagId, CapabilityProfileEntry>;

/** The KNOW reading's source key: the position, without the move counters, so
 *  the same board reached twice is one source. Null on an empty FEN. */
function positionSourceKey(fen: string): string | null {
  const key = positionOf(fen);
  return key.length > 0 ? key : null;
}

/** KNOW and USE for one capability, both through `capabilityProven`. */
interface CapabilityStanding {
  know: boolean;
  use: boolean;
}

/** Pure: the standing of every tag that has any evidence, from raw rows. */
export function standingFromEvidence(
  all: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
): Map<MisconceptionTagId, CapabilityStanding> {
  const know = summariseEvidence(all, [], {}, 'know');
  const use = summariseEvidence(all, slips, {}, 'use');
  const out = new Map<MisconceptionTagId, CapabilityStanding>();
  for (const tag of new Set([...know.keys(), ...use.keys()])) {
    out.set(tag, { know: capabilityProven(know.get(tag)), use: capabilityProven(use.get(tag)) });
  }
  return out;
}

/** Is this capability KNOWN (lessons/reading) and USED (games)? GREY on both
 *  when nothing was ever asked — absent is never proven. */
export async function capabilityStanding(tag: MisconceptionTagId): Promise<CapabilityStanding> {
  try {
    const rows = await db.capabilityEvidence.where('tag').equals(tag).toArray();
    const slips = await db.misconceptionTags.where('tag').equals(tag).toArray();
    return standingFromEvidence(rows, slips).get(tag) ?? { know: false, use: false };
  } catch {
    return { know: false, use: false };
  }
}

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
  return capabilitiesPosed(fenBefore, playedSan, moverColor).filter((p) => p.outcome !== 'broken');
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
): Array<{ tag: MisconceptionTagId; posedImportance: number; outcome?: CapabilityOutcome }> {
  const out: Array<{ tag: MisconceptionTagId; posedImportance: number; outcome?: CapabilityOutcome }> = [];
  const seen = new Set<string>();
  for (const f of leadingFundamentals(fenBefore, playedSan, moverColor)) {
    if (f.weight < POSED_IMPORTANCE_MIN) continue;   // the board never asked
    const tag = MOVE_FUNDAMENTAL_TAG[f.id];
    if (!tag || seen.has(tag)) continue;                 // honest null, not a guess
    seen.add(tag);
    out.push({ tag, posedImportance: f.weight });
  }
  // A MATE THREAT AGAINST YOU (computers batch 2, the quiet-danger read): give
  // them the move and they mate at once. The board asked "do you see it?" —
  // the question `quietDanger` TEACHES, filed under the same tag the ignored-
  // threat fundamental uses, so teaching and diagnosis speak one vocabulary.
  if (!seen.has('missed-opponents-threat')) {
    try {
      const probe = asIfToMove(fenBefore, moverColor === 'white' ? 'b' : 'w');
      if (probe && matesInOne(probe).length > 0) {
        seen.add('missed-opponents-threat');
        out.push({ tag: 'missed-opponents-threat', posedImportance: MATE_THREAT_POSED });
      }
    } catch { /* an unreadable board posed nothing */ }
  }
  // A WON GAME WITH A STALEMATE ON THE BOARD (P3 heat map): the board asked
  // "which of your moves throws the win away?". A stalemating move costs the
  // whole game, so `movePlayedCleanly` sorts held from broken on its own.
  if (!seen.has('botched-conversion')) {
    try {
      if (stalemateWatch(fenBefore, moverColor === 'white' ? 'w' : 'b')) out.push({ tag: 'botched-conversion', posedImportance: STALEMATE_POSED });
    } catch { /* an unreadable board posed nothing */ }
  }
  // A CAPTURE THAT LEAVES ITS POST (computers batch 5, the abandoned duty):
  // the board asked "does that capture abandon a guard?". A capture that does
  // costs the mate or the piece, so `movePlayedCleanly` sorts held from broken.
  try {
    const lost = captureAbandonsDuty(fenBefore);
    const tag: MisconceptionTagId | null = lost === 'mate' ? 'missed-opponents-threat' : lost === 'material' ? 'hung-material' : null;
    if (tag && !seen.has(tag)) { seen.add(tag); out.push({ tag, posedImportance: ABANDONED_DUTY_POSED }); }
  } catch { /* an unreadable board posed nothing */ }
  // THE SKILLS THAT COULD ONLY BE FAILED (2026-10-18): castling in time, the
  // free-looking pawn, the even trade, which pawn takes, the sacrifice by the
  // king. Each had a detector for the miss and nothing that noticed the board
  // asking, so its tile could turn red and never green.
  try {
    for (const q of skillQuestions(fenBefore)) {
      if (seen.has(q.tag)) continue;
      seen.add(q.tag);
      out.push(q);
    }
  } catch { /* an unreadable board posed nothing */ }
  // THE QUEEN'S KNIGHT IN A D-PAWN OPENING (missed computers, 2026-10-08):
  // the student's knight leaves b1/b8 while c3/c6 would block the c-pawn
  // (`cPawnBlock`'s own conditions). The answer is WHERE it went, not what it
  // cost — a blocked c-pawn rarely costs a pawn, so cpLoss would call the block
  // "held". c3 → broken; any other square → held.
  if (!seen.has('misplaced-piece')) {
    try {
      const block = queensKnightChoice(fenBefore, playedSan, moverColor === 'white' ? 'w' : 'b');
      if (block) { seen.add('misplaced-piece'); out.push({ tag: 'misplaced-piece', posedImportance: C_PAWN_POSED, outcome: block }); }
    } catch { /* an unreadable board posed nothing */ }
  }
  return out;
}

/** The tag a costly move is filed under, read the way the record files it. */
function classifiedSlipTag(args: { fenBefore: string; playedSan: string; bestSan?: string; historySans?: readonly string[]; shotLine?: readonly string[] }): string | null {
  if (!args.bestSan) return null;
  try {
    // The best line rides along, so the slip is named from the same line as
    // the shot (`namedShotTags`).
    const afterBest = args.shotLine && args.shotLine.length > 1 ? pvUciToSan(args.fenBefore, args.shotLine).slice(1) : [];
    return classifyMisconceptionNow({
      fen: args.fenBefore, playedSan: args.playedSan, bestSan: args.bestSan,
      ...(args.historySans ? { historySans: [...args.historySans] } : {}),
      ...(afterBest.length ? { pvAfterBest: afterBest } : {}),
    })?.tag ?? null;
  } catch { return null; }
}

/** A modest question: enough to count for NEED, below the green bar alone. */
const C_PAWN_POSED = 60;

/** Held / broken for the queen's-knight choice, or null when the board did
 *  not ask it (the knight did not move, or c3/c6 would not block anything). */
function queensKnightChoice(fenBefore: string, playedSan: string, side: 'w' | 'b'): CapabilityOutcome | null {
  const c = new Chess(fenBefore);
  if (c.turn() !== side) return null;
  const home = side === 'w' ? 'b1' : 'b8';
  const blockSq = side === 'w' ? 'c3' : 'c6';
  const played = new Chess(fenBefore).move(playedSan);
  if (!played || played.from !== home || played.piece !== 'n') return null;
  let blockSan: string;
  try { blockSan = c.move({ from: home, to: blockSq }).san; } catch { return null; }
  if (!cPawnBlock(fenBefore, blockSan, side, null)) return null;
  return played.to === blockSq ? 'broken' : 'held';
}

/** A capture that would leave a mate or a piece behind is a real question. */
const ABANDONED_DUTY_POSED = 85;

/** A win on the line is a question worth the green bar. */
const STALEMATE_POSED = 90;
/** A mate in one against you is the sharpest question a board can ask. */
const MATE_THREAT_POSED = 95;

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
/** What one move is scored on: the posing and the outcome rule, shared. */
export interface CapabilityMoveArgs {
  fenBefore: string;
  playedSan: string;
  moverColor: 'white' | 'black';
  cpLoss: number | null;
  /** What the INSIGHT computer says this position posed (moveInsight —
   *  their threat, the escape square, a named pattern, the drawback the
   *  played move walked into). Both directions: held when the move was clean,
   *  broken when it was not — one vocabulary for teaching and diagnosis. */
  alsoPosed?: ReadonlyArray<{ tag: MisconceptionTagId; posedImportance: number }>;
  /** WHAT A COSTLY MOVE WAS ABOUT — the slip's own classified tag, when the
   *  caller has it (the analysis sweep). Absent, it is classified here from the
   *  board and the best move. See `brokenOnlyOwnSkill`. */
  slipTag?: string | null;
  bestSan?: string;
  historySans?: readonly string[];
  /** THE LINE THE SHOT IS NAMED FROM (UCI, its first move first): on a costly
   *  move the engine's line from the best move; on a clean one the game's own
   *  continuation from the move played. Without it a shot is named from its
   *  first move alone, and a tactic that exists only as a line (a deflection,
   *  an x-ray, a pawn run) never reaches the record (WO-MOTIFS-01 M3d). */
  shotLine?: readonly string[];
}

/**
 * THE ONE SCORING OF A MOVE — which skills it answered, and how. PURE, so the
 * record (`recordCapabilityEvidence`) and the skill-difficulty calibration
 * score a move the same way: a meter compares the student against a population
 * measured by THIS function, never by a copy of it (2026-10-18 — the copy posed
 * fewer questions and broke every posed skill on a costly move, so the student
 * held 94% where the population held 82% and Endgames read Level 29).
 */
export function capabilityOutcomes(args: CapabilityMoveArgs): Array<{ tag: MisconceptionTagId; outcome: CapabilityOutcome; posedImportance: number }> {
  // ASKED, regardless of how it went — the outcome is decided once, below,
  // so the two directions can never disagree about what the board posed.
  const posed = capabilitiesPosed(args.fenBefore, args.playedSan, args.moverColor);
  for (const extra of args.alsoPosed ?? []) {
    // The same bar as the fundamentals: a question the board barely asked is
    // not evidence either way (it had been skipped for these extras only).
    if (extra.posedImportance < POSED_IMPORTANCE_MIN) continue;
    if (!posed.some((p) => p.tag === extra.tag)) posed.push({ tag: extra.tag, posedImportance: extra.posedImportance });
  }
  if (posed.length === 0) return [];
  const clean = movePlayedCleanly(args.cpLoss);
  const outcome: CapabilityOutcome = clean ? 'held' : 'broken';
  // THE SHOT, NAMED (WO-MOTIFS-01): the catch-all is filed under its motif's
  // row — named from the best move (the question the board posed), or from the
  // clean move played when the caller has no best move. A costly move with no
  // best move stays the catch-all: the played move was the miss, not the shot.
  // The posed tag and the slip tag are named by this one function from the
  // same move, so a miss still breaks the skill it was about.
  // COUNT BOTH (David 2026-10-22): a shot whose line opens with a set-up
  // names two rows — the line's name and the set-up — and is asked, held and
  // missed under both.
  let shots: MisconceptionTagId[] | undefined;
  const shotTags = (): MisconceptionTagId[] => (shots ??= namedShotTags(args.fenBefore, args.bestSan ?? (clean ? args.playedSan : null), args.shotLine));
  const namedPosed = new Map<MisconceptionTagId, (typeof posed)[number]>();
  for (const p of posed) {
    for (const tag of p.tag === SHOT_CATCH_ALL ? shotTags() : [p.tag]) {
      const had = namedPosed.get(tag);
      if (!had || had.posedImportance < p.posedImportance) namedPosed.set(tag, { ...p, tag });
    }
  }
  posed.splice(0, posed.length, ...namedPosed.values());
  // 🔒 A SLIP BREAKS ONLY THE SKILL IT WAS ABOUT (2026-10-18). A costly move
  // used to break EVERY skill the board posed on it — a tactic missed in the
  // opening broke development, space and king safety at once — and on one
  // real student's 80 games 94% of greens flipped back to broken. Breaking
  // only the slip's own skill took that to 41% (`expertFade.measure`). The
  // other skills posed on a costly move are neither held nor broken: the move
  // was not a clean answer to them, and not a wrong one.
  const rawSlip = clean ? null : args.slipTag !== undefined ? args.slipTag : classifiedSlipTag(args);
  // A slip ON THE SHOT breaks every row the shot is named under.
  const slipTags: ReadonlySet<string> | null = rawSlip === null ? null
    : new Set(rawSlip === SHOT_CATCH_ALL || shotTags().includes(rawSlip as MisconceptionTagId) ? shotTags() : [rawSlip]);
  // NO SLIP TAG (a puzzle's wrong answer: no best move to classify against)
  // means the move failed the question it was asked, and the board's posed
  // skills ARE that question — they break, as before the rule.
  const shown = clean || slipTags === null ? posed : posed.filter((s) => s.outcome === 'broken' || slipTags.has(s.tag));
  // A posed question that carries its own answer (the knight choice) can
  // only make the row BROKEN; held still needs a clean move overall.
  return shown.map((s) => ({ tag: s.tag, outcome: s.outcome === 'broken' ? 'broken' : outcome, posedImportance: s.posedImportance }));
}

export async function recordCapabilityEvidence(args: CapabilityMoveArgs & {
  origin: CapabilityEvidenceRecord['origin'];
  /** See `CapabilityEvidenceRecord.prompted` — required, never inferred. */
  prompted: boolean;
  sourceGameId?: string;
  takenBack?: boolean;
  /** See `CapabilityEvidenceRecord.steered`. */
  steered?: boolean;
  /** When the move was PLAYED, for evidence read from a past game (its date).
   *  Omitted = now (a live move). */
  playedAt?: number;
}): Promise<number> {
  try {
    const shown = capabilityOutcomes(args);
    if (shown.length === 0) return 0;
    const now = args.playedAt ?? Date.now();
    const rows: CapabilityEvidenceRecord[] = shown.map((s) => ({
      id: newId(),
      tag: s.tag,
      outcome: s.outcome,
      fen: args.fenBefore,
      playedSan: args.playedSan,
      posedImportance: s.posedImportance,
      recordedAt: now,
      origin: args.origin,
      prompted: args.prompted,
      ...(args.sourceGameId ? { sourceGameId: args.sourceGameId } : {}),
      ...(args.takenBack ? { takenBack: true as const } : {}),
      ...(args.steered ? { steered: true as const } : {}),
    }));
    await db.capabilityEvidence.bulkAdd(rows);
    // Green/red moved: every reader of the student model refreshes now.
    emitWeaknessModelChanged();
    // A whole-game sweep (origin 'review') writes one summary row per game at
    // its caller; a row per position flooded the 300-row log and pushed the
    // live game out of it (David's drop, 2026-10-19: 236 of 300 rows).
    if (args.origin !== 'review') void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'capabilityEvidence.recordCapabilitiesShown',
      summary: `${rows[0].outcome} x${rows.length} [${rows.map((r) => r.tag).join(', ')}] from ${args.origin}`,
      details: JSON.stringify({ origin: args.origin, outcome: rows[0].outcome, tags: rows.map((r) => r.tag) }),
      fen: args.fenBefore,
    });
    return rows.length;
  } catch {
    return 0;   // never break the caller's turn over telemetry
  }
}

/**
 * ONE held/broken row from a Learn teaching lane (WO-TEACH-GAPS P4: every
 * computer is dual-use — the lane that TEACHES a found move also RECORDS that
 * the student found it). The lane computed both halves already: the board posed
 * the question (it would not speak otherwise) and the student's move answered
 * it. Writers pass `prompted` honestly; a prompted row counts as neither.
 */
/** WHICH LANE WROTE THE ROW — required, so an audit can hold each writer to
 *  its own contract: a teaching lane records only what the student FOUND
 *  (held); a threat answer and a trap meeting record both halves, because the
 *  board posed the question and the student's move answered it either way
 *  (OS-4). Learn audit 2026-10-21: the contract said "held only" for every row
 *  and failed a correct broken threat answer. */
type EvidenceLane = 'teaching' | 'threat-answer' | 'trap' | 'focus';
type LaneEvidenceArgs = {
  lane: EvidenceLane;
  tag: MisconceptionTagId;
  outcome: CapabilityOutcome;
  fen: string;
  playedSan: string;
  posedImportance: number;
  origin: CapabilityEvidenceRecord['origin'];
  prompted: boolean;
  sourceGameId?: string;
  /** See `CapabilityEvidenceRecord.steered`. */
  steered?: boolean;
  /** The move was taken back (a focus rewind): still the student's miss. */
  takenBack?: boolean;
};
/** Lane writes run one at a time, so two lanes crediting the same move in one
 *  tick cannot both pass the duplicate check before either writes. */
let laneWriteChain: Promise<unknown> = Promise.resolve();
export function recordLaneEvidence(args: LaneEvidenceArgs): Promise<boolean> {
  const run = laneWriteChain.then(() => writeLaneEvidence(args), () => writeLaneEvidence(args));
  laneWriteChain = run;
  return run;
}
async function writeLaneEvidence(raw: LaneEvidenceArgs): Promise<boolean> {
  // THE SHOT, NAMED (WO-MOTIFS-01): a lane that credits a FOUND shot (the
  // gem, the tactic, the played concept, the decisive reason) writes the
  // catch-all; the move played WAS the shot, so it names the motif's row.
  const args: LaneEvidenceArgs = raw.tag === SHOT_CATCH_ALL && raw.outcome === 'held'
    ? { ...raw, tag: namedShotTag(raw.fen, raw.playedSan) }
    : raw;
  // ONE MOVE POSES A SKILL ONCE (2026-10-17): several lanes can credit the same
  // tag on the same move (the intent, the found move, the decisive reason), and
  // each row would count toward green as if it were a separate proof.
  // Read off the store itself (survives a reload), scoped to ONE game: the same
  // position met in another game is new evidence.
  try {
    if (args.sourceGameId) {
      const board = args.fen.split(' ').slice(0, 4).join(' ');
      // By the game (v42 index): a game holds tens of rows, a tag thousands.
      const dup = await db.capabilityEvidence.where('sourceGameId').equals(args.sourceGameId)
        .filter((r) => r.tag === args.tag && r.outcome === args.outcome && r.origin === args.origin && r.playedSan === args.playedSan && r.fen.split(' ').slice(0, 4).join(' ') === board)
        .count();
      if (dup > 0) return false;
    }
    await db.capabilityEvidence.add({
      id: newId(), tag: args.tag, outcome: args.outcome, fen: args.fen, playedSan: args.playedSan,
      posedImportance: args.posedImportance, recordedAt: Date.now(), origin: args.origin, prompted: args.prompted,
      ...(args.sourceGameId ? { sourceGameId: args.sourceGameId } : {}),
      ...(args.steered ? { steered: true as const } : {}),
      ...(args.takenBack ? { takenBack: true as const } : {}),
    });
    // Green/red can move on a lane row exactly as on any other: every reader
    // of the student model refreshes now (it did not — a lane held row waited
    // out the 5-minute caches, and the proven watcher (`learnRecordWatch`) never saw it cross).
    emitWeaknessModelChanged();
    void logAppAudit({
      kind: 'lane-evidence',
      category: 'subsystem',
      source: 'capabilityEvidence.recordLaneEvidence',
      summary: `${args.outcome} [${args.tag}] from ${args.origin}${args.prompted ? ' (prompted)' : ''}`,
      details: JSON.stringify({ lane: args.lane, origin: args.origin, outcome: args.outcome, tags: [args.tag], prompted: args.prompted }),
      fen: args.fen,
    });
    return true;
  } catch {
    return false;   // never break the caller's turn over telemetry
  }
}

/** How live a question is when the coach ASKED it on a board: the board posed
 *  it by construction (the key was computed before the student was asked), so
 *  it clears the green bar the way a sharp game moment does. */
const ASKED_IMPORTANCE = 100;

/** The origins an ANSWER row may carry — the KNOW half, by the table. */
export type AnswerOrigin = { [O in EvidenceOrigin]: (typeof EVIDENCE_READING)[O] extends 'know' ? O : never }[EvidenceOrigin];

/** Help that gives the answer away (a hint, the Show, "I don't know"). A
 *  "one more" nudge names neither a square nor the count, so it does not. */
function helpPrompts(h: AnswerHelp | undefined): boolean {
  return h === 'hint' || h === 'show' || h === 'dont-know';
}

/**
 * Was this answer a clean read? One rule, so every asking surface grades
 * evidence the same way:
 *  • a wrong answer given BEFORE any real help → `broken`, unprompted — the
 *    student committed to a wrong read on their own, whatever came after;
 *  • otherwise `held` only when it was solved with no wrong answer, and the
 *    row is prompted when real help was given (a prompted row counts as
 *    neither — "I don't know" included, per the plan).
 */
export function answerEvidenceOutcome(a: {
  solved: boolean;
  answer: Pick<AnswerDetail, 'help' | 'wrongAttempts' | 'firstMissHelp'>;
}): { outcome: CapabilityOutcome; prompted: boolean } {
  if (a.answer.wrongAttempts > 0 && !helpPrompts(a.answer.firstMissHelp ?? 'none')) {
    return { outcome: 'broken', prompted: false };
  }
  return {
    outcome: a.solved && a.answer.wrongAttempts === 0 ? 'held' : 'broken',
    prompted: helpPrompts(a.answer.help),
  };
}

/**
 * ONE row for an ANSWER to a question the coach asked (lesson tap, Analysis
 * Practice, the Review reading card). The KNOW half of decision #2; read apart
 * from games by `EVIDENCE_READING`.
 *
 * NEVER carries `sourceGameId`, even when the position came from the
 * student's game: that field is the USE reading's game key AND
 * `autoAnalyzeGame`'s "this game already recorded its positive half" guard, so
 * a reading answer stamped with it would silently stop the game's real
 * evidence from ever being written. The KNOW source is the position.
 */
export async function recordAnswerEvidence(args: {
  tag: MisconceptionTagId;
  outcome: CapabilityOutcome;
  fen: string;
  origin: AnswerOrigin;
  prompted: boolean;
  answer: AnswerDetail;
  posedImportance?: number;
}): Promise<boolean> {
  try {
    const playedSan = args.answer.typed?.trim()
      || args.answer.taps.map((t) => t.square).join(' ');
    await db.capabilityEvidence.add({
      id: newId(), tag: args.tag, outcome: args.outcome, fen: args.fen, playedSan,
      posedImportance: args.posedImportance ?? ASKED_IMPORTANCE, recordedAt: Date.now(),
      origin: args.origin, prompted: args.prompted, answer: args.answer,
    });
    emitWeaknessModelChanged();
    void logAppAudit({
      kind: 'answer-evidence',
      category: 'subsystem',
      source: 'capabilityEvidence.recordAnswerEvidence',
      summary: `${args.outcome} [${args.tag}] from ${args.origin}${args.answer.surface ? `/${args.answer.surface}` : ''}${args.prompted ? ' (prompted)' : ''} — ${args.answer.taps.length} tap(s), ${args.answer.extras.length} extra, help ${args.answer.help}`,
      details: JSON.stringify({
        origin: args.origin, outcome: args.outcome, tag: args.tag, prompted: args.prompted,
        surface: args.answer.surface ?? null, help: args.answer.help, taps: args.answer.taps.length,
        extras: args.answer.extras.length, keySize: args.answer.keySize ?? null,
        wrongTags: args.answer.wrongTags, spoken: args.answer.spoken, chainDepth: args.answer.chainDepth,
      }),
      fen: args.fen,
    });
    return true;
  } catch {
    return false;   // never break the caller's turn over telemetry
  }
}

/**
 * The capability profile. ABSENT means UNKNOWN — the caller must not read a
 * missing tag as either mastery or a hole (absent ≠ silent).
 */
/** The shipped-bar summary of the record's SNAPSHOTS (`recordMirror`): one per
 *  reading, kept while the two snapshots are the same arrays. A snapshot is
 *  frozen and a write publishes a new one, so identity is the whole key — the
 *  profile memo below and the student record (`studentRecord`) share one
 *  summary per write instead of each building its own. Only for snapshot
 *  arrays: a caller holding an array it may still change calls
 *  `summariseEvidence` directly. */
const SNAPSHOT_PROFILE: Partial<Record<EvidenceReading, { all: readonly CapabilityEvidenceRecord[]; slips: readonly MisconceptionTagRecord[]; profile: CapabilityProfile }>> = {};
export function profileOfSnapshot(
  all: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
  reading: EvidenceReading = 'use',
): CapabilityProfile {
  const hit = SNAPSHOT_PROFILE[reading];
  if (hit && hit.all === all && hit.slips === slips) return hit.profile;
  const profile = summariseEvidence(all, slips, {}, reading);
  SNAPSHOT_PROFILE[reading] = { all, slips, profile };
  return profile;
}

/** The KNOW reading reads no slips; one shared empty array keeps its memo key stable. */
const NO_SLIPS: readonly MisconceptionTagRecord[] = Object.freeze([]);
/** One summary per reading, kept until the evidence table is written (walk of
 *  David's record, 2026-10-19: ten full rebuilds of 9,761 rows per Learn move).
 *  The rows come from the mirror (2026-10-21): the table is read once per
 *  session, not once per summary. */
const PROFILE_MEMO: Record<EvidenceReading, TableMemo<CapabilityProfile>> = {
  know: memoOverTable(() => [db.capabilityEvidence, db.misconceptionTags], async () => profileOfSnapshot(await evidenceMirror.rows(), NO_SLIPS, 'know')),
  use: memoOverTable(() => [db.capabilityEvidence, db.misconceptionTags], async () => profileOfSnapshot(await evidenceMirror.rows(), await slipMirror.rows(), 'use')),
};

export async function getCapabilityProfile(reading: EvidenceReading = 'use'): Promise<CapabilityProfile> {
  try {
    const profile = await PROFILE_MEMO[reading].get();
    // The heat map's emission is the USE reading's — the bar it reports is
    // the one the ranker acts on.
    if (reading === 'use') reportHeatMap(profile);
    return profile;
  } catch {
    return new Map();   // no store yet — an empty profile is the honest answer
  }
}

/** THE HEAT MAP, emitted (David 2026-09-20: "I want audit tools on all algo
 *  based builds"). GREEN is the state the app could not say at all until this
 *  week, and the bar that produces it (`PROVEN_MIN_IMPORTANCE`, the measured
 *  knee) is a tuned number — so how many tags sit on each side of it is
 *  exactly what has to be trendable. GREY is not reported as a count because
 *  it is the complement of everything ever posed, which this function cannot
 *  see; absent is absent, and inventing a denominator here would be the same
 *  disease as a narration claiming a fact the board never produced.
 *
 *  Emitted at the I/O DOOR, not inside `summariseEvidence`: that one is pure
 *  and is swept by the calibration test hundreds of times, which would turn a
 *  measurement into a write storm. */
/** An unchanged heat map is reported once per window, not once per read
 *  (walk 2026-10-03: one My Weaknesses visit read the profile 16 times and
 *  wrote 16 identical rows). A CHANGED map always emits — that is the signal. */
export const HEAT_MAP_REPEAT_WINDOW_MS = 5000;
let lastHeatMap: { details: string; at: number } | null = null;

/** Test seam: forget the last emitted map. */
export function resetHeatMapReportForTests(): void {
  lastHeatMap = null;
}

function reportHeatMap(profile: CapabilityProfile): void {
  if (profile.size === 0) return;      // nothing recorded — not a heat map yet
  let proven = 0;
  let red = 0;
  // RECOVERED — proven NOW, and broken at some point before. This is the one
  // number that answers the heat map's whole reason for existing ("you have
  // GOTTEN BETTER"), and it was not being reported: `proven` and `red` are not
  // mutually exclusive once green became recoverable (a break RESETS the
  // streak, it does not close the door), so a student who fixed a weakness
  // counted in BOTH and in neither one alone. `currentlyRed` is the exclusive
  // complement, so the three heat-map states can be read off one row instead
  // of inferred. `red` keeps its old meaning — it is labelled "with a break"
  // and the green audit's descriptive line reads it that way.
  let recovered = 0;
  let currentlyRed = 0;
  for (const [, e] of profile) {
    const isProven = capabilityProven(e);
    if (isProven) proven += 1;
    if (e.broken > 0) red += 1;
    if (isProven && e.broken > 0) recovered += 1;
    if (!isProven && e.broken > 0) currentlyRed += 1;
  }
  const details = JSON.stringify({
    tags: profile.size,
    proven,
    red,
    recovered,
    currentlyRed,
    bar: { window: HOLD_WINDOW, minPosed: HOLD_MIN_POSED, green: HOLD_GREEN, short: HOLD_SHORT },
    byTag: [...profile].map(([tag, e]) => ({ tag, held: e.held, broken: e.broken, posed: e.hold.posed, rate: e.hold.rate, state: holdState(e.hold), proven: capabilityProven(e) })),
  });
  const now = Date.now();
  if (lastHeatMap && lastHeatMap.details === details && now - lastHeatMap.at < HEAT_MAP_REPEAT_WINDOW_MS) return;
  lastHeatMap = { details, at: now };
  void logAppAudit({
    kind: 'capability-heat-map',
    category: 'subsystem',
    source: 'capabilityEvidence.getCapabilityProfile',
    summary: `${profile.size} tags with evidence — ${proven} PROVEN (${recovered} RECOVERED after a break), ${currentlyRed} currently red`,
    details,
  });
}

/** @deprecated Renamed to `recordCapabilityEvidence` — it no longer only
 *  records what was SHOWN. Kept so the rename is a one-line change at each
 *  call site rather than a flag day; delete once the last caller moves. */
export const recordCapabilitiesShown = recordCapabilityEvidence;
