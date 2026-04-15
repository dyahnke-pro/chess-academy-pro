import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  configFromRating,
  configForDifficulty,
  resolveConfig,
  getCoachMove,
  __resetSkillCacheForTests,
} from './coachPlaySession';
import { stockfishEngine } from './stockfishEngine';

describe('configFromRating', () => {
  it('scales skill and movetime up with rating', () => {
    const low = configFromRating(800);
    const mid = configFromRating(1400);
    const high = configFromRating(2200);
    expect(low.skill).toBeLessThan(mid.skill);
    expect(mid.skill).toBeLessThan(high.skill);
    expect(low.moveTimeMs).toBeLessThan(high.moveTimeMs);
  });

  it('defaults gracefully when rating is undefined', () => {
    const cfg = configFromRating(undefined);
    expect(cfg.skill).toBeGreaterThan(0);
    expect(cfg.moveTimeMs).toBeGreaterThan(0);
    expect(cfg.label).toMatch(/level/i);
  });
});

describe('configForDifficulty', () => {
  it('ramps up with easy/medium/hard', () => {
    expect(configForDifficulty('easy').skill).toBeLessThan(
      configForDifficulty('medium').skill,
    );
    expect(configForDifficulty('medium').skill).toBeLessThan(
      configForDifficulty('hard').skill,
    );
  });
});

describe('resolveConfig', () => {
  it('uses rating match for auto', () => {
    const cfg = resolveConfig('auto', 2000);
    expect(cfg.label).toMatch(/expert|master/i);
  });

  it('uses explicit difficulty when provided', () => {
    const cfg = resolveConfig('easy', 2500);
    expect(cfg.label).toBe('Easy');
  });

  it('falls back to rating match when difficulty is undefined', () => {
    const cfg = resolveConfig(undefined, 1000);
    expect(cfg.label).toMatch(/casual|friendly/i);
  });
});

describe('getCoachMove', () => {
  beforeEach(() => {
    __resetSkillCacheForTests();
  });

  it('calls stockfish getBestMove and parses UCI', async () => {
    vi.spyOn(stockfishEngine, 'initialize').mockResolvedValue(undefined);
    vi.spyOn(stockfishEngine, 'getBestMove').mockResolvedValue('e2e4');

    const result = await getCoachMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      { skill: 10, moveTimeMs: 500, label: 'Medium' },
    );

    expect(result.uci).toBe('e2e4');
    expect(result.from).toBe('e2');
    expect(result.to).toBe('e4');
    expect(result.promotion).toBeUndefined();
  });

  it('parses promotion suffix', async () => {
    vi.spyOn(stockfishEngine, 'initialize').mockResolvedValue(undefined);
    vi.spyOn(stockfishEngine, 'getBestMove').mockResolvedValue('e7e8q');

    const result = await getCoachMove('8/4P3/8/8/8/8/8/k6K w - - 0 1', {
      skill: 20,
      moveTimeMs: 1000,
      label: 'Hard',
    });
    expect(result.promotion).toBe('q');
  });
});
