import { describe, it, expect } from 'vitest';
import { FAIRY_TALE_CHAPTERS } from './fairyTaleChapters';
import { JOURNEY_CHAPTER_ORDER } from '../types';

describe('fairyTaleChapters', () => {
  it('has 8 chapters matching the chapter order', () => {
    expect(FAIRY_TALE_CHAPTERS).toHaveLength(JOURNEY_CHAPTER_ORDER.length);
  });

  it('chapter IDs match JOURNEY_CHAPTER_ORDER', () => {
    const ids = FAIRY_TALE_CHAPTERS.map((c) => c.id);
    expect(ids).toEqual([...JOURNEY_CHAPTER_ORDER]);
  });

  it('every chapter has a non-empty title', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      expect(chapter.title.length).toBeGreaterThan(0);
    }
  });

  it('every chapter has a non-empty subtitle', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      expect(chapter.subtitle.length).toBeGreaterThan(0);
    }
  });

  it('every chapter has a non-empty storyIntro', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      expect(chapter.storyIntro.length).toBeGreaterThan(0);
    }
  });

  it('every chapter has a non-empty storyOutro', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      expect(chapter.storyOutro.length).toBeGreaterThan(0);
    }
  });

  it('every chapter has at least one lesson', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      expect(chapter.lessons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every chapter has at least one puzzle', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      expect(chapter.puzzles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every lesson has a non-empty fen string', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      for (const lesson of chapter.lessons) {
        expect(lesson.fen.length).toBeGreaterThan(0);
      }
    }
  });

  it('every puzzle has a non-empty solution array', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      for (const puzzle of chapter.puzzles) {
        expect(puzzle.solution.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every puzzle has a non-empty hint', () => {
    for (const chapter of FAIRY_TALE_CHAPTERS) {
      for (const puzzle of chapter.puzzles) {
        expect(puzzle.hint.length).toBeGreaterThan(0);
      }
    }
  });

  it('chapters have unique IDs', () => {
    const ids = FAIRY_TALE_CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chapter 1 is the pawn chapter with fairy tale narrative', () => {
    const pawnChapter = FAIRY_TALE_CHAPTERS[0];
    expect(pawnChapter.id).toBe('pawn');
    expect(pawnChapter.title).toBe('The Humble Hero');
  });

  it('chapter 3 is the bishop (Lightning Wizard)', () => {
    const bishopChapter = FAIRY_TALE_CHAPTERS.find((c) => c.id === 'bishop');
    expect(bishopChapter).toBeDefined();
    expect(bishopChapter?.title).toBe('The Lightning Wizard');
  });

  it('chapter 4 is the knight (Shadow Stallion)', () => {
    const knightChapter = FAIRY_TALE_CHAPTERS.find((c) => c.id === 'knight');
    expect(knightChapter).toBeDefined();
    expect(knightChapter?.title).toBe('The Shadow Stallion');
  });
});
