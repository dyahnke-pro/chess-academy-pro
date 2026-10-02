/**
 * Board-free endgame RULE questions (David 2026-10-01: "Can the coach speak to
 * these rules? Answer questions related to them in game?"). The material named
 * in the question is built and the endgame computer answers it — the same
 * sentence a live board with that material speaks.
 */
import { describe, it, expect } from 'vitest';
import { endgameRuleMaterial, isEndgameQuestion } from '../coach/questionIntents';
import { assembleEndgameRuleAnswer } from './groundedAnswer';

describe('endgameRuleMaterial — the material a rule question names', () => {
  const cases: Array<[string, string | null]> = [
    ['can two knights checkmate?', 'two-knights'],
    ['Can you checkmate with two bishops', 'two-bishops'],
    ['how many moves to mate with bishop and knight', 'bishop-knight'],
    ['how do you mate with a rook?', 'rook'],
    ['how do I checkmate with king and queen', 'queen'],
    ['is king and knight vs king a draw', 'knight'],
    ['is king and bishop vs king a draw?', 'bishop'],
    ['can a king stop two pawns?', 'two-pawns'],
    ['can a king stop two connected pawns', 'two-pawns'],
    // Not rule questions — the board lanes or the opening lanes own these.
    ['teach me the two knights defense', null],
    ['can I mate with my rook here?', null],
    ['what should my knight do', null],
    ["what's the queen's gambit", null],
    ['queen vs rook — who wins?', null],
  ];
  for (const [q, want] of cases) {
    it(`${q} → ${want}`, () => expect(endgameRuleMaterial(q)).toBe(want));
  }
  it('a rule question opens the grounded chat lanes', () => {
    expect(isEndgameQuestion('can two knights checkmate?')).toBe(true);
  });
});

describe('assembleEndgameRuleAnswer — the computer answers, not a recall', () => {
  it('two knights: no forced mate, a draw', () => {
    expect(assembleEndgameRuleAnswer('two-knights')?.facts).toMatch(/cannot force mate.*draw/);
  });
  it('the basic mates carry their computed move counts', () => {
    expect(assembleEndgameRuleAnswer('queen')?.facts).toMatch(/at most 10 moves/);
    expect(assembleEndgameRuleAnswer('rook')?.facts).toMatch(/at most 16 moves/);
    expect(assembleEndgameRuleAnswer('two-bishops')?.facts).toMatch(/at most 19 moves/);
    expect(assembleEndgameRuleAnswer('bishop-knight')?.facts).toMatch(/up to 33 moves/);
  });
  it('bishop and knight names both corner pairs, true with or without a board', () => {
    const f = assembleEndgameRuleAnswer('bishop-knight')?.facts ?? '';
    expect(f).toContain('a1 or h8');
    expect(f).toContain('h1 or a8');
  });
  it('a lone minor cannot mate', () => {
    expect(assembleEndgameRuleAnswer('bishop')?.facts).toMatch(/cannot mate a bare king/);
  });
  it('two pawns: it depends, and it says WHERE the pawns must stand', () => {
    const f = assembleEndgameRuleAnswer('two-pawns')?.facts ?? '';
    expect(f).toMatch(/^It depends on where the pawns stand/);
    expect(f).toContain('like d4 and e5');
    expect(f).toContain('like b5 and f5');
    expect(f).toContain('like d5 and e5');
    expect(f).toContain('inside the square of the other pawn');
  });
  it('winning material comes with a board to demonstrate on; a draw does not', async () => {
    const { endgameRuleDemoFen } = await import('./groundedAnswer');
    expect(endgameRuleDemoFen('rook')).toBe('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
    expect(endgameRuleDemoFen('two-pawns')).toBe('8/8/2k5/4P3/3P4/8/8/7K w - - 0 1');
    expect(endgameRuleDemoFen('two-knights')).toBeNull();
  });
});

describe('"what is my endgame plan" leads with the ending\'s own rule', () => {
  it('names the back-rank defence on the knight-pawn hold', async () => {
    const { assemblePositionalAnswer } = await import('./groundedAnswer');
    const a = assemblePositionalAnswer('1r4k1/R7/5KP1/8/8/8/8/8 b - - 0 1', 'black', 'endgame-plan', "what's my endgame plan?");
    expect(a?.facts).toMatch(/^The back-rank defence/);
  });
  it('names the two-knights draw', async () => {
    const { assemblePositionalAnswer } = await import('./groundedAnswer');
    const a = assemblePositionalAnswer('4k3/8/8/8/8/8/8/1N2K1N1 w - - 0 1', 'white', 'endgame-plan', "what's my endgame plan?");
    expect(a?.facts).toMatch(/cannot force mate/);
  });
});

describe('a mate question naming its material is a rule, not this board', () => {
  it('"how many moves to mate with bishop and knight" leaves the live mate lane', async () => {
    const { isMateQuestion } = await import('../coach/questionIntents');
    expect(isMateQuestion('how many moves to mate with bishop and knight')).toBe(false);
    expect(isMateQuestion('is there a forced mate?')).toBe(true);
  });
});
