import { describe, it, expect } from 'vitest';
import { seenOneMoveAttack } from './learnBoardTeaching';

// …Na5 hits the bishop on c4 directly; nothing guards it.
const FEN = 'r1bqkbnr/pppp1ppp/8/n3p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4';
const proven = new Map([['missed-opponents-threat', 'short' as const]]);

describe('seenOneMoveAttack', () => {
  it('marks only a direct one-move attack when the student has proven they see threats', () => {
    expect(seenOneMoveAttack({ threatKey: 'hang:bc4', fen: FEN, lastSan: 'Na5', targets: ['c4'], student: 'w', green: proven })).toEqual({ from: 'a5', to: 'c4' });
  });
  it('still speaks to a grey student (no record) and a lighter one', () => {
    expect(seenOneMoveAttack({ threatKey: 'hang:bc4', fen: FEN, lastSan: 'Na5', targets: ['c4'], student: 'w', green: null })).toBeNull();
    expect(seenOneMoveAttack({ threatKey: 'hang:bc4', fen: FEN, lastSan: 'Na5', targets: ['c4'], student: 'w', green: new Map([['missed-opponents-threat', 'lighter' as const]]) })).toBeNull();
  });
  it('still speaks when the attacker did not just move (a hidden attack)', () => {
    expect(seenOneMoveAttack({ threatKey: 'hang:bc4', fen: FEN, lastSan: 'h6', targets: ['c4'], student: 'w', green: proven })).toBeNull();
  });
  it('still speaks a named pattern (a fork)', () => {
    expect(seenOneMoveAttack({ threatKey: 'vs:fork:c4', fen: FEN, lastSan: 'Na5', targets: ['c4'], student: 'w', green: proven })).toBeNull();
  });
  it('still speaks a check', () => {
    const check = 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5P2/PPPP2PP/RNBQKBNR w KQkq - 1 3';
    expect(seenOneMoveAttack({ threatKey: 'hit:pf3', fen: check, lastSan: 'Qh4+', targets: ['e1'], student: 'w', green: proven })).toBeNull();
  });
});
