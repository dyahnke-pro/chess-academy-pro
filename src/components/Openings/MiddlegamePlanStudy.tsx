import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ControlledChessBoard } from '../Board/ControlledChessBoard';
import { useChessGame } from '../../hooks/useChessGame';
import { MiddlegamePractice } from './MiddlegamePractice';
import { speechService } from '../../services/speechService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Compass,
  Swords,
  GitBranch,
  Flag,
  Volume2,
  VolumeX,
  Dumbbell,
} from 'lucide-react';
import type {
  MiddlegamePlan,
  AnnotationArrow,
  AnnotationHighlight,
  PawnBreak,
  PieceManeuver,
} from '../../types';

interface MiddlegamePlanStudyProps {
  plan: MiddlegamePlan;
  boardOrientation: 'white' | 'black';
  onExit: () => void;
}

type PlanSection = 'overview' | 'pawnBreaks' | 'maneuvers' | 'themes' | 'endgames';

const SECTIONS: { key: PlanSection; label: string; icon: typeof Compass }[] = [
  { key: 'overview', label: 'Overview', icon: Compass },
  { key: 'pawnBreaks', label: 'Pawn Breaks', icon: Swords },
  { key: 'maneuvers', label: 'Maneuvers', icon: GitBranch },
  { key: 'themes', label: 'Themes', icon: Compass },
  { key: 'endgames', label: 'Endgames', icon: Flag },
];

function arrowsToBoard(
  arrows: AnnotationArrow[] | undefined,
): Array<{ startSquare: string; endSquare: string; color: string }> {
  if (!arrows) return [];
  return arrows.map((a) => ({
    startSquare: a.from,
    endSquare: a.to,
    color: a.color ?? 'rgba(0, 128, 0, 0.8)',
  }));
}

function highlightsToBoard(
  highlights: AnnotationHighlight[] | undefined,
): Array<{ square: string; color: string }> {
  if (!highlights) return [];
  return highlights.map((h) => ({
    square: h.square,
    color: h.color ?? 'rgba(255, 255, 0, 0.4)',
  }));
}

/** Build the narration text for the active section. */
function getSectionText(
  plan: MiddlegamePlan,
  section: PlanSection,
  pawnBreakIndex: number,
  maneuverIndex: number,
): string {
  switch (section) {
    case 'overview':
      return plan.overview;
    case 'pawnBreaks': {
      if (plan.pawnBreaks.length === 0) return 'No pawn breaks documented for this plan.';
      const pb = plan.pawnBreaks[pawnBreakIndex];
      return `${pb.move}. ${pb.explanation}`;
    }
    case 'maneuvers': {
      if (plan.pieceManeuvers.length === 0) return 'No piece maneuvers documented for this plan.';
      const m = plan.pieceManeuvers[maneuverIndex];
      return `${m.piece}, route ${m.route}. ${m.explanation}`;
    }
    case 'themes':
      return plan.strategicThemes.length > 0
        ? `Strategic themes. ${plan.strategicThemes.join('. ')}.`
        : 'No strategic themes documented.';
    case 'endgames':
      return plan.endgameTransitions.length > 0
        ? `Favorable endgame transitions. ${plan.endgameTransitions.join('. ')}.`
        : 'No endgame transitions documented.';
  }
}

