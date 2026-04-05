import { MasteryRing } from './MasteryRing';
import { getMasteryPercent, needsReview } from '../../services/openingService';
import type { OpeningRecord } from '../../types';
import { Repeat, AlertCircle, Heart } from 'lucide-react';

interface NeonColor {
  border: string;
  borderHover: string;
  shadow: string;
  shadowHover: string;
  tagBg: string;
  tagText: string;
  ecoBadge: string;
}

const STYLE_COLORS: Record<string, NeonColor> = {
  aggressive: {
    border: 'rgba(239, 68, 68, 0.3)',
    borderHover: 'rgba(239, 68, 68, 0.7)',
    shadow: '0 2px 6px rgba(239, 68, 68, 0.15)',
    shadowHover: '0 2px 12px rgba(239, 68, 68, 0.4)',
    tagBg: 'bg-red-500/15',
    tagText: 'text-red-400',
    ecoBadge: 'text-red-400',
  },
  positional: {
    border: 'rgba(59, 130, 246, 0.3)',
    borderHover: 'rgba(59, 130, 246, 0.7)',
    shadow: '0 2px 6px rgba(59, 130, 246, 0.15)',
    shadowHover: '0 2px 12px rgba(59, 130, 246, 0.4)',
    tagBg: 'bg-blue-500/15',
    tagText: 'text-blue-400',
    ecoBadge: 'text-blue-400',
  },
  dynamic: {
    border: 'rgba(168, 85, 247, 0.3)',
    borderHover: 'rgba(168, 85, 247, 0.7)',
    shadow: '0 2px 6px rgba(168, 85, 247, 0.15)',
    shadowHover: '0 2px 12px rgba(168, 85, 247, 0.4)',
    tagBg: 'bg-purple-500/15',
    tagText: 'text-purple-400',
    ecoBadge: 'text-purple-400',
  },
  solid: {
    border: 'rgba(34, 197, 94, 0.3)',
    borderHover: 'rgba(34, 197, 94, 0.7)',
    shadow: '0 2px 6px rgba(34, 197, 94, 0.15)',
    shadowHover: '0 2px 12px rgba(34, 197, 94, 0.4)',
    tagBg: 'bg-green-500/15',
    tagText: 'text-green-400',
    ecoBadge: 'text-green-400',
  },
  classical: {
    border: 'rgba(245, 158, 11, 0.3)',
    borderHover: 'rgba(245, 158, 11, 0.7)',
    shadow: '0 2px 6px rgba(245, 158, 11, 0.15)',
    shadowHover: '0 2px 12px rgba(245, 158, 11, 0.4)',
    tagBg: 'bg-amber-500/15',
    tagText: 'text-amber-400',
    ecoBadge: 'text-amber-400',
  },
  sharp: {
    border: 'rgba(249, 115, 22, 0.3)',
    borderHover: 'rgba(249, 115, 22, 0.7)',
    shadow: '0 2px 6px rgba(249, 115, 22, 0.15)',
    shadowHover: '0 2px 12px rgba(249, 115, 22, 0.4)',
    tagBg: 'bg-orange-500/15',
    tagText: 'text-orange-400',
    ecoBadge: 'text-orange-400',
  },
  gambit: {
    border: 'rgba(236, 72, 153, 0.3)',
    borderHover: 'rgba(236, 72, 153, 0.7)',
    shadow: '0 2px 6px rgba(236, 72, 153, 0.15)',
    shadowHover: '0 2px 12px rgba(236, 72, 153, 0.4)',
    tagBg: 'bg-pink-500/15',
    tagText: 'text-pink-400',
    ecoBadge: 'text-pink-400',
  },
  tactical: {
    border: 'rgba(6, 182, 212, 0.3)',
    borderHover: 'rgba(6, 182, 212, 0.7)',
    shadow: '0 2px 6px rgba(6, 182, 212, 0.15)',
    shadowHover: '0 2px 12px rgba(6, 182, 212, 0.4)',
    tagBg: 'bg-cyan-500/15',
    tagText: 'text-cyan-400',
    ecoBadge: 'text-cyan-400',
  },
  hypermodern: {
    border: 'rgba(99, 102, 241, 0.3)',
    borderHover: 'rgba(99, 102, 241, 0.7)',
    shadow: '0 2px 6px rgba(99, 102, 241, 0.15)',
    shadowHover: '0 2px 12px rgba(99, 102, 241, 0.4)',
    tagBg: 'bg-indigo-500/15',
    tagText: 'text-indigo-400',
    ecoBadge: 'text-indigo-400',
  },
  open: {
    border: 'rgba(56, 189, 248, 0.3)',
    borderHover: 'rgba(56, 189, 248, 0.7)',
    shadow: '0 2px 6px rgba(56, 189, 248, 0.15)',
    shadowHover: '0 2px 12px rgba(56, 189, 248, 0.4)',
    tagBg: 'bg-sky-500/15',
    tagText: 'text-sky-400',
    ecoBadge: 'text-sky-400',
  },
  romantic: {
    border: 'rgba(251, 113, 133, 0.3)',
    borderHover: 'rgba(251, 113, 133, 0.7)',
    shadow: '0 2px 6px rgba(251, 113, 133, 0.15)',
    shadowHover: '0 2px 12px rgba(251, 113, 133, 0.4)',
    tagBg: 'bg-rose-500/15',
    tagText: 'text-rose-400',
    ecoBadge: 'text-rose-400',
  },
  trappy: {
    border: 'rgba(132, 204, 22, 0.3)',
    borderHover: 'rgba(132, 204, 22, 0.7)',
    shadow: '0 2px 6px rgba(132, 204, 22, 0.15)',
    shadowHover: '0 2px 12px rgba(132, 204, 22, 0.4)',
    tagBg: 'bg-lime-500/15',
    tagText: 'text-lime-400',
    ecoBadge: 'text-lime-400',
  },
  provocative: {
    border: 'rgba(244, 114, 182, 0.3)',
    borderHover: 'rgba(244, 114, 182, 0.7)',
    shadow: '0 2px 6px rgba(244, 114, 182, 0.15)',
    shadowHover: '0 2px 12px rgba(244, 114, 182, 0.4)',
    tagBg: 'bg-pink-400/15',
    tagText: 'text-pink-300',
    ecoBadge: 'text-pink-300',
  },
  flexible: {
    border: 'rgba(45, 212, 191, 0.3)',
    borderHover: 'rgba(45, 212, 191, 0.7)',
    shadow: '0 2px 6px rgba(45, 212, 191, 0.15)',
    shadowHover: '0 2px 12px rgba(45, 212, 191, 0.4)',
    tagBg: 'bg-teal-500/15',
    tagText: 'text-teal-400',
    ecoBadge: 'text-teal-400',
  },
  sacrificial: {
    border: 'rgba(239, 68, 68, 0.3)',
    borderHover: 'rgba(239, 68, 68, 0.7)',
    shadow: '0 2px 6px rgba(239, 68, 68, 0.15)',
    shadowHover: '0 2px 12px rgba(239, 68, 68, 0.4)',
    tagBg: 'bg-red-500/15',
    tagText: 'text-red-400',
    ecoBadge: 'text-red-400',
  },
  active: {
    border: 'rgba(251, 191, 36, 0.3)',
    borderHover: 'rgba(251, 191, 36, 0.7)',
    shadow: '0 2px 6px rgba(251, 191, 36, 0.15)',
    shadowHover: '0 2px 12px rgba(251, 191, 36, 0.4)',
    tagBg: 'bg-yellow-500/15',
    tagText: 'text-yellow-400',
    ecoBadge: 'text-yellow-400',
  },
  universal: {
    border: 'rgba(139, 92, 246, 0.3)',
    borderHover: 'rgba(139, 92, 246, 0.7)',
    shadow: '0 2px 6px rgba(139, 92, 246, 0.15)',
    shadowHover: '0 2px 12px rgba(139, 92, 246, 0.4)',
    tagBg: 'bg-violet-500/15',
    tagText: 'text-violet-400',
    ecoBadge: 'text-violet-400',
  },
};

