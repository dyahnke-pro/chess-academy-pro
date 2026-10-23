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
 * (`chancesAt`), never a second definition.
 */
import { Chess, type Color } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import type { MotifLevel } from '../../data/tacticMotifs';
import { DECIDED_EVAL_CP } from '../../services/engineConstants';
import { isEndgameByMaterial } from '../../services/gamePhaseService';
import { midExchange, PLANT_VERIFY_MAX, slipCandidates, type CoachLine, type SlipRead } from '../../missions/earnedSlip';
import { chancesAt, type ChanceDifficulty, type FocusChance, type ReadLine } from './focusChances';
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
}

export const NO_PLANTS: PlantState = { count: 0, flips: 0, lastPly: null, need: null, presented: null, missStreak: 0 };

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
    // THE GUARANTEE: from the target ply, every move until it lands.
    return ply >= seat.targetPly ? { tag: plant.need, difficulty, extra: false, missStreak: plant.missStreak } : null;
  }
  // Missing in a row: a chance every two moves until a find — the extra budget
  // and the phase floors are for a student who is finding them.
  if (!missing) {
    const made = seat.posed + plant.flips;
    if (made >= RUNG_TIERS[seat.rung].chances) return null;
    const floor = made <= 1 ? SECOND_CHANCE_PLY : (isEndgameByMaterial(fen) ? 0 : THIRD_CHANCE_PLY);
    if (ply < floor) return null;
  }
  return { tag: plant.need, difficulty, extra: true, missStreak: plant.missStreak };
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
  if (midExchange(fen)) { bump('mid-exchange'); return { pick: null, scan }; }
  const open = new Set(focus.levels);
  const coachBest = coachLines.length > 0 ? Math.max(...coachLines.map((l) => l.coachCp)) : null;
  if (ask.extra && coachBest !== null && coachBest <= -DECIDED_EVAL_CP) {
    return flipPlant(fen, coachLines, coachBest, open, ask, read, scan, bump);
  }
  const slips = slipCandidates(fen, coachLines, 'allow');
  if (slips.length === 0) { bump('no-slip'); return { pick: null, scan }; }
  for (const slip of slips.slice(0, PLANT_VERIFY_MAX)) {
    const lines = linesOf(await read(slip.fenAfter));
    if (!lines) { bump('no-read'); continue; }
    const yours = chancesAt({ fen: slip.fenAfter, prevFen: fen, student: studentOf(slip.fenAfter), lines }, open).filter((c) => c.seat === 'exploit');
    if (yours.length === 0) { bump('no-chance'); continue; }
    const atStep = yours.filter((c) => c.difficulty === ask.difficulty);
    if (atStep.length === 0) { bump('wrong-difficulty'); continue; }
    if (yours.some((c) => c.difficulty < ask.difficulty)) { bump('easier-too'); continue; }
    const fit = ask.tag ? atStep.find((c) => c.tag === ask.tag || c.setupTag === ask.tag) : atStep[0];
    if (!fit) { bump('wrong-pattern'); continue; }
    return { pick: { uci: slip.uci, chance: fit, seat: 'exploit', dropCp: slip.dropCp }, scan };
  }
  return { pick: null, scan };
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
