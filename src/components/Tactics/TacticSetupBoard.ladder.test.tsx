/**
 * The Setup Trainer's hint LADDER and its RECORD (hand walk 2026-10-03).
 *
 *  - One tap used to hand over the whole answer ("Your bishop to c5 — pins the
 *    queen…" + arrow). Now: tap 1 = the idea (no piece, no square), tap 2 = the
 *    piece (its square lit, no destination), tap 3 = the shared answer tier.
 *  - The board wrote nothing to the student model. Its first answer now lands
 *    a capability row through the SAME door PuzzleBoard uses, origin 'puzzle',
 *    and any hint tier or Show Solution before it marks it PROMPTED.
 *
 * Real fake-indexeddb store, real capabilityEvidence, real narration text.
 * The factory puzzle (1.e4, White to play Nf3) is a position the evidence
 * computer is known to POSE a capability on, so an empty store is a real fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '../../test/utils';
import { db } from '../../db/schema';
import { TacticSetupBoard } from './TacticSetupBoard';
import { buildSetupPuzzle, buildMoveResult, resetFactoryCounter } from '../../test/factories';
import type { MoveResult } from '../../hooks/useChessGame';

const mockSpeak = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return {
    voiceService: buildVoiceServiceMock({
      speak: vi.fn((...args: unknown[]) => mockSpeak(...args) as Promise<void>),
    }),
  };
});

// Stable identities — a fresh object per render re-fires effects.
const stableHintState = { level: 0, arrows: [], nudgeText: null, ghostMove: null, isAnalyzing: false, hintsUsed: 0, resolvedBestMove: null };
const stableRequestHint = vi.fn();
const stableResetHints = vi.fn();
vi.mock('../../hooks/useHintSystem', () => ({
  useHintSystem: () => ({ hintState: stableHintState, requestHint: stableRequestHint, resetHints: stableResetHints }),
}));

let refuteKind: 'material' | 'not-best' | null = 'material';
const stableRefute = vi.fn(async () => (refuteKind
  ? { kind: refuteKind, text: 'They take back.', fenAfter: '', uci: [], arrows: [] }
  : null));
const stableWrongTry = { text: null, arrows: [], refute: stableRefute, clearArrows: vi.fn(), clear: vi.fn() };
vi.mock('../../hooks/useWrongTryRefutation', () => ({
  useWrongTryRefutation: () => stableWrongTry,
}));

const mockSettings = { showHints: true };
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({ settings: mockSettings, updateSetting: vi.fn() }),
}));

let latestOnMove: ((m: MoveResult) => void) | null = null;
let latestHighlights: Array<{ square: string; color: string }> | undefined;
vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: (props: { onMove: (m: MoveResult) => void; annotationHighlights?: Array<{ square: string; color: string }> }) => {
    latestOnMove = props.onMove;
    latestHighlights = props.annotationHighlights;
    return <div data-testid="mock-board" />;
  },
}));

const settle = async (ms = 250): Promise<void> => {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)); });
};

const NF3 = buildMoveResult({ from: 'g1', to: 'f3', san: 'Nf3' });
// A wrong DEVELOPING try: the evidence computer poses development on it, so a
// broken row is a real write, not an empty store.
const WRONG = buildMoveResult({ from: 'b1', to: 'c3', san: 'Nc3' });

describe('TacticSetupBoard — graduated hint ladder', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFactoryCounter();
    latestOnMove = null;
    latestHighlights = undefined;
    refuteKind = 'material';
    await db.delete();
    await db.open();
  });

  it('tap 1 = the idea only, tap 2 = the piece, tap 3 = the shared answer tier', async () => {
    const puzzle = buildSetupPuzzle(); // 1.e4, White's quiet move is Nf3
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={vi.fn()} />);

    // Tier 1 — the motif and what to look for; no piece, no square, no arrow.
    fireEvent.click(screen.getByTestId('hint-button'));
    const t1 = screen.getByTestId('hint-nudge').textContent;
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '1');
    expect(t1.toLowerCase()).toContain('fork');
    expect(t1).not.toMatch(/[a-h][1-8]/);
    expect(t1.toLowerCase()).not.toContain('knight');
    expect(latestHighlights).toBeUndefined();
    expect(stableRequestHint).not.toHaveBeenCalled();

    // Tier 2 — the piece that moves, its square lit; still no destination.
    fireEvent.click(screen.getByTestId('hint-button'));
    const t2 = screen.getByTestId('hint-nudge').textContent;
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '2');
    expect(t2.toLowerCase()).toContain('knight');
    expect(t2).not.toContain('f3');
    expect(latestHighlights?.map((h) => h.square)).toEqual(['g1']);
    expect(stableRequestHint).not.toHaveBeenCalled();

    // Tier 3 — the move + arrow + computed why, from the shared hint system.
    fireEvent.click(screen.getByTestId('hint-button'));
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '3');
    expect(stableRequestHint).toHaveBeenCalledTimes(1);
    expect(latestHighlights).toBeUndefined();
  });

  it('an unprompted correct first answer lands a HELD row, origin puzzle, prompted false', async () => {
    render(<TacticSetupBoard puzzle={buildSetupPuzzle()} sequence={0} onComplete={vi.fn()} />);
    await screen.findByTestId('mock-board');
    await act(async () => { latestOnMove!(NF3); });
    await settle();
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.length, 'no capability row was written').toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.origin).toBe('puzzle');
      expect(r.outcome).toBe('held');
      expect(r.prompted).toBe(false);
    }
  });

  it('a hint (any tier) before the first answer marks the row PROMPTED', async () => {
    render(<TacticSetupBoard puzzle={buildSetupPuzzle()} sequence={0} onComplete={vi.fn()} />);
    await screen.findByTestId('mock-board');
    fireEvent.click(screen.getByTestId('hint-button')); // tier 1 only
    await act(async () => { latestOnMove!(NF3); });
    await settle();
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.prompted).toBe(true);
  });

  it('a wrong first answer lands a BROKEN row, origin puzzle', async () => {
    render(<TacticSetupBoard puzzle={buildSetupPuzzle()} sequence={0} onComplete={vi.fn()} />);
    await screen.findByTestId('mock-board');
    await act(async () => { latestOnMove!(WRONG); });
    await settle(400);
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.length, 'the wrong first answer wrote no row').toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.outcome).toBe('broken');
      expect(r.origin).toBe('puzzle');
    }
    expect(stableRefute).toHaveBeenCalledTimes(1);
  });

  it('a wrong try that only keeps an edge (not-best) is not recorded as broken', async () => {
    refuteKind = 'not-best';
    render(<TacticSetupBoard puzzle={buildSetupPuzzle()} sequence={0} onComplete={vi.fn()} />);
    await screen.findByTestId('mock-board');
    await act(async () => { latestOnMove!(WRONG); });
    await settle(400);
    expect(await db.capabilityEvidence.count()).toBe(0);
  });

  it('Show Solution before any answer records nothing — a revealed line is not the student answering', async () => {
    render(<TacticSetupBoard puzzle={buildSetupPuzzle()} sequence={0} onComplete={vi.fn()} />);
    await screen.findByTestId('mock-board');
    fireEvent.click(screen.getByTestId('setup-show-solution'));
    await settle(400);
    expect(await db.capabilityEvidence.count()).toBe(0);
  });

  it('two consecutive same-theme puzzles open with DIFFERENT intro lines', async () => {
    const a = render(<TacticSetupBoard puzzle={buildSetupPuzzle()} sequence={0} onComplete={vi.fn()} />);
    const first = mockSpeak.mock.calls[0]?.[0] as string;
    a.unmount();
    mockSpeak.mockClear();
    render(<TacticSetupBoard puzzle={buildSetupPuzzle()} sequence={1} onComplete={vi.fn()} />);
    const second = mockSpeak.mock.calls[0]?.[0] as string;
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });
});
