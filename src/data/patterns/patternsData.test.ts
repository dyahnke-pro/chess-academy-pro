/**
 * THE MINED PATTERN FILES agree with the pattern checks that made them
 * (`scripts/patterns/mine.mjs`). Every example must still read present and
 * every fail twin false — so a check that changes after the mine fails here
 * until the files are mined again — and the numbers must add up.
 */
import { describe, expect, it } from 'vitest';
import { PATTERN_IDS, PATTERN_PROBES } from '../../missions/patterns';
import { isLegalBoard, type LastMove } from '../../missions/patterns/board';
import type { PatternId } from '../../missions/missionCard';

interface Board { source: string; game: string; ply: number; side: 'w' | 'b'; fen: string; last: LastMove }
interface Report {
  id: PatternId;
  module: string;
  nearMissCodes: string[];
  gamesScanned: number;
  positionsScanned: number;
  positionsFound: number;
  gamesWithPattern: number;
  arrivalRate: number;
  firstPly: { median: number | null; p25: number | null; p75: number | null };
  colour: { white: number; black: number };
  bySource: Array<{ source: string; games: number; positions: number; gamesWithPattern: number; positionsFound: number }>;
  openings: Array<{ opening: string; gamesWithPattern: number; games: number; rate: number; shrunkRate: number }>;
  examples: Board[];
  failTwins: Array<Board & { missing: string }>;
  sources: Array<{ source: string; games: number }>;
}

const files = import.meta.glob<Report>('./*.json', { eager: true, import: 'default' });
const report = (id: PatternId): Report => {
  const r = files[`./${id}.json`] as Report | undefined;
  if (!r) throw new Error(`src/data/patterns/${id}.json is missing — run scripts/patterns/mine.mjs`);
  return r;
};
const round4 = (x: number): number => Math.round(x * 1e4) / 1e4;

const read = (id: PatternId, b: Board): boolean => {
  const p = PATTERN_PROBES[id];
  return p.presentAfter ? p.presentAfter(b.fen, b.last, b.side) : p.present(b.fen, b.side);
};
const misses = (id: PatternId, b: Board): readonly string[] => {
  const p = PATTERN_PROBES[id];
  return p.nearMissesAfter ? p.nearMissesAfter(b.fen, b.last, b.side) : p.nearMisses(b.fen, b.side);
};

describe('mined pattern files', () => {
  it('there is one file per pattern and nothing else', () => {
    expect(Object.keys(files).sort()).toEqual(PATTERN_IDS.map((id) => `./${id}.json`).sort());
  });

  for (const id of PATTERN_IDS) {
    describe(id, () => {
      it('is filed under its id, with the check its names come from', () => {
        const r = report(id);
        expect(r.id).toBe(id);
        expect(r.module).toBe(`src/missions/patterns/${id}.ts`);
        expect(r.nearMissCodes).toEqual([...PATTERN_PROBES[id].nearMissCodes].sort());
      });

      it('its numbers add up', () => {
        const r = report(id);
        expect(r.gamesScanned).toBe(r.sources.reduce((n, s) => n + s.games, 0));
        expect(r.gamesScanned).toBe(r.bySource.reduce((n, s) => n + s.games, 0));
        expect(r.positionsScanned).toBe(r.bySource.reduce((n, s) => n + s.positions, 0));
        expect(r.positionsFound).toBe(r.bySource.reduce((n, s) => n + s.positionsFound, 0));
        expect(r.gamesWithPattern).toBe(r.bySource.reduce((n, s) => n + s.gamesWithPattern, 0));
        expect(r.gamesWithPattern).toBe(r.colour.white + r.colour.black);
        expect(r.arrivalRate).toBe(round4(r.gamesWithPattern / r.gamesScanned));
        for (const o of r.openings) {
          expect(o.rate).toBe(round4(o.gamesWithPattern / o.games));
          // Shrunk toward the pattern's overall rate: between it and the family's own.
          const base = r.gamesWithPattern / r.gamesScanned;
          expect(o.shrunkRate).toBe(round4((o.gamesWithPattern + 20 * base) / (o.games + 20)));
        }
        for (let i = 1; i < r.openings.length; i++) {
          const [a, b] = [r.openings[i - 1], r.openings[i]];
          const order = [b.shrunkRate - a.shrunkRate, b.rate - a.rate, b.gamesWithPattern - a.gamesWithPattern].find((d) => d !== 0);
          expect(order === undefined ? a.opening < b.opening : order < 0, `${a.opening} before ${b.opening}`).toBe(true);
        }
      });

      it('every example is a legal board on which the pattern is present', () => {
        const r = report(id);
        if (r.gamesWithPattern > 0) expect(r.examples.length).toBeGreaterThan(0);
        for (const b of r.examples) {
          expect(isLegalBoard(b.fen), b.fen).toBe(true);
          expect(read(id, b), `${b.source} ${b.game} ply ${b.ply}`).toBe(true);
        }
      });

      it('every fail twin is a legal board one named condition short', () => {
        const r = report(id);
        expect(r.failTwins.length).toBeGreaterThan(0);
        expect(r.failTwins.length).toBeLessThanOrEqual(20);
        for (const t of r.failTwins) {
          expect(isLegalBoard(t.fen), t.fen).toBe(true);
          expect(read(id, t), `${t.source} ${t.game} ply ${t.ply}`).toBe(false);
          expect(misses(id, t), `${t.source} ${t.game} ply ${t.ply}`).toContain(t.missing);
        }
      });
    });
  }
});
