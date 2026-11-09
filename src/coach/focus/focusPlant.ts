/**
 * THE COACH LEAVES CHANCES (WO-FOCUS-TACTICS-01, `docs/LEARN-FOCUS.md` §7a).
 * David 2026-10-22: "it MUST be present at least once per game! Beginners
 * maybe more than once, it is a focused teaching point. Don't be afraid to
 * present them to the user." → "It could come at any point within the game.
 * Vary it, coach can guide this."
 *
 * The coach plays a real slip of its own — one of its engine candidates, a
 * move that costs it at least `SLIP_DROP_CP` — after which a winning tactic is
 * on YOUR side of the board, at your rung.
 *
 * - THE GUARANTEE: from the game's TARGET PLY (drawn between move 6 and move
 *   12, `focusSetup`) until a chance at your rung has been on the board
 *   (natural or planted), the coach looks for one on every move — never
 *   capped, and never stopped by a decided game (David: MUST). Before the
 *   target it only steers toward tension (the `focus` scorer).
 * - HARDER, NOT STRONGER: the chance is at your rung (`ChanceDifficulty`),
 *   while the coach keeps playing at your level — a plant is one of its own
 *   natural slips, never a stronger move. From `PLANT_EASIER_FROM_PLY` (move
 *   20) with nothing presented yet, the coach looks one rung easier, so the
 *   game still gets one.
 * - EXTRA chances, by rung (`RUNG_TIERS[rung].chances`, natural ones
 *   included): a beginner gets three, one a phase — the second from move 15,
 *   the third from move 25 or the endgame, whichever comes first; an
 *   intermediate two; the top rungs one. A miss brings the SAME pattern back
 *   next. Spaced `PLANT_SPACING_PLIES` after the last plant.
 * - THE FLIP (David 2026-10-22: "I LIKE THIS! I WANT THAT TO HAPPEN FOR ME
 *   TOO"): once you are way ahead (the app's one "decided" bar), the extras
 *   flip seats — the coach goes for a desperate tactic of its own, at your
 *   rung's subtlety, and the lesson becomes stopping it ("Stay vigilant").
 * - A planted find counts half on the record, like a steered one, so it can
 *   never fake a green; a find on a chance the coach made never raises the
 *   opponent's strength (`replyMadeAChance`).
 *
 * The engine half (`coachGameEngine.tryFocusPlant`) reads the coach's
 * candidates and the student's side of each; whether a move poses the focus,
 * and how hard, is decided by the ONE chance reader the lesson asks with
 * (`chancesAt`, its exploit seat `yourChancesAt`), never a second definition.
 */
import { Chess, type Color } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import type { MotifLevel } from '../../data/tacticMotifs';
import { DECIDED_EVAL_CP } from '../../services/engineConstants';
import { isEndgameByMaterial } from '../../services/gamePhaseService';
import { completesExchange, midExchange, PLANT_VERIFY_MAX, slipCandidates, type CoachLine, type SlipCandidate, type SlipRead } from '../../missions/earnedSlip';
import { chancesAt, SHOT_PLIES, yourChancesAt, type ChanceDifficulty, type FocusChance, type ReadLine } from './focusChances';
import { pvGain } from '../../services/tacticGeometry';
import type { FocusSeat } from './focusCard';
import { RUNG_TIERS, type TacticsRung } from './focusRung';

/** Plants at least this many plies (four moves) apart. */
export const PLANT_SPACING_PLIES = 8;
/** KEEP MISSING → MORE, EASIER CHANCES (David 2026-10-23: "The coach should
 *  present more frequent and easier chances if user keeps missing"): while
 *  your chances are being missed in a row, the next comes two moves after the
 *  last plant instead of four, one rung easier per miss in the streak (down
 *  to the plainest, a free piece), and the game's extra budget and the
 *  one-a-phase floors lift until you find one. A first-try find ends it. */
export const MISS_SPACING_PLIES = 4;
/** From this board ply (move 20) with nothing presented at your rung, the
 *  coach looks one rung easier. */
