// The question that catches the slip (David 2026-10-14: verdicts into thinking).
import { describe, it, expect } from 'vitest';
import { slipQuestion } from './learnBoardTeaching';

describe('slipQuestion — the thinking step a lost piece failed, read off the board', () => {
  it('the move itself made the piece losable: the blunder check', () => {
    // White's knight on f3 goes to d4, where the e5 pawn takes it.
    const q = slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'd4', 'w', new Set(), 0);
    expect(q?.key).toBe('slipq:is-my-move-safe');
    expect(q?.text).toMatch(/blunder check/);
  });
  it('the piece was already attacked before the move: answer the danger', () => {
    // The d5 pawn already hits the bishop on c4; any other move loses it.
    const q = slipQuestion('4k3/8/8/3p4/2B5/8/8/4K3 w - - 0 1', 'c4', 'w', new Set(), 0);
    expect(q?.key).toBe('slipq:answer-danger');
    expect(q?.text).toMatch(/what did their last move attack\?/);
  });
  it('once per step per game; nothing without a lost piece', () => {
    const said = new Set<string>();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'd4', 'w', said, 0)).not.toBeNull();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'd4', 'w', said, 1)).toBeNull();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', undefined, 'w', new Set(), 0)).toBeNull();
  });
});
