import { describe, it, expect } from 'vitest';
import { materialCountTool } from '../tools/cerebellum/materialCount';

interface Result {
  ok: boolean;
  result?: {
    white: Record<string, number>;
    black: Record<string, number>;
    whitePoints: number;
    blackPoints: number;
    balance: number;
    verdict: string;
  };
  error?: string;
}

describe('material_count tool', () => {
  it('reports equal material at the starting position', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const r = (await materialCountTool.execute({ fen })) as Result;
    expect(r.ok).toBe(true);
    expect(r.result?.balance).toBe(0);
    expect(r.result?.whitePoints).toBe(39); // 8 + 6 + 6 + 10 + 9 = 39
    expect(r.result?.blackPoints).toBe(39);
    expect(r.result?.white.pawns).toBe(8);
    expect(r.result?.white.knights).toBe(2);
    expect(r.result?.white.bishops).toBe(2);
    expect(r.result?.white.rooks).toBe(2);
    expect(r.result?.white.queens).toBe(1);
    expect(r.result?.white.kings).toBe(1);
    expect(r.result?.verdict).toMatch(/equal/i);
  });

  it('detects white up a pawn', async () => {
    // Black pawn on e7 removed.
    const fen = 'rnbqkbnr/pppp1ppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const r = (await materialCountTool.execute({ fen })) as Result;
    expect(r.ok).toBe(true);
    expect(r.result?.balance).toBe(1);
    expect(r.result?.black.pawns).toBe(7);
    expect(r.result?.verdict).toMatch(/White is up 1 point/);
  });

  it('detects black up a queen', async () => {
    // White queen removed.
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1';
    const r = (await materialCountTool.execute({ fen })) as Result;
    expect(r.ok).toBe(true);
    expect(r.result?.balance).toBe(-9);
    expect(r.result?.white.queens).toBe(0);
    expect(r.result?.verdict).toMatch(/Black is up 9 points/);
  });

  it('rejects empty fen', async () => {
    const r = (await materialCountTool.execute({ fen: '' })) as Result;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/fen is required/);
  });

  it('rejects malformed fen', async () => {
    const r = (await materialCountTool.execute({ fen: 'not-a-fen' })) as Result;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/invalid fen/);
  });
});
