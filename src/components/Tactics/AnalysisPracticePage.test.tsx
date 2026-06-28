import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { db } from '../../db/schema';
import { useAppStore } from '../../stores/appStore';
import type { TacticsLiveContext } from '../../coach/types';

// ── Mocks ───────────────────────────────────────────────────────────────────

// Board is heavy (canvas/measure) — stub it to a marker div.
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen }: { fen: string }) => <div data-testid="board" data-fen={fen} />,
}));

// Engine-backed answer key — return a fixed package with a hanging piece so a
// concrete question is built (no Stockfish in tests).
const TACTICS: TacticsLiveContext = {
  immediate: [], hanging: [], threats: [], opportunities: [], lookaheadDepth: 4,
  boardFacts: {
    sideToMove: 'white', whiteKing: 'e1', blackKing: 'e8', inCheck: null,
    mateInOne: null, whitePieces: '', blackPieces: '', attackMap: [], material: 'Material is even',
  },
};
vi.mock('../../services/liveTacticsContext', () => ({
  buildFedTacticsContext: vi.fn(async () => TACTICS),
}));

// Grader → deterministic stub so no LLM/network.
vi.mock('../../services/positionReadingGrader', () => ({
  gradeReadingAnswer: vi.fn(async () => ({ verdict: 'correct', correctAnswer: 'Material is even', note: 'Nice.' })),
}));

import { AnalysisPracticePage } from './AnalysisPracticePage';

const GAME_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7';

beforeEach(async () => {
  await db.games.clear();
  useAppStore.setState({ activeProfile: { currentRating: 1500 } as never });
});

describe('AnalysisPracticePage', () => {
  it('shows the empty state when the user has no games', async () => {
    render(<AnalysisPracticePage />);
    await waitFor(() => expect(screen.getByTestId('analysis-practice-empty')).toBeInTheDocument());
    expect(screen.getByTestId('analysis-practice-empty-cta')).toBeInTheDocument();
  });

  it('loads a position from a stored game and grades a typed read', async () => {
    await db.games.add({
      id: 'g1', pgn: GAME_PGN, white: 'Me', black: 'Them', result: '1-0',
      date: '2026-06-27', event: 'Test', eco: null, whiteElo: null, blackElo: null,
      source: 'coach', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null,
    } as never);

    render(<AnalysisPracticePage />);

    // A question prompt renders once a position is sampled + analysed.
    await waitFor(() => expect(screen.getByTestId('analysis-practice-prompt')).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByTestId('board')).toBeInTheDocument();

    // Answer + Send → a CORRECT read surfaces the verdict and AUTO-ADVANCES
    // (no manual Next button on correct — David 2026-06-28).
    fireEvent.change(screen.getByTestId('analysis-practice-input'), { target: { value: 'material is even' } });
    fireEvent.click(screen.getByTestId('analysis-practice-submit'));
    await waitFor(() => expect(screen.getByTestId('analysis-practice-verdict')).toBeInTheDocument());
    expect(screen.queryByTestId('analysis-practice-next')).not.toBeInTheDocument();
  });

  it('shows a progressive grounded HINT on a wrong answer (no answer handed over)', async () => {
    const grader = await import('../../services/positionReadingGrader');
    vi.mocked(grader.gradeReadingAnswer).mockResolvedValueOnce({ verdict: 'wrong', correctAnswer: 'Material is even', note: 'no' });
    await db.games.add({
      id: 'g1', pgn: GAME_PGN, white: 'Me', black: 'Them', result: '1-0',
      date: '2026-06-27', event: 'Test', eco: null, whiteElo: null, blackElo: null,
      source: 'coach', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null,
    } as never);
    render(<AnalysisPracticePage />);
    await waitFor(() => expect(screen.getByTestId('analysis-practice-prompt')).toBeInTheDocument(), { timeout: 5000 });

    fireEvent.change(screen.getByTestId('analysis-practice-input'), { target: { value: 'totally wrong' } });
    fireEvent.click(screen.getByTestId('analysis-practice-submit'));
    // First miss → a hint appears, the answer is NOT revealed, retry stays open.
    await waitFor(() => expect(screen.getByTestId('analysis-practice-hint')).toBeInTheDocument());
    expect(screen.queryByTestId('analysis-practice-answer')).not.toBeInTheDocument();
    expect(screen.getByTestId('analysis-practice-input')).toBeInTheDocument();
  });
});
