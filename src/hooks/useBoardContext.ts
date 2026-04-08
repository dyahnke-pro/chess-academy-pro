import { useEffect } from 'react';
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
 * Includes lastMove, full SAN history, and a timestamp so consumers can
 * detect stale data.  The new parameters are optional for backward
 * compatibility — callers that don't have the data yet can omit them.
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

  useEffect(() => {
    setGlobalBoardContext({
      fen,
      pgn,
      moveNumber,
      playerColor,
      turn,
      lastMove: lastMove ?? null,
      history: history ?? [],
      timestamp: Date.now(),
    });
    return () => setGlobalBoardContext(null);
  }, [fen, pgn, moveNumber, playerColor, turn, lastMove, history, setGlobalBoardContext]);
}
