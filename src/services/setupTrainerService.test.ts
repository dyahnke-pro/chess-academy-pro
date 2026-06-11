import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { createDefaultSrsFields } from './srsEngine';
import {
  solverMoveCount,
  levelForMoves,
  firstSolverMoveIsQuiet,
  isSetupShape,
  buildSetupPuzzle,
  createSetupSession,
  pickSetupPuzzle,
  recordSetupResult,
} from './setupTrainerService';
import type { PuzzleRecord } from '../types';

// A real Lichess-shape puzzle: white to move plays the opponent setup move
// (Bc4-b3, quiet), then black solves. We craft a position where black's first
// solver move is a QUIET rook lift, then a fork lands two plies later.
// For the unit tests we use a synthetic but chess.js-legal line.

function makePuzzle(over: Partial<PuzzleRecord>): PuzzleRecord {
  const srs = createDefaultSrsFields();
  return {
    id: over.id ?? 'p1',
    fen: over.fen ?? 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
    moves: over.moves ?? 'g1f3 b8c6 f1c4 g8f6',
    rating: over.rating ?? 1500,
    themes: over.themes ?? ['fork'],
    openingTags: over.openingTags ?? null,
    popularity: over.popularity ?? 90,
    nbPlays: over.nbPlays ?? 100,
    movingPiece: over.movingPiece,
    source: 'lichess',
    srsInterval: srs.interval,
    srsEaseFactor: srs.easeFactor,
    srsRepetitions: srs.repetitions,
    srsDueDate: srs.dueDate,
    srsLastReview: null,
    userRating: 1200,
    attempts: 0,
    successes: 0,
    ...over,
  };
}

describe('setupTrainerService — shape helpers', () => {
  it('solverMoveCount counts the solver moves (ceil((len-1)/2))', () => {
    expect(solverMoveCount('a b c')).toBe(1);       // opp + 1 solver
    expect(solverMoveCount('a b c d')).toBe(2);      // opp,solver,opp,solver
    expect(solverMoveCount('a b c d e')).toBe(2);
    expect(solverMoveCount('a b c d e f g')).toBe(3);
  });

  it('levelForMoves sizes difficulty by calculation depth', () => {
    // len 4 → 2 solver moves → L1; len 6 → 3 → L2; len 8 → 4 → L3
    expect(levelForMoves('a b c d')).toBe(1);
    expect(levelForMoves('a b c d e f')).toBe(2);
    expect(levelForMoves('a b c d e f g h')).toBe(3);
    // len 3 → 1 solver move → plain spotting, excluded
    expect(levelForMoves('a b c')).toBeNull();
  });

  it('firstSolverMoveIsQuiet rejects a capturing first solver move', () => {
    // White plays e4 (opp setup), black answers d5xe4 — a CAPTURE → not quiet.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    // opp: f2f4 ; solver: e5f4 (capture)
    expect(firstSolverMoveIsQuiet(fen, 'f2f4 e5f4 g1f3 d7d5')).toBe(false);
  });

  it('firstSolverMoveIsQuiet accepts a non-capture, non-check first solver move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    // opp: e4e5 ; solver: b8c6 (quiet development)
    expect(firstSolverMoveIsQuiet(fen, 'e4e5 b8c6 g1f3 g8f6')).toBe(true);
  });

  it('isSetupShape requires depth + tactical motif + quiet first move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    const quietForkL1 = makePuzzle({ fen, moves: 'e4e5 b8c6 g1f3 g8f6', themes: ['fork'] });
    expect(isSetupShape(quietForkL1, 1)).toBe(true);
    expect(isSetupShape(quietForkL1, 2)).toBe(false); // wrong depth

    const noMotif = makePuzzle({ fen, moves: 'e4e5 b8c6 g1f3 g8f6', themes: ['endgame'] });
    expect(isSetupShape(noMotif, 1)).toBe(false); // no tactical motif
  });

  it('buildSetupPuzzle derives setupFen after the opponent move + the full solver line', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    const rec = makePuzzle({ id: 'abc', fen, moves: 'e4e5 b8c6 g1f3 g8f6', themes: ['fork'] });
    const sp = buildSetupPuzzle(rec);

    expect(sp.id).toBe('sp_abc');
    // setupFen = position after the opponent's e4e5 → black to move
    const after = new Chess(fen);
    after.move({ from: 'e4', to: 'e5' });
    expect(sp.setupFen).toBe(after.fen());
    expect(sp.playerColor).toBe('black');
    // the line the student plays through is everything after the opp move
    expect(sp.solutionMoves).toBe('b8c6 g1f3 g8f6');
    expect(sp.tacticType).toBe('fork');
    expect(sp.difficulty).toBe(1);
  });
});

describe('setupTrainerService — adaptive selection', () => {
  beforeEach(async () => {
    await db.puzzles.clear();
  });

  it('pickSetupPuzzle returns a level-matched setup puzzle near the target rating', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    await db.puzzles.bulkAdd([
      // valid L1 setup near 1500
      makePuzzle({ id: 'good', fen, moves: 'e4e5 b8c6 g1f3 g8f6', themes: ['fork'], rating: 1490 }),
      // wrong level (L2) — excluded for an L1 session
      makePuzzle({ id: 'l2', fen, moves: 'e4e5 b8c6 g1f3 g8f6 b1c3 e7e6', themes: ['fork'], rating: 1500 }),
      // no motif — excluded
      makePuzzle({ id: 'nomotif', fen, moves: 'e4e5 b8c6 g1f3 g8f6', themes: ['endgame'], rating: 1500 }),
    ]);

    const session = createSetupSession(1, 1500);
    const item = await pickSetupPuzzle(session);
    expect(item).not.toBeNull();
    expect(item?.puzzle.id).toBe('sp_good');
    expect(item?.rating).toBe(1490);
  });

  it('recordSetupResult drifts the target up on a solve and down on a miss', () => {
    let session = createSetupSession(1, 1500);

    const solve = recordSetupResult(session, 'sp_good', 1500, true, 1500);
    expect(solve.session.targetRating).toBeGreaterThan(1500);
    expect(solve.session.solved).toBe(1);
    expect(solve.session.attempted).toBe(1);
    expect(solve.session.seenIds.has('sp_good')).toBe(true);

    session = solve.session;
    const miss = recordSetupResult(session, 'sp_x', 1600, false, solve.newPlayerRating);
    expect(miss.session.targetRating).toBeLessThan(solve.session.targetRating);
    expect(miss.session.solved).toBe(1);
    expect(miss.session.attempted).toBe(2);
  });
});
