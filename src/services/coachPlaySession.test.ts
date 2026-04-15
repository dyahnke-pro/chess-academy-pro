import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  configFromTargetElo,
  resolveConfig,
  getCoachMove,
  __resetSkillCacheForTests,
} from './coachPlaySession';
import { stockfishEngine } from './stockfishEngine';

describe('configFromTargetElo', () => {
  it('scales skill and movetime up with target ELO', () => {
    const low = configFromTargetElo(800);
    const mid = configFromTargetElo(1500);
    const high = configFromTargetElo(2200);
    expect(low.skill).toBeLessThan(mid.skill);
    expect(mid.skill).toBeLessThan(high.skill);
    expect(low.moveTimeMs).toBeLessThan(high.moveTimeMs);
  });

  it('clamps values at the anchor extremes', () => {
    const underLow = configFromTargetElo(200);
    const overHigh = configFromTargetElo(3500);
    expect(underLow.skill).toBeGreaterThanOrEqual(0);
    expect(underLow.skill).toBeLessThanOrEqual(20);
    expect(overHigh.skill).toBeGreaterThanOrEqual(0);
    expect(overHigh.skill).toBeLessThanOrEqual(20);
  });

  it('carries the target ELO in the label and targetElo field', () => {
    const cfg = configFromTargetElo(1650);
    expect(cfg.targetElo).toBe(1650);
    expect(cfg.label).toContain('1650');
  });

  it('interpolates between anchors (not a hard threshold)', () => {
    // Between 1200 (skill 5) and 1500 (skill 9).
    const mid = configFromTargetElo(1350);
    expect(mid.skill).toBeGreaterThan(5);
    expect(mid.skill).toBeLessThan(9);
  });
});

describe('resolveConfig — ELO relative difficulty', () => {
  it('easy subtracts ~300 ELO from the player', () => {
    const easy = resolveConfig('easy', 1500);
    expect(easy.targetElo).toBe(1200);
    expect(easy.label).toContain('Easy');
    expect(easy.label).toContain('1200');
  });

  it('medium matches the player', () => {
    const med = resolveConfig('medium', 1500);
    expect(med.targetElo).toBe(1500);
    expect(med.label).toContain('Medium');
    expect(med.label).toContain('1500');
  });

  it('hard adds ~300 ELO to the player', () => {
    const hard = resolveConfig('hard', 1500);
    expect(hard.targetElo).toBe(1800);
    expect(hard.label).toContain('Hard');
    expect(hard.label).toContain('1800');
  });

  it('auto acts as medium', () => {
    const auto = resolveConfig('auto', 1700);
    const med = resolveConfig('medium', 1700);
    expect(auto.targetElo).toBe(med.targetElo);
    expect(auto.skill).toBe(med.skill);
  });

  it('undefined difficulty falls back to auto (medium)', () => {
    const cfg = resolveConfig(undefined, 1200);
    expect(cfg.targetElo).toBe(1200);
  });

  it('easy difficulty produces a weaker config than hard for same player', () => {
    const easy = resolveConfig('easy', 1600);
    const hard = resolveConfig('hard', 1600);
    expect(easy.skill).toBeLessThan(hard.skill);
    expect(easy.moveTimeMs).toBeLessThanOrEqual(hard.moveTimeMs);
  });

  it('floors target ELO at a reasonable minimum', () => {
    const cfg = resolveConfig('easy', 400);
    expect(cfg.targetElo).toBeGreaterThanOrEqual(400);
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
      { skill: 10, moveTimeMs: 500, targetElo: 1500, label: 'Medium (~1500)' },
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
      targetElo: 2400,
      label: 'Hard (~2400)',
    });
    expect(result.promotion).toBe('q');
  });
});
