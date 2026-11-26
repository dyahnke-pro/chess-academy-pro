import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { tradeRelievesCramp } from './tradeRelievesCramp';

// Danya have-check board positional-combinations#0; the engine's top lines as dumped (White's view).
const L = [{"moves": ["d6h2", "g1h1", "d7b6", "c4f1", "c8f5", "e4f5", "h2f4", "c1f4", "c7f4", "g2g3"], "cp": -14, "mate": null}, {"moves": ["d6f8", "c1g5", "h7h6", "g5h4", "f6h5", "c2d2", "d7b6", "c4e2", "c8f5", "e4f5"], "cp": 7, "mate": null}, {"moves": ["d6e5", "f2f4", "e5f4", "c1f4", "c7f4", "f5d6", "e8f8", "c4f7", "f8f7", "c2b3"], "cp": 10, "mate": null}];
// Negative control: mysterious-gm-moves#3.
const N = [{"moves": ["g2f3", "a7a5", "f3e2", "b7b5", "e2d1", "g7g6", "h5h6", "f7g7", "d1c2", "g8h8"], "cp": 71, "mate": null}, {"moves": ["g2h3", "g7g6", "h5h6", "b7b5", "h3g2", "g8h8", "f1e1", "f7g7", "g2f3", "f8g8"], "cp": 60, "mate": null}, {"moves": ["g1h2", "b7b5", "g2f3", "a7a5", "h2g2", "f8b8", "g2g1", "f5f4", "g3g4", "b8f8"], "cp": 56, "mate": null}];

describe('tradeRelievesCramp', () => {
  it('reads the Danya board', () => {
    const r = tradeRelievesCramp('r1b1r1k1/1pqn1ppp/p1pb1n2/5N2/2B1P3/2N4P/PPQ2PP1/R1BR2K1 b - - 0 14', L, 'b');
    expect(r?.trade).toBe('Bxf5');
    expect(r?.text).toContain('knight on f5');
  });
  it('stays silent where the board does not have it', () => {
    expect(tradeRelievesCramp('5rk1/pp2qrpp/4b3/3pPp1Q/2pP3P/P1P3P1/1P3RB1/5RK1 w - - 0 25', N, 'w')).toBeNull();
  });
  // Marks sweep 2026-11-19: "Bxc3 would take off your knight on c3" drew
  // nothing — the trade sits moves into the engine's line, legal on no board
  // the walk shows.
  it('carries the line to its trade: from the board, through the trade and its take-back', () => {
    const fen = 'r1b1r1k1/1pqn1ppp/p1pb1n2/5N2/2B1P3/2N4P/PPQ2PP1/R1BR2K1 b - - 0 14';
    const r = tradeRelievesCramp(fen, L, 'b');
    expect(r?.line.fen).toBe(fen);
    const sans = r?.line.sans ?? [];
    expect(sans.at(-2)).toBe(r?.trade);
    const c = new Chess(fen);
    const moves = sans.map((s) => c.move(s));
    expect(moves.at(-1)?.to).toBe(r?.target);
    expect(moves.at(-1)?.captured).toBeTruthy();
  });
});

// learn-mistakes-only bug 5: the target is named as it stands NOW. g
// chesscom-1012441262 ply 16 …Bg4: "Bxf3 would take off your knight on f3"
// with White's queen on f3 (the knight reaches f3 later in the line).
describe('the trade is said only when its pieces stand there now', () => {
  it('never "your knight on f3" with the queen on f3', async () => {
    const { Chess } = await import('chess.js');
    const c = new Chess();
    for (const m of 'e4 g6 d4 Bg7 Nf3 d6 Bc4 Nc6 Bxf7+ Kxf7 Ng5+ Ke8 Qf3 Nf6 c3 Bg4'.split(' ')) c.move(m);
    const after = [
      { moves: ['f3d3', 'h7h6', 'g5f3', 'g4h5', 'd4d5', 'h5f3', 'd3f3', 'c6e5'], cp: -351, mate: null },
      { moves: ['f3e3', 'h7h6', 'g5f3', 'e7e5', 'd4d5', 'c6e7', 'c3c4', 'f6h5'], cp: -378, mate: null },
      { moves: ['f3g3', 'h7h6', 'f2f3', 'h6g5', 'f3g4', 'f6e4', 'g3f3', 'd6d5'], cp: -385, mate: null },
    ];
    const r = tradeRelievesCramp(c.fen(), after, 'w');
    expect(r?.text ?? '').not.toMatch(/knight on f3/);
    if (r) expect(new Chess(c.fen()).get(r.target)?.type).toBe(r.text.match(/(knight|bishop|rook) on/)?.[1]?.[0] === 'k' ? 'n' : r.text.match(/(knight|bishop|rook) on/)?.[1]?.[0]);
  });
});
