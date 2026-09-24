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
import { describe, expect, it , beforeAll} from 'vitest';
// 🔒 CALL IT, DO NOT MERELY IMPORT IT (2026-09-17). `loadFullCorpus` exports a
// FUNCTION and does nothing on import, so the side-effect-only import that used
// to sit here primed NOTHING: selection saw only the two STATIC corpora (11,385
// of 58,124 notes — 19.6%), and since 2026-08-26 those ship FLOATING-ONLY.
//
// MEASURED BOTH WAYS, because a fix that changes no number needs saying so: the
// endgame lane fires on **22 lessons either way**. Loading 52,802 further notes
// moves it not at all, which is consistent with what the corpus actually holds —
// only ~1.4% of endgame notes carry a position, so this surface is served by the
// CONCEPT tier, not the exact-position one. The gate was not hiding a defect; it
// was simply not measuring what it claimed to. It is now, and the floor below
// records the real number instead of the one it happened to clear.
import { loadFullCorpus, unprimedCorpora } from './../test/loadFullCorpus';
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
  beforeAll(() => {
    const loaded = loadFullCorpus();
    // Non-vacuity: with the fetched corpora missing from disk every assertion
    // below would measure an empty index and this gate would be theatre.
    // Derived from the registry, never a count — a hard-coded floor went stale
    // when the anchored farms were retired (see `unprimedCorpora`).
    expect(unprimedCorpora(loaded), `corpora loaded: ${JSON.stringify(loaded)}`).toEqual([]);
  }, 180_000);

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
    expect(fired, `fired for: ${firedLessons.join(', ')}`).toBeGreaterThanOrEqual(22);
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
