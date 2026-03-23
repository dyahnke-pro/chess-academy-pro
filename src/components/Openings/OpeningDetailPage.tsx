import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Chess } from 'chess.js';
import { DrillMode } from './DrillMode';
import { PracticeMode } from './PracticeMode';
import { OpeningPlayMode } from './OpeningPlayMode';
import { TrainMode } from './TrainMode';
import { WalkthroughMode } from './WalkthroughMode';
import { MasteryRing } from './MasteryRing';
import { MiniBoard } from '../Board/MiniBoard';
import {
  getOpeningById,
  getMasteryPercent,
  getLinesDiscovered,
  getLinesPerfected,
  getTotalLines,
  toggleFavorite,
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
  CheckCircle,
  Trophy,
  Volume2,
  Square as StopIcon,
  Crosshair,
  Heart,
  PlayCircle,
} from 'lucide-react';

type ViewMode =
  | 'detail'
  | 'learn'
  | 'practice'
  | 'play'
  | 'variation-learn'
  | 'variation-practice'
  | 'variation-play'
  | 'trap-learn'
  | 'trap-practice'
  | 'trap-play'
  | 'warning-learn'
  | 'warning-practice'
  | 'warning-play'
  | 'walkthrough'
  | 'variation-walkthrough'
  | 'trap-walkthrough'
  | 'warning-walkthrough'
  | 'train-traps'
  | 'train-warnings';

function computeFenFromPgn(pgn: string): string {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const chess = new Chess();
  for (const san of tokens) {
    try {
      chess.move(san);
    } catch {
      break;
    }
  }
  return chess.fen();
}

