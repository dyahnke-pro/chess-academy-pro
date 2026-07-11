import { describe, it, expect } from 'vitest';
import { parseSpokenMove } from './spokenMoveParser';

// Speech → legal move, matched against chess.js's own move list. Ambiguity
// returns null — the parser never guesses (G3).

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// White to move: Ra1 can castle either side; knights on b1/g1 both reach d2? No —
// custom position: two knights that can both reach d5 (ambiguity case).
const TWO_KNIGHTS = '4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1'; // Nc3 and Ne3 both hit d5
const CASTLE_BOTH = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';

describe('parseSpokenMove', () => {
  it('parses "piece to square" with spoken digits', () => {
    expect(parseSpokenMove('knight to f three', START)).toEqual({ san: 'Nf3', from: 'g1', to: 'f3' });
    expect(parseSpokenMove('knight f3', START)).toEqual({ san: 'Nf3', from: 'g1', to: 'f3' });
  });

  it('parses a bare pawn square and a literal SAN token', () => {
    expect(parseSpokenMove('e4', START)).toEqual({ san: 'e4', from: 'e2', to: 'e4' });
    expect(parseSpokenMove('I want to play Nf3 here', START)).toEqual({ san: 'Nf3', from: 'g1', to: 'f3' });
  });

  it('parses captures ("takes")', () => {
    // 1.e4 d5 → exd5 available.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
    expect(parseSpokenMove('pawn takes d5', fen)).toEqual({ san: 'exd5', from: 'e4', to: 'd5' });
  });

  it('parses castling by name, both sides', () => {
    expect(parseSpokenMove('castle kingside', CASTLE_BOTH)?.san).toBe('O-O');
    expect(parseSpokenMove('castles long', CASTLE_BOTH)?.san).toBe('O-O-O');
    expect(parseSpokenMove('castle queenside', CASTLE_BOTH)?.san).toBe('O-O-O');
  });

  it('returns null on genuine ambiguity — never guesses', () => {
    // Both knights reach d5; "knight to d5" is ambiguous.
    expect(parseSpokenMove('knight to d5', TWO_KNIGHTS)).toBeNull();
  });

  it('disambiguates with an origin square ("knight from c3 to d5")', () => {
    expect(parseSpokenMove('knight from c 3 to d 5', TWO_KNIGHTS)).toEqual({ san: 'Ncd5', from: 'c3', to: 'd5' });
  });

  it('returns null for chatter with no move in it', () => {
    expect(parseSpokenMove('hmm let me think about this', START)).toBeNull();
    expect(parseSpokenMove('', START)).toBeNull();
  });

  it('returns null for an illegal request', () => {
    expect(parseSpokenMove('queen to h5', START)).toBeNull(); // blocked at move 1
  });
});
