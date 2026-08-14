/**
 * endgameCorpusNote — the wire-that-fires gate for the endgame surface's
 * corpus access (David 2026-08-07: "I don't want to run an audit and find
 * nothing working"; 2026-08-14: "make sure all narration surfaces are wired
 * in"). Proves a REAL note comes OUT of `endgameNoteForLesson` for real
 * lessons in the shipped catalog — not that the function exists.
 *
 * Also holds the translation layer honest: every concept a lesson maps to
 * must EXIST in the endgame phase of the loaded corpus, so a re-farm that
 * drops a concept fails here instead of silently orphaning the lookup.
 */
import { describe, expect, it } from 'vitest';
import './../test/loadFullCorpus';
import {
  ENDGAME_LESSON_CONCEPTS,
  endgameNoteForLesson,
  conceptsAvailable,
  namedPiecesExistOnBoard,
} from './danyaTeachingService';
import { getAllEndgameLessons } from './endgameLessonsService';

// Any-case: transcript-farmed prose capitalizes squares ("to G4").
const NAMES_A_SQUARE = /\b[a-hA-H][1-8]\b/;

describe('endgame corpus wiring', () => {
  const lessons = getAllEndgameLessons();

  it('every lesson in the catalog has a concept mapping', () => {
    for (const lesson of lessons) {
      expect(ENDGAME_LESSON_CONCEPTS[lesson.id], `lesson ${lesson.id} unmapped`).toBeDefined();
    }
  });

  it('every mapped concept with expected coverage exists in the loaded endgame corpus', () => {
    const available = new Set(conceptsAvailable('endgame').map((c) => c.concept));
    // Each lesson needs at least ONE of its concepts present — alternates
    // (spacing/hyphen variants) are allowed to be absent.
    for (const [lessonId, concepts] of Object.entries(ENDGAME_LESSON_CONCEPTS)) {
      const present = concepts.filter((c) => available.has(c));
      expect(present.length, `lesson ${lessonId}: none of [${concepts.join(', ')}] exist in the corpus`).toBeGreaterThan(0);
    }
  });

  it('real notes come OUT for a meaningful share of the catalog (the wire fires)', () => {
    let fired = 0;
    const firedLessons: string[] = [];
    for (const lesson of lessons) {
      const fen = lesson.positions[0]?.fen ?? null;
      const note = endgameNoteForLesson({ lessonId: lesson.id, fen });
      if (note) {
        fired += 1;
        firedLessons.push(lesson.id);
        // Board-truth on everything returned: geometry-free, and every
        // piece type it names exists on the study board.
        expect(NAMES_A_SQUARE.test(note.text), `${lesson.id}: note names a square: "${note.text}"`).toBe(false);
        if (fen) {
          expect(namedPiecesExistOnBoard(note.text, fen), `${lesson.id}: note claims absent pieces: "${note.text}"`).toBe(true);
        }
        expect(note.text.trim().length).toBeGreaterThan(20);
      }
    }
    // Floor: 21/27 lessons fired on the full 4-corpus load (2026-08-14);
    // 18 leaves margin for corpus churn. Shrink-proof: a corpus or
    // retrieval regression that silences the surface fails loudly here.
    // Raise the floor as farming grows coverage; never lower. The six
    // honest gaps (two-weaknesses, breakthrough, wrong-rook-pawn-bishop,
    // stalemate-stalking, insufficient-material, vancura) close by
    // FARMING those ideas, never by loosening the guards.
    expect(fired, `fired for: ${firedLessons.join(', ')}`).toBeGreaterThanOrEqual(18);
  });

  it('dedupes across a lesson session — the same note is never handed out twice', () => {
    const lesson = lessons.find((l) => endgameNoteForLesson({ lessonId: l.id, fen: l.positions[0]?.fen ?? null }));
    expect(lesson).toBeDefined();
    if (!lesson) return;
    const seen = new Set<string>();
    const first = endgameNoteForLesson({ lessonId: lesson.id, seenIds: seen, fen: lesson.positions[0]?.fen ?? null });
    expect(first).not.toBeNull();
    const second = endgameNoteForLesson({ lessonId: lesson.id, seenIds: seen, fen: lesson.positions[0]?.fen ?? null });
    // Either a DIFFERENT note or none — never the same id twice.
    if (second) expect(second.id).not.toBe(first?.id);
  });
});
