import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { newThreatsAtTurn, threatAnswerOutcome, THREAT_PIECE_IMPORTANCE } from './threatAnswerEvidence';

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
/** The fork trick: 5…d5 hits the bishop on c4 and the knight on e4. */
const FORK_TRICK = after(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Nc3', 'Nxe4', 'Nxe4', 'd5']);
/** The Fried Liver: 6.Nxf7 hits the queen on d8 and the rook on h8. */
const FRIED = after(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7']);
/** 3…Bg4 pins the f3 knight to the queen — and wins nothing (it is guarded). */
const PIN = after(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4']);

describe('threatAnswerOutcome — held or broken, on the board', () => {
  it('the Fried Liver fork lands when Black ignores it (6…Be6)', () => {
    const v = threatAnswerOutcome({ fen: FRIED, playedSan: 'Be6', pattern: 'fork', targets: ['d8', 'h8'] });
    expect(v).toMatchObject({ tag: 'missed-their-fork', outcome: 'broken', posedImportance: THREAT_PIECE_IMPORTANCE });
  });
  it('the fork trick has no saving reply — the slip came earlier, so it is no question here', () => {
    expect(threatAnswerOutcome({ fen: FORK_TRICK, playedSan: 'Bd3', pattern: 'fork', targets: ['c4', 'e4'] })).toBeNull();
  });
  it('taking the forking knight answers the Fried Liver fork (6…Kxf7)', () => {
    const v = threatAnswerOutcome({ fen: FRIED, playedSan: 'Kxf7', pattern: 'fork', targets: ['d8', 'h8'] });
    expect(v).toMatchObject({ tag: 'missed-their-fork', outcome: 'held', gainAfter: 0 });
  });
  it('a pin that wins nothing was never posed', () => {
    expect(threatAnswerOutcome({ fen: PIN, playedSan: 'Be2', pattern: 'pin', targets: ['f3', 'd1'] })).toBeNull();
  });
  it('a pattern with no recorder writes nothing', () => {
    expect(threatAnswerOutcome({ fen: FRIED, playedSan: 'Kxf7', pattern: 'battery', targets: ['d8'] })).toBeNull();
  });
  it('an illegal reply writes nothing', () => {
    expect(threatAnswerOutcome({ fen: FRIED, playedSan: 'Rh7', pattern: 'fork', targets: ['d8', 'h8'] })).toBeNull();
  });
});

describe('newThreatsAtTurn — the detector, read with the opponent to move', () => {
  it('finds the knight fork on d8 and h8 after 6.Nxf7', () => {
    const forks = newThreatsAtTurn(FRIED).filter((t) => t.pattern === 'fork');
    expect(forks.some((t) => t.attacker === 'f7' && t.targets.includes('d8') && t.targets.includes('h8'))).toBe(true);
  });
  it('a motif already standing at the previous turn is not a new question', () => {
    expect(newThreatsAtTurn(PIN, PIN)).toEqual([]);
  });
});

describe('their attacker is THEIR piece, read off the board', () => {
  it('removing the guard names the knight that can take the guard, not the guard itself', () => {
    // …Nc6 hits d4, the only guard of the knight on e5. The detector's first
    // square is the guard (White's own pawn); the attacker is Black's knight.
    const c = new Chess('1n4k1/8/3b4/4N3/3P4/8/8/6K1 b - - 0 1');
    c.move('Nc6');
    const t = newThreatsAtTurn(c.fen()).find((x) => x.pattern === 'removal_of_guard');
    expect(t?.attacker).toBe('c6');
    expect(t?.targets).toEqual(['d4', 'e5']);
  });
});
