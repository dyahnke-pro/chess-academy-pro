// enablingMove — "FIRST THIS, THEN THAT" (teaching census: "e6 comes first
// because it opens the bishop's road to d6"). Was MISSING: thinkAloud.notYet
// says "not yet", nothing proved that A ENABLES B.
//
// Read off the engine's own line for the student: [A, their reply, B, …]. When
// B is a piece move that is NOT legal on the board now and IS legal after A
// and the reply, because A moved off the square B travels through, A is the
// enabling move and the vacated square is the proof (exact: chess.js legality
// on both boards).
//
// DUAL-USE: Learn names the order on a move-advice turn; a review can name
// the B the student never got to play because they skipped A.
// PURE: chess.js.
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import type { Proof } from './proof';

export interface EnablingMove {
  first: { san: string; from: Square; to: Square };
  then: { san: string; from: Square; to: Square; piece: PieceSymbol };
  /** The square A vacated that B's path runs through. */
  opened: Square;
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function between(from: Square, to: Square): Square[] {
  const f0 = from.charCodeAt(0) - 97, r0 = Number(from[1]) - 1;
  const f1 = to.charCodeAt(0) - 97, r1 = Number(to[1]) - 1;
  const df = Math.sign(f1 - f0), dr = Math.sign(r1 - r0);
  if (!(f0 === f1 || r0 === r1 || Math.abs(f1 - f0) === Math.abs(r1 - r0))) return [];
  const out: Square[] = [];
  for (let f = f0 + df, r = r0 + dr; f !== f1 || r !== r1; f += df, r += dr) out.push(`${String.fromCharCode(97 + f)}${r + 1}` as Square);
  return out;
}

/** From the student's board `fen` and the engine's line from it (UCI). */
export function findEnablingMove(fen: string, pvUci: readonly string[]): EnablingMove | null {
  if (pvUci.length < 3) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const start = new Chess(fen);
  const mv = (u: string): ReturnType<Chess['move']> | null => {
    try { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
  };
  const a = mv(pvUci[0]);
  if (!a || a.captured) return null;
  if (!mv(pvUci[1])) return null;
  const b = mv(pvUci[2]);
  if (!b || (b.piece !== 'b' && b.piece !== 'r' && b.piece !== 'q')) return null;
  // B could not be played on the starting board…
  const legalNow = start.moves({ verbose: true }).some((m) => m.from === b.from && m.to === b.to);
  if (legalNow) return null;
  // …because A stood on its road.
  if (!between(b.from, b.to).includes(a.from)) return null;
  return { first: { san: a.san, from: a.from, to: a.to }, then: { san: b.san, from: b.from, to: b.to, piece: b.piece }, opened: a.from };
}

export function enablingMoveProof(e: EnablingMove): Proof {
  return {
    kind: 'squares', exact: true,
    short: `${e.first.san} clears ${e.opened}`,
    full: `right now your ${NAME[e.then.piece]} on ${e.then.from} cannot reach ${e.then.to} — your own piece on ${e.opened} is in the way, and ${e.first.san} clears it`,
    squares: [e.opened, e.then.from, e.then.to],
  };
}

export function enablingMoveLine(e: EnablingMove): string {
  const f = enablingMoveProof(e).full;
  return `${e.first.san} first, then ${e.then.san}: ${f}.`;
}
