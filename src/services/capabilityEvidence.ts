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
import { stalemateWatch } from './stalemateWatch';
import { matesInOne } from './opponentMoveReads';
import { asIfToMove } from './positionReadingService';
import { isMisconceptionTagId, type MisconceptionTagId } from '../data/misconceptionTags';

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
  /** Present on an ANSWER row (a KNOW origin): how the student answered. */
  answer?: AnswerDetail;
}

/**
 * How many qualifying clean answers in a row earn GREEN.
 *
 * TWO, not three, and the number is MEASURED rather than chosen: across 15
 * real amateur games (198 held rows, real engine grades) the count dimension
 * is INERT — a 2-in-a-row bar and a 3-in-a-row bar produce identical proven
 * sets and identical flip counts at every difficulty floor. So the count does
 * nothing except create false negatives, and it is set to the smallest value
 * that still means "more than once". The work is done by
 * `PROVEN_MIN_IMPORTANCE` below.
 */
export const HELD_FOR_PROVEN = 2;

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
  /** Distinct SOURCES inside that streak. USE: `sourceGameId`s — rows with no
   *  game id count toward the streak but not toward this, honest rather than
   *  invented. KNOW: distinct POSITIONS (`positionSourceKey`), because a lesson
   *  is not a game; the claim green makes is "did it again on a different
   *  board", which two positions evidence the way two games do. */
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
export function summariseEvidence(
  all: CapabilityEvidenceRecord[],
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
  for (const r of rows) {
    // A row whose origin is not in the table (a future build's row read by an
    // older one) is read as USE — the reading every row was before the split.
    if (((EVIDENCE_READING as Partial<Record<string, EvidenceReading>>)[r.origin] ?? 'use') !== reading) continue;
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
      if (h[i].outcome !== 'held') break;            // a FAILURE resets the streak
      // …but an easy hold is not a failure and not evidence: skip it and keep
      // walking, so a quiet game neither proves nor un-proves anything.
      if ((h[i].posedImportance ?? 0) < minImportance) continue;
      streak += 1;
      const source = reading === 'know' ? positionSourceKey(h[i].fen) : h[i].sourceGameId;
      if (source) games.add(source);
    }
    e.heldStreak = streak;
    e.streakGames = games.size;
  }
  return profile;
}
export type CapabilityProfile = Map<MisconceptionTagId, CapabilityProfileEntry>;

/** The KNOW reading's source key: the position, without the move counters, so
 *  the same board reached twice is one source. Null on an empty FEN. */
export function positionSourceKey(fen: string): string | null {
  const key = fen.trim().split(/\s+/).slice(0, 4).join(' ');
  return key.length > 0 ? key : null;
}

/** KNOW and USE for one capability, both through `capabilityProven`. */
export interface CapabilityStanding {
  know: boolean;
  use: boolean;
}

/** Pure: the standing of every tag that has any evidence, from raw rows. */
export function standingFromEvidence(all: CapabilityEvidenceRecord[]): Map<MisconceptionTagId, CapabilityStanding> {
  const know = summariseEvidence(all, {}, 'know');
  const use = summariseEvidence(all, {}, 'use');
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
    return standingFromEvidence(rows).get(tag) ?? { know: false, use: false };
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
  return out;
}

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
export async function recordCapabilityEvidence(args: {
  fenBefore: string;
  playedSan: string;
  moverColor: 'white' | 'black';
  cpLoss: number | null;
  origin: CapabilityEvidenceRecord['origin'];
  /** See `CapabilityEvidenceRecord.prompted` — required, never inferred. */
  prompted: boolean;
  sourceGameId?: string;
  /** What the INSIGHT computer says this position posed (moveInsight —
   *  their threat, the escape square, a named pattern, the drawback the
   *  played move walked into). Both directions: held when the move was clean,
   *  broken when it was not — one vocabulary for teaching and diagnosis. */
  alsoPosed?: ReadonlyArray<{ tag: MisconceptionTagId; posedImportance: number }>;
}): Promise<number> {
  try {
    // ASKED, regardless of how it went — the outcome is decided once, below,
    // so the two directions can never disagree about what the board posed.
    const posed = capabilitiesPosed(args.fenBefore, args.playedSan, args.moverColor);
    for (const extra of args.alsoPosed ?? []) {
      if (!posed.some((p) => p.tag === extra.tag)) posed.push({ tag: extra.tag, posedImportance: extra.posedImportance });
    }
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
    // Green/red moved: every reader of the student model refreshes now.
    emitWeaknessModelChanged();
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
 * ONE held/broken row from a Learn teaching lane (WO-TEACH-GAPS P4: every
 * computer is dual-use — the lane that TEACHES a found move also RECORDS that
 * the student found it). The lane computed both halves already: the board posed
 * the question (it would not speak otherwise) and the student's move answered
 * it. Writers pass `prompted` honestly; a prompted row counts as neither.
 */
export async function recordLaneEvidence(args: {
  tag: MisconceptionTagId;
  outcome: CapabilityOutcome;
  fen: string;
  playedSan: string;
  posedImportance: number;
  origin: CapabilityEvidenceRecord['origin'];
  prompted: boolean;
  sourceGameId?: string;
}): Promise<boolean> {
  try {
    await db.capabilityEvidence.add({
      id: newId(), tag: args.tag, outcome: args.outcome, fen: args.fen, playedSan: args.playedSan,
      posedImportance: args.posedImportance, recordedAt: Date.now(), origin: args.origin, prompted: args.prompted,
      ...(args.sourceGameId ? { sourceGameId: args.sourceGameId } : {}),
    });
    // Green/red can move on a lane row exactly as on any other: every reader
    // of the student model refreshes now (it did not — a lane held row waited
    // out the 5-minute caches, and `useProvenWatcher` never saw it cross).
    emitWeaknessModelChanged();
    void logAppAudit({
      kind: 'lane-evidence',
      category: 'subsystem',
      source: 'capabilityEvidence.recordLaneEvidence',
      summary: `${args.outcome} [${args.tag}] from ${args.origin}${args.prompted ? ' (prompted)' : ''}`,
      details: JSON.stringify({ origin: args.origin, outcome: args.outcome, tags: [args.tag], prompted: args.prompted }),
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
export const ASKED_IMPORTANCE = 100;

/** The origins an ANSWER row may carry — the KNOW half, by the table. */
export type AnswerOrigin = { [O in EvidenceOrigin]: (typeof EVIDENCE_READING)[O] extends 'know' ? O : never }[EvidenceOrigin];

/** Help that gives the answer away (a hint, the Show, "I don't know"). A
 *  "one more" nudge names neither a square nor the count, so it does not. */
export function helpPrompts(h: AnswerHelp | undefined): boolean {
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
export async function getCapabilityProfile(reading: EvidenceReading = 'use'): Promise<CapabilityProfile> {
  try {
    const profile = summariseEvidence(await db.capabilityEvidence.toArray(), {}, reading);
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
    bar: { minStreak: HELD_FOR_PROVEN, minGames: PROVEN_MIN_GAMES, minImportance: PROVEN_MIN_IMPORTANCE },
    byTag: [...profile].map(([tag, e]) => ({ tag, held: e.held, broken: e.broken, heldStreak: e.heldStreak, streakGames: e.streakGames, proven: capabilityProven(e) })),
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
