/**
 * set_board_position tool tests — the TOOL's behaviour (replay, plumbing,
 * callback shapes). The PROVENANCE contract has its own file next to the tool:
 * `tools/cerebrum/setBoardPosition.provenance.test.ts`. Two files, one subject
 * each; do not re-assert provenance here or they will drift.
 *
 * 🔴 UPDATED 2026-09-21 — THE GROUNDING TEETH CHANGED, so these tests did.
 * This file used to describe the old rule: "an OPENING-PHASE position must be
 * built from real `moves` … a raw `fen` is allowed only for deep (past-opening)
 * positions." That rule is DELETED, not relaxed. It measured the FULLMOVE
 * NUMBER — a property of the string — as a proxy for ORIGIN, and so was wrong
 * both ways: a fabricated endgame ending `w - - 0 47` passed, and a REAL
 * position on move 9 was refused.
 *
 * What replaced it: a raw `fen` is accepted only when this app provably
 * PRODUCED that position (`positionProvenance`), plus a `named` route that
 * resolves a standard position from the app's own corpora. So the deep-FEN
 * fixture below must now be REMEMBERED before the plumbing tests can use it —
 * that is not a workaround, it is the contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { setBoardPositionTool } from '../tools/cerebrum/setBoardPosition';
import {
  rememberComputedPosition, clearRememberedPositions,
} from '../../services/positionProvenance';

/** A real position. Under the new contract its fullmove number is irrelevant —
 *  what matters is that the app produced it, which `beforeEach` records. */
const DEEP_FEN = '8/8/4k3/8/4K3/8/4P3/8 w - - 0 40';

describe('set_board_position tool', () => {
  beforeEach(() => {
    clearRememberedPositions();
    // The plumbing tests below are about CALLBACK SHAPES, not about grounding,
    // so they start from a board the app legitimately produced. Recording it
    // here keeps each of those tests about the one thing it names.
    rememberComputedPosition(DEEP_FEN, 'game-timeline');
  });

  it('errors when neither moves nor fen is given', async () => {
    const result = await setBoardPositionTool.execute({});
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/provide `moves`/);
  });

  describe('grounded `moves` path', () => {
    it('replays real SAN into the reachable FEN and echoes the moves', async () => {
      // Declares what it RECEIVES, so `mock.calls[0][0]` is a real string
      // rather than an index into an empty tuple.
      const callback = vi.fn((_fen: string) => ({ ok: true }));
      const result = await setBoardPositionTool.execute(
        { moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Na3' },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(true);
      // Knight really is on a3, pawn really captured on c4 — a real line.
      // No cast needed now the mock declares its parameter.
      const fen = callback.mock.calls[0][0];
      const rank3 = fen.split(' ')[0].split('/')[5]; // FEN ranks are 8→1
      expect(rank3.startsWith('N')).toBe(true); // knight on a3
      expect((result.result as { moves?: string }).moves).toBe('d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Na3');
    });

    it('collapses a fabricated line on the first illegal move', async () => {
      // Declares what it RECEIVES, so `mock.calls[0][0]` is a real string
      // rather than an index into an empty tuple.
      const callback = vi.fn((_fen: string) => ({ ok: true }));
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
    it('rejects a raw FEN the app never produced, and directs to the real routes', async () => {
      const callback = vi.fn(() => true);
      // The Catalan-Na3-style fantasy this tool was hardened against. It is
      // still refused — but now because the app has no record of computing it,
      // not because of where its fullmove counter happens to sit.
      const result = await setBoardPositionTool.execute(
        { fen: 'r1bqkbnr/ppp2ppp/2b1p3/8/2QP4/N7/PP3PPP/R1B1KBNR b KQkq - 3 7' },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/did not come from this app/i);
      expect(result.error).toMatch(/moves/);
      expect(result.error).toMatch(/named/);
      expect(callback).not.toHaveBeenCalled();
    });

    it('ACCEPTS an opening-phase FEN when the app produced it — the old rule refused these', async () => {
      // 🔴 THE REGRESSION THE OLD TEETH CAUSED, now pinned as a requirement.
      // "Resume the position I was just looking at" on move 4 is an ordinary
      // request, and a fullmove<=12 check refused it every time while waving
      // through any fabricated endgame. Origin is the question; move number
      // never was.
      const early = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 4';
      rememberComputedPosition(early, 'live-board');
      const callback = vi.fn((_fen: string) => ({ ok: true }));
      const result = await setBoardPositionTool.execute({ fen: early }, { onSetBoardPosition: callback });
      expect(result.ok).toBe(true);
      expect(callback).toHaveBeenCalledWith(early);
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

    it('dispatches a raw FEN the app produced', async () => {
      // Declares what it RECEIVES, so `mock.calls[0][0]` is a real string
      // rather than an index into an empty tuple.
      const callback = vi.fn((_fen: string) => ({ ok: true }));
      const result = await setBoardPositionTool.execute(
        { fen: DEEP_FEN },
        { onSetBoardPosition: callback },
      );
      expect(result.ok).toBe(true);
      expect(callback).toHaveBeenCalledWith(DEEP_FEN);
      expect(result.result).toMatchObject({ fen: DEEP_FEN });
    });
  });

  it('reports FAILURE (never synthetic success) when no onSetBoardPosition callback is wired', async () => {
    // David 2026-09-08: the old stub returned ok:true, so the coach said the
    // position was set while nothing changed. Now an unwired board fails honestly.
    const result = await setBoardPositionTool.execute({ fen: DEEP_FEN });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no board is available/i);
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
