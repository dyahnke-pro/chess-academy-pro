// tactify — IN A QUIET, LEVEL POSITION, THE MOVE THAT ASKS THEM QUESTIONS (Danya have-check, 2026-11-19).
//
// Danya: "Tactical method: 'tactify' the position so the opponent must
// calculate" (h4!, the engine's third line, as good as the others); "the
// desperado idea: add a tactical element so the opponent must keep
// calculating". Between moves the engine rates alike, the practical choice is
// the one that poses a concrete problem. The move readers say what the best
// move does; nothing compared equal moves by the questions they ask.
//
// Read off the engine's top lines, chess.js only: a position within a pawn
// and a half of level, no capture or check in the best move; among the moves
// within 40 centipawns of the best, the one that poses the most problems — a
// loose piece or pawn of theirs it newly hits, a piece worth more than the
// hitter, or (queens on) a pawn thrust past the middle at their king on a
// wing — when it poses more than the best move. Out of the opening (move 12
// on). Said to the mover.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { type EngineLine, PIECE_NAME, isQuiet, lineScore, playLine, sortedLines } from './engineLineRead';
import { MATERIAL_VALUE } from './pieceValues';
import { andList } from '../utils/andList';

export interface Tactify { side: Color; move: string; problems: string[]; text: string; squares: Square[] }

function problemsOf(fen: string, m: Move, their: string): string[] {
  const out: string[] = [];
  const before = new Chess(fen);
  const after = new Chess(fen); after.move(m);
  const side = m.color; const them = side === 'w' ? 'b' : 'w';
  for (const p of after.board().flat()) {
    if (!p || p.color !== them || p.type === 'k') continue;
    if (!after.attackers(p.square, side).includes(m.to) || before.attackers(p.square, side).includes(m.from)) continue;
    const loose = after.attackers(p.square, them).length === 0;
    const bigger = (MATERIAL_VALUE[p.type] ?? 0) > (MATERIAL_VALUE[m.piece] ?? 0);
    if (loose || (bigger && p.type !== 'p')) out.push(`hits ${their} ${loose ? 'loose ' : ''}${PIECE_NAME[p.type]} on ${p.square}`);
  }
  if (m.piece === 'p') {
    const king = after.findPiece({ type: 'k', color: them })[0];
    const rank = Number(m.to[1]);
    const past = side === 'w' ? rank >= 4 : rank <= 5;
    const queensOn = after.findPiece({ type: 'q', color: them }).length > 0;
    // A king on a wing: a king still in the centre is the opening's lesson.
    const onWing = !!king && !'de'.includes(king[0]);
    if (king && onWing && past && queensOn && Math.abs(m.to.charCodeAt(0) - king.charCodeAt(0)) <= 2) out.push(`brings a pawn at ${their} king on ${king}`);
  }
  return out;
}

export function tactify(fen: string, lines: readonly EngineLine[], student: Color): Tactify | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.inCheck() || Number(fen.split(' ')[5] ?? '0') < 12) return null;
  const side = c.turn();
  const ls = sortedLines(lines, side);
  if (ls.length < 2 || ls[0].mate != null) return null;
  const top = lineScore(ls[0], side);
  if (Math.abs(top) > 150) return null;
  const firstOf = (l: EngineLine): Move | undefined => playLine(fen, l.moves, 1).moves[0];
  const bestMove = firstOf(ls[0]);
  if (!bestMove || !isQuiet(bestMove)) return null;
  const their = side === student ? 'their' : 'your';
  const bestCount = problemsOf(fen, bestMove, their).length;
  let pick: { m: Move; p: string[] } | null = null;
  for (const l of ls.slice(1)) {
    if (top - lineScore(l, side) > 40) continue;
    const m = firstOf(l);
    if (!m || !isQuiet(m) || m.piece === 'k') continue;
    const p = problemsOf(fen, m, their);
    if (p.length > bestCount && (!pick || p.length > pick.p.length)) pick = { m, p };
  }
  if (!pick) return null;
  const mine = side === student;
  const text = mine
    ? `Several moves are as good as each other here, so pick the one that asks them questions: ${pick.m.san} ${andList(pick.p)}, and now they have to calculate.`
    : `They have several equal moves, and ${pick.m.san} is the one that asks you questions: it ${andList(pick.p)}. Expect it, and work out your answer.`;
  return { side, move: pick.m.san, problems: pick.p, text, squares: [pick.m.from, pick.m.to] };
}
