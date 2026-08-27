// whyBestMove — the COMPUTED answer for the "Why?" button (Phase 8, David
// 2026-08-26: "route the new computed voice — the 4-layer package — into it so
// 'why?' answers in Danya's voice, not a generic prompt"). G0: the board and
// the engine decide WHAT is true; this only phrases it. No LLM round-trip, no
// generic English question handed to the model to answer from scratch.
//
// Two computed sources, composed:
//   1. explainBestMoveGrounded — the concrete POINT of the strongest move
//      (fork / pin / mate / check / material), read off the board.
//   2. computePositionFacts — the position briefing (who's winning, the plan,
//      what must be defended, the real fork in the road) in the house register.
// The result is spoken directly (preferRaw) — the purest G0, and instant.
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import { explainBestMoveGrounded } from './groundedAnswer';
import { computePositionFacts, clauseText } from './positionFacts';

export interface WhyBestMoveInput {
  fen: string;
  /** The side to move — the student who tapped "Why?". */
  studentColor: 'white' | 'black';
  /** The warm eval-bar read for this FEN (bestMove + topLines + eval). */
  analysis: Pick<StockfishAnalysis, 'topLines' | 'evaluation' | 'isMate' | 'mateIn' | 'seldepth' | 'depth' | 'wdl' | 'bestMove'>;
  rating?: number;
  /** Prior ply's eval (White POV) for the STATUS band-change line, if known. */
  prevEvalCpWhitePov?: number;
}

function bestSan(fen: string, uci: string | null): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion });
    return mv ? mv.san : null;
  } catch { return null; }
}

/**
 * A board-true, spoken-ready answer to "why is the best move best, and why are
 * the alternatives worse?" — composed entirely from computed facts. Returns ''
 * when nothing concrete is computable (silence beats a generic guess).
 */
export async function computeWhyBestMove(input: WhyBestMoveInput): Promise<string> {
  const { fen, studentColor, analysis } = input;
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const uci: string | null = analysis.bestMove && analysis.bestMove.length >= 4 ? analysis.bestMove : null;
  const san = bestSan(fen, uci);

  // 1. The concrete point of the strongest move (the engine-reasoning form).
  const point = explainBestMoveGrounded(fen, null, uci, studentColor); // "it forks the king and rook" | null
  const parts: string[] = [];
  if (san) {
    parts.push(point ? `The strongest move is ${san} — ${point}.` : `The strongest move is ${san}.`);
  }

  // 2. The position briefing — the plan + what's at stake + the real fork in the
  //    road (why the natural alternatives fall short). Exclude the interface-y /
  //    convert clauses; keep the teaching ones.
  try {
    const pf = await computePositionFacts({
      fen,
      moverColor: sc,
      studentColor: sc,
      analysis,
      rating: input.rating ?? 1500,
      ...(input.prevEvalCpWhitePov != null ? { prevEvalCpWhitePov: input.prevEvalCpWhitePov } : {}),
    });
    const briefing = clauseText(pf.clauses, ['key-moment', 'convert']);
    for (const line of briefing) if (line && !parts.some((p) => p.includes(line))) parts.push(line);
  } catch { /* engine/board facts unavailable — the best-move point still stands */ }

  return parts.join(' ').trim();
}
