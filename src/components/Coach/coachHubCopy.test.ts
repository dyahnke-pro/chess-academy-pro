/**
 * A TILE MAY NOT PROMISE BEHAVIOUR THE SURFACE REFUSES TO GIVE.
 *
 * `/coach/play` is a PURE PLAYING SURFACE. Its own source says so
 * (CoachGamePage.tsx: "Play is a pure playing surface and stays silent until
 * asked"), and the rule is locked in CLAUDE.md: during a Play game the coach
 * may speak phase-transition narration and nothing else — it never volunteers
 * commentary, and the full diagnosis waits for the post-game review.
 *
 * The hub tile advertised the opposite. Shipped copy read "Coach narrates each
 * move and helps when you're stuck", and the ⓘ text "The coach narrates your
 * moves, calls out tactics you missed". A user reads that, plays a game, hears
 * near-silence, and concludes the coach is broken — so the deliberate design
 * reads as a defect. David spotted it from the other direction, describing Play
 * himself as "stays silent until you ask a question" (2026-09-03).
 *
 * The silence is the contract, so the copy has to match it. This gate fails if
 * the Play tile ever again promises per-move narration. It is deliberately
 * narrow: it bans the CLAIM, not the words — "narrates" is fine on Learn, which
 * really does talk you through the game.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, 'CoachHomePage.tsx'), 'utf8');

/** The Play tile's copy block — from its label to the end of its info prop. */
function playTileCopy(): string {
  const start = SRC.indexOf('label="Play with Coach"');
  expect(start, 'Play with Coach tile not found — did the label change?').toBeGreaterThan(-1);
  const end = SRC.indexOf('onClick=', start);
  return SRC.slice(start, end);
}

describe('coach hub tile copy matches the surface contract', () => {
  it('the Play tile never promises narration Play does not do', () => {
    const copy = playTileCopy().toLowerCase();
    // Each of these asserts the coach speaks over the game unprompted.
    const forbidden = [
      'narrates each move',
      'narrates your moves',
      'narrates every move',
      'commentary on each move',
      'calls out tactics you missed',
    ];
    const found = forbidden.filter((phrase) => copy.includes(phrase));
    expect(
      found,
      `Play is silent until asked (CoachGamePage.tsx: "stays silent until asked"). This copy promises otherwise: ${found.join(', ')}`,
    ).toEqual([]);
  });

  it('the Play tile still says what it DOES do', () => {
    // Guard against "fixing" the check by emptying the copy: a tile that
    // explains nothing is how someone leaves the hub without tapping.
    const copy = playTileCopy().toLowerCase();
    expect(copy, 'the Play tile lost its subtitle').toContain('subtitle=');
    expect(
      /quiet|silent|unless you ask|until you ask|waits for you/.test(copy),
      'the Play tile should tell the user the coach stays quiet until asked — that is the surface\'s defining behaviour',
    ).toBe(true);
  });

  it('every primary tile carries a subtitle', () => {
    // The subtitle is the only thing on the hub that explains what a tile
    // actually does. A label alone is a noun, and users bounce off nouns.
    const tiles = [...SRC.matchAll(/label="([^"]+)"/g)].map((m) => m[1]);
    expect(tiles.length, 'no tiles found — the hub markup changed shape').toBeGreaterThan(0);
    for (const label of ['Learn with Coach', 'Play with Coach']) {
      const start = SRC.indexOf(`label="${label}"`);
      if (start === -1) continue;
      const block = SRC.slice(start, SRC.indexOf('onClick=', start));
      expect(block, `${label} has no subtitle`).toContain('subtitle=');
    }
  });
});
