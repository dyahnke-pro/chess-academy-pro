import { describe, it, expect } from 'vitest';
import { boardConcepts } from './boardConcepts';

describe('boardConcepts', () => {
  it('calls a queenless, light position an endgame regardless of move number', () => {
    // R+P vs R+P — an endgame by material even if it arrived early.
    const r = boardConcepts('8/5pk1/8/8/8/8/5PK1/R6r w - - 0 20');
    expect(r?.phase).toBe('endgame');
    expect(r?.concepts).toContain('rook-endgame');
  });

  it('does not call it a rook endgame while a knight is still on', () => {
    const r = boardConcepts('8/5pk1/8/8/8/5N2/5PK1/R6r w - - 0 20');
    expect(r?.concepts ?? []).not.toContain('rook-endgame');
  });

  it('names a pawn endgame when only kings and pawns remain', () => {
    const r = boardConcepts('8/5pk1/8/8/8/8/5PK1/8 w - - 0 40');
    expect(r?.concepts).toContain('pawn-endgame');
  });

  it('sees a passed pawn, and does not invent one', () => {
    expect(boardConcepts('8/8/4k3/8/2P5/8/6K1/8 w - - 0 40')?.concepts).toContain('passed-pawn');
    // Same pawn, an enemy pawn holding the adjacent file — no longer passed.
    expect(boardConcepts('8/3p4/4k3/8/2P5/8/6K1/8 w - - 0 40')?.concepts ?? []).not.toContain('passed-pawn');
  });

  it('withholds king-activity while both kings sit at home', () => {
    const r = boardConcepts('8/5pk1/8/8/8/8/5PK1/R6r w - - 0 20');
    expect(r?.concepts ?? []).not.toContain('king-activity');
  });

  it('treats the bishop pair as an imbalance only when the opponent lacks it', () => {
    // Two bishops each — not a theme.
    const even = boardConcepts('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(even?.concepts ?? []).not.toContain('bishop-pair');
  });

  it('returns null rather than a generic tag when nothing stands out', () => {
    expect(boardConcepts('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBeNull();
  });

  it('returns null on a FEN it cannot parse instead of throwing', () => {
    expect(boardConcepts('not a fen')).toBeNull();
  });
});
