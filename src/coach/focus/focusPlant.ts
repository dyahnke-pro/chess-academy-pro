/**
 * THE COACH LEAVES CHANCES (David 2026-10-22, "2, go"; `docs/LEARN-FOCUS.md`
 * §7a). A focus game posed only what the board happened to pose, and a tactics
 * or kings game posed 3–4 chances, so those records filled slowly. Now the
 * coach plays a real slip of its own — one of its engine candidates, a move
 * that costs it at least `SLIP_DROP_CP` — after which the student's side of the
 * focus is on the board: a piece to win, a shot, a mate.
 *
 * 🔒 THE FOCUS IS PRESENTED EVERY GAME, HARDER BY THE RECORD (David
 * 2026-10-22: "the focus teaching MUST be presented … at some point during the
 * game. It just gets harder and harder to find depending on their stats. Game
 * play must also remain adaptive to the level of the user."):
 * - THE GUARANTEE: until a chance on your side at your step has been on the
 *   board (natural or planted), the coach looks for one on every move from
 *   `PLANT_FIRST_PLY`. No cap stops it; a green focus gets it too.
 * - HARDER, NOT STRONGER: the step comes from your side's hold state (red /
 *   grey 0, short 1, green 2, `ChanceDifficulty`): the chance is subtler,
 *   while the coach keeps playing at your level — a plant is one of its own
 *   natural slips, never a stronger move.
 * - THE EASIER STEP: with none at your step by `PLANT_EASIER_FROM_PLY` (move
 *   20), the coach looks one step easier, so the game still gets one.
 * - EXTRA chances (after the guarantee): up to `PLANT_CAP` on your side a game,
 *   natural ones included — red or untested 3; short and green none beyond
 *   the one. A find WITHOUT a prompt ends the extras (a find on Try again does
 *   not — the clue told you); a miss brings back the SAME pattern next.
 * - Spaced `PLANT_SPACING_PLIES` after the last plant, never once the game is
 *   decided or mid-exchange: a gift in a decided game changes the result, so
 *   a game decided early can end without one — logged on the game's result
 *   row (`presented: null`), never assumed.
 * - A planted find counts half on the record, like a steered one, so it can
 *   never fake a green.
 *
 * The engine half (`coachGameEngine.tryFocusPlant`) reads the coach's
 * candidates and the student's side of each slip; whether a slip poses the
 * focus, and how hard, is decided by the ONE chance reader the lesson asks
 * with (`chancesAt`), never a second definition.
 */
import type { Color } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import type { MotifLevel } from '../../data/tacticMotifs';
import type { HeatState } from '../../services/holdRate';
import { DECIDED_EVAL_CP } from '../../services/engineConstants';
import { midExchange, PLANT_VERIFY_MAX, slipCandidates, type CoachLine, type SlipRead } from '../../missions/earnedSlip';
import { chancesAt, type ChanceDifficulty, type FocusChance, type ReadLine } from './focusChances';
import type { FocusId } from './focusCard';

/** How hard your side's chance is, by that seat's hold state (the record,
 *  never the rating). */
export const PLANT_STEP: Record<HeatState, ChanceDifficulty> = { red: 0, grey: 0, short: 1, green: 2 };
/** Chances on your side a game (natural ones included) past which the coach
 *  plants no EXTRA one. The first at your step is never capped. */
export const PLANT_CAP: Record<HeatState, number> = { red: 3, grey: 3, short: 1, green: 1 };
/** No plant before this board ply (1-based, the runner's count — move 6): the
 *  opening is the book's, and a slip there is a gift, not a lesson. */
export const PLANT_FIRST_PLY = 12;
/** Plants at least this many plies (four moves) apart. */
export const PLANT_SPACING_PLIES = 8;
/** From this board ply (move 20) with nothing presented at your step, the
 *  coach looks one step easier. */
export const PLANT_EASIER_FROM_PLY = 40;

/** The step a chance must reach to count as presented on board `ply`. */
export function wantedDifficulty(state: HeatState, ply: number): ChanceDifficulty {
  const step = PLANT_STEP[state];
  return ply >= PLANT_EASIER_FROM_PLY && step > 0 ? ((step - 1) as ChanceDifficulty) : step;
}

/** Whether this chance presents the focus on your side at your step. */
export function presents(chance: FocusChance, state: HeatState, ply: number): boolean {
  return chance.seat === 'exploit' && (chance.difficulty ?? 0) >= wantedDifficulty(state, ply);
}

/** What the runner asks the coach for on this move: a plant at this
 *  difficulty, of the last missed pattern, or any of the focus's. */
export interface FocusPlantAsk {
  tag: MisconceptionTagId | null;
  difficulty: ChanceDifficulty;
}

