// inBetweenMove — THE ZWISCHENZUG, ONE COMPUTER, BOTH DIRECTIONS (A-plan P7,
// 2026-10-16). His "I didn't take on h4 right away; Be5 first, hitting the
// rook, and only then did I take": a capture is on the board, the best move is
// a different, FORCING move, and the capture is still there later in its
// line. The teaching line (`thinkAloud.notYet`) says it; the tactic record
// (`detectTacticType`) files a missed one as 'zwischenzug' — one detector, so
// the coach that teaches the in-between move is the coach that catches you
// walking past it.
// Leaf: chess.js and the piece values only.
import { Chess } from 'chess.js';
import { CAPTURE_VALUE } from './pieceValues';

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

/** The in-between move at `fen` along the engine's line `pv` (UCI, its first
 *  move the best move), or null. */
export function inBetweenMove(fen: string, pv: readonly string[]): InBetween | null {
  if (pv.length === 0) return null;
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  let first;
  try { first = new Chess(fen).move({ from: pv[0].slice(0, 2), to: pv[0].slice(2, 4), promotion: pv[0][4] }); } catch { return null; }
  if (!first || first.captured) return null;
  // FORCING: a check, or a new hit on a piece worth at least the mover.
  const after = new Chess(fen); after.move(first.san);
  const forcing = first.san.includes('+') || after.board().flat().some((x) => {
    if (!x || x.color === first.color || x.type === 'p' || x.type === 'k') return false;
    try { return after.attackers(x.square, first.color).includes(first.to) && (CAPTURE_VALUE[x.type] ?? 0) >= (CAPTURE_VALUE[first.piece] ?? 0); } catch { return false; }
  });
  if (!forcing) return null;
  const caps = board.moves({ verbose: true }).filter((m) => m.captured);
  const sans = sansOf(fen, pv, 8);
  for (let i = 2; i < sans.length; i += 2) {
    const later = caps.find((m) => sans[i]?.replace(/[+#]/g, '').endsWith(m.to) && sans[i].includes('x'));
    if (later) return { capture: later.san, captureSquare: later.to, first: first.san, check: first.san.includes('+'), line: sans.slice(0, i + 1) };
  }
  return null;
}
