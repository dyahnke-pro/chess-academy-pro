import { useMemo } from 'react';
import { Trophy, Skull, Equal, Globe, Bot, Calendar } from 'lucide-react';
import type { GameRecord } from '../../types';
import { classifyGameStyle, summarizeMoveQuality } from '../../services/gameStyleClassifier';
import { getNeonColor, scaledShadow } from '../../utils/neonColors';
import { useSettings } from '../../hooks/useSettings';

interface ReviewGameCardProps {
  game: GameRecord;
  onClick: () => void;
  /** When true the card is rendered in muted style for unanalyzed
   *  games so the user can see them but knows the coach can't review
   *  them deeply yet. */
  unanalyzed?: boolean;
}

function formatRelativeDate(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso.slice(0, 10);
  const diff = Date.now() - t;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return new Date(iso).toLocaleDateString();
}

function sourceIcon(source: GameRecord['source']): JSX.Element {
  if (source === 'coach') return <Bot size={12} />;
  if (source === 'lichess') return <Globe size={12} />;
  if (source === 'chesscom') return <Globe size={12} />;
  return <Calendar size={12} />;
}

function sourceLabel(source: GameRecord['source']): string {
  if (source === 'coach') return 'vs Coach';
  if (source === 'lichess') return 'lichess';
  if (source === 'chesscom') return 'chess.com';
  if (source === 'master') return 'master';
  return 'imported';
}

export function ReviewGameCard({ game, onClick }: ReviewGameCardProps): JSX.Element {
  const { settings } = useSettings();
  const b = settings.glowBrightness;
  const s = b / 100;

  const styleResult = useMemo(() => classifyGameStyle(game), [game]);
  const quality = useMemo(
    () => (game.annotations ? summarizeMoveQuality(game.annotations) : null),
    [game.annotations],
  );
  const neon = getNeonColor(styleResult.style === 'unanalyzed' ? undefined : styleResult.style);

  const shadow = scaledShadow(neon.rgb, b);
  const shadowHov = scaledShadow(neon.rgb, Math.min(200, b * 1.4));
  const borderAccent = `rgba(${neon.rgb}, ${Math.min(1, 0.6 * s)})`;
  const borderAccentHov = `rgba(${neon.rgb}, ${Math.min(1, 0.85 * s)})`;
  const borderSubtle = `rgba(${neon.rgb}, ${Math.min(1, 0.1 * s)})`;
  const borderSubtleHov = `rgba(${neon.rgb}, ${Math.min(1, 0.2 * s)})`;

  const opponentLabel =
    game.source === 'coach' ? 'Coach' : pickOpponent(game);
  const result = game.result;
  const youWon = didYouWin(game);

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
      className="w-full text-left bg-theme-surface rounded-xl p-3.5 transition-all duration-200 group relative cursor-pointer"
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
      data-testid={`review-game-card-${game.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Result icon */}
        <div className={`shrink-0 w-9 h-9 rounded-lg ${neon.tagBg} flex items-center justify-center`}>
          {youWon === true && <Trophy size={18} className={neon.tagText} />}
          {youWon === false && <Skull size={18} className="text-red-400" />}
          {youWon === null && <Equal size={18} className={neon.tagText} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-theme-text truncate">
              vs {opponentLabel}
            </span>
            <span className={`text-[11px] font-mono ${neon.ecoBadge}`}>{result}</span>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            {/* Style badge */}
            {styleResult.style !== 'unanalyzed' && (
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${neon.tagBg} ${neon.tagText}`}
                title={styleResult.reason}
              >
                {styleResult.style}
              </span>
            )}
            {styleResult.style === 'unanalyzed' && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-theme-border/30 text-theme-text-muted">
                not yet analyzed
              </span>
            )}
            {game.eco && (
              <span className="text-[10px] font-mono text-theme-text-muted">
                {game.eco}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-theme-text-muted">
            <span className="flex items-center gap-1">
              {sourceIcon(game.source)}
              {sourceLabel(game.source)}
            </span>
            <span>{formatRelativeDate(game.date)}</span>
            {quality && (quality.blunders > 0 || quality.mistakes > 0) && (
              <span>
                {quality.blunders} ?? · {quality.mistakes} ?
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function pickOpponent(game: GameRecord): string {
  // If we know the user's name we'd subtract it; for now show the
  // pair so the card is informative even when "you" is ambiguous.
  if (game.white && game.black) return `${game.white} – ${game.black}`;
  return game.white || game.black || 'Unknown';
}

function didYouWin(game: GameRecord): boolean | null {
  // Best-effort: coach games store the user as one side; for imports
  // we don't know without a username preference. Return null when
  // ambiguous so the result icon is the neutral "draw" glyph.
  if (game.result === '1/2-1/2') return null;
  if (game.source === 'coach') {
    // Coach games: the player is white if `game.white` is the user
    // alias (we don't have it here for sure). Fall back to color
    // inference from typical schema.
    if (game.result === '1-0') return true;
    if (game.result === '0-1') return false;
  }
  return null;
}
