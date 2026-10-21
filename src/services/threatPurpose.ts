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
  const won = piecesWon(line);
  if (!won || won.square === apparent.square || VALUE[won.piece] < VALUE[apparent.piece]) return null;
  return `${looks}, but its real point is your ${NAME[won.piece]} on ${won.square}.`;
}

/** The most valuable piece a projected line wins for the side that moves first
 *  in it, named by the square it stood on when the line began. Null when the
 *  line takes nothing. A piece is named by the square it stands on NOW, never
 *  where the line later takes it (review audit 2026-10-14: "its real point is
 *  your bishop on f6" — the d7 bishop went to f6 inside the line and was taken
 *  there; it was the same bishop, and f6 was empty). `origin` follows each of
 *  the other side's pieces back to its square at the start of the line. */
function piecesWon(line: PvLine): { piece: PieceSymbol; square: Square } | null {
  const owner = line.plies[0]?.moverColor;
  if (!owner) return null;
  const origin = new Map<string, Square>();
  let won: { piece: PieceSymbol; square: Square } | null = null;
  for (const p of line.plies) {
    const from = p.uci.slice(0, 2) as Square;
    const to = p.uci.slice(2, 4) as Square;
    if (p.moverColor !== owner) {
      origin.set(to, origin.get(from) ?? from);
      origin.delete(from);
      continue;
    }
    let taken: PieceSymbol | null = null;
    try { taken = new Chess(p.fenBefore).get(to)?.type ?? null; } catch { taken = null; }
    if (!taken) continue;
    const startedOn = origin.get(to) ?? to;
    origin.delete(to);
    if (!won || VALUE[taken] > VALUE[won.piece]) won = { piece: taken, square: startedOn };
  }
  return won;
}

/** A PROJECTED LINE THAT ONLY PLAYS OUT A CLAIM ALREADY SPOKEN (Review tape
 *  2026-10-21, 19…f4: "f4 would hit your bishop on e3" was said, and the deep
 *  pass then added "Watch what they're building — left alone, their idea
 *  goes: they play fxe3 and you answer Rxe3"). True when one spoken claim's
 *  coupled squares hold both ends of the line's first move AND the square of
 *  what the line wins: the line is that claim's own consequence, already heard.
 *  A line that mates, or wins something the claim never named, says something
 *  new. Judged on the computers' squares, never on the prose. */
export function lineRestatesClaim(line: PvLine, spokenSquares: ReadonlyArray<readonly string[]>): boolean {
  const first = line.plies[0];
  if (!first || line.plies[line.plies.length - 1].facts.isMate) return false;
  const won = piecesWon(line);
  if (!won) return false;
  const from = first.uci.slice(0, 2);
  const to = first.uci.slice(2, 4);
  return spokenSquares.some((sq) => sq.includes(from) && sq.includes(to) && sq.includes(won.square));
}
