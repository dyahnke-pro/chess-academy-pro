import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { stockfishEngine } from '../services/stockfishEngine';
import { logAppAudit } from '../services/appAuditor';
import type { AnalysisLine } from '../types';

/**
 * WO-REVIEW-02b — Engine lines on the review screen.
 *
 * Sequentially analyzes every position in the review (one per ply,
 * including the starting position) via Stockfish MultiPV, caches the
 * top lines per ply, and exposes progress so the UI can show a
 * "Analyzing 4 / 40" banner while candidates fill in.
 *
 * Analysis is off by default — the caller flips `enabled` once the
 * user taps "Show engine lines." Once enabled for a given bundle of
 * `fens`, the hook runs to completion; subsequent enable/disable
 * toggles just show/hide the already-cached data. A new `fens`
 * array (e.g. the user opened a different review) resets the cache.
 */
export interface UseReviewEngineLinesArgs {
  /** FEN per viewable position, ply-indexed: `fens[0]` = starting
   *  position, `fens[n]` = position after the n-th ply. When null,
   *  the hook stays idle. */
  fens: string[] | null;
  /** When true, the hook kicks off sequential MultiPV analysis over
   *  every `fens[i]` that isn't already cached. */
  enabled: boolean;
  /** Stockfish depth per ply. Defaults to 16 — good balance between
   *  line quality and total analysis time for 30-60 ply games. */
  depth?: number;
}

export interface EngineLinesProgress {
  current: number;
  total: number;
}

export interface UseReviewEngineLinesResult {
  /** Per-ply top lines (rank-sorted). `undefined` = not yet analyzed. */
  linesForPly: (ply: number) => AnalysisLine[] | undefined;
  /** True while the batched analysis is in-flight. */
  loading: boolean;
  /** {current, total} progress — updated as each ply finishes. */
  progress: EngineLinesProgress;
  /** True when every ply in `fens` has been analyzed. */
  complete: boolean;
}

export function useReviewEngineLines(
  args: UseReviewEngineLinesArgs,
): UseReviewEngineLinesResult {
  const { fens, enabled, depth = 16 } = args;
  const [cache, setCache] = useState<Map<number, AnalysisLine[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<EngineLinesProgress>({ current: 0, total: 0 });
  const runTokenRef = useRef(0);
  const lastFensRef = useRef<string[] | null>(null);
  const analyzedPliesRef = useRef<Set<number>>(new Set());

  // Reset cache when the fens bundle changes (different review opened).
  useEffect(() => {
    const prev = lastFensRef.current;
    const changed = !prev
      || !fens
      || prev.length !== fens.length
      || prev.some((f, i) => f !== fens[i]);
    if (!changed) return;
    lastFensRef.current = fens;
    runTokenRef.current += 1;
    analyzedPliesRef.current = new Set();
    setCache(new Map());
    setLoading(false);
    setProgress({ current: 0, total: fens?.length ?? 0 });
  }, [fens]);

  // Drive the sequential analysis when enabled flips on. Intentionally
  // does NOT depend on `cache` — we track which plies have run via
  // `analyzedPliesRef` so completing one ply doesn't re-trigger the
  // effect and cancel our own in-flight loop.
  useEffect(() => {
    if (!enabled || !fens || fens.length === 0) return;
    const pending = fens.map((_, i) => i).filter((i) => !analyzedPliesRef.current.has(i));
    if (pending.length === 0) return;

    runTokenRef.current += 1;
    const token = runTokenRef.current;
    setLoading(true);
    setProgress({ current: analyzedPliesRef.current.size, total: fens.length });
    void logAppAudit({
      kind: 'review-engine-lines-analysis-started',
      category: 'subsystem',
      source: 'useReviewEngineLines',
      summary: `plies=${fens.length} depth=${depth} pending=${pending.length}`,
    });

    void (async () => {
      for (const i of pending) {
        if (token !== runTokenRef.current) return;
        const fen = fens[i];
        try {
          const analysis = await stockfishEngine.queueAnalysis(fen, depth);
          if (token !== runTokenRef.current) return;
          const lines = analysis.topLines.slice(0, 3);
          analyzedPliesRef.current.add(i);
          setCache((prev) => {
            const next = new Map(prev);
            next.set(i, lines);
            return next;
          });
          setProgress({ current: analyzedPliesRef.current.size, total: fens.length });
        } catch {
          // Skip failures — progress continues, this ply just has no lines.
          analyzedPliesRef.current.add(i);
          setProgress({ current: analyzedPliesRef.current.size, total: fens.length });
        }
      }
      if (token !== runTokenRef.current) return;
      setLoading(false);
      void logAppAudit({
        kind: 'review-engine-lines-analysis-complete',
        category: 'subsystem',
        source: 'useReviewEngineLines',
        summary: `plies=${fens.length} depth=${depth}`,
      });
    })();
  }, [enabled, fens, depth]);

  const linesForPly = useCallback((ply: number): AnalysisLine[] | undefined => {
    return cache.get(ply);
  }, [cache]);

  const complete = useMemo(() => {
    return !!fens && fens.length > 0 && progress.current >= fens.length;
  }, [fens, progress]);

  return { linesForPly, loading, progress, complete };
}
