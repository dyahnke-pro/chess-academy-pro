// ORDER FROM WHAT THEY HAVE NOT PLAYED (batch 1, "order and timing") — his
// "no knight on f3 yet, so nothing hits e5; develop the f6 knight first". The
// order of the student's moves is read off the opponent's MISSING moves: a
// pawn or piece that would need a guard once their undeveloped minor comes out
// does not need one yet, so the developing move comes first.
//
// Pure and exact: chess.js plus the one pin-aware exchange count
// (`legalSeeGainFor`). The engine's best move is handed in, and the read only
// ever AGREES with it — it explains why the engine's developing move is right
// now, never argues for a different one.
import { Chess, type Square } from 'chess.js';
import { homeSquaresOf, isMinor } from './development';
import { legalSeeGainFor } from './positionReadingService';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface NotYetPlayed {
  text: string;
  /** Their minor's home square, the square it would develop to, the target. */
  squares: string[];
  /** Their developing move that would hit the target, SAN. */
  theirMove: string;
  /** The student's square that does not need a guard yet. */
  target: string;
}

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
/** Inside the opening only — development order is an opening lesson. */
export const NOT_YET_MAX_FULLMOVE = 12;

/** A developing move: a minor leaving its home square, or castling. */
function isDeveloping(m: { piece: string; from: string; color: 'w' | 'b'; san: string }): boolean {
  if (m.san.startsWith('O-O')) return true;
  return isMinor(m.piece) && homeSquaresOf(m.piece, m.color).includes(m.from as Square);
}

/**
 * The board AFTER the student's developing move `devSan` (their turn): find a
 * student pawn or piece that nothing of theirs attacks yet, but that one of
 * their minors still at home would win by developing onto a square that hits
 * it. That target is the guard the student did not need to spend a move on.
 */
function waitingTarget(fenAfter: string, student: 'w' | 'b', devTo: string): Omit<NotYetPlayed, 'text'> | null {
  let board: Chess;
  try { board = new Chess(fenAfter); } catch { return null; }
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  if (board.turn() !== them) return null;
  const candidates = board.moves({ verbose: true }).filter((m) => isMinor(m.piece) && !m.captured
    && homeSquaresOf(m.piece, them).includes(m.from));
  let best: Omit<NotYetPlayed, 'text'> | null = null;
  let bestVal = 0;
  const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  for (const cell of board.board().flat()) {
    if (!cell || cell.color !== student || cell.type === 'k') continue;
    // Not hit by anything of theirs yet.
    if (board.attackers(cell.square, them).length > 0) continue;
    // The student's developing move must not be what guards it — then the
    // order lesson is moot.
    if (board.attackers(cell.square, student).includes(devTo as Square)) continue;
    for (const d of candidates) {
      const probe = new Chess(fenAfter);
      probe.move(d.san);
      if (!probe.attackers(cell.square, them).includes(d.to)) continue;
      const gain = legalSeeGainFor(probe.fen(), cell.square, them);
      if (!(gain > 0)) continue;
      const v = VAL[cell.type] ?? 0;
      if (v > bestVal) { bestVal = v; best = { squares: [d.from, d.to, cell.square], theirMove: d.san, target: cell.square }; }
    }
  }
  return best;
}

/**
 * THE STUDENT PLAYED THE DEVELOPING MOVE FIRST, AND IT WAS RIGHT. `fenBefore`
 * is the board the student moved from; `san` their move, `bestSan` the
 * engine's, `cpLoss` the move's cost. Speaks only when the move IS the
 * engine's (or within a hair, < 30cp), develops a piece, and a square of the
 * student's that a later move of theirs would hit is still safe for now.
 */
export function notYetPlayed(fenBefore: string, san: string, bestSan: string | null, cpLoss: number): NotYetPlayed | null {
  if (cpLoss >= 30 || !bestSan) return null;
  const strip = (x: string): string => x.replace(/[+#]$/, '');
  if (strip(bestSan) !== strip(san)) return null;
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return null; }
  if (Number(fenBefore.split(' ')[5] ?? 1) > NOT_YET_MAX_FULLMOVE) return null;
  let m;
  try { m = board.move(san); } catch { return null; }
  if (!isDeveloping(m) || m.captured) return null;
  const w = waitingTarget(board.fen(), m.color, m.to);
  if (!w) return null;
  const them: 'w' | 'b' = m.color === 'w' ? 'b' : 'w';
  const theirPiece = NAME[new Chess(board.fen()).get(w.squares[0] as Square)?.type ?? 'n'];
  const what = NAME[board.get(w.target as Square)?.type ?? 'p'];
  const dev = them === 'b' ? `…${w.theirMove}` : w.theirMove;
  const text = rotateStem([
    `Development first is right: their ${theirPiece} is still on ${w.squares[0]}, so nothing hits your ${what} on ${w.target} yet — it only needs a guard once ${dev} comes.`,
    `Nothing attacks ${w.target} yet — their ${theirPiece} hasn't left ${w.squares[0]} — so the guard can wait and the piece comes out first.`,
  ], stemKeyOf(fenBefore));
  return { ...w, text };
}

/** THE PROSPECTIVE HALF, for a position read (the student to move): the
 *  engine's best move develops, and a square of the student's that their
 *  undeveloped minor would hit is still safe. Names no move of the student's —
 *  only what can wait. */
export function notYetIdea(fen: string, student: 'w' | 'b', bestSan: string | null): NotYetPlayed | null {
  if (!bestSan) return null;
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.turn() !== student || Number(fen.split(' ')[5] ?? 1) > NOT_YET_MAX_FULLMOVE) return null;
  let m;
  try { m = board.move(bestSan); } catch { return null; }
  if (!isDeveloping(m) || m.captured) return null;
  const w = waitingTarget(board.fen(), student, m.to);
  if (!w) return null;
  const theirPiece = NAME[board.get(w.squares[0] as Square)?.type ?? 'n'];
  const what = NAME[board.get(w.target as Square)?.type ?? 'p'];
  return { ...w, text: `Their ${theirPiece} is still on ${w.squares[0]}, so nothing hits your ${what} on ${w.target} yet — it doesn't need a guard; development comes first.` };
}
