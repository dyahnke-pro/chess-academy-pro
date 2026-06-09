import { useState, useCallback, useRef, useEffect, useMemo, type DependencyList } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';

/** useMemo that compares array contents by value, not reference. */
function useStableArray<T>(factory: () => T[], deps: DependencyList): T[] {
  const ref = useRef<T[]>(factory());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const next = useMemo(factory, deps);
  if (next.length !== ref.current.length || next.some((v, i) => v !== ref.current[i])) {
    ref.current = next;
  }
  return ref.current;
}

export interface MoveResult {
  from: string;
  to: string;
  san: string;
  fen: string;
  pgn: string;
  history: string[];
  moveNumber: number;
  turn: 'w' | 'b';
  promotion?: string;
}

export interface UseChessGameReturn {
  // Position state
  fen: string;
  position: string;            // alias for fen (WO-02 spec)
  /**
   * Live FEN read straight off the underlying chess.js instance.
   * `fen`/`position` are React state SNAPSHOTS that lag the true board by
   * a render — any consumer that needs the CURRENT position at call-time
   * (e.g. building the coach's liveState the instant the student hits send,
   * right after a set_board / move) MUST read this, not the snapshot, or it
   * reasons about the prior position (the 2026-06-05 stale-fen coach bug).
   */
  getFen: () => string;
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
  /** Set board orientation to a specific value (for ControlledChessBoard consumers). */
  setOrientation: (orientation: 'white' | 'black') => void;
  undoMove: () => void;
  resetGame: (fen?: string) => void;
  clearSelection: () => void;

  // Utilities
  getLegalMoves: (square: string) => string[];
  getPiece: (square: string) => { type: string; color: string } | null;
  reset: (fen?: string) => void;  // backward-compat alias for resetGame
  loadFen: (fen: string) => boolean;
  /** Replay a SAN list into a fresh game, lighting the last move.
   *  Used to RESUME a saved coach game without ghost squares. */
  loadHistory: (sans: string[]) => boolean;
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
  computerColor?: 'w' | 'b',
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
  // Stabilize history by value (chess.history() returns a new array every call,
  // which would bust useMemo caches and cause infinite re-render loops).
  const history = useStableArray(() => chess.history(), [fen]);
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
      if (newFen !== chessRef.current.fen()) {
        console.error('[useChessGame] FEN desync detected after move');
      }
      setFen(newFen);
      setLastMove({ from: result.from, to: result.to });
      const hist = chessRef.current.history();
      return {
        from: result.from,
        to: result.to,
        san: result.san,
        fen: newFen,
        pgn: chessRef.current.pgn(),
        history: hist,
        moveNumber: Math.floor((hist.length - 1) / 2) + 1,
        turn: chessRef.current.turn() as 'w' | 'b',
        promotion: result.promotion,
      };
    } catch {
      return null;
    }
  }, []);

  // Computer opponent: use Stockfish to choose moves when it's the computer's turn
  useEffect(() => {
    if (!computerColor) return;
    if (chessRef.current.turn() !== computerColor) return;
    if (chessRef.current.isGameOver()) return;

    let cancelled = false;
    const currentFen = chessRef.current.fen();

    const timer = setTimeout(() => {
      stockfishEngine.getBestMove(currentFen, 500).then((uciMove) => {
        if (cancelled) return;
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        executeMove(from, to, promotion);
      }).catch(() => {
        // Stockfish unavailable - fall back to random legal move
        if (cancelled) return;
        const moves = chessRef.current.moves({ verbose: true });
        if (moves.length === 0) return;
        const move = moves[Math.floor(Math.random() * moves.length)];
        executeMove(move.from, move.to, move.promotion ?? 'q');
      });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, computerColor]);

  // Public alias kept for backward compatibility
  const makeMove = executeMove;

  // ─── Selection helpers ───────────────────────────────────────────────────────

  const clearSelection = useCallback((): void => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  // ─── Sync with external FEN changes ────────────────────────────────────────
  // When a parent component updates `initialFen` (e.g., coach makes a move,
  // review navigates to a different moment), sync the internal chess instance.
  useEffect(() => {
    if (initialFen !== undefined && initialFen !== chessRef.current.fen()) {
      chessRef.current = new Chess(initialFen);
      setFen(chessRef.current.fen());
      setLastMove(null);
      clearSelection();
    }
  }, [initialFen, clearSelection]);

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

  const setOrientation = useCallback((orientation: 'white' | 'black'): void => {
    setBoardOrientation(orientation);
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

  const getFen = useCallback((): string => chessRef.current.fen(), []);

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

  /**
   * Replay a SAN move list into a fresh game. Unlike `loadFen`, this
   * rebuilds the full chess.js history AND lights the last move's
   * squares — which is what makes a RESUMED game look like a real game
   * in progress instead of a position dropped onto the board with no
   * highlight (the "ghost squares" that got WO-RESUME-01's FEN-only
   * restore disabled). Returns false (and leaves the game untouched)
   * if any SAN is illegal, so a corrupt snapshot can't wedge the board.
   */
  const loadHistory = useCallback((sans: string[]): boolean => {
    const replay = new Chess();
    try {
      // chess.js throws on an illegal SAN — the catch turns that into a
      // clean false so a corrupt snapshot can't wedge the board.
      for (const san of sans) replay.move(san);
    } catch {
      return false;
    }
    chessRef.current = replay;
    setFen(replay.fen());
    const verbose = replay.history({ verbose: true });
    const last = verbose[verbose.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
    clearSelection();
    return true;
  }, [clearSelection]);

  return useMemo(() => ({
    fen,
    position: fen,
    getFen,
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
    setOrientation,
    undoMove,
    resetGame,
    clearSelection,
    getLegalMoves,
    getPiece,
    reset,
    loadFen,
    loadHistory,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset excluded as it always creates new closure; reset === resetGame
  }), [
    fen, turn, inCheck, checkSquare, isGameOver, isCheckmate, isStalemate,
    isDraw, lastMove, history, selectedSquare, legalMoves, boardOrientation,
    makeMove, onDrop, onSquareClick, flipBoard, setOrientation, undoMove, resetGame,
    clearSelection, getLegalMoves, getPiece, loadFen, loadHistory, getFen,
  ]);
}
