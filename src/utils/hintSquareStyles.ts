import type { CSSProperties } from 'react';

/** The revealed-hint highlight for a playout board — the one colour language
 *  (amber from + to) every hint button shares. Empty until revealed. */
export function hintSquareStyles(
  hintMove: { from: string; to: string } | null,
  revealed: boolean,
): Record<string, CSSProperties> {
  if (!revealed || !hintMove) return {};
  return {
    [hintMove.from]: { background: 'rgba(251, 191, 36, 0.55)', boxShadow: 'inset 0 0 0 2px rgba(251, 191, 36, 0.9)' },
    [hintMove.to]: { background: 'rgba(251, 191, 36, 0.35)', boxShadow: 'inset 0 0 0 2px rgba(251, 191, 36, 0.7)' },
  };
}
