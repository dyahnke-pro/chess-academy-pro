import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import type { CheckpointQuizItem } from '../../types';

interface CheckpointQuizProps {
  quiz: CheckpointQuizItem;
  boardOrientation: 'white' | 'black';
  onComplete: (correct: boolean) => void;
}

type QuizState = 'waiting' | 'correct' | 'incorrect';

export function CheckpointQuiz({
  quiz,
  boardOrientation,
  onComplete,
}: CheckpointQuizProps): JSX.Element {
  const [state, setState] = useState<QuizState>('waiting');
  const [showHint, setShowHint] = useState(false);

  const handleDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (state !== 'waiting') return false;

      const chess = new Chess(quiz.fen);
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });

      if (!move) return false;

      const isCorrect = move.san === quiz.correctMove
        || `${move.from}${move.to}` === quiz.correctMove
        || move.lan === quiz.correctMove;

      setState(isCorrect ? 'correct' : 'incorrect');
      // Auto-advance after short delay
      setTimeout(() => onComplete(isCorrect), 1500);
      return true;
    },
    [quiz, state, onComplete],
  );

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4 border-2 border-purple-500/30" data-testid="checkpoint-quiz">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={14} className="text-purple-400" />
        <h3 className="text-sm font-semibold text-theme-text">Test Yourself</h3>
        <span className="text-xs text-theme-text-muted ml-auto">{quiz.concept}</span>
      </div>

      <p className="text-sm text-theme-text-muted mb-3">
        Find the best move in this position.
      </p>

      <div className="flex justify-center mb-3">
        <div className="w-64 h-64">
          <Chessboard
            position={quiz.fen}
            onPieceDrop={handleDrop}
            boardOrientation={boardOrientation}
            boardWidth={256}
            arePiecesDraggable={state === 'waiting'}
          />
        </div>
      </div>

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

      {state === 'correct' && (
        <div className="flex items-center gap-2 text-green-400" data-testid="quiz-correct">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">Correct! {quiz.correctMove} is the right move.</span>
        </div>
      )}

      {state === 'incorrect' && (
        <div className="flex items-center gap-2 text-red-400" data-testid="quiz-incorrect">
          <XCircle size={16} />
          <span className="text-sm font-medium">The best move was {quiz.correctMove}. {quiz.hint}</span>
        </div>
      )}
    </div>
  );
}
