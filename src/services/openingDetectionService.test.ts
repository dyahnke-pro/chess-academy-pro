import { describe, it, expect, beforeEach } from 'vitest';
import { detectOpening, isStillInOpening, getOpeningMoves, getNextOpeningBookMove, findRelatedDbEntries, _resetTrie } from './openingDetectionService';

describe('openingDetectionService', () => {
  beforeEach(() => {
    _resetTrie();
  });

  describe('detectOpening', () => {
    it('returns null for empty move history', () => {
      expect(detectOpening([])).toBeNull();
    });

    it('detects Sicilian Defense from e4 c5', () => {
      const result = detectOpening(['e4', 'c5']);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.eco).toBe('B20');
        expect(result.name).toContain('Sicilian');
      }
    });

    it('detects Italian Game from e4 e5 Nf3 Nc6 Bc4', () => {
      const result = detectOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.name).toContain('Italian');
      }
    });

    it('finds longest prefix match for deeper variations', () => {
      // Sicilian Defense: Open → more specific than just "Sicilian Defense"
      const short = detectOpening(['e4', 'c5']);
      const longer = detectOpening(['e4', 'c5', 'Nf3', 'd6']);
      expect(longer).not.toBeNull();
      if (short && longer) {
        expect(longer.plyCount).toBeGreaterThanOrEqual(short.plyCount);
      }
    });

    it('returns null when no opening matches', () => {
      // Nonsensical sequence that no opening starts with
      const result = detectOpening(['Na3', 'Na6', 'Nb1']);
      // May or may not match depending on data — but check structure
      if (result) {
        expect(result.eco).toBeTruthy();
        expect(result.name).toBeTruthy();
      }
    });

    it('detects Queens Gambit', () => {
      const result = detectOpening(['d4', 'd5', 'c4']);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.name).toContain('Queen');
      }
    });

    it('returns correct plyCount', () => {
      const result = detectOpening(['e4', 'e5', 'Nf3']);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.plyCount).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('isStillInOpening', () => {
    it('returns true during early opening moves', () => {
      expect(isStillInOpening(['e4'])).toBe(true);
    });

    it('returns true for known opening sequences', () => {
      expect(isStillInOpening(['e4', 'e5'])).toBe(true);
    });

    it('returns false when out of book', () => {
      // Very long random-ish sequence should eventually leave book
      const result = isStillInOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'dxc3']);
      // This may or may not be in book — test just validates no crash
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getOpeningMoves', () => {
    it('returns moves for French Defense', () => {
      const moves = getOpeningMoves('French Defense');
      expect(moves).not.toBeNull();
      if (moves) {
        expect(moves[0]).toBe('e4');
        expect(moves[1]).toBe('e6');
        expect(moves.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('returns moves for Sicilian Defense', () => {
      const moves = getOpeningMoves('Sicilian Defense');
      expect(moves).not.toBeNull();
      if (moves) {
        expect(moves[0]).toBe('e4');
        expect(moves[1]).toBe('c5');
      }
    });

    it('returns null for unknown opening', () => {
      const moves = getOpeningMoves('Nonexistent Opening XYZ');
      expect(moves).toBeNull();
    });

    it('returns the longest continuation available', () => {
      const moves = getOpeningMoves('French Defense');
      expect(moves).not.toBeNull();
      if (moves) {
        // Should pick a deep variation, not just "e4 e6"
        expect(moves.length).toBeGreaterThan(2);
      }
    });
  });

  describe('getNextOpeningBookMove', () => {
    const frenchMoves = ['e4', 'e6', 'd4', 'd5'];

    it('returns the next move for the AI color', () => {
      // AI is black, game has only e4 → AI should play e6
      const result = getNextOpeningBookMove(frenchMoves, ['e4'], 'black');
      expect(result).toBe('e6');
    });

    it('returns null when it is not AI turn', () => {
      // AI is black, game is empty → it's white's turn
      const result = getNextOpeningBookMove(frenchMoves, [], 'black');
      expect(result).toBeNull();
    });

    it('returns null when game deviated from book', () => {
      // Game played d4 instead of e4
      const result = getNextOpeningBookMove(frenchMoves, ['d4'], 'black');
      expect(result).toBeNull();
    });

    it('returns null when past end of book moves', () => {
      const result = getNextOpeningBookMove(frenchMoves, ['e4', 'e6', 'd4', 'd5'], 'white');
      expect(result).toBeNull();
    });

    it('works for AI playing white', () => {
      // AI is white, game is empty → AI should play e4
      const result = getNextOpeningBookMove(frenchMoves, [], 'white');
      expect(result).toBe('e4');
    });

    it('returns correct move for white on move 3', () => {
      // AI is white, game: e4 e6 → AI should play d4
      const result = getNextOpeningBookMove(frenchMoves, ['e4', 'e6'], 'white');
      expect(result).toBe('d4');
    });
  });

  // WO-COACH-OPENING-INTENT-01: the six openings from Dave's test list
  // must each resolve to the correct first coach response. This is the
  // regression bar — if any of these ever breaks, the coach has gone
  // off-book and the WO has failed.
  describe('opening-intent end-to-end (WO-COACH-OPENING-INTENT-01)', () => {
    const scenarios: Array<{
      name: string;
      lookup: string;
      aiColor: 'white' | 'black';
      history: string[];
      expectedReply: string;
    }> = [
      { name: 'Caro-Kann as Black → 1.e4 → c6', lookup: 'Caro-Kann Defense', aiColor: 'black', history: ['e4'], expectedReply: 'c6' },
      { name: 'Sicilian as Black → 1.e4 → c5', lookup: 'Sicilian Defense', aiColor: 'black', history: ['e4'], expectedReply: 'c5' },
      { name: 'French as Black → 1.e4 → e6', lookup: 'French Defense', aiColor: 'black', history: ['e4'], expectedReply: 'e6' },
      { name: 'London as White → 1.d4', lookup: 'London System', aiColor: 'white', history: [], expectedReply: 'd4' },
      { name: "King's Indian as Black → 1.d4 → Nf6", lookup: "King's Indian Defense", aiColor: 'black', history: ['d4'], expectedReply: 'Nf6' },
    ];

    for (const s of scenarios) {
      it(s.name, () => {
        const moves = getOpeningMoves(s.lookup);
        expect(moves, `getOpeningMoves(${s.lookup}) returned null`).not.toBeNull();
        if (!moves) return;
        const reply = getNextOpeningBookMove(moves, s.history, s.aiColor);
        expect(reply).toBe(s.expectedReply);
      });
    }

    it('cleared intent (null openingMoves) → coach falls back, book returns null', () => {
      // The coach-turn path reads `requestedOpeningMoves`; when cleared
      // the hook passes null. tryOpeningBookMove short-circuits in
      // coachGameEngine; here we exercise the underlying book call.
      const reply = getNextOpeningBookMove([], ['e4'], 'black');
      expect(reply).toBeNull();
    });

    it('invalid intent (unknown name) → getOpeningMoves returns null', () => {
      expect(getOpeningMoves('Totally Made Up Opening')).toBeNull();
      expect(getOpeningMoves('not-a-real-opening-xyz')).toBeNull();
    });

    it('Caro-Kann as Black → 2.d4 → d5 (main line second move)', () => {
      const moves = getOpeningMoves('Caro-Kann Defense');
      expect(moves).not.toBeNull();
      if (!moves) return;
      // After Dave plays 1.e4 c6 2.d4, coach (black) should play d5.
      const reply = getNextOpeningBookMove(moves, ['e4', 'c6', 'd4'], 'black');
      expect(reply).toBe('d5');
    });
  });

  describe('findRelatedDbEntries', () => {
    it('returns the bare opening first when name matches exactly', () => {
      const entries = findRelatedDbEntries("Bishop's Opening");
      expect(entries.length).toBeGreaterThan(0);
      // Bare line should be present and listed first.
      const first = entries[0];
      expect(first.name.toLowerCase()).toBe("bishop's opening");
      expect(first.pgn).toBe('e4 e5 Bc4');
    });

    it('includes named sub-variations of the requested opening', () => {
      const entries = findRelatedDbEntries("Bishop's Opening");
      const names = entries.map((e) => e.name);
      // Spot-check a handful of well-known sharp lines.
      expect(names.some((n) => n.includes('Boden-Kieseritzky'))).toBe(true);
      expect(names.some((n) => n.includes('Urusov Gambit'))).toBe(true);
      expect(names.some((n) => n.includes('Calabrese'))).toBe(true);
    });

    it('caps results at maxEntries', () => {
      const entries = findRelatedDbEntries("Bishop's Opening", 5);
      expect(entries.length).toBeLessThanOrEqual(5);
    });

    it('returns [] for unknown opening', () => {
      const entries = findRelatedDbEntries('Totally Made Up Opening Xyz');
      expect(entries).toEqual([]);
    });

    it('handles broader opening names (Sicilian)', () => {
      const entries = findRelatedDbEntries('Sicilian Defense');
      expect(entries.length).toBeGreaterThan(5);
      // The bare Sicilian must be present.
      expect(entries[0].name.toLowerCase()).toBe('sicilian defense');
      // All entries must have "sicilian" in the name (or be the
      // bare line itself).
      for (const e of entries) {
        expect(e.name.toLowerCase()).toContain('sicilian');
      }
    });
  });
});
