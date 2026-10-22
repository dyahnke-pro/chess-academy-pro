// THE SHOT, NAMED (WO-MOTIFS-01 M2). "You missed a shot" was ONE tag for every
// motif and every lesson — the free piece, the fork, the mate — so the three
// lessons' "your side" read one number. A shot is now named by the ONE tactic
// classifier (`detectTacticType`, the same reader Review and the drills use)
// and filed under that motif's own row (`tacticMotifs`). Called where a move is
// SCORED, never in each producer: the posed tag and the slip tag of one move
// are named by this one function from the same move, so a miss still breaks
// the skill it was about. A line that opens with a set-up names two rows.

import { Chess } from 'chess.js';
import { detectTacticLine } from './missedTacticService';
import { yoursTagForTactic } from '../data/tacticMotifs';
import type { MisconceptionTagId } from '../data/misconceptionTags';

/** The catch-all every unnamed shot is filed under. */
export const SHOT_CATCH_ALL = 'missed-tactic' as const;

/**
 * The motif rows a shot belongs to, from the move that WAS the shot (the best
 * move — the question the board posed) and, when the caller has it, the line
 * starting with that move (the line tactics need it). The line's name first;
 * then the set-up it opens with, when it has one (COUNT BOTH, David
 * 2026-10-22: a deflection that sets up a fork is a missed fork AND a missed
 * deflection). A move the classifier cannot name, or no move at all, is the
 * catch-all alone.
 */
export function namedShotTags(fen: string, shotSan: string | null | undefined, lineUci?: readonly string[]): [MisconceptionTagId] | [MisconceptionTagId, MisconceptionTagId] {
  if (!shotSan) return [SHOT_CATCH_ALL];
  try {
    const mv = new Chess(fen).move(shotSan);   // throws on an illegal move: the catch below
    const uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
    const line = lineUci && lineUci[0] === uci ? lineUci : undefined;
    const t = detectTacticLine(fen, uci, line);
    const name = yoursTagForTactic(t.tacticType);
    const setup = t.setup ? yoursTagForTactic(t.setup) : null;
    return setup && setup !== SHOT_CATCH_ALL && setup !== name ? [name, setup] : [name];
  } catch {
    return [SHOT_CATCH_ALL];
  }
}

/** The shot's NAME — the first of `namedShotTags`. */
export function namedShotTag(fen: string, shotSan: string | null | undefined, lineUci?: readonly string[]): MisconceptionTagId {
  return namedShotTags(fen, shotSan, lineUci)[0];
}
