import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import { RECORD_PRICE_REV } from '../data/misconceptionTags';
import type { MisconceptionTagRecord, MistakePuzzle, MoveAnnotation } from '../types';
import type { MoveScorer, ScoredMove } from './pvPlayback';
import { gamesBehindPrice, repriceGameRecord } from './recordReprice';
import { measuredCpLoss } from './autoAnalyzeGame';

// L6 (2026-10-20): a game analysed before the one price carries annotations
// priced as the read before minus a separate read after. The stored record —
// slip rows, mistake puzzles — read that number. Re-pricing must move both.
const PGN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 h6 4. d4 a6 *';
const fenBefore = (plies: number): string => {
  const c = new Chess();
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'h6', 'd4', 'a6'].slice(0, plies)) c.move(san);
  return c.fen();
};
const FEN_H6 = fenBefore(5);
const FEN_A6 = fenBefore(7);

// The two-read annotations: h6 "an inaccuracy, 45cp", a6 "an inaccuracy, 80cp".
const ann = (over: Partial<MoveAnnotation>): MoveAnnotation => ({
  moveNumber: 1, color: 'black', san: 'e5', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good', comment: null, ...over,
});
const ANNOTATIONS: MoveAnnotation[] = [
  ann({ moveNumber: 3, san: 'h6', evaluation: 75, bestMove: 'f8c5', bestMoveEval: 30, classification: 'inaccuracy' }),
  ann({ moveNumber: 4, san: 'a6', evaluation: 110, bestMove: 'e5d4', bestMoveEval: 30, classification: 'inaccuracy' }),
];

/** ONE search per position: h6 costs 20 against Bc5 (not a fault); a6 costs
 *  320 against exd4 (a real fault the two reads under-priced). White POV. */
const scorer: MoveScorer & { calls: number } = {
  calls: 0,
  async scoreMoves(fen: string, ucis: readonly string[]): Promise<ScoredMove[]> {
    this.calls += 1;
    const [best, played] = ucis;
    if (fen === FEN_H6) return [{ evaluation: 30, mate: null, moves: [best] }, { evaluation: 50, mate: null, moves: [played] }];
    if (fen === FEN_A6) return [{ evaluation: 30, mate: null, moves: [best] }, { evaluation: 350, mate: null, moves: [played] }];
    return [];
  },
};

// The boot pass prices with the singleton scorer; here it is the stub above.
vi.mock('./refutedAlternative', async (orig) => ({
  ...(await orig<typeof import('./refutedAlternative')>()),
  SINGLETON_SCORER: { scoreMoves: (fen: string, ucis: readonly string[], depth: number) => scorer.scoreMoves(fen, ucis, depth) },
}));

const row = (over: Partial<MisconceptionTagRecord>): MisconceptionTagRecord => ({
  id: `r-${Math.random()}`, tag: 'tempo-handed', source: 'auto-analysis', createdAt: 1, fen: FEN_H6, playedSan: 'h6',
  status: 'open', masteryHits: 0, sourceGameId: 'g1', grade: 'inaccuracy', cpLoss: 45, ...over,
});

