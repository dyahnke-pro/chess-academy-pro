import { describe, expect, it } from 'vitest';
import { tacticStakesFor } from './learnBoardTeaching';
import { exchangeStakes, mateStakes } from './factStakes';

describe('tacticStakesFor — what a spoken tactic wins, for the turn door', () => {
  it('a mate key stakes a forced mate at its distance', () => {
    expect(tacticStakesFor('7k/8/8/8/8/8/8/K7 w - - 0 1', 'mate:2', [], null, 'b')).toEqual(mateStakes('you', 3, true));
  });

  it('a capture that wins material is staked by the exchange on its squares', () => {
    // Nc7+ forks the king and an undefended rook on a8: the rook falls.
    const fen = 'r3k3/2N5/8/8/8/8/8/K7 b - - 0 1';
    const stakes = tacticStakesFor(fen, 'fork:c7', ['c7', 'e8', 'a8'], 'fork', 'b');
    expect(stakes).toEqual(exchangeStakes(fen, ['c7', 'e8', 'a8'], 'b'));
    expect(stakes?.points).toBe(5);
  });

  it('a check-fork on a guarded piece wins the second target, not the exchange', () => {
    // Nf7+ forks the king on h8 and the bishop on d6; e7 guards d6, so the
    // exchange alone wins nothing — the fork still wins the bishop.
    const fen = '7k/4pN2/3b4/8/8/8/8/K7 b - - 0 1';
    expect(tacticStakesFor(fen, 'fork:f7', ['f7', 'h8', 'd6'], 'fork', 'b')).toEqual({ points: 3, plies: 1 });
  });

  it('nothing to win is unstaked', () => {
    const fen = '7k/4pN2/3b4/8/8/8/8/K7 b - - 0 1';
    expect(tacticStakesFor(fen, 'pin:d6', ['d6'], 'pin', 'b')).toBeUndefined();
  });
});
