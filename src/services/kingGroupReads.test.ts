// The S4 king group's move reads reach the one composer (`moveThoughtFacts`),
// so Review, the lessons, chat (`questionThought`) and How to think say them, on real boards from
// Danya's speedruns.
import { describe, it, expect } from 'vitest';
import { moveThoughtFacts, questionThought } from './moveThoughtFacts';
import { composeThought } from './thoughtComposer';
import { NO_PREV_CAPTURE } from './captureRun';
import type { FactGroup } from './coachFact';
import { newLessonVoice } from './reviewMoveBriefing';

const facts = (fenBefore: string, san: string, moverIsStudent: boolean) => moveThoughtFacts({
  plainThreatsSeen: false, story: false, theory: false, fenBefore, san, prev: NO_PREV_CAPTURE, moverIsStudent,
  line: null, history: [], theirLast: null, reads: null, costCp: null, tense: 'now', phrases: newLessonVoice().phrases,
});
const spoken = (fenBefore: string, san: string, moverIsStudent: boolean): string =>
  composeThought(facts(fenBefore, san, moverIsStudent), 'lesson', newLessonVoice(), new Set(), null).spoken;

describe('the king group in the composer', () => {
  it('a queen with no safe square is said, over the bare hit', () => {
    const s = spoken('rnbq1rk1/pp3pp1/2pb1n1p/4p3/4p3/1BN4N/PPPP1PPP/R1BQKR2 b Q - 1 9', 'Bg4', true);
    expect(s).toMatch(/queen on d1 .*no safe square|queen on d1 has nowhere to run/);
  });
  it('the second attacker and what the count wins', () => {
    expect(spoken('r3r1k1/pbpq1ppp/1nNbpn2/1P1pB3/3P4/2NBP2P/PP3PP1/R2QK2R w KQ - 9 13', 'Qf3', true)).toMatch(/Taking on f6 now wins a pawn/);
  });
  it('the piece out of reach, against the square where it is chased', () => {
    // No reads: the contrast is the square it left (the knight on b6 hit the queen on c4).
    expect(spoken('r2r2k1/p1p1qppp/1nP1p3/4P3/2Q5/2N1P2P/PP3PP1/R2R2K1 w - - 3 21', 'Qa6', true)).toMatch(/On c4 the knight on b6 was already hitting it/);
  });
  it('the poisoned piece and its mate', () => {
    expect(spoken('rnbqkbnr/ppppp3/5p2/6Bp/3PP3/8/PPP2PPP/RN1QKBNR w KQkq - 0 4', 'Be2', true)).toMatch(/Bxh5\+ Rxh5 Qxh5/);
  });
  it('every mate, said behind the mate', () => {
    expect(spoken('rn4k1/pp6/2p1b1pp/3p4/3Pp3/2N1P1b1/PPP4q/R1BQ1K2 b - - 1 19', 'Bh3#', true)).toMatch(/Qf2/);
  });
  it('a quiet move says none of them', () => {
    const f = facts('r3r1k1/pbpq1ppp/1nNbpn2/1P1pB3/3P4/2NBP2P/PP3PP1/R2QK2R w KQ - 9 13', 'a3', true);
    expect(f.filter((x) => ['queenHunt', 'secondAttacker', 'outOfReach', 'poisonedPiece', 'everyMate'].includes(x.computer))).toEqual([]);
  });
});

describe('the king group answers in chat (questionThought, the move group)', () => {
  const ask = (fenBefore: string, san: string, groups: readonly FactGroup[] = ['move']): string => questionThought({
    plainThreatsSeen: false, story: false, theory: false, fenBefore, san, prev: NO_PREV_CAPTURE, moverIsStudent: true,
    line: null, history: [], theirLast: null, reads: null, costCp: null,
  }, new Set(groups), null, null).spoken;
  it('each read is in the chat answer on its real board', () => {
    expect(ask('rnbq1rk1/pp3pp1/2pb1n1p/4p3/4p3/1BN4N/PPPP1PPP/R1BQKR2 b Q - 1 9', 'Bg4')).toMatch(/no safe square|nowhere to run/);
    expect(ask('r3r1k1/pbpq1ppp/1nNbpn2/1P1pB3/3P4/2NBP2P/PP3PP1/R2QK2R w KQ - 9 13', 'Qf3')).toMatch(/Taking on f6 now wins a pawn/);
    expect(ask('r2r2k1/p1p1qppp/1nP1p3/4P3/2Q5/2N1P2P/PP3PP1/R2R2K1 w - - 3 21', 'Qa6', ['move', 'choices'])).toMatch(/knight on b6 was already hitting it/); // out of reach is a choice (why that square), asked by "why is this best?"
    expect(ask('rnbqkbnr/ppppp3/5p2/6Bp/3PP3/8/PPP2PPP/RN1QKBNR w KQkq - 0 4', 'Be2')).toMatch(/Bxh5\+ Rxh5 Qxh5/);
    expect(ask('rn4k1/pp6/2p1b1pp/3p4/3Pp3/2N1P1b1/PPP4q/R1BQ1K2 b - - 1 19', 'Bh3#')).toMatch(/Qf2/);
  });
});
