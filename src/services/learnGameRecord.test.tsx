// THE GATE FOR WO-STANDARD-01 C7 — Learn's End Lesson saves the game.
//
// Observed on prod 2026-09-22: End Lesson (`teach-resign`) navigated to
// /coach/home and the game in progress was gone — not in db.games, not in the
// review list, no hand-off. The game-over path did save, but with
// `annotations: null` although every student ply had been graded live.
//
// Both Learn call sites now build through `buildLearnGameRecord`, so the row
// is held here exactly as the page writes it, and the page's End Lesson
// handler is held to it by statement (the page has no driver hook and its
// board mock cannot push eight plies — the click→row leg is owed to a prod
// probe, flagged in the report).
//
// NEGATIVE CONTROLS: the 4-ply row proves the floor is live (flipping
// `shouldPersistFinishedGame` to `true` fails it); the annotation row asserts
// against the OLD value (`annotations: null`); the source gate fails if the
// handler goes back to a bare `navigate('/coach/home')`.
import { describe, it, expect, beforeEach } from 'vitest';
import { openingKeyFor } from './openingKey';
import { coversEveryStudentPly } from './learnGameRecord';

// The ONE opening key (A1): a name is not a key.
const ITALIAN = openingKeyFor('C50', 'Italian Game');
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { screen } from '@testing-library/react';
import { render } from '../test/utils';
import { db } from '../db/schema';
import { MIN_PERSIST_PLIES } from '../utils/coachGamePersistence';
import { annotationFromLiveGrade, buildLearnGameRecord, type LearnLiveGrade } from './learnGameRecord';
import { ReviewGameCard } from '../components/Coach/ReviewGameCard';

import { vi } from 'vitest';
vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { glowBrightness: 100 } }),
}));

/** An 8-ply Learn game, the student White, with two live grades (a good move
 *  and a blunder) — the shape `liveGradesRef` holds when End Lesson is pressed. */
function eightPlyGame(): { pgn: string; plies: number; grades: LearnLiveGrade[] } {
  const c = new Chess();
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5']) c.move(san);
  return {
    pgn: c.pgn(),
    plies: c.history().length,
    grades: [
      { ply: 4, san: 'Bc4', color: 'white', bestMoveUci: 'f1c4', bestMoveEvalCp: 35, cpLossCp: 0 },
      { ply: 6, san: 'Ng5', color: 'white', bestMoveUci: 'b1c3', bestMoveEvalCp: 30, cpLossCp: 260 },
    ],
  };
}

beforeEach(async () => {
  await db.games.clear();
});

describe('C7 — an ended Learn game is a saved game', () => {
  it('8 plies + End Lesson → a coach game with result *, the live grades as annotations, in db.games AND the review list', async () => {
    const g = eightPlyGame();
    const record = buildLearnGameRecord({
      gameId: 'learn-abc',
      pgn: g.pgn,
      plyCount: g.plies,
      playerColor: 'white',
      playerName: 'David',
      rating: 1340,
      openingId: ITALIAN,
      ending: { kind: 'ended' },
      liveGrades: g.grades,
      promptedPlies: [6],
      date: '2026-09-22',
    });
    expect(record).not.toBeNull();
    expect(record).toMatchObject({
      id: 'learn-abc', source: 'coach', result: '*', white: 'David', black: 'Coach', studentSide: 'white',
      whiteElo: 1340, blackElo: null, openingId: ITALIAN, promptedPlies: [6],
      event: 'Learn with Coach (lesson ended)',
    });
    // The live evaluations ride along — the OLD record carried null here.
    expect(record!.annotations).not.toBeNull();
    expect(record!.annotations).toHaveLength(2);
    expect(record!.annotations![1]).toMatchObject({ moveNumber: 4, color: 'white', san: 'Ng5', bestMove: 'b1c3', bestMoveEval: 30, evaluation: -230, classification: 'blunder' });
    expect(record!.fullyAnalyzed).toBeUndefined(); // sparse — the sweep deepens it

    await db.games.add(record!);
    expect(await db.games.get('learn-abc')).toMatchObject({ source: 'coach', result: '*' });
    // The review list's own query (CoachReviewListPage): newest first, cap 100.
    const listed = await db.games.orderBy('date').reverse().limit(100).toArray();
    expect(listed.map((x) => x.id)).toContain('learn-abc');
    render(<ReviewGameCard game={record!} onClick={() => undefined} />);
    expect(screen.getByTestId('review-game-card-learn-abc')).toBeInTheDocument();
    expect(screen.getAllByText(/vs Coach/).length).toBeGreaterThan(0);
  });

  it('below the persistence floor nothing is saved — the same floor Play applies to every ending', () => {
    const g = eightPlyGame();
    const short = buildLearnGameRecord({
      gameId: 'learn-short', pgn: g.pgn, plyCount: MIN_PERSIST_PLIES - 2, playerColor: 'white', playerName: 'David',
      rating: 1340, openingId: null, ending: { kind: 'ended' }, liveGrades: [], promptedPlies: [],
    });
    expect(short).toBeNull();
    const atFloor = buildLearnGameRecord({
      gameId: 'learn-floor', pgn: g.pgn, plyCount: MIN_PERSIST_PLIES, playerColor: 'black', playerName: 'David',
      rating: 1340, openingId: null, ending: { kind: 'ended' }, liveGrades: [], promptedPlies: [],
    });
    expect(atFloor).toMatchObject({ result: '*', white: 'Coach', black: 'David', blackElo: 1340, annotations: null });
  });

  it('the game-over endings still map to a real result — the same builder, one shape', () => {
    const g = eightPlyGame();
    const base = { gameId: 'x', pgn: g.pgn, plyCount: g.plies, playerColor: 'black' as const, playerName: 'D', rating: 1200, openingId: null, liveGrades: [], promptedPlies: [] };
    expect(buildLearnGameRecord({ ...base, ending: { kind: 'checkmate', winner: 'black' } })).toMatchObject({ result: '0-1', event: 'Learn with Coach' });
    expect(buildLearnGameRecord({ ...base, ending: { kind: 'checkmate', winner: 'white' } })).toMatchObject({ result: '1-0' });
    expect(buildLearnGameRecord({ ...base, ending: { kind: 'draw' } })).toMatchObject({ result: '1/2-1/2' });
  });

  it('a live grade becomes an annotation in the review\'s own currency (expected-points band, White-POV evals)', () => {
    // Black's move: best-play eval +30 (White POV); the move cost Black 260cp
    // → the position is now +290 for White.
    const a = annotationFromLiveGrade({ ply: 5, san: 'Nf6', color: 'black', bestMoveUci: 'd7d5', bestMoveEvalCp: 30, cpLossCp: 260 });
    expect(a).toMatchObject({ moveNumber: 3, color: 'black', evaluation: 290, bestMoveEval: 30, classification: 'blunder' });
    expect(annotationFromLiveGrade({ ply: 0, san: 'e4', color: 'white', bestMoveUci: 'e2e4', bestMoveEvalCp: 30, cpLossCp: 0 }).classification).toBe('good');
  });
});

