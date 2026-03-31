import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';
import type { CoachGameMove, MissedTactic, TacticType } from '../types';

/** Minimum centipawn swing to qualify as a missed tactic */
const MIN_EVAL_SWING = 100;

/** Maximum number of missed tactics to return */
const MAX_TACTICS = 10;

/** Piece values for detecting material threats */
const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 100,
};

/** Sliding piece directions for ray tracing */
const BISHOP_DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function squareToCoords(sq: Square): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1];
}

function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
}

function pieceValue(type: PieceSymbol): number {
  return PIECE_VALUE[type] ?? 0;
}

function oppositeColor(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

/**
 * Trace a ray from a square in a given direction, returning pieces found in order.
 * Continues past pieces to find up to `maxPieces` on the ray (needed for pin/skewer detection).
 */
function traceRay(
  chess: Chess,
  fromSquare: Square,
  dir: [number, number],
  maxPieces: number = 2,
): Array<{ square: Square; type: PieceSymbol; color: Color }> {
  const [startFile, startRank] = squareToCoords(fromSquare);
  const pieces: Array<{ square: Square; type: PieceSymbol; color: Color }> = [];
  let file = startFile + dir[0];
  let rank = startRank + dir[1];

  while (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
    const sq = coordsToSquare(file, rank);
    if (!sq) break;
    const piece = chess.get(sq);
    if (piece) {
      pieces.push({ square: sq, type: piece.type, color: piece.color });
      if (pieces.length >= maxPieces) break;
    }
    file += dir[0];
    rank += dir[1];
  }

  return pieces;
}

/**
 * Get squares attacked by a piece at a given square.
 * Uses a temporary position with the piece's side to move to generate attacks.
 */
function getAttackedSquares(chess: Chess, square: Square): Square[] {
  const piece = chess.get(square);
  if (!piece) return [];

  // Create a position where it's the piece's turn to move, so we can check its attacks
  const fenParts = chess.fen().split(' ');
  fenParts[1] = piece.color; // Force it to be this piece's turn
  fenParts[3] = '-'; // Clear en passant to avoid issues

  try {
    const testChess = new Chess(fenParts.join(' '));
    const moves = testChess.moves({ square, verbose: true });
    const attacked = new Set<string>();

    for (const m of moves) {
      const target = testChess.get(m.to);
      if (target && target.color !== piece.color) {
        attacked.add(m.to);
      }
    }

    return Array.from(attacked) as Square[];
  } catch {
    return [];
  }
}

/**
 * Check if a square is defended by any piece of the given color.
 */
function isDefended(chess: Chess, square: Square, byColor: Color): boolean {
  try {
    // Force it to be byColor's turn so we can check their attacks
    const fenParts = chess.fen().split(' ');
    fenParts[1] = byColor;
    fenParts[3] = '-';
    const testChess = new Chess(fenParts.join(' '));

    const board = testChess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === byColor) {
          const sq = coordsToSquare(c, 7 - r);
          if (!sq) continue;
          const moves = testChess.moves({ square: sq, verbose: true });
          if (moves.some((m) => m.to === square)) return true;
        }
      }
    }
  } catch {
    // Fall back to false
  }
  return false;
}

/**
 * Count how many pieces of the given color are attacking a square.
 */
function countDefenders(chess: Chess, square: Square, byColor: Color): number {
  try {
    const fenParts = chess.fen().split(' ');
    fenParts[1] = byColor;
    fenParts[3] = '-';
    const testChess = new Chess(fenParts.join(' '));

    let count = 0;
    const board = testChess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === byColor) {
          const sq = coordsToSquare(c, 7 - r);
          if (!sq) continue;
          const moves = testChess.moves({ square: sq, verbose: true });
          if (moves.some((m) => m.to === square)) count++;
        }
      }
    }
    return count;
  } catch {
    return 0;
  }
}

// ─── Tactic Detectors ─────────────────────────────────────────────────────────

/**
 * Detect pin: a piece is blocking an attack on a more valuable piece behind it.
 * After the best move, check if the moved piece creates a pin along a ray.
 */
