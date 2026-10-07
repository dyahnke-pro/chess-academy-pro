// tiedDefender — THE WEAKNESS'S WORTH IS THE DEFENDERS IT TIES DOWN (teaching
// census: "even if it holds, its defenders can't leave"). Was MISSING as a
// computed fact — only prose in boardConcepts/moveInsight.
//
// A defender is TIED when the point it guards holds with it and falls without
// it: with the defender on the board the student cannot win the target, with
// that defender lifted off the student can (the legal SEE, both times). The
// event is the student's move that CREATED the tie — new pressure, said once.
//
// DUAL-USE: Learn says what the student's pressure just bought; a review can
// name the moment a tied defender walked away (the target then fell).
// Exact proof: the counts, read off the board.
// PURE: chess.js + the legal SEE.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import type { Proof } from './proof';

export interface TiedDefender {
  defender: { square: Square; piece: PieceSymbol };
  target: { square: Square; piece: PieceSymbol };
  attackers: number;
  defenders: number;
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const TIMES = ['no times', 'once', 'twice', 'three times', 'four times'];

function lifted(fen: string, sq: Square): string | null {
  try { const c = new Chess(fen); c.remove(sq); return c.fen(); } catch { return null; }
}

/** Every tie the student holds on `fen` (any side to move). */
export function findTiedDefenders(fen: string, student: Color): TiedDefender[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  const them: Color = student === 'w' ? 'b' : 'w';
  const out: TiedDefender[] = [];
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.color !== them || cell.type === 'k') continue;
    const attackers = c.attackers(cell.square, student);
    if (attackers.length === 0) continue;
    if (legalSeeGainFor(fen, cell.square, student) > 0) continue;   // already loose — not a tie, a hanging piece
    const guards = c.attackers(cell.square, them);
    for (const g of guards) {
      const gp = c.get(g);
      if (!gp || gp.type === 'k') continue;
      const without = lifted(fen, g);
      if (!without) continue;
      if (legalSeeGainFor(without, cell.square, student) > 0) {
        out.push({ defender: { square: g, piece: gp.type }, target: { square: cell.square, piece: cell.type }, attackers: attackers.length, defenders: guards.length });
      }
    }
  }
  return out.sort((a, b) => VAL[b.defender.piece] - VAL[a.defender.piece] || VAL[b.target.piece] - VAL[a.target.piece]);
}

/** The tie the student's move just CREATED (absent before it), or null. */
export function newTiedDefender(fenBefore: string, fenAfter: string, student: Color): TiedDefender | null {
  const before = new Set(findTiedDefenders(fenBefore, student).map((t) => `${t.defender.square}>${t.target.square}`));
  return findTiedDefenders(fenAfter, student).find((t) => !before.has(`${t.defender.square}>${t.target.square}`)) ?? null;
}

export function tiedDefenderProof(t: TiedDefender): Proof {
  return {
    kind: 'count', exact: true,
    short: `you hit it ${TIMES[t.attackers] ?? `${t.attackers} times`} and it is guarded ${TIMES[t.defenders] ?? `${t.defenders} times`}`,
    full: `you hit the ${NAME[t.target.piece]} on ${t.target.square} ${TIMES[t.attackers] ?? `${t.attackers} times`} and it is guarded ${TIMES[t.defenders] ?? `${t.defenders} times`} — take the ${NAME[t.defender.piece]} away and it falls`,
    squares: [t.defender.square, t.target.square],
  };
}

export function tiedDefenderLine(t: TiedDefender): string {
  const f = tiedDefenderProof(t).full;
  return `Their ${NAME[t.defender.piece]} on ${t.defender.square} is tied down now: ${f}. That is what pressure buys — a piece that cannot leave.`;
}
