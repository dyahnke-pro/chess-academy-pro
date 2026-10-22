import { describe, expect, it } from 'vitest';
import { Chess, type Color } from 'chess.js';
import { exactWinner, winnerAfter, winningMovesUci } from '../checks/kpEndings';
import { outflankDecision } from '../checks/kpOutflanking';
import { SCENARIOS, scenarioPosition } from './index';
import library from './kpOutflanking.json';

const COLOURS: readonly Color[] = ['w', 'b'];

/** Flip a board top to bottom and swap the colours. */
function mirror(fen: string): string {
  const [placement, turn] = fen.split(' ');
  const rows = placement.split('/').reverse().map((r) => r.replace(/[a-zA-Z]/g, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())));
  return `${rows.join('/')} ${turn === 'w' ? 'b' : 'w'}`;
}

describe('the Outflanking scenario library', () => {
  it('holds the same boards for both colours, each a mirror of the other, all distinct', () => {
    expect(library.w.length).toBeGreaterThanOrEqual(40);
    expect(library.b.length).toBe(library.w.length);
    expect(new Set(library.w.map((r) => r.fen)).size).toBe(library.w.length);
    library.w.forEach((r, i) => expect(mirror(r.fen)).toBe(library.b[i].fen.split(' ').slice(0, 2).join(' ')));
  });

  it('every board meets the rule: legal, the student to move and winning, the decision on the board', () => {
    for (const colour of COLOURS) {
      for (const row of library[colour]) {
        const b = new Chess(row.fen);
        expect(b.turn(), row.fen).toBe(colour);
        expect(b.isGameOver(), row.fen).toBe(false);
        expect(exactWinner(b), row.fen).toBe(colour);
        expect(outflankDecision(b, colour), row.fen).toBe(true);
      }
    }
  });

  it('every key move is a winning sidestep and every winning move is a key move; the trap lets them draw', () => {
    for (const colour of COLOURS) {
      for (const row of library[colour]) {
        expect([...row.key].sort(), row.fen).toEqual(winningMovesUci(row.fen, colour).sort());
        for (const uci of row.key) expect(uci[1], `${row.fen} ${uci}`).toBe(uci[3]);
        expect(row.key, row.fen).not.toContain(row.trap);
        expect(winnerAfter(row.fen, row.trap), `${row.fen} ${row.trap}`).not.toBe(colour);
      }
    }
  });

  it('the trap is the natural wrong move: the pawn run where the pawn can move', () => {
    for (const row of library.w) {
      const b = new Chess(row.fen);
      const pawnMoves = b.moves({ verbose: true }).filter((m) => m.piece === 'p');
      if (pawnMoves.length > 0) expect(pawnMoves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`), row.fen).toContain(row.trap);
    }
  });

  it('PROPERTY: over 1,000 seeds the provider returns only library boards of the right colour, and reaches each', () => {
    for (const colour of COLOURS) {
      const seen = new Set<string>();
      for (let seed = -500; seed < 500; seed++) {
        const fen = scenarioPosition('kp-outflanking', colour, seed);
        expect(fen).not.toBeNull();
        expect(new Chess(fen as string).turn()).toBe(colour);
        seen.add(fen as string);
      }
      expect(seen.size).toBe(library[colour].length);
    }
    expect(SCENARIOS['kp-outflanking'].size('w')).toBe(library.w.length);
  });
});
