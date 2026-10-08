/**
 * EVERY submitted answer shows something (walk 2026-10-03): "the bishop on g4
 * pins the knight" and "Qa4+" to "Who is ahead in material?" produced nothing
 * at all, then "e4" read "Not quite". An answer to a different question is told
 * what kind of answer fits and costs no attempt; a wrong read says so.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { db } from '../../db/schema';
import { useAppStore } from '../../stores/appStore';
import type { TacticsLiveContext } from '../../coach/types';

vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen }: { fen: string }) => <div data-testid="board" data-fen={fen} />,
}));
const TACTICS: TacticsLiveContext = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  immediate: [], hanging: [], threats: [], opportunities: [], lookaheadDepth: 4,
  boardFacts: {
    sideToMove: 'white', whiteKing: 'e1', blackKing: 'e8', inCheck: null,
    mateInOne: null, whitePieces: '', blackPieces: '', attackMap: [], material: 'Material is even',
  },
};
vi.mock('../../services/liveTacticsContext', () => ({
  buildFedTacticsContext: vi.fn(async () => TACTICS),
}));
// Only the material question, so the test drives exactly the walk's prompt.
const gradeSpy = vi.hoisted(() => vi.fn());
vi.mock('../../services/positionReadingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/positionReadingService')>();
  return {
    ...actual,
    gradeReadingAnswerDeterministic: gradeSpy,
    buildReadingQuestions: (...args: Parameters<typeof actual.buildReadingQuestions>) =>
      actual.buildReadingQuestions(...args).filter((q) => q.type === 'material'),
  };
});

import { AnalysisPracticePage } from './AnalysisPracticePage';

const GAME_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7';

async function openMaterialQuestion(): Promise<void> {
  await db.games.add({
    id: 'g1', pgn: GAME_PGN, white: 'Me', black: 'Them', result: '1-0',
    date: '2026-06-27', event: 'Test', eco: null, whiteElo: null, blackElo: null,
    source: 'coach', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null,
  } as never);
  render(<AnalysisPracticePage />);
  await waitFor(() => expect(screen.getByTestId('analysis-practice-prompt')).toHaveTextContent('Who is ahead in material'), { timeout: 5000 });
}

function send(text: string): void {
  fireEvent.change(screen.getByTestId('analysis-practice-input'), { target: { value: text } });
  fireEvent.click(screen.getByTestId('analysis-practice-submit'));
}

beforeEach(async () => {
  await db.games.clear();
  gradeSpy.mockReset();
  useAppStore.setState({ activeProfile: { currentRating: 1500 } as never });
});

describe('AnalysisPracticePage — every answer gets feedback', () => {
  it('an answer to a different question says what kind of answer fits, and is not graded or counted', async () => {
    await openMaterialQuestion();
    send('the bishop on g4 pins the knight');
    await waitFor(() => expect(screen.getByTestId('analysis-practice-feedback')).toHaveTextContent("who's ahead and by how much"));
    expect(screen.getByTestId('analysis-practice-feedback').getAttribute('data-tone')).toBe('shape');
    send('Qa4+');
    send('e4');
    // Three unreadable answers: still no grade, no hint, no reveal — nothing was spent.
    expect(gradeSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('analysis-practice-hint')).not.toBeInTheDocument();
    expect(screen.queryByTestId('analysis-practice-answer')).not.toBeInTheDocument();
  });

  it('a wrong read that IS an answer shows "Not quite" with the tries left', async () => {
    gradeSpy.mockReturnValue({ verdict: 'wrong', correctAnswer: 'Material is even', note: 'no' });
    await openMaterialQuestion();
    send('white is up two');
    await waitFor(() => expect(screen.getByTestId('analysis-practice-feedback')).toHaveTextContent('Not quite — try again. 2 tries left.'));
    expect(gradeSpy).toHaveBeenCalledTimes(1);
  });
});
