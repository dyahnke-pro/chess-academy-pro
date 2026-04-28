import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lichessCloudEvalTool } from '../tools/cerebellum/lichessCloudEval';
import * as lichessExplorerService from '../../services/lichessExplorerService';
import type { LichessCloudEval } from '../../types';

interface ToolResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

describe('lichess_cloud_eval tool', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects empty fen', async () => {
    const r = (await lichessCloudEvalTool.execute({ fen: '' })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/fen is required/);
  });

  it('returns cached:false when upstream returns null (404)', async () => {
    vi.spyOn(lichessExplorerService, 'fetchCloudEval').mockResolvedValue(null);
    const r = (await lichessCloudEvalTool.execute({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    })) as ToolResult & { result?: { cached: boolean; note: string } };
    expect(r.ok).toBe(true);
    expect(r.result?.cached).toBe(false);
    expect(r.result?.note).toMatch(/not in Lichess cloud/);
  });

  it('shapes a populated cloud-eval response', async () => {
    const fakeCloud: LichessCloudEval = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      knodes: 50_000,
      depth: 35,
      pvs: [
        { moves: 'e7e5 g1f3 b8c6', cp: 25 },
        { moves: 'c7c5 g1f3', cp: 30 },
        { moves: 'e7e6 d2d4', cp: 40 },
      ],
    };
    vi.spyOn(lichessExplorerService, 'fetchCloudEval').mockResolvedValue(fakeCloud);
    const r = (await lichessCloudEvalTool.execute({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      multiPv: 3,
    })) as ToolResult & {
      result?: {
        cached: boolean;
        depth: number;
        bestMoveUci: string | null;
        evaluation: number | null;
        lines: { moves: string[]; evaluation: number | null }[];
      };
    };
    expect(r.ok).toBe(true);
    expect(r.result?.cached).toBe(true);
    expect(r.result?.depth).toBe(35);
    expect(r.result?.bestMoveUci).toBe('e7e5');
    expect(r.result?.evaluation).toBe(25);
    expect(r.result?.lines.length).toBe(3);
    expect(r.result?.lines[0].moves).toEqual(['e7e5', 'g1f3', 'b8c6']);
  });

  it('clamps multiPv into [1,5]', async () => {
    const captured: number[] = [];
    vi.spyOn(lichessExplorerService, 'fetchCloudEval').mockImplementation(async (_fen, multi) => {
      captured.push(multi ?? -1);
      return null;
    });
    await lichessCloudEvalTool.execute({ fen: 'X', multiPv: 99 });
    await lichessCloudEvalTool.execute({ fen: 'X', multiPv: 0 });
    expect(captured).toEqual([5, 1]);
  });

  it('surfaces upstream errors as ok:false', async () => {
    vi.spyOn(lichessExplorerService, 'fetchCloudEval').mockRejectedValue(
      new Error('Cloud eval API error: 503'),
    );
    const r = (await lichessCloudEvalTool.execute({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Cloud eval API error: 503/);
  });
});
