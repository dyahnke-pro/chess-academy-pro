// Single source of truth for board appearance.
// Every board in the app must derive its colors, piece set, glow, animations,
// and border from this hook so the look stays identical across screens.

import { useMemo } from 'react';
import { useSettings } from './useSettings';
import { useBoardGlow } from './useBoardGlow';
import { getBoardColor, type BoardColorScheme } from '../services/boardColorService';
import { buildPieceRenderer } from '../services/pieceSetService';
import { buildPieceGlowFilter } from '../utils/neonColors';

/** Standard animation duration (ms) for piece movement. */
export const BOARD_ANIMATION_MS = 200;
/** Standard animation duration for demonstration boards (slightly longer for clarity). */
export const BOARD_DEMO_ANIMATION_MS = 400;

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