describe('C7 — the page\'s End Lesson handler is held to the builder (by statement)', () => {
  it('teach-resign builds a record through buildLearnGameRecord and offers the review; it does not only navigate home', () => {
    const src = readFileSync(resolve(__dirname, '../components/Coach/CoachTeachPage.tsx'), 'utf8');
    const at = src.indexOf('data-testid="teach-resign"');
    expect(at).toBeGreaterThan(0);
    // The handler is the ~60 lines ABOVE the testid (the onClick precedes it).
    const handler = src.slice(Math.max(0, at - 4000), at);
    expect(handler).toMatch(/buildLearnGameRecord\(\{/);
    expect(handler).toMatch(/ending: \{ kind: 'ended' \}/);
    expect(handler).toMatch(/db\.games\.add\(record\)/);
    expect(handler).toMatch(/setFinishedGame\(\{ id: record\.id, result: 'ended'/);
    // The pre-fix handler ended in a bare navigate — it must now be the
    // fall-through for "nothing to save", after the save branch.
    expect(handler.indexOf('buildLearnGameRecord({')).toBeLessThan(handler.lastIndexOf("navigate('/coach/home')"));
    // And the game-over effect builds through the SAME function (one shape).
    expect((src.match(/buildLearnGameRecord\(\{/g) ?? []).length).toBe(2);
  });
});


describe('coversEveryStudentPly — B7(c) folded into the one builder', () => {
  const grade = (ply: number) => ({ ply, san: 'e4', color: 'white' as const, bestMoveUci: null, bestMoveEvalCp: 0, cpLossCp: 0 });
  it('true only when EVERY student ply was graded; a missing ply leaves the game un-flagged', () => {
    expect(coversEveryStudentPly({ plyCount: 8, playerColor: 'white', liveGrades: [0, 2, 4, 6].map(grade) })).toBe(true);
    expect(coversEveryStudentPly({ plyCount: 8, playerColor: 'white', liveGrades: [0, 2, 6].map(grade) })).toBe(false);
    expect(coversEveryStudentPly({ plyCount: 8, playerColor: 'black', liveGrades: [1, 3, 5, 7].map(grade) })).toBe(true);
    expect(coversEveryStudentPly({ plyCount: 0, playerColor: 'white', liveGrades: [] })).toBe(false);
  });
});

describe('C3 — a live grade\'s engine lines reach the annotation the sweep reads', () => {
  const pv = { afterPlayed: ['a8b8', 'd4b5', 'a7f2'], afterBest: ['d7d6', 'b1c3'] };
  const base: LearnLiveGrade = { ply: 26, san: 'Nd4', color: 'white', bestMoveUci: 'f3g5', bestMoveEvalCp: 20, cpLossCp: 160 };

  it('a FLAGGED grade with pv → annotation.pv, the sweep\'s exact shape', () => {
    const a = annotationFromLiveGrade({ ...base, pv });
    expect(a.classification).not.toBe('good');
    expect(a.pv).toEqual(pv);
  });

  it('NEGATIVE CONTROL: an unflagged grade never files pv (the sweep persists lines on flagged plies only)', () => {
    const a = annotationFromLiveGrade({ ...base, cpLossCp: 0, pv });
    expect(a.classification).toBe('good');
    expect('pv' in a).toBe(false);
  });

  it('NEGATIVE CONTROL: a flagged grade whose reads never arrived files no pv key — an honest gap, not an empty line', () => {
    expect('pv' in annotationFromLiveGrade(base)).toBe(false);
    expect('pv' in annotationFromLiveGrade({ ...base, pv: { afterPlayed: [], afterBest: [] } })).toBe(false);
  });

  it('the saved Learn record carries the lines end to end', () => {
    const g = eightPlyGame();
    const record = buildLearnGameRecord({
      gameId: 'learn-pv', pgn: g.pgn, plyCount: g.plies, playerColor: 'white', playerName: 'D', rating: 1300, openingId: null,
      ending: { kind: 'ended' }, promptedPlies: [],
      liveGrades: [{ ply: 6, san: 'Ng5', color: 'white', bestMoveUci: 'b1c3', bestMoveEvalCp: 30, cpLossCp: 260, pv: { afterPlayed: ['d7d5', 'e4d5', 'f6d5'], afterBest: [] } }],
    });
    expect(record!.annotations![0].pv).toEqual({ afterPlayed: ['d7d5', 'e4d5', 'f6d5'], afterBest: [] });
  });
});
