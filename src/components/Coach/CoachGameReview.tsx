import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw, Home } from 'lucide-react';
import { ChessBoard } from '../Board/ChessBoard';
import { CoachAvatar } from './CoachAvatar';
import { voiceService } from '../../services/voiceService';
import type { KeyMoment, CoachPersonality } from '../../types';

interface CoachGameReviewProps {
  keyMoments: KeyMoment[];
  personality: CoachPersonality;
  recommendation: string;
  onPlayAgain: () => void;
  onBackToCoach: () => void;
}

export function CoachGameReview({
  keyMoments,
  personality,
  recommendation,
  onPlayAgain,
  onBackToCoach,
}: CoachGameReviewProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const currentMoment = keyMoments[currentIndex] as KeyMoment | undefined;

  const speakExplanation = useCallback((text: string) => {
    setSpeaking(true);
    void voiceService.speak(text, personality).then(() => setSpeaking(false));
  }, [personality]);

  // Auto-narrate first moment on mount
  useEffect(() => {
    if (currentMoment) {
      speakExplanation(currentMoment.explanation);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const newIndex = direction === 'next'
      ? Math.min(currentIndex + 1, keyMoments.length - 1)
      : Math.max(currentIndex - 1, 0);

    setCurrentIndex(newIndex);
    const moment = keyMoments[newIndex] as KeyMoment | undefined;
    if (moment !== undefined) {
      speakExplanation(moment.explanation);
    }
  }, [currentIndex, keyMoments, speakExplanation]);

  if (keyMoments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-6" data-testid="coach-game-review">
        <p className="text-sm text-theme-text-muted">No key moments found in this game.</p>
        <div className="flex gap-3">
          <button onClick={onPlayAgain} className="px-4 py-2 rounded-lg bg-theme-accent text-white text-sm font-medium">
            Play Again
          </button>
          <button onClick={onBackToCoach} className="px-4 py-2 rounded-lg border border-theme-border text-theme-text text-sm font-medium">
            Back to Coach
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-4 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="coach-game-review"
    >
      <h3 className="text-lg font-bold text-theme-text text-center">Game Review</h3>

      {/* Key Moment Board */}
      {currentMoment && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs text-theme-text-muted">
            Key Moment {currentIndex + 1} of {keyMoments.length} — Move {currentMoment.moveNumber}
          </div>

          <div className="w-full max-w-[400px]">
            <ChessBoard
              initialFen={currentMoment.fen}
              interactive={false}
            />
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleNavigate('prev')}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-theme-surface disabled:opacity-30"
            >
              <ChevronLeft size={20} className="text-theme-text" />
            </button>

            <div className="flex items-center gap-2">
              <CoachAvatar personality={personality} expression="neutral" speaking={speaking} size="sm" />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                currentMoment.type === 'blunder' ? 'bg-red-500/10 text-red-500' :
                currentMoment.type === 'brilliant' ? 'bg-green-500/10 text-green-500' :
                'bg-yellow-500/10 text-yellow-500'
              }`}>
                {currentMoment.type.replace('_', ' ')}
              </span>
            </div>

            <button
              onClick={() => handleNavigate('next')}
              disabled={currentIndex === keyMoments.length - 1}
              className="p-2 rounded-lg hover:bg-theme-surface disabled:opacity-30"
            >
              <ChevronRight size={20} className="text-theme-text" />
            </button>
          </div>

          {/* Explanation */}
          <div className="bg-theme-surface rounded-lg p-3 border border-theme-border w-full">
            <p className="text-sm text-theme-text leading-relaxed">{currentMoment.explanation}</p>
          </div>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-theme-accent/10 rounded-lg p-3 border border-theme-accent/20">
          <p className="text-sm text-theme-text font-medium">Recommendation</p>
          <p className="text-sm text-theme-text-muted mt-1">{recommendation}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={onPlayAgain}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-accent text-white text-sm font-medium hover:opacity-90"
        >
          <RotateCcw size={16} />
          Play Again
        </button>
        <button
          onClick={onBackToCoach}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-theme-border text-theme-text text-sm font-medium hover:bg-theme-surface"
        >
          <Home size={16} />
          Back to Coach
        </button>
      </div>
    </motion.div>
  );
}
