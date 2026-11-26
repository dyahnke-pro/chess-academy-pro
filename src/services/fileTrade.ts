// fileTrade — ROOKS TRADED FOR AN OPEN FILE (Danya speedruns: S-ZY 24.Rd1
// "forces the rook trade: if Black declines, White owns the d-file"; 4T9
// 19…Rxc1 "these trades hand you control of the open c-file").
//
// Two shapes, both on an OPEN file (no pawn of either side on it):
//  · THE CHALLENGE — a quiet rook move onto the file facing their only rook
//    or queen there, with nothing between them; taking it is an even swap
//    (signed legal SEE 0). Take, and it is even; step off, and the file is the
//    mover's — both read off this board.
//  · THE HAND-OFF — a rook takes their rook on the file; after their cheapest
//    retake no rook or queen of theirs is on the file, and the engine's line
//    goes on with the mover's other rook or queen onto it.
// Said only on a sound move (the one praise rule, `creditableCost`: the cost
// known and under an inaccuracy): the line states what the trade does, never
// that the move was best. PURE: chess.js and the
// position reader.
import { openSentence } from '../utils/openSentence';
import { CAPTURE_VALUE } from './pieceValues';
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { signedLegalSeeFor } from './positionReadingService';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { creditableCost, type UnpricedCredit } from './engineConstants';
import { other, PIECE_WORD, tradeSeat } from './tradeWords';


export type FileTrade =
  | { kind: 'challenge'; file: string; rook: Square; facing: { piece: PieceSymbol; square: Square } }
  | { kind: 'hand-off'; file: string; on: Square; retaker: PieceSymbol; next: { piece: PieceSymbol; from: Square; to: Square } };

/** No pawn of either side stands on `file`. */
function openFile(c: Chess, file: string): boolean {
  for (let r = 1; r <= 8; r += 1) {
    const p = c.get(`${file}${r}` as Square);
    if (p && p.type === 'p') return false;
  }
  return true;
}

/** The rooks and queens of `color` on `file`. */
function majorsOn(c: Chess, file: string, color: 'w' | 'b'): Square[] {
  const out: Square[] = [];
  for (let r = 1; r <= 8; r += 1) {
    const sq = `${file}${r}` as Square;
    const p = c.get(sq);
    if (p && p.color === color && (p.type === 'r' || p.type === 'q')) out.push(sq);
  }
  return out;
}

/** The file trade `san` makes on `fenBefore`; `costCp`: the engine's cost of
 *  the move for its mover (null: unknown, nothing said; an inaccuracy or worse:
 *  nothing said); `line`: the engine's
 *  best line after the move (uci, the retake first), or null. */
export function fileTradeAt(fenBefore: string, san: string, costCp: number | null, line: readonly string[] | null,
  /** REQUIRED: what an unpriced move is to the praise rule (the surface's). */
  unpriced: UnpricedCredit): FileTrade | null {
  // The line credits the move: the one praise rule (`creditableCost`). The
  // old gate was a MISTAKE, so Rf1 at 80 cp was "the file is yours".
  if (!creditableCost(costCp, unpriced)) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  let mv;
  try { mv = c.move(san); } catch { return null; }
  if (mv.piece !== 'r') return null;
  const file = mv.to[0];
  if (mv.from[0] === file && !mv.captured) return null;
  if (!openFile(c, file)) return null;
  const me = mv.color;
  const them = other(me);
  if (!mv.captured) {
    // THE CHALLENGE: their one major on the file, face to face with the rook.
    const theirs = majorsOn(c, file, them);
    if (theirs.length !== 1) return null;
    // Their only rook: with a second one, stepping off hands over nothing —
    // the other rook comes to the file.
    if (c.board().flat().filter((x) => x && x.color === them && x.type === 'r').length !== 1) return null;
    const at = theirs[0];
    if (!c.attackers(at, me).includes(mv.to)) return null;
    if (!c.attackers(mv.to, them).includes(at)) return null;
    if (signedLegalSeeFor(c.fen(), mv.to, them) !== 0) return null;
    const p = c.get(at);
    if (!p || p.type !== 'r') return null;
    return { kind: 'challenge', file, rook: mv.to, facing: { piece: p.type, square: at } };
  }
  if (mv.captured !== 'r') return null;
  // THE HAND-OFF: their cheapest retake, then no major of theirs on the file.
  const retakes = c.moves({ verbose: true }).filter((m) => m.to === mv.to && m.captured);
  if (retakes.length === 0) return null;
  const retake = [...retakes].sort((a, b) => CAPTURE_VALUE[a.piece] - CAPTURE_VALUE[b.piece])[0];
  // A rook or queen that takes back holds the file itself.
  if (retake.piece === 'r' || retake.piece === 'q') return null;
  c.move(retake);
  if (majorsOn(c, file, them).length > 0) return null;
  // The mover's next major onto the file — the engine's own line goes on
  // that way (the trade for the file, not a capture made for another reason:
  // aEKS 16…Rxf1+ drags the king, then …Qxh2), landing safe.
  if (!line || line[0] !== `${retake.from}${retake.to}${retake.promotion ?? ''}`) return null;
  const u = line[1];
  if (!u) return null;
  let m;
  try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
  if ((m.piece !== 'r' && m.piece !== 'q') || m.to[0] !== file || m.from[0] === file || m.captured) return null;
  if (c.isAttacked(m.to, them) && signedLegalSeeFor(c.fen(), m.to, them) > 0) return null;
  return { kind: 'hand-off', file, on: mv.to, retaker: retake.piece, next: { piece: m.piece, from: m.from, to: m.to } };
}

/** Said from the mover's seat, one idea a sentence, rotated on the board. */
export function fileTradeLine(t: FileTrade, moverIsStudent: boolean, fen: string): string {
  const s = tradeSeat(moverIsStudent);
  const Own = openSentence(s.own);
  const key = stemKeyOf(`${fen}|file|${t.file}`);
  if (t.kind === 'challenge') {
    const f = `${s.opp} rook on ${t.facing.square}`;
    // The side that answers the challenge is the other one.
    const they = s.sub === 'you' ? 'they' : 'you';
    const mine = s.sub === 'you' ? 'yours' : 'theirs';
    return rotateStem([
      `${Own} rook on ${t.rook} challenges ${f} for the open ${t.file}-file. If ${they} trade, it's an even swap. If ${they} step off, the file is ${mine}.`,
      `The rook on ${t.rook} meets ${f} head on. A trade is even, and stepping off hands the open ${t.file}-file to ${s.sub === 'you' ? 'you' : 'them'}.`,
    ], key);
  }
  const back = t.retaker === 'k' ? 'the king takes back' : `the ${PIECE_WORD[t.retaker]} takes back`;
  const next = `${s.own} ${PIECE_WORD[t.next.piece]} on ${t.next.from}`;
  return rotateStem([
    `Trading rooks on ${t.on} hands over the ${t.file}-file. Once ${back}, ${next} comes to ${t.next.to} and the file is ${s.sub === 'you' ? 'yours' : 'theirs'}.`,
    `The rook trade on ${t.on} is about the open ${t.file}-file. After ${back}, no rook or queen of ${s.opp === 'their' ? 'theirs' : 'yours'} is left on it, and ${next} takes it over on ${t.next.to}.`,
  ], key);
}
