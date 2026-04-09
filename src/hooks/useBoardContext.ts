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
 * Uses value-based comparison for lastMove and history to avoid infinite
 * re-render loops when callers pass fresh object/array references.
 *
 * Cleans up on unmount.
 */
export function useBoardContext(
  fen: string,
  pgn: string,
  moveNumber: number,
  playerColor: string,
  turn: string,
  lastMove?: LastMoveInfo | null,
  history?: string[],
): void {
  const setGlobalBoardContext = useAppStore((s) => s.setGlobalBoardContext);

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
    return () => setGlobalBoardContext(null);
  }, [fen, pgn, moveNumber, playerColor, turn, lastMoveKey, historyKey, setGlobalBoardContext]);
}
