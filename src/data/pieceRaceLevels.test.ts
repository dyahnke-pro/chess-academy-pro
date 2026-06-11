import { describe, it, expect } from 'vitest';
import { PIECE_RACE_LEVELS } from './pieceRaceLevels';
import { getPieceRaceLegalMoves, raceStars } from '../services/pieceRaceService';

const FILES = 'abcdefgh';
const isSquare = (s: string): boolean => /^[a-h][1-8]$/.test(s);
const colorOf = (s: string): number =>
  (FILES.indexOf(s[0]) + parseInt(s[1], 10)) % 2;

// BFS: can the piece capture every target from the start, in some order?
function captureAllSolvable(piece: typeof PIECE_RACE_LEVELS[number]): boolean {
  const obstacles = new Set(piece.obstacles ?? []);
  const key = (pos: string, rem: ReadonlySet<string>): string =>
    `${pos}|${[...rem].sort().join(',')}`;
  let frontier: Array<[string, Set<string>]> = [[piece.pieceStart, new Set(piece.targets)]];
  const seen = new Set([key(piece.pieceStart, new Set(piece.targets))]);
  let depth = 0;
  while (frontier.length) {
    const next: Array<[string, Set<string>]> = [];
    for (const [pos, rem] of frontier) {
      if (rem.size === 0) return true;
      for (const mv of getPieceRaceLegalMoves(piece.piece, pos, obstacles, rem)) {
        const nr = new Set(rem);
        nr.delete(mv);
        const k = key(mv, nr);
        if (!seen.has(k)) { seen.add(k); next.push([mv, nr]); }
      }
    }
    frontier = next;
    if (++depth > 40) return false;
  }
  return false;
}

describe('PIECE_RACE_LEVELS', () => {
  it('has at least one course per racing piece', () => {
    for (const piece of ['knight', 'bishop', 'rook', 'queen', 'king']) {
      expect(PIECE_RACE_LEVELS.some((l) => l.piece === piece)).toBe(true);
    }
  });

  for (const lvl of PIECE_RACE_LEVELS) {
    describe(`${lvl.piece} race ${lvl.id} (${lvl.name})`, () => {
      it('has valid, unique squares', () => {
        expect(isSquare(lvl.pieceStart)).toBe(true);
        expect(lvl.targets.length).toBeGreaterThanOrEqual(2);
        const all = [lvl.pieceStart, ...lvl.targets, ...(lvl.obstacles ?? [])];
        expect(new Set(all).size).toBe(all.length);
        for (const sq of lvl.targets) expect(isSquare(sq)).toBe(true);
      });

      it('bishop courses keep targets on the bishop’s color', () => {
        if (lvl.piece !== 'bishop') return;
        for (const t of lvl.targets) {
          expect(colorOf(t)).toBe(colorOf(lvl.pieceStart));
        }
      });

      it('has sane star thresholds', () => {
        expect(lvl.goldSec).toBeGreaterThan(0);
        expect(lvl.silverSec).toBeGreaterThan(lvl.goldSec);
      });

      it('is capture-all solvable', () => {
        expect(captureAllSolvable(lvl)).toBe(true);
      });
    });
  }
});

describe('raceStars', () => {
  it('scores 3 / 2 / 1 by time thresholds', () => {
    expect(raceStars(10, 12, 24)).toBe(3);
    expect(raceStars(12, 12, 24)).toBe(3);
    expect(raceStars(20, 12, 24)).toBe(2);
    expect(raceStars(24, 12, 24)).toBe(2);
    expect(raceStars(40, 12, 24)).toBe(1);
  });
});