export function OpeningDetailPage(): JSX.Element {
  const { id, playerId } = useParams<{ id: string; playerId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isProContext = location.pathname.includes('/openings/pro/');
  const [opening, setOpening] = useState<OpeningRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [activeVariationIndex, setActiveVariationIndex] = useState(-1);
  const [activeTrapLineIndex, setActiveTrapLineIndex] = useState(-1);
  const [activeWarningLineIndex, setActiveWarningLineIndex] = useState(-1);
  const [narratingSection, setNarratingSection] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const loadOpening = useCallback(async (): Promise<void> => {
    if (!id) return;
    const result = await getOpeningById(id);
    setOpening(result ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadOpening();
  }, [loadOpening]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleComplete = useCallback((): void => {
    void loadOpening();
  }, [loadOpening]);

  const handleExit = useCallback((): void => {
    setViewMode('detail');
    setActiveVariationIndex(-1);
    setActiveTrapLineIndex(-1);
    setActiveWarningLineIndex(-1);
    void loadOpening();
  }, [loadOpening]);

  const handleStartVariationWalkthrough = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    setViewMode('variation-walkthrough');
  }, []);

  const handleStartVariationLearn = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    setViewMode('variation-learn');
  }, []);

  const handleStartVariationPractice = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    setViewMode('variation-practice');
  }, []);

  const handleStartVariationPlay = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    setViewMode('variation-play');
  }, []);

  const handleStartTrapLineAction = useCallback((index: number, action: 'learn' | 'practice' | 'play' | 'walkthrough'): void => {
    setActiveTrapLineIndex(index);
    setViewMode(`trap-${action}` as ViewMode);
  }, []);

  const handleStartWarningLineAction = useCallback((index: number, action: 'learn' | 'practice' | 'play' | 'walkthrough'): void => {
    setActiveWarningLineIndex(index);
    setViewMode(`warning-${action}` as ViewMode);
  }, []);

  const handleToggleFavorite = useCallback(async (): Promise<void> => {
    if (!opening) return;
    const newVal = await toggleFavorite(opening.id);
    setOpening({ ...opening, isFavorite: newVal });
  }, [opening]);

  // ─── Voice narration ──────────────────────────────────────────────────────
  const toggleNarration = useCallback((sectionId: string, text: string): void => {
    if (narratingSection === sectionId) {
      // Stop
      window.speechSynthesis.cancel();
      setNarratingSection(null);
      utteranceRef.current = null;
      return;
    }

    // Stop any current narration
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => {
      setNarratingSection(null);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setNarratingSection(null);
      utteranceRef.current = null;
    };
    utteranceRef.current = utterance;
    setNarratingSection(sectionId);
    window.speechSynthesis.speak(utterance);
  }, [narratingSection]);

  // Precompute variation FENs for thumbnails
  const variationFens = useMemo((): string[] => {
    if (!opening?.variations) return [];
    return opening.variations.map((v) => computeFenFromPgn(v.pgn));
  }, [opening?.variations]);

  // Precompute trap/warning line FENs for thumbnails
  const trapLineFens = useMemo((): string[] => {
    if (!opening?.trapLines) return [];
    return opening.trapLines.map((v) => computeFenFromPgn(v.pgn));
  }, [opening?.trapLines]);

  const warningLineFens = useMemo((): string[] => {
    if (!opening?.warningLines) return [];
    return opening.warningLines.map((v) => computeFenFromPgn(v.pgn));
  }, [opening?.warningLines]);

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

  // Walkthrough mode (main line or variation)
  if (viewMode === 'walkthrough' || viewMode === 'variation-walkthrough') {
    return (
      <WalkthroughMode
        opening={opening}
        variationIndex={viewMode === 'variation-walkthrough' ? activeVariationIndex : undefined}
        onExit={handleExit}
      />
    );
  }

  // Walkthrough mode (trap/warning lines)
  if (viewMode === 'trap-walkthrough' && opening.trapLines?.[activeTrapLineIndex]) {
    return (
      <WalkthroughMode
        opening={opening}
        customLine={opening.trapLines[activeTrapLineIndex]}
        subLineKey={`trap-${activeTrapLineIndex}`}
        onExit={handleExit}
      />
    );
  }
  if (viewMode === 'warning-walkthrough' && opening.warningLines?.[activeWarningLineIndex]) {
    return (
      <WalkthroughMode
        opening={opening}
        customLine={opening.warningLines[activeWarningLineIndex]}
        subLineKey={`warning-${activeWarningLineIndex}`}
        onExit={handleExit}
      />
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

  // Learn mode (trap/warning lines)
  if (viewMode === 'trap-learn' && opening.trapLines?.[activeTrapLineIndex]) {
    return (
      <DrillMode
        opening={opening}
        customLine={opening.trapLines[activeTrapLineIndex]}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }
  if (viewMode === 'warning-learn' && opening.warningLines?.[activeWarningLineIndex]) {
    return (
      <DrillMode
        opening={opening}
        customLine={opening.warningLines[activeWarningLineIndex]}
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

  // Practice mode (trap/warning lines)
  if (viewMode === 'trap-practice' && opening.trapLines?.[activeTrapLineIndex]) {
    return (
      <PracticeMode
        opening={opening}
        customLine={opening.trapLines[activeTrapLineIndex]}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }
  if (viewMode === 'warning-practice' && opening.warningLines?.[activeWarningLineIndex]) {
    return (
      <PracticeMode
        opening={opening}
        customLine={opening.warningLines[activeWarningLineIndex]}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }

  // Play mode (main line)
  if (viewMode === 'play') {
    return (
      <OpeningPlayMode
        opening={opening}
        onExit={handleExit}
      />
    );
  }

  // Play mode (variation)
  if (viewMode === 'variation-play' && opening.variations?.[activeVariationIndex]) {
    return (
      <OpeningPlayMode
        opening={opening}
        customLine={opening.variations[activeVariationIndex]}
        onExit={handleExit}
      />
    );
  }

  // Play mode (trap/warning lines)
  if (viewMode === 'trap-play' && opening.trapLines?.[activeTrapLineIndex]) {
    return (
      <OpeningPlayMode
        opening={opening}
        customLine={opening.trapLines[activeTrapLineIndex]}
        onExit={handleExit}
      />
    );
  }
  if (viewMode === 'warning-play' && opening.warningLines?.[activeWarningLineIndex]) {
    return (
      <OpeningPlayMode
        opening={opening}
        customLine={opening.warningLines[activeWarningLineIndex]}
        onExit={handleExit}
      />
    );
  }

  // Train mode (traps or warnings)
  if (viewMode === 'train-traps' && opening.trapLines && opening.trapLines.length > 0) {
    return (
      <TrainMode
        opening={opening}
        lines={opening.trapLines}
        sectionLabel="Traps & Pitfalls"
        onExit={handleExit}
      />
    );
  }

  if (viewMode === 'train-warnings' && opening.warningLines && opening.warningLines.length > 0) {
    return (
      <TrainMode
        opening={opening}
        lines={opening.warningLines}
        sectionLabel="Watch Out For"
        onExit={handleExit}
      />
    );
  }

  // Detail view
  const mastery = getMasteryPercent(opening);
  const totalLines = getTotalLines(opening);
  const discovered = getLinesDiscovered(opening);
  const perfected = getLinesPerfected(opening);

  const NarrationButton = ({ sectionId, text }: { sectionId: string; text: string }): JSX.Element => {
    const isNarrating = narratingSection === sectionId;
    return (
      <button
        onClick={() => toggleNarration(sectionId, text)}
        className="ml-auto p-1.5 rounded-lg hover:bg-theme-border/50 text-theme-text-muted hover:text-theme-accent transition-colors"
        aria-label={isNarrating ? 'Stop narration' : 'Narrate section'}
        data-testid={`narrate-${sectionId}`}
      >
        {isNarrating ? <StopIcon size={14} /> : <Volume2 size={14} />}
      </button>
    );
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto" data-testid="opening-detail">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => void navigate(isProContext && playerId ? `/openings/pro/${playerId}` : '/openings')}
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
        <button
          onClick={() => void handleToggleFavorite()}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
          aria-label={opening.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          data-testid="favorite-btn"
        >
          <Heart
            size={20}
            className={opening.isFavorite ? 'text-red-500 fill-red-500' : 'text-theme-text-muted'}
          />
        </button>
        <MasteryRing percent={mastery} size={48} />
      </div>

      {/* Line stats */}
      {totalLines > 0 && (
        <div className="flex gap-4 mb-4 text-sm text-theme-text-muted">
          <span data-testid="lines-discovered">{discovered}/{totalLines} lines discovered</span>
          <span data-testid="lines-perfected">{perfected}/{totalLines} lines perfected</span>
        </div>
      )}

      {/* WALKTHROUGH, LEARN, PRACTICE, PLAY buttons */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <button
          onClick={() => setViewMode('walkthrough')}
          className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-theme-accent text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          data-testid="walkthrough-btn"
        >
          <PlayCircle size={20} />
          Watch
        </button>
        <button
          onClick={() => setViewMode('learn')}
          className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold text-sm hover:bg-theme-border transition-colors"
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
            <NarrationButton sectionId="overview" text={opening.overview} />
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
            <NarrationButton sectionId="keyIdeas" text={opening.keyIdeas.join('. ')} />
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
            <NarrationButton sectionId="traps" text={opening.traps.join('. ')} />
            {opening.trapLines && opening.trapLines.length > 0 && (
              <button
                onClick={() => setViewMode('train-traps')}
                className="p-1.5 rounded-lg hover:bg-theme-border/50 text-theme-text-muted hover:text-green-500 transition-colors"
                aria-label="Train traps"
                title="Train"
                data-testid="train-traps-btn"
              >
                <Crosshair size={14} />
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {opening.traps.map((trap, i) => (
              <li key={i} className="text-sm text-theme-text-muted">{trap}</li>
            ))}
          </ul>
          {opening.trapLines && opening.trapLines.length > 0 && (
            <div className="space-y-1 mt-3 pt-3 border-t border-theme-border">
              {opening.trapLines.map((line, i) => (
                <div
                  key={i}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-theme-border/50 transition-colors"
                  data-testid={`trap-line-${i}`}
                >
                  <MiniBoard fen={trapLineFens[i]} size={52} orientation={opening.color} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-theme-text">{line.name}</span>
                    <p className="text-xs text-theme-text-muted truncate mt-0.5">{line.explanation}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={() => handleStartTrapLineAction(i, 'walkthrough')}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Watch ${line.name}`}
                      title="Watch"
                      data-testid={`trap-walkthrough-${i}`}
                    >
                      <PlayCircle size={20} />
                    </button>
                    <button
                      onClick={() => handleStartTrapLineAction(i, 'learn')}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Learn ${line.name}`}
                      title="Learn"
                      data-testid={`trap-learn-${i}`}
                    >
                      <LearnIcon size={20} />
                    </button>
                    <button
                      onClick={() => handleStartTrapLineAction(i, 'practice')}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Practice ${line.name}`}
                      title="Practice"
                      data-testid={`trap-practice-${i}`}
                    >
                      <Brain size={20} />
                    </button>
                    <button
                      onClick={() => handleStartTrapLineAction(i, 'play')}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Play ${line.name}`}
                      title="Play"
                      data-testid={`trap-play-${i}`}
                    >
                      <Swords size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {opening.warnings && opening.warnings.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-theme-text">Watch Out For</h3>
            <NarrationButton sectionId="warnings" text={opening.warnings.join('. ')} />
            {opening.warningLines && opening.warningLines.length > 0 && (
              <button
                onClick={() => setViewMode('train-warnings')}
                className="p-1.5 rounded-lg hover:bg-theme-border/50 text-theme-text-muted hover:text-amber-500 transition-colors"
                aria-label="Train warnings"
                title="Train"
                data-testid="train-warnings-btn"
              >
                <Crosshair size={14} />
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {opening.warnings.map((warning, i) => (
              <li key={i} className="text-sm text-theme-text-muted">{warning}</li>
            ))}
          </ul>
          {opening.warningLines && opening.warningLines.length > 0 && (
            <div className="space-y-1 mt-3 pt-3 border-t border-theme-border">
              {opening.warningLines.map((line, i) => (
                <div
                  key={i}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-theme-border/50 transition-colors"
                  data-testid={`warning-line-${i}`}
                >
                  <MiniBoard fen={warningLineFens[i]} size={52} orientation={opening.color} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-theme-text">{line.name}</span>
                    <p className="text-xs text-theme-text-muted truncate mt-0.5">{line.explanation}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={() => handleStartWarningLineAction(i, 'walkthrough')}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Watch ${line.name}`}
                      title="Watch"
                      data-testid={`warning-walkthrough-${i}`}
                    >
                      <PlayCircle size={20} />
                    </button>
                    <button
                      onClick={() => handleStartWarningLineAction(i, 'learn')}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Learn ${line.name}`}
                      title="Learn"
                      data-testid={`warning-learn-${i}`}
                    >
                      <LearnIcon size={20} />
                    </button>
                    <button
                      onClick={() => handleStartWarningLineAction(i, 'practice')}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Practice ${line.name}`}
                      title="Practice"
                      data-testid={`warning-practice-${i}`}
                    >
                      <Brain size={20} />
                    </button>
                    <button
                      onClick={() => handleStartWarningLineAction(i, 'play')}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Play ${line.name}`}
                      title="Play"
                      data-testid={`warning-play-${i}`}
                    >
                      <Swords size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-theme-border/50 transition-colors group"
                  data-testid={`variation-${i}`}
                >
                  {/* Board thumbnail */}
                  <MiniBoard
                    fen={variationFens[i]}
                    size={52}
                    orientation={opening.color}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-theme-text">{variation.name}</span>
                      {isPerfected && <Trophy size={12} className="text-yellow-500" />}
                      {isDiscovered && !isPerfected && <CheckCircle size={12} className="text-green-500" />}
                    </div>
                    <p className="text-xs text-theme-text-muted truncate mt-0.5">{variation.explanation}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={() => handleStartVariationWalkthrough(i)}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Watch ${variation.name}`}
                      title="Watch"
                      data-testid={`variation-walkthrough-${i}`}
                    >
                      <PlayCircle size={20} />
                    </button>
                    <button
                      onClick={() => handleStartVariationLearn(i)}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Learn ${variation.name}`}
                      title="Learn"
                      data-testid={`variation-learn-${i}`}
                    >
                      <LearnIcon size={20} />
                    </button>
                    <button
                      onClick={() => handleStartVariationPractice(i)}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Practice ${variation.name}`}
                      title="Practice"
                      data-testid={`variation-practice-${i}`}
                    >
                      <Brain size={20} />
                    </button>
                    <button
                      onClick={() => handleStartVariationPlay(i)}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors"
                      aria-label={`Play ${variation.name}`}
                      title="Play"
                      data-testid={`variation-play-${i}`}
                    >
                      <Swords size={20} />
                    </button>
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