export const PLANT_EASIER_FROM_PLY = 40;
/** ONE A PHASE (David 2026-10-22, the beginner's three: "opening, middle, and
 *  end game"): the board ply from which the second chance may be made (move
 *  15) and the third (move 25, or the endgame if it comes first). */
export const SECOND_CHANCE_PLY = 29;
export const THIRD_CHANCE_PLY = 49;
/** Moves the coach reads for a flip (its own top lines). */
const FLIP_VERIFY_MAX = PLANT_VERIFY_MAX;

/** RUNG 3 FALLS BACK FOR THE GAME (PLAN.md "MEASURED BEFORE SHIP", 2026-10-22,
 *  `focusPlant.arrival.measure.test.ts` on 28 of David's games): a 3–4 move
 *  shot could be planted at its rung before move 20 in 11 of the 21 games that
 *  reached it — under the 80% bar, so a rung-3 game that has had nothing at
 *  its rung five moves past the target asks at rung 2 (one key move deeper),
 *  which arrived in 20 of 21. The ask's difficulty is on its `focus-plant` row. */
export const TOP_RUNG_GRACE_PLIES = 10;

/** The rung a chance must reach to present the focus on board `ply`, in a
 *  game whose first chance was due at `targetPly`. */
export function wantedDifficulty(rung: TacticsRung, ply: number, targetPly: number): ChanceDifficulty {
  if (rung === 3 && ply >= targetPly + TOP_RUNG_GRACE_PLIES) return 2;
  return ply >= PLANT_EASIER_FROM_PLY && rung > 0 ? ((rung - 1) as ChanceDifficulty) : rung;
}

/** Whether this chance presents the focus on your side at your rung. */
export function presents(chance: FocusChance, rung: TacticsRung, ply: number, targetPly: number): boolean {
  return chance.seat === 'exploit' && chance.difficulty >= wantedDifficulty(rung, ply, targetPly);
}

/** What the runner asks the coach for on this move. */
export interface FocusPlantAsk {
  /** The pattern of your last miss: the next plant poses it again. */
  tag: MisconceptionTagId | null;
  difficulty: ChanceDifficulty;
  /** An extra chance (the guarantee is met): way ahead, it flips seats. */
  extra: boolean;
  /** Your chances missed in a row when it was asked (`MISS_SPACING_PLIES`). */
  missStreak: number;
  /** THE CARRIED PATTERN'S OWN PLANT (#158): the pattern a past game left
   *  missed and unanswered, asked once the game's guarantee is met by another
   *  — your side only (never a flip), outside the extras budget, and only that
   *  pattern. */
  carried: boolean;
}

/** The game's planting so far (`FocusRunState.plant`). */
export interface PlantState {
  /** Plants the coach made this game (either seat). */
  count: number;
  /** Flipped plants — their tactics the coach set up because you were way ahead. */
  flips: number;
  /** The board ply the last plant was posed on. */
  lastPly: number | null;
  /** The pattern of the last miss on your side: the next plant poses it. */
  need: MisconceptionTagId | null;
  /** The first chance on your side at your rung this game (natural or
   *  planted), or null while the guarantee is still owed. */
  presented: { ply: number; difficulty: ChanceDifficulty } | null;
  /** Your chances missed in a row at their first try; a first-try find ends
   *  it (a find after a clue does not — it needed the help). */
  missStreak: number;
  /** THE MISS THAT CAME BACK (#158, David 2026-11-09: "Can we have coach play
   *  misses/similar misses in future games?"): the pattern a past game left
   *  missed and unanswered, still to be put on the board this game; null once
   *  a chance of it at your rung has been on the board. */
  carry: MisconceptionTagId | null;
  /** THE PATTERNS OWED TO THE NEXT GAME, the most recent miss first: every
   *  pattern of yours missed at its first try, until you find one of it on
   *  your own — at the first try, with no question asked, and not on a board
   *  you took a move back on. The game ends with the list on its row
   *  (`FocusResult.carry`), and the next game's first plant poses its head. */
  owed: MisconceptionTagId[];
}

export const NO_PLANTS: PlantState = { count: 0, flips: 0, lastPly: null, need: null, presented: null, missStreak: 0, carry: null, owed: [] };

