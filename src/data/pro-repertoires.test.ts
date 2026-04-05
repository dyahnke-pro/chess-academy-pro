import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import proRepertoire from './pro-repertoires.json';

interface ProOpeningEntry {
  id: string;
  playerId: string;
  name: string;
  pgn: string;
  variations?: { name: string; pgn: string }[];
  trapLines?: { name: string; pgn: string }[];
  warningLines?: { name: string; pgn: string }[];
}

function validatePgn(pgn: string): Chess {
  const chess = new Chess();
  const moves = pgn.trim().split(/\s+/);
  for (let i = 0; i < moves.length; i++) {
    try {
      chess.move(moves[i]);
    } catch {
      throw new Error(`Illegal move "${moves[i]}" at half-move ${i + 1} in: ${pgn}`);
    }
  }
  return chess;
}

const entries = proRepertoire.openings as ProOpeningEntry[];

describe('Pro Repertoire PGN Legality', () => {
  describe.each(entries)('$name ($id)', (entry) => {
    it('main line is legal', () => {
      expect(() => validatePgn(entry.pgn)).not.toThrow();
    });

    if (entry.variations) {
      it.each(entry.variations)('variation "$name" is legal', (variation) => {
        expect(() => validatePgn(variation.pgn)).not.toThrow();
      });
    }

    if (entry.trapLines) {
      it.each(entry.trapLines)('trap line "$name" is legal', (line) => {
        expect(() => validatePgn(line.pgn)).not.toThrow();
      });
    }

    if (entry.warningLines) {
      it.each(entry.warningLines)('warning line "$name" is legal', (line) => {
        expect(() => validatePgn(line.pgn)).not.toThrow();
      });
    }
  });

  it('has all 14 players', () => {
    expect(proRepertoire.players).toHaveLength(14);
  });

  it('has 79 openings total', () => {
    expect(proRepertoire.openings).toHaveLength(80);
  });

  it('every opening has a valid playerId', () => {
    const playerIds = new Set(proRepertoire.players.map((p) => p.id));
    for (const opening of entries) {
      expect(playerIds.has(opening.playerId)).toBe(true);
    }
  });

  it('every player has at least 3 openings', () => {
    const counts: Record<string, number> = {};
    for (const opening of entries) {
      counts[opening.playerId] = (counts[opening.playerId] ?? 0) + 1;
    }
    for (const player of proRepertoire.players) {
      expect(counts[player.id]).toBeGreaterThanOrEqual(3);
    }
  });

  it('every opening id starts with pro-', () => {
    for (const opening of entries) {
      expect(opening.id).toMatch(/^pro-/);
    }
  });
});
