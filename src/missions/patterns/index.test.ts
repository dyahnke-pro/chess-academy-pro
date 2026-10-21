import { describe, expect, it } from 'vitest';
import { PATTERN_IDS, PATTERN_PROBES, PATTERNS } from './index';
import { isLegalBoard } from './board';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('the pattern library', () => {
  it('has one check per PatternId, filed under its own id', () => {
    expect(PATTERN_IDS.length).toBe(9);
    for (const id of PATTERN_IDS) {
      expect(PATTERN_PROBES[id].id).toBe(id);
      expect(PATTERNS[id]).toBe(PATTERN_PROBES[id]);
    }
  });

  it('every pattern names its near misses, and ships fail twins that are legal and read false', () => {
    for (const id of PATTERN_IDS) {
      const p = PATTERN_PROBES[id];
      expect(p.nearMissCodes.length, id).toBeGreaterThan(0);
      expect([...p.nearMissCodes].sort(), id).toEqual([...p.nearMissCodes]);
      expect(p.failTwins.length, id).toBeGreaterThan(0);
      for (const fen of p.failTwins) {
        expect(isLegalBoard(fen), `${id} twin ${fen}`).toBe(true);
        expect(p.present(fen, 'w') || p.present(fen, 'b'), `${id} twin ${fen}`).toBe(false);
      }
    }
  });

  it('nothing is present on the starting position', () => {
    for (const id of PATTERN_IDS) {
      expect(PATTERNS[id].present(START, 'w'), id).toBe(false);
      expect(PATTERNS[id].present(START, 'b'), id).toBe(false);
    }
  });

  it('a board chess.js will not load reads false and throws nothing', () => {
    for (const id of PATTERN_IDS) {
      expect(PATTERNS[id].present('not a fen', 'w'), id).toBe(false);
      expect(PATTERN_PROBES[id].nearMisses('not a fen', 'w'), id).toEqual([]);
    }
  });
});
