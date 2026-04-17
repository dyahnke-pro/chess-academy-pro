import { Chess } from 'chess.js';
import type {
  CoachGameMove,
  GameRecord,
  MoveAnnotation,
} from '../types/index';

export function reconstructMovesFromGame(
  game: GameRecord,
  playerColor?: 'white' | 'black',
): CoachGameMove[] {
  // chess.loadPgn() handles headers, braced comments, NAGs, and result
  // tokens correctly. The old manual whitespace-split parser failed the
  // first iteration for any PGN with headers (e.g. "[Event" threw on
  // chess.move), silently returning [] for every imported game.
  const loader = new Chess();
  try {
    loader.loadPgn(game.pgn);
  } catch {
    return [];
  }
  const sanMoves = loader.history();

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

  // For coach-vs-player games the player's color is inferred from the
  // AI placeholder names. For imported human-vs-human games the caller
  // must pass playerColor explicitly; otherwise we'd default to "white"
  // and mis-mark every user-as-black move as a coach move.
  const inferredPlayerIsWhite = game.white !== 'AI Coach' && game.white !== 'Stockfish Bot';
  const playerIsWhite = playerColor ? playerColor === 'white' : inferredPlayerIsWhite;
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

    // Annotations store evaluations in pawns (eval / 100). Convert back to
    // centipawns so every consumer (accuracy, eval graph, move list) gets
    // consistent units matching the live-game path.
    const evaluation = annotation?.evaluation != null ? annotation.evaluation * 100 : null;
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
