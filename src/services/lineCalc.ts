// LINE CALCULATION, SAID OUT LOUD (David 2026-09-30: "We need to teach more
// line calculations. Make sure we can match that."). He plays the line to where
// the material lands — "…Nxd5, cxd5, …Bxc3+ with CHECK, Bxc3, …Qxc3+, a pawn
// up" — and every surface that names a win or a punishment reads the same
// computer: an engine line, walked, stopped at its LAST capture (the exchanges
// are over there, so what is left is what was won — never a peak the
// recaptures hand back). The outcome is the ONE ledger rule (exchangeLedger.proofCut).
import { seatedLine } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { Chess } from 'chess.js';
import { countWords } from '../utils/countWords';
import type { ArrowClaim } from './arrowDoor';
import { heardProofCut, netPieceWords, proofCut, heardHorizon } from './exchangeLedger';
import { MATERIAL_VALUE } from './pieceValues';
import { unmarked } from '../utils/sanMark';


export interface LinePly { from: string; to: string; color: 'w' | 'b'; fen: string; san: string }
interface LineWin { net: number; what: string; sans: string[]; plies: LinePly[] }

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
  const proof = heardProofCut(fen, plies.map((p) => p.san), side, prior);
  if (!proof || proof.mate || !proof.ledger || proof.ledger.netPawns < 1) return null;
  // A SPOKEN proof has the listener's horizon (heardProofCut — the same cut
  // every heard proof makes): a deep quiet tail is never a reason anyone can
  // follow, so the claim is what is settled where a listener can still see.
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
  // WHAT THE MOVE BEFORE IT TOOK COUNTS TOO (claim check 2026-10-18: "Rxc7
  // was a blunder — …e5, Bg3 and …Qxc7 — they come out a rook up" of a line
  // that wins a rook for the pawn Rxc7 had just taken). `proofCut` folds the
  // prior capture in only when the line opens by taking back on its square;
  // any other line still pays for it.
  const took = [...proof.ledger.studentWon];
  let gave: string[] = [...proof.ledger.opponentWon];
  let net = proof.ledger.netPawns;
  const priorTook = priorCapture(prior);
  const sq = (san: string): string | undefined => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(san)?.[1];
  if (priorTook && prior && !(/x/.test(plies[0]?.san ?? '') && sq(plies[0].san) === sq(prior.san))) {
    gave = [...gave, priorTook];
    net -= MATERIAL_VALUE[priorTook] ?? 0;
    if (net < 1) return null;
  }
  return {
    net,
    what: materialWords(took, gave, net),
    sans: shown.map((p) => `${p.color === 'b' ? '…' : ''}${p.san}`),
    plies: shown,
  };
}

/** How far a far win may lie and still be the move's doing: past ten moves
 *  the line is a plan, not a consequence. */
const FAR_MAX_PLIES = 20;

/**
 * THE FAR WIN (WO-DECIDER-02, David 2026-10-28: "Deeper means more profound …
 * not more spoken"). `lineWins` stops at the heard horizon, so a move whose
 * cost lands four to ten moves on had no reason at all: 56 of 304 costly moves
 * over 34 of David's games. This is the same ledger rule over the WHOLE line,
 * for the short form a surface says ("they win a knight — the engine's line
 * gets there in six moves") while the board walks the line. Null when the line
 * proves nothing, wins under `minNet`, or lands inside the horizon (there
 * `lineWins` says it in full).
 */
export function farLineWin(
  fen: string, lineUci: readonly string[], side: 'w' | 'b',
  /** REQUIRED, as for `lineWins` — the move that led to `fen`, or null. */
  prior: { fenBefore: string; san: string } | null,
  minNet: number,
): { what: string; moves: number; uci: string[] } | null {
  const sans: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of lineUci) sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
  } catch { /* the playable prefix is what we have */ }
  if (sans.length === 0) return null;
  const whole = proofCut(fen, sans, side, prior);
  if (!whole || whole.mate || !whole.ledger?.settled || whole.ledger.netPawns < minNet) return null;
  if (whole.plies <= heardHorizon(fen, whole.sans) || whole.plies > FAR_MAX_PLIES) return null;
  return {
    what: materialWords(whole.ledger.studentWon, whole.ledger.opponentWon, whole.ledger.netPawns),
    moves: Math.ceil(whole.plies / 2),
    uci: lineUci.slice(0, Math.min(whole.plies, lineUci.length)),
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

/** The piece the move before the line captured, or null. */
function priorCapture(prior: { fenBefore: string; san: string } | null): string | null {
  if (!prior || !/x/.test(prior.san)) return null;
  try { return new Chess(prior.fenBefore).move(prior.san)?.captured ?? null; } catch { return null; }
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
  const mateSan = unmarked(sans[sans.length - 1]);
  const list = (xs: string[]): string => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
  // A long mate is said as its length and first move; the whole line is drawn
  // (proof guard 2 — "a forced mate in 3, starting with Nxe5").
  const short = sans.length <= 3;
  // Each move with its mover (OS-8 gap 7). The text speaks to the side that
  // mates — the student, on every caller that says it.
  const said = seatedLine(sans, plies[0].color === side ? 'you' : 'they');
  const tail = short ? ` ${openSentence(said)}.` : '';
  const text = quiet && taken.length
    ? `No check yet — the quiet ${sans[0]} comes first: it takes ${list(taken)} from their king, and ${mateSan} is mate.${tail}`
    : quiet
      ? `No check yet — the quiet ${sans[0]} comes first, and ${mateSan} is mate.${tail}`
      : short ? `It is a forced mate: ${said}.` : `It is a forced mate in ${Math.ceil(sans.length / 2)}, starting with ${sans[0]}.`;
  return { sans, plies, quiet, taken, text };
}

/** What the line actually changes hands, by piece (the one ledger namer);
 *  a count only when the pieces cancel out to nothing nameable. */
function materialWords(took: readonly string[], gave: readonly string[], net: number): string {
  return netPieceWords(took, gave) ?? countWords(net, { unit: true });
}