function detectPin(chess: Chess, to: Square, movingColor: Color): boolean {
  const piece = chess.get(to);
  if (!piece) return false;

  // Only sliding pieces (bishop, rook, queen) can pin
  if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') return false;

  const dirs = piece.type === 'b' ? BISHOP_DIRS
    : piece.type === 'r' ? ROOK_DIRS
    : [...BISHOP_DIRS, ...ROOK_DIRS];

  for (const dir of dirs) {
    const piecesOnRay = traceRay(chess, to, dir);
    if (piecesOnRay.length < 2) continue;

    const first = piecesOnRay[0];
    const second = piecesOnRay[1];

    // Pin: first piece is enemy, second piece is also enemy and more valuable
    if (
      first.color === oppositeColor(movingColor) &&
      second.color === oppositeColor(movingColor) &&
      pieceValue(second.type) > pieceValue(first.type)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Detect skewer: attacking a valuable piece that must move, exposing a piece behind it.
 */
function detectSkewer(chess: Chess, to: Square, movingColor: Color): boolean {
  const piece = chess.get(to);
  if (!piece) return false;

  if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') return false;

  const dirs = piece.type === 'b' ? BISHOP_DIRS
    : piece.type === 'r' ? ROOK_DIRS
    : [...BISHOP_DIRS, ...ROOK_DIRS];

  for (const dir of dirs) {
    const piecesOnRay = traceRay(chess, to, dir);
    if (piecesOnRay.length < 2) continue;

    const first = piecesOnRay[0];
    const second = piecesOnRay[1];

    // Skewer: first piece is enemy and more valuable than second enemy piece
    if (
      first.color === oppositeColor(movingColor) &&
      second.color === oppositeColor(movingColor) &&
      pieceValue(first.type) > pieceValue(second.type) &&
      pieceValue(second.type) >= 1
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Detect discovered attack: the moving piece uncovers an attack from a friendly piece behind it.
 */
function detectDiscoveredAttack(chess: Chess, from: Square, to: Square, movingColor: Color): boolean {
  // Check if a friendly sliding piece on the same ray as `from` now attacks an enemy piece
  // that was previously blocked by the piece at `from`
  const allDirs = [...BISHOP_DIRS, ...ROOK_DIRS];

  for (const dir of allDirs) {
    // Look backwards from `from` to find a friendly sliding piece
    const behindPieces = traceRay(chess, from, [-dir[0], -dir[1]] as [number, number]);
    if (behindPieces.length === 0) continue;

    const behind = behindPieces[0];
    if (behind.color !== movingColor) continue;

    // Check if this piece is a slider that can attack along this direction
    const canSlide =
      (behind.type === 'q') ||
      (behind.type === 'b' && BISHOP_DIRS.some((d) => d[0] === dir[0] && d[1] === dir[1])) ||
      (behind.type === 'r' && ROOK_DIRS.some((d) => d[0] === dir[0] && d[1] === dir[1]));

    if (!canSlide) continue;

    // Now check forward: is there an enemy piece along this ray?
    const forwardPieces = traceRay(chess, from, dir);
    for (const fp of forwardPieces) {
      // Skip if this is the square we moved TO (the piece is no longer blocking)
      if (fp.square === to) continue;
      if (fp.color === oppositeColor(movingColor) && pieceValue(fp.type) >= 3) {
        return true;
      }
      break; // Blocked by first piece found
    }
  }

  return false;
}

/**
 * Detect deflection: forcing a defender away from a key defensive duty.
 * After the best move captures or attacks a piece that was defending something valuable.
 */
function detectDeflection(
  chessBeforeMove: Chess,
  chessAfterMove: Chess,
  to: Square,
  movingColor: Color,
): boolean {
  const capturedTarget = chessBeforeMove.get(to);
  if (!capturedTarget || capturedTarget.color === movingColor) return false;

  const enemyColor = oppositeColor(movingColor);

  try {
    // Force enemy's turn so we can see what the captured piece was defending
    const fenParts = chessBeforeMove.fen().split(' ');
    fenParts[1] = enemyColor;
    fenParts[3] = '-';
    const testBefore = new Chess(fenParts.join(' '));

    const defenderMoves = testBefore.moves({ square: to, verbose: true });
    const board = chessBeforeMove.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== enemyColor) continue;
        const sq = coordsToSquare(c, 7 - r);
        if (!sq || sq === to) continue;

        const wasDefending = defenderMoves.some((m) => m.to === sq);
        if (wasDefending && pieceValue(piece.type) >= 3) {
          if (!isDefended(chessAfterMove, sq, enemyColor)) {
            return true;
          }
        }
      }
    }
  } catch {
    // Fall through
  }

  return false;
}

/**
 * Detect overloaded piece: a piece that must defend multiple things at once.
 * If the best move attacks something that forces a defender to choose.
 */
function detectOverloadedPiece(
  chessBeforeMove: Chess,
  to: Square,
  movingColor: Color,
): boolean {
  const enemyColor = oppositeColor(movingColor);

  try {
    const fenParts = chessBeforeMove.fen().split(' ');
    fenParts[1] = enemyColor;
    fenParts[3] = '-';
    const testChess = new Chess(fenParts.join(' '));

    const board = testChess.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== enemyColor) continue;
        const defenderSq = coordsToSquare(c, 7 - r);
        if (!defenderSq) continue;

        const defenderMoves = testChess.moves({ square: defenderSq, verbose: true });
        const defendsTarget = defenderMoves.some((m) => m.to === to);
        if (!defendsTarget) continue;

        let defensiveDuties = 0;
        for (let r2 = 0; r2 < 8; r2++) {
          for (let c2 = 0; c2 < 8; c2++) {
            const friendlyPiece = board[r2][c2];
            if (!friendlyPiece || friendlyPiece.color !== enemyColor) continue;
            const friendlySq = coordsToSquare(c2, 7 - r2);
            if (!friendlySq || friendlySq === defenderSq) continue;

            if (
              pieceValue(friendlyPiece.type) >= 3 &&
              defenderMoves.some((m) => m.to === friendlySq)
            ) {
              defensiveDuties++;
            }
          }
        }

        if (defensiveDuties >= 2) return true;
      }
    }
  } catch {
    // Fall through
  }

  return false;
}

