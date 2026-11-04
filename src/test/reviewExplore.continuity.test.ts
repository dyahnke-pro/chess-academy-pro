/**
 * AN EXPLORED LINE CARRIES THE STORY THE WALK TOLD — UP TO THE PLY IT LEAVES
 * THE GAME (WO-STORY-MATRIX-01 P1-8b / P1-8d, design
 * docs/plans/2026-10-30-story-matrix-phase1.md §P1-8).
 *
 * Review builds a line the student explores on the free board from a seed of
 * what the walk SPOKE, restored at the ply the line leaves the game. P1-8b:
 * the plan was not in it (`planT` was local to each build), so a line asked
 * "How do you find a plan?" again — the repeated question trimmed as already
 * said, its answers spoken on their own. The story (the plan thread, every
 * plan's thread) rides the seed since.
 *
 * P1-8d: the narration holds ONE checkpoint — the walk's whole story, every
 * ledger, flag, plan and event inside it — and the line's seed is that
 * checkpoint taken back to the ply the line LEAVES the game (`exploreSeed`),
 * never to the walk's current ply. Cut at the walk's ply, a line off ply 11
 * with the walk at 25 held what was said about plies 12–25 — moves it never
 * played — and counted the ply-25 slip as its own ("That's the second time
 * this game"; the P1-8c review). Fails on that cut: the line off ply 34 with
 * the walk at 44 holds what the walk said on plies 35–44.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from '../services/coachFeatureService';
import { exploreSeed } from '../services/reviewNarrationBuild';
import { createStoryStore, storyOf, storyThrough, type GameStory, type StoryStore } from '../services/gameStory';
import { reviewInputs, type ReplayGame } from './replayGame';

/** The method's answers — said once a game with its question. */
const METHOD = /How do you find a plan\?|So the plan:|Checks, captures, threats:/;

/** Every entry of a story, with the ply it was said or happened at. */
function entries(st: GameStory): Array<[string, number]> {
  return [
    ...[...st.said].map(([k, at]) => [`c|${k}`, at] as [string, number]),
    ...[...st.sentences].map(([k, at]) => [`s|${k}`, at] as [string, number]),
    ...[...st.threads].flatMap(([k, t]) => t.said.map((x) => [`t|${k}|${x.kind}|${x.variant ?? ''}`, x.ply] as [string, number])),
    ...st.events.map((e) => [`e|${JSON.stringify(e)}`, e.ply] as [string, number]),
  ];
}

