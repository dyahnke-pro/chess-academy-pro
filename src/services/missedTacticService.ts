import { Chess, type Square } from 'chess.js';
import type { CoachGameMove, MissedTactic, TacticType } from '../types';

/** Minimum centipawn swing to qualify as a missed tactic */
const MIN_EVAL_SWING = 100;

/** Maximum number of missed tactics to return */
const MAX_TACTICS = 10;

/** Piece values for detecting material threats */
const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

/**
 * Detect what type of tactic the best move represents by analyzing the resulting position.
 */
function detectTacticType(fen: string, bestMoveUci: string): TacticType {
  try {
    const chess = new Chess(fen);
    const from = bestMoveUci.slice(0, 2) as Square;
    const to = bestMoveUci.slice(2, 4) as Square;
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

    // Check for promotion
    if (promotion) {
      return 'promotion';
    }

    const movingPiece = chess.get(from);
    if (!movingPiece) return 'tactical_sequence';

    // Check for pawn promotion (pawn moving to rank 1 or 8)
    if (movingPiece.type === 'p') {
      const destRank = to[1];
      if (destRank === '8' || destRank === '1') {
        return 'promotion';
      }
    }

    // Try to make the best move (chess.js throws on invalid move, caught by outer try/catch)
    const moveResult = chess.move({ from, to, promotion });

    // After the best move is played, analyze the resulting position
    const isCapture = moveResult.captured !== undefined;

    // Check for back rank mate threat
    if (chess.isCheck()) {
      const opponentColor = chess.turn();
      // Get opponent king position
      const board = chess.board();
      let kingSquare: string | null = null;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === opponentColor) {
            const file = String.fromCharCode(97 + c);
            const rank = String(8 - r);
            kingSquare = `${file}${rank}`;
          }
        }
      }

      if (kingSquare) {
        const kingRank = kingSquare[1];
        if (kingRank === '1' || kingRank === '8') {
          return 'back_rank';
        }
      }
    }

    // Count how many valuable pieces the moving piece now attacks (fork detection)
    const attackedSquares = getAttackedSquares(chess, to);
    const valuableAttacked = attackedSquares.filter((sq) => {
      const piece = chess.get(sq);
      return piece && piece.color !== movingPiece.color && PIECE_VALUE[piece.type] >= 3;
    });

    if (valuableAttacked.length >= 2) {
      return 'fork';
    }

    // If the best move was a capture of an undefended piece, it's a hanging piece
    if (isCapture) {
      // Simple heuristic: if we captured something and the eval swings a lot,
      // the opponent left something hanging
      return 'hanging_piece';
    }

    // Check if this creates a discovered attack by analyzing attack lines
    // Simple heuristic: if the move uncovers a new attack from a different piece
    if (movingPiece.type === 'n' || movingPiece.type === 'p') {
      // Knights and pawns moving can create discovered attacks from bishops/rooks/queens
      return 'discovered_attack';
    }

    return 'tactical_sequence';
  } catch {
    return 'tactical_sequence';
  }
}

/**
 * Get squares attacked by a piece at a given square.
 */
function getAttackedSquares(chess: Chess, square: Square): Square[] {
  const attacked: Square[] = [];
  const files = 'abcdefgh';
  const ranks = '12345678';

  for (const f of files) {
    for (const r of ranks) {
      const targetSquare = `${f}${r}` as Square;
      if (targetSquare === square) continue;

      try {
        const testChess = new Chess(chess.fen());
        const piece = testChess.get(square);
        if (!piece) continue;

        const target = testChess.get(targetSquare);
        if (target && target.color !== piece.color) {
          const moves = testChess.moves({ square, verbose: true });
          if (moves.some((m) => m.to === targetSquare)) {
            attacked.push(targetSquare);
          }
        }
      } catch {
        // Skip invalid squares
      }
    }
  }

  return attacked;
}

/**
 * Generate a human-readable explanation of the missed tactic.
 */
function generateExplanation(tacticType: TacticType, bestMove: string, evalSwing: number): string {
  const swingPawns = (evalSwing / 100).toFixed(1);
  const descriptions: Record<TacticType, string> = {
    fork: `You missed a fork with ${bestMove}! This would have attacked multiple pieces simultaneously (${swingPawns} pawn advantage).`,
    pin: `You missed a pin with ${bestMove} (${swingPawns} pawn advantage).`,
    skewer: `You missed a skewer with ${bestMove} (${swingPawns} pawn advantage).`,
    discovered_attack: `You missed a discovered attack with ${bestMove} — moving this piece reveals an attack from behind (${swingPawns} pawn advantage).`,
    back_rank: `You missed a back rank threat with ${bestMove}! The opponent's king was vulnerable on the back rank (${swingPawns} pawn advantage).`,
    hanging_piece: `You missed capturing a hanging piece with ${bestMove} (${swingPawns} pawn advantage).`,
    promotion: `You missed a pawn promotion with ${bestMove} (${swingPawns} pawn advantage).`,
    deflection: `You missed a deflection with ${bestMove} (${swingPawns} pawn advantage).`,
    overloaded_piece: `You missed exploiting an overloaded piece with ${bestMove} (${swingPawns} pawn advantage).`,
    tactical_sequence: `You missed the tactical sequence starting with ${bestMove} (${swingPawns} pawn advantage).`,
  };

  return descriptions[tacticType];
}

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
