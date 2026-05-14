/**
 * Heatmap color scales — kept separate from HeatmapGrid.tsx so the
 * component file exports React components only (Vite Fast Refresh
 * requirement). Each function maps a numeric value (or null) to a
 * CSS color string the grid renders into its cells.
 */

/** Standard win-rate color scale: red → amber → green. 0-100 input. */
export function winRateColor(v: number | null): string {
  if (v === null) return 'color-mix(in srgb, var(--color-border) 40%, transparent)';
  if (v >= 60) return 'rgba(34, 197, 94, 0.55)';     // green-500
  if (v >= 50) return 'rgba(132, 204, 22, 0.55)';    // lime-500
  if (v >= 40) return 'rgba(245, 158, 11, 0.55)';    // amber-500
  if (v >= 30) return 'rgba(249, 115, 22, 0.55)';    // orange-500
  return 'rgba(239, 68, 68, 0.55)';                  // red-500
}

/** Accuracy color scale (0-100). Tighter than win-rate — "good
 *  accuracy" floors higher than "good win rate". */
export function accuracyColor(v: number | null): string {
  if (v === null) return 'color-mix(in srgb, var(--color-border) 40%, transparent)';
  if (v >= 85) return 'rgba(34, 197, 94, 0.6)';
  if (v >= 75) return 'rgba(132, 204, 22, 0.55)';
  if (v >= 65) return 'rgba(245, 158, 11, 0.55)';
  if (v >= 55) return 'rgba(249, 115, 22, 0.55)';
  return 'rgba(239, 68, 68, 0.55)';
}

/** Gap color scale for transfer-gap data. Positive (good-at-puzzles,
 *  weak-at-games) = warm; negative (board-sense > pattern-knowledge)
 *  = cool. */
export function gapColor(v: number | null): string {
  if (v === null) return 'color-mix(in srgb, var(--color-border) 40%, transparent)';
  if (v >= 30) return 'rgba(239, 68, 68, 0.55)';
  if (v >= 10) return 'rgba(249, 115, 22, 0.55)';
  if (v >= -10) return 'rgba(132, 204, 22, 0.45)';
  return 'rgba(34, 197, 94, 0.55)';
}
