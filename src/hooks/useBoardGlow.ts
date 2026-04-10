import { useMemo } from 'react';
import { useSettings } from './useSettings';

interface BoardGlowResult {
  /** Base inset glow for any square (same color/brightness for all squares). */
  baseGlow: string;
  /** Merge base glow + additional boxShadow strings. Filters out empty values. */
  mergeGlow: (...shadows: (string | undefined)[]) => string;
  /** The glow scale factor (0–2, where 1 = default). */
  glowScale: number;
  /** The rgb string of the board glow color. */
  boardGlowRgb: string;
}

export function useBoardGlow(): BoardGlowResult {
  const { settings } = useSettings();
  const boardGlowRgb = settings.boardGlowColor;
  const glowScale = settings.glowBrightness / 100;

  const baseGlow = useMemo((): string => {
    if (glowScale <= 0 || boardGlowRgb === 'none') return '';
    const o1 = Math.min(1, 0.2 * glowScale);
    const o2 = Math.min(1, 0.12 * glowScale);
    const o3 = Math.min(1, 0.08 * glowScale);
    const o4 = Math.min(1, 0.06 * glowScale);
    const r = Math.round;
    return [
      `inset 0 0 ${r(6 * glowScale)}px rgba(${boardGlowRgb}, ${o1})`,
      `inset 0 0 ${r(2 * glowScale)}px rgba(${boardGlowRgb}, ${o2})`,
      `inset ${r(1 * glowScale)}px ${r(1 * glowScale)}px ${r(3 * glowScale)}px rgba(0,0,0, ${o3})`,
      `inset ${r(-1 * glowScale)}px ${r(-1 * glowScale)}px ${r(2 * glowScale)}px rgba(${boardGlowRgb}, ${o4})`,
    ].join(', ');
  }, [boardGlowRgb, glowScale]);

  const mergeGlow = useMemo(() => {
    return (...shadows: (string | undefined)[]): string => {
      return [baseGlow, ...shadows].filter(Boolean).join(', ');
    };
  }, [baseGlow]);

  return { baseGlow, mergeGlow, glowScale, boardGlowRgb };
}

/**
 * Generate a full set of square styles with neon glow applied to every square.
 * Returns a Record<string, CSSProperties> keyed by square name (e.g. 'a1').
 */
export function buildGlowSquareStyles(baseGlow: string): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = {};
  if (!baseGlow) return styles;
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8];
  for (const file of files) {
    for (const rank of ranks) {
      styles[`${file}${rank}`] = { boxShadow: baseGlow };
    }
  }
  return styles;
}
