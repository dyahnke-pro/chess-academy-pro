import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DrillMode } from './DrillMode';
import { PracticeMode } from './PracticeMode';
import { OpeningPlayMode } from './OpeningPlayMode';
import { MasteryRing } from './MasteryRing';
import {
  getOpeningById,
  getMasteryPercent,
  getLinesDiscovered,
  getLinesPerfected,
  getTotalLines,
} from '../../services/openingService';
import type { OpeningRecord } from '../../types';
import {
  ArrowLeft,
  BookOpen as LearnIcon,
  Brain,
  Swords,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Repeat,
  Clock,
  Target,
  ChevronRight,
  CheckCircle,
  Trophy,
} from 'lucide-react';

type ViewMode = 'detail' | 'learn' | 'practice' | 'play' | 'variation-learn' | 'variation-practice';

export function OpeningDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<OpeningRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [activeVariationIndex, setActiveVariationIndex] = useState(-1);

  const loadOpening = useCallback(async (): Promise<void> => {
    if (!id) return;
    const result = await getOpeningById(id);
    setOpening(result ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadOpening();
  }, [loadOpening]);

  const handleComplete = useCallback((): void => {
    void loadOpening();
  }, [loadOpening]);

  const handleExit = useCallback((): void => {
    setViewMode('detail');
    setActiveVariationIndex(-1);
    void loadOpening();
  }, [loadOpening]);

  const handleStartVariationLearn = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    setViewMode('variation-learn');
  }, []);

  const handleStartVariationPractice = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    setViewMode('variation-practice');
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Loading opening...</p>
      </div>
    );
  }

  if (!opening) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Opening not found.</p>
      </div>
    );
  }

  // Learn mode (main line or variation)
  if (viewMode === 'learn' || viewMode === 'variation-learn') {
    return (
      <DrillMode
        opening={opening}
        variationIndex={viewMode === 'variation-learn' ? activeVariationIndex : undefined}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }

  // Practice mode (main line or variation)
  if (viewMode === 'practice' || viewMode === 'variation-practice') {
    return (
      <PracticeMode
        opening={opening}
        variationIndex={viewMode === 'variation-practice' ? activeVariationIndex : undefined}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }

  // Play mode
  if (viewMode === 'play') {
    return (
      <OpeningPlayMode
        opening={opening}
        onExit={handleExit}
      />
    );
  }

  // Detail view
  const mastery = getMasteryPercent(opening);
  const totalLines = getTotalLines(opening);
  const discovered = getLinesDiscovered(opening);
  const perfected = getLinesPerfected(opening);

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 overflow-y-auto" data-testid="opening-detail">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => void navigate('/openings')}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
          aria-label="Back to openings"
          data-testid="back-button"
        >
          <ArrowLeft size={18} className="text-theme-text" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-theme-text">{opening.name}</h1>
          <div className="flex items-center gap-2 text-sm text-theme-text-muted">
            <span className="font-mono">{opening.eco}</span>
            <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
            <span className="capitalize">{opening.color}</span>
            {opening.style && (
              <>
                <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
                <span>{opening.style}</span>
              </>
            )}
          </div>
        </div>
        <MasteryRing percent={mastery} size={48} />
      </div>

      {/* Line stats */}
      {totalLines > 0 && (
        <div className="flex gap-4 mb-4 text-sm text-theme-text-muted">
          <span data-testid="lines-discovered">{discovered}/{totalLines} lines discovered</span>
          <span data-testid="lines-perfected">{perfected}/{totalLines} lines perfected</span>
        </div>
      )}

      {/* LEARN, PRACTICE, PLAY buttons */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <button
          onClick={() => setViewMode('learn')}
          className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-theme-accent text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          data-testid="learn-btn"
        >
          <LearnIcon size={20} />
          Learn
        </button>
        <button
          onClick={() => setViewMode('practice')}
          className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold text-sm hover:bg-theme-border transition-colors"
          data-testid="practice-btn"
        >
          <Brain size={20} />
          Practice
        </button>
        <button
          onClick={() => setViewMode('play')}
          className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold text-sm hover:bg-theme-border transition-colors"
          data-testid="play-btn"
        >
          <Swords size={20} />
          Play
        </button>
      </div>

      {/* Overview */}
      {opening.overview && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={14} className="text-theme-accent" />
            <h3 className="text-sm font-semibold text-theme-text">Overview</h3>
          </div>
          <p className="text-sm text-theme-text-muted leading-relaxed">{opening.overview}</p>
        </div>
      )}

      {/* Key Ideas */}
      {opening.keyIdeas && opening.keyIdeas.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-yellow-500" />
            <h3 className="text-sm font-semibold text-theme-text">Key Ideas</h3>
          </div>
          <ul className="space-y-1.5">
            {opening.keyIdeas.map((idea, i) => (
              <li key={i} className="text-sm text-theme-text-muted flex gap-2">
                <span className="text-theme-accent mt-0.5 shrink-0">-</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Traps */}
      {opening.traps && opening.traps.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-green-500" />
            <h3 className="text-sm font-semibold text-theme-text">Traps & Pitfalls</h3>
          </div>
          <ul className="space-y-2">
            {opening.traps.map((trap, i) => (
              <li key={i} className="text-sm text-theme-text-muted">{trap}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {opening.warnings && opening.warnings.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-theme-text">Watch Out For</h3>
          </div>
          <ul className="space-y-2">
            {opening.warnings.map((warning, i) => (
              <li key={i} className="text-sm text-theme-text-muted">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Variations (lines) */}
      {opening.variations && opening.variations.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-theme-text mb-3">
            Lines ({opening.variations.length})
          </h3>
          <div className="space-y-1">
            {opening.variations.map((variation, i) => {
              const isDiscovered = opening.linesDiscovered?.includes(i) ?? false;
              const isPerfected = opening.linesPerfected?.includes(i) ?? false;
              return (
                <div
                  key={i}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-theme-border/50 transition-colors group"
                  data-testid={`variation-${i}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-theme-text">{variation.name}</span>
                      {isPerfected && <Trophy size={12} className="text-yellow-500" />}
                      {isDiscovered && !isPerfected && <CheckCircle size={12} className="text-green-500" />}
                    </div>
                    <p className="text-xs text-theme-text-muted truncate mt-0.5">{variation.explanation}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleStartVariationLearn(i)}
                      className="p-1.5 rounded-lg hover:bg-theme-accent/20 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Learn ${variation.name}`}
                      data-testid={`variation-learn-${i}`}
                    >
                      <LearnIcon size={14} />
                    </button>
                    <button
                      onClick={() => handleStartVariationPractice(i)}
                      className="p-1.5 rounded-lg hover:bg-theme-accent/20 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Practice ${variation.name}`}
                      data-testid={`variation-practice-${i}`}
                    >
                      <Brain size={14} />
                    </button>
                    <ChevronRight size={14} className="text-theme-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Woodpecker stats */}
      {opening.woodpeckerReps > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-theme-text mb-3">Woodpecker Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-theme-accent mb-1">
                <Repeat size={14} />
              </div>
              <p className="text-lg font-bold text-theme-text" data-testid="wp-reps">{opening.woodpeckerReps}</p>
              <p className="text-[10px] text-theme-text-muted uppercase">Total Reps</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-theme-accent mb-1">
                <Clock size={14} />
              </div>
              <p className="text-lg font-bold text-theme-text" data-testid="wp-speed">
                {opening.woodpeckerSpeed !== null ? `${Math.round(opening.woodpeckerSpeed)}s` : '—'}
              </p>
              <p className="text-[10px] text-theme-text-muted uppercase">Best Time</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-theme-accent mb-1">
                <Target size={14} />
              </div>
              <p className="text-lg font-bold text-theme-text">
                {opening.woodpeckerLastDate
                  ? new Date(opening.woodpeckerLastDate).toLocaleDateString()
                  : '—'}
              </p>
              <p className="text-[10px] text-theme-text-muted uppercase">Last Drilled</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
