import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../../db/schema';
import { buildGameRecord } from '../../test/factories';
import type { MoveAnnotation } from '../../types';

// THE READ-AHEAD (2026-10-13, chesscom-1040709576): the review never opens on
// the sweep's draft grades. It reads the game at review depth a stretch ahead of
// the walk and hands the walk only what those reads graded.

// A probe for the 235 KB review: it shows what it was handed.
vi.mock('./CoachGameReview', () => ({
  CoachGameReview: (props: { moves: Array<{ classification: string | null }>; gradedThroughPly?: number | null; onNeedMoreGraded?: () => void }) => (
    <button data-testid="mock-review" onClick={() => props.onNeedMoreGraded?.()}>
      {`graded:${props.gradedThroughPly === null || props.gradedThroughPly === undefined ? 'all' : props.gradedThroughPly}`}
      {` classes:${props.moves.map((m) => m.classification ?? '-').join(',')}`}
    </button>
  ),
}));

/** Wait until the page has started its read-ahead and is listening, THEN
 *  advance. Starting resets the fake to "nothing read", so an advance that
 *  lands before the page subscribes is wiped (ship-check 2026-10-13: the
 *  spinner rendered first under load, the page started after the advance,
 *  and the walk never opened). */
async function advanceWhenListening(r: number, finish = false): Promise<void> {
  await waitFor(() => expect(fake.listeners.size).toBeGreaterThan(0));
  await act(async () => { fake.advanceTo(r); if (finish) fake.finish(); });
}

/** A read-ahead the test drives by hand. */
const fake = {
  ready: -1,
  listeners: new Set<(r: number) => void>(),
  finish: (): void => undefined,
  focus: vi.fn(),
  stop: vi.fn(),
  advanceTo(r: number): void { this.ready = r; for (const cb of this.listeners) cb(r); },
};
const gradeReviewThrough = vi.fn();
const finishReviewReads = vi.fn();
const analyzeSingleGame = vi.fn();
vi.mock('../../services/gameAnalysisService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/gameAnalysisService')>()),
  startReviewReads: (fens: readonly string[]) => {
    fake.ready = -1;
    fake.listeners.clear();
    const done = new Promise<void>((r) => { fake.finish = r; });
    return {
      readyThrough: () => fake.ready,
      total: fens.length,
      focus: fake.focus,
      onProgress: (cb: (r: number) => void) => { fake.listeners.add(cb); return () => fake.listeners.delete(cb); },
      done,
      stop: fake.stop,
    };
  },
  gradeReviewThrough: (...a: unknown[]) => gradeReviewThrough(...a),
  finishReviewReads: (...a: unknown[]) => finishReviewReads(...a),
  analyzeSingleGame: (...a: unknown[]) => analyzeSingleGame(...a),
}));
vi.mock('../../services/appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

import { CoachReviewSessionPage, FIRST_GRADED_PLIES } from './CoachReviewSessionPage';

// 16 plies, so the first graded stretch (12) is a real prefix.
const PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 1-0';
const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O'];
function graded(n: number, cls: MoveAnnotation['classification'] = 'good'): MoveAnnotation[] {
  return SANS.slice(0, n).map((san, i) => ({
    moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
    evaluation: 20, bestMove: null, bestMoveEval: 20, classification: cls, comment: null,
  }));
}
/** The sweep's DRAFT: it called 3.Bb5 a mistake. The review must never show it. */
const DRAFT = graded(16).map((a, i) => (i === 4 ? { ...a, classification: 'mistake' as const } : a));

function renderPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/coach/review/${id}`]}>
      <Routes><Route path="/coach/review/:gameId" element={<CoachReviewSessionPage />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  gradeReviewThrough.mockReset();
  finishReviewReads.mockReset();
  analyzeSingleGame.mockReset();
  fake.focus.mockReset();
  fake.stop.mockReset();
  gradeReviewThrough.mockImplementation(async (_g: unknown, n: number) => graded(n));
  finishReviewReads.mockImplementation(async () => graded(16));
});

describe('the review reads ahead of the walk — never the draft', () => {
  it('a game graded at review depth opens whole, with no reads', async () => {
    await db.games.put(buildGameRecord({ id: 'g-done', pgn: PGN, annotations: graded(16), fullyAnalyzed: true, analysisDepth: 16, isMasterGame: false }));
    renderPage('g-done');
    expect((await screen.findByTestId('mock-review')).textContent).toContain('graded:all');
    expect(gradeReviewThrough).not.toHaveBeenCalled();
  });

  it('a swept (draft) game waits for its first stretch of reads and never shows the draft grade', async () => {
    await db.games.put(buildGameRecord({ id: 'g-swept', pgn: PGN, annotations: DRAFT, fullyAnalyzed: true, analysisDepth: 12, isMasterGame: false }));
    renderPage('g-swept');
    await screen.findByTestId('review-analyze-spinner');
    expect(screen.queryByTestId('mock-review')).toBeNull();
    await advanceWhenListening(FIRST_GRADED_PLIES);
    const review = await screen.findByTestId('mock-review');
    expect(gradeReviewThrough).toHaveBeenCalledWith(expect.objectContaining({ id: 'g-swept' }), FIRST_GRADED_PLIES);
    expect(review.textContent).toContain(`graded:${FIRST_GRADED_PLIES}`);
    expect(review.textContent).not.toContain('mistake');
    expect(screen.getByTestId('review-reading-ahead-pill')).toBeInTheDocument();
  });

  it('the walk asking for more grades what the reads already cover', async () => {
    await db.games.put(buildGameRecord({ id: 'g-more', pgn: PGN, annotations: null, fullyAnalyzed: false, isMasterGame: false }));
    renderPage('g-more');
    await screen.findByTestId('review-analyze-spinner');
    await advanceWhenListening(FIRST_GRADED_PLIES);
    const review = await screen.findByTestId('mock-review');
    await advanceWhenListening(14);
    expect(gradeReviewThrough).toHaveBeenCalledTimes(1);
    await act(async () => { review.click(); });
    await waitFor(() => expect(gradeReviewThrough).toHaveBeenLastCalledWith(expect.anything(), 14));
    expect((await screen.findByTestId('mock-review')).textContent).toContain('graded:14');
  });

  it('the last read grades the whole game once more and stores it', async () => {
    await db.games.put(buildGameRecord({ id: 'g-all', pgn: PGN, annotations: null, fullyAnalyzed: false, isMasterGame: false }));
    renderPage('g-all');
    await screen.findByTestId('review-analyze-spinner');
    await advanceWhenListening(FIRST_GRADED_PLIES);
    await screen.findByTestId('mock-review');
    await advanceWhenListening(16, true);
    await waitFor(() => expect(finishReviewReads).toHaveBeenCalledWith('g-all'));
    await waitFor(() => expect(screen.getByTestId('mock-review').textContent).toContain('graded:all'));
    expect(screen.queryByTestId('review-reading-ahead-pill')).toBeNull();
  });

  it('leaving the review stops the reads', async () => {
    await db.games.put(buildGameRecord({ id: 'g-leave', pgn: PGN, annotations: null, fullyAnalyzed: false, isMasterGame: false }));
    const { unmount } = renderPage('g-leave');
    await screen.findByTestId('review-analyze-spinner');
    unmount();
    expect(fake.stop).toHaveBeenCalled();
  });
});
