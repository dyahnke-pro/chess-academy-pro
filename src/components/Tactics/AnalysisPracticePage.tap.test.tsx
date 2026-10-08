/**
 * THE TAP PATH (P0c, 2026-10-04): a question with a computed square key is
 * answered by tapping and graded by the deterministic SET grader through the
 * one tap hook. It used to turn the tapped square into text and hand it to
 * `gradeReadingAnswer` — an LLM verdict (G0). Every settled tap answer is
 * recorded once through `recordAnswer`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { db } from '../../db/schema';
import { useAppStore } from '../../stores/appStore';
import type { TacticsLiveContext } from '../../coach/types';
import type { ReadingQuestion } from '../../services/positionReadingService';

vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ onSquareClick, squareStyles }: { onSquareClick?: (a: { square: string }) => void; squareStyles?: Record<string, unknown> }) => (
    <div data-testid="board">
      {['d5', 'a8', 'h1'].map((s) => (
        <button key={s} data-testid={`sq-${s}`} data-lit={squareStyles?.[s] ? 'yes' : 'no'} onClick={() => onSquareClick?.({ square: s })} />
      ))}
    </div>
  ),
}));
const TACTICS: TacticsLiveContext = {
  fen: 'r3k3/1p6/5n2/3Q4/4P3/8/8/R3K3 w - - 0 1',
  immediate: [], hanging: [], threats: [], opportunities: [], lookaheadDepth: 4,
  boardFacts: {
    sideToMove: 'white', whiteKing: 'e1', blackKing: 'e8', inCheck: null,
    mateInOne: null, whitePieces: '', blackPieces: '', attackMap: [], material: 'Material is even',
  },
};
vi.mock('../../services/liveTacticsContext', () => ({
  buildFedTacticsContext: vi.fn(async () => TACTICS),
}));
const HANGING: ReadingQuestion = {
  answerMode: 'all', id: 'hanging', type: 'hanging', bucket: 'tactics', misconceptionTag: 'hung-material',
  prompt: 'Which pieces are hanging? Find every one.', answer: 'These are hanging: d5 and a8.',
  acceptTokens: ['d5', 'a8'], answerSquares: ['d5', 'a8'], negative: false,
};
const gradeSpy = vi.hoisted(() => vi.fn());
vi.mock('../../services/positionReadingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/positionReadingService')>();
  return { ...actual, buildReadingQuestions: () => [HANGING], gradeReadingAnswerDeterministic: gradeSpy };
});
const recordSpy = vi.hoisted(() => vi.fn(async () => ({ outcome: 'held', prompted: false, evidence: true, wrongTagsWritten: [] })));
vi.mock('../../services/answerRecord', () => ({ recordAnswer: recordSpy }));
vi.mock('../../services/voiceService', () => ({ voiceService: { speak: vi.fn(async () => undefined) } }));

import { AnalysisPracticePage } from './AnalysisPracticePage';

const GAME_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7';

async function open(): Promise<void> {
  await db.games.add({
    id: 'g1', pgn: GAME_PGN, white: 'Me', black: 'Them', result: '1-0',
    date: '2026-06-27', event: 'Test', eco: null, whiteElo: null, blackElo: null,
    source: 'coach', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null,
  } as never);
  render(<AnalysisPracticePage />);
  await waitFor(() => expect(screen.getByTestId('analysis-practice-prompt')).toHaveTextContent('Find every one'), { timeout: 5000 });
}

beforeEach(async () => {
  await db.games.clear();
  gradeSpy.mockReset();
  recordSpy.mockClear();
  useAppStore.setState({ activeProfile: { currentRating: 1500 } as never });
});

describe('AnalysisPracticePage — tap answers through the set grader', () => {
  it('one of two found is partial; both found is right — and no LLM is asked', async () => {
    await open();
    fireEvent.click(screen.getByTestId('sq-d5'));
    await waitFor(() => expect(screen.getByTestId('sq-d5').getAttribute('data-lit')).toBe('yes'));
    expect(screen.queryByTestId('analysis-practice-verdict')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('sq-a8'));
    await waitFor(() => expect(screen.getByTestId('analysis-practice-verdict')).toHaveTextContent('Correct'));
    expect(gradeSpy).not.toHaveBeenCalled();
    expect(recordSpy).toHaveBeenCalledTimes(1);
    const rec = (recordSpy.mock.calls[0] as unknown[])[0] as { origin: string; solved: boolean; questionTag: string; answer: { taps: Array<{ square: string; right: boolean }>; surface: string; wrongAttempts: number } };
    expect(rec).toMatchObject({ origin: 'reading', solved: true, questionTag: 'hung-material' });
    expect(rec.answer.taps).toEqual([{ square: 'd5', right: true }, { square: 'a8', right: true }]);
    expect(rec.answer).toMatchObject({ surface: 'analysis-practice', wrongAttempts: 0 });
  });

  it('a wrong tap says "Not quite" with the tries left and does not settle', async () => {
    await open();
    fireEvent.click(screen.getByTestId('sq-h1'));
    await waitFor(() => expect(screen.getByTestId('analysis-practice-feedback')).toHaveTextContent('2 tries left'));
    expect(recordSpy).not.toHaveBeenCalled();
    expect(gradeSpy).not.toHaveBeenCalled();
  });
});
