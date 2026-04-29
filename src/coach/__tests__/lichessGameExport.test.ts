import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lichessGameExportTool } from '../tools/cerebellum/lichessGameExport';
import * as svc from '../../services/lichessExplorerService';

interface ToolResult {
  ok: boolean;
  result?: { id: string; pgn: string; length: number };
  error?: string;
}

describe('lichess_game_export tool', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('rejects empty id', async () => {
    const r = (await lichessGameExportTool.execute({ id: '' })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/id is required/);
  });

  it('returns the PGN verbatim on success', async () => {
    const fakePgn = '[Event "Casual game"]\n[White "Anderssen"]\n\n1. e4 e5 2. Nf3 *';
    vi.spyOn(svc, 'fetchLichessGameExport').mockResolvedValue(fakePgn);
    const r = (await lichessGameExportTool.execute({ id: 'aB3xY7zQ' })) as ToolResult;
    expect(r.ok).toBe(true);
    expect(r.result?.pgn).toBe(fakePgn);
    expect(r.result?.length).toBe(fakePgn.length);
    expect(r.result?.id).toBe('aB3xY7zQ');
  });

  it('surfaces upstream errors as ok:false', async () => {
    vi.spyOn(svc, 'fetchLichessGameExport').mockRejectedValue(new Error('Game export API error: 404'));
    const r = (await lichessGameExportTool.execute({ id: 'aB3xY7zQ' })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Game export API error: 404/);
  });
});
