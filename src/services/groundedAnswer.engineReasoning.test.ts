import { describe, it, expect } from 'vitest';
import { assembleEngineReasoning, assembleGameReviewAnswer } from './groundedAnswer';
import type { MoveAnnotation } from '../types';

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

  it('says checkmate (not "gives check") when the move is mate — hand-audit fix', () => {
    // Back-rank: Ra8# with the g8-king boxed by its own f7/g7/h7 pawns.
    const fen = '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1';
    const a = assembleEngineReasoning({ fenBefore: fen, pvSan: ['Ra8#'], moverColor: 'white', evalCp: 10000, studentSide: 'white' });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/delivers checkmate/i);
    expect(a!.facts).not.toMatch(/gives check\b/i);
  });

  it('names a real pin, and refuses a blocked (fake) pin — hand-audit', () => {
    // e7 EMPTY → Bg5 genuinely pins Nf6 to Qd8.
    const real = assembleEngineReasoning({
      fenBefore: 'rnbqk2r/pppp1ppp/4pn2/8/5B2/8/PPPP1PPP/RNBQK2R w KQkq - 0 1',
      pvSan: ['Bg5'], moverColor: 'white', evalCp: 30, studentSide: 'white',
    });
    expect(real!.facts).toMatch(/pins the knight on f6 to the queen on d8/i);
    // e7 PAWN blocks the diagonal → NOT a pin; must not claim one.
    const blocked = assembleEngineReasoning({
      fenBefore: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 4 3',
      pvSan: ['Bg5'], moverColor: 'white', evalCp: 30, studentSide: 'white',
    });
    expect(blocked!.facts).not.toMatch(/pins/i);
  });
});

describe('assembleGameReviewAnswer — review rooted in the engine reasoning', () => {
  it('names the preferred move in SAN + WHY (geometry), not a raw UCI', () => {
    // 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? — Nf6 is a blunder (allows Qxf7#). The engine
    // preferred ...g6, which attacks the queen on h5. The review must say the SAN
    // + the reason, never the raw UCI "g7g6".
    const pgn = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6';
    const anns: MoveAnnotation[] = [
      { moveNumber: 3, color: 'black', san: 'Nf6', evaluation: 900, bestMove: 'g7g6', bestMoveEval: 20, classification: 'blunder', comment: null },
    ];
    const a = assembleGameReviewAnswer({ white: 'me', black: 'you', result: '1-0', moveCount: 3, annotations: anns, pgn });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/engine preferred g6/);
    expect(a!.facts).toMatch(/attacks the queen on h5/);
    expect(a!.facts).not.toMatch(/g7g6/); // no raw UCI leaks
  });

  it('degrades to the raw best move when no PGN is supplied', () => {
    const anns: MoveAnnotation[] = [
      { moveNumber: 3, color: 'black', san: 'Nf6', evaluation: 900, bestMove: 'g7g6', bestMoveEval: 20, classification: 'blunder', comment: null },
    ];
    const a = assembleGameReviewAnswer({ white: 'me', black: 'you', result: '1-0', moveCount: 3, annotations: anns });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/engine preferred g7g6/); // no board to compute SAN/geometry
  });
});
