import { describe, it, expect } from 'vitest';
import { auditNarration } from './narrationAuditor';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 — Italian Game starting position.
const ITALIAN_FEN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

describe('auditNarration', () => {
  describe('piece-on-square claims', () => {
    it('passes when claim matches the position (knight on f3 in Italian)', () => {
      const flags = auditNarration(ITALIAN_FEN, 'Your knight on f3 is well-placed.');
      expect(flags).toHaveLength(0);
    });

    it('flags when claim names a wrong piece', () => {
      const flags = auditNarration(ITALIAN_FEN, 'Your queen on f3 attacks the center.');
      expect(flags).toHaveLength(1);
      expect(flags[0].kind).toBe('piece-on-square');
      expect(flags[0].explanation).toMatch(/queen on f3.*holds a n/);
    });

    it('flags when claim names an empty square', () => {
      // e3 is empty in the Italian starting setup.
      const flags = auditNarration(ITALIAN_FEN, 'The knight on e3 defends d5.');
      expect(flags).toHaveLength(1);
      expect(flags[0].kind).toBe('piece-on-square');
      expect(flags[0].explanation).toMatch(/empty/);
    });

    it('de-dupes identical claims within a single narration', () => {
      const flags = auditNarration(
        ITALIAN_FEN,
        'The queen on f3 is strong. Your queen on f3 attacks.',
      );
      expect(flags).toHaveLength(1);
    });
  });

  describe('hanging-piece claims', () => {
    it('flags claims about a piece type that isn\u2019t on the board', () => {
      // After 1.e4 — white queen still on d1, both queens on board.
      const e4Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const flags = auditNarration(e4Fen, 'Watch out for the hanging queen!');
      // Queens are on the board, so no flag — this is a false positive
      // we explicitly avoid. Test asserts no flag.
      expect(flags.filter((f) => f.kind === 'hanging-piece')).toHaveLength(0);
    });

    it('passes on "hanging pawn" when pawns exist (no claim about defenders)', () => {
      const flags = auditNarration(START_FEN, 'Black played a pawn push, leaving a hanging pawn.');
      expect(flags.filter((f) => f.kind === 'hanging-piece')).toHaveLength(0);
    });
  });

  describe('check / mate claims', () => {
    it('passes when check is real', () => {
      // Scholar's Mate-style: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6 4.Qxf7# — mate.
      const mateFen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
      const flags = auditNarration(mateFen, 'This is checkmate — game over.');
      expect(flags.filter((f) => f.kind === 'mate-claim')).toHaveLength(0);
    });

    it('flags checkmate claim when position is not mate', () => {
      const flags = auditNarration(ITALIAN_FEN, 'This is forced mate for White.');
      expect(flags.filter((f) => f.kind === 'mate-claim')).toHaveLength(1);
    });

    it('flags a check claim when the position is not in check', () => {
      const flags = auditNarration(ITALIAN_FEN, 'Black is now delivering check.');
      expect(flags.filter((f) => f.kind === 'check-claim')).toHaveLength(1);
    });
  });

  describe('illegal-san references', () => {
    it('passes when the referenced SAN is a legal move', () => {
      // Italian position — Ng5 is legal for White (knight on f3 → g5).
      const flags = auditNarration(ITALIAN_FEN, 'You should consider Ng5 here.');
      expect(flags.filter((f) => f.kind === 'illegal-san')).toHaveLength(0);
    });

    it('flags a clearly-illegal piece move reference', () => {
      // Qh8 is not legal for White in the Italian — queen is on d1
      // and has no path to h8.
      const flags = auditNarration(ITALIAN_FEN, 'Try Qh8 to threaten mate.');
      expect(flags.filter((f) => f.kind === 'illegal-san')).toHaveLength(1);
    });

    it('does not flag bare-square references like "control e4"', () => {
      const flags = auditNarration(ITALIAN_FEN, 'White aims to control e4 and d4.');
      expect(flags).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('returns no flags for short narrations', () => {
      const flags = auditNarration(ITALIAN_FEN, 'Nice.');
      expect(flags).toHaveLength(0);
    });

    it('returns no flags for empty input', () => {
      const flags = auditNarration(ITALIAN_FEN, '');
      expect(flags).toHaveLength(0);
    });

    it('returns no flags for malformed FEN (silently no-op)', () => {
      const flags = auditNarration('not-a-fen', 'The knight on f3 attacks.');
      expect(flags).toHaveLength(0);
    });

    it('handles prose with no board claims', () => {
      const flags = auditNarration(
        ITALIAN_FEN,
        'This is the Italian Game — a classical opening focused on rapid development.',
      );
      expect(flags).toHaveLength(0);
    });
  });
});
