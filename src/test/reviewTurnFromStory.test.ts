/**
 * THE TURNING POINT IS READ ONCE AND KEPT IN THE GAME'S STORY (WO-STORY-MATRIX-01
 * P1-8c, design docs/plans/2026-10-30-story-matrix-phase1.md §P1-8).
 *
 * The Review build ran the selector over the game and threw its thesis away;
 * the walk's closing line then ran the whole selector a SECOND time over the
 * segments, with the turn passed in, to find the same move. Now the build reads
 * the turn once (`turnThesis`: the top of the one turn ranking, either side) and
 * notes it in its story; the closing line reads it off the walk's last
 * checkpoint (`storyTurn`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { reviewSegments, type ReplayGame } from './replayGame';
import { spokenLedgerSeed } from '../services/reviewNarrationBuild';
import { storyOf, storyTurn } from '../services/gameStory';
import { gameTurn } from '../services/turningPoints';
import { renderThesis } from '../services/teachingSelector';

describe('the walk\'s turning point comes from the story the build kept', () => {
  const games = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: Array<ReplayGame & { id: string; rating: number }> }).games;

  for (const g of games) {
    it(`${g.id}: the story's turn is the one ranking's top, said as a thesis`, () => {
      const segs = reviewSegments(g, g.rating);
      const turn = storyTurn(storyOf(spokenLedgerSeed({ intro: '', segments: segs, closing: null }, Number.POSITIVE_INFINITY)?.story ?? null));
      const ranked = gameTurn(segs);
      // Non-vacuous: every fixture game turned somewhere.
      expect(ranked, 'the fixture game has a turn').not.toBeNull();
      expect(turn?.ply).toBe(ranked?.ply);
      expect(turn?.thesis.kind).toBe('turned');
      expect(turn?.thesis.ply).toBe(ranked?.ply);
      // Whose move it was rides the thesis: the student's colour decides it.
      expect(!!turn?.thesis.theirs).toBe(ranked?.mover !== g.studentSide);
      expect(renderThesis(turn!.thesis, 'retrospective').length).toBeGreaterThan(0);
    }, 300_000);
  }
});
