/**
 * Force-grounding fetcher — pulls Stockfish + Lichess data for a FEN
 * BEFORE the LLM sees the question, so the spine can inject the result
 * into the envelope as `groundingContext`. The LLM then physically
 * receives engine + opening data alongside the question and cannot
 * answer evaluation-flavored questions without it being in context.
 *
 * The fetcher is dependency-injectable via `CoachServiceOptions
 * .groundingFetcher` so tests don't have to instantiate the Stockfish
 * worker or hit the Lichess API. The default implementation lazy-imports
 * the real services so the spine stays cheap to import (and so the
 * Stockfish worker doesn't try to instantiate during test setup unless
 * a test explicitly exercises the grounding path).
 *
 * Failure mode contract: if either fetcher throws or returns null, the
 * spine still ships the envelope with whatever it got. Partial context
 * ("Engine analysis: unavailable. Opening database: <result>") is
 * always preferable to dropping the call — the LLM at least knows what
 * data is missing rather than answering as if the question were
 * unanswerable. WO-MANDATORY-GROUNDING.
 */

export interface GroundingFetcher {
  /** Returns a stringified Stockfish eval summary, or null on failure. */
  stockfishEval(fen: string, depth?: number): Promise<string | null>;
  /** Returns a stringified Lichess explorer summary, or null on failure. */
  lichessOpeningLookup(fen: string): Promise<string | null>;
}

export const defaultGroundingFetcher: GroundingFetcher = {
  async stockfishEval(fen: string, depth: number = 12): Promise<string | null> {
    try {
      const { stockfishEngine } = await import('../../services/stockfishEngine');
      const result = await stockfishEngine.queueAnalysis(fen, depth);
      return JSON.stringify({
        bestMove: result.bestMove,
        evaluation: result.evaluation,
        isMate: result.isMate,
        mateIn: result.mateIn,
        depth: result.depth,
        // Cap at top 3 lines to keep the envelope tight.
        topLines: result.topLines.slice(0, 3).map((l) => ({
          rank: l.rank,
          evaluation: l.evaluation,
          mate: l.mate,
          moves: l.moves.slice(0, 6),
        })),
      });
    } catch {
      return null;
    }
  },

  async lichessOpeningLookup(fen: string): Promise<string | null> {
    try {
      const { fetchLichessExplorer } = await import('../../services/lichessExplorerService');
      const result = await fetchLichessExplorer(fen);
      // Pull the structurally relevant fields. The full explorer
      // payload is large; the LLM only needs the opening name + ECO,
      // and the top few moves with frequency for grounding popularity
      // claims.
      return JSON.stringify({
        opening: result.opening
          ? { eco: result.opening.eco, name: result.opening.name }
          : null,
        moves: (result.moves ?? []).slice(0, 5).map((m) => ({
          uci: m.uci,
          san: m.san,
          white: m.white,
          draws: m.draws,
          black: m.black,
          averageRating: m.averageRating,
        })),
      });
    } catch {
      return null;
    }
  },
};

/** Format a stockfish + lichess pair into the system-prompt block the
 *  provider prepends. Both args may be `null` (fetcher failure) — the
 *  formatter emits explicit "unavailable" markers so the LLM knows what
 *  data is missing rather than answering as if it had everything. */
export function formatGroundingContext(args: {
  stockfish: string | null;
  lichess: string | null;
}): string {
  const lines: string[] = ['[Engine grounding — already computed for this position]'];
  lines.push(
    `Engine analysis: ${args.stockfish ?? 'unavailable'}`,
  );
  lines.push(
    `Opening database: ${args.lichess ?? 'unavailable'}`,
  );
  return lines.join('\n');
}
