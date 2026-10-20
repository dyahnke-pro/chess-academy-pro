import { describe, it, expect } from 'vitest';
import { askThenAnswer, splitThink, stripThink, resolveOwed, THINK_MARK } from './thinkPause';

const keep = (a: string) => (): string => a;

describe('thinkPause', () => {
  it('splits a question from its answer', () => {
    expect(splitThink(`What do you do about it? ${THINK_MARK} Take it — Bxd1 removes the queen.`))
      .toEqual(['What do you do about it?', 'Take it — Bxd1 removes the queen.']);
  });
  it('null without a mark', () => { expect(splitThink('Take it.')).toBeNull(); });
  it('strips the mark for display', () => {
    expect(stripThink(`Watch out. What now? ${THINK_MARK} Take it.`)).toBe('Watch out. What now? Take it.');
  });
  it('only the closed answer waits — the sentences after it are said now (prod walk 2026-10-19)', () => {
    const turn = `${askThenAnswer('How do you meet it?', 'Step out of it — take the queen off the line.', keep('x'))} Nxc6 was one of just two moves that kept the win here.`;
    const split = splitThink(turn);
    expect(split?.[0]).toBe('How do you meet it? Nxc6 was one of just two moves that kept the win here.');
    expect(stripThink(split?.[1] ?? '')).toBe('Step out of it — take the queen off the line.');
    expect(stripThink(turn)).toBe('How do you meet it? Step out of it — take the queen off the line. Nxc6 was one of just two moves that kept the win here.');
  });
});

describe('a sentence-closer after the closing mark adds no segment (replay 2026-10-19)', () => {
  it('"Q ‖ A ‖." speaks the question alone and owes the answer', () => {
    const t = `${askThenAnswer('Why this one and not seizing the open c-file?', 'No pawn of theirs can protect it.', keep('x'))}.`;
    const split = splitThink(t);
    expect(split?.[0]).toBe('Why this one and not seizing the open c-file?');
    expect(stripThink(split?.[1] ?? '')).toBe('No pawn of theirs can protect it.');
    expect(stripThink(t)).toBe('Why this one and not seizing the open c-file? No pawn of theirs can protect it.');
  });
});

describe('a waiting answer is resolved against the move played (Black walk 2026-10-19)', () => {
  const move = { fenBefore: 'a', san: 'Bb3', fenNow: 'b' };
  it('the resolver speaks, never the raw answer', () => {
    const t = askThenAnswer('Q?', 'Present answer.', (m) => `Past answer after ${m.san}.`);
    expect(resolveOwed(splitThink(t)![1], move)).toBe('Past answer after Bb3.');
  });
  it('a resolver that says it no longer matters drops it, and an untagged answer is never spoken', () => {
    const t = askThenAnswer('Q?', 'Present answer.', () => null);
    expect(resolveOwed(splitThink(t)![1], move)).toBe('');
    expect(resolveOwed(splitThink(`Q? ${THINK_MARK} Raw. ${THINK_MARK}`)![1], move)).toBe('');
  });
  it('the tag never reaches a shown or spoken text', () => {
    const t = askThenAnswer('Q?', 'A.', keep('x'));
    expect(stripThink(t)).toBe('Q? A.');
    expect(splitThink(t)![0]).toBe('Q?');
  });
});
