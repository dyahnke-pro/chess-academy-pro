import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { MoveTree } from './MoveTree';
import { DrillMode } from './DrillMode';
import { getOpeningById } from '../../services/openingService';
import type { OpeningRecord } from '../../types';
import {
  ArrowLeft,
  BookOpen,
  Target,
  AlertTriangle,
  Lightbulb,
  Play,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
} from 'lucide-react';

type ViewMode = 'study' | 'drill';

export function OpeningDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<OpeningRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('study');
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [activeVariation, setActiveVariation] = useState(-1);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) return;
      const result = await getOpeningById(id);
      setOpening(result ?? null);
      setLoading(false);
    }
    void load();
  }, [id]);

  // Parse the active PGN (main line or variation) to get FEN at each move
  const activePgn = useMemo((): string => {
    if (!opening) return '';
    if (activeVariation >= 0 && opening.variations?.[activeVariation]) {
      return opening.variations[activeVariation].pgn;
    }
    return opening.pgn;
  }, [opening, activeVariation]);

  const fenAtMove = useMemo((): string => {
    if (!activePgn) return new Chess().fen();
    const chess = new Chess();
    const tokens = activePgn.trim().split(/\s+/).filter(Boolean);
    const limit = currentMoveIndex < 0 ? 0 : Math.min(currentMoveIndex + 1, tokens.length);
    for (let i = 0; i < limit; i++) {
      try {
        chess.move(tokens[i]);
      } catch {
        break;
      }
    }
    return chess.fen();
  }, [activePgn, currentMoveIndex]);

  const totalMoves = useMemo((): number => {
    return activePgn.trim().split(/\s+/).filter(Boolean).length;
  }, [activePgn]);

  const handleMoveSelect = useCallback((moveIdx: number, variationIdx?: number): void => {
    setCurrentMoveIndex(moveIdx);
    setActiveVariation(variationIdx ?? -1);
  }, []);

  const handleNavFirst = useCallback((): void => setCurrentMoveIndex(-1), []);
  const handleNavPrev = useCallback(
    (): void => setCurrentMoveIndex((prev) => Math.max(-1, prev - 1)),
    [],
  );
  const handleNavNext = useCallback(
    (): void => setCurrentMoveIndex((prev) => Math.min(totalMoves - 1, prev + 1)),
    [totalMoves],
  );
  const handleNavLast = useCallback(
    (): void => setCurrentMoveIndex(totalMoves - 1),
    [totalMoves],
  );

  const handleDrillComplete = useCallback((): void => {
    // Drill progress is tracked inside DrillMode
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

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 overflow-y-auto" data-testid="opening-detail">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
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

        {/* Mode toggle */}
        <div className="flex bg-theme-surface rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('study')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'study' ? 'bg-theme-accent text-white' : 'text-theme-text-muted'
            }`}
            data-testid="study-mode-btn"
          >
            <BookOpen size={14} />
            Study
          </button>
          <button
            onClick={() => setViewMode('drill')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'drill' ? 'bg-theme-accent text-white' : 'text-theme-text-muted'
            }`}
            data-testid="drill-mode-btn"
          >
            <Play size={14} />
            Drill
          </button>
        </div>
      </div>

      {viewMode === 'drill' ? (
        <DrillMode
          opening={opening}
          onComplete={handleDrillComplete}
          onExit={() => setViewMode('study')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Board + navigation */}
          <div className="space-y-3">
            <div className="max-w-md">
              <ChessBoard
                initialFen={fenAtMove}
                key={fenAtMove}
                orientation={opening.color}
                interactive={false}
                showFlipButton
                showUndoButton={false}
                showResetButton={false}
              />
            </div>

            {/* Navigation controls */}
            <div className="flex justify-center gap-1">
              <button
                onClick={handleNavFirst}
                disabled={currentMoveIndex < 0}
                className="p-2 rounded-lg hover:bg-theme-surface disabled:opacity-30 transition-colors"
                aria-label="First move"
                data-testid="nav-first"
              >
                <SkipBack size={16} className="text-theme-text" />
              </button>
              <button
                onClick={handleNavPrev}
                disabled={currentMoveIndex < 0}
                className="p-2 rounded-lg hover:bg-theme-surface disabled:opacity-30 transition-colors"
                aria-label="Previous move"
                data-testid="nav-prev"
              >
                <ChevronLeft size={16} className="text-theme-text" />
              </button>
              <button
                onClick={handleNavNext}
                disabled={currentMoveIndex >= totalMoves - 1}
                className="p-2 rounded-lg hover:bg-theme-surface disabled:opacity-30 transition-colors"
                aria-label="Next move"
                data-testid="nav-next"
              >
                <ChevronRight size={16} className="text-theme-text" />
              </button>
              <button
                onClick={handleNavLast}
                disabled={currentMoveIndex >= totalMoves - 1}
                className="p-2 rounded-lg hover:bg-theme-surface disabled:opacity-30 transition-colors"
                aria-label="Last move"
                data-testid="nav-last"
              >
                <SkipForward size={16} className="text-theme-text" />
              </button>
            </div>

            {/* Progress stats */}
            {opening.drillAttempts > 0 && (
              <div className="flex gap-4 text-xs text-theme-text-muted">
                <span>Accuracy: {Math.round(opening.drillAccuracy * 100)}%</span>
                <span>Attempts: {opening.drillAttempts}</span>
                {opening.lastStudied && (
                  <span>Last studied: {new Date(opening.lastStudied).toLocaleDateString()}</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Move tree + info panels */}
          <div className="space-y-4 overflow-y-auto max-h-[calc(100dvh-12rem)]">
            {/* Move tree */}
            <div className="bg-theme-surface rounded-lg p-4">
              <MoveTree
                mainLinePgn={opening.pgn}
                variations={opening.variations}
                currentMoveIndex={currentMoveIndex}
                onMoveSelect={handleMoveSelect}
                activeVariation={activeVariation}
              />
            </div>

            {/* Overview */}
            {opening.overview && (
              <div className="bg-theme-surface rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={14} className="text-theme-accent" />
                  <h3 className="text-sm font-semibold text-theme-text">Overview</h3>
                </div>
                <p className="text-sm text-theme-text-muted leading-relaxed">{opening.overview}</p>
              </div>
            )}

            {/* Key Ideas */}
            {opening.keyIdeas && opening.keyIdeas.length > 0 && (
              <div className="bg-theme-surface rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={14} className="text-yellow-500" />
                  <h3 className="text-sm font-semibold text-theme-text">Key Ideas</h3>
                </div>
                <ul className="space-y-1">
                  {opening.keyIdeas.map((idea, i) => (
                    <li key={i} className="text-sm text-theme-text-muted flex gap-2">
                      <span className="text-theme-accent mt-0.5">-</span>
                      <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Traps */}
            {opening.traps && opening.traps.length > 0 && (
              <div className="bg-theme-surface rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-green-500" />
                  <h3 className="text-sm font-semibold text-theme-text">Traps to Know</h3>
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
              <div className="bg-theme-surface rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-theme-text">Watch Out</h3>
                </div>
                <ul className="space-y-2">
                  {opening.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-theme-text-muted">{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
