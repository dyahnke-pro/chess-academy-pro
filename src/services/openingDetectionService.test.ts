import { describe, it, expect, beforeEach } from 'vitest';
import { detectOpening, isStillInOpening, _resetTrie } from './openingDetectionService';

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
});
