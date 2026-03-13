import { Chess } from 'chess.js';
import type {
  CoachGameMove,
  GameRecord,
  MoveAnnotation,
} from '../types/index';

export function reconstructMovesFromGame(game: GameRecord): CoachGameMove[] {
  const tokens = game.pgn.split(/\s+/).filter((t) => t.length > 0);
  // Filter out move number tokens like "1.", "2.", etc.
  const sanMoves = tokens.filter((t) => !/^\d+\.+$/.test(t));

  if (sanMoves.length === 0) {
    return [];
  }

  // Build annotation lookup: "moveNumber-color" -> MoveAnnotation
  const annotationMap = new Map<string, MoveAnnotation>();
  if (game.annotations) {
    for (const ann of game.annotations) {
      annotationMap.set(`${ann.moveNumber}-${ann.color}`, ann);
    }
  }

  const playerIsWhite = game.white !== 'AI Coach' && game.white !== 'Stockfish Bot';
  const chess = new Chess();
  const moves: CoachGameMove[] = [];
  let previousEval: number | null = null;

  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i];
    const turnBeforeMove = chess.turn();

    try {
      chess.move(san);
    } catch {
      // Illegal move — stop reconstruction
      break;
    }

    const moveNumber = i + 1;
    const color: 'white' | 'black' = turnBeforeMove === 'w' ? 'white' : 'black';
    const isCoachMove = playerIsWhite ? color !== 'white' : color !== 'black';

    // Look up annotation by chess move number + color
    const chessMoveNumber = Math.ceil(moveNumber / 2);
    const annotation = annotationMap.get(`${chessMoveNumber}-${color}`);

    const evaluation = annotation?.evaluation ?? null;
    const bestMove = annotation?.bestMove ?? null;
    const classification = annotation?.classification ?? null;
    const comment = annotation?.comment ?? '';

    moves.push({
      moveNumber,
      san,
      fen: chess.fen(),
      isCoachMove,
      commentary: comment,
      evaluation,
      classification,
      expanded: false,
      bestMove,
      bestMoveEval: null,
      preMoveEval: previousEval,
    });

    previousEval = evaluation;
  }

  return moves;
}
