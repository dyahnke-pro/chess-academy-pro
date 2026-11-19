// pieceTempo — A PIECE MOVE THAT COMES WITH TEMPO (Danya have-check, 2026-11-19).
//
// Danya (positional-combinations#0): "the knight on d7 can move away with gain
// of tempo (...Nb6 or ...Ne5, attacking the light-squared bishop)". The tempo
// reads were the pawn's (`kickMap`: a pawn that kicks a piece); a knight,
// bishop or rook that lands safe and hits a piece the other side must answer
// gains the move just the same.
//
// The read, chess.js only (G0): a quiet move by a knight, bishop or rook of the
// side to move (no capture, no check) that lands on a square nothing of theirs
// wins (`standsSafe`), and from there newly hits a piece of theirs (not a pawn,
// not the king) that the side would win if it were left (`legalSeeGainFor`,
// to the end of the trades) and that cannot simply take the piece back. Said
// only for a piece that has to move anyway — one with no work where it stands
// (`pieceWork` under four) or one their pawn already hits — so the tempo is a
// free move, not a sideways one. With the engine's lines, a move that the
// engine reads more than a pawn worse than its best is never offered.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { legalSeeGainFor, standsSafe } from './positionReadingService';
import { pieceWork } from './pieceWork';
import { type EngineLine, PIECE_NAME, lineScore, other, sortedLines } from './engineLineRead';
import { orList } from '../utils/andList';

export interface PieceTempo { side: Color; from: Square; moves: string[]; target: Square; text: string; squares: Square[] }

/** Worse than the engine's best by more than this, the tempo move is not offered. */
const TOO_COSTLY_CP = 100;
const IDLE_WORK = 4;

function newHits(fen: string, m: Move, side: Color): Square[] {
  const before = new Chess(fen);
  const after = new Chess(fen); after.move(m.san);
  const out: Square[] = [];
  for (const p of after.board().flat()) {
    if (!p || p.color === side || p.type === 'p' || p.type === 'k') continue;
    if (!after.attackers(p.square, side).includes(m.to)) continue;
    if (before.attackers(p.square, side).length) continue;
    // It cannot simply take the piece that hits it.
    if (after.attackers(m.to, other(side)).includes(p.square)) continue;
    if (legalSeeGainFor(after.fen(), p.square, side) < 1) continue;
    out.push(p.square);
  }
  return out;
}

export function pieceTempo(fen: string, lines: readonly EngineLine[] | null, student: Color): PieceTempo | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.inCheck()) return null;
  const side = c.turn();
  const ls = lines ? sortedLines(lines, side) : [];
  const best = ls.length ? lineScore(ls[0], side) : null;
  // By the moving piece: every tempo move it has, at one target.
  const byPiece = new Map<Square, { moves: string[]; target: Square }>();
  for (const m of c.moves({ verbose: true })) {
    if (!['n', 'b', 'r'].includes(m.piece) || m.captured || m.san.includes('+') || m.san.includes('#')) continue;
    const here = c.get(m.from);
    if (!here) continue;
    const hitByPawn = c.attackers(m.from, other(side)).some((a) => c.get(a)?.type === 'p');
    if (!hitByPawn && pieceWork(c, m.from, m.piece as 'n' | 'b' | 'r', side) >= IDLE_WORK) continue;
    const after = new Chess(fen); after.move(m.san);
    if (!standsSafe(after.fen(), m.to, other(side))) continue;
    // The engine: a move it lists far below its best is not offered.
    const listed = ls.find((l) => l.moves[0] === `${m.from}${m.to}${m.promotion ?? ''}`);
    if (listed && best !== null && best - lineScore(listed, side) > TOO_COSTLY_CP) continue;
    const hits = newHits(fen, m, side);
    if (!hits.length) continue;
    const had = byPiece.get(m.from);
    if (had && had.target === hits[0]) had.moves.push(m.san);
    else if (!had) byPiece.set(m.from, { moves: [m.san], target: hits[0] });
  }
  const pick = [...byPiece.entries()].sort((a, b) => b[1].moves.length - a[1].moves.length)[0];
  if (!pick) return null;
  const [from, { moves, target }] = pick;
  const piece = PIECE_NAME[c.get(from)?.type ?? 'p'];
  const hit = PIECE_NAME[c.get(target)?.type ?? 'p'];
  const mine = side === student;
  const hits = moves.length > 1 ? 'hit' : 'hits';
  const text = mine
    ? `Your ${piece} on ${from} can move with tempo: ${orList(moves)} ${moves.length > 1 ? 'each hits' : hits} their ${hit} on ${target}, so they have to answer it and the move comes back to you.`
    : `Their ${piece} on ${from} can move with tempo: ${orList(moves)} ${moves.length > 1 ? 'each hits' : hits} your ${hit} on ${target}, and you would have to answer it.`;
  return { side, from, moves, target, text, squares: [from, target] };
}
