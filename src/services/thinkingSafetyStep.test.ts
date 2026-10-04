import { describe, it, expect } from 'vitest';
import { safetyKey, safetyKit, safetyPrompt, safetyReason, safetyWrongTapLine } from './thinkingSafetyStep';

// White to move. White knight e5 attacked by a black pawn on d6, guarded by d4 —
// the cheaper attacker wins it. White rook a1 is safe.
const KNIGHT_IN_DANGER = '4k3/8/3p4/4N3/3P4/8/8/R3K3 w - - 0 1';
// White bishop on c4 attacked by a black rook on c8 and unguarded.
const LOOSE_BISHOP = '2r1k3/8/8/8/2B5/8/8/4K3 w - - 0 1';
// White pawn on b5 attacked by a black knight, unguarded.
const PAWN_ONLY = '4k3/8/8/1P6/3n4/8/8/4K3 w - - 0 1';
const QUIET = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';

describe('step "am I safe?" — the key', () => {
  it('a piece the cheaper attacker wins is in danger', () => {
    expect(safetyKey(KNIGHT_IN_DANGER)?.key).toEqual(['e5']);
  });
  it('an attacked, unguarded piece is in danger', () => {
    expect(safetyKey(LOOSE_BISHOP)?.key).toEqual(['c4']);
  });
  it('a pawn in danger is a near miss, not a key square', () => {
    expect(safetyKey(PAWN_ONLY)).toEqual({ key: [], nearMiss: ['b5'] });
  });
  it('a quiet board has no key', () => {
    expect(safetyKey(QUIET)?.key).toEqual([]);
  });
});

describe('step "am I safe?" — words', () => {
  it('names why each piece is in danger', () => {
    expect(safetyReason(LOOSE_BISHOP, 'c4')).toMatch(/bishop on c4 is attacked and nothing guards it/);
    expect(safetyReason(KNIGHT_IN_DANGER, 'e5')).toMatch(/their pawn attacks it — the cheaper piece/);
  });
  it('a wrong tap names the method, never the answer', () => {
    expect(safetyWrongTapLine(KNIGHT_IN_DANGER, 'a1')).toMatch(/Nothing of theirs attacks that rook/);
    expect(safetyWrongTapLine(KNIGHT_IN_DANGER, 'd6')).toMatch(/theirs/);
    expect(safetyWrongTapLine(KNIGHT_IN_DANGER, 'e1')).toMatch(/king/);
    expect(safetyWrongTapLine(KNIGHT_IN_DANGER, 'h4')).toMatch(/empty square/);
  });
  it('the prompt never says how many', () => {
    for (let i = 0; i < 3; i++) expect(safetyPrompt(i)).not.toMatch(/\d|one more|two|three/i);
  });
  it('the kit is wired to the step', () => {
    expect(safetyKit().step).toBe('am-i-safe');
    expect(safetyKit().keyFor(LOOSE_BISHOP)?.key).toEqual(['c4']);
  });
});
