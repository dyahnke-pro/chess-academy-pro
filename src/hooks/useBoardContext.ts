import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

/**
 * Publishes the current board state to Zustand so the global coach drawer
 * can include position context when chatting with Claude.
 * Cleans up on unmount.
 */
export function useBoardContext(
  fen: string,
  pgn: string,
  moveNumber: number,
  playerColor: string,
  turn: string,
): void {
  const setGlobalBoardContext = useAppStore((s) => s.setGlobalBoardContext);

  useEffect(() => {
    setGlobalBoardContext({ fen, pgn, moveNumber, playerColor, turn });
    return () => setGlobalBoardContext(null);
  }, [fen, pgn, moveNumber, playerColor, turn, setGlobalBoardContext]);
}
