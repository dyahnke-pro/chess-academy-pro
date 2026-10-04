import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * TacticsPageHeader — the ONE header every Tactics sub-screen uses.
 *
 * Why: the hand walk of 2026-10-04 found four back-button styles (plain
 * arrow, boxed arrow, "← Back" text, an arrow indented by a wider page
 * padding) and three title styles (all-caps pink, small centred, bold left)
 * across screens that sit side by side in one tab. One component means a
 * new screen inherits the shape instead of inventing a fifth.
 *
 * Shape: plain ArrowLeft icon button → optional icon → bold left title →
 * optional right-hand slot (help, refresh, a select).
 */
interface TacticsPageHeaderProps {
  title: ReactNode;
  icon?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  /** Kept per screen — tests and audits select back buttons by testid. */
  backTestId?: string;
  backLabel?: string;
  className?: string;
}

export function TacticsPageHeader({
  title,
  icon,
  onBack,
  right,
  backTestId = 'back-btn',
  backLabel = 'Back to Tactics',
  className = '',
}: TacticsPageHeaderProps): JSX.Element {
  return (
    <div className={`flex items-center gap-3 w-full ${className}`} data-testid="tactics-page-header">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg hover:opacity-80 shrink-0"
          aria-label={backLabel}
          data-testid={backTestId}
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
      )}
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <h1 className="text-xl font-bold text-theme-text flex-1 min-w-0 truncate">{title}</h1>
      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </div>
  );
}
