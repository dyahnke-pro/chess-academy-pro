/**
 * positionTrapScan
 * ----------------
 * The runtime "trap mining" tool — the same engine-first scan the opening
 * tab / `/coach/play` uses, factored out so EVERY coach surface can share
 * the literal same code (David 2026-06-16: "the same trap mining tool we
 * used in our opening tab").
 *
 * A trap-shaped position is one where a POPULAR move (≥40 Lichess games at
 * recreational ratings) is actually LOSING by the engine's count (≤ −200cp
 * for the mover). That's the signature of a trap: natural-looking, played
 * often, but concretely refuted. `detectTrapInPosition` (openingTrapDetector)
 * owns the decision; this module owns the data-gathering that feeds it —
 * the Lichess explorer at the position + a per-candidate cloud-eval on each
 * popular move's RESULTING position.
 *
 * Output is a `TrapSignal | null` that callers thread into the GROUNDED
 * HANDOFF (G0): code decides the trap, the LLM only voices it via
 * `formatTrapForPrompt`. Never let the LLM invent a trap.
 */
import { fetchLichessExplorer, fetchCloudEval } from './lichessExplorerService';
import {
  detectTrapInPosition,
  type TrapSignal,
  type MoveEvaluation,
} from './openingTrapDetector';
import type { LichessExplorerResult } from '../types';

/** Hard cap on any single Lichess fetch so a slow/hung request can't stall
 *  the coach's reply. Matches the value the play surface used. */
const LICHESS_FETCH_TIMEOUT_MS = 2500;

/** Max Lichess cloud-eval requests in flight at once. 2-at-a-time keeps
 *  latency reasonable without bursting the free public endpoint into a 429. */
const LICHESS_CLOUD_EVAL_CONCURRENCY = 2;

/** Default number of top explorer moves to engine-check for a trap. */
const DEFAULT_TOP_N = 5;

function withFetchTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('fetch timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/**
 * Cloud-eval each candidate SAN on its OWN resulting position so the
 * detector gets a correct per-move eval (the prior index-paired approach
 * read the wrong eval for the wrong move). Eval is normalised to the
 * MOVER's POV: negative = the mover lost ground. Missing cloud evals (404)
 * are skipped, never misattributed.
 */
export async function evaluateExplorerCandidates(
  fen: string,
  sanList: string[],
  mover: 'w' | 'b',
): Promise<MoveEvaluation[]> {
  const ChessCtor = (await import('chess.js')).Chess;

  const evalOne = async (san: string): Promise<MoveEvaluation | null> => {
    try {
      const board = new ChessCtor(fen);
      const moved = board.move(san);
      if (!moved) return null;
      const resultingFen = board.fen();
      const eval_ = await withFetchTimeout(
        fetchCloudEval(resultingFen, 1),
        LICHESS_FETCH_TIMEOUT_MS,
      );
      if (!eval_ || !eval_.pvs || eval_.pvs.length === 0) return null;
      // cloud-eval cp is from WHITE's POV. Flip for black movers so the
      // detector gets a "this was good/bad for the MOVER" number.
      const cpWhitePov = eval_.pvs[0].cp ?? 0;
      const evalCp = mover === 'w' ? cpWhitePov : -cpWhitePov;
      return { san, evalCp };
    } catch {
      return null;
    }
  };

  // Chunked Promise.all — process LICHESS_CLOUD_EVAL_CONCURRENCY at a time
  // to cap outbound request bursts against the free Lichess API.
  const results: (MoveEvaluation | null)[] = [];
  for (let i = 0; i < sanList.length; i += LICHESS_CLOUD_EVAL_CONCURRENCY) {
    const chunk = sanList.slice(i, i + LICHESS_CLOUD_EVAL_CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(evalOne));
    results.push(...chunkResults);
  }
  return results.filter((r): r is MoveEvaluation => r !== null);
}

export interface ScanPositionForTrapArgs {
  /** The position to scan. */
  fen: string;
  /** Side to move — the trap is a popular-but-losing move BY this side. */
  mover: 'w' | 'b';
  /** Pre-fetched explorer at `fen`. Pass it when the caller already fetched
   *  the explorer (e.g. `/coach/play` builds a top-moves note from it too)
   *  so we don't double-fetch. Omit to let the scan fetch it itself. */
  explorer?: LichessExplorerResult | null;
  /** Engine best move (SAN) — used as the refutation hint when a trap fires. */
  engineBestSan?: string;
  /** Legal SAN moves in `fen`. Gates explorer candidates so an explorer/FEN
   *  drift can't surface a trap for a move that isn't playable right now. */
  legalSan?: string[];
  /** How many top explorer moves to engine-check (default 5). */
  topN?: number;
}

/**
 * The full position trap scan: (optionally fetch) the explorer at `fen`,
 * engine-check its most popular moves, and return the worst popular-but-
 * losing one as a `TrapSignal` — or `null` when the position has no explorer
 * coverage or no popular move qualifies (correctly silent off-book, G3).
 */
export async function scanPositionForTrap(
  args: ScanPositionForTrapArgs,
): Promise<TrapSignal | null> {
  let explorer = args.explorer ?? null;
  if (!explorer) {
    explorer = await withFetchTimeout(
      fetchLichessExplorer(args.fen, 'lichess'),
      LICHESS_FETCH_TIMEOUT_MS,
    ).catch(() => null);
  }
  if (!explorer || !explorer.moves || explorer.moves.length === 0) return null;

  const topSans = explorer.moves
    .slice(0, args.topN ?? DEFAULT_TOP_N)
    .map((m) => m.san);
  const evaluations = await evaluateExplorerCandidates(
    args.fen,
    topSans,
    args.mover,
  );
  if (evaluations.length === 0) return null;

  return detectTrapInPosition({
    explorer,
    evaluations,
    engineBestSan: args.engineBestSan,
    legalSan: args.legalSan,
  });
}
