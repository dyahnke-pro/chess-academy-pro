import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';
import { moverGaveUpMate, MATE_EVAL_VALUE } from './engineConstants';

// Clean-pass walk 2026-10-04, review G1: two forced mates Learn had named were
// reasoned off a line read cut short — 31.Qxe4+ "the stronger move was Rc7+ —
// it would swing pieces toward their king", 36.Qb5+ "Qe4+ — it would win the
// queen for a piece". The reason for a mating move is the mate.
describe('the better move mates → the reason is the mate, on every surface', () => {
  it('a mate given up is read from the white-POV sentinels, for either mover', () => {
    expect(moverGaveUpMate(MATE_EVAL_VALUE, 400, 'white')).toBe(true);
    expect(moverGaveUpMate(MATE_EVAL_VALUE, MATE_EVAL_VALUE, 'white')).toBe(false);
    expect(moverGaveUpMate(-MATE_EVAL_VALUE, -300, 'black')).toBe(true);
    expect(moverGaveUpMate(-MATE_EVAL_VALUE, 300, 'white')).toBe(false);
    expect(moverGaveUpMate(250, 100, 'white')).toBe(false);
  });
  it('the reason names the mate, never the line read (the two real plies)', () => {
    const r31 = betterMoveReason('2Rn3r/4k1pp/5q2/3B4/Q3p3/P4N2/5PPP/6K1 w - - 2 31', 'Qxe4+', 'Rc7+', ['c8c7'], 'white', null, true);
    expect(r31).toBe('it starts a forced mate');
    const r36 = betterMoveReason('3nk2r/2R3pp/5q2/3B4/1Q6/P4N2/5PPP/6K1 w - - 9 36', 'Qb5+', 'Qe4+', ['b4e4'], 'white', null, true);
    expect(r36).toBe('it starts a forced mate');
  });
  it('mate in one says "it ends the game" (one wording, from bestMoveReason)', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
    expect(betterMoveReason(fen, 'h3', 'Ra8#', [], 'white', null, true)).toBe('it ends the game');
  });
});
