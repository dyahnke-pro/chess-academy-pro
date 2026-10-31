/**
 * AN EXPLORED LINE CARRIES THE PLAN THE WALK STATED (WO-STORY-MATRIX-01 P1-8b,
 * design docs/plans/2026-10-30-story-matrix-phase1.md §P1-8).
 *
 * Review builds a line the student explores on the free board — and the walk
 * ahead of them after a deeper read lands — from a seed of what the walk SPOKE:
 * every say-once key, restored at the ply the line leaves the game
 * (`spokenLedgerSeed`). The plan was not in it: `planT` was local to each
 * build. The walk asked "How do you find a plan?" at ply 31 and answered it;
 * the student went back a move and tried another for their opponent there,
 * and the line, its plan thread empty, asked the method's questions again —
 * the repeated question trimmed as already said, its answers spoken on their
 * own ("Checks, captures, threats: … So the plan: walk your bishop to c6").
 * The story (the plan thread, every plan's thread) rides the segments as a
 * checkpoint now, and the seed carries it.
 *
 * Fails on the code before it: the explored ply re-says the method's answers.
 *
 * P1-8d: the narration holds ONE checkpoint — the walk's whole story, every
 * ledger and flag inside it — and the seed is that checkpoint taken back to
 * the ply walked (`storySeed`). The explored line keeps the plan and every
 * claim the walk said, at the ply it said it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from '../services/coachFeatureService';
import { storySeed } from '../services/reviewNarrationBuild';
import { createStoryStore, storyOf, type GameStory } from '../services/gameStory';
import { reviewInputs, type ReplayGame } from './replayGame';

/** The method's answers — said once a game with its question. */
const METHOD = /How do you find a plan\?|So the plan:|Checks, captures, threats:/;

describe('a line explored from the walk carries the plan it stated', () => {
  const game = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: Array<ReplayGame & { id: string; rating: number }> })
    .games.find((g) => g.id === 'sicilianClosed1000');
  if (!game) throw new Error('fixture game sicilianClosed1000 missing');
  const moves = reviewInputs(game);
  // The walk: the game as the student heard it, and the story it kept.
  const walkStory = createStoryStore(game.id);
  const walk = buildReviewSegmentsForTests(moves, game.studentSide, null, true, game.rating, [], undefined, null, new Map(), new Map(), null, walkStory);
  const narration = { intro: '', closing: null, segments: walk, story: walkStory.serialize() };
  /** The line the free board builds: the game to ply 30, then 31.Bb5 (the game
   *  played 31.Raf1), seeded the way `narrateExploredMove` seeds it. */
  const exploreLine = (walkedTo: number): { text: string; heard: GameStory; line: GameStory } => {
    const c = new Chess();
    for (const m of moves.slice(0, 30)) c.move(m.san);
    c.move('Bb5');
    const line: ReviewMoveInput[] = [...moves.slice(0, 30), { ...moves[30], san: 'Bb5', fenAfter: c.fen(), classification: null, costCp: undefined, bestMove: null }];
    const walked = storySeed(narration, walkedTo);
    const seed = walked ? { throughPly: Math.min(walked.throughPly, 30), checkpoint: walked.checkpoint } : null;
    const lineStory = createStoryStore(game.id);
    const segs = buildReviewSegmentsForTests(line, game.studentSide, null, true, game.rating, [], undefined, null, new Map(), new Map(), seed, lineStory);
    return { text: segs.find((s) => s.ply === 31)?.narration ?? '', heard: storyOf(walked?.checkpoint ?? null), line: lineStory.current() };
  };
  const explore = (walkedTo: number): string => exploreLine(walkedTo).text;

  it('the walk asks the method at ply 31 (the fixture)', () => {
    expect(walk.find((s) => s.ply === 31)?.narration ?? '').toMatch(/How do you find a plan\?[\s\S]*So the plan:/);
  }, 300_000);

  it('a student who heard it (walked to ply 40) does not hear its answers again on the explored line', () => {
    expect(explore(40)).not.toMatch(METHOD);
  }, 300_000);

  it('a student who had not reached it (walked to ply 30) hears it there — the line can say it', () => {
    expect(explore(30)).toMatch(/How do you find a plan\?/);
  }, 300_000);

  it('the explored line keeps every claim, sentence, plan and event the walk said, at the ply it said it', () => {
    const { heard, line } = exploreLine(40);
    // Non-vacuous: the walk had said plenty by ply 40, ledgers and flags among it.
    expect(heard.said.size).toBeGreaterThan(20);
    expect([...heard.said.keys()].some((k) => k.startsWith('g:'))).toBe(true);
    expect(heard.sentences.size).toBeGreaterThan(0);
    expect(heard.threads.size).toBeGreaterThan(0);
    for (const [k, at] of heard.said) expect(line.said.get(k), k).toBe(at);
    for (const [k, at] of heard.sentences) expect(line.sentences.get(k), k).toBe(at);
    for (const [k, t] of heard.threads) expect(line.threads.get(k)?.said.slice(0, t.said.length), k).toEqual(t.said);
    expect(line.events.slice(0, heard.events.length)).toEqual(heard.events);
  }, 300_000);
});
