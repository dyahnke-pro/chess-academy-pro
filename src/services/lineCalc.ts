// LINE CALCULATION, SAID OUT LOUD (David 2026-09-30: "We need to teach more
// line calculations. Make sure we can match that."). He plays the line to where
// the material lands — "…Nxd5, cxd5, …Bxc3+ with CHECK, Bxc3, …Qxc3+, a pawn
// up" — and every surface that names a win or a punishment reads the same
// computer: an engine line, walked, stopped at its LAST capture (the exchanges
// are over there, so what is left is what was won — never a peak the
// recaptures hand back). A LEAF: chess.js only.
import { Chess } from 'chess.js';
import type { ArrowClaim } from './arrowDoor';
import { MATERIAL_VALUE } from './pieceValues';

const WORDS: Record<number, string> = { 1: 'a pawn', 2: 'two pawns', 3: 'a piece', 4: 'a piece and a pawn', 5: 'a rook', 6: 'a rook and a pawn', 9: 'the queen' };

export interface LinePly { from: string; to: string; color: 'w' | 'b'; fen: string; san: string }
export interface LineWin { net: number; what: string; sans: string[]; plies: LinePly[] }

/**
 * `lineUci` from `fen`; `side` is who the gain is counted for. When `firstSan`
 * is given the line must start with it. Null unless `side` ends the line up at
 * least a pawn, with at least two plies to show.
 */
