import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import {
  getAllMistakePuzzles,
  getMistakePuzzleStats,
  gradeMistakePuzzle,
  deleteMistakePuzzle,
  type MistakePuzzleStats,
} from '../../services/mistakePuzzleService';
import { ArrowLeft, Trash2, AlertTriangle, Trophy, CheckCircle, CircleDot } from 'lucide-react';
import type { MistakePuzzle, MistakeClassification, MistakePuzzleSourceMode, MistakePuzzleStatus } from '../../types';

type ClassificationFilter = MistakeClassification | 'all';
type SourceFilter = MistakePuzzleSourceMode | 'all';
type StatusFilter = MistakePuzzleStatus | 'all';

const CLASSIFICATION_COLORS: Record<MistakeClassification, string> = {
  inaccuracy: 'text-yellow-500 bg-yellow-500/10',
  mistake: 'text-orange-500 bg-orange-500/10',
  blunder: 'text-red-500 bg-red-500/10',
};

const CLASSIFICATION_SYMBOLS: Record<MistakeClassification, string> = {
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

const SOURCE_LABELS: Record<MistakePuzzleSourceMode, string> = {
  coach: 'Coach',
  lichess: 'Lichess',
  chesscom: 'Chess.com',
};

export function MyMistakesPage(): JSX.Element {
  const navigate = useNavigate();
  const [puzzles, setPuzzles] = useState<MistakePuzzle[]>([]);
  const [stats, setStats] = useState<MistakePuzzleStats | null>(null);
  const [activePuzzle, setActivePuzzle] = useState<MistakePuzzle | null>(null);
  const [classFilter, setClassFilter] = useState<ClassificationFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [allPuzzles, puzzleStats] = await Promise.all([
      getAllMistakePuzzles(),
      getMistakePuzzleStats(),
    ]);
    setPuzzles(allPuzzles);
    setStats(puzzleStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = puzzles.filter((p) => {
    if (classFilter !== 'all' && p.classification !== classFilter) return false;
    if (sourceFilter !== 'all' && p.sourceMode !== sourceFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const handleDelete = useCallback(async (id: string) => {
    await deleteMistakePuzzle(id);
    if (activePuzzle?.id === id) setActivePuzzle(null);
    void loadData();
  }, [activePuzzle, loadData]);

  const handlePuzzleComplete = useCallback((correct: boolean): void => {
    if (!activePuzzle) return;
    void gradeMistakePuzzle(activePuzzle.id, correct ? 'good' : 'again', correct).then(() => {
      setActivePuzzle(null);
      void loadData();
    });
  }, [activePuzzle, loadData]);

  if (loading) {
    return (
      <div className="p-6 text-center text-theme-text-muted" data-testid="loading">
        Loading mistakes...
      </div>
    );
  }

  // Solving mode
  if (activePuzzle) {
    return (
      <div className="p-4 max-w-xl mx-auto space-y-4" data-testid="solving-mode">
        <button
          onClick={() => setActivePuzzle(null)}
          className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text"
        >
          <ArrowLeft size={16} />
          Back to list
        </button>
        <MistakePuzzleBoard
          puzzle={activePuzzle}
          onComplete={handlePuzzleComplete}
        />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6" data-testid="my-mistakes-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void navigate('/puzzles')}
          className="text-theme-text-muted hover:text-theme-text"
          aria-label="Back to puzzles"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-theme-text">My Mistakes</h1>
      </div>

      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className="flex gap-4 text-sm" data-testid="stats-bar">
          <div className="flex items-center gap-1 text-theme-text-muted">
            <AlertTriangle size={14} />
            <span>{stats.total} total</span>
          </div>
          <div className="flex items-center gap-1 text-orange-500">
            <CircleDot size={14} />
            <span>{stats.unsolved} unsolved</span>
          </div>
          <div className="flex items-center gap-1 text-blue-500">
            <CheckCircle size={14} />
            <span>{stats.solved} solved</span>
          </div>
          <div className="flex items-center gap-1 text-green-500">
            <Trophy size={14} />
            <span>{stats.mastered} mastered</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2" data-testid="filters">
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value as ClassificationFilter)}
          className="text-xs px-2 py-1 rounded bg-theme-surface text-theme-text border border-theme-border"
          data-testid="classification-filter"
        >
          <option value="all">All Types</option>
          <option value="inaccuracy">Inaccuracies</option>
          <option value="mistake">Mistakes</option>
          <option value="blunder">Blunders</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
          className="text-xs px-2 py-1 rounded bg-theme-surface text-theme-text border border-theme-border"
          data-testid="source-filter"
        >
          <option value="all">All Sources</option>
          <option value="coach">Coach</option>
          <option value="lichess">Lichess</option>
          <option value="chesscom">Chess.com</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="text-xs px-2 py-1 rounded bg-theme-surface text-theme-text border border-theme-border"
          data-testid="status-filter"
        >
          <option value="all">All Status</option>
          <option value="unsolved">Unsolved</option>
          <option value="solved">Solved</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>

      {/* Empty state */}
      {puzzles.length === 0 && (
        <div className="text-center py-12 text-theme-text-muted" data-testid="empty-state">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No mistakes yet</p>
          <p className="text-sm mt-1">
            Play games in Coach mode or import from Lichess/Chess.com to generate mistake puzzles.
          </p>
        </div>
      )}

      {/* Filtered empty state */}
      {puzzles.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8 text-theme-text-muted" data-testid="no-matches">
          <p className="text-sm">No puzzles match your filters.</p>
        </div>
      )}

      {/* Puzzle list */}
      <div className="space-y-2" data-testid="puzzle-list">
        {filtered.map((puzzle) => (
          <div
            key={puzzle.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-theme-surface border border-theme-border hover:border-theme-accent/50 transition-colors"
            data-testid="puzzle-card"
          >
            {/* Classification badge */}
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-bold ${CLASSIFICATION_COLORS[puzzle.classification]}`}
            >
              {CLASSIFICATION_SYMBOLS[puzzle.classification]}
            </span>

            {/* Info */}
            <button
              className="flex-1 text-left"
              onClick={() => setActivePuzzle(puzzle)}
              data-testid="solve-button"
            >
              <div className="text-sm font-medium text-theme-text">
                Move {puzzle.moveNumber} — {puzzle.bestMoveSan}
              </div>
              <div className="flex items-center gap-2 text-xs text-theme-text-muted">
                <span>{SOURCE_LABELS[puzzle.sourceMode]}</span>
                <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
                <span>{puzzle.cpLoss}cp</span>
                <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
                <span className={
                  puzzle.status === 'mastered' ? 'text-green-500' :
                  puzzle.status === 'solved' ? 'text-blue-500' :
                  'text-theme-text-muted'
                }>
                  {puzzle.status}
                </span>
              </div>
            </button>

            {/* Delete */}
            <button
              onClick={() => void handleDelete(puzzle.id)}
              className="p-1.5 text-theme-text-muted hover:text-red-500 transition-colors"
              aria-label="Delete puzzle"
              data-testid="delete-button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
