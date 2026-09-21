/**
 * endgameDrillService tests — verifies the per-lesson drill pool
 * is correctly filtered by themes, popularity floors, and tier
 * rating bands.
 */
import { describe, it, expect } from 'vitest';
import {
  getDrillPositionsForLesson,
  getDrillPuzzleCount,
  defaultDrillTier,
} from './endgameDrillService';
import { getEndgamePrinciples, getPawnEndings } from './endgameLessonsService';
import puzzlesData from '../data/puzzles.json';
import { conceptForLine } from './conceptEngine';
import { conceptHintForPuzzle } from './puzzleConceptHint';

describe('endgameDrillService', () => {
  it('returns empty drills for a lesson with no practiceThemes', () => {
    const fakeLesson = {
      id: 'no-themes',
      name: 'No themes',
      category: 'principle' as const,
      order: 99,
      narration: { intro: '', rule: '', why: '' },
      positions: [],
    };
    expect(getDrillPositionsForLesson(fakeLesson)).toEqual([]);
    expect(getDrillPuzzleCount(fakeLesson)).toBe(0);
  });

  it('returns drill positions for a lesson with practiceThemes', () => {
    const principles = getEndgamePrinciples();
    const lesson = principles.find((l) => (l.practiceThemes?.length ?? 0) > 0);
    expect(lesson).toBeDefined();
    if (!lesson) return;
    const drills = getDrillPositionsForLesson(lesson, { limit: 3, seed: 1 });
    expect(drills.length).toBeGreaterThan(0);
    expect(drills.length).toBeLessThanOrEqual(3);
    for (const d of drills) {
      expect(d.fen).toBeDefined();
      expect(d.bestMove).toBeDefined();
      expect(d.solution).toBeDefined();
      expect(d.solution?.length).toBeGreaterThan(0);
      expect(d.source).toMatch(/Lichess puzzle/);
    }
  });

  it('tier=beginner returns only puzzles rated < 1300', () => {
    const pawn = getPawnEndings();
    const lesson = pawn.find((l) => (l.practiceThemes?.length ?? 0) > 0);
    if (!lesson) return;
    const drills = getDrillPositionsForLesson(lesson, {
      limit: 5,
      seed: 1,
      tier: 'beginner',
    });
    for (const d of drills) {
      // Drill title carries the rating: "Drill — rating XXX"
      const m = d.title.match(/rating (\d+)/);
      if (m) {
        const rating = parseInt(m[1], 10);
        expect(rating).toBeLessThan(1300);
      }
    }
  });

  it('tier=advanced returns only puzzles rated ≥ 1700', () => {
    const pawn = getPawnEndings();
    const lesson = pawn.find((l) => (l.practiceThemes?.length ?? 0) > 0);
    if (!lesson) return;
    const drills = getDrillPositionsForLesson(lesson, {
      limit: 5,
      seed: 1,
      tier: 'advanced',
    });
    for (const d of drills) {
      const m = d.title.match(/rating (\d+)/);
      if (m) {
        const rating = parseInt(m[1], 10);
        expect(rating).toBeGreaterThanOrEqual(1700);
      }
    }
  });

  it('getDrillPuzzleCount returns a non-zero count for the mixed tier on a themed lesson', () => {
    const principles = getEndgamePrinciples();
    const lesson = principles.find((l) => (l.practiceThemes?.length ?? 0) > 0);
    if (!lesson) return;
    expect(getDrillPuzzleCount(lesson, 'mixed')).toBeGreaterThan(0);
  });

  it('per-tier counts sum to ≤ the mixed-tier count', () => {
    const principles = getEndgamePrinciples();
    const lesson = principles.find((l) => (l.practiceThemes?.length ?? 0) > 0);
    if (!lesson) return;
    const mixed = getDrillPuzzleCount(lesson, 'mixed');
    const beg = getDrillPuzzleCount(lesson, 'beginner');
    const int = getDrillPuzzleCount(lesson, 'intermediate');
    const adv = getDrillPuzzleCount(lesson, 'advanced');
    expect(beg + int + adv).toBeLessThanOrEqual(mixed);
    // Tier bands are exhaustive over the rating range so the sum
    // should equal the mixed count.
    expect(beg + int + adv).toBe(mixed);
  });

  it('different seeds yield different first puzzles (audit fix)', () => {
    // David's audit: same 3 puzzles every visit. Disease was the
    // sort: rating-asc with seed only as within-bucket tie-break,
    // so the lowest-rated bucket always surfaced first regardless
    // of seed. Fix: pure seed-shuffle across the whole pool.
    // Lock the new behavior here.
    const principles = getEndgamePrinciples();
    const lesson = principles.find((l) => (l.practiceThemes?.length ?? 0) > 100);
    if (!lesson) return; // Need a sizable pool for the test to be meaningful
    const seeds = [101, 202, 303, 404, 505];
    const firsts = seeds.map((s) => {
      const drills = getDrillPositionsForLesson(lesson, { limit: 1, seed: s });
      return drills[0]?.fen;
    });
    // At least 3 of 5 seeds should land on different puzzles.
    const unique = new Set(firsts);
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it('default limit returns way more than the old 3-puzzle cap (audit fix)', () => {
    // David's audit: "remove the three puzzles limit. I want users
    // to play as many as they want." The default is now generous
    // enough that a single session can't burn through it.
    const principles = getEndgamePrinciples();
    const lesson = principles.find((l) => (l.practiceThemes?.length ?? 0) > 100);
    if (!lesson) return;
    const all = getDrillPositionsForLesson(lesson, { seed: 1 });
    expect(all.length).toBeGreaterThan(50);
  });

  it('every drill carries the COMPUTED concept hint the engine names for its solution (P3 — a wire that fires)', () => {
    // The contract (conceptHintForPuzzle, THE one source): the engine's lead
    // concept's short register leads; the theme→hint table is only the
    // fallback when the engine's leads are positional or absent. This proves
    // the DRILL ITEM carries exactly what that source computes for its raw
    // puzzle — not that the function exists. Measured 2026-09-15 over the
    // shipped lesson corpus: 47 of 70 drills carry an engine short; the
    // vacuity floor below is well under that.
    type RawPuzzle = { id: string; fen: string; moves: string; themes: string[] };
    const byId = new Map((puzzlesData as RawPuzzle[]).map((p) => [p.id, p]));
    const lessons = [...getEndgamePrinciples(), ...getPawnEndings()].filter((l) => (l.practiceThemes?.length ?? 0) > 0);
    let engineHinted = 0;
    let checked = 0;
    for (const lesson of lessons) {
      for (const d of getDrillPositionsForLesson(lesson, { limit: 3, seed: 1 })) {
        const id = /#(\S+)/.exec(d.source ?? '')?.[1] ?? '';
        const raw = id ? byId.get(id) : undefined;
        expect(raw, `drill ${d.source} does not resolve to a puzzle`).toBeDefined();
        if (!raw) continue;
        checked += 1;
        // The drill carries what the one source computes for its raw puzzle.
        expect(d.conceptHint, `${d.source}: the drill's hint must be the computed one`).toBe(conceptHintForPuzzle({ fen: raw.fen, moves: raw.moves, themes: raw.themes }) ?? undefined);
        // …and the engine, not the tag table, named it whenever it could.
        const turn = raw.fen.split(' ')[1] === 'b' ? 'b' : 'w';
        const lead = conceptForLine({ fen: raw.fen, uci: raw.moves.split(/\s+/), studentColor: turn === 'w' ? 'b' : 'w', max: 1 }).at(0);
        if (lead && lead.source !== 'positional') {
          expect(d.conceptHint).toBe(lead.short.trim());
          engineHinted += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
    expect(engineHinted, 'the engine named nothing on any drill — the wire is not firing').toBeGreaterThanOrEqual(15);
  }, 20000);

  describe('defaultDrillTier', () => {
    it('defaults to the player endgame level (skill preferred)', () => {
      expect(defaultDrillTier({ skillRadar: { endgame: 80 } })).toBe('advanced');
      expect(defaultDrillTier({ skillRadar: { endgame: 50 } })).toBe('intermediate');
      expect(defaultDrillTier({ skillRadar: { endgame: 20 } })).toBe('beginner');
    });
    it('falls back to rating when no endgame skill', () => {
      expect(defaultDrillTier({ currentRating: 1900 })).toBe('advanced');
      expect(defaultDrillTier({ currentRating: 1500 })).toBe('intermediate');
      expect(defaultDrillTier({ currentRating: 1100 })).toBe('beginner');
    });
    it('defaults to beginner when nothing is known', () => {
      expect(defaultDrillTier(null)).toBe('beginner');
      expect(defaultDrillTier(undefined)).toBe('beginner');
    });
  });
});
