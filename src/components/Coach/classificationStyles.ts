import type { MoveClassification } from '../../types';

export interface ClassificationStyle {
  symbol: string;
  color: string;
  label: string;
}

export const CLASSIFICATION_STYLES: Record<MoveClassification, ClassificationStyle> = {
  brilliant:  { symbol: '!!', color: '#22c55e', label: 'Brilliant' },
  great:      { symbol: '!',  color: '#4ade80', label: 'Great' },
  good:       { symbol: '✓',  color: '#a3a3a3', label: 'Good' },
  book:       { symbol: '📖', color: '#60a5fa', label: 'Book' },
  inaccuracy: { symbol: '?!', color: '#fbbf24', label: 'Inaccuracy' },
  mistake:    { symbol: '?',  color: '#f97316', label: 'Mistake' },
  blunder:    { symbol: '??', color: '#ef4444', label: 'Blunder' },
};

export const CLASSIFICATION_ORDER: MoveClassification[] = [
  'brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder',
];

export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return '#22c55e';
  if (accuracy >= 60) return '#fbbf24';
  return '#ef4444';
}

export function getClassificationHighlightColor(classification: MoveClassification): string | null {
  switch (classification) {
    case 'blunder': return 'rgba(239, 68, 68, 0.5)';
    case 'mistake': return 'rgba(249, 115, 22, 0.5)';
    case 'inaccuracy': return 'rgba(251, 191, 36, 0.4)';
    default: return null;
  }
}
