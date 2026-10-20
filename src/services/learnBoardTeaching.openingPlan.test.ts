import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { openingBreakFor } from './learnBoardTeaching';
import { readBoardAll } from './boardComputers';
import { setOpeningIdentity } from './openingIdentity';

// THE OPENING'S PLAN REACHES LEARN WITHOUT THE 37 MB FILE (2026-10-14: the plan
// lane was offered zero times in a Learn game — it read only the masters file,
// which Learn should not load on a phone). The stored line plan answers, and
// since OS-3 it speaks through the opening story (the one producer).
describe('Learn says the line\'s master plan from the stored read', () => {
  beforeAll(() => { setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8'))); });
  const c = new Chess();
  const history = ['e4', 'e6', 'd4', 'd5', 'e5'];
  for (const m of history) c.move(m);
  const story = (namesStudentMoves: boolean) => readBoardAll('openingStory', { history, fen: c.fen(), student: 'b', namesStudentMoves });
  it('French Advance, Black to play: …c5 is your next move, so the key idea is held (Learn names no move unasked)', () => {
    // The story ran (the identity of the line is there) …
    expect(story(false).some((r) => r.storyBeat === 'identity' && /locks the centre/.test(r.text))).toBe(true);
    // … and the key idea, …c5, is a move Black can play now: held.
    expect(story(false).some((r) => r.storyBeat === 'key-break')).toBe(false);
    expect(story(false).every((r) => !/…c5/.test(r.text))).toBe(true);
    expect(openingBreakFor(c.fen(), 'b', 'French Defense: Advance Variation')?.san).toBe('c5');
  });
  it('no opening name and no masters file: the summary break is silent, never a guess', () => {
    expect(openingBreakFor(c.fen(), 'b', null)).toBeNull();
  });
});
