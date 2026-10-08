// threatPurpose — "their threat's REAL purpose" (missed computers, 2026-10-08).
// Their move looks aimed at one thing (the piece it now attacks); the engine's
// line, played to its end, wins something else: a different piece, the king,
// or a queen trade into an ending they win. Said only when the two differ, and
// only from a line the caller has already verified as decisive for them.
// Pure: chess.js over the line's own plies.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { PvLine } from './pvPlayback';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

function queens(fen: string): number {
  try { return new Chess(fen).board().flat().filter((c) => c?.type === 'q').length; } catch { return -1; }
}

/** What their first move appears to aim at: the piece it takes, else the most
 *  valuable student piece (not the king) it attacks from its new square. */
function apparentTarget(line: PvLine, student: Color): { piece: PieceSymbol; square: Square } | null {
  const first = line.plies[0];
  if (!first) return null;
  const to = first.uci.slice(2, 4) as Square;
  const before = new Chess(first.fenBefore);
  const took = before.get(to);
  if (took && took.color === student) return { piece: took.type, square: to };
  const after = new Chess(first.fenAfter);
  const them: Color = student === 'w' ? 'b' : 'w';
  let best: { piece: PieceSymbol; square: Square } | null = null;
  for (const cell of after.board().flat()) {
    if (!cell || cell.color !== student || cell.type === 'k') continue;
    if (!after.attackers(cell.square, them).includes(to)) continue;
    if (!best || VALUE[cell.type] > VALUE[best.piece]) best = { piece: cell.type, square: cell.square };
  }
  return best;
}

export function threatPurpose(line: PvLine, student: Color): string | null {
  if (line.plies.length < 3) return null;
  let apparent: { piece: PieceSymbol; square: Square } | null;
  try { apparent = apparentTarget(line, student); } catch { return null; }
  if (!apparent) return null;
  const firstSan = line.plies[0].san;
  const looks = `Their ${firstSan} looks aimed at your ${NAME[apparent.piece]} on ${apparent.square}`;
  const last = line.plies[line.plies.length - 1];
  if (last.facts.isMate) return `${looks}, but its real point is mate.`;
  // A queen trade inside the line, into the decisive ending the caller verified.
  const startQ = queens(line.plies[0].fenBefore);
  const endQ = queens(last.fenAfter);
  if (startQ === 2 && endQ === 0) return `${looks}, but its real point is trading queens into an ending they win.`;
  // The biggest student piece the line actually wins, if it is a different one.
  const them: Color = student === 'w' ? 'b' : 'w';
  let won: { piece: PieceSymbol; square: Square } | null = null;
  for (const p of line.plies) {
    const moverIsThem = (p.moverColor === 'white' ? 'w' : 'b') === them;
    if (!moverIsThem) continue;
    const to = p.uci.slice(2, 4) as Square;
    let taken: PieceSymbol | null = null;
    try { taken = new Chess(p.fenBefore).get(to)?.type ?? null; } catch { taken = null; }
    if (!taken) continue;
    if (!won || VALUE[taken] > VALUE[won.piece]) won = { piece: taken, square: to };
  }
  if (!won || won.square === apparent.square || VALUE[won.piece] < VALUE[apparent.piece]) return null;
  return `${looks}, but its real point is your ${NAME[won.piece]} on ${won.square}.`;
}
