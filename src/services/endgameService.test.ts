import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  getAllPatterns,
  getPatternById,
  getRecognitionPosition,
  getPracticePuzzles,
  getPracticePuzzleCount,
  buildMatingPatternLesson,
} from './endgameService';

describe('endgameService — mating-pattern data invariants', () => {
  it('loads 37 patterns from mating-patterns.json', () => {
    expect(getAllPatterns().length).toBe(37);
  });

  it('returns null for unknown pattern id', () => {
    expect(getPatternById('made-up-mate')).toBeNull();
  });

  it('every pattern has hand-crafted intro + recognition narration', () => {
    for (const p of getAllPatterns()) {
      expect(p.narration.intro.length).toBeGreaterThan(20);
      expect(p.narration.recognition.length).toBeGreaterThan(15);
    }
  });

  it('every pattern has at least one valid lessonPosition FEN', () => {
    for (const p of getAllPatterns()) {
      expect(p.lessonPositions.length).toBeGreaterThan(0);
      // Every FEN must parse via chess.js.
      for (const lp of p.lessonPositions) {
        expect(() => new Chess(lp.fen)).not.toThrow();
      }
    }
  });
});

describe('endgameService — practice puzzle filtering', () => {
  // David's directive: practice corpus must NOT include mate-in-1
  // (recognition only, no setup practice). Multi-move mates only.
  it('practice puzzles never include mateIn1 theme', () => {
    for (const p of getAllPatterns()) {
      const puzzles = getPracticePuzzles(p, { seed: 1 });
      for (const pz of puzzles) {
        expect(pz.themes).not.toContain('mateIn1');
        expect(
          pz.themes.some((t) =>
            ['mateIn2', 'mateIn3', 'mateIn4', 'mateIn5'].includes(t),
          ),
        ).toBe(true);
      }
    }
  });

  it('returns empty for patterns without a Lichess theme tag', () => {
    // Untagged patterns should NOT fall through to "any multi-move
    // mate." Anderssen, Damiano, Légal, Triangle, etc. — and all
    // piece-mate fundamentals.
    const anderssen = getPatternById('anderssens-mate');
    expect(anderssen?.puzzleThemeTag).toBeUndefined();
    expect(getPracticePuzzles(anderssen!, { seed: 1 })).toEqual([]);
    const queenMate = getPatternById('queen-mate');
    expect(getPracticePuzzles(queenMate!, { seed: 1 })).toEqual([]);
  });

  it('Back-Rank Mate has at least 200 multi-move puzzles', () => {
    const p = getPatternById('back-rank-mate');
    const count = getPracticePuzzleCount(p!);
    expect(count).toBeGreaterThanOrEqual(200);
  });

  it('Smothered Mate has at least 25 multi-move puzzles', () => {
    const p = getPatternById('smothered-mate');
    expect(getPracticePuzzleCount(p!)).toBeGreaterThanOrEqual(25);
  });

  it('Anastasia Mate has at least 15 multi-move puzzles', () => {
    const p = getPatternById('anastasias-mate');
    expect(getPracticePuzzleCount(p!)).toBeGreaterThanOrEqual(15);
  });

  it('within-tier shuffle is seed-stable but seed-different', () => {
    const p = getPatternById('back-rank-mate');
    const a = getPracticePuzzles(p!, { seed: 1, tier: 'beginner', limit: 10 });
    const b = getPracticePuzzles(p!, { seed: 1, tier: 'beginner', limit: 10 });
    const c = getPracticePuzzles(p!, { seed: 999, tier: 'beginner', limit: 10 });
    // Same seed → same order.
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    // Different seed → at least one puzzle in a different position
    // within a rating bucket. (Could be the same if all 10 happen to
    // be in different buckets, but back-rank has hundreds of
    // similar-rated puzzles so collisions within buckets are common.)
    expect(c.map((x) => x.id)).not.toEqual(a.map((x) => x.id));
  });

  it('rating ascending — beginner tier puzzles average lower than advanced', () => {
    const p = getPatternById('back-rank-mate');
    const beg = getPracticePuzzles(p!, { tier: 'beginner', seed: 1 });
    const adv = getPracticePuzzles(p!, { tier: 'advanced', seed: 1 });
    if (beg.length > 0 && adv.length > 0) {
      const avgBeg = beg.reduce((s, x) => s + x.rating, 0) / beg.length;
      const avgAdv = adv.reduce((s, x) => s + x.rating, 0) / adv.length;
      expect(avgBeg).toBeLessThan(avgAdv);
    }
  });
});

