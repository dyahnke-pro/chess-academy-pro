import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Lightbulb } from 'lucide-react';
import { ChessBoard } from '../Board/ChessBoard';
import { StarDisplay } from './StarDisplay';
import { useAppStore } from '../../stores/appStore';
import { voiceService } from '../../services/voiceService';
import { JOURNEY_CHAPTERS } from '../../data/journeyChapters';
import {
  getJourneyProgress,
  initJourneyProgress,
  completeLesson,
  recordPuzzleAttempt,
  completeChapter,
  getChapterProgress,
} from '../../services/journeyService';
import type { JourneyChapter } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

type ChapterPhase = 'intro' | 'lesson' | 'puzzle' | 'reward';

const XP_PER_CORRECT_PUZZLE = 25;

export function JourneyChapterPage(): JSX.Element {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();

  const personality = useAppStore((s) => s.coachPersonality);

  const [phase, setPhase] = useState<ChapterPhase>('intro');
  const [lessonIndex, setLessonIndex] = useState(0);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [puzzlesCorrect, setPuzzlesCorrect] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [puzzleFeedback, setPuzzleFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);

  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const kidSpeak = useCallback((text: string): void => {
    if (!voiceOn) return;
    void voiceService.speak(text, personality);
  }, [voiceOn, personality]);

  // Find the chapter
  const chapter: JourneyChapter | undefined = JOURNEY_CHAPTERS.find(
    (c) => c.id === chapterId,
  );

  // Load progress on mount
  useEffect(() => {
    if (!chapter) return;

    void (async () => {
      let jp = await getJourneyProgress();
      if (!jp) {
        jp = await initJourneyProgress();
      }
      // Resume from where the kid left off if there is partial progress
      const chapterProg = getChapterProgress(chapter.id, jp);
      if (chapterProg.completed) {
        // Allow replay from intro
        setPhase('intro');
      } else if (chapterProg.lessonsCompleted > 0) {
        if (chapterProg.lessonsCompleted >= chapter.lessons.length) {
          // All lessons done, go to puzzle phase
          setPhase('puzzle');
        } else {
          setLessonIndex(chapterProg.lessonsCompleted);
          setPhase('lesson');
        }
      }
    })();
  }, [chapter]);

  // Navigate away if chapter not found
  useEffect(() => {
    if (!chapterId || !chapter) {
      void navigate('/kid/journey');
    }
  }, [chapterId, chapter, navigate]);

  // Voice-narrate when entering intro phase
  useEffect(() => {
    if (phase === 'intro' && chapter) {
      kidSpeak(chapter.storyIntro);
    }
  }, [phase, chapter, kidSpeak]);

  // Voice-narrate current lesson when entering lesson phase or advancing lessons
  useEffect(() => {
    if (phase === 'lesson' && chapter && lessonIndex < chapter.lessons.length) {
      const lesson = chapter.lessons[lessonIndex];
      kidSpeak(lesson.story);
    }
  }, [phase, chapter, lessonIndex, kidSpeak]);

  // Voice-narrate story outro when entering reward phase
  useEffect(() => {
    if (phase === 'reward' && chapter) {
      kidSpeak(chapter.storyOutro);
    }
  }, [phase, chapter, kidSpeak]);

  const handleBegin = useCallback((): void => {
    setPhase('lesson');
  }, []);

  const handleNextLesson = useCallback((): void => {
    if (!chapter) return;

    void completeLesson(chapter.id, lessonIndex);

    const nextIndex = lessonIndex + 1;
    if (nextIndex >= chapter.lessons.length) {
      setPhase('puzzle');
    } else {
      setLessonIndex(nextIndex);
    }
  }, [chapter, lessonIndex]);

  const handlePuzzleMove = useCallback((move: MoveResult): void => {
    if (!chapter || puzzleFeedback !== null) return;

    const currentPuzzle = chapter.puzzles[puzzleIndex];
    const expectedSan = currentPuzzle.solution[0];

    if (move.san === expectedSan) {
      setPuzzleFeedback('correct');
      setPuzzlesCorrect((prev) => prev + 1);
      kidSpeak(currentPuzzle.successMessage);
      void recordPuzzleAttempt(chapter.id, true);

      feedbackTimeoutRef.current = setTimeout(() => {
        setPuzzleFeedback(null);
        setShowHint(false);
        const nextPuzzle = puzzleIndex + 1;
        if (nextPuzzle >= chapter.puzzles.length) {
          void completeChapter(chapter.id);
          setPhase('reward');
        } else {
          setPuzzleIndex(nextPuzzle);
          setBoardKey((prev) => prev + 1);
        }
      }, 1500);
    } else {
      setPuzzleFeedback('wrong');
      kidSpeak('Not quite, try again!');
      void recordPuzzleAttempt(chapter.id, false);

      feedbackTimeoutRef.current = setTimeout(() => {
        setPuzzleFeedback(null);
        setBoardKey((prev) => prev + 1);
      }, 1200);
    }
  }, [chapter, puzzleIndex, puzzleFeedback, kidSpeak]);

  const handleHint = useCallback((): void => {
    setShowHint(true);
  }, []);

  const handleVoiceToggle = useCallback((): void => {
    if (voiceOn) {
      voiceService.stop();
    }
    setVoiceOn((v) => !v);
  }, [voiceOn]);

  const handleBack = useCallback((): void => {
    void navigate('/kid/journey');
  }, [navigate]);

  const handleContinue = useCallback((): void => {
    void navigate('/kid/journey');
  }, [navigate]);

  if (!chapter) {
    return <div />;
  }

  const xpEarned = puzzlesCorrect * XP_PER_CORRECT_PUZZLE;

  return (
    <div
      className="flex flex-col flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)', background: 'var(--color-bg)' }}
      data-testid="journey-chapter-page"
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-bg)' }}
            data-testid="chapter-back-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold">{chapter.title}</h2>
        </div>
        <button
          onClick={handleVoiceToggle}
          className="p-2 rounded-lg border transition-colors"
          style={{
            background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
          }}
          aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
          data-testid="chapter-voice-toggle"
        >
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Phase content */}
      <div className="flex-1 p-6">
        <AnimatePresence mode="wait">
          {/* ── Intro Phase ─────────────────────────────────────────── */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-6 text-center"
              data-testid="chapter-intro"
            >
              <span className="text-8xl">{chapter.icon}</span>
              <h1 className="text-2xl font-bold">{chapter.title}</h1>
              <p
                className="text-lg leading-relaxed max-w-md"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {chapter.storyIntro}
              </p>
              <button
                onClick={handleBegin}
                className="mt-4 px-8 py-3 rounded-xl font-bold text-lg"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="chapter-begin-btn"
              >
                Begin!
              </button>
            </motion.div>
          )}

          {/* ── Lesson Phase ────────────────────────────────────────── */}
          {phase === 'lesson' && chapter.lessons[lessonIndex] && (
            <motion.div
              key={`lesson-${lessonIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-5"
              data-testid="chapter-lesson"
            >
              <h3 className="text-xl font-bold">
                {chapter.lessons[lessonIndex].title}
              </h3>
              <p
                className="text-base leading-relaxed max-w-md text-center"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {chapter.lessons[lessonIndex].story}
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                {chapter.lessons[lessonIndex].instruction}
              </p>

              <div className="max-w-sm w-full mx-auto">
                <ChessBoard
                  initialFen={chapter.lessons[lessonIndex].fen}
                  interactive={false}
                  showFlipButton={false}
                  showUndoButton={false}
                  showResetButton={false}
                />
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2" data-testid="lesson-dots">
                {chapter.lessons.map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{
                      background:
                        i <= lessonIndex
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={handleNextLesson}
                className="px-8 py-3 rounded-xl font-bold text-lg"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="chapter-next-btn"
              >
                Next
              </button>
            </motion.div>
          )}

          {/* ── Puzzle Phase ────────────────────────────────────────── */}
          {phase === 'puzzle' && chapter.puzzles[puzzleIndex] && (
            <motion.div
              key={`puzzle-${puzzleIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-5"
              data-testid="chapter-puzzle"
            >
              <h3 className="text-xl font-bold">
                Puzzle {puzzleIndex + 1} of {chapter.puzzles.length}
              </h3>

              <div className="max-w-sm w-full mx-auto">
                <ChessBoard
                  key={boardKey}
                  initialFen={chapter.puzzles[puzzleIndex].fen}
                  interactive={true}
                  showFlipButton={false}
                  showUndoButton={false}
                  showResetButton={false}
                  onMove={handlePuzzleMove}
                />
              </div>

              {/* Hint button */}
              <button
                onClick={handleHint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
                data-testid="chapter-hint-btn"
              >
                <Lightbulb size={16} />
                Hint
              </button>

              {showHint && (
                <p
                  className="text-sm text-center max-w-sm"
                  style={{ color: 'var(--color-accent)' }}
                  data-testid="chapter-hint-text"
                >
                  {chapter.puzzles[puzzleIndex].hint}
                </p>
              )}

              {/* Puzzle feedback */}
              {puzzleFeedback && (
                <div
                  className="px-4 py-2 rounded-lg font-bold text-center"
                  style={{
                    background:
                      puzzleFeedback === 'correct'
                        ? 'var(--color-accent)'
                        : 'var(--color-error)',
                    color: 'var(--color-bg)',
                  }}
                  data-testid="puzzle-feedback"
                >
                  {puzzleFeedback === 'correct' ? 'Correct!' : 'Try again!'}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Reward Phase ────────────────────────────────────────── */}
          {phase === 'reward' && (
            <motion.div
              key="reward"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-6 text-center"
              data-testid="chapter-reward"
            >
              <h1 className="text-3xl font-bold">Chapter Complete!</h1>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
              >
                <StarDisplay
                  earned={puzzlesCorrect}
                  total={chapter.puzzles.length}
                  size="lg"
                />
              </motion.div>

              <p
                className="text-xl font-bold"
                style={{ color: 'var(--color-accent)' }}
              >
                +{xpEarned} XP
              </p>

              <p
                className="text-base leading-relaxed max-w-md"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {chapter.storyOutro}
              </p>

              <button
                onClick={handleContinue}
                className="mt-4 px-8 py-3 rounded-xl font-bold text-lg"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="chapter-continue-btn"
              >
                Continue
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
