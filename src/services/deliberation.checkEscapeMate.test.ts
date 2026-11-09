/**
 * A CHECK ESCAPE MAKES NO MATE THREAT IT TAKES NO PART IN (prod Learn audit
 * 2026-11-09). The student, Black, played …Rc1+ with rook to a8 mate already
 * threatened; the coach said "it let them play king to d2, which threatens
 * rook to a8, checkmate" — the mate stood before the check, and the king's
 * step took no part in it. A side in check has only its escapes, so the board
 * before the move could not show the mate: every mate after it read as new.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { moveWhy } from './deliberation';
import { allowedReply } from './inaccuracyCall';
import { mateThreatsAgainst } from './threatOut';

/** After …Rc1+: White in check, Ra8# waiting behind it. */
const CHECKED = '2k4r/Rpp2ppp/4p3/6P1/3R4/8/5PP1/2r1KB2 w - - 0 1';

describe('moveWhy — a mate threat is the move\'s own only where it takes part in it', () => {
  it('the king stepping out of check does not "threaten" the mate that stood before the check', () => {
    // The board really has the mate once the king steps away (the test is not vacuous).
    const after = new Chess(CHECKED); after.move('Kd2');
    expect(mateThreatsAgainst(after.fen(), 'b').moves.map((m) => m.san)).toContain('Ra8#');
    const why = moveWhy(CHECKED, 'Kd2', 'w', null);
    expect(why ?? '').not.toMatch(/Ra8/);
  });

  it('the cost reason does not say the reply made it: "…Rc1+ let them play Kd2, which threatens Ra8#" is gone', () => {
    // The board before …Rc1+ (the black rook on c2): Ra8# already threatened.
    const before = '2k4r/Rpp2ppp/4p3/6P1/3R4/8/2r2PP1/4KB2 b - - 0 1';
    const c = new Chess(before); c.move('Rc1+');
    expect(c.fen().split(' ')[0]).toBe(CHECKED.split(' ')[0]);
    const r = allowedReply(before, 'Rc1+', ['e1d2'], 'black');
    expect(r?.said ?? '').not.toMatch(/Ra8/);
  });

  it('CONTROL: a check escape whose own piece makes the mate still threatens it', () => {
    // Their knight checks from e2; the queen takes it and threatens Qe8#.
    const fen = '7k/6pp/8/8/8/8/4n1PP/4Q1K1 w - - 0 1';
    expect(moveWhy(fen, 'Qxe2', 'w', null)).toMatch(/threatens Qe8#/);
  });
});
