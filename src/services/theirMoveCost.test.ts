// What their move cost them (census #5), on his own games.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { theirMoveCost } from './theirMoveCost';
import fixture from './__fixtures__/theirMoveCost-his.json';

interface M { game: string; ply: number; fen: string; san: string; us: 'w' | 'b'; his: string | null }
const at = (game: string): M => {
  const m = (fixture as M[]).find((x) => x.game === game);
  if (!m) throw new Error(game);
  return m;
};

describe('theirMoveCost — his "what their move cost them"', () => {
  it('"the passive d6 … blocks in the bishop"', () => {
    const m = at('V4lW-6f56Cg');
    const out = theirMoveCost(m.fen, m.san, m.us);
    expect(out?.kind).toBe('bishop-shut');
    expect(out?.text).toMatch(/…d6 shuts in their own bishop on f8/);
  });

  it('"e6 … opens a square the knight will jump into"', () => {
    const m = at('HDSMjuNWNQk');
    const out = theirMoveCost(m.fen, m.san, m.us);
    expect(out?.kind).toBe('hole');
    expect(out?.text).toMatch(/…e6 costs them d6/);
    expect(out?.squares).toContain('d6');
  });

  it('never calls the centre pawns "king cover" for a king still on e8', () => {
    const m = at('1zfJ7ABoh8k'); // move one, …d5
    expect(theirMoveCost(m.fen, m.san, m.us)?.text ?? '').not.toMatch(/cover thinned/);
  });

  it('is silent on the student\'s own move', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(theirMoveCost(start, 'e4', 'w')).toBeNull();
  });

  it('names castling given up by a king walk', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 5 4';
    const out = theirMoveCost(fen, 'Kf8', 'w');
    expect(out?.kind).toBe('castling');
  });
});

describe('a bishop out in front of the chain is not shut in (chat probe 2026-10-02)', () => {
  it('e3 with the bishop already on g5 — silent on the bishop', () => {
    const c = new Chess();
    for (const s of 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7'.split(' ')) c.move(s);
    expect(theirMoveCost(c.fen(), 'e3', 'b')?.kind).not.toBe('bishop-shut');
  });
  it('…d6 with the bishop already on c5 — silent on the bishop', () => {
    const c = new Chess();
    for (const s of 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3'.split(' ')) c.move(s);
    expect(theirMoveCost(c.fen(), 'd6', 'w')?.kind).not.toBe('bishop-shut');
  });
  it('…e6 with the bishop still on c8 — named', () => {
    const c = new Chess();
    for (const s of 'd4 d5 c4'.split(' ')) c.move(s);
    expect(theirMoveCost(c.fen(), 'e6', 'w')?.text).toMatch(/shuts in their own bishop on c8/);
  });
});