/** Whether the coach plants on the move before board `ply` (the ply the
 *  student's next move will be), at what rung and of what pattern. `fen` is
 *  the board the coach moves from (the endgame floor reads it). Null = play
 *  your own move. */
export function plantAsk(
  plant: PlantState,
  seat: { rung: TacticsRung; posed: number; targetPly: number },
  ply: number,
  fen: string,
): FocusPlantAsk | null {
  const missing = plant.missStreak > 0;
  if (plant.lastPly !== null && ply - plant.lastPly < (missing ? MISS_SPACING_PLIES : PLANT_SPACING_PLIES)) return null;
  const difficulty = Math.max(0, wantedDifficulty(seat.rung, ply, seat.targetPly) - plant.missStreak) as ChanceDifficulty;
  if (!plant.presented) {
    // THE GUARANTEE: from the target ply, every move until it lands — of the
    // pattern you just missed, else the one a past game left owed (#158).
    return ply >= seat.targetPly ? { tag: plant.need ?? plant.carry, difficulty, extra: false, missStreak: plant.missStreak, carried: false } : null;
  }
  // THE MISS THAT CAME BACK (#158): the guarantee was met by another pattern
  // (a natural chance, or the plant's fallback), so the carried pattern gets
  // its own plant — every move until it is on the board, budget or not: a
  // pattern you missed and never answered comes back every game.
  if (plant.carry && ply >= seat.targetPly) return { tag: plant.carry, difficulty, extra: true, missStreak: plant.missStreak, carried: true };
  // Missing in a row: a chance every two moves until a find — the extra budget
  // and the phase floors are for a student who is finding them.
  if (!missing) {
    // A chance on the board counts against the budget whether or not the move
    // after it was judged: one answered by a forced move (stopping a mate) is
    // exempt, never posed, and the budget read zero (prod rung3-g2 2026-11-09:
    // two plants at rung 3, whose budget is one). Your side's plants and the
    // presented guarantee count too.
    const made = Math.max(seat.posed, plant.count - plant.flips, 1) + plant.flips;
    if (made >= RUNG_TIERS[seat.rung].chances) return null;
    const floor = made <= 1 ? SECOND_CHANCE_PLY : (isEndgameByMaterial(fen) ? 0 : THIRD_CHANCE_PLY);
    if (ply < floor) return null;
  }
  return { tag: plant.need, difficulty, extra: true, missStreak: plant.missStreak, carried: false };
}

export type FocusPlantReject = 'mid-exchange' | 'no-slip' | 'no-read' | 'no-chance' | 'wrong-difficulty' | 'easier-too' | 'wrong-pattern' | 'no-flip';

export interface FocusPlantPick {
  /** The coach's move. */
  uci: string;
  /** Your side's chance it leaves, or — flipped — their tactic it sets up. */
  chance: FocusChance;
  seat: FocusSeat;
  /** What the move costs the coach against its best candidate. */
  dropCp: number;
}

function linesOf(a: Awaited<ReturnType<SlipRead>>): ReadLine[] | null {
  if (!a || a.topLines.length === 0) return null;
  return a.topLines.map((l) => ({ moves: [...l.moves], evaluation: l.evaluation, mate: l.mate }));
}

const studentOf = (fenAfter: string): Color => (fenAfter.split(' ')[1] === 'b' ? 'b' : 'w');

/**
 * The move for this board (coach to move), or why there is none.
 *
 * YOUR SIDE: each of the coach's natural slips — smallest drop first, at most
 * `PLANT_VERIFY_MAX` student-side reads — is kept only if the lesson's chance
 * reader, on the board it leaves, poses your side at the asked rung (and the
 * asked pattern, when there is one), with nothing EASIER beside it: a free
 * piece next to the intended shot would be taken instead, and the harder
 * chance would never be asked.
 *
 * THE FLIP: an extra while you are way ahead — the coach's own candidates, in
 * its order, kept when the board after poses THEIR tactic against you at most
 * as hard as your rung (the hardest such, then the smallest cost).
 */
