import { describe, it, expect } from 'vitest';
import { gemForReply, replyTag } from './replyTags';
import { ALL_GEMS, isWeaponGem, isKnownSlipGem } from '../data/lessons/punishGems';

const moves = (g: { lineMoves: string; inaccuracy: string }): string[] => [...g.lineMoves.trim().split(/\s+/), g.inaccuracy];

describe('replyTag', () => {
  it('a reply that is a proven trap is tagged Trap, whatever its frequency', () => {
    const trap = ALL_GEMS.find(isWeaponGem)!;
    expect(gemForReply(trap.openingId, moves(trap))).toBe(trap);
    expect(replyTag(trap.openingId, moves(trap), 1, false, 'course')).toBe('trap');
  });

  it('a known mistake below the trap bar is tagged Mistake, never Trap', () => {
    const slip = ALL_GEMS.find((g) => isKnownSlipGem(g) && !isWeaponGem(g))!;
    expect(replyTag(slip.openingId, moves(slip), 60, true, 'course')).toBe('mistake');
  });

  it('an ordinary reply is Main only when it leads its move with a real share', () => {
    const quiet = ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3'];
    expect(replyTag('caro-kann', quiet, 40, true, 'course')).toBe('main');
    expect(replyTag('caro-kann', quiet, 40, false, 'course')).toBe('sideline');
    expect(replyTag('caro-kann', quiet, 10, true, 'course')).toBe('sideline');
  });

  it('a club reply is tagged Club, never Main — its share is club players\', not the course\'s', () => {
    const h6 = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'h6'];
    expect(replyTag('italian-game', h6, 40, true, 'club')).toBe('club');
    expect(replyTag('italian-game', h6, 40, true, 'course')).toBe('main');
  });

  it('a club reply that is a proven trap or known mistake keeps that tag', () => {
    const trap = ALL_GEMS.find(isWeaponGem)!;
    expect(replyTag(trap.openingId, moves(trap), 1, false, 'club')).toBe('trap');
    const slip = ALL_GEMS.find((g) => isKnownSlipGem(g) && !isWeaponGem(g))!;
    expect(replyTag(slip.openingId, moves(slip), 60, true, 'club')).toBe('mistake');
  });
});
