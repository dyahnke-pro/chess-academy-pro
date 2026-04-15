import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';

interface LastMoveInfo {
  from: string;
  to: string;
  san: string;
}

/**
 * Publishes the current board state to Zustand so the global coach drawer
 * can include position context when chatting with Claude.
 *
 * Two writes per update:
 *   1. `globalBoardContext` — rich live context, cleared on unmount.
 *      Used by the inline coach drawer while a board screen is visible.
 *   2. `lastBoardSnapshot` — persistent "last position I looked at",
 *      NOT cleared on unmount. Lets the coach chat's explain-position
 *      flow reach for the position after the user has navigated away.
 *      Pass `source` (and optionally `label`) to tag where it came from.
 *
 * Uses value-based comparison for lastMove and history to avoid infinite
 * re-render loops when callers pass fresh object/array references.
 */
export function useBoardContext(
  fen: string,
  pgn: string,
  moveNumber: number,
  playerColor: string,
  turn: string,
  lastMove?: LastMoveInfo | null,
  history?: string[],
  source: string = 'board',
  label?: string,
): void {
  const setGlobalBoardContext = useAppStore((s) => s.setGlobalBoardContext);
  const setLastBoardSnapshot = useAppStore((s) => s.setLastBoardSnapshot);

  // Stabilize lastMove and history by value so the effect only fires when
  // they actually change, not when a new reference is created.
  const lastMoveKey = lastMove ? `${lastMove.from}${lastMove.to}${lastMove.san}` : '';
  const historyKey = history ? history.join(',') : '';
  const lastMoveRef = useRef(lastMove);
  const historyRef = useRef(history);

  if (lastMoveKey !== (lastMoveRef.current ? `${lastMoveRef.current.from}${lastMoveRef.current.to}${lastMoveRef.current.san}` : '')) {
    lastMoveRef.current = lastMove;
  }
  if (historyKey !== (historyRef.current ? historyRef.current.join(',') : '')) {
    historyRef.current = history;
  }

  useEffect(() => {
    setGlobalBoardContext({
      fen,
      pgn,
      moveNumber,
      playerColor,
      turn,
      lastMove: lastMoveRef.current ?? null,
      history: historyRef.current ?? [],
      timestamp: Date.now(),
    });
    // Mirror into the persistent snapshot. We deliberately do NOT clear
    // this on unmount so that "explain this position" still works after
    // the user leaves the board for the coach chat.
    setLastBoardSnapshot({ fen, source, label });
    return () => setGlobalBoardContext(null);
  }, [fen, pgn, moveNumber, playerColor, turn, lastMoveKey, historyKey, source, label, setGlobalBoardContext, setLastBoardSnapshot]);
}
