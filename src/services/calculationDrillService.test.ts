import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  getCalculationSkills,
  getCalculationSkillById,
  getDrillPuzzles,
  getDrillPuzzleCount,
  skillAcceptsPuzzle,
  solutionEndsInMate,
} from './calculationDrillService';

/** Calculation drill invariants:
 *  1. Six skills exist with the documented IDs
 *  2. Every skill has ≥50 puzzles in our local 15K-puzzle subset
 *  3. Every drill returns ≤ requested limit
 *  4. Every drill puzzle's FEN is chess.js-legal AND its first
 *     solution move is replay-legal (so the UI can verify user
 *     drops against it)
 *  5. Drill puzzles are sorted by rating ascending (difficulty
 *     ladder)
 *  6. Same seed → same puzzle order (reproducibility) */

describe('calculationDrillService', () => {
  describe('skill catalog', () => {
    it('exposes the 7 calculation skills', () => {
      const skills = getCalculationSkills();
      expect(skills.length).toBe(7);
      const ids = skills.map((s) => s.id);
      expect(ids).toEqual([
        'find-the-mate',
        'quiet-move',
        'forcing-sequence',
        'defensive-calc',
        'race-calculation',
        'tactical-pattern',
        'adaptive-mixed',
      ]);
    });

    it('returns null for unknown skill ID', () => {
      expect(getCalculationSkillById('not-a-skill')).toBeNull();
    });

    it('returns the skill when found', () => {
      const found = getCalculationSkillById('quiet-move');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Quiet Move');
    });
  });

  describe('drill puzzle filtering', () => {
    it('every skill has ≥50 puzzles available', () => {
      const skills = getCalculationSkills();
      for (const skill of skills) {
        const count = getDrillPuzzleCount(skill.id);
        expect(count).toBeGreaterThanOrEqual(50);
      }
    });

    it('respects the limit option', () => {
      const fives = getDrillPuzzles('find-the-mate', { limit: 5, seed: 1 });
      expect(fives.length).toBe(5);
      const tens = getDrillPuzzles('find-the-mate', { limit: 10, seed: 1 });
      expect(tens.length).toBe(10);
    });

    it('every drill puzzle has a chess.js-legal FEN', () => {
      const puzzles = getDrillPuzzles('find-the-mate', { limit: 20, seed: 1 });
      for (const p of puzzles) {
        expect(() => new Chess(p.fen)).not.toThrow();
      }
    });

    it('every drill puzzle has a replay-legal first solution move', () => {
      // Puzzle FENs are AFTER the opponent's last move; the first
      // move in `moves` is the user's expected answer. Must be
      // playable from the FEN.
      const puzzles = getDrillPuzzles('find-the-mate', { limit: 20, seed: 1 });
      for (const p of puzzles) {
        const c = new Chess(p.fen);
        const firstMove = p.moves.split(' ')[0];
        const from = firstMove.slice(0, 2);
        const to = firstMove.slice(2, 4);
        const promotion = firstMove.length > 4 ? firstMove.slice(4) : undefined;
        expect(() =>
          c.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined }),
        ).not.toThrow();
      }
    });

    it('drill puzzles are sorted by rating ascending', () => {
      const puzzles = getDrillPuzzles('quiet-move', { limit: 10, seed: 1 });
      for (let i = 1; i < puzzles.length; i += 1) {
        const bucketA = Math.floor(puzzles[i - 1].rating / 50);
        const bucketB = Math.floor(puzzles[i].rating / 50);
        expect(bucketA).toBeLessThanOrEqual(bucketB);
      }
    });

    it('same seed yields same puzzle order (reproducibility)', () => {
      const a = getDrillPuzzles('find-the-mate', { limit: 5, seed: 42 });
      const b = getDrillPuzzles('find-the-mate', { limit: 5, seed: 42 });
      expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
    });

    it('different seeds yield (probably) different orders within a rating band', () => {
      const a = getDrillPuzzles('find-the-mate', { limit: 10, seed: 1 });
      const b = getDrillPuzzles('find-the-mate', { limit: 10, seed: 999 });
      // At least one of the 10 should differ — different seeds
      // shuffle within rating buckets.
      const sameIds = a.filter((p, i) => p.id === b[i]?.id).length;
      expect(sameIds).toBeLessThan(10);
    });

    it('returns empty for unknown skill ID', () => {
      expect(getDrillPuzzles('not-a-skill', { limit: 5 })).toEqual([]);
    });

    it('find-the-mate excludes mateIn1 puzzles', () => {
      const puzzles = getDrillPuzzles('find-the-mate', { limit: 100, seed: 1 });
      for (const p of puzzles) {
        expect(p.themes.includes('mateIn1')).toBe(false);
      }
    });
  });
});

describe('Find the Mate — the line must END in checkmate, not just be tagged', () => {
  const skill = getCalculationSkillById('find-the-mate');
  // Mate-tagged but the line ends quietly (the live walk served one that
  // ended "...Rxh2", winning the queen, with no mate on the board).
  const taggedNotMate = {
    id: 'fake-mate', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: 'e2e4 e7e5 g1f3', themes: ['mateIn2'],
  };
  // Scholar's mate from the start position — a real mate ending.
  const realMate = {
    id: 'real-mate', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: 'e2e4 e7e5 f1c4 b8c6 d1h5 g8f6 h5f7', themes: ['mateIn2'],
  };

  it('rejects a mate-tagged line that does not end in checkmate', () => {
    expect(skill).not.toBeNull();
    if (!skill) return;
    expect(skillAcceptsPuzzle(skill, taggedNotMate)).toBe(false);
    expect(skillAcceptsPuzzle(skill, realMate)).toBe(true);
  });

  it('every Find-the-Mate drill puzzle replays to checkmate', { timeout: 30000 }, () => {
    const all = getDrillPuzzles('find-the-mate', { limit: 100000 });
    expect(all.length).toBeGreaterThan(50);
    for (const p of all) expect(solutionEndsInMate(p), p.id).toBe(true);
  });

  it('the mate gate does not touch non-mate skills', () => {
    const quiet = getCalculationSkillById('quiet-move');
    if (!quiet) throw new Error('quiet-move missing');
    expect(skillAcceptsPuzzle(quiet, { ...taggedNotMate, themes: ['quietMove'] })).toBe(true);
  });
});
