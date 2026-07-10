import { describe, it, expect } from 'vitest';
import { assembleEngineReasoning } from './groundedAnswer';

/**
 * assembleEngineReasoning — proves the coach's "why does the engine like this
 * move" answer is COMPUTED from the PV + board, never invented (G0). The walk
 * names what each engine move does and ends on the eval verdict.
 */
describe('assembleEngineReasoning — decipher Stockfish\'s line', () => {
  it('walks the PV and names the engine move + a follow-up + the verdict', () => {
    // White to move; a simple line where the engine plays a capture then develops.
    // 1.exd5 (wins the pawn) exd5 2.Nf3 (develops). PV from the current position.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const ans = assembleEngineReasoning({
      fenBefore: fen,
      pvSan: ['exd5', 'Qxd5', 'Nc3'],
      moverColor: 'white',
      evalCp: 40,
      studentSide: 'white',
      maxFollowUps: 2,
    });
    expect(ans).not.toBeNull();
    // Clause 1 names the engine's first move.
    expect(ans!.facts).toMatch(/engine plays exd5/i);
    // The walk frames the follow-up by the opponent's reply.
    expect(ans!.facts).toMatch(/If Qxd5, then Nc3/i);
    // Ends with the eval verdict (student POV, slightly better).
    expect(ans!.facts).toMatch(/slightly better/i);
    // The arrow anchors on the real from/to of the engine move.
    expect(ans!.bestMoveFromTo).toEqual({ from: 'e4', to: 'd5' });
    expect(ans!.bestMoveSan).toBe('exd5');
    expect(ans!.sources).toContain('engine:stockfish');
  });

  it('degrades to clause-1 geometry + verdict on a single-move PV', () => {
    // White to move, a single-move PV that wins the undefended d5-pawn. The
    // reasoning still names the move + the win + the verdict — a valid "why".
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const ans = assembleEngineReasoning({
      fenBefore: fen,
      pvSan: ['exd5'],
      moverColor: 'white',
      evalCp: 90,
      studentSide: 'white',
    });
    expect(ans).not.toBeNull();
    expect(ans!.bestMoveSan).toBe('exd5');
    expect(ans!.facts).toMatch(/engine plays exd5/i);
    expect(ans!.facts).toMatch(/clearly better|slightly better|winning/i);
  });

  it('returns null on an empty or illegal PV (empty > generic > invented)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(assembleEngineReasoning({ fenBefore: fen, pvSan: [], moverColor: 'white' })).toBeNull();
    expect(assembleEngineReasoning({ fenBefore: fen, pvSan: ['Qh8'], moverColor: 'white' })).toBeNull();
  });
});
