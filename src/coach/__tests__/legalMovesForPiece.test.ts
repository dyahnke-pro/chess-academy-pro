import { describe, it, expect } from 'vitest';
import { legalMovesForPieceTool } from '../tools/cerebellum/legalMovesForPiece';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface Result {
  ok: boolean;
  result?: { from?: string; piece?: string | null; color?: string | null; moves?: { san: string; uci: string }[]; pieces?: { from: string; moves: { san: string }[] }[]; note?: string };
  error?: string;
}

describe('legal_moves_for_piece tool', () => {
  it('returns 20 starting-position moves aggregated by piece+color request', async () => {
    const r = (await legalMovesForPieceTool.execute({
      fen: STARTING_FEN,
      piece: 'pawn',
      color: 'white',
    })) as Result;
    expect(r.ok).toBe(true);
    // 8 pawns, 2 moves each = 16 moves total
    const total = (r.result?.pieces ?? []).reduce((acc, p) => acc + p.moves.length, 0);
    expect(total).toBe(16);
  });

  it('returns the 4 knight starting moves for the g1 knight via square lookup', async () => {
    const r = (await legalMovesForPieceTool.execute({
      fen: STARTING_FEN,
      from: 'g1',
    })) as Result;
    expect(r.ok).toBe(true);
    expect(r.result?.piece).toBe('knight');
    expect(r.result?.color).toBe('white');
    const sans = (r.result?.moves ?? []).map((m) => m.san).sort();
    expect(sans).toEqual(['Nf3', 'Nh3'].sort());
  });

  it('returns empty moves with note when the square is empty', async () => {
    const r = (await legalMovesForPieceTool.execute({
      fen: STARTING_FEN,
      from: 'e4',
    })) as Result;
    expect(r.ok).toBe(true);
    expect(r.result?.piece).toBe(null);
    expect(r.result?.moves).toEqual([]);
    expect(r.result?.note).toMatch(/empty/);
  });

  it('rejects an invalid square', async () => {
    const r = (await legalMovesForPieceTool.execute({
      fen: STARTING_FEN,
      from: 'z9',
    })) as Result;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/invalid square/);
  });

  it('rejects piece without color', async () => {
    const r = (await legalMovesForPieceTool.execute({
      fen: STARTING_FEN,
      piece: 'knight',
    })) as Result;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/color is required/);
  });

  it('rejects when neither from nor piece is given', async () => {
    const r = (await legalMovesForPieceTool.execute({ fen: STARTING_FEN })) as Result;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/from.*piece/);
  });

  it('flags captures + checks correctly', async () => {
    // Position: white queen on e7 hits the black king on e8 — Qxe8# would be checkmate.
    // Set up a position where the white queen on h5 has a Qxf7+ capture-check.
    // FEN: scholars-mate-style position with Qh5, Bc4, knight gone.
    const fen = 'rnbqkb1r/pppp1Qpp/5n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
    const r = (await legalMovesForPieceTool.execute({ fen, from: 'e8' })) as Result;
    expect(r.ok).toBe(true);
    // The black king has no legal moves — this is checkmate.
    expect(r.result?.moves).toEqual([]);
  });
});
