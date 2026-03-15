import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { voiceService } from '../../services/voiceService';
import { getKidPuzzles, seedPuzzles, recordAttempt } from '../../services/puzzleService';
import { DifficultyToggle } from '../Coach/DifficultyToggle';
import { PuzzleBoard } from '../Puzzles/PuzzleBoard';
import { useAppStore } from '../../stores/appStore';
import type { CoachDifficulty, PuzzleRecord } from '../../types';

type KidPuzzlePhase = 'select' | 'loading' | 'playing' | 'between' | 'complete';

const CORRECT_MESSAGES = [
  'Amazing job! You are a puzzle star!',
  'Wow, you solved it! Great thinking!',
  'Super smart move! Keep going!',
  'You did it! Chess genius!',
  'Fantastic! You found the right move!',
];

const INCORRECT_MESSAGES = [
  'Good try! Every puzzle makes you stronger!',
  'Almost! You will get the next one!',
  'Keep practicing, you are getting better!',
  'Nice effort! Let us try another one!',
];

const DIFFICULTY_INFO: Record<CoachDifficulty, { emoji: string; label: string; description: string }> = {
  easy:   { emoji: '🌱', label: 'Beginner', description: 'Simple puzzles to get started' },
  medium: { emoji: '⭐', label: 'Explorer', description: 'A bit more tricky!' },
  hard:   { emoji: '🏆', label: 'Champion', description: 'Challenge yourself!' },
};

const PUZZLES_PER_SESSION = 10;

