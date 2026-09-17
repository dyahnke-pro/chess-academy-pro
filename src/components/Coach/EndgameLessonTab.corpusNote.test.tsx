/**
 * The wire-that-fires proof at the SURFACE level (David 2026-08-07: "a wire
 * that does not fire is not a wire"; 2026-08-14: "make sure all narration
 * surfaces are wired in"): when the student completes a playout, the
 * post-completion farmed-corpus note actually RENDERS on the position card —
 * not merely that the retrieval function exists. Playout is mocked to its
 * completed state; the corpus + retrieval are REAL (full 4-corpus load).
 */
import { describe, it, expect, vi , beforeAll} from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// 🔒 CALL IT, DO NOT MERELY IMPORT IT (2026-09-17). `loadFullCorpus` exports a
// FUNCTION and does nothing on import, so the side-effect-only import that used
// to sit here primed NOTHING: selection saw only the two STATIC corpora (danya +
// chessbrah, 11,385 of 58,124 notes — 19.6%), and since 2026-08-26 those ship
// FLOATING-ONLY, so any exact-position assertion was querying an index that
// cannot contain a hit. Every check in this file was green against a fifth of
// the data.
import { loadFullCorpus } from '../../test/loadFullCorpus';
import { EndgameLessonTab } from './EndgameLessonTab';
import { getRookEndings } from '../../services/endgameLessonsService';
import { endgameNoteForLesson } from '../../services/danyaTeachingService';

vi.mock('../../hooks/useEndgamePlayout', () => ({
  useEndgamePlayout: () => ({
    fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1',
    studentSide: 'white',
    phase: 'complete',
    studentMovesPlayed: 3,
    curatedStudentMoves: 3,
    wrongAttempts: 0,
    wrongSquare: null,
    firstTryPerfect: true,
    isComplete: true,
    fallbackOutcome: null,
    expectedSan: null,
    hintMove: null,
    hintRevealed: false,
    curatedRepliesRemaining: 0,
    studentMoveLog: [],
    onPieceDrop: () => false,
    playMove: () => false,
    reset: () => undefined,
    reveal: () => undefined,
    revealHint: () => undefined,
  }),
}));

describe('endgame corpus note renders on the surface', () => {
  beforeAll(() => {
    const loaded = loadFullCorpus();
    const total = loaded.reduce((n, c) => n + c.notes, 0);
    // Non-vacuity: with the fetched corpora missing from disk every assertion
    // below would measure an empty index and this gate would be theatre.
    expect(total, `corpora loaded: ${JSON.stringify(loaded)}`).toBeGreaterThan(20_000);
  }, 180_000);

  // Sync render + assert — the retrieval is synchronous and the card is on
  // the first committed frame; the generous timeout covers the full-corpus
  // import cost (~6s), not any UI wait.
  it('shows the farmed note card after the playout completes', () => {
    const rookLessons = getRookEndings();
    const lucena = rookLessons.find((l) => l.id === 'lucena-position');
    expect(lucena).toBeDefined();
    // Precondition: the retrieval genuinely fires for this lesson — if the
    // corpus stops covering it, this test names the real cause instead of
    // failing opaquely at the DOM layer.
    const note = endgameNoteForLesson({ lessonId: 'lucena-position', fen: lucena?.positions[0]?.fen ?? null });
    expect(note).not.toBeNull();

    render(
      <EndgameLessonTab
        lessons={rookLessons}
        tabLabel="Rook Endings"
        tabSubtitle=""
      />,
    );
    fireEvent.click(screen.getByTestId('endgame-lesson-lucena-position'));
    const card = screen.getByTestId('endgame-corpus-note');
    expect((card.textContent ?? '').length).toBeGreaterThan(20);
  }, 30_000);
});