/** The game's planting so far (`FocusRunState.plant`). */
export interface PlantState {
  /** Plants the coach made this game. */
  count: number;
  /** The board ply the last plant was posed on. */
  lastPly: number | null;
  /** The pattern of the last miss on your side: the next plant poses it. */
  need: MisconceptionTagId | null;
  /** A find without a prompt: no more EXTRA plants this game. */
  done: boolean;
  /** The first chance on your side at your step this game (natural or
   *  planted), or null while the guarantee is still owed. */
  presented: { ply: number; difficulty: ChanceDifficulty } | null;
}

export const NO_PLANTS: PlantState = { count: 0, lastPly: null, need: null, done: false, presented: null };

/** Whether the coach plants on the move before board `ply` (the ply the
 *  student's next move will be), at what difficulty and of what pattern.
 *  Null = play your own move. */
export function plantAsk(
  plant: PlantState,
  seat: { state: HeatState; posed: number },
  ply: number,
): FocusPlantAsk | null {
  if (ply < PLANT_FIRST_PLY) return null;
  if (plant.lastPly !== null && ply - plant.lastPly < PLANT_SPACING_PLIES) return null;
  const ask = { tag: plant.need, difficulty: wantedDifficulty(seat.state, ply) };
  if (!plant.presented) return ask;                 // the guarantee: never capped
  if (plant.done) return null;
  const cap = PLANT_CAP[seat.state];
  if (seat.posed >= cap || plant.count >= cap) return null;
  return ask;
}

export type FocusPlantReject = 'decided' | 'mid-exchange' | 'no-slip' | 'no-read' | 'no-chance' | 'wrong-difficulty' | 'wrong-pattern';

export interface FocusPlantPick {
  /** The coach's slip. */
  uci: string;
  /** The chance it leaves on your side, read by the lesson's own reader. */
  chance: FocusChance;
  /** What the slip costs the coach against its best candidate. */
  dropCp: number;
}

/**
 * The slip for this board (coach to move), or why there is none. Each of the
 * coach's natural slips — smallest drop first, at most `PLANT_VERIFY_MAX`
 * student-side reads — is kept only if the lesson's chance reader, on the
 * board the slip leaves with that read, poses the focus's EXPLOIT seat at the
 * asked difficulty (and the asked pattern, when there is one). Loose pieces is the one focus whose
 * chance IS a piece left to take; every other focus needs a slip after which
 * nothing hangs (the shot is earned, never picked up).
 */
export async function findFocusPlant(
  fen: string,
  coachLines: readonly CoachLine[],
  focus: { id: FocusId; levels: readonly MotifLevel[] },
  ask: FocusPlantAsk,
  read: SlipRead,
): Promise<{ pick: FocusPlantPick | null; scan: Partial<Record<FocusPlantReject, number>> }> {
  const scan: Partial<Record<FocusPlantReject, number>> = {};
  const bump = (r: FocusPlantReject): void => { scan[r] = (scan[r] ?? 0) + 1; };
  if (coachLines.length > 0 && Math.abs(Math.max(...coachLines.map((l) => l.coachCp))) >= DECIDED_EVAL_CP) { bump('decided'); return { pick: null, scan }; }
  if (midExchange(fen)) { bump('mid-exchange'); return { pick: null, scan }; }
  const slips = slipCandidates(fen, coachLines, focus.id === 'loose-pieces' ? 'allow' : 'forbid');
  if (slips.length === 0) { bump('no-slip'); return { pick: null, scan }; }
  const open = new Set(focus.levels);
  for (const slip of slips.slice(0, PLANT_VERIFY_MAX)) {
    const a = await read(slip.fenAfter);
    if (!a || a.topLines.length === 0) { bump('no-read'); continue; }
    const lines: ReadLine[] = a.topLines.map((l) => ({ moves: [...l.moves], evaluation: l.evaluation, mate: l.mate }));
    const student: Color = slip.fenAfter.split(' ')[1] === 'b' ? 'b' : 'w';
    const yours = chancesAt({ fen: slip.fenAfter, prevFen: fen, student, lines }, focus.id, open).filter((c) => c.seat === 'exploit');
    if (yours.length === 0) { bump('no-chance'); continue; }
    const atStep = yours.filter((c) => (c.difficulty ?? 0) === ask.difficulty);
    if (atStep.length === 0) { bump('wrong-difficulty'); continue; }
    const fit = ask.tag ? atStep.find((c) => c.tag === ask.tag || c.setupTag === ask.tag) : atStep[0];
    if (!fit) { bump('wrong-pattern'); continue; }
    return { pick: { uci: slip.uci, chance: fit, dropCp: slip.dropCp }, scan };
  }
  return { pick: null, scan };
}
