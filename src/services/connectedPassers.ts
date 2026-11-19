// connectedPassers — TWO CONNECTED PASSED PAWNS A LONE PIECE CANNOT STOP
// (Danya: "the connected passers will seal the deal"; "Black's connected
// passers are still unstoppable").
//
// THE BOARD: one side has two passed pawns on next-door files (ranks at most
// one apart); the other side has one piece besides its king and pawns — a
// rook, a bishop or a knight. The trigger is the rule players learn: both on
// the sixth rank (their side's) or beyond, or both past the fifth with the
// defending king more than two squares from each.
//
// THE PROOF, never the rule alone: a small exact search with chess.js. The
// side with the pawns plays only pawn and king moves (any legal move when in
// check); the defender plays every legal move. The read holds only when,
// against every defence, a pawn promotes to a queen the defender cannot take
// at once (or the promotion mates), within four moves, without stalemate. A
// search over its node budget (each move tried counts) says nothing.
//
// PURE: chess.js.
import { Chess, type Color, type Square } from 'chess.js';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { countWord } from '../utils/andList';
import { isPassedPawn } from './keySquareRead';

export interface ConnectedPassersRead {
  /** The side with the pawns. */
  side: Color;
  pawns: [Square, Square];
  /** The defender's one piece. */
  piece: 'r' | 'b' | 'n';
  pieceSquare: Square;
  /** Moves of the pawns' side the proof needed at most. */
  moves: number;
  key: string;
}

interface Man { type: string; color: Color; square: Square }
const fileOf = (s: string): number => s.charCodeAt(0) - 97;
const rankOf = (s: string): number => Number(s[1]);
const cheb = (a: string, b: string): number => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
const homeRank = (s: string, c: Color): number => (c === 'w' ? rankOf(s) : 9 - rankOf(s));
const MAX_MOVES = 4;
const NODE_BUDGET = 2000;

class Budget { n = 0; over = false; spend(): boolean { this.n += 1; if (this.n > NODE_BUDGET) this.over = true; return !this.over; } }

/** The promoted queen stands: not taken at once, no stalemate. */
function promotionHolds(c: Chess, to: Square): boolean {
  if (c.moves().length === 0) return c.inCheck();
  return c.attackers(to, c.turn()).length === 0;
}

/** The side with the pawns to move: some pawn move (any move in check) wins
 *  within `left` of its moves. */
function attackerWins(c: Chess, side: Color, left: number, b: Budget, memo: Map<string, boolean>): boolean {
  if (left <= 0 || !b.spend()) return false;
  const id = `a${left}:${c.fen()}`;
  const hit = memo.get(id); if (hit !== undefined) return hit;
  const inCheck = c.inCheck();
  const moves = c.moves({ verbose: true })
    .filter((m) => inCheck || m.piece === 'p' || m.piece === 'k')
    .filter((m) => !m.promotion || m.promotion === 'q')
    .sort((x, y) => (y.promotion ? 1 : 0) - (x.promotion ? 1 : 0) || (x.piece === 'p' ? 0 : 1) - (y.piece === 'p' ? 0 : 1) || homeRank(y.to, side) - homeRank(x.to, side));
  let win = false;
  for (const m of moves) {
    if (!b.spend()) break;
    c.move(m);
    // A quiet move with no move left after it wins only by mate.
    const ok = m.promotion ? promotionHolds(c, m.to) : left - 1 <= 0 ? c.isCheckmate() : (!c.isThreefoldRepetition() && defenderLoses(c, side, left - 1, b, memo));
    c.undo();
    if (ok) { win = true; break; }
    if (b.over) break;
  }
  if (!b.over) memo.set(id, win);
  return win;
}

