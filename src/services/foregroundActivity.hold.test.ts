import { describe, it, expect, beforeEach } from 'vitest';
import { boardInPlay, holdBackground, waitForForegroundQuiet, waitWhileHeld, backgroundHolds, __resetForegroundActivityForTests } from './foregroundActivity';
import { holdBatchAnalysis } from './gameAnalysisService';

describe('a Learn game holds every background pass (David 2026-10-19: "not while playing a chess game in learn")', () => {
  beforeEach(() => __resetForegroundActivityForTests());

  it('the quiet wait does not resolve while a hold is live, however long the student thinks', async () => {
    const release = holdBackground();
    let slept = 0;
    let done = false;
    const sleep = async (): Promise<void> => { slept += 1; if (slept === 5) release(); };
    await waitForForegroundQuiet(20_000, sleep).then(() => { done = true; });
    expect(done).toBe(true);
    expect(slept).toBeGreaterThanOrEqual(5);
  });

  it('per-row waits hold too, and a release frees only its own hold', async () => {
    const a = holdBackground();
    const b = holdBatchAnalysis();
    expect(backgroundHolds()).toBe(2);
    a(); a();
    expect(backgroundHolds()).toBe(1);
    let n = 0;
    await waitWhileHeld(async () => { n += 1; if (n === 3) b(); });
    expect(n).toBe(3);
    expect(backgroundHolds()).toBe(0);
  });

  it('NEGATIVE: with no hold the wait returns at once', async () => {
    let n = 0;
    await waitWhileHeld(async () => { n += 1; });
    expect(n).toBe(0);
  });
});

describe('a board in play holds background work — a Campaign scenario too (the Learn freeze, 2026-10-21)', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  // The K+Q mate scenario: loaded with no move history. The old rule (moves
  // played and not over) released the hold here, and on David's record the
  // 950-game re-read ran under the endgame.
  const KQ_SCENARIO = '8/1Q6/1K6/8/5k2/8/8/8 w - - 0 1';

  it('a scenario board with no moves yet is a game in play', () => {
    expect(boardInPlay({ historyLength: 0, fen: KQ_SCENARIO, isGameOver: false })).toBe(true);
  });
  it('moves played is a game in play', () => {
    expect(boardInPlay({ historyLength: 3, fen: KQ_SCENARIO, isGameOver: false })).toBe(true);
  });
  it('NEGATIVE: the untouched starting board is not a game yet, and a finished game holds nothing', () => {
    expect(boardInPlay({ historyLength: 0, fen: START, isGameOver: false })).toBe(false);
    expect(boardInPlay({ historyLength: 40, fen: KQ_SCENARIO, isGameOver: true })).toBe(false);
  });
});

