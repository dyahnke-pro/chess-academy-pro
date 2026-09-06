import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../../db/schema';
import { buildGameRecord } from '../../test/factories';
import type { MoveAnnotation } from '../../types';

// The review itself is a 235 KB component with its own engine wiring — mock it
// to a probe that reports it mounted and lets the test "start the walk".
vi.mock('./CoachGameReview', () => ({
  CoachGameReview: (props: { onWalkStarted?: () => void; moves: unknown[] }) => (
    <button data-testid="mock-review" onClick={() => props.onWalkStarted?.()}>
      review:{props.moves.length}
    </button>
  ),
}));

/** Deferred analyzeSingleGame so the test controls when the deepen lands. */
let resolveDeepen: (() => void) | null = null;
const analyzeSingleGame = vi.fn(() => new Promise<null>((res) => { resolveDeepen = () => res(null); }));
vi.mock('../../services/gameAnalysisService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/gameAnalysisService')>()),
  analyzeSingleGame: (id: string) => analyzeSingleGame(id),
}));
vi.mock('../../services/appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

import { CoachReviewSessionPage } from './CoachReviewSessionPage';

const PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0';
function ann(over: Partial<MoveAnnotation>): MoveAnnotation {
  return { moveNumber: 1, color: 'white', san: 'e4', evaluation: 20, bestMove: null, bestMoveEval: 10, classification: 'good', comment: null, ...over };
}
const SWEPT: MoveAnnotation[] = [
  ann({ san: 'e4' }), ann({ san: 'e5', color: 'black' }),
  ann({ moveNumber: 2, san: 'Nf3' }), ann({ moveNumber: 2, san: 'Nc6', color: 'black' }),
  ann({ moveNumber: 3, san: 'Bb5', classification: 'mistake', bestMove: 'd4' }), ann({ moveNumber: 3, san: 'a6', color: 'black' }),
];

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
  analyzeSingleGame.mockClear();
  resolveDeepen = null;
});

describe('CoachReviewSessionPage — never block on analysis the game already has', () => {
  it('renders the review IMMEDIATELY from swept (depth-stale) annotations and deepens in the background', async () => {
    // Swept: shallow depth, so gameNeedsAnalysis(depthUpgrade) says "deepen".
    await db.games.put(buildGameRecord({ id: 'g-swept', pgn: PGN, annotations: SWEPT, fullyAnalyzed: true, analysisDepth: 12, isMasterGame: false }));
    renderPage('g-swept');

    // The review is on screen while the deepen is STILL pending…
    await waitFor(() => expect(screen.getByTestId('mock-review')).toBeInTheDocument());
    expect(screen.queryByTestId('review-analyze-spinner')).toBeNull();
    // …and the deepen was kicked off, with the pill saying so.
    expect(analyzeSingleGame).toHaveBeenCalledWith('g-swept');
    expect(screen.getByTestId('review-deepening-pill')).toBeInTheDocument();

    // When it lands (walk not started) the review picks it up and the pill goes.
    await act(async () => { resolveDeepen?.(); });
    await waitFor(() => expect(screen.queryByTestId('review-deepening-pill')).toBeNull());
    expect(screen.getByTestId('mock-review')).toBeInTheDocument();
  });

  it('FREEZES the review once the walk has started — a late deepen is held for the next open', async () => {
    await db.games.put(buildGameRecord({ id: 'g-walk', pgn: PGN, annotations: SWEPT, fullyAnalyzed: true, analysisDepth: 12, isMasterGame: false }));
    renderPage('g-walk');
    const review = await screen.findByTestId('mock-review');
    const before = review.textContent;
    // Student starts the walk.
    await act(async () => { review.click(); });
    // Now the deepen lands with DIFFERENT annotations.
    await db.games.update('g-walk', { annotations: SWEPT.slice(0, 4), analysisDepth: 16 });
    await act(async () => { resolveDeepen?.(); });
    await waitFor(() => expect(screen.queryByTestId('review-deepening-pill')).toBeNull());
    // The mounted review still shows the ORIGINAL move set — nothing rewritten mid-walk.
    expect(screen.getByTestId('mock-review').textContent).toBe(before);
  });

  it('still blocks (spinner) for a game with NO usable annotations', async () => {
    await db.games.put(buildGameRecord({ id: 'g-raw', pgn: PGN, annotations: null, fullyAnalyzed: false, isMasterGame: false }));
    renderPage('g-raw');
    await waitFor(() => expect(analyzeSingleGame).toHaveBeenCalledWith('g-raw'));
    expect(screen.getByTestId('review-analyze-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-review')).toBeNull();
  });

  it('does not deepen at all when the game is already at review depth', async () => {
    await db.games.put(buildGameRecord({ id: 'g-done', pgn: PGN, annotations: SWEPT, fullyAnalyzed: true, analysisDepth: 16, isMasterGame: false }));
    renderPage('g-done');
    await screen.findByTestId('mock-review');
    expect(analyzeSingleGame).not.toHaveBeenCalled();
    expect(screen.queryByTestId('review-deepening-pill')).toBeNull();
  });
});
