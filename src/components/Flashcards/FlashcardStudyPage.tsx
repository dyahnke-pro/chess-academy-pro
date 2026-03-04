import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessBoard } from '../Board/ChessBoard';
import { SrsGradeButtons } from '../Puzzles/SrsGradeButtons';
import {
  getDueFlashcards,
  reviewFlashcard,
  generateAllRepertoireFlashcards,
  getFlashcardStats,
} from '../../services/flashcardService';
import type { FlashcardStats } from '../../services/flashcardService';
import { ArrowLeft, Eye, SkipForward, Layers, CheckCircle } from 'lucide-react';
import type { FlashcardRecord, SrsGrade } from '../../types';

type Phase = 'loading' | 'reviewing' | 'revealed' | 'complete';

export function FlashcardStudyPage(): JSX.Element {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [cards, setCards] = useState<FlashcardRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [stats, setStats] = useState<FlashcardStats | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      await generateAllRepertoireFlashcards();
      const [dueCards, flashStats] = await Promise.all([
        getDueFlashcards(30),
        getFlashcardStats(),
      ]);
      setCards(dueCards);
      setStats(flashStats);
      setPhase(dueCards.length > 0 ? 'reviewing' : 'complete');
    }
    void load();
  }, []);

  const card = currentIndex < cards.length ? cards[currentIndex] : undefined;

  const handleReveal = useCallback((): void => {
    setPhase('revealed');
  }, []);

  const handleGrade = useCallback(
    async (grade: SrsGrade): Promise<void> => {
      if (!card) return;
      await reviewFlashcard(card.id, grade);
      setReviewed((prev) => prev + 1);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= cards.length) {
        setPhase('complete');
      } else {
        setCurrentIndex(nextIndex);
        setPhase('reviewing');
      }
    },
    [card, currentIndex, cards.length],
  );

  const handleSkip = useCallback((): void => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= cards.length) {
      setPhase('complete');
    } else {
      setCurrentIndex(nextIndex);
      setPhase('reviewing');
    }
  }, [currentIndex, cards.length]);

  if (phase === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-theme-text-muted text-sm">Loading flashcards...</div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6" data-testid="flashcard-complete">
        <button
          onClick={() => void navigate('/')}
          className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text transition-colors self-start"
        >
          <ArrowLeft size={14} />
          Dashboard
        </button>
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <CheckCircle size={48} className="text-green-500" />
          <h2 className="text-xl font-bold text-theme-text">Session Complete</h2>
          <p className="text-theme-text-muted text-sm">
            You reviewed {reviewed} card{reviewed !== 1 ? 's' : ''}.
            {stats ? ` ${stats.total} cards total, ${stats.due} were due.` : ''}
          </p>
          <button
            onClick={() => void navigate('/')}
            className="mt-4 px-6 py-2 rounded-lg bg-theme-accent text-theme-bg font-semibold text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!card) return <></>;

  const typeLabel =
    card.type === 'name_opening'
      ? 'Name the Opening'
      : card.type === 'explain_idea'
        ? 'Key Ideas'
        : 'Best Move / Variation';

  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-y-auto pb-20 md:pb-6" data-testid="flashcard-study">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => void navigate('/')}
          className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex items-center gap-2 text-sm text-theme-text-muted">
          <Layers size={14} />
          <span>
            {currentIndex + 1} / {cards.length}
          </span>
          <span className="ml-2">{reviewed} reviewed</span>
        </div>
      </div>

      {/* Card type badge */}
      <div className="flex justify-center">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-theme-accent/10 text-theme-accent border border-theme-accent/30">
          {typeLabel}
        </span>
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm">
          <ChessBoard
            initialFen={card.questionFen}
            interactive={false}
            showFlipButton={false}
            showUndoButton={false}
            showResetButton={false}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-theme-surface rounded-lg p-4 border border-theme-border text-center">
        <p className="text-sm font-medium text-theme-text" data-testid="flashcard-question">
          {card.questionText}
        </p>
      </div>

      {/* Answer / Actions */}
      {phase === 'reviewing' ? (
        <div className="flex gap-3">
          <button
            onClick={handleReveal}
            className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-theme-accent text-theme-bg flex items-center justify-center gap-2"
            data-testid="reveal-btn"
          >
            <Eye size={16} />
            Reveal Answer
          </button>
          <button
            onClick={handleSkip}
            className="px-4 py-2.5 rounded-lg text-sm border border-theme-border text-theme-text-muted hover:bg-theme-surface transition-colors flex items-center gap-1"
            data-testid="skip-btn"
          >
            <SkipForward size={14} />
            Skip
          </button>
        </div>
      ) : (
        <>
          <div className="bg-theme-surface rounded-lg p-4 border border-theme-border" data-testid="flashcard-answer">
            {card.answerMove && (
              <div className="text-xs text-theme-accent font-mono mb-1">{card.answerMove}</div>
            )}
            <p className="text-sm text-theme-text leading-relaxed">{card.answerText}</p>
          </div>
          <SrsGradeButtons
            currentInterval={card.srsInterval}
            easeFactor={card.srsEaseFactor}
            repetitions={card.srsRepetitions}
            onGrade={(grade) => void handleGrade(grade)}
          />
        </>
      )}
    </div>
  );
}
