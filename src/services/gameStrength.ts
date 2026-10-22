/**
 * gameStrength — ONE STRENGTH PER GAME, ON EVERY SURFACE (David 2026-10-22:
 * "Same rating throughout the game. Algo up or down per game only … Check to
 * make sure this is an app wide fix. Even the play in opening tab").
 *
 * The opponent used to read the live estimate on every move, so it got
 * stronger in the middle of a game the moment the student played well — the
 * game David lost after finding a slip. Now the number is set when a game
 * starts and held to its end; the estimate still learns from every graded
 * move, and what it learned shows in the NEXT game.
 *
 * ONE estimate for the student, kept here, not per page: Learn, the Campaign,
 * Play, the Openings Play tab, a mistake puzzle played on and an endgame
 * play-out all read the same number, and a move graded on one surface counts
 * on all of them. Each game id gets its number the first time it asks and
 * keeps it (`frozen`), so a student who leaves a game and comes back meets the
 * same opponent.
 *
 * The estimate (`liveStrength`) reads each move against how real players at
 * every rating play; it survives the app closing (`studentMemory`,
 * 'live-strength'), and a new game never starts surer than `CARRY_RD_MIN`.
 */
import { carryLiveStrength, startLiveStrength, updateLiveStrength, type LiveStrength } from './liveStrength';
import { recallData, remember } from './studentMemory';
import { gemMoveSignal, warmGemIndexes } from './gemCrushLines';

/** Games remembered at once (a game left and resumed keeps its number). */
const GAMES_KEPT = 24;

/** The student's estimate, across every game and surface. */
let estimate: LiveStrength | null = null;
/** Each game's number, set when the game first asked. */
const frozen = new Map<string, number>();
let loading: Promise<void> | null = null;

/** The estimate the app last saved, read once. A row without a spread was
 *  written by the old +60/−35 stepper, whose number drifted up (David read
 *  1679 from a 1414 seed): not carried. */
function load(): Promise<void> {
  if (!loading) {
    loading = recallData('live-strength', 'student').then((d) => {
      if (!estimate && d && d.evidence > 0 && typeof d.rd === 'number') {
        estimate = carryLiveStrength({ rating: d.rating, rd: d.rd, evidence: d.evidence });
      }
    }).catch(() => { /* no memory → the seed */ });
  }
  return loading;
}

/** Set a game's number, once. A new game widens the estimate back to
 *  `CARRY_RD_MIN` (players improve) before it is read. An estimate no move
 *  has taught yet is only an old seed — the game's own seed wins (a first
 *  game asked before the profile loaded must not pin every game after it). */
function numberFor(gameId: string, seed: number): number {
  const held = frozen.get(gameId);
  if (held !== undefined) return held;
  estimate = estimate && estimate.evidence > 0 ? carryLiveStrength(estimate) : startLiveStrength(seed);
  frozen.set(gameId, estimate.rating);
  while (frozen.size > GAMES_KEPT) frozen.delete(frozen.keys().next().value as string);
  // Gem hits feed the estimate; build their index now, in chunks, so it is
  // warm well before the first gem position of the game.
  warmGemIndexes();
  return estimate.rating;
}

/** The student's strength for this game: set the first time the game asks,
 *  the same on every move after. `seed` is the rating used when nothing has
 *  been measured yet. */
export async function gameStrength(gameId: string, seed: number): Promise<number> {
  await load();
  return numberFor(gameId, seed);
}

export interface GradedGameMove {
  fenBefore: string;
  playedSan: string;
  /** The graded cost (cp); null = ungraded. */
  cpLoss: number | null;
  /** The mover's eval before the move (cp, mover's view); null = unknown. */
  evalBeforeMover: number | null;
  /** Something about this board was said before the move. */
  prompted: boolean;
  /** The coach made this chance (a find earns nothing). */
  coachMade: boolean;
}

/** One graded move of the student's: the estimate learns from it now; the
 *  opponent feels it from the next game. */
export async function recordStrengthMove(gameId: string, seed: number, move: GradedGameMove): Promise<void> {
  await load();
  numberFor(gameId, seed);
  let gem = false;
  try { gem = gemMoveSignal(move.fenBefore, move.playedSan) !== null; } catch { gem = false; }
  const before = estimate as LiveStrength;
  const after = updateLiveStrength(before, {
    fenBefore: move.fenBefore,
    cpLoss: move.cpLoss,
    evalBeforeMover: move.evalBeforeMover,
    prompted: move.prompted,
    coachMade: move.coachMade,
    gem,
  });
  estimate = after;
  if (after.evidence > before.evidence) {
    void remember('live-strength', 'student', { rating: after.rating, rd: after.rd, evidence: after.evidence });
  }
}

/** Tests only: forget every game and the estimate. */
export function resetGameStrengthForTests(): void {
  estimate = null;
  frozen.clear();
  loading = null;
}
