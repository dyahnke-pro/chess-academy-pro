/**
 * enginePlanContext
 * -----------------
 * Builds the `LiveState.enginePlan` block for PLAN / STRATEGY coach turns.
 *
 * David 2026-06-05: "use stockfish for the next three moves — more
 * reliable." A plan answer's MOVE backbone should be the engine's best
 * line (real, legal, chess.js-validated) instead of the LLM free-
 * synthesizing moves it might hallucinate. We PRE-INJECT it (rather than
 * relying on the brain to call `stockfish_eval`, which it skipped
 * intermittently) so the plan moves are reliably grounded.
 *
 * A Stockfish PV is best-play-by-BOTH-sides — a forcing line, not a plan —
 * so the envelope's renderer instructs the brain to anchor the student's
 * NEXT move on it, teach the idea, and frame later plies as contingent on
 * the opponent's reply. This helper just supplies the verified moves +
 * eval; the framing lives in `formatEnginePlanSubBlock` (envelope.ts).
 */
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { getCachedStockfish } from '../hooks/stockfishFenCache';
import type { StockfishAnalysis } from '../types';
import type { LiveState } from '../coach/types';

/** Search depth for the plan PV. Deep enough for a meaningful line, shallow
 *  enough to return within ~1-2s so the plan answer isn't sluggish. */
const PLAN_DEPTH = 18;
/** How many plies of the PV to surface (≈ "three moves" each side). */
const PLAN_PLIES = 6;

type EnginePlan = NonNullable<LiveState['enginePlan']>;

/**
 * Run Stockfish on `fen` and return the engine plan (PV in SAN + eval),
 * or `null` when the engine is unavailable / returns nothing / the FEN is
 * bad. Never throws — a missing plan just means the brain falls back to
 * master-play + DB grounding (with the planQuestion bare-SAN exemption).
 */
export async function buildEnginePlan(
  fen: string,
  studentSide: 'white' | 'black',
): Promise<EnginePlan | null> {
  // PREFER the eval-bar's CACHED analysis for this exact FEN (David 2026-07-10:
  // "I'm getting two best moves … not the most accurate read"). The eval bar +
  // child-position prefetch populate `stockfishFenCache` continuously, so the
  // cache holds the SAME deep analysis the board is showing. Building the plan
  // from it means the coach's best move MATCHES the displayed eval bar — one
  // source of truth, no conflicting second best move — and it's instant. Only
  // when the cache is empty/thin (a position the eval bar hasn't reached) do we
  // run a fresh search. On a slow single-threaded engine a redundant fresh
  // depth-18 search was returning a DIFFERENT (shallower) move than the cache —
  // that was the "two best moves" bug.
  const hasLine = (a: StockfishAnalysis | undefined): boolean =>
    !!a && (!!a.topLines?.[0]?.moves?.length || !!a.bestMove);
  let analysis: StockfishAnalysis | undefined = getCachedStockfish(fen);
  if (!hasLine(analysis)) {
    try {
      analysis = await stockfishEngine.analyzePosition(fen, PLAN_DEPTH);
    } catch {
      analysis = undefined;
    }
  }
  if (!analysis) return null;
  const uciSeq =
    analysis.topLines?.[0]?.moves?.length
      ? analysis.topLines[0].moves
      : analysis.bestMove
        ? [analysis.bestMove]
        : [];
  if (uciSeq.length === 0) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const pvSan: string[] = [];
  for (const uci of uciSeq) {
    if (pvSan.length >= PLAN_PLIES) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const mv = chess.move({ from: from as Square, to: to as Square, promotion });
      if (!mv) break;
      pvSan.push(mv.san);
    } catch {
      break; // PV move illegal from this position — stop the line cleanly.
    }
  }
  if (pvSan.length === 0) return null;

  return {
    pvSan,
    bestMoveUci: uciSeq[0],
    evalCp: analysis.isMate ? null : Math.round(analysis.evaluation),
    mateIn: analysis.mateIn,
    depth: analysis.depth,
    studentSide,
  };
}

/**
 * buildCandidateEval — Stockfish eval of the position AFTER a NAMED candidate
 * move (David 2026-07-10: "evaluate the OTHER moves against database and
 * stockfish"). Applies `candidateSan` to `fen` (chess.js is the legality
 * truth), then evals the resulting position — CACHE-FIRST (the eval bar +
 * child-position prefetch usually already hold it), else a fresh depth-18
 * search. Returns WHITE-PERSPECTIVE `{ evalCp, mateIn }` (same convention as
 * the eval-bar snapshot; the dispatch flips to side-to-move POV), or null when
 * the move is illegal / the engine is unavailable. Never throws.
 */
export async function buildCandidateEval(
  fen: string,
  candidateSan: string,
): Promise<{ evalCp: number | null; mateIn: number | null } | null> {
  let after: Chess;
  try {
    after = new Chess(fen);
    const mv = after.move(candidateSan);
    if (!mv) return null; // illegal — caller answers "not legal" from the SAN
  } catch {
    return null;
  }
  const afterFen = after.fen();
  const hasEval = (a: StockfishAnalysis | undefined): boolean =>
    !!a && (typeof a.evaluation === 'number' || a.isMate);
  let analysis: StockfishAnalysis | undefined = getCachedStockfish(afterFen);
  if (!hasEval(analysis)) {
    try {
      analysis = await stockfishEngine.analyzePosition(afterFen, PLAN_DEPTH);
    } catch {
      analysis = undefined;
    }
  }
  if (!analysis) return null;
  return {
    evalCp: analysis.isMate ? null : Math.round(analysis.evaluation),
    mateIn: analysis.isMate ? analysis.mateIn : null,
  };
}
