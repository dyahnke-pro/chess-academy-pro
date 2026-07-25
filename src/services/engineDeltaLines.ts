/**
 * engineDeltaLines — the review's per-move "delta" (what a move THREATENS + the
 * engine's best line), ported to Learn's Watch + Play as ARROWS on a static
 * board, in the present-tense in-game register.
 *
 * David 2026-07-24: "Add engine delta to watch and play." His speedrun voice
 * constantly traces the delta — "this now threatens the fork" / "the best line
 * here runs …" — with arrows, without moving the pieces. Same locked mechanism:
 * arrows show the line, the board never moves.
 *
 * Two parts, both returning { arrows, say } like the gem aside:
 *   - computeThreatDelta  — PURE (chess.js null-move scan via detectNewThreat):
 *     what the move just played now threatens. No engine, no async.
 *   - bestLineDeltaFromPv — takes an already-computed Stockfish PvLine (the
 *     caller owns the async engine call — Play reuses its live eval; Watch
 *     computes per node) and traces the best move as an arrow.
 *
 * G0/G3: every square is board-derived (chess.js / the engine PV); the voice
 * only phrases computed facts, never decides them. Present-tense, side-framed.
 */
import { detectNewThreat } from './groundedAnswer';
import type { PvLine } from './pvPlayback';
import type { NarrationArrow } from '../types/walkthroughTree';

export interface DeltaAside {
  arrows: NarrationArrow[];
  say: string;
  short: string;
}

function sideWord(wb: 'w' | 'b'): string {
  return wb === 'w' ? 'White' : 'Black';
}

function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}

/**
 * The THREAT delta — what the move just played (by `moverWB`) now threatens.
 * Pure: a chess.js null-move scan, no engine. Draws the threatening move as one
 * arrow (origin → landing) and voices it present-tense. Null when the move
 * creates no concrete threat (a fork / mate / winning capture).
 */
export function computeThreatDelta(
  fenBefore: string,
  fenAfter: string,
  moverWB: 'w' | 'b',
): DeltaAside | null {
  const t = detectNewThreat(fenBefore, fenAfter, moverWB);
  if (!t) return null;
  const side = sideWord(moverWB);
  const san = cleanSan(t.san);
  // detail already reads as a clause ("a fork winning the queen on d1", "mate on
  // h7", "wins the rook on a8") — phrase it as a live threat.
  const say = `And now ${side} is threatening ${san} — ${t.detail}.`;
  const short = `Threat: ${san}.`;
  return {
    arrows: [{ from: t.from, to: t.landing, color: 'blue' }],
    say,
    short,
  };
}

/**
 * The BEST-LINE delta — the engine's top move at this position, as an arrow +
 * the line named. Takes an already-computed `PvLine` (the caller owns the async
 * Stockfish call). Draws the first move (green); the board stays put, so it does
 * NOT fan out multi-ply arrows whose later origins are empty on the static board
 * — it shows the KEY move and names the short continuation, the way he traces
 * "the idea is …" with one arrow. Null when the PV is empty.
 */
export function bestLineDeltaFromPv(pv: PvLine | null): DeltaAside | null {
  if (!pv || pv.plies.length === 0) return null;
  const first = pv.plies[0];
  if (!first.uci || first.uci.length < 4) return null;
  const from = first.uci.slice(0, 2);
  const to = first.uci.slice(2, 4);
  // Name the next up-to-3 plies so the "line" is heard even though only the key
  // move is drawn (the board is static; later arrows would start on empty
  // squares). Danya says the line and draws the first move.
  const line = pv.plies.slice(0, 3).map((p) => cleanSan(p.san)).join(', ');
  const say = `The strongest line here runs ${line}.`;
  const short = `Best: ${cleanSan(first.san)}.`;
  return {
    arrows: [{ from, to, color: 'green' }],
    say,
    short,
  };
}
