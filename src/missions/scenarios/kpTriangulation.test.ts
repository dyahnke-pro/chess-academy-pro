import { describe, expect, it } from 'vitest';
import { Chess, type Color, type Square } from 'chess.js';
import { exactWinner, winnerAfter, winningMovesUci } from '../checks/kpEndings';
import { triangulationDecision } from '../checks/kpTriangulation';
import { SCENARIOS, scenarioPosition } from './index';
import library from './kpTriangulation.json';

const COLOURS: readonly Color[] = ['w', 'b'];

/** The board with the other side to move. */
const passed = (fen: string): Chess => {
  const [placement, turn] = fen.split(' ');
  return new Chess(`${placement} ${turn === 'w' ? 'b' : 'w'} - - 0 1`);
};

describe('the Triangulation scenario library', () => {
  it('holds both colours, as many boards each, all distinct, on the library\'s structures and their mirrors', () => {
    expect(library.w.length).toBeGreaterThan(0);
    expect(library.b.length).toBe(library.w.length);
    expect(new Set(library.w.map((r) => r.fen)).size).toBe(library.w.length);
    // b5 + c4 against b6 (the lesson's), c5 + d4 against c6, and the mirrors.
    const allowed = [['bb6', 'wb5', 'wc4'], ['bg6', 'wf4', 'wg5'], ['bc6', 'wc5', 'wd4'], ['bf6', 'we4', 'wf5']];
    for (const row of library.w) {
      const pawns = new Chess(row.fen).board().flat().filter((p) => p && p.type === 'p').map((p) => `${p?.color}${p?.square}`).sort();
      expect(allowed, row.fen).toContainEqual(pawns);
    }
  });

  it('every board: the student to move and winning, lost for the defender to move, a decision board', () => {
    for (const colour of COLOURS) {
      for (const row of library[colour]) {
        const b = new Chess(row.fen);
        expect(b.turn(), row.fen).toBe(colour);
        expect(exactWinner(b), row.fen).toBe(colour);
        expect(exactWinner(passed(row.fen)), `${row.fen} defender to move`).toBe(colour);
        expect(triangulationDecision(b, colour), row.fen).toBe(true);
      }
    }
  });

  it('the key moves are exactly the winning moves, all king moves; the trap — the direct approach — draws', () => {
    for (const colour of COLOURS) {
      for (const row of library[colour]) {
        expect([...row.key].sort(), row.fen).toEqual(winningMovesUci(row.fen, colour).sort());
        const b = new Chess(row.fen);
        for (const uci of row.key) expect(b.get(uci.slice(0, 2) as Square)?.type, `${row.fen} ${uci}`).toBe('k');
        expect(row.key).not.toContain(row.trap);
        expect(winnerAfter(row.fen, row.trap), `${row.fen} ${row.trap}`).not.toBe(colour);
      }
    }
  });

  it('PROPERTY: over 1,000 seeds the provider returns only library boards of the right colour, and reaches each', () => {
    for (const colour of COLOURS) {
      const seen = new Set<string>();
      for (let seed = -500; seed < 500; seed++) {
        const fen = scenarioPosition('kp-triangulation', colour, seed);
        expect(fen).not.toBeNull();
        expect(new Chess(fen as string).turn()).toBe(colour);
        seen.add(fen as string);
      }
      expect(seen.size).toBe(library[colour].length);
    }
    expect(SCENARIOS['kp-triangulation'].size('b')).toBe(library.b.length);
  });
});
