import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import repertoire from './repertoire.json';

interface RepertoireEntry {
  id: string;
  name: string;
  pgn: string;
  trapLines?: { name: string; pgn: string }[];
  variations?: { name: string; pgn: string; explanation?: string }[];
}

/**
 * Play a PGN string through chess.js and verify every move is legal.
 * Returns the final Chess instance on success, or throws on illegal move.
 */
function validatePgn(pgn: string): Chess {
  const chess = new Chess();
  const moves = pgn.trim().split(/\s+/);
  for (let i = 0; i < moves.length; i++) {
    const result = chess.move(moves[i]);
    if (!result) {
      throw new Error(`Illegal move "${moves[i]}" at half-move ${i + 1} in: ${pgn}`);
    }
  }
  return chess;
}

/**
 * Check if a side has castled by scanning move history for O-O or O-O-O.
 */
function hasCastled(pgn: string, color: 'white' | 'black'): boolean {
  const moves = pgn.trim().split(/\s+/);
  for (let i = 0; i < moves.length; i++) {
    const isWhiteMove = i % 2 === 0;
    if ((color === 'white' && isWhiteMove) || (color === 'black' && !isWhiteMove)) {
      if (moves[i] === 'O-O' || moves[i] === 'O-O-O') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if an entry's variation is an auto-imported Lichess line
 * (identified by template explanation text).
 */
function isLichessImport(explanation?: string): boolean {
  if (!explanation) return true;
  return explanation.includes('A theoretical line in the');
}

describe('repertoire.json — PGN legality', () => {
  const entries = repertoire as RepertoireEntry[];

  it('has 40 openings', () => {
    expect(entries).toHaveLength(40);
  });

  describe('all PGN lines contain only legal moves', () => {
    for (const entry of entries) {
      it(`${entry.name} — main line`, () => {
        expect(() => validatePgn(entry.pgn)).not.toThrow();
      });

      if (entry.trapLines) {
        for (const trap of entry.trapLines) {
          it(`${entry.name} — trap: ${trap.name}`, () => {
            expect(() => validatePgn(trap.pgn)).not.toThrow();
          });
        }
      }

      if (entry.variations) {
        for (const variation of entry.variations) {
          it(`${entry.name} — var: ${variation.name}`, () => {
            expect(() => validatePgn(variation.pgn)).not.toThrow();
          });
        }
      }
    }
  });
});

describe('repertoire.json — development depth (main lines)', () => {
  const entries = repertoire as RepertoireEntry[];

  for (const entry of entries) {
    it(`${entry.name} — main line reaches full development`, () => {
      const chess = validatePgn(entry.pgn);
      const moves = entry.pgn.trim().split(/\s+/);

      // Both sides should have castled (or king moved for safety in exceptional cases)
      const whiteCastled = hasCastled(entry.pgn, 'white');
      const blackCastled = hasCastled(entry.pgn, 'black');

      // Special exceptions:
      // - Fried Liver: Black's king moves early (can't castle)
      // - Benko Gambit: White castles by hand (Kf1-Kg2) after fianchetto
      const exceptions = ['fried-liver-attack', 'benko-gambit'];
      const isException = exceptions.includes(entry.id);

      if (!isException) {
        expect(whiteCastled).toBe(true);
        expect(blackCastled).toBe(true);
      }

      // Should have at least 16 half-moves for reasonable development
      expect(moves.length).toBeGreaterThanOrEqual(16);

      // Check that the final position is legal
      expect(chess.isGameOver()).toBe(false);
    });
  }
});

describe('repertoire.json — development depth (authored variations)', () => {
  const entries = repertoire as RepertoireEntry[];

  for (const entry of entries) {
    if (!entry.variations) continue;

    for (const variation of entry.variations) {
      // Skip Lichess-imported sidelines
      if (isLichessImport(variation.explanation)) continue;

      it(`${entry.name} — ${variation.name} reaches reasonable depth`, () => {
        const moves = variation.pgn.trim().split(/\s+/);
        // Authored variations should have at least 10 half-moves
        expect(moves.length).toBeGreaterThanOrEqual(10);
      });
    }
  }
});
