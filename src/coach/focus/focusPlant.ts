/**
 * THE COACH LEAVES CHANCES (David 2026-10-22, the plan agreed 2026-10-22 and
 * "go" the same day; `docs/LEARN-FOCUS.md` §7a). A focus game poses only what
 * the board happens to pose, and a tactics or kings game posed 3–4 chances, so
 * those records filled slowly. Now the coach may play ONE real slip — one of
 * its own engine candidates, a move that costs it at least `SLIP_DROP_CP` —
 * after which the student's side of the focus is on the board: a piece to
 * win, a shot, a mate. The student has to find it.
 *
 * The rules (all here, pure):
 * - THREE IS THE MOST CHANCES YOU FACE on your side of the focus (the seat the
 *   plants fill), natural ones included; the coach plants only to fill the
 *   gap. Your record lowers it: red or untested up to 3, short 1, green none.
 * - Spaced: a plant at least `PLANT_SPACING_PLIES` after the last, never
 *   before `PLANT_FIRST_PLY`, never once the game is decided.
 * - A find WITHOUT a prompt ends the planting for the game; a find on Try
 *   again does not (the clue told you).
 * - A miss brings back the SAME pattern later (a fork after a missed fork).
 * - A planted find counts half on the record, like a steered one, so it can
 *   never fake a green.
 *
 * A chance you miss costs the coach nothing (it just saves the piece); a
 * chance you take costs it a piece, and taking one ends the planting — so the
 * coach can never give away a pile of material.
 *
 * The engine half (`coachGameEngine.tryFocusPlant`) reads the coach's
 * candidates and the student's side of each slip; whether a slip poses the
 * focus is decided by the ONE chance reader the lesson asks with
 * (`chancesAt`), never a second definition.
 */
import type { Color } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import type { MotifLevel } from '../../data/tacticMotifs';
import type { HeatState } from '../../services/holdRate';
import { DECIDED_EVAL_CP } from '../../services/engineConstants';
import { midExchange, PLANT_VERIFY_MAX, slipCandidates, type CoachLine, type SlipRead } from '../../missions/earnedSlip';
import { chancesAt, type FocusChance, type ReadLine } from './focusChances';
import type { FocusId } from './focusCard';

/** The most chances on your side of the focus a game poses before the coach
 *  stops planting, by that seat's state. */
export const PLANT_CAP: Record<HeatState, number> = { red: 3, grey: 3, short: 1, green: 0 };
/** No plant before this board ply (1-based, the runner's count — move 6): the opening is the
 *  book's, and a slip there is a gift, not a lesson. */
export const PLANT_FIRST_PLY = 12;
/** Plants at least this many plies (four moves) apart. */
export const PLANT_SPACING_PLIES = 8;

/** What the runner asks the coach for on this move: a plant, and the pattern
 *  it must pose (the last missed one), or any of the focus's. */
export interface FocusPlantAsk {
  tag: MisconceptionTagId | null;
}

/** The game's planting so far (`FocusRunState.plant`). */
export interface PlantState {
  /** Plants the coach made this game. */
  count: number;
  /** The board ply the last plant was posed on. */
  lastPly: number | null;
  /** The pattern of the last miss on your side: the next plant poses it. */
  need: MisconceptionTagId | null;
  /** A find without a prompt: no more plants this game. */
  done: boolean;
}

export const NO_PLANTS: PlantState = { count: 0, lastPly: null, need: null, done: false };

/** Whether the coach may plant on the move before board `ply` (the ply the
 *  student's next move will be), and what pattern. Null = play your own move. */
export function plantAsk(
  plant: PlantState,
  seat: { state: HeatState; posed: number },
  ply: number,
): FocusPlantAsk | null {
  if (plant.done) return null;
  const cap = PLANT_CAP[seat.state];
  if (seat.posed >= cap || plant.count >= cap) return null;
  if (ply < PLANT_FIRST_PLY) return null;
  if (plant.lastPly !== null && ply - plant.lastPly < PLANT_SPACING_PLIES) return null;
  return { tag: plant.need };
}

export type FocusPlantReject = 'decided' | 'mid-exchange' | 'no-slip' | 'no-read' | 'no-chance' | 'wrong-pattern';

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
 * board the slip leaves with that read, poses the focus's EXPLOIT seat (and
 * the asked pattern, when there is one). Loose pieces is the one focus whose
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
    const fit = ask.tag ? yours.find((c) => c.tag === ask.tag || c.setupTag === ask.tag) : yours[0];
    if (!fit) { bump('wrong-pattern'); continue; }
    return { pick: { uci: slip.uci, chance: fit, dropCp: slip.dropCp }, scan };
  }
  return { pick: null, scan };
}
