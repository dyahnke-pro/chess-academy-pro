import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getAccuracyColor } from './classificationStyles';
import type { GamePhase, PhaseAccuracy } from '../../types';

interface PhaseSummaryCardsProps {
  phaseBreakdown: PhaseAccuracy[];
  phaseDetails: Partial<Record<GamePhase, string>>;
  loadingPhase: GamePhase | null;
  onRequestDetail: (phase: GamePhase) => void;
}

const PHASE_CONFIG: Record<GamePhase, { label: string; icon: string }> = {
  opening: { label: 'Opening', icon: '📖' },
  middlegame: { label: 'Middlegame', icon: '⚔️' },
  endgame: { label: 'Endgame', icon: '👑' },
};

const PHASE_ORDER: GamePhase[] = ['opening', 'middlegame', 'endgame'];

function getAssessmentLine(phase: PhaseAccuracy): string {
  if (phase.moveCount === 0) return 'No moves in this phase';
  if (phase.accuracy >= 90) return 'Excellent play';
  if (phase.accuracy >= 75) return 'Solid play';
  if (phase.accuracy >= 60) return 'Some room for improvement';
  if (phase.accuracy >= 40) return 'Several inaccuracies';
  return 'Needs significant work';
}

export function PhaseSummaryCards({
  phaseBreakdown,
  phaseDetails,
  loadingPhase,
  onRequestDetail,
}: PhaseSummaryCardsProps): JSX.Element {
  const [expandedPhase, setExpandedPhase] = useState<GamePhase | null>(null);

  const phaseMap = new Map(phaseBreakdown.map((p) => [p.phase, p]));

  const handleToggle = (phase: GamePhase): void => {
    if (expandedPhase === phase) {
      setExpandedPhase(null);
      return;
    }
    setExpandedPhase(phase);
    if (!phaseDetails[phase]) {
      onRequestDetail(phase);
    }
  };

  return (
    <div className="px-2 py-1.5 border-b border-theme-border" data-testid="phase-summary-cards">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Phase Breakdown
        </span>
      </div>
      <div className="space-y-1.5">
        {PHASE_ORDER.map((phaseId) => {
          const phase = phaseMap.get(phaseId);
          if (!phase || phase.moveCount === 0) return null;

          const isExpanded = expandedPhase === phaseId;
          const isLoading = loadingPhase === phaseId;
          const detail = phaseDetails[phaseId];
          const config = PHASE_CONFIG[phaseId];
          const accuracyColor = getAccuracyColor(phase.accuracy);

          return (
            <div
              key={phaseId}
              className="rounded-lg overflow-hidden"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              data-testid={`phase-card-${phaseId}`}
            >
              {/* Card header — always visible */}
              <button
                onClick={() => handleToggle(phaseId)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity"
              >
                <span className="text-sm">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                      {config.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: accuracyColor }}>
                        {Math.round(phase.accuracy)}%
                      </span>
                      {isExpanded
                        ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} />
                        : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
                      }
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {getAssessmentLine(phase)}
                    </span>
                    {phase.mistakes > 0 && (
                      <span className="text-[10px]" style={{ color: 'var(--color-warning)' }}>
                        {phase.mistakes} mistake{phase.mistakes !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Accuracy bar */}
                  <div
                    className="w-full h-1 rounded-full mt-1.5"
                    style={{ background: 'var(--color-border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, phase.accuracy))}%`,
                        background: accuracyColor,
                      }}
                    />
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div
                  className="px-3 pb-2 pt-0.5 border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                  data-testid={`phase-detail-${phaseId}`}
                >
                  {isLoading && !detail && (
                    <div className="flex items-center gap-1.5 py-2">
                      <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Analyzing {config.label.toLowerCase()}...
                      </span>
                    </div>
                  )}
                  {detail && (
                    <p
                      className="text-xs leading-relaxed py-1"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {detail}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
