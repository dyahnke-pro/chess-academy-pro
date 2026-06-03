import { describe, it, expect } from 'vitest';
import { validateEvalClaims, stripDisprovenEvalSentences } from './evalClaimValidator';

describe('validateEvalClaims — flags only EGREGIOUS contradictions', () => {
  it('flags "equal" when one side is up 3+ pawns', () => {
    const r = validateEvalClaims('The position is roughly equal here.', 350);
    expect(r.ok).toBe(false);
  });

  it('does NOT flag "equal" at a fuzzy +0.8 (legit judgment call)', () => {
    const r = validateEvalClaims('The position is roughly equal here.', 80);
    expect(r.ok).toBe(true);
  });

  it('flags "White is winning" when Black is up 2+ pawns', () => {
    const r = validateEvalClaims('White is clearly winning.', -250);
    expect(r.ok).toBe(false);
    expect(r.violations[0].reason).toMatch(/Black ahead/);
  });

  it('flags "Black is winning" when White is up 2+ pawns', () => {
    const r = validateEvalClaims('Black is just winning here.', 300);
    expect(r.ok).toBe(false);
    expect(r.violations[0].reason).toMatch(/White ahead/);
  });

  it('treats "White is losing" as a Black-winning claim and flags it when White is ahead', () => {
    const r = validateEvalClaims('Honestly White is losing.', 300);
    expect(r.ok).toBe(false);
    expect(r.violations[0].reason).toMatch(/White ahead/);
  });

  it('flags "White is much better" when Black is up 2+ pawns', () => {
    const r = validateEvalClaims('White is much better in this structure.', -220);
    expect(r.ok).toBe(false);
  });

  it('does NOT flag "White is better" when White IS modestly ahead', () => {
    const r = validateEvalClaims('White is better here.', 120);
    expect(r.ok).toBe(true);
  });

  it('uses mate distance: "Black is winning" but White has mate → flagged', () => {
    const r = validateEvalClaims('Black is winning.', 0, 3); // White mates in 3
    expect(r.ok).toBe(false);
  });

  it('no eval in context → never flags (nothing to contradict)', () => {
    const r = validateEvalClaims('White is completely winning and Black is lost.', undefined, undefined);
    expect(r.ok).toBe(true);
  });

  it('drops only the contradicted sentence, keeps the rest', () => {
    const text = 'Develop your pieces. The position is dead equal. Aim for the center.';
    const { clean, dropped } = stripDisprovenEvalSentences(text, 400);
    expect(dropped).toHaveLength(1);
    expect(clean).toMatch(/Develop your pieces/);
    expect(clean).toMatch(/Aim for the center/);
    expect(clean).not.toMatch(/dead equal/);
  });
});
