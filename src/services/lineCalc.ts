// LINE CALCULATION, SAID OUT LOUD (David 2026-09-30: "We need to teach more
// line calculations. Make sure we can match that."). He plays the line to where
// the material lands — "…Nxd5, cxd5, …Bxc3+ with CHECK, Bxc3, …Qxc3+, a pawn
// up" — and every surface that names a win or a punishment reads the same
// computer: an engine line, walked, stopped at its LAST capture (the exchanges
// are over there, so what is left is what was won — never a peak the
// recaptures hand back). A LEAF: chess.js only.
import { Chess } from 'chess.js';
import type { ArrowClaim } from './arrowDoor';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const WORDS: Record<number, string> = { 1: 'a pawn', 2: 'two pawns', 3: 'a piece', 4: 'a piece and a pawn', 5: 'the exchange', 6: 'a rook and a pawn', 9: 'the queen' };

export interface LinePly { from: string; to: string; color: 'w' | 'b'; fen: string; san: string }
export interface LineWin { net: number; what: string; sans: string[]; plies: LinePly[] }

/**
 * `lineUci` from `fen`; `side` is who the gain is counted for. When `firstSan`
 * is given the line must start with it. Null unless `side` ends the line up at
 * least a pawn, with at least two plies to show.
 */
export function lineWins(fen: string, lineUci: readonly string[], side: 'w' | 'b', firstSan?: string): LineWin | null {
  if (!lineUci.length) return null;
  const bare = (s: string): string => s.replace(/[+#]$/, '');
  const c = new Chess(fen);
  const plies: LinePly[] = [];
  let net = 0; let lastCap = -1;
  try {
    for (let i = 0; i < lineUci.length; i += 1) {
      const u = lineUci[i];
      const before = c.fen();
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      if (i === 0 && firstSan && bare(m.san) !== bare(firstSan)) return null;
      if (m.captured) { net += (m.color === side ? 1 : -1) * (VALUE[m.captured] ?? 0); lastCap = i; }
      plies.push({ from: m.from, to: m.to, color: m.color, fen: before, san: m.san });
    }
  } catch { return null; }
  if (net < 1 || lastCap < 1) return null;
  const shown = plies.slice(0, lastCap + 1);
  return {
    net,
    what: WORDS[net] ?? `${net} points of material`,
    sans: shown.map((p) => `${p.color === 'b' ? '…' : ''}${p.san}`),
    plies: shown,
  };
}

/** The same line as board arrows, ply by ply, each on the board it is played
 *  from — so what is drawn is exactly what is said. */
export function lineArrows(fen: string, lineUci: readonly string[], source: string): ArrowClaim[] {
  const c = new Chess(fen);
  const out: ArrowClaim[] = [];
  for (const u of lineUci) {
    const before = c.fen();
    try {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      out.push({ from: m.from, to: m.to, role: 'line', fen: before, source });
    } catch { break; }
  }
  return out;
}
