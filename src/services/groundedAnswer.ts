/**
 * groundedAnswer — Phase 1 of the coach-chat grounding inversion
 * (docs/plans/2026-06-10-coach-chat-grounding-inversion.md).
 *
 * The contract: the LLM voices computed facts; it never reasons about the
 * board. This assembles the FACTS for a move / eval question entirely in
 * code — the engine's best move, the line, the eval, and the GROUNDED reason
 * it's strong (`explainBestMoveGrounded`, the no-LLM "why" the review path
 * already uses). The chat path hands the resulting `facts` string to the LLM
 * with a voice-only instruction; the model adds nothing.
 *
 * Pure + side-effect-free so it's trivially testable and can't regress the
 * live chat. Wiring it into `getCoachChatResponse` is the next step.
 */
import { Chess } from 'chess.js';
import { explainBestMoveGrounded } from './coachFeatureService';

export interface GroundedAnswer {
  /** The plain-language facts the LLM must voice — and ONLY these. */
  facts: string;
  /** SAN of the computed best move (for the arrow + the prompt), or null. */
  bestMoveSan: string | null;
  /** The from/to of the best move, for a `[BOARD: arrow:from-to:green]`. */
  bestMoveFromTo: { from: string; to: string } | null;
  /** Where every fact came from (engine / chess.js) — recorded, never the LLM. */
  sources: string[];
}

/** Convert a centipawn eval (side-to-move POV) into a grounded phrase. Never
 *  invents a number — rounds the real one. */
function evalPhrase(evalCp: number | null | undefined, mateIn: number | null | undefined, mover: 'white' | 'black'): string | null {
  if (typeof mateIn === 'number' && mateIn !== 0) {
    const who = mateIn > 0 ? mover : (mover === 'white' ? 'black' : 'white');
    return `there is a forced mate in ${Math.abs(mateIn)} for ${who}`;
  }
  if (typeof evalCp !== 'number') return null;
  const pawns = evalCp / 100;
  const who = pawns >= 0 ? mover : (mover === 'white' ? 'black' : 'white');
  const mag = Math.abs(pawns);
  if (mag < 0.3) return 'the position is roughly balanced';
  if (mag < 1.0) return `${who} is slightly better (about ${mag.toFixed(1)} pawns)`;
  if (mag < 2.5) return `${who} is clearly better (about ${mag.toFixed(1)} pawns)`;
  return `${who} is winning (about ${mag.toFixed(1)} pawns)`;
}

/**
 * Assemble the grounded facts for a move / best-move / eval question.
 * Returns null when there's no engine move to ground on (caller falls back
 * to the existing path — this never fabricates).
 */
export function assembleMoveEvalAnswer(opts: {
  fen: string;
  /** Engine best move in UCI (e.g. `g1f3`) — from Stockfish PV[0]. */
  bestMoveUci: string | null;
  evalCp?: number | null;
  mateIn?: number | null;
}): GroundedAnswer | null {
  const { fen, bestMoveUci } = opts;
  if (!bestMoveUci || bestMoveUci.length < 4) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const mover: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

  // SAN + from/to from the UCI — chess.js is the truth, not the LLM.
  let bestMoveSan: string | null = null;
  let fromTo: { from: string; to: string } | null = null;
  try {
    const probe = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
    const mv = probe.move({ from, to, promotion });
    if (mv) {
      bestMoveSan = mv.san;
      fromTo = { from, to };
    }
  } catch {
    return null; // illegal best move → don't ground (never fabricate)
  }
  if (!bestMoveSan) return null;

  // The GROUNDED reason it's strong — no LLM. (playedSan null: we're not
  // contrasting a played move here, just stating what the best move achieves.)
  const why = explainBestMoveGrounded(fen, null, bestMoveUci, mover);
  const evalText = evalPhrase(opts.evalCp, opts.mateIn, mover);

  const parts: string[] = [`The best move is ${bestMoveSan}.`];
  if (why) parts.push(why);
  if (evalText) parts.push(`${evalText.charAt(0).toUpperCase()}${evalText.slice(1)}.`);

  const sources = ['engine:stockfish', 'board:chess.js'];

  return {
    facts: parts.join(' '),
    bestMoveSan,
    bestMoveFromTo: fromTo,
    sources,
  };
}
