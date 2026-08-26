import { describe, it, expect } from 'vitest';
import { computeCriticality, criticalitySignalsFromAnalysis, type CriticalitySignals } from './criticality';

const base: CriticalitySignals = { volatility: 0, onlyMove: 0, trap: 0, forcing: 0, loose: 0, threat: 0 };

describe('computeCriticality — ported offline formula', () => {
  it('a calm position scores quiet', () => {
    // V=0.08, O=0.04 → base = 100·(0.42·0.08 + 0.20·0.04) = 4.16
    const r = computeCriticality({ ...base, volatility: 0.08, onlyMove: 0.04 });
    expect(r.score).toBe(4);
    expect(r.band).toBe('quiet');
  });

  it('high volatility + only-move + forcing reads critical', () => {
    // 100·(0.42·1 + 0.20·0.9 + 0.16·0.5 + 0.12·0.4 + 0.10·0.3) = 75.8
    const r = computeCriticality({ volatility: 1, onlyMove: 0.9, trap: 0.5, forcing: 0.4, loose: 0.3, threat: 0 });
    expect(r.score).toBe(76);
    expect(r.band).toBe('critical');
  });

  it('threat is ADDITIVE — it lifts a calm read, never deflates the base', () => {
    const calm = computeCriticality({ ...base, volatility: 0.4 }); // base 16.8 → 17
    expect(calm.score).toBe(17);
    // same base, plus a must-defend Tr=0.8 → 17 + 25·0.8 = 37
    const threatened = computeCriticality({ ...base, volatility: 0.4, threat: 0.8 });
    expect(threatened.score).toBe(37);
    expect(threatened.score).toBeGreaterThan(calm.score);
  });

  it('a concrete must-defend (≥3) floors the score into key', () => {
    const r = computeCriticality({ ...base, volatility: 0.1, threat: 0.6, threatRaw: 3 });
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.band).toBe('key');
  });

  it('hanging material (≥3) floors into key', () => {
    const r = computeCriticality({ ...base, loose: 1, looseRaw: 3 });
    expect(r.score).toBeGreaterThanOrEqual(55);
    expect(r.band).toBe('key');
  });

  it('a mate in the air floors into critical', () => {
    const r = computeCriticality({ ...base, mateInAir: true });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.band).toBe('critical');
  });

  it('degrades gracefully — absent signals count as 0, never a guess', () => {
    // volatility alone (the dominant weight) still produces an honest read
    const r = computeCriticality({ ...base, volatility: 0.62 });
    expect(r.score).toBe(26); // 100·0.42·0.62
    expect(r.band).toBe('think');
  });
});

describe('criticalitySignalsFromAnalysis — derive from a MultiPV fan', () => {
  const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });

  it('a wide spread reads high volatility', () => {
    const s = criticalitySignalsFromAnalysis({ topLines: [line(1, 500), line(2, 350), line(3, 20)], seldepth: 20, depth: 18, isMate: false });
    expect(s.volatility).toBeCloseTo(1, 5); // (500−20)/300 clamps to 1
  });

  it('one move far ahead reads high only-move', () => {
    const s = criticalitySignalsFromAnalysis({ topLines: [line(1, 300), line(2, 10), line(3, -20)], seldepth: 18, depth: 18, isMate: false });
    expect(s.onlyMove).toBeCloseTo(1, 5); // (300−10)/150 clamps to 1
  });

  it('a flat fan reads quiet, and the whole read lands quiet', () => {
    const s = criticalitySignalsFromAnalysis({ topLines: [line(1, 30), line(2, 25), line(3, 20)], seldepth: 18, depth: 18, isMate: false });
    expect(computeCriticality(s).band).toBe('quiet');
  });

  it('carries hanging material + must-defend through to the floors', () => {
    const s = criticalitySignalsFromAnalysis(
      { topLines: [line(1, 40), line(2, 30), line(3, 10)], seldepth: 18, depth: 18, isMate: false },
      { looseMaterial: 3, threatNet: 3 },
    );
    expect(computeCriticality(s).band).toBe('key'); // floored by both
  });

  it('a reported mate line lifts the read to critical', () => {
    const s = criticalitySignalsFromAnalysis({ topLines: [{ rank: 1, evaluation: 0, moves: [], mate: 3 }], seldepth: 25, depth: 18, isMate: true });
    expect(computeCriticality(s).band).toBe('critical');
  });
});
