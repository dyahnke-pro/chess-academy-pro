import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Layers, Target, HelpCircle, ArrowDownUp } from 'lucide-react';
import type { OpeningMoveAnnotation } from '../../types';

export interface AnnotationCardProps {
  annotation: OpeningMoveAnnotation | null;
  moveNumber: number;
  isWhite: boolean;
  visible: boolean;
}

export function AnnotationCard({
  annotation,
  moveNumber,
  isWhite,
  visible,
}: AnnotationCardProps): JSX.Element {
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (!annotation) {
    return <div data-testid="annotation-card-empty" />;
  }

  const moveLabel = isWhite
    ? `${moveNumber}. ${annotation.san}`
    : `${moveNumber}...${annotation.san}`;

  const hasPlans = annotation.plans && annotation.plans.length > 0;
  const hasPawnStructure = Boolean(annotation.pawnStructure);
  const hasAlternatives = annotation.alternatives && annotation.alternatives.length > 0;

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={`${moveNumber}-${annotation.san}`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="rounded-2xl backdrop-blur-xl bg-theme-surface/90 border border-white/15 p-4 shadow-lg overflow-y-auto max-h-[300px]"
          data-testid="annotation-card"
        >
          {/* Move header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-bold text-theme-accent" data-testid="annotation-move-label">
              {moveLabel}
            </span>
          </div>

          {/* Main annotation */}
          <p className="text-sm text-theme-text leading-relaxed" data-testid="annotation-text">
            {annotation.annotation}
          </p>

          {/* Move Order Note — why this move order matters */}
          {annotation.moveOrderNote && (
            <div className="mt-2 flex items-start gap-1.5 bg-violet-500/10 rounded-lg px-2.5 py-1.5" data-testid="annotation-move-order">
              <ArrowDownUp size={12} className="text-violet-400 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-300 leading-relaxed">
                <span className="font-semibold">Move order: </span>
                {annotation.moveOrderNote}
              </p>
            </div>
          )}

          {/* Pawn Structure — always visible when present, with icon */}
          {hasPawnStructure && (
            <div className="mt-3 pt-3 border-t border-white/10" data-testid="annotation-pawn-structure">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers size={12} className="text-amber-400" />
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  Pawn Structure
                </p>
              </div>
              <p className="text-sm text-theme-text leading-relaxed">
                {annotation.pawnStructure}
              </p>
            </div>
          )}

          {/* Plans — always visible when present, visually distinct */}
          {hasPlans && (
            <div className="mt-3 pt-3 border-t border-white/10" data-testid="annotation-plans">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target size={12} className="text-green-400" />
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                  Plans
                </p>
              </div>
              <ul className="space-y-1.5">
                {annotation.plans!.map((plan, i) => (
                  <li key={i} className="text-sm text-theme-text flex items-start gap-2 bg-green-500/5 rounded-lg px-2.5 py-1.5">
                    <span className="text-green-400 mt-0.5 shrink-0 font-bold">{i + 1}.</span>
                    <span>{plan}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternatives — collapsible "Why not X?" section */}
          {hasAlternatives && (
            <div className="mt-3 pt-3 border-t border-white/10" data-testid="annotation-alternatives">
              <button
                onClick={() => setShowAlternatives((s) => !s)}
                className="flex items-center gap-1.5 w-full text-left"
                data-testid="annotation-toggle"
              >
                <HelpCircle size={12} className="text-blue-400" />
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                  Why Not Other Moves?
                </p>
                <span className="ml-auto">
                  {showAlternatives
                    ? <ChevronUp size={14} className="text-theme-text-muted" />
                    : <ChevronDown size={14} className="text-theme-text-muted" />
                  }
                </span>
              </button>
              <AnimatePresence>
                {showAlternatives && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <ul className="space-y-1.5 mt-2">
                      {annotation.alternatives!.map((alt, i) => (
                        <li key={i} className="text-sm text-theme-text-muted flex items-start gap-2 bg-blue-500/5 rounded-lg px-2.5 py-1.5">
                          <span className="text-blue-400 mt-0.5 shrink-0">?</span>
                          <span>{alt}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
