import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

export interface MoveResult {
  from: string;
  to: string;
  san: string;
  fen: string;
  promotion?: string;
}

export interface UseChessGameReturn {
  // Position state
  fen: string;
  position: string;            // alias for fen (WO-02 spec)
  turn: 'w' | 'b';

  // Check / game-over state
  inCheck: boolean;
  isCheck: boolean;            // alias for inCheck (WO-02 spec)
  checkSquare: string | null;
  isGameOver: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;

  // Move history
  lastMove: { from: string; to: string } | null;
  history: string[];

  // Board interaction state (WO-02 spec)
  selectedSquare: string | null;
  legalMoves: string[];        // legal destination squares for selectedSquare
  boardOrientation: 'white' | 'black';

  // Core move execution
  makeMove: (from: string, to: string, promotion?: string) => MoveResult | null;

  // High-level board interaction handlers (WO-02 spec)
  onDrop: (sourceSquare: string, targetSquare: string) => MoveResult | null;
  onSquareClick: (square: string) => MoveResult | null;
  flipBoard: () => void;
  undoMove: () => void;
  resetGame: (fen?: string) => void;
  clearSelection: () => void;

  // Utilities
  getLegalMoves: (square: string) => string[];
  getPiece: (square: string) => { type: string; color: string } | null;
  reset: (fen?: string) => void;  // backward-compat alias for resetGame
  loadFen: (fen: string) => boolean;
}

function findKingInCheck(chess: Chess): string | null {
  if (!chess.inCheck()) return null;
  const board = chess.board();
  const turn = chess.turn();
  for (const row of board) {
    for (const piece of row) {
      if (piece?.type === 'k' && piece.color === turn) {
        return piece.square;
      }
    }
  }
  return null;
}

export function useChessGame(
  initialFen?: string,
  initialOrientation: 'white' | 'black' = 'white',
): UseChessGameReturn {
  const chessRef = useRef<Chess>(initialFen ? new Chess(initialFen) : new Chess());
  const [fen, setFen] = useState<string>(() => chessRef.current.fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(initialOrientation);

  // Derived state — computed directly from chess instance each render.
  const chess = chessRef.current;
  const turn = chess.turn() as 'w' | 'b';
  const inCheck = chess.inCheck();
  const isCheckmate = chess.isCheckmate();
  const isStalemate = chess.isStalemate();
  const isDraw = chess.isDraw();
  const isGameOver = chess.isGameOver();
  const history = chess.history();
  const checkSquare = findKingInCheck(chess);

  // ─── Core execution ─────────────────────────────────────────────────────────

  const executeMove = useCallback((
    from: string,
    to: string,
    promotion?: string,
  ): MoveResult | null => {
    try {
      const result = chessRef.current.move({
        from: from as Square,
        to: to as Square,
        promotion,
      });
      const newFen = chessRef.current.fen();
      setFen(newFen);
      setLastMove({ from: result.from, to: result.to });
      return {
        from: result.from,
        to: result.to,
        san: result.san,
        fen: newFen,
        promotion: result.promotion,
      };
    } catch {
      return null;
    }
  }, []);

  // Public alias kept for backward compatibility
  const makeMove = executeMove;

  // ─── Selection helpers ───────────────────────────────────────────────────────

  const clearSelection = useCallback((): void => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const selectSquare = useCallback((square: string): void => {
    const moves = chessRef.current.moves({ square: square as Square, verbose: true });
    const destinations = [...new Set(moves.map((m) => m.to))];
    if (destinations.length > 0) {
      setSelectedSquare(square);
      setLegalMoves(destinations);
    } else {
      clearSelection();
    }
  }, [clearSelection]);

  // ─── High-level board interaction handlers ───────────────────────────────────

  const onDrop = useCallback((
    sourceSquare: string,
    targetSquare: string,
  ): MoveResult | null => {
    const piece = chessRef.current.get(sourceSquare as Square);
    const isPromotion =
      piece?.type === 'p' &&
      ((piece.color === 'w' && targetSquare[1] === '8') ||
        (piece.color === 'b' && targetSquare[1] === '1'));

    const result = executeMove(sourceSquare, targetSquare, isPromotion ? 'q' : undefined);
    clearSelection();
    return result;
  }, [executeMove, clearSelection]);

  const onSquareClick = useCallback((square: string): MoveResult | null => {
    // Clicking the already-selected square deselects it
    if (selectedSquare === square) {
      clearSelection();
      return null;
    }

    // If a legal move destination is clicked, execute the move
    if (selectedSquare !== null && legalMoves.includes(square)) {
      const piece = chessRef.current.get(selectedSquare as Square);
      const isPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && square[1] === '8') ||
          (piece.color === 'b' && square[1] === '1'));

      const result = executeMove(selectedSquare, square, isPromotion ? 'q' : undefined);
      clearSelection();
      return result;
    }

    // Otherwise try to select the clicked square
    selectSquare(square);
    return null;
  }, [selectedSquare, legalMoves, clearSelection, selectSquare, executeMove]);

  const flipBoard = useCallback((): void => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  }, []);

  const undoMove = useCallback((): void => {
    const undone = chessRef.current.undo();
    if (undone) {
      const newFen = chessRef.current.fen();
      setFen(newFen);
      // Restore lastMove from the preceding move in history
      const verboseHistory = chessRef.current.history({ verbose: true });
      if (verboseHistory.length > 0) {
        const prev = verboseHistory[verboseHistory.length - 1];
        setLastMove({ from: prev.from, to: prev.to });
      } else {
        setLastMove(null);
      }
      clearSelection();
    }
  }, [clearSelection]);

  const resetGame = useCallback((resetFen?: string): void => {
    chessRef.current = resetFen ? new Chess(resetFen) : new Chess();
    setFen(chessRef.current.fen());
    setLastMove(null);
    clearSelection();
  }, [clearSelection]);

  // Backward-compat alias
  const reset = resetGame;

  // ─── Utilities ───────────────────────────────────────────────────────────────

  const getLegalMoves = useCallback((square: string): string[] => {
    const moves = chessRef.current.moves({
      square: square as Square,
      verbose: true,
    });
    return [...new Set(moves.map((m) => m.to))];
  }, []);

  const getPiece = useCallback((square: string): { type: string; color: string } | null => {
    const piece = chessRef.current.get(square as Square);
    return piece || null;
  }, []);

  const loadFen = useCallback((fenString: string): boolean => {
    try {
      const newChess = new Chess(fenString);
      chessRef.current = newChess;
      setFen(newChess.fen());
      setLastMove(null);
      clearSelection();
      return true;
    } catch {
      return false;
    }
  }, [clearSelection]);

  return {
    fen,
    position: fen,
    turn,
    inCheck,
    isCheck: inCheck,
    checkSquare,
    isGameOver,
    isCheckmate,
    isStalemate,
    isDraw,
    lastMove,
    history,
    selectedSquare,
    legalMoves,
    boardOrientation,
    makeMove,
    onDrop,
    onSquareClick,
    flipBoard,
    undoMove,
    resetGame,
    clearSelection,
    getLegalMoves,
    getPiece,
    reset,
    loadFen,
  };
}
