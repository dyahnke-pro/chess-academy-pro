// "Is there an opening called X?" is a DB lookup, never the stock refusal —
// David asked about the intercontinental ballistic missile live on his phone
// (2026-08-13) and got "I can't verify that precisely" while the canonical
// 3,600-entry openings DB sat unqueried. The confirm is a live offer that
// walks the opening to the MIDDLEGAME via the teach router.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { openingExistenceQuery } from './questionIntents';

describe('openingExistenceQuery', () => {
  it.each([
    ['Is there an opening called the intercontinental ballistic missile?', 'intercontinental ballistic missile'],
    ['is there an opening named the vienna game?', 'vienna game'],
    ['is the bongcloud a real opening?', 'bongcloud'],
    ['does the fried liver opening exist?', 'fried liver'],
  ])('extracts the candidate name: %s', (q, name) => {
    expect(openingExistenceQuery(q)).toBe(name);
  });

  it.each([
    "what's the best move?",
    'teach me the vienna',
    'what traps can I play in the italian?',
  ])('stays quiet on non-existence asks: %s', (q) => {
    expect(openingExistenceQuery(q)).toBeNull();
  });
});

describe('wiring pins', () => {
  it('coachService threads the name and engages without a board', () => {
    const s = readFileSync('src/coach/coachService.ts', 'utf8');
    expect(s).toContain('openingExistenceName: openingExistenceName ?? undefined');
    expect(s).toContain('|| openingExistenceName !== null');
  });
  it('coachApi answers from the DB and offers the middlegame-deep lesson', () => {
    const s = readFileSync('src/services/coachApi.ts', 'utf8');
    expect(s).toContain("typeof grounding.openingExistenceName === 'string'");
    expect(s).toContain('all the way into the middlegame');
  });
});
