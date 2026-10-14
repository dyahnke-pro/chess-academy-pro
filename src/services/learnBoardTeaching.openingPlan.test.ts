import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { openingPlanTeaching, openingBreakFor } from './learnBoardTeaching';
import { setOpeningIdentity } from './openingIdentity';

// THE OPENING'S PLAN REACHES LEARN WITHOUT THE 37 MB FILE (2026-10-14: the plan
// lane was offered zero times in a Learn game — it read only the masters file,
// which Learn should not load on a phone). The stored line plan answers.
describe('Learn says the line\'s master plan from the stored read', () => {
  beforeAll(() => { setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8'))); });
  const c = new Chess();
  for (const m of ['e4', 'e6', 'd4', 'd5', 'e5']) c.move(m);
  it('French Advance, Black to play: your break is …c5', () => {
    const h = openingPlanTeaching(c.fen(), 'b', 'French Defense: Advance Variation');
    expect(h?.text).toMatch(/your break is …c5/);
    expect(openingBreakFor(c.fen(), 'b', 'French Defense: Advance Variation')?.san).toBe('c5');
  });
  it('no opening name and no masters file: silent, never a guess', () => {
    expect(openingPlanTeaching(c.fen(), 'b', null)).toBeNull();
  });
});
