/**
 * useClickToMove
 * --------------
 * Reusable click-to-move selection state for any board driven by
 * useEndgamePlayout. The student can either drag a piece OR tap
 * to select + tap to move — both routes flow through the same
 * playout.playMove API.
 *
 * State:
 *   - selectedSquare: which square the student tapped first
 *     (null when no piece is selected).
 *   - legalTargets: squares the selected piece can legally move to
 *     (chess.js-computed from the playout's current FEN).
 *   - squareStyles: highlighting (selected + dotted targets).
 *
 * Behavior:
 *   - Tap your piece → select it + show targets.
 *   - Tap a target square → playMove(from, to). Selection clears.
 *   - Tap the same selected piece again → cancel selection.
 *   - Tap a different friendly piece → re-select to that piece.
 *   - Tap an empty/opponent square with no legal target → cancel.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import type { CSSProperties } from 'react';
import type { SquareHandlerArgs } from 'react-chessboard';
import type { useEndgamePlayout } from './useEndgamePlayout';

interface ClickToMoveResult {
  selectedSquare: string | null;
  legalTargets: string[];
  squareStyles: Record<string, CSSProperties>;
  onSquareClick: (args: SquareHandlerArgs) => void;
}

/** Selection + click-to-move state derived from a playout. */
export function useClickToMove(
  playout: ReturnType<typeof useEndgamePlayout>,
): ClickToMoveResult {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Compute legal target squares for the selected piece. Recomputed
  // whenever selection or FEN changes.
  const legalTargets = useMemo<string[]>(() => {
    if (!selectedSquare) return [];
    try {
      const chess = new Chess(playout.fen);
      const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
      return moves.map((m) => m.to);
    } catch {
      return [];
    }
  }, [selectedSquare, playout.fen]);

  // Clear selection when the FEN changes underneath us (e.g., an
  // opponent reply auto-plays after we move). Otherwise a stale
  // selectedSquare persists into a position where the piece isn't
  // there any more.
  useEffect(() => {
    setSelectedSquare(null);
  }, [playout.fen]);

  const onSquareClick = useCallback(
    (args: SquareHandlerArgs) => {
      const square = args.square;
      if (!square) return;
      if (playout.phase !== 'student-to-move') return;
      // No piece currently selected — start a selection if the
      // tapped square has a friendly piece on it.
      if (!selectedSquare) {
        try {
          const chess = new Chess(playout.fen);
          const piece = chess.get(square as Square);
          if (!piece) return;
          const sideToMove = playout.fen.split(' ')[1];
          if (piece.color !== sideToMove) return;
          setSelectedSquare(square);
        } catch {
          /* swallow malformed FEN */
        }
        return;
      }
      // Tapping the already-selected square cancels selection.
      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }
      // Tapping a legal target — attempt the move.
      if (legalTargets.includes(square)) {
        playout.playMove(selectedSquare, square);
        setSelectedSquare(null);
        return;
      }
      // Tapping another friendly piece — re-select.
      try {
        const chess = new Chess(playout.fen);
        const piece = chess.get(square as Square);
        if (piece) {
          const sideToMove = playout.fen.split(' ')[1];
          if (piece.color === sideToMove) {
            setSelectedSquare(square);
            return;
          }
        }
      } catch {
        /* swallow */
      }
      // Tapped empty / opponent square — cancel.
      setSelectedSquare(null);
    },
    [selectedSquare, legalTargets, playout],
  );

  const squareStyles = useMemo<Record<string, CSSProperties>>(() => {
    const out: Record<string, CSSProperties> = {};
    if (selectedSquare) {
      out[selectedSquare] = {
        background: 'rgba(0, 229, 255, 0.35)',
        boxShadow: 'inset 0 0 0 2px rgba(0, 229, 255, 0.7)',
      };
    }
    for (const t of legalTargets) {
      out[t] = {
        ...(out[t] ?? {}),
        background:
          out[t]?.background ??
          'radial-gradient(circle, rgba(0, 229, 255, 0.5) 18%, transparent 22%)',
      };
    }
    return out;
  }, [selectedSquare, legalTargets]);

  return { selectedSquare, legalTargets, squareStyles, onSquareClick };
}