/** The defender to move: every legal move loses. */
function defenderLoses(c: Chess, side: Color, left: number, b: Budget, memo: Map<string, boolean>): boolean {
  if (!b.spend()) return false;
  const id = `d${left}:${c.fen()}`;
  const hit = memo.get(id); if (hit !== undefined) return hit;
  const moves = c.moves({ verbose: true });
  if (moves.length === 0) return c.inCheck();
  let lose = true;
  for (const m of moves) {
    c.move(m);
    const ok = attackerWins(c, side, left, b, memo);
    c.undo();
    if (!ok) { lose = false; break; }
  }
  if (!b.over) memo.set(id, lose);
  return lose && !b.over;
}

/** THE CONNECTED PASSERS on a board, proven unstoppable, or null. */
export function connectedPassersOn(fen: string): ConnectedPassersRead | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const all: Man[] = c.board().flat().filter((x): x is NonNullable<typeof x> => !!x).map((x) => ({ type: x.type, color: x.color, square: x.square }));
  for (const side of ['w', 'b'] as Color[]) {
    const them: Color = side === 'w' ? 'b' : 'w';
    const theirPieces = all.filter((m) => m.color === them && m.type !== 'k' && m.type !== 'p');
    if (theirPieces.length !== 1 || !['r', 'b', 'n'].includes(theirPieces[0].type)) continue;
    const theirKing = all.find((m) => m.color === them && m.type === 'k');
    if (!theirKing) continue;
    const passers = all.filter((m) => m.color === side && m.type === 'p' && isPassedPawn(all, m))
      .sort((x, y) => homeRank(y.square, side) - homeRank(x.square, side));
    for (let i = 0; i < passers.length; i += 1) {
      for (let j = i + 1; j < passers.length; j += 1) {
        const a = passers[i].square; const bb = passers[j].square;
        if (Math.abs(fileOf(a) - fileOf(bb)) !== 1 || Math.abs(rankOf(a) - rankOf(bb)) > 1) continue;
        const ha = homeRank(a, side); const hb = homeRank(bb, side);
        const far = cheb(theirKing.square, a) > 2 && cheb(theirKing.square, bb) > 2;
        if (!((ha >= 6 && hb >= 6) || (ha >= 5 && hb >= 5 && far))) continue;
        // The proof: the fewest moves that win against every defence, one
        // node budget for the whole deepening (the memo is keyed by depth).
        const budget = new Budget();
        const memo = new Map<string, boolean>();
        for (let left = 1; left <= MAX_MOVES; left += 1) {
          const board = new Chess(fen);
          const won = board.turn() === side ? attackerWins(board, side, left, budget, memo) : defenderLoses(board, side, left, budget, memo);
          if (budget.over) break;
          if (won) {
            const pawns = [a, bb].sort() as [Square, Square];
            return { side, pawns, piece: theirPieces[0].type as 'r' | 'b' | 'n', pieceSquare: theirPieces[0].square, moves: left,
              key: `connected-passers:${pawns.join('')}:${fen.split(' ').slice(0, 2).join(' ')}` };
          }
        }
      }
    }
  }
  return null;
}

const PIECE_WORD: Record<'r' | 'b' | 'n', string> = { r: 'rook', b: 'bishop', n: 'knight' };

/** THE CONNECTED PASSERS IN WORDS, from the student's seat. */
export function connectedPassersLine(r: ConnectedPassersRead, student: Color): string {
  const mine = r.side === student;
  const k = stemKeyOf(r.key);
  const piece = `${mine ? 'their' : 'your'} ${PIECE_WORD[r.piece]}`;
  const pawns = `${mine ? 'Your' : 'Their'} connected pawns on ${r.pawns[0]} and ${r.pawns[1]}`;
  const head = rotateStem([
    `${pawns} can't both be stopped by ${piece}.`,
    `${pawns} are too much for ${piece}: it can stop one, not both.`,
  ], k);
  const tail = `One of them queens within ${countWord(r.moves)} move${r.moves === 1 ? '' : 's'}, ${mine ? 'whatever they do' : 'whatever you do'}.`;
  return `${head} ${tail}`;
}

/** The squares a read lights: the two pawns and the piece that cannot stop them. */
export function connectedPassersSquares(r: ConnectedPassersRead): Square[] {
  return [...r.pawns, r.pieceSquare];
}