/**
 * Detect trapped piece: the best move traps an enemy piece with no safe escape squares.
 */
function detectTrappedPiece(chess: Chess, movingColor: Color): boolean {
  const enemyColor = oppositeColor(movingColor);

  try {
    // Force enemy's turn to check their escape moves
    const fenParts = chess.fen().split(' ');
    fenParts[1] = enemyColor;
    fenParts[3] = '-';
    const testChess = new Chess(fenParts.join(' '));

    const board = testChess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== enemyColor) continue;
        if (pieceValue(piece.type) < 3) continue;

        const sq = coordsToSquare(c, 7 - r);
        if (!sq) continue;

        const moves = testChess.moves({ square: sq, verbose: true });
        if (moves.length === 0) continue;

        const allMovesBad = moves.every((m) =>
          isDefended(chess, m.to, movingColor),
        );

        if (allMovesBad && countDefenders(chess, sq, movingColor) > 0) {
          return true;
        }
      }
    }
  } catch {
    // Fall through
  }

  return false;
}

/**
 * Detect clearance sacrifice: moving a piece away to clear a square or line for another piece.
 * The moved piece sacrifices material to open a path.
 */
function detectClearance(
  chessBeforeMove: Chess,
  chessAfterMove: Chess,
  from: Square,
  to: Square,
  movingColor: Color,
): boolean {
  const movingPiece = chessBeforeMove.get(from);
  if (!movingPiece) return false;

  // Was there a capture at the destination? (sacrifice element)
  const targetPiece = chessBeforeMove.get(to);
  const isSacrifice = targetPiece && targetPiece.color !== movingColor &&
    pieceValue(movingPiece.type) > pieceValue(targetPiece.type);

  if (!isSacrifice && isDefended(chessBeforeMove, to, oppositeColor(movingColor))) {
    // Moving to a defended square = sacrifice
    // Now check if `from` is used by a friendly piece after the move
    try {
      const fenParts = chessAfterMove.fen().split(' ');
      fenParts[1] = movingColor;
      fenParts[3] = '-';
      const testAfter = new Chess(fenParts.join(' '));

      const board = testAfter.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (!piece || piece.color !== movingColor) continue;
          const sq = coordsToSquare(c, 7 - r);
          if (!sq || sq === to) continue;

          const moves = testAfter.moves({ square: sq, verbose: true });
          if (moves.some((m) => m.to === from)) {
            return true;
          }
        }
      }
    } catch {
      // Fall through
    }
  }

  return false;
}

/**
 * Detect double check: the move delivers check from two pieces simultaneously.
 */
function detectDoubleCheck(chess: Chess, movingColor: Color): boolean {
  if (!chess.isCheck()) return false;

  const enemyColor = oppositeColor(movingColor);
  const board = chess.board();
  let kingSq: Square | null = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'k' && piece.color === enemyColor) {
        kingSq = coordsToSquare(c, 7 - r);
      }
    }
  }

  if (!kingSq) return false;

  try {
    // Force moving color's turn to check which pieces attack the king
    const fenParts = chess.fen().split(' ');
    fenParts[1] = movingColor;
    fenParts[3] = '-';
    const testChess = new Chess(fenParts.join(' '));

    let checkCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== movingColor) continue;
        const sq = coordsToSquare(c, 7 - r);
        if (!sq) continue;

        const moves = testChess.moves({ square: sq, verbose: true });
        if (moves.some((m) => m.to === kingSq)) {
          checkCount++;
        }
      }
    }

    return checkCount >= 2;
  } catch {
    return false;
  }
}

