import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { BoardVoiceOverlay } from '../Board/BoardVoiceOverlay';
import { CheckCircle, XCircle, HelpCircle, Swords } from 'lucide-react';
import type { CheckpointQuizItem } from '../../types';

interface CheckpointQuizProps {
  quiz: CheckpointQuizItem;
  boardOrientation: 'white' | 'black';
  onComplete: (correct: boolean) => void;
  onPlayPosition?: (fen: string) => void;
}

type QuizState = 'waiting' | 'correct' | 'incorrect';

export function CheckpointQuiz({
  quiz,
  boardOrientation,
  onComplete,
  onPlayPosition,
}: CheckpointQuizProps): JSX.Element {
  const [state, setState] = useState<QuizState>('waiting');
  const [showHint, setShowHint] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const isPlanQuiz = quiz.type === 'plan' && quiz.choices && quiz.correctIndex !== undefined;

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }): boolean => {
      if (state !== 'waiting' || !targetSquare || isPlanQuiz) return false;

      const chess = new Chess(quiz.fen);
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive guard
      if (!move) return false;

      const isCorrect = move.san === quiz.correctMove
        || `${move.from}${move.to}` === quiz.correctMove
        || move.lan === quiz.correctMove;

      setState(isCorrect ? 'correct' : 'incorrect');
      setTimeout(() => onComplete(isCorrect), 1500);
      return true;
    },
    [quiz, state, onComplete, isPlanQuiz],
  );

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

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4 border-2 border-purple-500/30" data-testid="checkpoint-quiz">
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

      <div className="flex justify-center mb-3">
        <BoardVoiceOverlay fen={quiz.fen} className="w-64 h-64">
          <Chessboard
            options={{
              position: quiz.fen,
              onPieceDrop: handleDrop,
              boardOrientation: boardOrientation,
              allowDragging: state === 'waiting' && !isPlanQuiz,
            }}
          />
        </BoardVoiceOverlay>
      </div>

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

      {state === 'correct' && !isPlanQuiz && (
        <div className="flex items-center gap-2 text-green-400" data-testid="quiz-correct">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">Correct! {quiz.correctMove} is the right move.</span>
        </div>
      )}

      {state === 'correct' && isPlanQuiz && (
        <div className="flex items-center gap-2 text-green-400" data-testid="quiz-correct">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">Correct! {quiz.hint}</span>
        </div>
      )}

      {state === 'incorrect' && !isPlanQuiz && (
        <div className="flex items-center gap-2 text-red-400" data-testid="quiz-incorrect">
          <XCircle size={16} />
          <span className="text-sm font-medium">The best move was {quiz.correctMove}. {quiz.hint}</span>
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
