/**
 * Smoke tests for useTeachWalkthrough — verifies the state machine
 * transitions correctly on a small synthetic tree. Voice is mocked
 * (we can't await real Polly in unit tests) and resolves immediately
 * so transitions fire without timing flakiness.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { WalkthroughTree } from '../types/walkthroughTree';

vi.mock('../services/voiceService', () => ({
  voiceService: {
    speakForced: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../services/appAuditor', () => ({
  logAppAudit: vi.fn(),
}));

import { useTeachWalkthrough } from './useTeachWalkthrough';

// Synthetic tree:
//   root → 1.e4 → 1...e5 → FORK { 2.Nc3 → leaf , 2.Nf3 → leaf }
const SMOKE_TREE: WalkthroughTree = {
  openingName: 'Smoke',
  eco: 'Z00',
  intro: 'intro line',
  outro: 'outro line',
  root: {
    san: null,
    movedBy: null,
    idea: '',
    children: [
      {
        node: {
          san: 'e4',
          movedBy: 'white',
          idea: 'one e4',
          children: [
            {
              node: {
                san: 'e5',
                movedBy: 'black',
                idea: 'one e5',
                children: [
                  {
                    label: '2.Nc3',
                    forkSubtitle: 'vienna',
                    node: { san: 'Nc3', movedBy: 'white', idea: 'two nc3', children: [] },
                  },
                  {
                    label: '2.Nf3',
                    forkSubtitle: 'italian/spanish',
                    node: { san: 'Nf3', movedBy: 'white', idea: 'two nf3', children: [] },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
};

describe('useTeachWalkthrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useTeachWalkthrough());
    expect(result.current.phase).toBe('idle');
    expect(result.current.isActive).toBe(false);
  });

  it('advances through linear moves and pauses at the first fork', async () => {
    const { result } = renderHook(() => useTeachWalkthrough());
    act(() => {
      result.current.start(SMOKE_TREE);
    });
    // Wait for: intro narration → root → e4 narration → e5 narration → fork.
    // Each narration calls speakForced which resolves immediately
    // (mocked), then a 400ms post-buffer fires.
    await waitFor(
      () => {
        expect(result.current.phase).toBe('fork');
      },
      { timeout: 5000 },
    );
    expect(result.current.forkOptions.length).toBe(2);
    expect(result.current.forkOptions[0].label).toBe('2.Nc3');
    expect(result.current.forkOptions[1].label).toBe('2.Nf3');
    // FEN should be the position after 1.e4 e5.
    expect(result.current.fen).toContain('rnbqkbnr/pppp1ppp/8/4p3/4P3/');
  });

  it('picking a fork advances down the chosen branch and lands on a leaf', async () => {
    const { result } = renderHook(() => useTeachWalkthrough());
    act(() => {
      result.current.start(SMOKE_TREE);
    });
    await waitFor(() => expect(result.current.phase).toBe('fork'), { timeout: 5000 });
    act(() => {
      result.current.pickFork(0); // 2.Nc3 — Vienna
    });
    await waitFor(() => expect(result.current.phase).toBe('leaf'), { timeout: 5000 });
    expect(result.current.pathSans).toEqual(['e4', 'e5', 'Nc3']);
    expect(result.current.canBacktrack).toBe(true);
    expect(result.current.leafOutro).toBe('outro line');
  });

  it('backtrackToLastFork restores the fork phase and trims the path', async () => {
    const { result } = renderHook(() => useTeachWalkthrough());
    act(() => result.current.start(SMOKE_TREE));
    await waitFor(() => expect(result.current.phase).toBe('fork'), { timeout: 5000 });
    act(() => result.current.pickFork(0));
    await waitFor(() => expect(result.current.phase).toBe('leaf'), { timeout: 5000 });
    act(() => result.current.backtrackToLastFork());
    expect(result.current.phase).toBe('fork');
    expect(result.current.pathSans).toEqual(['e4', 'e5']);
  });

  it('stop returns to idle and clears the tree', async () => {
    const { result } = renderHook(() => useTeachWalkthrough());
    act(() => result.current.start(SMOKE_TREE));
    await waitFor(() => expect(result.current.isActive).toBe(true), { timeout: 5000 });
    act(() => result.current.stop());
    expect(result.current.phase).toBe('idle');
    expect(result.current.tree).toBeNull();
    expect(result.current.currentNode).toBeNull();
  });

  it('pause stops voice and freezes phase at "paused"; resume re-narrates', async () => {
    const { result } = renderHook(() => useTeachWalkthrough());
    act(() => result.current.start(SMOKE_TREE));
    await waitFor(() => expect(result.current.phase).toBe('fork'), { timeout: 5000 });
    act(() => result.current.pickFork(1));
    // We may be in 'narrating' or already 'leaf' depending on timing —
    // pause from either state should land on 'paused'.
    act(() => result.current.pause());
    expect(result.current.phase).toBe('paused');
    act(() => result.current.resume());
    // After resume, we re-narrate; phase becomes 'narrating' then
    // either 'leaf' (since Nf3 has no children).
    await waitFor(
      () => expect(['narrating', 'leaf']).toContain(result.current.phase),
      { timeout: 5000 },
    );
  });
});
