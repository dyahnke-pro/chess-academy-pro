import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logMisconception } from './misconceptionService';
import {
  getUnifiedWeaknessProfile,
  aggregateMistakePuzzles,
  aggregateOpeningWeakSpots,
  aggregateClassifiedTactics,
  aggregateConversionFailures,
  aggregateBoardVision,
} from './weaknessSpine';
import type { SquareHeatmapEntry } from './findSquareService';
import { buildMistakePuzzle } from '../test/factories';
import type { ClassifiedTactic, MistakePuzzle, OpeningWeakSpot } from '../types';
import type { ConversionFailure } from './conversionDetector';

async function reset(): Promise<void> {
  await db.mistakePuzzles.clear();
  await db.misconceptionTags.clear();
  await db.openingWeakSpots.clear();
  await db.classifiedTactics.clear();
  await db.games.clear();
  await db.findSquareAttempts.clear();
}

function heat(square: string, attempts: number, correct: number, avgCorrectMs: number): SquareHeatmapEntry {
  return { square, attempts, correct, avgCorrectMs, errorRate: attempts > 0 ? (attempts - correct) / attempts : 0 };
}

function weakSpot(o: Partial<OpeningWeakSpot> = {}): OpeningWeakSpot {
  return {
    id: o.id ?? `${o.openingId ?? 'ruy-lopez'}-${o.moveIndex ?? 0}`,
    openingId: 'ruy-lopez',
    openingName: 'Ruy Lopez',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    moveIndex: 0,
    correctMoveSan: 'a6',
    failCount: 1,
    lastFailedAt: '2026-05-20T00:00:00.000Z',
    lastDrilledAt: null,
    ...o,
  };
}

function classifiedTactic(o: Partial<ClassifiedTactic> = {}): ClassifiedTactic {
  return {
    id: o.id ?? `ct-${Math.random()}`,
    sourceGameId: 'g1',
    moveIndex: 4,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    bestMoveUci: 'd7d5',
    bestMoveSan: 'd5',
    playerMoveUci: 'g8f6',
    playerMoveSan: 'Nf6',
    playerColor: 'white',
    tacticType: 'fork',
    evalSwing: 200,
    explanation: '',
    opponentName: null,
    gameDate: '2026-05-20',
    openingName: 'Ruy Lopez',
    puzzleAttempts: 0,
    puzzleSuccesses: 0,
    createdAt: '2026-05-20T00:00:00.000Z',
    ...o,
  };
}

function conversionFailure(o: Partial<ConversionFailure> = {}): ConversionFailure {
  return {
    gameId: 'g1',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    peakCp: 450,
    finalCp: 20,
    result: 'draw',
    playerColor: 'white',
    openingName: 'Ruy Lopez',
    date: '2026-05-20',
    peakMoveNumber: 12,
    ...o,
  };
}

beforeEach(reset);

const FEN_A = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const FEN_B = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

describe('aggregateMistakePuzzles', () => {
  it('clusters tactic-typed mistakes by motif with a puzzle theme', () => {
    const rows: MistakePuzzle[] = [
      buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork', status: 'unsolved' }),
      buildMistakePuzzle({ fen: FEN_B, playerMoveSan: 'd3', tacticType: 'fork', status: 'solved' }),
    ];
    const out = aggregateMistakePuzzles(rows);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe('analysis:tactic:fork');
    expect(out[0].total).toBe(2);
    expect(out[0].openCount).toBe(1); // only the unsolved one is "open"
    expect(out[0].puzzleThemes).toContain('fork');
    expect(out[0].sources).toEqual(['analysis']);
  });

  it('clusters non-tactic mistakes by game phase', () => {
    const rows: MistakePuzzle[] = [
      buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'h3', tacticType: null, gamePhase: 'opening' }),
      buildMistakePuzzle({ fen: FEN_B, playerMoveSan: 'a4', tacticType: null, gamePhase: 'endgame' }),
    ];
    const out = aggregateMistakePuzzles(rows);
    const tags = out.map((o) => o.tag).sort();
    expect(tags).toEqual(['analysis:phase:endgame', 'analysis:phase:opening']);
  });

  it('excludes positions already represented in the coach pipeline', () => {
    const rows: MistakePuzzle[] = [
      buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork' }),
    ];
    // Same position+move key as the mistake above → should be excluded.
    const core = FEN_A.split(' ').slice(0, 4).join(' ');
    const exclude = new Set([`${core}|Nf6`]);
    expect(aggregateMistakePuzzles(rows, exclude)).toHaveLength(0);
  });
});

