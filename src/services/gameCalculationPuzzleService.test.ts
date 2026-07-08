import { describe, it, expect, beforeEach } from 'vitest';
import { buildMistakePuzzle } from '../test/factories';
import { db } from '../db/schema';
import {
  mistakePuzzleToRawPuzzle,
  buildGameCalculationPuzzles,
  getGameCalculationPuzzlesForSkill,
  countGameCalculationPuzzlesBySkill,
  clearGameCalculationCache,
} from './gameCalculationPuzzleService';

// Smothered mate: Qg8+ (a CHECK, so it can't also register as a quiet
// move) Rxg8 Nf7#. Keeps the mate/quiet routing test unambiguous.
const MATE_FEN = '5r1k/6pp/7N/8/8/1Q6/6PP/6K1 w - - 0 1';
const MATE_MOVES = 'b3g8 f8g8 h6f7';

describe('mistakePuzzleToRawPuzzle', () => {
  it('adapts a mistake puzzle into a game-derived RawPuzzle', () => {
    const p = buildMistakePuzzle();
    const raw = mistakePuzzleToRawPuzzle(p);
    expect(raw).not.toBeNull();
    expect(raw!.id).toBe(`gcalc-${p.id}`);
    expect(raw!.noSetupMove).toBe(true);
    expect(raw!.fen).toBe(p.fen);
    expect(raw!.moves).toBe(p.moves);
    // Default factory line (d4 … Bb5) opens with a quiet move.
    expect(raw!.themes).toContain('quietMove');
    expect(raw!.sourceLabel).toContain('Stockfish Bot');
  });

  it('classifies a mate mistake as mateIn2 and keeps the FEN student-to-move', () => {
    const p = buildMistakePuzzle({ fen: MATE_FEN, moves: MATE_MOVES, bestMove: 'b3g8' });
    const raw = mistakePuzzleToRawPuzzle(p);
    expect(raw).not.toBeNull();
    expect(raw!.themes).toContain('mateIn2');
    expect(raw!.fen).toBe(MATE_FEN);
    expect(raw!.moves).toBe(MATE_MOVES);
    expect(raw!.noSetupMove).toBe(true);
  });

  it('returns null when the line matches no calculation pattern', () => {
    const p = buildMistakePuzzle({
      fen: '6k1/5ppp/8/8/4r3/8/4R1PP/6K1 w - - 0 1',
      moves: 'e2e4', // Rxe4 — a lone capture, matches nothing
      gamePhase: 'middlegame',
      tacticType: null,
    });
    expect(mistakePuzzleToRawPuzzle(p)).toBeNull();
  });
});

describe('getGameCalculationPuzzlesForSkill (Dexie-backed)', () => {
  beforeEach(async () => {
    await db.mistakePuzzles.clear();
    clearGameCalculationCache();
  });

  it('routes each puzzle only to the skill whose pattern it matches', async () => {
    const mate = buildMistakePuzzle({
      id: 'mp-mate',
      fen: MATE_FEN,
      moves: MATE_MOVES,
      bestMove: 'b3g8',
    });
    const quiet = buildMistakePuzzle({
      id: 'mp-quiet',
      fen: '6k1/5ppp/8/8/8/8/1R3PPP/6K1 w - - 0 1',
      moves: 'b2b7', // Rb7 — quiet 7th-rank invasion
      bestMove: 'b2b7',
      gamePhase: 'middlegame',
    });
    await db.mistakePuzzles.bulkAdd([mate, quiet]);
    clearGameCalculationCache();

    const matePool = await getGameCalculationPuzzlesForSkill('find-the-mate');
    expect(matePool.map((p) => p.id)).toEqual(['gcalc-mp-mate']);

    const quietPool = await getGameCalculationPuzzlesForSkill('quiet-move');
    expect(quietPool.map((p) => p.id)).toContain('gcalc-mp-quiet');
    expect(quietPool.map((p) => p.id)).not.toContain('gcalc-mp-mate');
  });

  it('returns [] for every skill when the student has no matching mistakes', async () => {
    clearGameCalculationCache();
    const pool = await getGameCalculationPuzzlesForSkill('find-the-mate');
    expect(pool).toEqual([]);
  });

  it('counts matched game puzzles per skill', async () => {
    await db.mistakePuzzles.bulkAdd([
      buildMistakePuzzle({ id: 'mp-mate', fen: MATE_FEN, moves: MATE_MOVES, bestMove: 'b3g8' }),
    ]);
    clearGameCalculationCache();
    const counts = await countGameCalculationPuzzlesBySkill(['find-the-mate', 'quiet-move']);
    expect(counts['find-the-mate']).toBe(1);
    expect(counts['quiet-move']).toBe(0);
  });

  it('memoizes the build until the cache is cleared', async () => {
    await db.mistakePuzzles.bulkAdd([
      buildMistakePuzzle({ id: 'mp-mate', fen: MATE_FEN, moves: MATE_MOVES, bestMove: 'b3g8' }),
    ]);
    clearGameCalculationCache();
    const first = await buildGameCalculationPuzzles();
    // Add another AFTER the build — without clearing, the memo hides it.
    await db.mistakePuzzles.add(
      buildMistakePuzzle({ id: 'mp-mate2', fen: MATE_FEN, moves: MATE_MOVES, bestMove: 'b3g8' }),
    );
    const cached = await buildGameCalculationPuzzles();
    expect(cached.length).toBe(first.length);
    clearGameCalculationCache();
    const refreshed = await buildGameCalculationPuzzles();
    expect(refreshed.length).toBe(first.length + 1);
  });
});
