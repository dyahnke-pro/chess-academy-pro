import { pieceToUnicode } from '../../services/boardUtils';

interface PlayerInfoBarProps {
  name: string;
  rating: number;
  isBot?: boolean;
  capturedPieces: string[];
  materialAdvantage?: number;
  isActive: boolean;
  className?: string;
}

export function PlayerInfoBar({
  name,
  rating,
  capturedPieces,
  materialAdvantage = 0,
  className = '',
}: PlayerInfoBarProps): JSX.Element {
  return (
    <div
      className={`flex items-center justify-between px-2 py-0.5 text-xs ${className}`}
      data-testid="player-info-bar"
    >
      {/* Left: name + rating */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
          {name}
        </span>
        <span className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          ({rating})
        </span>
      </div>

      {/* Right: captured pieces + material advantage */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="tracking-tight" style={{ color: 'var(--color-text-muted)' }}>
          {capturedPieces.map((p, i) => (
            <span key={i}>{pieceToUnicode(p)}</span>
          ))}
        </span>
        {materialAdvantage > 0 && (
          <span className="font-medium ml-0.5" style={{ color: 'var(--color-text-muted)' }}>
            +{materialAdvantage}
          </span>
        )}
      </div>
    </div>
  );
}
