import { describe, it, expect } from 'vitest';
import type { FactGroup } from './coachFact';
import { questionThought } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';

// CHAT ANSWERS THEM (David 2026-11-17: every computer answers in chat): a
// question about the move, through `questionThought`, on Danya's real boards.
const ASK_MOVE: ReadonlySet<FactGroup> = new Set(['move', 'theirSide', 'danger', 'line', 'story', 'structure', 'tactics', 'concepts']);
const line = (rank: number, evaluation: number, moves: string[]) => ({ rank, evaluation, moves, mate: null });
function ask(fenBefore: string, san: string, moverIsStudent: boolean, after: ReturnType<typeof line>[]): string {
  return questionThought({ namesPlayedMove: true,
    story: false, theory: false, plainThreatsSeen: false, fenBefore, san, moverIsStudent, prev: NO_PREV_CAPTURE, line: null,
    theirLast: null, history: [], costCp: null,
    reads: { before: [], after, passBefore: [], passAfter: [] } as never,
  }, ASK_MOVE, null, null).spoken;
}

describe('the defence computers answer a question about the move in chat', () => {
  it('their pin (1Rejj 7.Bb5): harmless — b7 guards the knight, castling ends it', () => {
    const said = ask('r1bqkb1r/pp3ppp/2n1p3/3p4/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 7', 'Bb5', false,
      [line(1, -208, ['f8c5', 'g1h3', 'e8g8', 'b5c6', 'b7c6', 'e1g1'])]);
    // The knight on c6 is named earlier in the answer; the pin refers back (human voice rule 3).
    expect(said).toMatch(/pins your knight (on c6 )?to the king/);
  });
  it('the queen net (hv0P 12.Nd4): e6 covered, a4 the one square left', () => {
    const said = ask('r1b1k2r/pppp1ppp/7n/4P3/1B2P3/5N2/q1P2PPP/1R1QKB1R w Kkq - 1 12', 'Nd4', true,
      [line(1, 578, ['c7c5', 'b4c5', 'a2a5'])]);
    expect(said).toMatch(/your knight (on d4 )?covers e6/);
  });
  it('both saved (FozbG 27.Ne7): the knight steps out and guards the rook', () => {
    const said = ask('2R2b1r/r2k1p1p/1p1qpP2/3N1p2/p2P2P1/4BQ1P/P4R2/6K1 w - - 1 27', 'Ne7', true,
      [line(1, 518, ['h7h5', 'c8c6', 'd6b4', 'c6c1']), line(2, 559, ['f8e7', 'c8h8', 'e7f6', 'h8h7']), line(3, 567, ['f5g4', 'h3g4', 'b6b5', 'e7c6'])]);
    expect(said).toMatch(/knight (saves both|goes to e7|to e7 does it)[^.]*guards the rook|The knight to e7 does it/);
  });
});
