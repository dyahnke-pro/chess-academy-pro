import { describe, it, expect } from 'vitest';
import { motifKit, motifKey } from './thinkingMotifStep';

// White to move: Nc7+ forks the king on e8 and the rook on a8.
const FORK = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
const board = { fen: FORK, motif: 'Fork', san: 'Nc7+', targets: ['e8', 'a8'] as const };

describe('motifKit — Pattern Recognition identify as a step-5 tap question', () => {
  it('keys the pattern\'s targets on its own board only', () => {
    expect(motifKey({ ...board, targets: ['e8', 'a8'] }, FORK)?.key).toEqual(['e8', 'a8']);
    expect(motifKey({ ...board, targets: ['e8', 'a8'] }, '4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toBeNull();
    expect(motifKey({ ...board, targets: [] }, FORK)).toBeNull();
  });

  it('says why a target is in the key, from the board, and records as step 5', () => {
    const kit = motifKit({ ...board, targets: ['e8', 'a8'] });
    expect(kit.step).toBe('their-targets');
    expect(kit.reasonFor(FORK, 'a8')).toBe('Nc7+ hits the rook on a8.');
    expect(kit.reasonFor(FORK, 'b5')).toBeNull();
    expect(kit.showLine(FORK, ['e8', 'a8'], 0)).toBe('The fork is Nc7+: it hits the king on e8 and rook on a8.');
  });

  it('rules a wrong tap out by whose piece it is, never naming the answer', () => {
    const kit = motifKit({ ...board, targets: ['e8', 'a8'] });
    expect(kit.wrongTapLine(FORK, 'b5')).toMatch(/your own piece/);
    expect(kit.wrongTapLine(FORK, 'h4')).not.toMatch(/e8|a8|Nc7/);
  });
});
