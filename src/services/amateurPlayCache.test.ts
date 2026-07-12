import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ratingBandFor,
  getCachedAmateurPlay,
  buildRatingRealityFact,
  __clearAmateurPlayCache,
  __seedAmateurPlayCache,
} from './amateurPlayCache';

// THE RATE-LIMIT CONTRACT: reads never touch the network. The explorer client
// is mocked to THROW so any network attempt from a read path fails the test.
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: vi.fn(() => { throw new Error('NETWORK CALL FROM A READ PATH'); }),
}));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => __clearAmateurPlayCache());

describe('ratingBandFor', () => {
  it('brackets the rating with adjacent buckets', () => {
    expect(ratingBandFor(1450).band).toBe('1400,1600');
    expect(ratingBandFor(1450).bandLabel).toContain('1400–1600');
    expect(ratingBandFor(950).band).toBe('1000,1200');
    expect(ratingBandFor(2400).band).toBe('2200');
  });
  it('defaults sanely on garbage', () => {
    expect(ratingBandFor(NaN).band).toBe('1600,1800');
  });
});

describe('cache-only reads', () => {
  it('getCachedAmateurPlay returns null cold and never calls the network', () => {
    expect(getCachedAmateurPlay(FEN)).toBeNull();
  });

  it('buildRatingRealityFact needs BOTH sides warm and ≥50 games each', () => {
    expect(buildRatingRealityFact(FEN, { san: 'e4', pct: 45, totalGames: 1000 })).toBeNull();
    __seedAmateurPlayCache(FEN, {
      band: '1400,1600', bandLabel: 'around 1400–1600', totalGames: 30,
      moves: [{ san: 'e4', games: 15, pct: 50 }],
    });
    expect(buildRatingRealityFact(FEN, { san: 'e4', pct: 45, totalGames: 1000 })).toBeNull(); // amateur < 50g
    __clearAmateurPlayCache();
    __seedAmateurPlayCache(FEN, {
      band: '1400,1600', bandLabel: 'around 1400–1600', totalGames: 800,
      moves: [{ san: 'd4', games: 400, pct: 50 }],
    });
    expect(buildRatingRealityFact(FEN, { san: 'e4', pct: 45, totalGames: 40 })).toBeNull(); // masters < 50g
  });

  it('composes the split when amateurs and masters disagree', () => {
    __seedAmateurPlayCache(FEN, {
      band: '1400,1600', bandLabel: 'around 1400–1600', totalGames: 800,
      moves: [{ san: 'd4', games: 400, pct: 50 }],
    });
    const fact = buildRatingRealityFact(FEN, { san: 'e4', pct: 45, totalGames: 1000 });
    expect(fact).toContain('d4');
    expect(fact).toContain('e4');
    expect(fact).toContain('masters prefer');
    expect(fact).toContain('around 1400–1600');
  });

  it('composes the agreement fact when both pick the same move', () => {
    __seedAmateurPlayCache(FEN, {
      band: '1400,1600', bandLabel: 'around 1400–1600', totalGames: 800,
      moves: [{ san: 'e4', games: 400, pct: 50 }],
    });
    const fact = buildRatingRealityFact(FEN, { san: 'e4', pct: 45, totalGames: 1000 });
    expect(fact).toContain('agree');
  });
});
