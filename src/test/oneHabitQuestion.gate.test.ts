// ONE QUESTION PER HABIT, SAID ONCE (David 2026-10-14: verdicts into thinking).
// The instant grade and the full verdict both name a slip; whichever lands
// first carries the habit's question, under the claim the other reads.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
const teach = readFileSync('src/services/learnBoardTeaching.ts', 'utf8');

describe('one habit question, one say-once claim', () => {
  it('the instant grade and the slip question share the claims — one key per habit (habitSaidKey)', () => {
    expect(page).toMatch(/habitSaidKey\('opponent-threat'\)/);
    expect(page).toMatch(/habitSaidKey\('blunder-check'\)/);
    expect(teach).toMatch(/habitSaidKey\(standing \? 'opponent-threat' : 'blunder-check'\)/);
    // No habit key spelled by hand: a second spelling is a second key.
    for (const src of [page, teach]) expect(src).not.toMatch(/'claim:method:/);
  });
  it('one wording per question — never a second literal of the blunder check', () => {
    const literal = /run CCT for them — what checks, captures and threats do they have once it lands\?'/;
    expect(page).not.toMatch(literal);
    expect(teach).not.toMatch(literal);
    expect(page).toMatch(/BLUNDER_CHECK_QUESTION/);
  });
});
