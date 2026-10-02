import { describe, it, expect } from 'vitest';
import { theirMoveAnswerLines, studentMoveAnswerLines } from './learnBoardTeaching';

// PLAY ASKS THE SAME COMPUTERS (David 2026-10-02: "Make sure play has access to
// all the same computers … on demand through the chat function"). Play's chat
// goes through these composers; each test is a computer Learn speaks live.
const h = (s: string): string[] => s.split(' ');

describe('chat "what did their move do?" — the Learn computers', () => {
  it('names the fork trick their quiet move sidestepped', () => {
    const g = h('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6');
    expect(theirMoveAnswerLines(g, 9, 'w').join(' ')).toMatch(/d6 sidesteps your fork trick/);
  });
  it('names the hole their pawn move left, with the knight route', () => {
    const g = h('e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5');
    expect(theirMoveAnswerLines(g, 11, 'w').join(' ')).toMatch(/…e5 costs them d5/);
  });
  it('names your answer with its point when their move left you clearly better', () => {
    const g = h('e4 e5 Nf3 Qh4');
    const best = { rank: 1, evaluation: 900, moves: ['f3h4'], mate: null };
    expect(theirMoveAnswerLines(g, 3, 'w', best).join(' ')).toMatch(/Your answer is Nxh4: that wins the queen on h4/);
  });
  it('says nothing about an answer when the position is level', () => {
    const g = h('e4 e5 Nf3 Nc6');
    const best = { rank: 1, evaluation: 30, moves: ['f1b5'], mate: null };
    expect(theirMoveAnswerLines(g, 3, 'w', best).join(' ')).not.toMatch(/Your answer/);
  });
});

describe('chat "was that a good move?" — what a quiet move is for', () => {
  it('h3 makes luft', () => {
    const g = h('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O h3');
    expect(studentMoveAnswerLines(g, 12, 0, null).join(' ')).toMatch(/h3 makes luft/);
  });
  it('f4 prepares f5', () => {
    const g = h('e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 f4');
    expect(studentMoveAnswerLines(g, 18, 0, null).join(' ')).toMatch(/f4 prepares f5/);
  });
});