describe('aggregateOpeningWeakSpots (resurrected dead store)', () => {
  it('clusters weak spots by opening and counts never-drilled spots as open', () => {
    const out = aggregateOpeningWeakSpots([
      weakSpot({ id: 'ruy-0', moveIndex: 0, failCount: 3 }),
      weakSpot({ id: 'ruy-2', moveIndex: 2, failCount: 1 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe('analysis:weakspot:ruy-lopez');
    expect(out[0].bucket).toBe('opening');
    expect(out[0].openCount).toBe(2);
    expect(out[0].positions[0].openingId).toBe('ruy-lopez');
  });

  it('drops a spot from openCount once it was drilled within the stale window', () => {
    const recent = new Date().toISOString();
    const out = aggregateOpeningWeakSpots([
      weakSpot({ id: 'ruy-0', moveIndex: 0, lastDrilledAt: recent }),
      weakSpot({ id: 'ruy-2', moveIndex: 2, lastDrilledAt: null }),
    ]);
    expect(out[0].openCount).toBe(1); // the freshly-drilled one is closed
  });
});

describe('aggregateClassifiedTactics (was display-only)', () => {
  it('clusters by motif, sharing the mistake-puzzle cluster key for merge', () => {
    const out = aggregateClassifiedTactics([
      classifiedTactic({ tacticType: 'fork', puzzleSuccesses: 0 }),
      classifiedTactic({ tacticType: 'fork', puzzleSuccesses: 1 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe('analysis:tactic:fork');
    expect(out[0].openCount).toBe(1); // only the un-solved one is open
    expect(out[0].puzzleThemes).toContain('fork');
  });
});

describe('aggregateConversionFailures (new signal)', () => {
  it('rolls blown wins into one conversion weakness', () => {
    const out = aggregateConversionFailures([conversionFailure(), conversionFailure({ gameId: 'g2' })]);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe('analysis:conversion');
    expect(out[0].openCount).toBe(2);
  });
  it('is empty with no failures', () => {
    expect(aggregateConversionFailures([])).toEqual([]);
  });
});

describe('aggregateBoardVision (was read only by its own page)', () => {
  it('flags slow and error-prone squares with enough attempts', () => {
    const out = aggregateBoardVision([
      heat('g5', 6, 2, 1500),   // 67% error → weak
      heat('b3', 5, 5, 4200),   // perfect but slow → weak
      heat('e4', 8, 8, 800),    // fast + accurate → fine
      heat('h6', 2, 0, NaN),    // too few attempts → ignored
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe('analysis:boardvision');
    expect(out[0].openCount).toBe(2);
    expect(out[0].label).toContain('g5');
  });

  it('is empty when vision is solid', () => {
    expect(aggregateBoardVision([heat('e4', 10, 10, 700)])).toEqual([]);
  });
});

describe('getUnifiedWeaknessProfile', () => {
  it('merges both pipelines into one ranked list', async () => {
    await logMisconception({ tag: 'hung-material', source: 'game-review', fen: FEN_B, playedSan: 'Qh5' });
    await db.mistakePuzzles.add(buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork', status: 'unsolved' }));

    const profile = await getUnifiedWeaknessProfile();
    const tags = profile.map((p) => p.tag);
    expect(tags).toContain('hung-material'); // coach pipeline
    expect(tags).toContain('analysis:tactic:fork'); // Analyze pipeline
    expect(profile.every((p) => p.openCount > 0)).toBe(true);
  });

  it('surfaces previously-dead opening weak spots in the unified profile', async () => {
    await db.openingWeakSpots.bulkPut([weakSpot({ id: 'ruy-0', failCount: 4 })]);
    const tags = (await getUnifiedWeaknessProfile()).map((p) => p.tag);
    expect(tags).toContain('analysis:weakspot:ruy-lopez');
  });

  it('folds a motif caught by BOTH the mistake AND classified-tactic passes into one row', async () => {
    await db.mistakePuzzles.add(buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork', status: 'unsolved' }));
    await db.classifiedTactics.add(classifiedTactic({ id: 'ct-1', tacticType: 'fork', puzzleSuccesses: 0 }));
    const forks = (await getUnifiedWeaknessProfile()).filter((p) => p.tag === 'analysis:tactic:fork');
    expect(forks).toHaveLength(1); // merged, not double-listed
    expect(forks[0].total).toBe(2); // 1 mistake + 1 classified
  });

  it('counts a mistake caught by BOTH pipelines once (dedup by position)', async () => {
    // Coach captured this exact position+move...
    await logMisconception({ tag: 'missed-tactic', source: 'game-review', fen: FEN_A, playedSan: 'Nf6' });
    // ...and so did the Analyze pass.
    await db.mistakePuzzles.add(buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork' }));

    const profile = await getUnifiedWeaknessProfile();
    // The Analyze fork row must NOT appear — its only position is the
    // one the coach already owns.
    expect(profile.map((p) => p.tag)).not.toContain('analysis:tactic:fork');
    expect(profile.map((p) => p.tag)).toContain('missed-tactic');
  });

  it('returns empty when there are no mistakes anywhere', async () => {
    expect(await getUnifiedWeaknessProfile()).toEqual([]);
  });
});
