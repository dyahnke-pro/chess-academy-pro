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
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from '../services/coachFeatureService';
import { spokenLedgerSeed } from '../services/reviewNarrationBuild';
import { reviewInputs, type ReplayGame } from './replayGame';

/** The method's answers — said once a game with its question. */
const METHOD = /How do you find a plan\?|So the plan:|Checks, captures, threats:/;

describe('a line explored from the walk carries the plan it stated', () => {
  const game = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: Array<ReplayGame & { id: string; rating: number }> })
    .games.find((g) => g.id === 'sicilianClosed1000');
  if (!game) throw new Error('fixture game sicilianClosed1000 missing');
  const moves = reviewInputs(game);
  // The walk: the game as the student heard it.
  const walk = buildReviewSegmentsForTests(moves, game.studentSide, null, true, game.rating);
  /** The line the free board builds: the game to ply 30, then 31.Bb5 (the game
   *  played 31.Raf1), seeded the way `narrateExploredMove` seeds it. */
  const explore = (walkedTo: number): string => {
    const c = new Chess();
    for (const m of moves.slice(0, 30)) c.move(m.san);
    c.move('Bb5');
    const line: ReviewMoveInput[] = [...moves.slice(0, 30), { ...moves[30], san: 'Bb5', fenAfter: c.fen(), classification: null, costCp: undefined, bestMove: null }];
    const walked = spokenLedgerSeed({ segments: walk } as never, walkedTo);
    const seed = walked ? { throughPly: Math.min(walked.throughPly, 30), keys: walked.keys, story: walked.story } : null;
    const segs = buildReviewSegmentsForTests(line, game.studentSide, null, true, game.rating, [], undefined, null, new Map(), new Map(), seed);
    return segs.find((s) => s.ply === 31)?.narration ?? '';
  };

  it('the walk asks the method at ply 31 (the fixture)', () => {
    expect(walk.find((s) => s.ply === 31)?.narration ?? '').toMatch(/How do you find a plan\?[\s\S]*So the plan:/);
  }, 300_000);

  it('a student who heard it (walked to ply 40) does not hear its answers again on the explored line', () => {
    expect(explore(40)).not.toMatch(METHOD);
  }, 300_000);

  it('a student who had not reached it (walked to ply 30) hears it there — the line can say it', () => {
    expect(explore(30)).toMatch(/How do you find a plan\?/);
  }, 300_000);
});