/**
 * Detect x-ray attack: attacking through a piece (like a rook through a queen on the same file).
 */
function detectXRay(chess: Chess, to: Square, movingColor: Color): boolean {
  const piece = chess.get(to);
  if (!piece) return false;

  if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') return false;

  const dirs = piece.type === 'b' ? BISHOP_DIRS
    : piece.type === 'r' ? ROOK_DIRS
    : [...BISHOP_DIRS, ...ROOK_DIRS];

  for (const dir of dirs) {
    const piecesOnRay = traceRay(chess, to, dir);
    if (piecesOnRay.length < 2) continue;

    const first = piecesOnRay[0];
    const second = piecesOnRay[1];

    // X-ray: attacking through a friendly piece to threaten an enemy piece behind it
    if (
      first.color === movingColor &&
      second.color === oppositeColor(movingColor) &&
      pieceValue(second.type) >= 3
    ) {
      return true;
    }
  }

  return false;
}

// ─── Main Classifier ──────────────────────────────────────────────────────────

/**
 * Detect what type of tactic the best move represents by analyzing the resulting position.
 * Returns the most specific tactic type found, with priority ordering.
 */
export function detectTacticType(fen: string, bestMoveUci: string): TacticType {
  try {
    const chessBefore = new Chess(fen);
    const from = bestMoveUci.slice(0, 2) as Square;
    const to = bestMoveUci.slice(2, 4) as Square;
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

    // Check for promotion
    if (promotion) return 'promotion';

    const movingPiece = chessBefore.get(from);
    if (!movingPiece) return 'tactical_sequence';

    // Pawn promotion without explicit promotion char
    if (movingPiece.type === 'p' && (to[1] === '8' || to[1] === '1')) {
      return 'promotion';
    }

    const movingColor = movingPiece.color;

    // Make the move
    const chessAfter = new Chess(fen);
    const moveResult = chessAfter.move({ from, to, promotion });
    // chess.js throws on invalid move, so moveResult is always truthy here.
    // The outer try/catch handles any invalid move scenarios.

    // === Priority-ordered detection ===

    // 1. Double check (very specific, rare)
    if (detectDoubleCheck(chessAfter, movingColor)) {
      return 'double_check';
    }

    // 2. Back rank mate/threat
    if (chessAfter.isCheck()) {
      const board = chessAfter.board();
      const enemyColor = chessAfter.turn();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === enemyColor) {
            const rank = 8 - r;
            if (rank === 1 || rank === 8) return 'back_rank';
          }
        }
      }
    }

    // 3. Fork: piece attacks 2+ valuable enemy pieces
    const attackedSquares = getAttackedSquares(chessAfter, to);
    const valuableAttacked = attackedSquares.filter((sq) => {
      const piece = chessAfter.get(sq);
      return piece && piece.color !== movingColor && pieceValue(piece.type) >= 3;
    });
    // Also count the king as a fork target if in check
    if (chessAfter.isCheck() && valuableAttacked.length >= 1) {
      return 'fork';
    }
    if (valuableAttacked.length >= 2) {
      return 'fork';
    }

    // 4. Pin
    if (detectPin(chessAfter, to, movingColor)) {
      return 'pin';
    }

    // 5. Skewer
    if (detectSkewer(chessAfter, to, movingColor)) {
      return 'skewer';
    }

    // 6. Discovered attack
    if (detectDiscoveredAttack(chessAfter, from, to, movingColor)) {
      return 'discovered_attack';
    }

    // 7. Deflection
    if (moveResult.captured && detectDeflection(chessBefore, chessAfter, to, movingColor)) {
      return 'deflection';
    }

    // 8. Overloaded piece
    if (detectOverloadedPiece(chessBefore, to, movingColor)) {
      return 'overloaded_piece';
    }

    // 9. Trapped piece
    if (detectTrappedPiece(chessAfter, movingColor)) {
      return 'trapped_piece';
    }

    // 10. Clearance sacrifice
    if (detectClearance(chessBefore, chessAfter, from, to, movingColor)) {
      return 'clearance';
    }

    // 11. X-ray attack
    if (detectXRay(chessAfter, to, movingColor)) {
      return 'x_ray';
    }

    // 12. Hanging piece (undefended capture)
    if (moveResult.captured) {
      return 'hanging_piece';
    }

    return 'tactical_sequence';
  } catch {
    return 'tactical_sequence';
  }
}

