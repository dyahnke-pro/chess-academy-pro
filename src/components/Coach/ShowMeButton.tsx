import { Eye } from 'lucide-react';

/**
 * ShowMeButton
 * ------------
 * Single-tap "reveal the answer" button used on the My Mistakes
 * puzzle surface. Unlike HintButton (which steps through 3 tiers
 * over multiple taps), this button INSTANTLY jumps to the full
 * answer reveal — arrow + voice on the best move.
 *
 * David's directive 2026-05-19: "we also need a show me button,
 * turn the hint button into that. have the coach give progressive
 * hints automatically after each failed attempt." — so the
 * progressive hint ladder moves to the wrong-move handler (which
 * already escalates: concept → piece → square on attempts 1/2/3+)
 * and the button is now an explicit "I give up, show me" reveal.
 */
interface ShowMeButtonProps {
  onShow: () => void;
  disabled?: boolean;
  revealed?: boolean;
}

export function ShowMeButton({ onShow, disabled, revealed }: ShowMeButtonProps): JSX.Element {
  const rgb = revealed ? '156, 163, 175' : '34, 211, 238';
  return (
    <button
      onClick={onShow}
      disabled={disabled || revealed}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 ${
        revealed ? 'text-theme-text-muted' : 'text-cyan-400'
      }`}
      style={{
        borderTop: `1px solid rgba(${rgb}, 0.1)`,
        borderRight: `1px solid rgba(${rgb}, 0.1)`,
        borderLeft: `2px solid rgba(${rgb}, 0.6)`,
        borderBottom: `2px solid rgba(${rgb}, 0.6)`,
        boxShadow: revealed
          ? 'none'
          : `0 0 6px rgba(${rgb}, 0.5), 0 0 14px rgba(${rgb}, 0.3), 0 0 24px rgba(${rgb}, 0.15)`,
      }}
      data-testid="show-me-button"
      data-revealed={revealed ? 'true' : 'false'}
    >
      <Eye size={16} />
      <span>{revealed ? 'Answer shown' : 'Show me'}</span>
    </button>
  );
}
