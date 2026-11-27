// YOUR OWN THREAT (Coach Build Board, "computers just built", rebuilt
// 2026-11-27): what a move NOW threatens, with the move that carries it out —
// "Your knight on f5 now threatens Nxd6, winning the pawn on d6." Hand the
// move back to its mover after it is played: what they would win at once
// (`immediateWin` — a mate, a promotion, the best capture to the end of its
// trades) that the board before the move did not already give them.
//
// Said only of a FORCING threat (a mate, or material won), the renderer's
// rule for "threatens". A move that gives check is its own narration.
//
// DUAL-USE: the same read files the follow-through (`standingThreat`): a
// threat of yours still on the board, the move that carries it out to play —
// held when it is played, missed when a costly move leaves it (`moveInsight`).
//
// PURE: chess.js, the legal exchange count and the one immediate-win read.
import { Chess, type Color } from 'chess.js';
import { sideToMoveAs } from './threatOut';
import { immediateWin, type ImmediateWin } from './immediateWin';

export interface OwnThreat {
  /** The move just played, SAN, and its side. */
  san: string;
  side: Color;
  /** The move that carries the threat out, SAN, and its squares. */
  carry: { san: string; from: string; to: string };
  /** What it wins (null for a mate). */
  won: { square: string; piece: string } | null;
  gain: number;
  mate: boolean;
}

/** A threat worth naming wins at least this much (pawns: more than a pawn —
 *  a pawn attacked is on almost every move), or mates. */
export const OWN_THREAT_MIN = 2;

/** What the side to move on `fen` can win at once — the threat standing for
 *  them on the board (a mate, a promotion, a capture that wins). */
export function standingThreat(fen: string): ImmediateWin | null {
  const w = immediateWin(fen);
  return w.san && (w.mate || w.gain >= OWN_THREAT_MIN) ? w : null;
}

/** WHAT `san`, PLAYED ON `fenBefore`, NOW THREATENS, or null. */
export function ownThreat(fenBefore: string, san: string): OwnThreat | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const me = c.turn();
  let played;
  try { played = c.move(san); } catch { return null; }
  if (!played || c.inCheck() || c.isGameOver()) return null;
  // A capture they take back is the exchange going on, not a threat: what the
  // piece would hit next is answered by the recapture (10.Nxd5 "threatening"
  // the queen on e7 while …exd5 is there).
  if (played.captured && c.attackers(played.to, c.turn()).length > 0) return null;
  const again = sideToMoveAs(c.fen(), me);
  if (!again) return null;
  const now = standingThreat(again);
  if (!now || !now.san || !now.from || !now.to) return null;
  // NEW: the board before the move did not already give this much.
  const was = immediateWin(fenBefore);
  if (!now.mate && now.gain <= was.gain) return null;
  if (now.mate && was.mate) return null;
  // Theirs to take first: a threat they win back more than at once is no threat
  // of yours, it is a piece left loose (the error computer's).
  const theirs = immediateWin(c.fen());
  if (!now.mate && theirs.gain >= now.gain) return null;
  return { san: played.san, side: me, carry: { san: now.san, from: now.from, to: now.to }, won: now.won, gain: now.gain, mate: now.mate };
}
