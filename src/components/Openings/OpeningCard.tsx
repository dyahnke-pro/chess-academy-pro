import { MasteryRing } from './MasteryRing';
import { getMasteryPercent, needsReview } from '../../services/openingService';
import type { OpeningRecord } from '../../types';
import { Repeat, AlertCircle, Heart } from 'lucide-react';
import { getNeonColor } from '../../utils/neonColors';

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
  const neon = getNeonColor(opening.style);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="w-full text-left bg-theme-surface rounded-xl p-3.5 transition-all duration-200 group relative cursor-pointer"
      style={{
        borderTop: `1px solid rgba(${neon.rgb}, 0.1)`,
        borderRight: `1px solid rgba(${neon.rgb}, 0.1)`,
        borderLeft: `2px solid rgba(${neon.rgb}, 0.6)`,
        borderBottom: `2px solid rgba(${neon.rgb}, 0.6)`,
        boxShadow: neon.shadow,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderTop = `1px solid rgba(${neon.rgb}, 0.2)`;
        el.style.borderRight = `1px solid rgba(${neon.rgb}, 0.2)`;
        el.style.borderLeft = `2px solid rgba(${neon.rgb}, 0.85)`;
        el.style.borderBottom = `2px solid rgba(${neon.rgb}, 0.85)`;
        el.style.boxShadow = neon.shadowHover;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderTop = `1px solid rgba(${neon.rgb}, 0.1)`;
        el.style.borderRight = `1px solid rgba(${neon.rgb}, 0.1)`;
        el.style.borderLeft = `2px solid rgba(${neon.rgb}, 0.6)`;
        el.style.borderBottom = `2px solid rgba(${neon.rgb}, 0.6)`;
        el.style.boxShadow = neon.shadow;
      }}
      data-testid={`opening-card-${opening.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Mastery ring */}
        <MasteryRing percent={mastery} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-semibold ${neon.ecoBadge}`}>{opening.eco}</span>
            <span className="text-sm font-semibold text-theme-text truncate">
              {opening.name}
            </span>
            {flagged && (
              <AlertCircle size={13} className="text-red-500 shrink-0" data-testid="needs-review" />
            )}
          </div>

          {/* Style tag */}
          {opening.style && (
            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${neon.tagBg} ${neon.tagText}`}>
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
