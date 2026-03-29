import { getGradeLabel } from '../../services/srsEngine';
import type { SrsGrade } from '../../types';

interface SrsGradeButtonsProps {
  currentInterval: number;
  easeFactor: number;
  repetitions: number;
  onGrade: (grade: SrsGrade) => void;
  disabled?: boolean;
}

const GRADES: { grade: SrsGrade; color: string }[] = [
  { grade: 'again', color: 'bg-red-600 hover:bg-red-700' },
  { grade: 'hard', color: 'bg-orange-600 hover:bg-orange-700' },
  { grade: 'good', color: 'bg-green-600 hover:bg-green-700' },
  { grade: 'easy', color: 'bg-blue-600 hover:bg-blue-700' },
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
      {GRADES.map(({ grade, color }) => {
        const label = getGradeLabel(grade, currentInterval, easeFactor, repetitions);
        return (
          <button
            key={grade}
            onClick={() => onGrade(grade)}
            disabled={disabled}
            className={`flex-1 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-40 ${color}`}
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
