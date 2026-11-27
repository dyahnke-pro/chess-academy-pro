import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * PLAY: BACK ONLY LOOKS; A DIFFERENT MOVE THERE IS THE TAKEBACK (David, the
 * board bar decisions, 2026-11-24: "The Takeback button goes … Learn and
 * Play."). The looked-back board takes the student's move, the one rule
 * (`lookBackPlay`) decides forward vs takeback, and every student move taken
 * back goes through the own-takeback door — the puzzle only when it was a
 * mistake. Fails on the old page: a Takeback button, a read-only past board,
 * and a takeback that never reached the door.
 */
const PAGE = readFileSync(join(process.cwd(), 'src/components/Coach/CoachGamePage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Play\'s look-back board is the takeback', () => {
  it('no Takeback button', () => {
    expect(PAGE).not.toMatch(/data-testid="takeback-btn"/);
  });
  it('a looked-back board the student may move on takes the move, through lookBackPlay', () => {
    expect(PAGE).toMatch(/viewedMoveIndex === null \|\| lookBackMovable/);
    expect(PAGE).toMatch(/onMove=\{viewedMoveIndex !== null && lookBackMovable[^}]*\? handleLookBackMove : handleBoardMoveRouted\}/);
    const fn = PAGE.slice(PAGE.indexOf('const handleLookBackMove = useCallback('), PAGE.indexOf('const handleLookBackMove = useCallback(') + 900);
    expect(fn).toContain('lookBackPlay(');
    expect(fn).toContain('takeBackPlays(play.plies)');
  });
  it('every student move taken back goes through the own-takeback door', () => {
    const fn = PAGE.slice(PAGE.indexOf('const takeBackPlays = useCallback('), PAGE.indexOf('const takeBackPlays = useCallback(') + 1200);
    expect(fn).toMatch(/!undone\.isCoachMove[^\n]*discussion\.takeBackOwn\(/);
  });
});
