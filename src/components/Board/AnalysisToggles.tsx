import { BarChart3, ListOrdered, Cloud } from 'lucide-react';

interface AnalysisTogglesProps {
  showEvalBar: boolean;
  onToggleEvalBar: () => void;
  showEngineLines: boolean;
  onToggleEngineLines: () => void;
  showLichessLines?: boolean;
  onToggleLichessLines?: () => void;
}

/**
 * Compact toggle buttons for eval bar and engine lines.
 * Designed for the header toolbar of play modes — fits on mobile.
 */
export function AnalysisToggles({
  showEvalBar,
  onToggleEvalBar,
  showEngineLines,
  onToggleEngineLines,
  showLichessLines,
  onToggleLichessLines,
}: AnalysisTogglesProps): JSX.Element {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border-2 border-cyan-500/30 p-0.5"
      style={{ boxShadow: '0 0 8px rgba(34, 211, 238, 0.2), 0 0 3px rgba(34, 211, 238, 0.1)' }}
      data-testid="analysis-toggles"
    >
      <button
        onClick={onToggleEvalBar}
        className={`p-1.5 rounded-md transition-colors ${
          showEvalBar
            ? 'bg-theme-accent text-white'
            : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-surface'
        }`}
        aria-label={showEvalBar ? 'Hide eval bar' : 'Show eval bar'}
        aria-pressed={showEvalBar}
        data-testid="toggle-eval-bar"
        title="Eval bar"
      >
        <BarChart3 size={16} />
      </button>
      <button
        onClick={onToggleEngineLines}
        className={`p-1.5 rounded-md transition-colors ${
          showEngineLines
            ? 'bg-theme-accent text-white'
            : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-surface'
        }`}
        aria-label={showEngineLines ? 'Hide engine lines' : 'Show engine lines'}
        aria-pressed={showEngineLines}
        data-testid="toggle-engine-lines"
        title="Best lines"
      >
        <ListOrdered size={16} />
      </button>
      {onToggleLichessLines !== undefined && (
        <button
          onClick={onToggleLichessLines}
          className={`p-1.5 rounded-md transition-colors ${
            showLichessLines
              ? 'bg-blue-500 text-white'
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-surface'
          }`}
          aria-label={showLichessLines ? 'Hide Lichess cloud eval' : 'Show Lichess cloud eval'}
          aria-pressed={showLichessLines ?? false}
          data-testid="toggle-lichess-lines"
          title="Lichess cloud eval"
        >
          <Cloud size={16} />
        </button>
      )}
    </div>
  );
}