describe('the stored record is re-priced with one search (L6)', () => {
  beforeEach(async () => {
    scorer.calls = 0;
    await db.delete();
    await db.open();
    await db.games.put(buildGameRecord({ id: 'g1', pgn: PGN, fullyAnalyzed: true, studentSide: 'black', annotations: ANNOTATIONS }));
    await db.misconceptionTags.bulkPut([
      row({ id: 'h6' }),
      row({ id: 'a6', fen: FEN_A6, playedSan: 'a6', cpLoss: 80 }),
      row({ id: 'live', source: 'discussion-practice', fen: FEN_A6, playedSan: 'a6', cpLoss: 80 }),
    ]);
    await db.mistakePuzzles.put({ id: 'p-a6', fen: FEN_A6, playerMove: 'a7a6', playerMoveSan: 'a6', bestMove: 'e5d4', bestMoveSan: 'exd4', moves: 'e5d4', cpLoss: 80, classification: 'inaccuracy', gamePhase: 'opening', moveNumber: 4, sourceGameId: 'g1', sourceMode: 'lichess', playerColor: 'black', promptText: '', status: 'unsolved', srsDueDate: '2026-10-20', srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, createdAt: '2026-10-20' } as unknown as MistakePuzzle);
  });

  it('the old record reads the two-read cost (the split this pass removes)', () => {
    expect(measuredCpLoss(ANNOTATIONS[1])).toBe(80);
  });

  it('a slip the one search confirms takes the new cost and band — row and puzzle alike', async () => {
    const r = await repriceGameRecord('g1', { scorer });
    expect(r.priced).toBe(2);
    const a6 = await db.misconceptionTags.get('a6');
    expect(a6?.cpLoss).toBe(320);
    expect(a6?.grade).not.toBe('inaccuracy');
    expect(['mistake', 'blunder']).toContain(a6?.grade);
    const puzzle = await db.mistakePuzzles.get('p-a6');
    expect(puzzle?.cpLoss).toBe(320);
    expect(puzzle?.classification).toBe(a6?.grade);
    // The annotation carries the one price, so every later read uses it.
    const game = await db.games.get('g1');
    expect(measuredCpLoss(game!.annotations![1])).toBe(320);
    expect(game?.annotations?.[1].classification).toBe(a6?.grade);
    expect(r.rowsRelabeled).toBe(1);
    expect(r.puzzlesRelabeled).toBe(1);
  });

  it('a slip the one search does NOT confirm is counted, its row left for David\'s call', async () => {
    const r = await repriceGameRecord('g1', { scorer });
    expect(r.rowsNotAFault).toBe(1);
    expect((await db.misconceptionTags.get('h6'))).toMatchObject({ grade: 'inaccuracy', cpLoss: 45 });
    const game = await db.games.get('g1');
    expect(game?.annotations?.[0]).toMatchObject({ classification: 'good', costCp: 20 });
  });

  it('a live-captured row is never touched — only rows built from the annotations', async () => {
    await repriceGameRecord('g1', { scorer });
    expect(await db.misconceptionTags.get('live')).toMatchObject({ cpLoss: 80, grade: 'inaccuracy' });
  });

  it('stamped per game: the next pass skips it and prices nothing (a killed app keeps finished games)', async () => {
    await db.games.put(buildGameRecord({ id: 'g2', pgn: PGN, fullyAnalyzed: true, studentSide: 'black', annotations: ANNOTATIONS }));
    expect((await gamesBehindPrice()).sort()).toEqual(['g1', 'g2']);
    await repriceGameRecord('g1', { scorer });
    // "Killed" here: g2 never ran. g1 is done for good.
    expect(await gamesBehindPrice()).toEqual(['g2']);
    expect((await db.games.get('g1'))?.recordPriceRev).toBe(RECORD_PRICE_REV);
    const calls = scorer.calls;
    const again = await repriceGameRecord('g1', { scorer });
    expect(again.priced).toBe(0);
    expect(scorer.calls).toBe(calls);
  });

  it('the boot pass re-prices a game BEFORE the record re-reads it, on the one schedule', async () => {
    const { reconcileMisconceptionRules } = await import('./misconceptionRulesBackfill');
    const { IMMEDIATE_BACKFILL_SCHEDULE } = await import('./backfillSchedule');
    const r = await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(r.repriced).toBe(1);
    expect(r.repricedRows).toBe(1);
    expect((await db.games.get('g1'))?.recordPriceRev).toBe(RECORD_PRICE_REV);
    expect((await db.misconceptionTags.get('a6'))?.cpLoss).toBe(320);
    // Done for this revision: the next boot prices nothing.
    const calls = scorer.calls;
    const again = await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(again.repriced).toBe(0);
    expect(scorer.calls).toBe(calls);
  }, 60_000);
});
