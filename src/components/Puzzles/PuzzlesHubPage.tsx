import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Puzzle,
  Brain,
  AlertTriangle,
  TrendingUp,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import { db } from '../../db/schema';
import { getPuzzleStats } from '../../services/puzzleService';
import type { PuzzleStats } from '../../services/puzzleService';

interface MistakeCount {
  total: number;
  unsolved: number;
}

export function PuzzlesHubPage(): JSX.Element {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PuzzleStats | null>(null);
  const [mistakeCounts, setMistakeCounts] = useState<MistakeCount>({ total: 0, unsolved: 0 });

  useEffect(() => {
    async function load(): Promise<void> {
      const [puzzleStats, totalMistakes, unsolvedMistakes] = await Promise.all([
        getPuzzleStats(),
        db.mistakePuzzles.count(),
        db.mistakePuzzles.where('status').equals('unsolved').count(),
      ]);
      setStats(puzzleStats);
      setMistakeCounts({ total: totalMistakes, unsolved: unsolvedMistakes });
    }
    void load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Puzzle size={28} />
          Puzzles
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Sharpen your tactics with daily training
        </p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-secondary rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-text-primary">{stats.totalAttempted}</div>
            <div className="text-xs text-text-secondary">Solved</div>
          </div>
          <div className="bg-surface-secondary rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-text-primary">{stats.averageRating}</div>
            <div className="text-xs text-text-secondary">Rating</div>
          </div>
          <div className="bg-surface-secondary rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-text-primary">
              {stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0}%
            </div>
            <div className="text-xs text-text-secondary">Accuracy</div>
          </div>
        </div>
      )}

      {/* Puzzle Modes */}
      <div className="space-y-3">
        <button
          onClick={() => void navigate('/puzzles/classic')}
          className="w-full bg-surface-secondary hover:bg-surface-tertiary rounded-xl p-4 flex items-center gap-4 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Trophy size={24} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">Classic Puzzles</div>
            <div className="text-sm text-text-secondary">Daily challenge, timed blitz, or random puzzles with SRS</div>
          </div>
          <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" />
        </button>

        <button
          onClick={() => void navigate('/puzzles/adaptive')}
          className="w-full bg-surface-secondary hover:bg-surface-tertiary rounded-xl p-4 flex items-center gap-4 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={24} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">Adaptive Training</div>
            <div className="text-sm text-text-secondary">Difficulty adjusts to your level automatically</div>
          </div>
          <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" />
        </button>

        <button
          onClick={() => void navigate('/puzzles/mistakes')}
          className="w-full bg-surface-secondary hover:bg-surface-tertiary rounded-xl p-4 flex items-center gap-4 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} className="text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">My Mistakes</div>
            <div className="text-sm text-text-secondary">
              Practice positions from your own games
              {mistakeCounts.unsolved > 0 && (
                <span className="ml-1 text-orange-400">
                  ({mistakeCounts.unsolved} unsolved)
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" />
        </button>

        <button
          onClick={() => void navigate('/puzzles/weakness')}
          className="w-full bg-surface-secondary hover:bg-surface-tertiary rounded-xl p-4 flex items-center gap-4 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Brain size={24} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">Weakness Puzzles</div>
            <div className="text-sm text-text-secondary">Targeted training for your weakest areas</div>
          </div>
          <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
