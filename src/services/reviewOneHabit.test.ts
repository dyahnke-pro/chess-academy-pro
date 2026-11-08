// ONE HABIT CLOSES A REVIEW TURN (Learn's door rule, one coach; Review
// baseline 2026-11-08, the Colle game's 14.Ng5 blunder): the turn closed on
// "Blunder check before you let go of a piece: run CCT … Here the answer was
// …Bxg5" AND "Next time: end every move with a count … Here the answer was a
// capture: your knight on g5 was there to take" — two habits and the same
// answer twice. Review spoke the blunder check as a body fact (its `method:`
// claim was dropped), so nothing could hold it. The move's own habit (the
// fundamental's how) keeps the turn; the generic question is asked only when
// no fundamental taught one.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { reviewSegments, type ReplayGame } from '../test/replayGame';

interface FixtureGame extends ReplayGame { id: string; rating: number }

describe('a Review turn closes on one habit', () => {
  it('the Colle 14.Ng5 blunder says the count habit, not the blunder check too', async () => {
    const games = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: FixtureGame[] }).games;
    const g = games.find((x) => x.id.startsWith('colle800'));
    expect(g).toBeTruthy();
    const segs = await reviewSegments(g as FixtureGame, (g as FixtureGame).rating);
    const turn = segs.find((s) => s.ply === 27)?.narration ?? '';
    expect(turn).toMatch(/^Your Ng5 was a blunder/);
    expect((turn.match(/Here the answer was/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(turn).not.toMatch(/Blunder check before you let go of a piece/);
    expect(turn).toMatch(/end every move with a count/);
  }, 300_000);
});

describe('a Review turn says one plan for each side', () => {
  it('the Colle 14.Ng5 says the plan the game follows, not the majority as well', async () => {
    const games = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: FixtureGame[] }).games;
    const g = games.find((x) => x.id.startsWith('colle800')) as FixtureGame;
    const segs = await reviewSegments(g, g.rating);
    const turn = segs.find((s) => s.ply === 27)?.narration ?? '';
    expect(turn).toMatch(/build toward: an attack on their king/);
    expect(turn).not.toMatch(/pawn majority/);
    // …and once heard, the static majority plan does not come back later
    // (held for the turn, it was said two plies on).
    const later = segs.filter((s) => s.ply > 27 && s.ply % 2 === 1).map((s) => s.narration ?? '').join(' ');
    expect(later).not.toMatch(/your plan is to advance your queenside pawn majority/i);
  }, 300_000);
});
