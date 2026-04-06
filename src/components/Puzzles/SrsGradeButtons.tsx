import { getGradeLabel } from '../../services/srsEngine';
import type { SrsGrade } from '../../types';

interface SrsGradeButtonsProps {
  currentInterval: number;
  easeFactor: number;
  repetitions: number;
  onGrade: (grade: SrsGrade) => void;
  disabled?: boolean;
}

const GRADES: { grade: SrsGrade; color: string; glowColor: string }[] = [
  { grade: 'again', color: 'bg-red-600 hover:bg-red-700', glowColor: 'rgba(239, 68, 68, 0.4)' },
  { grade: 'hard', color: 'bg-orange-600 hover:bg-orange-700', glowColor: 'rgba(249, 115, 22, 0.4)' },
  { grade: 'good', color: 'bg-green-600 hover:bg-green-700', glowColor: 'rgba(34, 197, 94, 0.4)' },
  { grade: 'easy', color: 'bg-blue-600 hover:bg-blue-700', glowColor: 'rgba(59, 130, 246, 0.4)' },
];

export function SrsGradeButtons({
  currentInterval,
  easeFactor,
  repetitions,
  onGrade,
  disabled = false,
}: SrsGradeButtonsProps): JSX.Element {
  return (
    <div className="flex gap-2" data-testid="srs-grade-buttons">
      {GRADES.map(({ grade, color, glowColor }) => {
        const label = getGradeLabel(grade, currentInterval, easeFactor, repetitions);
        return (
          <button
            key={grade}
            onClick={() => onGrade(grade)}
            disabled={disabled}
            className={`flex-1 px-3 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 disabled:opacity-40 ${color}`}
            style={{ boxShadow: `0 0 8px ${glowColor}` }}
            aria-label={`Rate as ${grade}: ${label}`}
            data-testid={`grade-${grade}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