export function KidPuzzlePage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);

  const [phase, setPhase] = useState<KidPuzzlePhase>('select');
  const [difficulty, setDifficulty] = useState<CoachDifficulty>('easy');
  const [puzzles, setPuzzles] = useState<PuzzleRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);

  const kidSpeak = useCallback((text: string): void => {
    if (!voiceOn) return;
    void voiceService.speak(text);
  }, [voiceOn]);

  const handleToggleVoice = useCallback((): void => {
    voiceService.stop();
    setVoiceOn((v) => !v);
  }, []);

  useEffect(() => {
    kidSpeak('Welcome to Puzzle Quest! Pick your level and start solving!');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = useCallback(async (): Promise<void> => {
    setPhase('loading');
    await seedPuzzles();
    const fetched = await getKidPuzzles(difficulty, PUZZLES_PER_SESSION);
    if (fetched.length === 0) {
      kidSpeak('No puzzles available for this level. Try another!');
      setPhase('select');
      return;
    }
    setPuzzles(fetched);
    setCurrentIndex(0);
    setSolvedCount(0);
    setLastResult(null);
    setPhase('playing');
    kidSpeak('Here is your first puzzle! Find the best move.');
  }, [difficulty, kidSpeak]);

  const handlePuzzleComplete = useCallback((correct: boolean): void => {
    if (correct) setSolvedCount((c) => c + 1);
    setLastResult(correct ? 'correct' : 'incorrect');

    // Record the attempt
    if (activeProfile) {
      const puzzle = puzzles[currentIndex];
      void recordAttempt(
        puzzle.id,
        correct,
        activeProfile.puzzleRating,
        correct ? 'good' : 'again',
      );
    }

    const isLast = currentIndex >= puzzles.length - 1;
    if (isLast) {
      const finalSolved = correct ? solvedCount + 1 : solvedCount;
      setPhase('complete');
      kidSpeak(`All done! You solved ${finalSolved} out of ${puzzles.length} puzzles!`);
    } else {
      setPhase('between');
      const messages = correct ? CORRECT_MESSAGES : INCORRECT_MESSAGES;
      const msg = messages[Math.floor(Math.random() * messages.length)];
      kidSpeak(msg);
    }
  }, [puzzles, currentIndex, solvedCount, activeProfile, kidSpeak]);

  const handleNextPuzzle = useCallback((): void => {
    setCurrentIndex((i) => i + 1);
    setLastResult(null);
    setPhase('playing');
    kidSpeak('Next puzzle! You can do it!');
  }, [kidSpeak]);

  const handlePlayAgain = useCallback((): void => {
    void handleStart();
  }, [handleStart]);

  const handleChangeLevel = useCallback((): void => {
    setPhase('select');
    setPuzzles([]);
    setCurrentIndex(0);
    setSolvedCount(0);
    setLastResult(null);
  }, []);

  const currentPuzzle = puzzles[currentIndex] as PuzzleRecord | undefined;
  const info = DIFFICULTY_INFO[difficulty];

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="kid-puzzle-page"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => void navigate('/kid')}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-surface)' }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-xl font-bold">Puzzle Quest 🧩</h2>
        </div>
        <button
          onClick={handleToggleVoice}
          className="p-2 rounded-lg border transition-colors"
          style={{
            background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
          }}
          aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
          data-testid="voice-toggle"
        >
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Select Phase */}
      {phase === 'select' && (
        <div className="flex flex-col gap-6 items-center">
          <div
            className="rounded-2xl p-6 border-2 text-center w-full max-w-md"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            }}
          >
            <p className="text-2xl font-bold mb-4">Choose Your Level!</p>
            <DifficultyToggle value={difficulty} onChange={setDifficulty} />
            <div className="mt-4 text-center">
              <span className="text-3xl">{info.emoji}</span>
              <p className="font-semibold text-lg mt-1">{info.label}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {info.description}
              </p>
            </div>
          </div>

          <button
            onClick={() => void handleStart()}
            className="px-8 py-3 rounded-xl text-lg font-bold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
            }}
            data-testid="start-puzzle-btn"
          >
            Start Puzzles!
          </button>
        </div>
      )}

      {/* Loading Phase */}
      {phase === 'loading' && (
        <div className="flex items-center justify-center flex-1">
          <p className="text-lg font-medium" data-testid="puzzle-loading">Loading puzzles...</p>
        </div>
      )}

      {/* Playing Phase */}
      {phase === 'playing' && currentPuzzle && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between" data-testid="puzzle-progress">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Puzzle {currentIndex + 1} of {puzzles.length}
            </span>
            <span className="text-sm font-medium" data-testid="puzzle-solved-count">
              Solved: {solvedCount}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex) / puzzles.length) * 100}%`,
                background: 'var(--color-accent)',
              }}
            />
          </div>

          <PuzzleBoard
            puzzle={currentPuzzle}
            onComplete={handlePuzzleComplete}
          />
        </div>
      )}

      {/* Between Phase */}
      {phase === 'between' && (
        <div className="flex flex-col items-center gap-6">
          <div
            className="rounded-2xl p-8 border-2 text-center w-full max-w-md"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            }}
          >
            <span className="text-5xl">
              {lastResult === 'correct' ? '⭐' : '💪'}
            </span>
            <p className="text-xl font-bold mt-4" data-testid="puzzle-result-message">
              {lastResult === 'correct' ? 'Correct!' : 'Good Try!'}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Solved: {solvedCount} of {puzzles.length}
            </p>
          </div>

          <button
            onClick={handleNextPuzzle}
            className="px-8 py-3 rounded-xl text-lg font-bold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
            }}
            data-testid="next-puzzle-btn"
          >
            Next Puzzle →
          </button>
        </div>
      )}

      {/* Complete Phase */}
      {phase === 'complete' && (
        <div className="flex flex-col items-center gap-6">
          <div
            className="rounded-2xl p-8 border-2 text-center w-full max-w-md"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            }}
            data-testid="puzzle-complete-summary"
          >
            <span className="text-5xl">🎉</span>
            <p className="text-2xl font-bold mt-4">All Done!</p>
            <p className="text-lg mt-2">
              You solved {solvedCount} out of {puzzles.length} puzzles!
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {solvedCount === puzzles.length
                ? 'Perfect score! You are a puzzle champion!'
                : solvedCount > puzzles.length / 2
                  ? 'Great job! Keep practicing!'
                  : 'Every puzzle makes you stronger!'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePlayAgain}
              className="px-6 py-3 rounded-xl font-bold transition-opacity hover:opacity-80"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
              }}
              data-testid="play-again-btn"
            >
              Play Again
            </button>
            <button
              onClick={handleChangeLevel}
              className="px-6 py-3 rounded-xl font-bold border-2 transition-opacity hover:opacity-80"
              style={{
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent)',
                background: 'var(--color-surface)',
              }}
              data-testid="change-level-btn"
            >
              Change Level
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
