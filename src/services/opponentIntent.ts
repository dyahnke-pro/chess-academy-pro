// opponentIntent — what the opponent WANTS, branched (G0). The other half of the
// discussion (David 2026-08-27, locked; doc §4.0b).
//
// When it's the opponent's move, a real coach thinks WITH you from their side:
// "he's looking at Ng5 — be ready for it." And, played out: "if he takes, you
// recapture; if he retreats, you grab the centre." The branched form is robust
// to our throttled engine — it enumerates the replies that matter, so whatever
// the (weaker) engine actually plays, you already heard the plan.
//
// THE CHEAP TRICK: the opponent's fan (they're to move) already carries the
// student's reply — it's ply 2 of each PV. So `moves[0]` is the opponent's idea
// and `moves[1]` is the student's answer to it, straight from the lines we paid
// for. No extra search. We narrate the IDEAL (the engine's top choice for them),
// not what the throttled engine will actually play — the gap between the two
// becomes the lesson elsewhere. G0: the moves are Stockfish; this only orders
// and names them.
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';

export interface OpponentPlan {
  /** The opponent's candidate move (SAN) — their idea. */
  opponentMove: string;
  /** The student's best answer to it (SAN, ply 2 of the PV) — null if the line
   *  is only one ply deep. */
  studentReply: string | null;
  /** Eval of this line (white-POV cp; mate → ±100000). */
  evalCp: number;
}

export interface OpponentIntent {
  /** The opponent's top plans, most-likely first (best line first). */
  plans: OpponentPlan[];
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m ? m.san : null;
  } catch { return null; }
}

const DEFAULT_MAX = 2;

/**
 * Build the opponent's intent from the fan at a position where the OPPONENT is to
 * move. Reads each top line's `moves[0]` (their idea) and `moves[1]` (your reply)
 * straight from the PV. Returns the top `max` (default 2) plans, or null when the
 * fan is empty / unreadable.
 */
export function buildOpponentIntent(input: {
  analysis: Pick<StockfishAnalysis, 'topLines'>;
  /** The position with the OPPONENT to move. */
  fen: string;
  max?: number;
}): OpponentIntent | null {
  const { fen } = input;
  const max = input.max ?? DEFAULT_MAX;
  const lines = [...(input.analysis.topLines ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .filter((l) => l.moves.length > 0);
  if (lines.length === 0) return null;

  const plans: OpponentPlan[] = [];
  for (const l of lines.slice(0, max)) {
    const opponentMove = uciToSan(fen, l.moves[0]);
    if (!opponentMove) continue;
    let studentReply: string | null = null;
    if (l.moves[1]) {
      try {
        const c = new Chess(fen);
        c.move({ from: l.moves[0].slice(0, 2), to: l.moves[0].slice(2, 4), promotion: l.moves[0][4] });
        studentReply = uciToSan(c.fen(), l.moves[1]);
      } catch { studentReply = null; }
    }
    const evalCp = l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation;
    // De-dup: two lines can share a first move (rare with MultiPV, but guard).
    if (!plans.some((p) => p.opponentMove === opponentMove)) plans.push({ opponentMove, studentReply, evalCp });
  }
  return plans.length ? { plans } : null;
}

/**
 * The intent as board-true facts. `revealReply` decides disclosure:
 *  - false (the student's OWN game — guide-don't-tell): name the opponent's idea,
 *    withhold the student's reply so they find it.
 *  - true (a teaching context — Watch/demo): play it out, branched.
 * '' when there's nothing to say.
 */
export function opponentIntentFacts(oi: OpponentIntent, opts: { revealReply: boolean }): string {
  const p0 = oi.plans[0];
  if (!p0) return '';
  if (opts.revealReply && p0.studentReply) {
    let s = `the opponent's strongest here is ${p0.opponentMove} — you'll want ${p0.studentReply} ready.`;
    const p1 = oi.plans[1];
    if (p1?.studentReply) s += ` if instead ${p1.opponentMove}, then ${p1.studentReply}.`;
    return s;
  }
  // Guide-don't-tell: the opponent's idea only.
  return `keep an eye on the opponent's ${p0.opponentMove} — that's their strongest try here.`;
}
