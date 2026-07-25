import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeThreatDelta, bestLineDeltaFromPv } from './engineDeltaLines';
import type { PvLine } from './pvPlayback';

/** Position where the side that just moved creates a concrete threat. */
function afterMoves(sans: string[]): { before: string; after: string } {
  const c = new Chess();
  for (let i = 0; i < sans.length - 1; i++) c.move(sans[i]);
  const before = c.fen();
  c.move(sans[sans.length - 1]);
  return { before, after: c.fen() };
}

describe('computeThreatDelta', () => {
  it('returns null when the move creates no concrete threat', () => {
    const { before, after } = afterMoves(['e4', 'e5']); // quiet
    expect(computeThreatDelta(before, after, 'b')).toBeNull();
  });

  it('draws + voices a threat as an arrow on the static board when one exists', () => {
    // Scholar's-mate setup: after 1.e4 e5 2.Bc4 Nc6 3.Qh5, White threatens Qxf7#.
    const { before, after } = afterMoves(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']);
    const d = computeThreatDelta(before, after, 'w');
    expect(d).toBeTruthy();
    expect(d!.arrows).toHaveLength(1);
    // arrow origin is a real occupied square on the static (post-move) board
    expect(new Chess(after).get(d!.arrows[0].from as never)).toBeTruthy();
    expect(d!.say).toMatch(/threatening/);
    expect(d!.say.startsWith('And now White')).toBe(true);
  });

  it('never throws on a malformed FEN', () => {
    expect(computeThreatDelta('bad', 'fen', 'w')).toBeNull();
  });
});

describe('bestLineDeltaFromPv', () => {
  it('returns null on an empty / missing PV', () => {
    expect(bestLineDeltaFromPv(null)).toBeNull();
    expect(bestLineDeltaFromPv({ plies: [] } as unknown as PvLine)).toBeNull();
  });

  it('draws the engine best move (green) + names the line', () => {
    const pv = {
      plies: [
        { san: 'Nf3', uci: 'g1f3', moverColor: 'white', fenBefore: '', fenAfter: '', facts: {} },
        { san: 'Nc6', uci: 'b8c6', moverColor: 'black', fenBefore: '', fenAfter: '', facts: {} },
        { san: 'Bb5', uci: 'f1b5', moverColor: 'white', fenBefore: '', fenAfter: '', facts: {} },
      ],
    } as unknown as PvLine;
    const d = bestLineDeltaFromPv(pv);
    expect(d).toBeTruthy();
    expect(d!.arrows).toEqual([{ from: 'g1', to: 'f3', color: 'green' }]);
    expect(d!.say).toContain('Nf3');
    expect(d!.say).toContain('Bb5'); // names the short line
  });
});