describe('a line explored from the walk carries the story it told, through the ply it leaves the game', () => {
  const game = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: Array<ReplayGame & { id: string; rating: number }> })
    .games.find((g) => g.id === 'sicilianClosed1000');
  if (!game) throw new Error('fixture game sicilianClosed1000 missing');
  const moves = reviewInputs(game);
  // The walk: the game as the student heard it, and the story it kept.
  const walkStory = createStoryStore(game.id);
  const walk = buildReviewSegmentsForTests(moves, game.studentSide, null, true, game.rating, [], undefined, null, new Map(), new Map(), null, walkStory);
  const narration = { intro: '', closing: null, segments: walk, story: walkStory.serialize() };
  /** The line the free board builds: the game to ply `k`, then `alt` (a move
   *  the game did not play), seeded the way `narrateExploredMove` seeds it. */
  const exploreLine = (walkedTo: number, k: number, alt: string): { text: string; line: GameStory; lineStory: StoryStore; segs: ReturnType<typeof buildReviewSegmentsForTests> } => {
    const c = new Chess();
    for (const m of moves.slice(0, k)) c.move(m.san);
    const played = c.move(alt);
    expect(played.san, 'the alternative is legal and not the game\'s move').not.toBe(moves[k].san);
    const line: ReviewMoveInput[] = [...moves.slice(0, k), { ...moves[k], san: played.san, fenAfter: c.fen(), classification: null, costCp: undefined, bestMove: null }];
    const seed = exploreSeed(narration, walkedTo, line.map((m) => m.san), moves);
    const lineStory = createStoryStore(game.id);
    const segs = buildReviewSegmentsForTests(line, game.studentSide, null, true, game.rating, [], undefined, null, new Map(), new Map(), seed, lineStory);
    return { text: segs.find((s) => s.ply === k + 1)?.narration ?? '', line: lineStory.current(), lineStory, segs };
  };

  it('the walk asks the method at ply 31 (the fixture)', () => {
    expect(walk.find((s) => s.ply === 31)?.narration ?? '').toMatch(/How do you find a plan\?[\s\S]*So the plan:/);
  }, 300_000);

  it('a line off ply 34 (35.Kg2 for 35.Kh1), walk at 44: the plan and everything said by 34 carry on, at the ply each was said, and nothing after', () => {
    const { text, line, lineStory } = exploreLine(44, 34, 'Kg2');
    const heard = storyThrough(narration.story, 34);
    // Non-vacuous: by ply 34 the walk had stated its plans (the convert
    // thread at 25; the method asked at 31, on the plan desk) and said plenty
    // — and it said more on plies 36–44.
    const at34 = storyOf(heard);
    expect(at34.said.size).toBeGreaterThan(20);
    expect(at34.sentences.size).toBeGreaterThan(0);
    expect([...at34.threads.values()].some((t) => t.said.some((x) => x.kind === 'stated'))).toBe(true);
    const desk = createStoryStore('desk');
    desk.restore(heard);
    expect(desk.plans().thread.methodSaid, 'the method was asked by 34').toBe(true);
    desk.restore(storyThrough(narration.story, 30));
    expect(desk.plans().thread.methodSaid, '…and not yet at 30').toBe(false);
    expect(entries(storyOf(narration.story)).filter(([, at]) => at > 35 && at <= 44).length, 'the walk said things on plies 36–44').toBeGreaterThan(0);
    // The line's story through 34 IS the walk's — every claim, sentence,
    // thread line, event and plan state, at the ply each was said…
    expect(storyThrough(lineStory.serialize(), 34)).toBe(heard);
    // …and after it only the line's own move.
    expect(entries(line).filter(([, at]) => at > 35)).toEqual([]);
    // So the plan stated at 31 is not announced again on the line.
    expect(text).not.toMatch(METHOD);
  }, 300_000);

  it('a line off ply 30 (31.Bb5 for 31.Raf1), walk at 40: the method the walk asked on Raf1 is not the line\'s — it asks its own on its own board', () => {
    const { text, line } = exploreLine(40, 30, 'Bb5');
    expect(entries(line).filter(([, at]) => at > 31)).toEqual([]);
    expect(text).toMatch(/How do you find a plan\?/);
  }, 300_000);

  it('a student who had not reached it (walked to ply 30) hears it there too', () => {
    expect(exploreLine(30, 30, 'Bb5').text).toMatch(/How do you find a plan\?/);
  }, 300_000);

  it('the free board is the walk\'s coach, paying only for its own moves (P1-8f)', () => {
    // The plies the walk already said are the seed's: the line does not
    // narrate them again (it narrated all of them, in the cheaper one-beat
    // mode, before), and narrates its own move in the walk's mode.
    // Measured 2026-11-04 on this line: the walk's mode built the whole line
    // in 5.3 s; built from the seed, 0.8 s — and the move says the same.
    const { text, segs } = exploreLine(44, 30, 'Bb5');
    expect(segs.filter((sg) => sg.ply <= 30).every((sg) => sg.narration === null)).toBe(true);
    expect(segs.filter((sg) => sg.ply <= 30)).toHaveLength(30);
    expect(text).toMatch(/^Taking on d8 was the plan at work/);
    const page = readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');
    expect(page).toMatch(/buildReviewSegmentsYielding\(inputs, playerColor, openingName, isReviewUncapped\(\),/);
  }, 300_000);
});
