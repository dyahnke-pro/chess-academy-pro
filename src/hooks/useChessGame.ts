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
  /** Full PGN from chess.js, INCLUDING the `[SetUp]/[FEN]` header when the game
   *  began from a non-standard position (a walkthrough leaf/drill the board was
   *  `loadFen`'d to). Persist THIS, not `history.join(' ')` — a headerless
   *  bare-SAN PGN of a non-standard start fails `chess.loadPgn` from move 1, so
   *  the review's `adaptGameRecord` returned null ("could not replay this game"
   *  — PostHog 2026-09). */
  pgn: string;

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
  // ── CLICK-TO-MOVE READS THE SELECTION SYNCHRONOUSLY, NOT OFF A COMMITTED
  //    RENDER (found on prod 2026-09-18).
  //
  // Click-to-move is the only interaction in the app that spans TWO events:
  // tap the piece, then tap the square. `onSquareClick` used to read
  // `selectedSquare`/`legalMoves` out of REACT STATE, so the second tap only
  // saw the first one's selection if React had COMMITTED a render in between.
  // When it had not, the second tap fell through to "select this square
  // instead" — an enemy-occupied square has no legal moves, so it cleared the
  // selection and THE MOVE VANISHED with no error, no sound and no feedback.
  //
  // It is not theoretical and it is not rare: the coach's narration pipeline
  // runs engine analyses on the main thread in the moments right after its
  // reply, which is exactly when the student is tapping. Measured on prod, at
  // the same position with the same two squares: a 250ms gap between taps was
  // REFUSED, a 2.5s gap landed in 0.5s. Dragging never showed it, because a
  // drag needs no state to survive between two events.
  //
  // A ref is the truth the handler reads; the state still drives the selection
  // ring and the legal-move dots. Same reason `liveFenRef` exists on the coach
  // surface: when handlers run without yielding to React, only a ref is
  // current. Both are written in exactly TWO places — `selectSquare` and
  // `clearSelection` — which is what keeps them from drifting apart.
  const selectedSquareRef = useRef<string | null>(null);
  const legalMovesRef = useRef<string[]>([]);
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
    selectedSquareRef.current = null;
    legalMovesRef.current = [];
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
      selectedSquareRef.current = square;
      legalMovesRef.current = destinations;
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
    // The REFS, never the state — see the note where they are declared. The
    // second tap of a click-move must see the first tap's selection even when
    // React has not re-rendered in between, which under load it has not.
    const selected = selectedSquareRef.current;
    const legal = legalMovesRef.current;

    // Clicking the already-selected square deselects it
    if (selected === square) {
      clearSelection();
      return null;
    }

    // If a legal move destination is clicked, execute the move
    if (selected !== null && legal.includes(square)) {
      const piece = chessRef.current.get(selected as Square);
      const isPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && square[1] === '8') ||
          (piece.color === 'b' && square[1] === '1'));

      const result = executeMove(selected, square, isPromotion ? 'q' : undefined);
      clearSelection();
      return result;
    }

    // Otherwise try to select the clicked square
    selectSquare(square);
    return null;
  }, [clearSelection, selectSquare, executeMove]);

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
    // 🔒 LIVE, not the render-time string. `fen` is React state, so a caller
    // that mutates the board and reads `game.fen` in the SAME TICK gets the
    // PRE-mutation position — and every read looks correct, because one render
    // later it is. That cost a coach takeback: `handleTakeBack` undid the move
    // and then re-derived the FEN from this field, so the dictated replacement
    // was probed against the position it had just undone, found illegal, and
    // silently skipped — leaving the board taken back with nothing played.
    // A getter off the live chess object makes the whole class impossible
    // instead of asking ~60 call sites to remember which tick they are in.
    // Safe as a getter because it returns a STRING: no referential identity to
    // bust a consumer's memo. `history` deliberately stays render-stable — it
    // returns a fresh array per call and would bust those caches.
    get fen() { return chessRef.current.fen(); },
    get position() { return chessRef.current.fen(); },
    pgn: chess.pgn(),
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
