// The chat's "why did they play that?" reads the SAME three-facts computer as
// Learn and the review (WO-THINK-01, David 2026-10-29: "One coach … the same
// everywhere"): what the move sets up, down the engine's line from the board
// after it. The engine is replaced by a fixed line; the board is real.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';

// A plain stand-in, not a spy: a spy that records a rejected promise reports
// it as unhandled even when the caller catches it.
const engine: { next: () => Promise<unknown>; calls: unknown[][] } = { next: async () => ({ topLines: [] }), calls: [] };
vi.mock('./stockfishEngine', () => ({ stockfishEngine: { analyzeWithBudget: (...a: unknown[]) => { engine.calls.push(a); return engine.next(); } } }));

import { moveDeepFact } from './movePurposeEngine';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('moveDeepFact — the chat reads the three facts', () => {
  beforeEach(() => { engine.calls = []; engine.next = async () => ({ topLines: [] }); });

  it('their …g6 makes room for their bishop on g7, said from your seat', async () => {
    // 1.e4 c5 2.a3 g6: the engine's line from the board after …g6 is b4 Bg7.
    engine.next = async () => ({ topLines: [{ rank: 1, evaluation: 20, moves: ['b2b4', 'f8g7'], mate: null }] });
    const r = await moveDeepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', 'opponent');
    expect(r?.text).toBe('Their g6 is making room for their bishop on g7, where it hits your rook on a1 once your b4 opens the diagonal.');
    expect(engine.calls[0]?.[0]).toBe(fenAfter(['e4', 'c5', 'a3', 'g6']));
  });

  it('the student\'s own move is said as yours', async () => {
    engine.next = async () => ({ topLines: [{ rank: 1, evaluation: 20, moves: ['b2b4', 'f8g7'], mate: null }] });
    const r = await moveDeepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', 'student');
    expect(r?.text).toMatch(/^Your g6 is making room for your bishop on g7/);
  });

  it('nothing when the move set nothing up, or the engine failed', async () => {
    engine.next = async () => ({ topLines: [{ rank: 1, evaluation: 20, moves: ['b2b4', 'b8c6'], mate: null }] });
    expect(await moveDeepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', 'opponent')).toBeNull();
    engine.next = () => Promise.reject(new Error('engine down'));
    expect(await moveDeepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', 'opponent')).toBeNull();
  });
});
