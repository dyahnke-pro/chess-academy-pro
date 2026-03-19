import { motion } from 'framer-motion';
import type { PhaseAccuracy } from '../../types';
import { getAccuracyColor, getPhaseGrade } from './classificationStyles';

interface PhaseGradesProps {
  phases: PhaseAccuracy[];
  className?: string;
}

const PHASE_ICONS: Record<string, string> = {
  opening: '📖',
  middlegame: '⚔️',
  endgame: '👑',
};

export function PhaseGrades({
  phases,
  className = '',
}: PhaseGradesProps): JSX.Element {
  const validPhases = phases.filter((p) => p.moveCount > 0);

  if (validPhases.length === 0) {
    return <div className={className} data-testid="phase-grades" />;
  }

  return (
    <div
      className={`grid grid-cols-3 gap-3 ${className}`}
      data-testid="phase-grades"
    >
      {validPhases.map((phase, i) => {
        const grade = getPhaseGrade(phase.accuracy);
        const color = getAccuracyColor(phase.accuracy);

        return (
          <motion.div
            key={phase.phase}
            className="flex flex-col items-center gap-1 py-3 rounded-lg"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
            data-testid={`phase-${phase.phase}`}
          >
            <span className="text-base">{PHASE_ICONS[phase.phase] ?? ''}</span>
            <span
              className="text-2xl font-bold"
              style={{ color }}
            >
              {grade}
            </span>
            <span
              className="text-[11px] capitalize"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {phase.phase}
            </span>
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {Math.round(phase.accuracy)}%
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
