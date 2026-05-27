import { Bot, User } from 'lucide-react';
import { pieceToUnicode } from '../../services/boardUtils';
import { formatClock } from '../../services/chessClock';

interface PlayerInfoBarProps {
  name: string;
  rating?: number;
  isBot?: boolean;
  capturedPieces: string[];
  materialAdvantage?: number;
  isActive: boolean;
  className?: string;
  /** Remaining clock time in ms. When undefined, no clock is shown (unlimited). */
  clockMs?: number;
}

export function PlayerInfoBar({
  name,
  rating,
  isBot = false,
  capturedPieces,
  materialAdvantage = 0,
  isActive,
  className = '',
  clockMs,
}: PlayerInfoBarProps): JSX.Element {
  const showClock = clockMs !== undefined;
  const urgent = showClock && clockMs <= 20_000;
  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${className}`}
      style={{
        background: isActive ? 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))' : 'var(--color-surface)',
        borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
      }}
      data-testid="player-info-bar"
    >
      {/* Left: avatar + name + rating */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-border)' }}
        >
          {isBot
            ? <Bot size={14} style={{ color: 'var(--color-text-muted)' }} />
            : <User size={14} style={{ color: 'var(--color-text-muted)' }} />}
        </div>
        <span className="font-medium truncate" style={{ color: 'var(--color-text)' }}>
          {name}
        </span>
        {rating !== undefined && (
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
            ({rating})
          </span>
        )}
      </div>

      {/* Right: captured pieces + material advantage + clock */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-xs tracking-tight" style={{ color: 'var(--color-text-muted)' }}>
            {capturedPieces.map((p, i) => (
              <span key={i}>{pieceToUnicode(p)}</span>
            ))}
          </span>
          {materialAdvantage > 0 && (
            <span className="text-xs font-medium ml-0.5" style={{ color: 'var(--color-text-muted)' }}>
              +{materialAdvantage}
            </span>
          )}
        </div>
        {showClock && (
          <span
            className="font-mono text-sm font-semibold tabular-nums px-2 py-0.5 rounded"
            data-testid="player-clock"
            style={{
              background: isActive ? 'color-mix(in srgb, var(--color-accent) 18%, var(--color-surface))' : 'var(--color-border)',
              color: urgent ? 'var(--color-danger, #e5484d)' : 'var(--color-text)',
              opacity: isActive ? 1 : 0.6,
            }}
          >
            {formatClock(clockMs)}
          </span>
        )}
      </div>
    </div>
  );
}
