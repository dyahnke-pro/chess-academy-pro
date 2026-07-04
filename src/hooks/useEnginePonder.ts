import { useEffect } from 'react';
import { stockfishEngine } from '../services/stockfishEngine';
import { setCachedStockfish } from './stockfishFenCache';

/**
 * useEnginePonder — pondering on the student's clock (David 2026-07-03: "it
 * should also be running while the user is thinking", "tied into all
 * coach/playing surfaces").
 *
 * While `enabled` is true (it is the student's turn and the live board is
 * showing), analyze the current `fen` in the BACKGROUND and cache the result.
 * When the coach then needs a positional read — the "what's the best move / the
 * plan / the threat" grounding (`buildFedTacticsContext` →
 * `stockfishEngine.analyzeWithBudget(fen, 12, …)`), or the "Read this position"
 * narration — it hits a WARM cache instead of paying a cold search (or, on the
 * slow iOS asm.js engine, timing out and degrading to a FEN-only read).
 *
 * Why this matters: `liveTacticsContext` was designed to reuse "the SAME
 * analysis the surface already runs for its eval bar — no extra round trip." But
 * that only holds if SOMETHING is continuously analysing the current position
 * and caching it. The eval bar is toggle-gated and times out on iOS, so on the
 * phone that cache was usually cold. This hook IS that something, on every
 * playing surface, independent of the eval-bar toggle.
 *
 * Contention: the app runs a SINGLE Stockfish worker (one engine — more would
 * OOM / CPU-starve the iPhone), and `analyzePosition` cancels any in-flight
 * search. So this ponder YIELDS: it debounces (letting any live
 * narration/eval analysis finish first) and skips entirely when the engine is
 * busy, so it can never clobber a real, user-driven request. It's best-effort —
 * when it can't run, the on-demand grounding path still works, just cold.
 *
 * Depth 12 matches `buildFedTacticsContext`'s `analyzeWithBudget(fen, 12, …)` so
 * the engine cache (keyed by fen+depth) is an EXACT hit for the brain's
 * grounding; the fen-cache seed (depth-agnostic) covers the narration hooks.
 */

const PONDER_DEPTH = 12;
/** Bound the background hold on the (slow, on iOS) engine — returns best-so-far
 *  and caches it. Generous because desktop resolves on depth well before it. */
const PONDER_BUDGET_MS = 2500;
/** Let any live narration/eval analysis that fired on the turn change settle
 *  before we ponder, so the ponder rarely collides with a real request. */
const PONDER_DEBOUNCE_MS = 1000;

export function useEnginePonder(
  fen: string | null | undefined,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled || !fen) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      // Yield to real requests: if the engine is mid-search (a live
      // narration/eval), skip this cycle rather than cancel it.
      if (cancelled || stockfishEngine.isBusy()) return;
      void stockfishEngine
        .analyzeWithBudget(fen, PONDER_DEPTH, PONDER_BUDGET_MS)
        .then((analysis) => {
          if (!cancelled) setCachedStockfish(fen, analysis);
        })
        .catch(() => {
          // A ponder that fails while the engine is NOT busy means the (iOS
          // WebKit) worker died — memory/backgrounding, transient (the asm
          // engine analyzes fine on a fresh worker; David 2026-07-04 node
          // repro). Ponder runs every turn on the student's clock, so make it
          // the HEALER: respawn the dead worker now so the next ponder + the
          // grounding path (calc/narration) hit a LIVE engine instead of a cold
          // timeout. Guarded on !isBusy so we never clobber a foreground search.
          if (!cancelled && !stockfishEngine.isBusy()) {
            stockfishEngine.forceRestart('ponder detected a dead worker');
          }
        });
    }, PONDER_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fen, enabled]);
}
