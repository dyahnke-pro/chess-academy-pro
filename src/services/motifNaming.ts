// THE SHOT, NAMED (WO-MOTIFS-01 M2). "You missed a shot" was ONE tag for every
// motif and every lesson — the free piece, the fork, the mate — so the three
// lessons' "your side" read one number. A shot is now named by the ONE tactic
// classifier (`detectTacticType`, the same reader Review and the drills use)
// and filed under that motif's own row (`tacticMotifs`). Called where a move is
// SCORED, never in each producer: the posed tag and the slip tag of one move
// are named by this one function from the same move, so a miss still breaks
// the skill it was about.

import { Chess } from 'chess.js';
import { detectTacticType } from './missedTacticService';
import { yoursTagForTactic } from '../data/tacticMotifs';
import type { MisconceptionTagId } from '../data/misconceptionTags';

/** The catch-all every unnamed shot is filed under. */
export const SHOT_CATCH_ALL = 'missed-tactic' as const;

/**
 * The motif row a shot belongs to, from the move that WAS the shot (the best
 * move — the question the board posed) and, when the caller has it, the
 * engine's line starting with that move (the line tactics need it). A move
 * the classifier cannot name, or no move at all, stays the catch-all.
 */
export function namedShotTag(fen: string, shotSan: string | null | undefined, lineUci?: readonly string[]): MisconceptionTagId {
  if (!shotSan) return SHOT_CATCH_ALL;
  try {
    const mv = new Chess(fen).move(shotSan);
    if (!mv) return SHOT_CATCH_ALL;
    const uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
    const line = lineUci && lineUci[0] === uci ? lineUci : undefined;
    return yoursTagForTactic(detectTacticType(fen, uci, line));
  } catch {
    return SHOT_CATCH_ALL;
  }
}
