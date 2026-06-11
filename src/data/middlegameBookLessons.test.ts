import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  MIDDLEGAME_BOOK_LESSONS,
  MIDDLEGAME_BOOK_THEMES,
} from './middlegameBookLessons';
import { isResolvableSource } from './narrationSources';

// Path-B fidelity gate: every digitized lesson must be a LEGAL position whose
// authored move sequence replays move-for-move and reaches the claimed outcome.
// A misread diagram (wrong FEN) or a bad descriptive→algebraic conversion fails
// here — which is the whole point (the book is brought to life accurately, or
// not at all).

describe('middlegame book lessons — data integrity', () => {
  const themeIds = new Set(MIDDLEGAME_BOOK_THEMES.map((t) => t.id));

  it('has at least one lesson', () => {
    expect(MIDDLEGAME_BOOK_LESSONS.length).toBeGreaterThan(0);
  });

  for (const lesson of MIDDLEGAME_BOOK_LESSONS) {
    describe(lesson.id, () => {
      it('belongs to a declared theme', () => {
        expect(themeIds.has(lesson.themeId)).toBe(true);
      });

      it('has a legal starting FEN', () => {
        expect(() => new Chess(lesson.fen)).not.toThrow();
      });

      it('replays the technique legally and reaches the claimed outcome', () => {
        const game = new Chess(lesson.fen);
        for (const mv of lesson.technique) {
          const applied = game.move(mv.san);
          expect(applied, `illegal move ${mv.san} in ${lesson.id}`).toBeTruthy();
        }
        if (lesson.outcome === 'checkmate') {
          expect(game.isCheckmate(), `${lesson.id} did not reach mate`).toBe(true);
        }
      });

      it('vision arrows originate on a real piece on the board at that ply', () => {
        const game = new Chess(lesson.fen);
        for (const mv of lesson.technique) {
          for (const arrow of mv.arrows ?? []) {
            const piece = game.get(arrow.from as Parameters<Chess['get']>[0]);
            expect(piece, `arrow from empty ${arrow.from} in ${lesson.id}`).toBeTruthy();
          }
          game.move(mv.san);
        }
      });

      it('carries both narration registers on every move and beat', () => {
        expect(lesson.principle.say.trim().length).toBeGreaterThan(0);
        expect(lesson.principle.sayShort.trim().length).toBeGreaterThan(0);
        expect(lesson.rule.trim().length).toBeGreaterThan(0);
        for (const mv of lesson.technique) {
          expect(mv.say.trim().length).toBeGreaterThan(0);
          expect(mv.sayShort.trim().length).toBeGreaterThan(0);
          // ≤8-word Learn cue contract.
          expect(mv.sayShort.trim().split(/\s+/).length).toBeLessThanOrEqual(8);
        }
      });

      it('carries the book attribution and resolvable sources', () => {
        expect(lesson.source.bookTitle.length).toBeGreaterThan(0);
        expect(lesson.source.author.length).toBeGreaterThan(0);
        expect(lesson.source.locationLabel.length).toBeGreaterThan(0);
        expect(lesson.sources.length).toBeGreaterThan(0);
        expect(lesson.sources.every(isResolvableSource)).toBe(true);
      });
    });
  }
});