export function lineWins(fen: string, lineUci: readonly string[], side: 'w' | 'b', firstSan?: string, opts: { minPlies?: number } = {}): LineWin | null {
  if (!lineUci.length) return null;
  const bare = (s: string): string => s.replace(/[+#]$/, '');
  const c = new Chess(fen);
  const plies: LinePly[] = [];
  // THE GAIN SETTLES at the first finished exchange that leaves `side` up:
  // after a capture, when the next move takes nothing back (pass-3 walk
  // 2026-10-01: "the last capture" of a 20-ply engine line read out as
  // "…e6 dxe6+ …fxe6 b4 …Ke7 Nb3 … dxe4 fxe4" — material that deep in a PV is
  // noise, and he walks three to six plies). A line whose first settled count
  // is level or behind says nothing.
  let net = 0; let settle = -1; let lastCap = -1;
  const took: string[] = []; const gave: string[] = [];
  try {
    for (let i = 0; i < lineUci.length; i += 1) {
      const u = lineUci[i];
      const before = c.fen();
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      if (i === 0 && firstSan && bare(m.san) !== bare(firstSan)) return null;
      plies.push({ from: m.from, to: m.to, color: m.color, fen: before, san: m.san });
      if (m.captured) { net += (m.color === side ? 1 : -1) * (MATERIAL_VALUE[m.captured] ?? 0); lastCap = i; (m.color === side ? took : gave).push(m.captured); }
      // A SETTLE: something was taken, nobody is in check (a check forces the
      // reply), and the next move takes nothing back.
      const next = lineUci[i + 1];
      const nextTakes = next ? !!c.get(next.slice(2, 4) as Parameters<Chess['get']>[0]) : false;
      if (lastCap < 0 || nextTakes || c.inCheck()) continue;
      if (net >= 1) { settle = lastCap; break; }
      // Behind or level once the exchange is over: only a CHECK carries the
      // line on (a sacrifice cashed by force, the Damiano's Qh5+); a quiet
      // move here means the line proves nothing.
      let nextChecks = false;
      if (next) { try { const t = new Chess(c.fen()); t.move({ from: next.slice(0, 2), to: next.slice(2, 4), promotion: next[4] }); nextChecks = t.inCheck(); } catch { /* none */ } }
      if (!nextChecks) return null;
    }
  } catch { return null; }
  // Two plies by default (a line to SHOW); a refutation may settle on the
  // very first capture (`minPlies: 1` — puzzleTeaching: "Kd1? Rxa1+").
  if (settle < (opts.minPlies ?? 2) - 1) return null;
  const shown = plies.slice(0, settle + 1);
  return {
    net,
    what: materialWords(took, gave, net),
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

export interface MateLine {
  sans: string[];
  plies: LinePly[];
  /** The first move gives no check and takes nothing. */
  quiet: boolean;
  /** Squares next to their king the quiet first move takes away. */
  taken: string[];
  text: string;
}

const FILES = 'abcdefgh';
function kingSquare(c: Chess, color: 'w' | 'b'): string | null {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}
function around(sq: string): string[] {
  const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  const out: string[] = [];
  for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) {
    if ((df || dr) && f + df >= 0 && f + df < 8 && r + dr >= 1 && r + dr <= 8) out.push(`${FILES[f + df]}${r + dr}`);
  }
  return out;
}

/**
 * THE MATE, PLAYED OUT — and the QUIET MOVE BEFORE IT (Danya: "no check yet —
 * take the escape square first"). `lineUci` from `fen` must end in `side`
 * mating on the board; the line is cut at the mate. When the first move gives
 * no check and captures nothing, `taken` names the squares beside their king it
 * covers that were free before. Null when the line does not mate.
 */
export function mateLine(fen: string, lineUci: readonly string[], side: 'w' | 'b', firstSan?: string, opts: { minPlies?: number } = {}): MateLine | null {
  if (!lineUci.length) return null;
  const bare = (s: string): string => s.replace(/[+#]$/, '');
  const c = new Chess(fen);
  const plies: LinePly[] = [];
  let mated = false; let first: { check: boolean; capture: boolean } | null = null;
  let taken: string[] = [];
  try {
    for (let i = 0; i < lineUci.length && !mated; i += 1) {
      const u = lineUci[i];
      const before = c.fen();
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) return null;
      if (i === 0) {
        if (m.color !== side) return null;
        if (firstSan && bare(m.san) !== bare(firstSan)) return null;
        first = { check: c.inCheck(), capture: !!m.captured };
        if (!first.check && !first.capture) {
          const them = side === 'w' ? 'b' : 'w';
          const k = kingSquare(c, them);
          const was = new Chess(before);
          taken = k ? around(k).filter((s) => {
            const occ = c.get(s as Parameters<Chess['get']>[0]);
            if (occ && occ.color === them) return false;
            return c.isAttacked(s as Parameters<Chess['isAttacked']>[0], side) && !was.isAttacked(s as Parameters<Chess['isAttacked']>[0], side);
          }) : [];
        }
      }
      plies.push({ from: m.from, to: m.to, color: m.color, fen: before, san: m.san });
      if (c.isCheckmate()) { if (m.color !== side) return null; mated = true; }
    }
  } catch { return null; }
  if (!mated || !first || plies.length < (opts.minPlies ?? 3)) return null;
  const sans = plies.map((p) => `${p.color === 'b' ? '…' : ''}${p.san}`);
  const quiet = !first.check && !first.capture;
  const mateSan = sans[sans.length - 1].replace(/[+#]$/, '');
  const list = (xs: string[]): string => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
  const text = quiet && taken.length
    ? `No check yet — the quiet ${sans[0]} comes first: it takes ${list(taken)} from their king, and ${mateSan} is mate. ${sans.join(' ')}.`
    : quiet
      ? `No check yet — the quiet ${sans[0]} comes first, and ${mateSan} is mate. ${sans.join(' ')}.`
      : `It is a forced mate: ${sans.join(' ')}.`;
  return { sans, plies, quiet, taken, text };
}

const ONE: Record<string, string> = { p: 'a pawn', n: 'a knight', b: 'a bishop', r: 'a rook', q: 'the queen' };
const MANY: Record<string, string> = { p: 'pawns', n: 'knights', b: 'bishops', r: 'rooks', q: 'queens' };
const NUM = ['', 'one', 'two', 'three', 'four', 'five'];
/** What the line actually changes hands, by piece — "two pawns" was said of a
 *  knight won for a pawn and of the exchange (Learn walk 2026-10-01). Pieces
 *  traded like for like cancel; what is left is said as it is. */
function materialWords(took: readonly string[], gave: readonly string[], net: number): string {
  const g = [...took]; const l = [...gave];
  for (let i = g.length - 1; i >= 0; i -= 1) { const j = l.indexOf(g[i]); if (j >= 0) { g.splice(i, 1); l.splice(j, 1); } }
  const say = (xs: readonly string[]): string => {
    const order = ['q', 'r', 'b', 'n', 'p'];
    const parts = order.filter((t) => xs.includes(t)).map((t) => { const k = xs.filter((x) => x === t).length; return k === 1 ? ONE[t] : `${NUM[k] ?? k} ${MANY[t]}`; });
    return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  };
  if (g.length === 0) return WORDS[net] ?? `${net} points of material`;
  if (l.length === 0) return say(g);
  if (g.length === 1 && g[0] === 'r' && l.length === 1 && (l[0] === 'n' || l[0] === 'b')) return 'the exchange';
  return `${say(g)} for ${say(l)}`;
}
