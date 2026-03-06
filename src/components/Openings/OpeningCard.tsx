import { MasteryRing } from './MasteryRing';
import { getMasteryPercent, needsReview } from '../../services/openingService';
import type { OpeningRecord } from '../../types';
import { Repeat, AlertCircle } from 'lucide-react';

interface OpeningCardProps {
  opening: OpeningRecord;
  onClick: () => void;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'Not studied';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function OpeningCard({ opening, onClick }: OpeningCardProps): JSX.Element {
  const mastery = getMasteryPercent(opening);
  const flagged = needsReview(opening);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-theme-surface hover:bg-theme-border rounded-xl p-3.5 transition-colors group relative"
      data-testid={`opening-card-${opening.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Mastery ring */}
        <MasteryRing percent={mastery} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-theme-accent">{opening.eco}</span>
            <span className="text-sm font-semibold text-theme-text truncate">
              {opening.name}
            </span>
            {flagged && (
              <AlertCircle size={13} className="text-red-500 shrink-0" data-testid="needs-review" />
            )}
          </div>

          {/* Style tag */}
          {opening.style && (
            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-theme-accent/10 text-theme-accent">
              {opening.style}
            </span>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-theme-text-muted">
            <span>{formatRelativeDate(opening.lastStudied)}</span>
            {opening.woodpeckerReps > 0 && (
              <span className="flex items-center gap-1">
                <Repeat size={10} />
                {opening.woodpeckerReps} reps
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
