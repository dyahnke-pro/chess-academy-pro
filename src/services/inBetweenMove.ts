// inBetweenMove — THE ZWISCHENZUG, ONE COMPUTER, BOTH DIRECTIONS (A-plan P7,
// 2026-10-16). His "I didn't take on h4 right away; Be5 first, hitting the
// rook, and only then did I take": a capture is on the board, the best move is
// a different, FORCING move, and the capture is still there later in its
// line. The teaching line (`thinkAloud.notYet`) says it; the tactic record
// (`detectTacticType`) files a missed one as 'zwischenzug' — one detector, so
// the coach that teaches the in-between move is the coach that catches you
// walking past it.
// Leaf: chess.js, the piece values and the one material read (`captureNet`).
import { Chess } from 'chess.js';
import { CAPTURE_VALUE } from './pieceValues';
import { captureNet } from './material';

interface InBetween {
  /** The capture that waits, as SAN on the board it is played from now. */
  capture: string;
  /** The square it captures on. */
  captureSquare: string;
  /** The forcing move played first. */
  first: string;
  /** The first move gives check. */
  check: boolean;
  /** The line as SAN from the board it starts on, through the capture — the
   *  proof that the capture is still there after the forcing move. */
  line: string[];
}

function sansOf(fen: string, uci: readonly string[], max: number): string[] {
  const out: string[] = [];
  let c: Chess;
  try { c = new Chess(fen); } catch { return out; }
  for (const u of uci.slice(0, max)) {
    try {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
      if (!m) break;
      out.push(m.san);
    } catch { break; }
  }
  return out;
}

/** A read of the board `fen` (White's view, the shape `AnalysisLine` has). */
interface FanRead { evaluation: number; mate?: number | null; moves: readonly string[] }

/** "Taking can wait" is a claim that the capture NOW is no better than the
 *  forcing move first — an engine claim, so the surface answers it. */
export type FirstIsBest =
  /** `pv` is the engine's own best line: its first move is the best move. */
  | 'best'
  /** `pv` starts with a move the engine was not asked about (the move played
   *  in a lesson or a game): the fan of reads of `fen` decides — the forcing
   *  move must be in it, and the capture now may not beat it there. */
  | { reads: readonly FanRead[] };

/** The capture now may beat the forcing move by less than this (cp, the
 *  mover's view) and still "wait" — the naming bar (`settleReads.NAME_CP`). */
const WAIT_CP = 30;

const MATE_CP = 100_000;
const moverCp = (r: FanRead, mover: 'w' | 'b'): number => {
  const v = r.mate !== null && r.mate !== undefined ? (r.mate > 0 ? MATE_CP : -MATE_CP) : r.evaluation;
  return mover === 'w' ? v : -v;
};

/** The in-between move at `fen` along the line `pv` (UCI), or null.
 *  `firstIsBest` is REQUIRED: whether `pv` is the engine's best line, or the
 *  reads that say whether its first move beats taking now (KG main Nc3:
 *  "Taking on f4 can wait" when Bxf4 at once was 0.5 better in two reads). */
export function inBetweenMove(fen: string, pv: readonly string[], firstIsBest: FirstIsBest): InBetween | null {
  if (pv.length === 0) return null;
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  let first;
  try { first = new Chess(fen).move({ from: pv[0].slice(0, 2), to: pv[0].slice(2, 4), promotion: pv[0][4] }); } catch { return null; }
  if (!first || first.captured) return null;
  // FORCING: a check, or a NEW hit that is a threat — on a piece worth more
  // than the mover, or one nothing guards. A piece that already hit its target
  // from where it stood makes no new threat by stepping back along the line
  // (task 172: Bh4 after …h6 was "the threat comes first"), and a guarded
  // piece of the same worth is not threatened (…Bb7 "hitting" a knight on f3
  // that two pieces guard).
  const after = new Chess(fen); after.move(first.san);
  const forcing = first.san.includes('+') || after.board().flat().some((x) => {
    if (!x || x.color === first.color || x.type === 'p' || x.type === 'k') return false;
    try {
      if (!after.attackers(x.square, first.color).includes(first.to)) return false;
      if (board.attackers(x.square, first.color).includes(first.from)) return false;
      return (CAPTURE_VALUE[x.type] ?? 0) > (CAPTURE_VALUE[first.piece] ?? 0) || after.attackers(x.square, x.color).length === 0;
    } catch { return false; }
  });
  if (!forcing) return null;
  // THE CAPTURE THAT WAITS IS ONE WORTH MAKING: a capture that loses material
  // where it stands was never on ("Taking on d5 can wait" in the Benko, where
  // …Nxd5 at that moment loses the knight to Qxd5; 3.Bb5 "they don't take on
  // e5 yet", where Nxe5 loses a knight for a pawn).
  const caps = board.moves({ verbose: true }).filter((m) => m.captured && (captureNet(fen, m.san) ?? -1) >= 0);
  const sans = sansOf(fen, pv, 8);
  for (let i = 2; i < sans.length; i += 2) {
    const later = caps.find((m) => sans[i]?.replace(/[+#]/g, '').endsWith(m.to) && sans[i].includes('x'));
    if (!later) continue;
    if (firstIsBest !== 'best') {
      // THE CAPTURE COULD NOT HAVE COME FIRST, BY THE READS: the forcing move
      // is read, and taking on that square now is not ahead of it.
      const mover = board.turn();
      const firstRead = firstIsBest.reads.find((r) => r.moves[0] === pv[0]);
      if (!firstRead) return null;
      const takeNow = firstIsBest.reads.filter((r) => { const u = r.moves[0]; return !!u && u.slice(2, 4) === later.to && caps.some((m) => `${m.from}${m.to}` === u.slice(0, 4)); });
      if (takeNow.some((r) => moverCp(r, mover) - moverCp(firstRead, mover) >= WAIT_CP)) return null;
    }
    return { capture: later.san, captureSquare: later.to, first: first.san, check: first.san.includes('+'), line: sans.slice(0, i + 1) };
  }
  return null;
}
