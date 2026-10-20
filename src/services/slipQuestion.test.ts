// The question that catches the slip (David 2026-10-14: verdicts into thinking).
import { describe, it, expect } from 'vitest';
import { slipQuestion } from './learnBoardTeaching';

describe('slipQuestion — the thinking step a lost piece failed, read off the board', () => {
  it('the move itself made the piece losable: the blunder check', () => {
    // White's knight on f3 goes to d4, where the e5 pawn takes it.
    const q = slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', new Set(), 0, null);
    expect(q?.key).toBe('claim:method:blunder-check');
    expect(q?.text).toMatch(/your knight on d4/);
    expect(q?.text).toMatch(/blunder check/i);
    expect(q?.text).toMatch(/CCT/);
  });
  it('the piece was already attacked before the move: answer the danger', () => {
    // The d5 pawn already hits the bishop on c4; any other move loses it.
    const q = slipQuestion('4k3/8/8/3p4/2B5/8/8/4K3 w - - 0 1', 'Kd1', 'c4', 'w', new Set(), 0, null);
    expect(q?.key).toBe('claim:method:answer-danger');
    expect(q?.text).toMatch(/what did their last move attack\?/);
  });
  it('once per step per game; nothing without a lost piece', () => {
    const said = new Set<string>();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', said, 0, null)).not.toBeNull();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', said, 1, null)).toBeNull();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', undefined, 'w', new Set(), 0, null)).toBeNull();
  });
});

describe('one blunder-check habit, one say-once key (no second computer)', () => {
  it('the lane already taught it this game: the slip question stays quiet', () => {
    const said = new Set<string>(['claim:method:blunder-check']);
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', said, 0, null)).toBeNull();
  });
});
