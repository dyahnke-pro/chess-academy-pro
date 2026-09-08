import { describe, it, expect } from 'vitest';
import {
  expectedBookDepthPlies,
  bookDepartureCostThresholdCp,
  bookDepartureIsCostly,
  aggregateBookDepartures,
  bookDepartureCluster,
  type BookDepartureRow,
} from './bookDepartureWeakness';
import { conceptForCluster } from './weaknessConceptMap';

function row(over: Partial<BookDepartureRow> = {}): BookDepartureRow {
  return {
    gameId: 'g1', departurePly: 5, departedSan: 'a6', mainSan: 'Nf3', bookFen: 'fen',
    evalCostCp: 150, openingId: 'caro-kann', openingName: 'Caro-Kann', playedAt: 1000, ...over,
  };
}

describe('bookDepartureWeakness — adaptive tiers', () => {
  it('expected book depth is deeper for stronger', () => {
    expect(expectedBookDepthPlies(900)).toBeLessThan(expectedBookDepthPlies(1600));
    expect(expectedBookDepthPlies(1600)).toBeLessThan(expectedBookDepthPlies(2200));
  });
  it('cost threshold is stricter (smaller) for stronger players', () => {
    expect(bookDepartureCostThresholdCp(1200)).toBeGreaterThan(bookDepartureCostThresholdCp(1600));
    expect(bookDepartureCostThresholdCp(1600)).toBeGreaterThan(bookDepartureCostThresholdCp(2100));
  });
});

describe('bookDepartureIsCostly — too early AND it hurt', () => {
  it('flags an early, costly departure', () => {
    expect(bookDepartureIsCostly(row({ departurePly: 4, evalCostCp: 150 }), 1400)).toBe(true);
  });
  it('does NOT flag a departure into a fine sideline (no cost)', () => {
    expect(bookDepartureIsCostly(row({ departurePly: 4, evalCostCp: 20 }), 1400)).toBe(false);
  });
  it('does NOT flag a LATE departure (past expected book depth = normal play)', () => {
    expect(bookDepartureIsCostly(row({ departurePly: 20, evalCostCp: 300 }), 1400)).toBe(false);
  });
  it('rating-relative: the same ply-6 departure is a hole for a 900, normal for a 2200', () => {
    const r = row({ departurePly: 7, evalCostCp: 120 });
    expect(bookDepartureIsCostly(r, 900)).toBe(false);  // past a 900's ~6-ply book
    expect(bookDepartureIsCostly(r, 2200)).toBe(true);  // well inside a 2200's book, and it cost
  });
});

describe('aggregateBookDepartures — recurrence + shape', () => {
  it('surfaces a recurring costly departure as an opening-bucket weakness', () => {
    const rows = [
      row({ gameId: 'g1', departurePly: 4, evalCostCp: 160 }),
      row({ gameId: 'g2', departurePly: 5, evalCostCp: 140 }),
    ];
    const out = aggregateBookDepartures(rows, 1400);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe(bookDepartureCluster('caro-kann'));
    expect(out[0].bucket).toBe('opening');
    expect(out[0].openCount).toBe(2);
    expect(out[0].label).toMatch(/Caro-Kann/);
    expect(out[0].severity).toBeGreaterThan(0);
    expect(out[0].positions.length).toBe(2);
  });
  it('a ONE-OFF costly departure is NOT a weakness (recurrence floor)', () => {
    expect(aggregateBookDepartures([row({ evalCostCp: 200 })], 1400)).toHaveLength(0);
  });
  it('drops departures that were not costly before grouping', () => {
    const rows = [row({ gameId: 'g1', evalCostCp: 10 }), row({ gameId: 'g2', evalCostCp: 15 })];
    expect(aggregateBookDepartures(rows, 1400)).toHaveLength(0);
  });
  it('groups per opening; a null-opening bucket is shared', () => {
    const rows = [
      row({ gameId: 'g1', openingId: null, openingName: null, evalCostCp: 150 }),
      row({ gameId: 'g2', openingId: null, openingName: null, evalCostCp: 150 }),
    ];
    const out = aggregateBookDepartures(rows, 1400);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe(bookDepartureCluster(null));
    expect(out[0].label).toMatch(/opening book/i);
  });
});

describe('conceptForCluster — book-departure teaches opening theory', () => {
  it('maps the cluster to the opening-theory concept (not the generic fallback)', () => {
    const c = conceptForCluster(bookDepartureCluster('caro-kann'), 'opening');
    expect(c?.conceptName).toMatch(/opening theory/i);
    expect(c?.behavior).toMatch(/leave opening theory early/i);
    // the bare (no-opening) cluster resolves too
    expect(conceptForCluster(bookDepartureCluster(null), 'opening')?.conceptName).toMatch(/opening theory/i);
  });
});