export async function findFocusPlant(
  fen: string,
  coachLines: readonly CoachLine[],
  focus: { levels: readonly MotifLevel[] },
  ask: FocusPlantAsk,
  read: SlipRead,
): Promise<{ pick: FocusPlantPick | null; scan: Partial<Record<FocusPlantReject, number>> }> {
  const scan: Partial<Record<FocusPlantReject, number>> = {};
  const bump = (r: FocusPlantReject): void => { scan[r] = (scan[r] ?? 0) + 1; };
  // MID-EXCHANGE the coach answers the check or takes what is on offer first;
  // its slip, if any, is one of those moves (`completesExchange`).
  const mid = midExchange(fen);
  const viaExchange = (uci: string): boolean => !mid || completesExchange(fen, uci);
  const open = new Set(focus.levels);
  const coachBest = coachLines.length > 0 ? Math.max(...coachLines.map((l) => l.coachCp)) : null;
  if (ask.extra && !ask.carried && coachBest !== null && coachBest <= -DECIDED_EVAL_CP) {
    const kept = coachLines.filter((l) => viaExchange(l.uci));
    if (kept.length === 0) { bump('mid-exchange'); return { pick: null, scan }; }
    return flipPlant(fen, kept, coachBest, open, ask, read, scan, bump);
  }
  const slips = slipCandidates(fen, coachLines, 'allow').filter((s) => viaExchange(s.uci));
  if (slips.length === 0) { bump(mid ? 'mid-exchange' : 'no-slip'); return { pick: null, scan }; }
  const pvOf = new Map(coachLines.map((l) => [l.uci, l] as const));
  const ranked = readOrder(slips, (s) => shownRank(fen, s, pvOf.get(s.uci), open, ask));
  // THE GUARANTEE OUTRANKS THE PATTERN: a chance every game first, the
  // missed pattern when one fits (a carried pattern the board cannot pose
  // must never cost the game its chance).
  let anyPattern: FocusPlantPick | null = null;
  for (const slip of ranked.slice(0, PLANT_VERIFY_MAX)) {
    const lines = linesOf(await read(slip.fenAfter));
    if (!lines) { bump('no-read'); continue; }
    const yours = yourChancesAt({ fen: slip.fenAfter, prevFen: fen, student: studentOf(slip.fenAfter), lines }, open);
    if (yours.length === 0) { bump('no-chance'); continue; }
    const atStep = yours.filter((c) => c.difficulty === ask.difficulty);
    if (atStep.length === 0) { bump('wrong-difficulty'); continue; }
    if (yours.some((c) => c.difficulty < ask.difficulty)) { bump('easier-too'); continue; }
    const fit = ask.tag ? atStep.find((c) => c.tag === ask.tag || c.setupTag === ask.tag) : atStep[0];
    if (!fit) {
      bump('wrong-pattern');
      if (!ask.extra && !anyPattern) anyPattern = { uci: slip.uci, chance: atStep[0], seat: 'exploit', dropCp: slip.dropCp };
      continue;
    }
    return { pick: { uci: slip.uci, chance: fit, seat: 'exploit', dropCp: slip.dropCp }, scan };
  }
  return { pick: anyPattern, scan };
}

/**
 * WHICH SLIPS THE STUDENT-SIDE READS GO TO — the Campaign's `findEarnedSlip`
 * order (`shownRank`), smallest drop first within each rank. Ranking stops
 * once `PLANT_VERIFY_MAX` slips hold the top rank: the rest are never read.
 */
function readOrder(slips: readonly SlipCandidate[], rankOf: (s: SlipCandidate) => 0 | 1 | 2): SlipCandidate[] {
  const byRank: [SlipCandidate[], SlipCandidate[], SlipCandidate[]] = [[], [], []];
  for (const s of slips) {
    if (byRank[0].length >= PLANT_VERIFY_MAX) break;
    byRank[rankOf(s)].push(s);
  }
  return [...byRank[0], ...byRank[1], ...byRank[2]];
}

