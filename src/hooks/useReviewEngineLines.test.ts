import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { StockfishAnalysis, AnalysisLine } from '../types';

// ── Mocks ─────────────────────────────────────────────────────────────────

type QueuedCall = {
  fen: string;
  depth: number;
  resolve: (analysis: StockfishAnalysis) => void;
  reject: (err: Error) => void;
};
const queuedCalls: QueuedCall[] = [];

vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    queueAnalysis: vi.fn((fen: string, depth: number) => {
      return new Promise<StockfishAnalysis>((resolve, reject) => {
        queuedCalls.push({ fen, depth, resolve, reject });
      });
    }),
  },
}));

const auditCalls: { kind: string; summary: string }[] = [];
vi.mock('../services/appAuditor', () => ({
  logAppAudit: vi.fn((entry: { kind: string; summary: string }) => {
    auditCalls.push({ kind: entry.kind, summary: entry.summary });
    return Promise.resolve();
  }),
}));

import { useReviewEngineLines } from './useReviewEngineLines';

beforeEach(() => {
  queuedCalls.length = 0;
  auditCalls.length = 0;
});

// ── Helpers ───────────────────────────────────────────────────────────────

function makeLine(rank: number, moves: string[], evaluation: number): AnalysisLine {
  return { rank, evaluation, moves, mate: null };
}

function makeAnalysis(topLines: AnalysisLine[]): StockfishAnalysis {
  return {
    bestMove: topLines[0]?.moves[0] ?? '',
    evaluation: topLines[0]?.evaluation ?? 0,
    isMate: false,
    mateIn: null,
    depth: 16,
    topLines,
    nodesPerSecond: 0,
  };
}

async function resolveNext(lines: AnalysisLine[]): Promise<void> {
  // Wait a tick for the hook to enqueue the call, then resolve.
  await waitFor(() => expect(queuedCalls.length).toBeGreaterThan(0));
  const next = queuedCalls.shift();
  if (!next) throw new Error('no queued call');
  next.resolve(makeAnalysis(lines));
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useReviewEngineLines', () => {
  it('stays idle when enabled is false', () => {
    const fens = ['fen-0', 'fen-1', 'fen-2'];
    const { result } = renderHook(() => useReviewEngineLines({ fens, enabled: false }));
    expect(result.current.loading).toBe(false);
    expect(queuedCalls.length).toBe(0);
    expect(result.current.linesForPly(0)).toBeUndefined();
  });

  it('kicks off sequential analysis when enabled flips true', async () => {
    const fens = ['fen-0', 'fen-1'];
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useReviewEngineLines({ fens, enabled }),
      { initialProps: { enabled: false } },
    );
    expect(queuedCalls.length).toBe(0);

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.loading).toBe(true));

    // First ply analyzes first.
    await resolveNext([makeLine(1, ['e2e4'], 20)]);
    await waitFor(() => expect(result.current.linesForPly(0)?.length).toBe(1));
    expect(result.current.progress.current).toBe(1);
    expect(result.current.progress.total).toBe(2);

    // Second ply.
    await resolveNext([makeLine(1, ['e7e5'], 0)]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.linesForPly(1)?.length).toBe(1);
    expect(result.current.complete).toBe(true);
  });

  it('caps stored lines at top 3', async () => {
    const fens = ['fen-0'];
    const { result } = renderHook(() => useReviewEngineLines({ fens, enabled: true }));
    await resolveNext([
      makeLine(1, ['a'], 10),
      makeLine(2, ['b'], 5),
      makeLine(3, ['c'], 0),
      makeLine(4, ['d'], -5),
    ]);
    await waitFor(() => expect(result.current.linesForPly(0)?.length).toBe(3));
  });

  it('progresses past a ply whose analysis rejects', async () => {
    const fens = ['fen-0', 'fen-1'];
    const { result } = renderHook(() => useReviewEngineLines({ fens, enabled: true }));

    await waitFor(() => expect(queuedCalls.length).toBeGreaterThan(0));
    queuedCalls.shift()?.reject(new Error('stockfish error'));

    // Should continue to next ply rather than stalling.
    await resolveNext([makeLine(1, ['e2e4'], 0)]);
    await waitFor(() => expect(result.current.linesForPly(1)?.length).toBe(1));
    expect(result.current.linesForPly(0)).toBeUndefined();
    expect(result.current.complete).toBe(true);
  });

  it('resets the cache when fens bundle changes', async () => {
    const fensA = ['a-0', 'a-1'];
    const fensB = ['b-0'];
    const { result, rerender } = renderHook(
      ({ fens }: { fens: string[] }) => useReviewEngineLines({ fens, enabled: true }),
      { initialProps: { fens: fensA } },
    );
    await resolveNext([makeLine(1, ['a'], 0)]);
    await waitFor(() => expect(result.current.linesForPly(0)).toBeDefined());

    rerender({ fens: fensB });
    // Cache should be cleared immediately.
    expect(result.current.linesForPly(0)).toBeUndefined();
    expect(result.current.progress.total).toBe(1);
  });

  it('fires audit kinds for start and complete', async () => {
    const fens = ['fen-0'];
    renderHook(() => useReviewEngineLines({ fens, enabled: true }));
    await waitFor(() =>
      expect(auditCalls.some((c) => c.kind === 'review-engine-lines-analysis-started')).toBe(true),
    );
    await resolveNext([makeLine(1, ['e2e4'], 0)]);
    await waitFor(() =>
      expect(auditCalls.some((c) => c.kind === 'review-engine-lines-analysis-complete')).toBe(true),
    );
  });

  it('does not re-run analysis on toggle-off-then-on when already cached', async () => {
    const fens = ['fen-0'];
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useReviewEngineLines({ fens, enabled }),
      { initialProps: { enabled: true } },
    );
    await resolveNext([makeLine(1, ['e2e4'], 0)]);
    await waitFor(() => expect(result.current.complete).toBe(true));

    // Toggle off.
    rerender({ enabled: false });
    expect(queuedCalls.length).toBe(0);

    // Toggle on — should NOT re-queue analysis since cache is full.
    rerender({ enabled: true });
    // Let any pending effect flush.
    await act(async () => { await Promise.resolve(); });
    expect(queuedCalls.length).toBe(0);
    expect(result.current.linesForPly(0)?.length).toBe(1);
  });
});
