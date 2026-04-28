import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lichessTablebaseLookupTool } from '../tools/cerebellum/lichessTablebaseLookup';
import * as tablebases from '../../services/tablebases';
import type { TablebaseResult } from '../../services/tablebases';

interface ToolResult {
  ok: boolean;
  result?: {
    inTablebase: boolean;
    pieceCount: number;
    note?: string;
    category?: string;
    verdict?: string;
    dtm?: number | null;
    dtz?: number | null;
    moves?: { san: string; uci: string }[];
  };
  error?: string;
}

describe('lichess_tablebase_lookup tool', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects empty fen', async () => {
    const r = (await lichessTablebaseLookupTool.execute({ fen: '' })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/fen is required/);
  });

  it('skips the network call for >7 pieces and returns inTablebase:false', async () => {
    const spy = vi.spyOn(tablebases, 'fetchTablebase');
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const r = (await lichessTablebaseLookupTool.execute({ fen: startingFen })) as ToolResult;
    expect(r.ok).toBe(true);
    expect(r.result?.inTablebase).toBe(false);
    expect(r.result?.pieceCount).toBe(32);
    expect(r.result?.note).toMatch(/Syzygy covers/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns the verdict + ranked moves for a 7-or-fewer piece position', async () => {
    // K+P vs K — winning for white in the simplest case.
    const kpkFen = '8/8/8/8/8/4k3/4P3/4K3 w - - 0 1';
    const fakeResult: TablebaseResult = {
      dtz: 14,
      dtm: 17,
      checkmate: false,
      stalemate: false,
      variant_win: false,
      variant_loss: false,
      insufficient_material: false,
      category: 'win',
      moves: [
        {
          uci: 'e1d2',
          san: 'Kd2',
          dtz: -13,
          dtm: -16,
          zeroing: false,
          checkmate: false,
          stalemate: false,
          variant_win: false,
          variant_loss: false,
          insufficient_material: false,
          category: 'loss',
        },
        {
          uci: 'e2e3',
          san: 'e3',
          dtz: -13,
          dtm: -16,
          zeroing: true,
          checkmate: false,
          stalemate: false,
          variant_win: false,
          variant_loss: false,
          insufficient_material: false,
          category: 'loss',
        },
      ],
    };
    vi.spyOn(tablebases, 'fetchTablebase').mockResolvedValue(fakeResult);
    const r = (await lichessTablebaseLookupTool.execute({ fen: kpkFen })) as ToolResult;
    expect(r.ok).toBe(true);
    expect(r.result?.inTablebase).toBe(true);
    expect(r.result?.pieceCount).toBe(3);
    expect(r.result?.category).toBe('win');
    expect(r.result?.verdict).toMatch(/White wins/);
    expect(r.result?.moves?.length).toBe(2);
    expect(r.result?.moves?.[0]?.san).toBe('Kd2');
  });

  it('caps the moves list at 5 entries even when upstream returns more', async () => {
    const fen = '8/8/8/8/8/4k3/4P3/4K3 w - - 0 1';
    const moves = Array.from({ length: 10 }, (_, i) => ({
      uci: `e1${'abcdefghij'[i]}1`,
      san: `K${'abcdefghij'[i]}1`,
      dtz: -10,
      dtm: -12,
      zeroing: false,
      checkmate: false,
      stalemate: false,
      variant_win: false,
      variant_loss: false,
      insufficient_material: false,
      category: 'loss' as const,
    }));
    vi.spyOn(tablebases, 'fetchTablebase').mockResolvedValue({
      dtz: 10,
      dtm: 12,
      checkmate: false,
      stalemate: false,
      variant_win: false,
      variant_loss: false,
      insufficient_material: false,
      category: 'win',
      moves,
    });
    const r = (await lichessTablebaseLookupTool.execute({ fen })) as ToolResult;
    expect(r.ok).toBe(true);
    expect(r.result?.moves?.length).toBe(5);
  });

  it('surfaces network errors as ok:false', async () => {
    const fen = '8/8/8/8/8/4k3/4P3/4K3 w - - 0 1';
    vi.spyOn(tablebases, 'fetchTablebase').mockRejectedValue(new Error('Network down'));
    const r = (await lichessTablebaseLookupTool.execute({ fen })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Network down/);
  });
});
