import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { lineWins, mateLine } from './lineCalc';

describe('mateLine — the mate played out, and the quiet move before it', () => {
  // Black king h8 boxed by its own h-pawn; Re8+ fails to …Kg7 until the bishop covers g7.
  const fen = '7k/p6p/8/8/8/8/8/2B1R1K1 w - - 0 1';
  it('names the escape square the quiet move takes', () => {
    const m = mateLine(fen, ['c1h6', 'a7a6', 'e1e8'], 'w', 'Bh6');
    expect(m?.quiet).toBe(true);
    expect(m?.taken).toEqual(['g7']);
    expect(m?.text).toBe('No check yet — the quiet Bh6 comes first: it takes g7 from their king, and Re8 is mate. Bh6, …a6 and Re8#.');
  });
  it('a line that does not mate says nothing', () => {
    expect(mateLine(fen, ['c1h6', 'a7a6', 'e1e7'], 'w')).toBeNull();
  });
  it('a checking line is a forced mate, not a quiet one', () => {
    const f = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
    expect(mateLine(f, ['a1a8'], 'w')).toBeNull(); // too short to be a line
    const m = mateLine('6k1/5pp1/7p/8/8/8/5PPP/RR4K1 w - - 0 1', ['a1a8', 'g8h7', 'b1b8', 'g7g6', 'b8h8'], 'w');
    expect(m).toBeNull(); // …g6 opens g7 — not mate
  });
  it('lineWins is unchanged by the mate reader', () => {
    expect(lineWins(fen, ['c1h6', 'a7a6'], 'w', undefined, null)).toBeNull();
  });
});

describe('lineWins — the gain settles at the first finished exchange (pass-3 walk 2026-10-01)', () => {
  it('a quiet engine line whose first exchange is level says nothing, however deep it runs', () => {
    // VkAqhxUJjrw ply 60: "…e6 dxe6+ …fxe6 b4 …Ke7 Nb3 … bxa4" was read out as "wins a pawn".
    const fen = '8/1b1kppb1/p2p1np1/1p1P3p/3NP3/1PNK1P2/P2B2PP/8 b - - 0 30';
    const c = new Chess(fen);
    const uci = ['e6', 'dxe6+', 'fxe6', 'b4', 'Ke7', 'Nb3', 'Nd7', 'Na5', 'Ba8', 'a4', 'Bxc3', 'Kxc3', 'bxa4'].map((x) => { const m = c.move(x); return `${m.from}${m.to}`; });
    expect(lineWins(fen, uci, 'b', undefined, null)).toBeNull();
  });
  it('a sacrifice cashed by a check still walks on (Damiano)', () => {
    const f = 'rnbqkbnr/pppp2pp/5p2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    expect(lineWins(f, ['f3e5', 'f6e5', 'd1h5', 'g7g6', 'h5e5', 'd8e7', 'e5h8'], 'w', undefined, null)?.sans).toEqual(['Nxe5', '…fxe5', 'Qh5+', '…g6', 'Qxe5+', '…Qe7', 'Qxh8']);
  });
});

