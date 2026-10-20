import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { roadsFrom, isRoadFork, roadLabel, roadForkId } from './branchExplorer';
import { __setLocalDbForTests } from './masterPlayLookup';
import { positionFen } from './masterPlayCache';

// The open Sicilian fork after 5.Nc3 (David 2026-10-19: Learn's computer
// plays what players at the student's level play most, and offers the rest).
const HISTORY = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'];
const board = (): string => { const c = new Chess(); for (const s of HISTORY) c.move(s); return c.fen(); };

afterEach(() => __setLocalDbForTests(null));

describe('the adventure book: roads at their fork, from the student\'s own level', () => {
  it('the band\'s moves are the roads, most played first; a rare move is not a road', () => {
    const roads = roadsFrom(board(), HISTORY, [
      { san: 'Nc6', games: 900 }, { san: 'a6', games: 2400 }, { san: 'g6', games: 700 }, { san: 'e6', games: 400 }, { san: 'h6', games: 30 },
    ]);
    expect(isRoadFork(roads)).toBe(true);
    expect(roads.map((r) => r.san)).toEqual(['a6', 'Nc6', 'g6', 'e6']);
    expect(roadLabel(roads[0])).toMatch(/Najdorf/);
  });

  it('the masters\' main line is marked, and added when the band never plays it', () => {
    __setLocalDbForTests({ positions: { [positionFen(board())]: [{ san: 'a6', games: 125648 }, { san: 'Nc6', games: 24485 }] } });
    const withMain = roadsFrom(board(), HISTORY, [{ san: 'Nc6', games: 900 }, { san: 'g6', games: 700 }]);
    expect(withMain.map((r) => [r.san, r.main])).toEqual([['Nc6', false], ['g6', false], ['a6', true]]);
    const marked = roadsFrom(board(), HISTORY, [{ san: 'a6', games: 900 }, { san: 'g6', games: 700 }]);
    expect(marked.find((r) => r.san === 'a6')?.main).toBe(true);
  });

  it('one road is not a fork; an illegal candidate is never a road', () => {
    expect(isRoadFork(roadsFrom(board(), HISTORY, [{ san: 'a6', games: 900 }]))).toBe(false);
    expect(roadsFrom(board(), HISTORY, [{ san: 'Qxh7', games: 900 }, { san: 'a6', games: 900 }]).map((r) => r.san)).toEqual(['a6']);
  });

  it('a fork is keyed by its position, so a transposition shares its walked roads', () => {
    expect(roadForkId(board())).toBe(board().split(' ').slice(0, 4).join(' '));
  });
});
