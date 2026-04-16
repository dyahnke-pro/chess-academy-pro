import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, HelpCircle, Swords } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { useAppStore } from '../../stores/appStore';
import type { CheckpointQuizItem } from '../../types';

interface CheckpointQuizProps {
  quiz: CheckpointQuizItem;
  boardOrientation: 'white' | 'black';
  onComplete: (correct: boolean) => void;
  onPlayPosition?: (fen: string) => void;
}

type QuizState = 'waiting' | 'correct' | 'incorrect';

/**
 * CheckpointQuiz — "Test Yourself" checkpoint between opening sections.
 *
 * Two flavours:
 * - Plan quizzes (multiple-choice strategic question) stay inline — no
 *   board interaction needed, just pick A/B/C.
 * - Move quizzes now launch the full-screen practice session instead of
 *   trying to cram interactive chess onto a 256px thumbnail. The quiz
 *   renders a static preview of the position plus a prominent "Practice
 *   on full board" CTA that routes to `/coach/session/practice`. The
 *   practice session view validates moves via Stockfish (same scoring
 *   logic the coach uses for `[BOARD: practice:...]` prompts).
 */
export function CheckpointQuiz({
  quiz,
  boardOrientation,
  onComplete,
  onPlayPosition,
}: CheckpointQuizProps): JSX.Element {
  const navigate = useNavigate();
  const setGlobalPractice = useAppStore((s) => s.setGlobalPracticePosition);
  const [state, setState] = useState<QuizState>('waiting');
  const [showHint, setShowHint] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const isPlanQuiz = quiz.type === 'plan' && quiz.choices && quiz.correctIndex !== undefined;

  const handleChoiceSelect = useCallback(
    (index: number): void => {
      if (state !== 'waiting' || !isPlanQuiz) return;
      setSelectedChoice(index);
      const isCorrect = index === quiz.correctIndex;
      setState(isCorrect ? 'correct' : 'incorrect');
      setTimeout(() => onComplete(isCorrect), 2000);
    },
    [state, isPlanQuiz, quiz.correctIndex, onComplete],
  );

  const handlePracticeFullBoard = useCallback((): void => {
    // Route to the full-screen practice view with this position. The
    // practice session page reads globalPracticePosition on mount and
    // evaluates moves via Stockfish. Advance the quiz optimistically so
    // the openings flow continues when the user returns.
    setGlobalPractice({
      fen: quiz.fen,
      label: quiz.concept ? `Test Yourself: ${quiz.concept}` : 'Test Yourself',
    });
    onComplete(true);
    void navigate('/coach/session/practice');
  }, [navigate, onComplete, quiz.concept, quiz.fen, setGlobalPractice]);

  return (
    <div
      className="bg-theme-surface rounded-xl p-4 mb-4 border-2 border-purple-500/30"
      data-testid="checkpoint-quiz"
    >
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={14} className="text-purple-400" />
        <h3 className="text-sm font-semibold text-theme-text">
          {isPlanQuiz ? 'Strategic Question' : 'Test Yourself'}
        </h3>
        <span className="text-xs text-theme-text-muted ml-auto">{quiz.concept}</span>
      </div>

      <p className="text-sm text-theme-text-muted mb-3">
        {isPlanQuiz ? quiz.question : 'Find the best move in this position.'}
      </p>

      {/* Plan quizzes keep their inline board preview (multiple choice
          below). Move quizzes show the same preview but launch the full
          screen board for interaction. */}
      <div className="flex justify-center mb-3">
        <div className="w-64 h-64">
          <ConsistentChessboard
            fen={quiz.fen}
            boardOrientation={boardOrientation}
            interactive={false}
          />
        </div>
      </div>

      {/* Move quiz: prominent CTA to open the full-screen practice board */}
      {!isPlanQuiz && state === 'waiting' && (
        <button
          onClick={handlePracticeFullBoard}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors mb-3"
          style={{ background: 'rgb(168, 85, 247)', color: 'white' }}
          data-testid="quiz-practice-full-board"
        >
          <Swords size={16} /> Practice on full board
        </button>
      )}

      {/* Multiple choice answers for plan quizzes */}
      {isPlanQuiz && quiz.choices && (
        <div className="space-y-2 mb-3" data-testid="quiz-choices">
          {quiz.choices.map((choice, i) => {
            const isSelected = selectedChoice === i;
            const isCorrectAnswer = i === quiz.correctIndex;
            const showResult = state !== 'waiting';

            let choiceStyle = 'border-theme-border text-theme-text hover:border-purple-400/50 hover:bg-purple-500/5';
            if (showResult && isCorrectAnswer) {
              choiceStyle = 'border-green-500 bg-green-500/10 text-green-400';
            } else if (showResult && isSelected && !isCorrectAnswer) {
              choiceStyle = 'border-red-500 bg-red-500/10 text-red-400';
            }

            return (
              <button
                key={i}
                onClick={() => handleChoiceSelect(i)}
                disabled={state !== 'waiting'}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${choiceStyle} disabled:cursor-default`}
                data-testid={`quiz-choice-${i}`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {state === 'waiting' && !showHint && (
        <button
          onClick={() => setShowHint(true)}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          data-testid="quiz-hint-btn"
        >
          Need a hint?
        </button>
      )}

      {state === 'waiting' && showHint && (
        <p className="text-xs text-purple-300 bg-purple-500/10 rounded-lg px-2.5 py-1.5" data-testid="quiz-hint">
          {quiz.hint}
        </p>
      )}

      {state === 'correct' && isPlanQuiz && (
        <div className="flex items-center gap-2 text-green-400" data-testid="quiz-correct">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">Correct! {quiz.hint}</span>
        </div>
      )}

      {state === 'incorrect' && isPlanQuiz && quiz.choices && quiz.correctIndex !== undefined && (
        <div className="flex items-center gap-2 text-red-400" data-testid="quiz-incorrect">
          <XCircle size={16} />
          <span className="text-sm font-medium">
            The answer is: {quiz.choices[quiz.correctIndex]}. {quiz.hint}
          </span>
        </div>
      )}

      {state !== 'waiting' && onPlayPosition && (
        <button
          onClick={() => onPlayPosition(quiz.fen)}
          className="mt-3 flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
          data-testid="quiz-play-position"
        >
          <Swords size={14} />
          Play from this position
        </button>
      )}
    </div>
  );
}
