/**
 * set_board_position tool tests.
 *
 * Grounding teeth (2026-06-02): an OPENING-PHASE position must be built
 * from real `moves` (chess.js replay) — a raw opening FEN recalled from
 * memory is rejected. A raw `fen` is allowed only for deep (past-opening)
 * positions. Verifies:
 *   - `moves` replays from the start into the real FEN + echoes the SANs.
 *   - an illegal move in `moves` is surfaced (the fabricated-line collapse).
 *   - move-number prefixes in `moves` are tolerated.
 *   - a raw opening-phase FEN is rejected with a "use moves" directive.
 *   - a raw deep FEN dispatches.
 *   - empty input, invalid FEN, stub no-op, and callback return shapes.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { setBoardPositionTool } from '../tools/cerebrum/setBoardPosition';

// A deep (past fullmove 12) but real position — allowed via raw `fen`.
const DEEP_FEN = '8/8/4k3/8/4K3/8/4P3/8 w - - 0 40';

describe('set_board_position tool', () => {
  it('errors when neither moves nor fen is given', async () => {
    const result = await setBoardPositionTool.execute({});
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/provide `moves`/);
  });

  describe('grounded `moves` path', () => {
    it('replays real SAN into the reachable FEN and echoes the moves', async () => {
      const callback = vi.fn(() => ({ ok: true }));
      const result = await setBoardPositionTool.execute(
        { moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Na3' },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(true);
      // Knight really is on a3, pawn really captured on c4 — a real line.
      const fen = callback.mock.calls[0][0] as string;
      const rank3 = fen.split(' ')[0].split('/')[5]; // FEN ranks are 8→1
      expect(rank3.startsWith('N')).toBe(true); // knight on a3
      expect((result.result as { moves?: string }).moves).toBe('d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Na3');
    });

    it('collapses a fabricated line on the first illegal move', async () => {
      const callback = vi.fn(() => ({ ok: true }));
      const result = await setBoardPositionTool.execute(
        { moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Qc4' }, // Qc4 is not legal here
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/illegal move "Qc4"/);
      expect(callback).not.toHaveBeenCalled();
    });

    it('tolerates move-number prefixes in the moves string', async () => {
      const callback = vi.fn(() => true);
      const result = await setBoardPositionTool.execute(
        { moves: '1.d4 Nf6 2.c4 e6 3.g3' },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(true);
      expect((result.result as { moves?: string }).moves).toBe('d4 Nf6 c4 e6 g3');
    });

    it('replays from a provided fromFen base', async () => {
      const callback = vi.fn(() => true);
      const result = await setBoardPositionTool.execute(
        { fromFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: 'e4 e5' },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(true);
    });
  });

  describe('raw `fen` path', () => {
    it('rejects an opening-phase raw FEN and directs to moves', async () => {
      const callback = vi.fn(() => true);
      // Fullmove 7 fantasy-style opening FEN — exactly the hallucination class.
      const result = await setBoardPositionTool.execute(
        { fen: 'r1bqkbnr/ppp2ppp/2b1p3/8/2QP4/N7/PP3PPP/R1B1KBNR b KQkq - 3 7' },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/opening-phase positions must be set via `moves`/);
      expect(callback).not.toHaveBeenCalled();
    });

    it('errors on invalid FEN before reaching the callback', async () => {
      const callback = vi.fn(() => true);
      const result = await setBoardPositionTool.execute(
        { fen: 'not a real fen' },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/invalid FEN/);
      expect(callback).not.toHaveBeenCalled();
    });

    it('dispatches a deep (past-opening) raw FEN', async () => {
      const callback = vi.fn(() => ({ ok: true }));
      const result = await setBoardPositionTool.execute(
        { fen: DEEP_FEN },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(true);
      expect(callback).toHaveBeenCalledWith(DEEP_FEN);
      expect(result.result).toMatchObject({ fen: DEEP_FEN });
    });
  });

  it('graceful no-op when no onSetBoardPosition callback is wired (stub=true)', async () => {
    const result = await setBoardPositionTool.execute({ fen: DEEP_FEN });
    expect(result.ok).toBe(true);
    const payload = result.result as { stub?: boolean; requested?: { fen?: string }; reason?: string };
    expect(payload.stub).toBe(true);
    expect(payload.requested?.fen).toBe(DEEP_FEN);
    expect(payload.reason).toMatch(/no onSetBoardPosition callback/);
  });

  it('accepts a boolean return from the callback', async () => {
    const callback = vi.fn(() => true);
    const result = await setBoardPositionTool.execute({ fen: DEEP_FEN }, { onSetBoardPosition: callback });
    expect(result.ok).toBe(true);
  });

  it('surfaces a callback rejection with reason', async () => {
    const callback = vi.fn(() => ({ ok: false, reason: 'mid-game lock' }));
    const result = await setBoardPositionTool.execute({ fen: DEEP_FEN }, { onSetBoardPosition: callback });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/mid-game lock/);
  });

  it('surfaces a thrown callback error as tool error', async () => {
    const callback = vi.fn(() => {
      throw new Error('chess instance frozen');
    });
    const result = await setBoardPositionTool.execute({ fen: DEEP_FEN }, { onSetBoardPosition: callback });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/onSetBoardPosition threw.*chess instance frozen/);
  });
});