// ─── Explanation Generator ────────────────────────────────────────────────────

/**
 * Generate a human-readable explanation of the missed tactic.
 */
function generateExplanation(tacticType: TacticType, bestMove: string, evalSwing: number): string {
  const swingPawns = (evalSwing / 100).toFixed(1);
  const descriptions: Record<TacticType, string> = {
    fork: `You missed a fork with ${bestMove}! This would have attacked multiple pieces simultaneously (${swingPawns} pawn advantage).`,
    pin: `You missed a pin with ${bestMove}! A piece is stuck defending something more valuable behind it (${swingPawns} pawn advantage).`,
    skewer: `You missed a skewer with ${bestMove}! The attack goes through a valuable piece to hit another behind it (${swingPawns} pawn advantage).`,
    discovered_attack: `You missed a discovered attack with ${bestMove} — moving this piece reveals an attack from behind (${swingPawns} pawn advantage).`,
    back_rank: `You missed a back rank threat with ${bestMove}! The opponent's king was vulnerable on the back rank (${swingPawns} pawn advantage).`,
    hanging_piece: `You missed capturing a hanging piece with ${bestMove} (${swingPawns} pawn advantage).`,
    promotion: `You missed a pawn promotion with ${bestMove} (${swingPawns} pawn advantage).`,
    deflection: `You missed a deflection with ${bestMove}! This forces a key defender away from its post (${swingPawns} pawn advantage).`,
    overloaded_piece: `You missed exploiting an overloaded piece with ${bestMove}! A defender was responsible for too many duties (${swingPawns} pawn advantage).`,
    trapped_piece: `You missed trapping a piece with ${bestMove}! The opponent had a piece with no safe squares (${swingPawns} pawn advantage).`,
    clearance: `You missed a clearance sacrifice with ${bestMove}! Moving this piece opens a powerful line for another (${swingPawns} pawn advantage).`,
    interference: `You missed an interference tactic with ${bestMove}! This disrupts the coordination between enemy pieces (${swingPawns} pawn advantage).`,
    zwischenzug: `You missed a zwischenzug (in-between move) with ${bestMove}! This unexpected intermediate move changes the dynamics (${swingPawns} pawn advantage).`,
    x_ray: `You missed an x-ray attack with ${bestMove}! The attack goes through one piece to target another (${swingPawns} pawn advantage).`,
    double_check: `You missed a double check with ${bestMove}! Two pieces deliver check simultaneously — the king MUST move (${swingPawns} pawn advantage).`,
    tactical_sequence: `You missed the tactical sequence starting with ${bestMove} (${swingPawns} pawn advantage).`,
  };

  return descriptions[tacticType];
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Detect missed tactics from a completed game's move list.
 *
 * Scans the player's moves for mistakes/blunders where Stockfish found a significantly
 * better move, then analyzes the best move to identify the tactic pattern.
 */
export function detectMissedTactics(
  moves: CoachGameMove[],
  playerColor: 'white' | 'black',
): MissedTactic[] {
  const tactics: MissedTactic[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];

    // Only analyze player's moves (not coach's)
    if (move.isCoachMove) continue;

    // Filter by player color: odd moveNumber = white, even = black
    const isWhiteMove = move.moveNumber % 2 === 1;
    if ((playerColor === 'white' && !isWhiteMove) || (playerColor === 'black' && isWhiteMove)) {
      continue;
    }

    // Must be a mistake or blunder with a known best move
    const cls = move.classification;
    if (cls !== 'mistake' && cls !== 'blunder') continue;
    if (!move.bestMove || move.bestMoveEval === null || move.evaluation === null) continue;

    // Calculate eval swing
    const evalSwing = Math.abs(move.bestMoveEval - move.evaluation);
    if (evalSwing < MIN_EVAL_SWING) continue;

    // Get the FEN from the previous move (the position before this move was played)
    const preFen = i > 0 ? moves[i - 1].fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // Detect what type of tactic was missed
    const tacticType = detectTacticType(preFen, move.bestMove);
    const explanation = generateExplanation(tacticType, move.bestMove, evalSwing);

    tactics.push({
      moveIndex: i,
      playerMoved: move.san,
      bestMove: move.bestMove,
      fen: preFen,
      evalSwing,
      tacticType,
      explanation,
    });
  }

  // Sort by eval swing descending and take top N
  tactics.sort((a, b) => b.evalSwing - a.evalSwing);
  return tactics.slice(0, MAX_TACTICS);
}