describe('endgameService — buildMatingPatternLesson', () => {
  it('returns null for patterns without practice puzzles', () => {
    const anderssen = getPatternById('anderssens-mate');
    expect(buildMatingPatternLesson(anderssen!, { seed: 1 })).toBeNull();
  });

  it('builds a lesson tree for back-rank-mate at index 0', () => {
    const p = getPatternById('back-rank-mate');
    const r = buildMatingPatternLesson(p!, {
      tier: 'beginner',
      seed: 42,
      puzzleIndex: 0,
    });
    expect(r).not.toBeNull();
    expect(r!.puzzleIndex).toBe(0);
    expect(r!.totalAvailable).toBeGreaterThan(0);
    // Mate must be at least mate-in-2 (David's directive).
    expect(r!.movesToMate).toBeGreaterThanOrEqual(2);
    // Tree carries the hand-crafted intro narration.
    expect(r!.tree.intro.length).toBeGreaterThan(50);
    expect(r!.tree.startFen).toBeTruthy();
    expect(r!.tree.studentSide).toMatch(/^(white|black)$/);
    // Root has fork children (the find-the-mate menu).
    expect(r!.tree.root.children.length).toBeGreaterThanOrEqual(2); // correct + ≥1 distractor
  });

  it('puzzleIndex wraps around past the corpus size', () => {
    const p = getPatternById('back-rank-mate');
    const total = getPracticePuzzleCount(p!);
    const r = buildMatingPatternLesson(p!, {
      tier: 'mixed',
      seed: 42,
      puzzleIndex: total + 5,
    });
    expect(r).not.toBeNull();
    // Wrapped modulo corpus size.
    expect(r!.puzzleIndex).toBeLessThan(total);
  });

  it('different seeds surface different first puzzles at the same index', () => {
    const p = getPatternById('back-rank-mate');
    const a = buildMatingPatternLesson(p!, { tier: 'beginner', seed: 1, puzzleIndex: 0 });
    const b = buildMatingPatternLesson(p!, { tier: 'beginner', seed: 99999, puzzleIndex: 0 });
    expect(a?.tree.startFen).not.toBe(b?.tree.startFen);
  });

  it('tier fallback: requesting beginner falls through to intermediate when no beginner puzzles', () => {
    // Smothered Mate has 0 beginner puzzles in the DB but ~22
    // intermediate. The builder must produce a lesson rather than
    // null out.
    const p = getPatternById('smothered-mate');
    const r = buildMatingPatternLesson(p!, {
      tier: 'beginner',
      seed: 1,
      puzzleIndex: 0,
    });
    expect(r).not.toBeNull();
  });

  it('intro narration includes hand-crafted prose for the first puzzle', () => {
    const p = getPatternById('back-rank-mate');
    const r = buildMatingPatternLesson(p!, {
      tier: 'beginner',
      seed: 42,
      puzzleIndex: 0,
    });
    // First puzzle of session — full intro plays.
    expect(r!.tree.intro).toContain('back-rank mate');
    // Second puzzle — short lead-in only (no full intro re-narrated).
    const r2 = buildMatingPatternLesson(p!, {
      tier: 'beginner',
      seed: 42,
      puzzleIndex: 1,
    });
    expect(r2!.tree.intro).toContain('Next position');
    expect(r2!.tree.intro.length).toBeLessThan(80);
  });
});

describe('endgameService — getRecognitionPosition', () => {
  it('returns the mate-in-1 position when present', () => {
    const p = getPatternById('anastasias-mate');
    const rp = getRecognitionPosition(p!);
    expect(rp).not.toBeNull();
    expect(rp!.movesToMate).toBe(1);
  });
});
