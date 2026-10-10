// LINE CALCULATION, SAID OUT LOUD (David 2026-09-30: "We need to teach more
// line calculations. Make sure we can match that."). He plays the line to where
// the material lands — "…Nxd5, cxd5, …Bxc3+ with CHECK, Bxc3, …Qxc3+, a pawn
// up" — and every surface that names a win or a punishment reads the same
// computer: an engine line, walked, stopped at its LAST capture (the exchanges
// are over there, so what is left is what was won — never a peak the
// recaptures hand back). The outcome is the ONE ledger rule (exchangeLedger.proofCut).
import { andList } from '../utils/andList';
import { Chess } from 'chess.js';
import { countWords } from '../utils/countWords';
import type { ArrowClaim } from './arrowDoor';
import { proofCut, netPieceWords } from './exchangeLedger';
import { MAX_PV_DEPTH_PLIES } from './ratingBands';


export interface LinePly { from: string; to: string; color: 'w' | 'b'; fen: string; san: string }
export interface LineWin { net: number; what: string; sans: string[]; plies: LinePly[] }

/**
 * `lineUci` from `fen`; `side` is who the gain is counted for. When `firstSan`
 * is given the line must start with it. Null unless `side` ends the line up at
 * least a pawn, with at least two plies to show.
 */
export function lineWins(
  fen: string, lineUci: readonly string[], side: 'w' | 'b', firstSan: string | undefined,
  /** REQUIRED — the move that led to `fen`, or null on a quiet board. A line
   *  that opens by taking back on that move's capture square is the other
   *  half of a trade, counted from before it (clean-pass walk 2026-10-04, G2
   *  31…Qxh4+: "That wins two knights" — the first knight had just taken a
   *  bishop). */
  prior: { fenBefore: string; san: string } | null,
  opts: { minPlies?: number } = {},
): LineWin | null {
  if (!lineUci.length) return null;
  const bare = (s: string): string => s.replace(/[+#]$/, '');
  const c = new Chess(fen);
  const plies: LinePly[] = [];
  try {
    for (let i = 0; i < lineUci.length; i += 1) {
      const u = lineUci[i];
      const before = c.fen();
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      if (i === 0 && firstSan && bare(m.san) !== bare(firstSan)) return null;
      plies.push({ from: m.from, to: m.to, color: m.color, fen: before, san: m.san });
    }
  } catch { /* the playable prefix is what we have */ }
  // WHAT THE LINE WINS is the ONE ledger rule (WO-OUTCOME-01): the settled net
  // where the line ends — never a private settle rule of this file.
  const proof = proofCut(fen, plies.map((p) => p.san), side, prior);
  if (!proof || proof.mate || !proof.ledger || proof.ledger.netPawns < 1) return null;
  // A SPOKEN proof has the listener's horizon — the same check every heard
  // proof makes (exchangeLedger.moverLineProof): a deep engine line's tail is
  // never a reason anyone can follow.
  if (proof.plies > MAX_PV_DEPTH_PLIES) return null;
  // Two plies by default (a line to SHOW); a refutation may settle on the
  // very first capture (`minPlies: 1` — puzzleTeaching: "Kd1? Rxa1+").
  if (proof.plies < (opts.minPlies ?? 2)) return null;
  // The proof may run one forced recapture past the engine line's end; those
  // plies are played here so the line shown is the line the claim rests on.
  const shown = plies.slice(0, proof.plies);
  try {
    const x = new Chess(shown.length ? plies[shown.length - 1].fen : fen);
    if (shown.length) x.move(shown[shown.length - 1].san);
    for (const san of proof.sans.slice(shown.length, proof.plies)) {
      const before = x.fen();
      const m = x.move(san);
      shown.push({ from: m.from, to: m.to, color: m.color, fen: before, san: m.san });
    }
  } catch { return null; }
  const net = proof.ledger.netPawns;
  return {
    net,
    what: materialWords(proof.ledger.studentWon, proof.ledger.opponentWon, net),
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
    ? `No check yet — the quiet ${sans[0]} comes first: it takes ${list(taken)} from their king, and ${mateSan} is mate. ${andList(sans)}.`
    : quiet
      ? `No check yet — the quiet ${sans[0]} comes first, and ${mateSan} is mate. ${andList(sans)}.`
      : `It is a forced mate: ${andList(sans)}.`;
  return { sans, plies, quiet, taken, text };
}

/** What the line actually changes hands, by piece (the one ledger namer);
 *  a count only when the pieces cancel out to nothing nameable. */
function materialWords(took: readonly string[], gave: readonly string[], net: number): string {
  return netPieceWords(took, gave) ?? countWords(net, { unit: true });
}
