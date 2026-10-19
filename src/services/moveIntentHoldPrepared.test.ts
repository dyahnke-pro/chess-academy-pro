// LEARN NAMES NO MOVE UNASKED, for what a move PREPARES (replay 2026-10-19,
// 2.d4 in David's Smith-Morra: "You play d4 first, to free your knight on b1
// for Nd2" named the move he had not played yet).
import { describe, it, expect } from 'vitest';
import { phraseIntentForTest as phrase } from './moveIntent';

const FEN_AFTER = 'rnbqkbnr/pp1ppppp/8/2p5/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2';
const prep = { uci: 'b1d2', san: 'Nd2', gainCp: 20 };
const does = { verb: 'develop', castle: false, develops: { piece: 'knight', from: 'b1' } };

describe('a held prepared move is said by its piece', () => {
  it('Learn: the freed piece, never the move', () => {
    const said = phrase('d4', null, prep, 'student', 'w', FEN_AFTER, does, null, null, true);
    expect(said).toMatch(/knight on b1/);
    expect(said).not.toMatch(/Nd2|knight to d2/);
  });
  it('review and chat still name it', () => {
    expect(phrase('d4', null, prep, 'student', 'w', FEN_AFTER, does, null, null, false)).toMatch(/Nd2/);
  });
  it('a stopped move and a held prepared one: two jobs, the second by its piece', () => {
    const stop = { uci: 'd8a5', san: 'Qa5', threatCp: 150 };
    const said = phrase('d4', stop, prep, 'student', 'w', FEN_AFTER, does, null, null, true);
    expect(said).toMatch(/two jobs/);
    expect(said).not.toMatch(/Nd2/);
  });
});
