// Single source of truth for board appearance.
// Every board in the app must derive its colors, piece set, glow, animations,
// and border from this hook so the look stays identical across screens.

import { useEffect, useMemo } from 'react';
import { useSettings } from './useSettings';
import { useBoardGlow } from './useBoardGlow';
import { getBoardColor, type BoardColorScheme } from '../services/boardColorService';
import { buildPieceRenderer, preloadPieceSet } from '../services/pieceSetService';
import { buildPieceGlowFilter } from '../utils/neonColors';

/** Standard animation duration (ms) for piece movement. */
export const BOARD_ANIMATION_MS = 200;
/** Standard animation duration for demonstration boards (slightly longer for clarity). */
export const BOARD_DEMO_ANIMATION_MS = 400;

/** Centralized arrow styling for react-chessboard's `arrowOptions`
 *  prop. The library defaults to `arrowWidthDenominator: 5` (arrow
 *  width = squareWidth / 5) — too skinny on the lesson surfaces
 *  where coach-drawn arrows are the focal point. David's audit
 *  2026-05-19 (Bug G) called out /coach/teach specifically; bumping
 *  the width to squareWidth / 3.5 here lifts every board's arrows
 *  to the same thickness so the visual signature is consistent
 *  app-wide. Colors stay overridable per-arrow via the LLM's
 *  `[BOARD: arrow:from-to:color]` markers — only the default + the
 *  width/opacity defaults are pinned here. */
export const BOARD_ARROW_OPTIONS = {
  /** Default color when an arrow doesn't specify one. The LLM almost
   *  always specifies; this is the fallback. */
  color: '#ffaa00',
  secondaryColor: '#0088ff',
  tertiaryColor: '#9933cc',
  /** Lower denominator = thicker arrow. 5 (library default) was the
   *  pre-fix skinny one; 3.5 is the new default — readable from
   *  across the room without overwhelming the pieces. */
  arrowWidthDenominator: 3.5,
  arrowLengthReducerDenominator: 8,
  sameTargetArrowLengthReducerDenominator: 4,
  activeArrowWidthMultiplier: 1.2,
  /** Opaque enough to read on every square color, transparent enough
   *  to see the pieces beneath when an arrow crosses one. */
  opacity: 0.9,
  activeOpacity: 1,
  arrowStartOffset: 0.2,
};

export interface BoardTheme {
  scheme: BoardColorScheme;
  darkSquareStyle: { backgroundColor: string };
  lightSquareStyle: { backgroundColor: string };
  /** Custom piece renderer compatible with react-chessboard's `pieces` option. */
  customPieces: ReturnType<typeof buildPieceRenderer>;
  /** Inline style for the board's outer wrapper — applies the theme border glow. */
  borderWrapperStyle: React.CSSProperties | undefined;
  /** Base inset glow shared by every square. */
  baseGlow: string;
  /** Merge base glow with extra box-shadows. */
  mergeGlow: (...shadows: (string | undefined)[]) => string;
}

/**
 * Returns the canonical board theme derived from user settings.
 * Use this everywhere a `<Chessboard>` is rendered so all boards match.
 */
export function useBoardTheme(): BoardTheme {
  const { settings } = useSettings();
  const { baseGlow, mergeGlow } = useBoardGlow();

  const scheme = useMemo(() => getBoardColor(settings.boardColor), [settings.boardColor]);

  const pieceFilters = useMemo(
    () => ({
      whitePieceFilter:
        buildPieceGlowFilter(settings.whitePieceGlowColor, settings.glowBrightness) ||
        scheme.whitePieceFilter,
      blackPieceFilter:
        buildPieceGlowFilter(settings.blackPieceGlowColor, settings.glowBrightness) ||
        scheme.blackPieceFilter,
    }),
    [
      settings.whitePieceGlowColor,
      settings.blackPieceGlowColor,
      settings.glowBrightness,
      scheme,
    ],
  );

  const customPieces = useMemo(
    () => buildPieceRenderer(settings.pieceSet, pieceFilters),
    [settings.pieceSet, pieceFilters],
  );

  // Warm the browser cache with every piece SVG for the active set
  // the moment any board mounts (or the set changes). Without this
  // the first board render can race the CDN cold-start and show the
  // alt-text fallback ("bR" / "wP" text labels in place of pieces)
  // until the user closes + reopens the app. Audit (2026-05-18,
  // David's report): the alt-text bug is intermittent and per-set;
  // preloading eliminates the race for the active set. Idempotent —
  // `preloadPieceSet` no-ops on the second call for the same set.
  useEffect(() => {
    preloadPieceSet(settings.pieceSet);
  }, [settings.pieceSet]);

  const darkSquareStyle = useMemo(
    () => ({ backgroundColor: scheme.darkSquare }),
    [scheme.darkSquare],
  );
  const lightSquareStyle = useMemo(
    () => ({ backgroundColor: scheme.lightSquare }),
    [scheme.lightSquare],
  );

  const borderWrapperStyle = useMemo(
    (): React.CSSProperties | undefined =>
      scheme.borderGlow
        ? {
            boxShadow: `${scheme.borderGlow}, inset 0 0 40px 8px rgba(0, 229, 255, 0.06)`,
            borderRadius: '4px',
            border: '1px solid rgba(0, 229, 255, 0.15)',
          }
        : undefined,
    [scheme.borderGlow],
  );

  return {
    scheme,
    darkSquareStyle,
    lightSquareStyle,
    customPieces,
    borderWrapperStyle,
    baseGlow,
    mergeGlow,
  };
}