/**
 * WHAT THE COACH'S OWN LINE ALREADY SHOWS after a slip, read through the
 * lesson's own chance reader. The coach's wide read plays every legal move
 * out, so its line past a slip is the student's best answer as that read sees
 * it. Read as a one-line read of the board the slip leaves, it ORDERS the
 * student-side reads: 0 — it already poses your side at the asked rung (and
 * pattern), with nothing easier beside it; 1 — it poses your side at all;
 * 2 — nothing. It decides nothing: the student-side read still does.
 *
 * Why (prod rung2 game 2, 2026-11-07): two student-side reads a move, in
 * smallest-drop order, read slips that posed nothing — in a won game a
 * 200–300 cp slip is a quiet move that slows the win — while a slip further
 * down hung a piece the coach's own line showed falling. On that game's
 * twenty boards (Node Stockfish, the app's reads) this order planted on 7
 * where smallest-drop planted on 4. A line that wins the student nothing
 * within the reader's shot horizon (`pvGain`, the reader's own computer) poses
 * nothing, and is ranked without the reader — the reader is too heavy to run
 * on every slip of a wide read on the move path.
 */
export function shownRank(fen: string, slip: SlipCandidate, line: CoachLine | undefined, open: ReadonlySet<MotifLevel>, ask: FocusPlantAsk): 0 | 1 | 2 {
  if (!line || line.pv.length < 2 || line.pv[0] !== slip.uci) return 2;
  const student = studentOf(slip.fenAfter);
  const moves = line.pv.slice(1);
  const gain = pvGain(slip.fenAfter, moves, student, SHOT_PLIES);
  if (gain === null ? !capturesFirst(slip.fenAfter, moves[0]) : gain < 1) return 2;
  const coachWhite = fen.split(' ')[1] === 'w';
  const shown: ReadLine = { moves, evaluation: line.coachCp * (coachWhite ? 1 : -1), mate: null };
  const yours = yourChancesAt({ fen: slip.fenAfter, prevFen: fen, student, lines: [shown] }, open);
  if (yours.length === 0) return 2;
  const fits = (c: FocusChance): boolean => c.difficulty === ask.difficulty && (!ask.tag || c.tag === ask.tag || c.setupTag === ask.tag);
  return yours.some(fits) && !yours.some((c) => c.difficulty < ask.difficulty) ? 0 : 1;
}

/** The line's first move takes something (a one-move line has no `pvGain`). */
function capturesFirst(fen: string, uci: string | undefined): boolean {
  if (!uci) return false;
  try { return !!new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).captured; } catch { return false; }
}

async function flipPlant(
  fen: string,
  coachLines: readonly CoachLine[],
  coachBest: number,
  open: ReadonlySet<MotifLevel>,
  ask: FocusPlantAsk,
  read: SlipRead,
  scan: Partial<Record<FocusPlantReject, number>>,
  bump: (r: FocusPlantReject) => void,
): Promise<{ pick: FocusPlantPick | null; scan: Partial<Record<FocusPlantReject, number>> }> {
  const seen = new Set<string>();
  let best: FocusPlantPick | null = null;
  let checked = 0;
  for (const l of [...coachLines].sort((a, b) => b.coachCp - a.coachCp)) {
    if (seen.has(l.uci) || checked >= FLIP_VERIFY_MAX) continue;
    seen.add(l.uci);
    const after = afterMove(fen, l.uci);
    if (!after) continue;
    checked += 1;
    const lines = linesOf(await read(after));
    if (!lines) { bump('no-read'); continue; }
    const theirs = chancesAt({ fen: after, prevFen: fen, student: studentOf(after), lines }, open)
      .filter((c) => c.seat === 'defend' && c.difficulty <= ask.difficulty);
    if (theirs.length === 0) { bump('no-flip'); continue; }
    const hardest = [...theirs].sort((a, b) => b.difficulty - a.difficulty)[0];
    const dropCp = coachBest - l.coachCp;
    if (!best || hardest.difficulty > best.chance.difficulty || (hardest.difficulty === best.chance.difficulty && dropCp < best.dropCp)) {
      best = { uci: l.uci, chance: hardest, seat: 'defend', dropCp };
    }
  }
  return { pick: best, scan };
}

/** The board after a UCI move, or null when it is not legal or gives check —
 *  a check forces the answer and leads the student by the hand. */
function afterMove(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return c.inCheck() || c.isGameOver() ? null : c.fen();
  } catch { return null; }
}
