import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiscussionPractice } from './useDiscussionPractice';

// Stockfish: a clear eval drop (white was +3, the move drops to -2 → cpLoss 500).
vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(async (fen: string) => ({
      evaluation: fen.includes(' w ') ? 300 : -200, // before (white to move) high, after low
      bestMove: 'e1e2',
      isMate: false,
      mateIn: null,
      depth: 12,
      topLines: [],
    })),
  },
}));
vi.mock('../services/masterPlayLookup', () => ({ lookupMasterPlay: vi.fn(async () => null) }));
vi.mock('../services/explorerTranslate', () => ({ describeTopMasterMove: vi.fn(() => undefined) }));

// Keep the pure slip logic real; mock only the LLM-backed capture.
vi.mock('../services/discussionPractice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/discussionPractice')>();
  return { ...actual, captureMisconception: vi.fn(async () => ({ classification: { tag: 'overvalued-attack', coachNote: 'x' }, coachNote: 'x', logged: true })) };
});
vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn(async () => {}) }));

import { captureMisconception } from '../services/discussionPractice';
import { logAppAudit } from '../services/appAuditor';

const mockedCapture = vi.mocked(captureMisconception);
const mockedAudit = vi.mocked(logAppAudit);

// White-to-move FEN so the analyzePosition mock returns the "before" eval.
const FEN_BEFORE = '4k3/3p4/8/8/8/8/4Q3/4K3 w - - 0 1';
const FEN_AFTER = '4k3/3p4/8/8/4Q3/8/8/4K3 b - - 1 1';

const SLIP_ARGS = {
  fenBefore: FEN_BEFORE,
  fenAfter: FEN_AFTER,
  playedSan: 'Qe6',
  playerColor: 'white' as const,
  inBook: false,
  learned: true,
  gamePhase: 'middlegame' as const,
  moveNumber: 1,
  openingName: 'Ruy Lopez',
};

beforeEach(() => {
  mockedCapture.mockClear();
  mockedAudit.mockClear();
});

describe('useDiscussionPractice — silent mode (the /coach/teach + Practice faucet)', () => {
  it('feeds the bucket on a slip WITHOUT raising the prompt', async () => {
    const { result } = renderHook(() => useDiscussionPractice(true, { silent: true, surface: 'coach-teach' }));

    await act(async () => { await result.current.evaluatePlayerMove(SLIP_ARGS); });

    // The slip was detected + captured straight to the bucket...
    expect(mockedCapture).toHaveBeenCalledOnce();
    expect(mockedCapture.mock.calls[0][0].shouldCount).toBe(true);
    expect(mockedCapture.mock.calls[0][0].source).toBe('discussion-practice');
    // ...with NO userReason (passive capture)...
    expect(mockedCapture.mock.calls[0][0].classifyInput.userReason).toBeUndefined();
    // ...and the prompt UI never engaged (silent contract).
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
  });

  it('fires the faucet-slip-detected audit tagged with the surface', async () => {
    const { result } = renderHook(() => useDiscussionPractice(true, { silent: true, surface: 'opening-practice' }));
    await act(async () => { await result.current.evaluatePlayerMove(SLIP_ARGS); });

    const slipAudit = mockedAudit.mock.calls.find((c) => c[0].kind === 'faucet-slip-detected');
    expect(slipAudit).toBeDefined();
    expect(slipAudit?.[0].source).toContain('opening-practice');
    expect(slipAudit?.[0].summary).toContain('silent=true');
  });
});

describe('useDiscussionPractice — prompt mode (the /coach/play faucet)', () => {
  it('raises the why-prompt and does NOT auto-capture until answered', async () => {
    const { result } = renderHook(() => useDiscussionPractice(true));
    await act(async () => { await result.current.evaluatePlayerMove(SLIP_ARGS); });

    expect(result.current.phase).toBe('asking');
    expect(result.current.prompt?.playedSan).toBe('Qe6');
    // Prompt mode waits for the student's answer — no silent bucket write.
    expect(mockedCapture).not.toHaveBeenCalled();

    // Answering routes through captureMisconception with the reason.
    await act(async () => { await result.current.submitReason('I wanted to attack'); });
    expect(mockedCapture).toHaveBeenCalledOnce();
    expect(mockedCapture.mock.calls[0][0].classifyInput.userReason).toBe('I wanted to attack');
  });

  it('stays silent when disabled', async () => {
    const { result } = renderHook(() => useDiscussionPractice(false, { silent: true }));
    await act(async () => { await result.current.evaluatePlayerMove(SLIP_ARGS); });
    expect(mockedCapture).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });
});
