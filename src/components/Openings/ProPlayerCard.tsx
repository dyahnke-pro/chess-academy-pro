import type { ProPlayer } from '../../types';
import { getNeonColor, scaledShadow } from '../../utils/neonColors';
import { useSettings } from '../../hooks/useSettings';

interface ProPlayerCardProps {
  player: ProPlayer;
  openingCount: number;
  onClick: () => void;
}

export function ProPlayerCard({ player, openingCount, onClick }: ProPlayerCardProps): JSX.Element {
  const neon = getNeonColor(player.style);
  const { settings } = useSettings();
  const b = settings.glowBrightness;
  const s = b / 100;

  const shadow = scaledShadow(neon.rgb, b);
  const shadowHov = scaledShadow(neon.rgb, Math.min(200, b * 1.4));
  const borderAccent = `rgba(${neon.rgb}, ${Math.min(1, 0.6 * s)})`;
  const borderAccentHov = `rgba(${neon.rgb}, ${Math.min(1, 0.85 * s)})`;
  const borderSubtle = `rgba(${neon.rgb}, ${Math.min(1, 0.1 * s)})`;
  const borderSubtleHov = `rgba(${neon.rgb}, ${Math.min(1, 0.2 * s)})`;

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
        borderTop: `1px solid ${borderSubtle}`,
        borderRight: `1px solid ${borderSubtle}`,
        borderLeft: `2px solid ${borderAccent}`,
        borderBottom: `2px solid ${borderAccent}`,
        boxShadow: shadow,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderTop = `1px solid ${borderSubtleHov}`;
        el.style.borderRight = `1px solid ${borderSubtleHov}`;
        el.style.borderLeft = `2px solid ${borderAccentHov}`;
        el.style.borderBottom = `2px solid ${borderAccentHov}`;
        el.style.boxShadow = shadowHov;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderTop = `1px solid ${borderSubtle}`;
        el.style.borderRight = `1px solid ${borderSubtle}`;
        el.style.borderLeft = `2px solid ${borderAccent}`;
        el.style.borderBottom = `2px solid ${borderAccent}`;
        el.style.boxShadow = shadow;
      }}
      data-testid={`pro-player-card-${player.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Initials avatar */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${neon.tagBg}`}
          style={{ border: `1.5px solid ${borderAccent}` }}
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
