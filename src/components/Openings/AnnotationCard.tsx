import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MoveAnnotation } from '../../types';

export interface AnnotationCardProps {
  annotation: MoveAnnotation | null;
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
  const [expanded, setExpanded] = useState(true);

  if (!annotation) {
    return <div data-testid="annotation-card-empty" />;
  }

  const moveLabel = isWhite
    ? `${moveNumber}. ${annotation.san}`
    : `${moveNumber}...${annotation.san}`;

  const hasExtras = Boolean(
    annotation.pawnStructure || annotation.plans?.length || annotation.alternatives?.length,
  );

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={`${moveNumber}-${annotation.san}`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="rounded-2xl backdrop-blur-xl bg-theme-surface/90 border border-white/15 p-4 shadow-lg overflow-y-auto max-h-[250px]"
          data-testid="annotation-card"
        >
          {/* Move header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-bold text-theme-accent" data-testid="annotation-move-label">
              {moveLabel}
            </span>
            {hasExtras && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="p-1 rounded-lg hover:bg-theme-border/50 text-theme-text-muted"
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
                data-testid="annotation-toggle"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>

          {/* Main annotation */}
          <p className="text-sm text-theme-text leading-relaxed" data-testid="annotation-text">
            {annotation.annotation}
          </p>

          {/* Expandable sections */}
          <AnimatePresence>
            {expanded && hasExtras && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {annotation.pawnStructure && (
                  <div className="mt-3 pt-3 border-t border-white/10" data-testid="annotation-pawn-structure">
                    <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide mb-1">
                      Pawn Structure
                    </p>
                    <p className="text-sm text-theme-text leading-relaxed">
                      {annotation.pawnStructure}
                    </p>
                  </div>
                )}

                {annotation.plans && annotation.plans.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10" data-testid="annotation-plans">
                    <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide mb-1">
                      Plans
                    </p>
                    <ul className="space-y-1">
                      {annotation.plans.map((plan, i) => (
                        <li key={i} className="text-sm text-theme-text flex items-start gap-2">
                          <span className="text-theme-accent mt-0.5">&#8226;</span>
                          <span>{plan}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {annotation.alternatives && annotation.alternatives.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10" data-testid="annotation-alternatives">
                    <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide mb-1">
                      Alternatives
                    </p>
                    <ul className="space-y-1">
                      {annotation.alternatives.map((alt, i) => (
                        <li key={i} className="text-sm text-theme-text-muted flex items-start gap-2">
                          <span className="mt-0.5">&#8226;</span>
                          <span>{alt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
