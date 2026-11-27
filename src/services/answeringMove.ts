// THE ANSWERING MOVE (Coach Build Board, "computers just built", rebuilt
// 2026-11-27): when the side to move faces a threat, every natural answer is
// tried — move the attacked piece, guard it, take the attacker, block the line
// — and the one that holds is said only when every other one fails, and no
// quiet move elsewhere holds either: "Only Nb3 saves your knight on a1: every
// other answer loses it." A threat with several answers is no lesson here; a
// threat with none is the error computer's.
//
// "Fails" is counted the one way (`immediateWin`): after the answer, the other
// side wins a pawn-and-more at once (a mate, a promotion, the best capture to
// the end of its trades).
// DUAL-USE: the same read teaches the answer and files the miss
// (`missed-opponents-threat`, `moveInsight`): the one move played holds it,
// any other move breaks it.
//
// PURE: chess.js, the legal exchange count and the one immediate-win read.
import { Chess, type Color, type Square } from 'chess.js';
import { flipSideToMove } from './threatOut';
import { immediateWin } from './immediateWin';
import { MATERIAL_VALUE } from './pieceValues';

export interface AnsweringMove {
  /** The one move that holds, SAN. */
  san: string;
  from: string;
  to: string;
  /** The side that must answer. */
  side: Color;
  /** The piece the threat is on, and the move that threatens it. */
  target: { square: string; piece: string };
  threat: { san: string; from: string };
  /** How many natural answers were tried and failed. */
  failed: number;
  /** The proof: a natural answer that fails, and the win it allows. */
  refuted: { san: string; win: string } | null;
}

/** A threat worth answering wins this much (pawns): more than a pawn. */
export const ANSWER_THREAT_MIN = 2;

/** What the other side wins after `san` on `fen`, less what `san` took. */
function netLoss(fen: string, m: { san: string; captured?: string }): { loss: number; win: string | null } {
  const b = new Chess(fen);
  b.move(m.san);
  const w = immediateWin(b.fen());
  return { loss: w.mate ? w.gain : w.gain - (m.captured ? MATERIAL_VALUE[m.captured] ?? 0 : 0), win: w.san };
}

/** THE ONE ANSWER to the threat the side to move faces on `fen`, or null. */
export function answeringMove(fen: string): AnsweringMove | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.inCheck() || c.isGameOver()) return null;
  const me = c.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  // THE THREAT: what they would win if it were their move now.
  const passFen = flipSideToMove(fen);
  if (!passFen) return null;
  const threat = immediateWin(passFen);
  if (threat.gain < ANSWER_THREAT_MIN || !threat.san || threat.mate || !threat.to || !threat.from) return null;
  const at = threat.to as Square;
  const target = c.get(at);
  if (!target || target.color !== me) return null;
  const attackers = c.attackers(at, them);
  const guards = c.attackers(at, me).length;
  // THE NATURAL ANSWERS: move the piece, take an attacker, guard it, block.
  const all = c.moves({ verbose: true });
  const natural = all.filter((m) => {
    if (m.from === at) return true;
    if (m.captured && attackers.includes(m.to)) return true;
    const b = new Chess(fen);
    b.move(m.san);
    if (b.attackers(at, me).length > guards) return true;
    return b.attackers(at, them).length < attackers.length;
  });
  if (natural.length < 2) return null;
  const holds: typeof natural = [];
  let refuted: AnsweringMove['refuted'] = null;
  for (const m of natural) {
    const w = netLoss(fen, m);
    if (w.loss < ANSWER_THREAT_MIN) holds.push(m);
    else if (!refuted && w.win) refuted = { san: m.san, win: w.win };
  }
  if (holds.length !== 1) return null;
  // No quiet move elsewhere holds either: a counter-threat or a check would be
  // another answer, and then this one is no only move.
  for (const m of all) {
    if (natural.includes(m)) continue;
    const b = new Chess(fen);
    b.move(m.san);
    if (b.inCheck()) return null;
    if (netLoss(fen, m).loss < ANSWER_THREAT_MIN) return null;
  }
  const one = holds[0];
  return { san: one.san, from: one.from, to: one.to, side: me, target: { square: at, piece: target.type }, threat: { san: threat.san, from: threat.from }, failed: natural.length - 1, refuted };
}