export function MiddlegamePlanStudy({
  plan,
  boardOrientation,
  onExit,
}: MiddlegamePlanStudyProps): JSX.Element {
  const [activeSection, setActiveSection] = useState<PlanSection>('overview');
  const [pawnBreakIndex, setPawnBreakIndex] = useState(0);
  const [maneuverIndex, setManeuverIndex] = useState(0);
  const [isMiddlegamePracticing, setIsMiddlegamePracticing] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const narrationActiveRef = useRef(false);

  // Determine which FEN and arrows to show based on active section
  const { displayFen, displayArrows, displayHighlights } = useMemo(() => {
    if (activeSection === 'pawnBreaks' && plan.pawnBreaks.length > 0) {
      const pb = plan.pawnBreaks[pawnBreakIndex];
      return {
        displayFen: pb.fen || plan.criticalPositionFen,
        displayArrows: arrowsToBoard(pb.arrows),
        displayHighlights: [] as Array<{ square: string; color: string }>,
      };
    }
    if (activeSection === 'maneuvers' && plan.pieceManeuvers.length > 0) {
      const m = plan.pieceManeuvers[maneuverIndex];
      return {
        displayFen: plan.criticalPositionFen,
        displayArrows: arrowsToBoard(m.arrows),
        displayHighlights: [] as Array<{ square: string; color: string }>,
      };
    }
    return {
      displayFen: plan.criticalPositionFen,
      displayArrows: arrowsToBoard(plan.arrows),
      displayHighlights: highlightsToBoard(plan.highlights),
    };
  }, [activeSection, pawnBreakIndex, maneuverIndex, plan]);

  // Chess game for the board — parent owns the game object
  const game = useChessGame(displayFen, boardOrientation);

  // Sync game position when displayFen changes (tab/carousel navigation)
  useEffect(() => {
    if (game.fen !== displayFen) {
      game.loadFen(displayFen);
    }
  }, [displayFen, game]);

  // Stop narration on tab/carousel change or unmount
  useEffect(() => {
    speechService.stop();
    setIsNarrating(false);
    narrationActiveRef.current = false;
  }, [activeSection, pawnBreakIndex, maneuverIndex]);

  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  // Narration toggle
  const toggleNarration = useCallback((): void => {
    if (isNarrating) {
      speechService.stop();
      setIsNarrating(false);
      narrationActiveRef.current = false;
    } else {
      const text = getSectionText(plan, activeSection, pawnBreakIndex, maneuverIndex);
      if (!text) return;
      setIsNarrating(true);
      narrationActiveRef.current = true;
      void speechService.speak(text, {
        onEnd: () => {
          if (narrationActiveRef.current) {
            setIsNarrating(false);
            narrationActiveRef.current = false;
          }
        },
      });
    }
  }, [isNarrating, plan, activeSection, pawnBreakIndex, maneuverIndex]);

  const prevPawnBreak = useCallback((): void => {
    setPawnBreakIndex((i) => Math.max(0, i - 1));
  }, []);

  const nextPawnBreak = useCallback((): void => {
    setPawnBreakIndex((i) => Math.min(plan.pawnBreaks.length - 1, i + 1));
  }, [plan.pawnBreaks.length]);

  const prevManeuver = useCallback((): void => {
    setManeuverIndex((i) => Math.max(0, i - 1));
  }, []);

  const nextManeuver = useCallback((): void => {
    setManeuverIndex((i) => Math.min(plan.pieceManeuvers.length - 1, i + 1));
  }, [plan.pieceManeuvers.length]);

  // Full-screen middlegame practice mode
  if (isMiddlegamePracticing) {
    return (
      <MiddlegamePractice
        plan={plan}
        playerColor={boardOrientation}
        onExit={() => setIsMiddlegamePracticing(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="middlegame-plan-study">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2 flex-shrink-0">
        <button
          onClick={onExit}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back"
          data-testid="plan-study-back"
        >
          <ArrowLeft size={18} className="text-theme-text" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-theme-text truncate">
            {plan.title}
          </h2>
          <p className="text-xs text-theme-text-muted">Middlegame Plan</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1.5 px-4 overflow-x-auto pb-2 flex-shrink-0">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeSection === key
                ? 'bg-theme-accent text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                : 'bg-theme-surface text-theme-text-muted hover:bg-theme-border/50'
            }`}
            data-testid={`plan-tab-${key}`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="px-2 flex justify-center flex-shrink-0">
        <div className="w-full max-w-[400px]">
          <ControlledChessBoard
            game={game}
            interactive={false}
            showFlipButton={true}
            showUndoButton={false}
            showResetButton={false}
            showEvalBar={false}
            showVoiceMic={false}
            arrows={displayArrows}
            annotationHighlights={displayHighlights}
            showLastMoveHighlight={false}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3" data-testid="plan-content-scroll">
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-theme-surface/90 border border-white/15 p-4"
              data-testid="plan-overview"
            >
              <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide mb-2">
                Position Overview
              </p>
              <p className="text-sm text-theme-text leading-relaxed">
                {plan.overview}
              </p>
            </motion.div>
          )}

          {activeSection === 'pawnBreaks' && (
            <motion.div
              key="pawnBreaks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
              data-testid="plan-pawn-breaks"
            >
              {plan.pawnBreaks.length > 0 ? (
                <>
                  <PawnBreakCard break_={plan.pawnBreaks[pawnBreakIndex]} />
                  {plan.pawnBreaks.length > 1 && (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={prevPawnBreak}
                        disabled={pawnBreakIndex === 0}
                        className="p-1.5 rounded-lg hover:bg-theme-surface disabled:opacity-30 transition-colors"
                        aria-label="Previous break"
                      >
                        <ChevronLeft size={16} className="text-theme-text" />
                      </button>
                      <span className="text-xs text-theme-text-muted">
                        {pawnBreakIndex + 1} / {plan.pawnBreaks.length}
                      </span>
                      <button
                        onClick={nextPawnBreak}
                        disabled={pawnBreakIndex === plan.pawnBreaks.length - 1}
                        className="p-1.5 rounded-lg hover:bg-theme-surface disabled:opacity-30 transition-colors"
                        aria-label="Next break"
                      >
                        <ChevronRight size={16} className="text-theme-text" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-theme-text-muted">No pawn breaks documented for this plan.</p>
              )}
            </motion.div>
          )}

          {activeSection === 'maneuvers' && (
            <motion.div
              key="maneuvers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
              data-testid="plan-maneuvers"
            >
              {plan.pieceManeuvers.length > 0 ? (
                <>
                  <ManeuverCard maneuver={plan.pieceManeuvers[maneuverIndex]} />
                  {plan.pieceManeuvers.length > 1 && (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={prevManeuver}
                        disabled={maneuverIndex === 0}
                        className="p-1.5 rounded-lg hover:bg-theme-surface disabled:opacity-30 transition-colors"
                        aria-label="Previous maneuver"
                      >
                        <ChevronLeft size={16} className="text-theme-text" />
                      </button>
                      <span className="text-xs text-theme-text-muted">
                        {maneuverIndex + 1} / {plan.pieceManeuvers.length}
                      </span>
                      <button
                        onClick={nextManeuver}
                        disabled={maneuverIndex === plan.pieceManeuvers.length - 1}
                        className="p-1.5 rounded-lg hover:bg-theme-surface disabled:opacity-30 transition-colors"
                        aria-label="Next maneuver"
                      >
                        <ChevronRight size={16} className="text-theme-text" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-theme-text-muted">No piece maneuvers documented for this plan.</p>
              )}
            </motion.div>
          )}

          {activeSection === 'themes' && (
            <motion.div
              key="themes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-theme-surface/90 border border-white/15 p-4"
              data-testid="plan-themes"
            >
              <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide mb-2">
                Strategic Themes
              </p>
              <ul className="space-y-2">
                {plan.strategicThemes.map((theme, i) => (
                  <li key={i} className="text-sm text-theme-text flex gap-2">
                    <span className="text-theme-accent mt-0.5 shrink-0">-</span>
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {activeSection === 'endgames' && (
            <motion.div
              key="endgames"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-theme-surface/90 border border-white/15 p-4"
              data-testid="plan-endgames"
            >
              <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide mb-2">
                Favorable Endgame Transitions
              </p>
              {plan.endgameTransitions.length > 0 ? (
                <ul className="space-y-2">
                  {plan.endgameTransitions.map((transition, i) => (
                    <li key={i} className="text-sm text-theme-text flex gap-2">
                      <span className="text-theme-accent mt-0.5 shrink-0">-</span>
                      <span>{transition}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-theme-text-muted">No endgame transitions documented.</p>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-t border-theme-border flex-shrink-0 pb-safe-4"
        data-testid="plan-bottom-bar"
      >
        <button
          onClick={() => setIsMiddlegamePracticing(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm bg-theme-accent text-white shadow-[0_0_16px_rgba(99,102,241,0.5)] hover:shadow-[0_0_24px_rgba(99,102,241,0.7)] transition-all"
          data-testid="start-practice-btn"
        >
          <Dumbbell size={16} />
          Practice This Plan
        </button>
        <button
          onClick={toggleNarration}
          className={`p-3 rounded-xl transition-colors ${
            isNarrating
              ? 'bg-theme-accent text-white'
              : 'bg-theme-surface text-theme-text-muted hover:bg-theme-border/50'
          }`}
          aria-label={isNarrating ? 'Stop narration' : 'Read aloud'}
          data-testid="narration-toggle"
        >
          {isNarrating ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PawnBreakCard({ break_ }: { break_: PawnBreak }): JSX.Element {
  return (
    <div className="rounded-2xl bg-theme-surface/90 border border-white/15 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Swords size={14} className="text-theme-accent" />
        <span className="text-sm font-bold text-theme-accent">{break_.move}</span>
      </div>
      <p className="text-sm text-theme-text leading-relaxed">{break_.explanation}</p>
    </div>
  );
}

function ManeuverCard({ maneuver }: { maneuver: PieceManeuver }): JSX.Element {
  return (
    <div className="rounded-2xl bg-theme-surface/90 border border-white/15 p-4">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch size={14} className="text-theme-accent" />
        <span className="text-sm font-bold text-theme-text">{maneuver.piece}</span>
      </div>
      <p className="text-xs font-mono text-theme-accent mb-2">{maneuver.route}</p>
      <p className="text-sm text-theme-text leading-relaxed">{maneuver.explanation}</p>
    </div>
  );
}
