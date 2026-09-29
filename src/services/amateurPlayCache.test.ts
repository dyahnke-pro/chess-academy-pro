import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ratingBandFor,
  getCachedAmateurPlay,
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
    // Delegates to ratingBands.explorerBandFor since 2026-09-17: this used to
    // return a LONE '2200' because its private bucket list stopped there and
    // had nothing to pair with. 2500 is a real explorer bucket.
    expect(ratingBandFor(2400).band).toBe('2200,2500');
  });
  it('defaults an unrated student to the lowest band — the app serves beginners (2026-09-23)', () => {
    expect(ratingBandFor(NaN).band).toBe('1000,1200');
  });
});

describe('cache-only reads', () => {
  it('getCachedAmateurPlay returns null cold and never calls the network', () => {
    expect(getCachedAmateurPlay(FEN)).toBeNull();
  });

});
