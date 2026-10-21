/**
 * THE PATTERN LIBRARY (WO-CAMPAIGN-MASTER, Lane D) — one board check per
 * `PatternId`, the shared vocabulary of the Campaign: a card plants or steers
 * toward a pattern (the `steer` scorer), a boss steers toward the student's
 * weak ones, and the card ship rule reads how often each actually arrives
 * (`stats.ts`, measured live; `src/data/patterns/<id>.json`, mined offline by
 * `scripts/patterns/mine.mjs`).
 *
 * A `Record` over the union: a new `PatternId` fails to compile until it has
 * a check here. Each module's header states exactly what counts and what does
 * not; every check is pure (chess.js and the app's own pure computers).
 */
import type { Color } from 'chess.js';
import type { PatternDefinition, PatternId } from '../missionCard';
import { load, type PatternProbe } from './board';
import { BACK_RANK_MATE } from './back-rank-mate';
import { CONNECT_ROOKS } from './connect-rooks';
import { FREE_PIECE } from './free-piece';
import { KNIGHT_FORK } from './knight-fork';
import { KP_KING_IN_FRONT } from './kp-king-in-front';
import { KR_BOX_MATE } from './kr-box-mate';
import { PIN } from './pin';
import { SCHOLARS_MATE_DEFENCE } from './scholars-mate-defence';
import { SMOTHERED_MATE } from './smothered-mate';

/** Each check with the near-miss read the miner uses to find fail twins. */
export const PATTERN_PROBES: Record<PatternId, PatternProbe> = {
  'free-piece': FREE_PIECE,
  'knight-fork': KNIGHT_FORK,
  'back-rank-mate': BACK_RANK_MATE,
  'smothered-mate': SMOTHERED_MATE,
  'scholars-mate-defence': SCHOLARS_MATE_DEFENCE,
  pin: PIN,
  'kr-box-mate': KR_BOX_MATE,
  'kp-king-in-front': KP_KING_IN_FRONT,
  'connect-rooks': CONNECT_ROOKS,
};

export const PATTERNS: Record<PatternId, PatternDefinition> = PATTERN_PROBES;

/** Every pattern id, for the miner (`scripts/patterns`). */
export const PATTERN_IDS = Object.keys(PATTERN_PROBES) as PatternId[];


/** Is the pattern on the board `uci` makes from `beforeFen`, for `side`? The
 *  move-aware read where the pattern has one (a free piece is never the piece
 *  that just captured and is taken back), else `present` on the board after.
 *  False when the move is not legal there. What a scorer holding a candidate
 *  move asks. */
export function patternAfterMove(id: PatternId, beforeFen: string, uci: string, side: Color): boolean {
  const board = load(beforeFen);
  if (!board) return false;
  let move;
  try { move = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return false; }
  const probe = PATTERN_PROBES[id];
  const fen = board.fen();
  return probe.presentAfter
    ? probe.presentAfter(fen, { to: move.to, ...(move.captured ? { captured: move.captured } : {}) }, side)
    : probe.present(fen, side);
}

export type { LastMove, PatternProbe } from './board';
