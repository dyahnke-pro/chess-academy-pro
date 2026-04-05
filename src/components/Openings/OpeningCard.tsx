import { MasteryRing } from './MasteryRing';
import { getMasteryPercent, needsReview } from '../../services/openingService';
import type { OpeningRecord } from '../../types';
import { Repeat, AlertCircle, Heart } from 'lucide-react';

interface OpeningCardProps {
  opening: OpeningRecord;
  onClick: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
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

export function OpeningCard({ opening, onClick, onToggleFavorite }: OpeningCardProps): JSX.Element {
  const mastery = getMasteryPercent(opening);
  const flagged = needsReview(opening);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="w-full text-left bg-theme-surface border border-transparent hover:border-theme-accent rounded-xl p-3.5 transition-all duration-200 group relative cursor-pointer"
      style={{
        borderBottom: '2px solid rgba(59, 130, 246, 0.25)',
        boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderBottom = '2px solid rgba(59, 130, 246, 0.7)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(59, 130, 246, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderBottom = '2px solid rgba(59, 130, 246, 0.25)';
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(59, 130, 246, 0.15)';
      }}
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

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(e);
            }}
            className="p-1.5 rounded-lg hover:bg-theme-border/50 transition-colors shrink-0"
            aria-label={opening.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            data-testid={`favorite-toggle-${opening.id}`}
          >
            <Heart
              size={16}
              className={opening.isFavorite ? 'text-red-500 fill-red-500' : 'text-theme-text-muted'}
            />
          </button>
        )}
      </div>
    </div>
  );
}
