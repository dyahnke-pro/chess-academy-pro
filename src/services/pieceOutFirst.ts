// A PIECE OUT BEFORE ITS PAWN SHUTS IT IN (gap B1, move order, David
// 2026-11-12: "I want the gap filled"). Theory's most taught order point:
// "…Bf5 comes out before …e6, which would shut the bishop in" (the Caro-Kann),
// "Bc4 before d3" (the Italian). Computed: a bishop or queen leaves home along
// a line, and the mover's own pawn push later in the line that follows lands
// on that line — played first, it would have closed the road.
//
// Pure (chess.js). Both seats. Null when the follow-up never comes or the
// road was never the one the pawn closes.
import { Chess, type Color } from 'chess.js';

export interface PieceOutFirst {
  /** The pawn move that would have shut the piece in (SAN, dotted for Black). */
  pawn: string;
  piece: 'bishop' | 'queen';
  squares: string[];
}

function between(from: string, to: string): string[] {
  const f0 = from.charCodeAt(0), r0 = Number(from[1]);
  const f1 = to.charCodeAt(0), r1 = Number(to[1]);
  const df = Math.sign(f1 - f0), dr = Math.sign(r1 - r0);
  if (Math.abs(f1 - f0) !== Math.abs(r1 - r0) && f0 !== f1 && r0 !== r1) return [];
  const out: string[] = [];
  for (let f = f0 + df, r = r0 + dr; f !== f1 || r !== r1; f += df, r += dr) out.push(`${String.fromCharCode(f)}${r}`);
  return out;
}

/** `follow`: the moves after `san` (the reply first), as the line goes on. */
export function pieceOutFirst(fenBefore: string, san: string, follow: readonly string[]): PieceOutFirst | null {
  let mover: Color;
  let mv;
  const board = new Chess();
  try { board.load(fenBefore); mover = board.turn(); mv = board.move(san); } catch { return null; }
  if (!mv || (mv.piece !== 'b' && mv.piece !== 'q') || mv.captured) return null;
  const home = mover === 'w' ? '1' : '8';
  if (mv.from[1] !== home) return null;
  const road = between(mv.from, mv.to);
  if (road.length === 0) return null;
  // The mover's own pawn pushes later in the line.
  const c = new Chess(board.fen());
  for (let k = 0; k < Math.min(follow.length, 8); k += 1) {
    let m;
    try { m = c.move(follow[k]); } catch { return null; }
    if (!m) return null;
    if (m.color !== mover || m.piece !== 'p' || m.captured) continue;
    if (!road.includes(m.to)) continue;
    // Played first, the pawn would have stood on the road: was it legal then?
    const first = new Chess(fenBefore);
    let legal = false;
    try { legal = !!first.move({ from: m.from, to: m.to }); } catch { legal = false; }
    if (!legal) continue;
    return { pawn: `${mover === 'b' ? '…' : ''}${m.san}`, piece: mv.piece === 'b' ? 'bishop' : 'queen', squares: [mv.from, mv.to, m.to] };
  }
  return null;
}
