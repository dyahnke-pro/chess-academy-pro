import { Chess } from 'chess.js';

const PIECE_NAMES: Record<string, string> = {
  k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn',
};

/** Theme-aware nudge for the first wrong attempt — tells the player *what* to look for */
const THEME_HINTS: Record<string, string[]> = {
  fork: [
    'Can one piece attack two targets at once?',
    'Look for a double attack.',
  ],
  knightFork: [
    'A knight can jump to a square that hits two pieces.',
  ],
  pin: [
    'A piece is shielding something more valuable behind it.',
    'Look for a piece that can\'t move without exposing something.',
  ],
  skewer: [
    'A valuable piece is in line with something behind it.',
    'Attack through one piece to reach another.',
  ],
  discoveredAttack: [
    'Moving one piece can unleash another.',
    'There\'s hidden power behind one of your pieces.',
  ],
  backRankMate: [
    'The king is trapped on the back rank.',
    'Look at the back row — is the king safe?',
  ],
  hangingPiece: [
    'Something is undefended.',
    'One of the opponent\'s pieces has no protection.',
  ],
  mate: [
    'There\'s a checkmate on the board.',
    'Look for a forcing sequence that ends the game.',
  ],
  mateIn1: [
    'Checkmate in one move — look for a check that can\'t be escaped.',
  ],
  mateIn2: [
    'Checkmate in two — start with a forcing move.',
  ],
  sacrifice: [
    'Sometimes giving up material opens a winning path.',
    'Consider offering something to break through.',
  ],
  deflection: [
    'Can you lure a defender away from its job?',
  ],
  decoy: [
    'Can you force a piece onto a bad square?',
  ],
  attraction: [
    'Can you drag a piece where you want it?',
  ],
  overloadedPiece: [
    'One of the opponent\'s pieces is doing too many jobs.',
  ],
  trappedPiece: [
    'A piece has nowhere to run.',
    'Look for a piece with no escape squares.',
  ],
  xRayAttack: [
    'An attack is working through another piece.',
  ],
  interferance: [
    'Can you block a critical line or diagonal?',
  ],
  clearance: [
    'A piece is in the way — move it with tempo.',
  ],
  promotion: [
    'A pawn is close to the finish line.',
    'Think about queening.',
  ],
  endgame: [
    'Focus on king activity and pawn structure.',
  ],
  zugzwang: [
    'The opponent has no good moves — can you force that?',
  ],
  quietMove: [
    'The best move isn\'t a check or capture — look deeper.',
  ],
  defensiveMove: [
    'Sometimes the best tactic is a calm defensive move.',
  ],
  crushing: [
    'You have a decisive advantage — find the sharpest continuation.',
  ],
  advancedPawn: [
    'Push the passed pawn forward.',
  ],
  exposedKing: [
    'The king is vulnerable — exploit it.',
  ],
  kingsideAttack: [
    'Attack the kingside — look for breaks and sacrifices.',
  ],
  queensideAttack: [
    'The queenside has weaknesses to exploit.',
  ],
};

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Get the name of a piece on a given square */
export function getPieceNameOnSquare(chess: Chess, square: string): string | null {
  const piece = chess.get(square as Parameters<Chess['get']>[0]);
  if (!piece) return null;
  return PIECE_NAMES[piece.type] ?? null;
}

/**
 * Generate a progressive wrong-move hint based on:
 * - attempt number (1 = theme hint, 2 = piece hint, 3+ = square hint)
 * - puzzle themes
 * - the expected move's from/to squares
 */
export function getWrongMoveHint(
  attempt: number,
  themes: string[],
  expectedFrom: string,
  expectedTo: string,
  chess: Chess,
): string {
  // Attempt 1: theme-based nudge
  if (attempt === 1) {
    for (const theme of themes) {
      const hints = THEME_HINTS[theme];
      if (hints && hints.length > 0) {
        return pick(hints);
      }
    }
    // No matching theme — give a general tactical nudge
    return 'Look for the most forcing move in this position.';
  }

  // Attempt 2: piece hint
  if (attempt === 2) {
    const pieceName = getPieceNameOnSquare(chess, expectedFrom);
    if (pieceName) {
      return `Look at what your ${pieceName} can do.`;
    }
    return 'One of your pieces has a strong move available.';
  }

  // Attempt 3+: target square hint
  return `The key square is ${expectedTo}. What can reach it?`;
}
