import type { ProPlayer } from '../../types';
import { getNeonColor } from '../../utils/neonColors';

interface ProPlayerCardProps {
  player: ProPlayer;
  openingCount: number;
  onClick: () => void;
}

export function ProPlayerCard({ player, openingCount, onClick }: ProPlayerCardProps): JSX.Element {
  const neon = getNeonColor(player.style);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full text-left bg-theme-surface rounded-xl p-4 transition-all duration-200 cursor-pointer"
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
      data-testid={`pro-player-card-${player.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Initials avatar */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${neon.tagBg}`}
          style={{ border: `1.5px solid ${neon.border}` }}
        >
          <span className={`text-sm font-bold ${neon.ecoBadge}`}>{player.imageInitials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-theme-text truncate">{player.name}</span>
            <span className={`text-xs font-mono font-semibold ${neon.ecoBadge}`}>{player.title}</span>
            <span className="text-xs text-theme-text-muted">{player.rating}</span>
          </div>

          {player.style && (
            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${neon.tagBg} ${neon.tagText}`}>
              {player.style}
            </span>
          )}

          <p className="text-xs text-theme-text-muted mt-1 line-clamp-1">{player.description}</p>

          <p className="text-[11px] text-theme-text-muted mt-1">{openingCount} openings</p>
        </div>
      </div>
    </div>
  );
}
