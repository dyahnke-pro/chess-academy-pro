// "Make sure coach can answer in chat how to find a plan. Or answer any other
// question we compute for" (David 2026-10-15). Each question reaches its own
// computer, answered on the board, as teaching — never the wrong lane.
import { describe, it, expect } from 'vitest';
import { buildQuestionGrounding } from './questionIntents';
import { fastPathLane } from './chatTurn';
import { assemblePositionalAnswer, assemblePlanMethodAnswer, PLAN_METHOD_GENERAL } from '../services/groundedAnswer';

// White to move; Black's isolated d5 pawn, guarded by the queen and the f6 knight.
const ISO = 'r2q1rk1/pp2bppp/2n2n2/3p4/8/2N2N2/PP2BPPP/R2Q1RK1 w - - 0 12';
const topicOf = (q: string) => buildQuestionGrounding(q).positionalTopic;
const answer = (q: string): string => {
  const t = topicOf(q);
  if (!t) throw new Error(`no topic for "${q}"`);
  return assemblePositionalAnswer(ISO, 'white', t, q)?.facts ?? '';
};

describe('how to find a plan', () => {
  it('is a method question about planning, answered with the plan method on the board', () => {
    expect(fastPathLane('how do I find a plan?')).toBe('method');
    expect(assemblePlanMethodAnswer(ISO, 'white').facts).toMatch(/^How do you find a plan\? .*Their weakness: their isolated pawn on d5\. .*So the plan: .*pile up on their pawn on d5\./i);
  });
  it('with no board, the method itself', () => {
    expect(assemblePlanMethodAnswer(null, 'white').facts).toBe(PLAN_METHOD_GENERAL);
  });
  it('"why that plan?" and "what should I be planning" reach the plan lane', () => {
    expect(fastPathLane('why that plan?')).toBe('plan');
    expect(fastPathLane('what should I be planning')).toBe('plan');
  });
});

describe('the computed questions', () => {
  it('count: attackers against guards on a square, with the rule', () => {
    expect(topicOf('how many times do I attack the d5 pawn?')).toBe('count');
    expect(answer('how many times do I attack the d5 pawn?')).toBe('You hit the pawn on d5 twice, and they guard it twice. Not enough yet: a piece falls only when its attackers outnumber its guards — or when a cheaper piece hits a dearer one.');
  });
  it('grab: each capture counted — a losing one says who takes back', () => {
    expect(topicOf('can I take that pawn with my queen?')).toBe('grab');
    expect(answer('can I take that pawn with my queen?')).toMatch(/^Qxd5 takes the pawn, but their knight takes back — you give up more than you win\. Before any capture, count: who takes back, and with what\.$/);
  });
  it('tied: the named piece first', () => {
    expect(answer('is my bishop tied down?')).toMatch(/^No — your bishop on e2 is free to move: nothing it guards falls if it leaves\. Their queen on d8 is tied to guarding their pawn on d5/);
  });
  it('their weakness: the weakness and why it is one, never the glossary', () => {
    expect(fastPathLane('what is their weakness?')).toBe('positional');
    expect(answer('what is their weakness?')).toBe('Their weakness is the isolated pawn on d5: no pawn can ever protect it, so it needs pieces to guard it — and those pieces are tied to it.');
  });
  it('which of my pieces is worst reaches the piece read', () => {
    expect(fastPathLane('which of my pieces is worst?')).not.toBe('best-move');
  });
  it('the other side is "they", never a colour', () => {
    expect(answer('who controls the center?')).not.toMatch(/\b(?:black|white)\b/i);
  });
});