const DEFAULT_NEON: NeonColor = {
  border: 'rgba(45, 212, 191, 0.3)',
  borderHover: 'rgba(45, 212, 191, 0.7)',
  shadow: '0 2px 6px rgba(45, 212, 191, 0.15)',
  shadowHover: '0 2px 12px rgba(45, 212, 191, 0.4)',
  tagBg: 'bg-teal-500/15',
  tagText: 'text-teal-400',
  ecoBadge: 'text-teal-400',
};

function getNeonColor(style: string | undefined): NeonColor {
  if (!style) return DEFAULT_NEON;
  const primary = style.split(',')[0].trim().toLowerCase().replace(/-/g, '');
  // Also check for "ultra" prefix
  const normalized = primary.replace('ultra', '');
  return STYLE_COLORS[normalized] ?? DEFAULT_NEON;
}

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
        border: `1.5px solid ${neon.border}`,
        borderBottom: `2px solid ${neon.border}`,
        boxShadow: neon.shadow,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = `1.5px solid ${neon.borderHover}`;
        e.currentTarget.style.borderBottom = `2px solid ${neon.borderHover}`;
        e.currentTarget.style.boxShadow = neon.shadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = `1.5px solid ${neon.border}`;
        e.currentTarget.style.borderBottom = `2px solid ${neon.border}`;
        e.currentTarget.style.boxShadow = neon.shadow;
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
