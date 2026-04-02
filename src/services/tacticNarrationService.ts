import { Chess } from 'chess.js';
import { tacticTypeLabel } from './tacticalProfileService';
import type { TacticType } from '../types';

// ─── Piece & Move Helpers ─────────────────────────────────────────────────

const PIECE_NAMES: Record<string, string> = {
  K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight',
};

/** Convert SAN like "Nxf7+" to a spoken phrase like "Knight takes f7, check" */
export function describeMove(san: string, isWhite: boolean): string {
  const side = isWhite ? 'White' : 'Black';
  let desc = san;

  // Castling
  if (san === 'O-O') return `${side} castles kingside`;
  if (san === 'O-O-O') return `${side} castles queenside`;

  // Strip check/mate symbols for parsing
  const isCheck = san.includes('+');
  const isMate = san.includes('#');
  desc = desc.replace(/[+#]/g, '');

  // Promotion
  const promoMatch = desc.match(/=([QRBN])/);
  let promoText = '';
  if (promoMatch) {
    promoText = `, promoting to ${PIECE_NAMES[promoMatch[1]] ?? 'queen'}`;
    desc = desc.replace(/=[QRBN]/, '');
  }

  // Capture
  const isCapture = desc.includes('x');
  desc = desc.replace('x', '');

  // Piece type
  const pieceChar = desc.match(/^[KQRBN]/)?.[0];
  const pieceName = pieceChar ? PIECE_NAMES[pieceChar] : 'Pawn';

  // Target square
  const square = desc.match(/[a-h][1-8]/)?.[0] ?? '';

  let phrase = '';
  if (isCapture) {
    phrase = `${pieceName} takes on ${square}`;
  } else {
    phrase = `${pieceName} to ${square}`;
  }

  phrase += promoText;
  if (isMate) phrase += ', checkmate';
  else if (isCheck) phrase += ', check';

  return phrase;
}

/** Determine if a move is "notable" — worth narrating during a long replay */
export function isNotableMove(san: string, moveIndex: number, totalMoves: number): boolean {
  // Always narrate first and last 2 moves
  if (moveIndex <= 1 || moveIndex >= totalMoves - 2) return true;
  // Captures
  if (san.includes('x')) return true;
  // Checks
  if (san.includes('+') || san.includes('#')) return true;
  // Castling
  if (san.startsWith('O-')) return true;
  // Promotions
  if (san.includes('=')) return true;
  // Every 4th move to keep rhythm
  if (moveIndex % 4 === 0) return true;
  return false;
}

// ─── Layer 2: Drill Narration ─────────────────────────────────────────────

export function drillIntro(
  tacticType: TacticType,
  opponentName: string | null,
  openingName: string | null,
): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const parts: string[] = [];

  if (opponentName) {
    parts.push(`From your game against ${opponentName}.`);
  }
  if (openingName) {
    parts.push(`In the ${openingName}.`);
  }
  parts.push(`Watch the buildup to this missed ${tacticLabel}.`);

  return parts.join(' ');
}

/** Position setup phrases by tactic type — gives a sense of why the tactic exists here */
const POSITION_SETUPS: Partial<Record<TacticType, string[]>> = {
  fork: [
    'Pieces are loosely coordinated here.',
    'Notice how the pieces are spread out.',
    'Multiple pieces are undefended.',
  ],
  pin: [
    'There\'s a vulnerable alignment on the board.',
    'A piece is stuck shielding something valuable.',
    'Look at how the pieces line up.',
  ],
  skewer: [
    'A valuable piece is exposed on an open line.',
    'The piece alignment creates a vulnerability.',
  ],
  discovered_attack: [
    'A piece is blocking a powerful line of attack.',
    'There\'s hidden energy behind one of the pieces.',
  ],
  back_rank: [
    'The king is boxed in on the back rank.',
    'The back rank is dangerously weak.',
  ],
  hanging_piece: [
    'Something is left undefended.',
    'Not everything is protected here.',
  ],
  promotion: [
    'A pawn is close to the finish line.',
    'The pawn structure creates an opportunity.',
  ],
};

export function drillTransition(tacticType: TacticType): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const setups = POSITION_SETUPS[tacticType];
  if (setups && setups.length > 0) {
    const setup = setups[Math.floor(Math.random() * setups.length)];
    return `${setup} Now find the ${tacticLabel}.`;
  }
  return `Study the position carefully. Now find the ${tacticLabel}.`;
}

export function drillCorrect(tacticType: TacticType): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const phrases = [
    `Well spotted! That's the ${tacticLabel}.`,
    `Excellent. You found the ${tacticLabel}.`,
    `That's it — the ${tacticLabel} wins material.`,
    `Sharp eyes. The ${tacticLabel} was the key move.`,
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function drillIncorrect(tacticType: TacticType): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  return `The ${tacticLabel} was available here. Study the position.`;
}

// ─── Position Context Helpers ─────────────────────────────────────────────

interface PositionContext {
  openFiles: string[];
  semiOpenFiles: string[];
  kingExposure: 'safe' | 'somewhat exposed' | 'exposed';
  materialBalance: string;
  pieceTensions: string[];
  phase: 'opening' | 'middlegame' | 'endgame';
}

const FILE_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function analyzePositionContext(fen: string, playerColor: 'white' | 'black'): PositionContext {
  const chess = new Chess(fen);
  const board = chess.board();
  const opponent = playerColor === 'white' ? 'black' : 'white';

  // Count material
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  let playerMaterial = 0;
  let opponentMaterial = 0;
  let totalPieces = 0;
  const playerPawnsOnFile: Record<string, number> = {};
  const opponentPawnsOnFile: Record<string, number> = {};

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      totalPieces++;
      const val = pieceValues[piece.type] ?? 0;
      const file = FILE_LETTERS[c];
      if (piece.color === playerColor[0]) {
        playerMaterial += val;
        if (piece.type === 'p') playerPawnsOnFile[file] = (playerPawnsOnFile[file] ?? 0) + 1;
      } else {
        opponentMaterial += val;
        if (piece.type === 'p') opponentPawnsOnFile[file] = (opponentPawnsOnFile[file] ?? 0) + 1;
      }
    }
  }

  // Open/semi-open files
  const openFiles: string[] = [];
  const semiOpenFiles: string[] = [];
  for (const f of FILE_LETTERS) {
    const hasFriendly = (playerPawnsOnFile[f] ?? 0) > 0;
    const hasEnemy = (opponentPawnsOnFile[f] ?? 0) > 0;
    if (!hasFriendly && !hasEnemy) openFiles.push(f);
    else if (!hasFriendly || !hasEnemy) semiOpenFiles.push(f);
  }

  // King exposure (simplified: count attackers around opponent king)
  let kingExposure: 'safe' | 'somewhat exposed' | 'exposed' = 'safe';
  const opponentKingSquare = findKingSquare(board, opponent);
  if (opponentKingSquare) {
    const shieldPawns = countPawnShield(board, opponentKingSquare, opponent);
    if (shieldPawns <= 1) kingExposure = 'exposed';
    else if (shieldPawns <= 2) kingExposure = 'somewhat exposed';
  }

  // Material balance
  const diff = playerMaterial - opponentMaterial;
  let materialBalance: string;
  if (diff > 3) materialBalance = 'You have a significant material advantage.';
  else if (diff > 0) materialBalance = 'You have a slight material edge.';
  else if (diff < -3) materialBalance = 'You are down material.';
  else if (diff < 0) materialBalance = 'You are slightly behind on material.';
  else materialBalance = 'Material is roughly equal.';

  // Piece tensions (pieces attacking each other)
  const tensions: string[] = [];
  const moves = chess.moves({ verbose: true });
  const captures = moves.filter((m) => m.captured);
  if (captures.length >= 4) tensions.push('Multiple pieces are in contact — the position is tense.');
  else if (captures.length >= 2) tensions.push('There are some active piece tensions on the board.');

  // Game phase
  let phase: 'opening' | 'middlegame' | 'endgame';
  if (totalPieces >= 28) phase = 'opening';
  else if (totalPieces >= 16) phase = 'middlegame';
  else phase = 'endgame';

  return { openFiles, semiOpenFiles, kingExposure, materialBalance, pieceTensions: tensions, phase };
}

function findKingSquare(board: ReturnType<Chess['board']>, color: string): { row: number; col: number } | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.type === 'k' && piece.color === color[0]) return { row: r, col: c };
    }
  }
  return null;
}

function countPawnShield(board: ReturnType<Chess['board']>, kingPos: { row: number; col: number }, color: string): number {
  const direction = color === 'white' ? -1 : 1; // pawns shield from the front
  let count = 0;
  const shieldRow = kingPos.row + direction;
  if (shieldRow < 0 || shieldRow > 7) return 0;
  for (let dc = -1; dc <= 1; dc++) {
    const col = kingPos.col + dc;
    if (col < 0 || col > 7) continue;
    const piece = board[shieldRow][col];
    if (piece?.type === 'p' && piece.color === color[0]) count++;
  }
  return count;
}

/** Build a position-aware intro narration for the setup trainer */
function describeSetupContext(
  fen: string,
  playerColor: 'white' | 'black',
  tacticType: TacticType,
): string {
  const ctx = analyzePositionContext(fen, playerColor);
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const parts: string[] = [];

  // Describe board state
  parts.push(ctx.materialBalance);

  // Tactic-specific positional cues
  if (tacticType === 'fork' || tacticType === 'double_attack') {
    parts.push('Look for pieces that are loosely placed or undefended.');
  } else if (tacticType === 'pin') {
    if (ctx.openFiles.length > 0) {
      parts.push(`The ${ctx.openFiles.slice(0, 2).join(' and ')} file${ctx.openFiles.length > 1 ? 's are' : ' is'} open — pieces can line up along them.`);
    } else {
      parts.push('Look for pieces aligned on the same file, rank, or diagonal.');
    }
  } else if (tacticType === 'skewer') {
    parts.push('A valuable piece might be in the line of fire.');
  } else if (tacticType === 'discovered_attack' || tacticType === 'discovered_check') {
    parts.push("One of your pieces is masking an attack. Moving it could unleash something powerful.");
  } else if (tacticType === 'back_rank') {
    if (ctx.kingExposure === 'exposed') {
      parts.push("The opponent's king is exposed on the back rank with little pawn cover.");
    } else {
      parts.push('The back rank could become vulnerable with the right preparation.');
    }
  } else if (tacticType === 'hanging_piece') {
    parts.push('Something on the board is unprotected. Find the move that exploits it.');
  } else if (tacticType === 'promotion') {
    parts.push('A passed pawn is close to promoting — clear the path.');
  } else if (tacticType === 'overloaded_piece') {
    parts.push('One of the opponent\'s pieces is doing too much. Add pressure to overload it.');
  } else if (tacticType === 'deflection') {
    parts.push('A key defender can be lured away from its post.');
  } else if (tacticType === 'attraction') {
    parts.push('You can force a piece to a bad square.');
  } else {
    if (ctx.pieceTensions.length > 0) {
      parts.push(ctx.pieceTensions[0]);
    } else {
      parts.push(`Study the position for ${tacticLabel} opportunities.`);
    }
  }

  // King exposure hint
  if (ctx.kingExposure === 'exposed' && tacticType !== 'back_rank') {
    parts.push("The opponent's king looks vulnerable.");
  }

  // Open file hint for rook/queen tactics
  if (ctx.openFiles.length > 0 && (tacticType === 'pin' || tacticType === 'skewer' || tacticType === 'back_rank')) {
    const files = ctx.openFiles.slice(0, 2).join(' and ');
    parts.push(`The open ${files} file${ctx.openFiles.length > 1 ? 's offer' : ' offers'} attacking chances.`);
  }

  return parts.join(' ');
}

// ─── Layer 3: Setup Narration ─────────────────────────────────────────────

export function setupIntro(
  tacticType: TacticType,
  difficulty: number,
  fen?: string,
  playerColor?: 'white' | 'black',
): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const moveText = difficulty === 1 ? 'one quiet move' : `${difficulty} quiet moves`;
  const taskLine = `Find ${moveText} that make the ${tacticLabel} inevitable.`;

  if (fen && playerColor) {
    const context = describeSetupContext(fen, playerColor, tacticType);
    return `${context} ${taskLine}`;
  }

  return taskLine;
}

export function setupCorrectPrep(remaining: number): string {
  if (remaining <= 0) return 'Setup complete! Watch the tactic unfold.';
  if (remaining === 1) return 'Good. One more prep move to go.';
  return `Correct. ${remaining} prep moves remaining.`;
}

export function setupRevealComplete(tacticType: TacticType): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  return `You engineered the ${tacticLabel}. That's deep calculation.`;
}

export function setupIncorrect(): string {
  return "That doesn't set up the tactic. Think about what the position needs.";
}

// ─── Layer 4: Create Narration ────────────────────────────────────────────

export function createIntro(
  opponentName: string | null,
  openingName: string | null,
  contextDepth: number,
  totalMoves: number,
): string {
  const parts: string[] = [];

  if (opponentName) {
    parts.push(`Let's replay your game against ${opponentName}.`);
  } else {
    parts.push("Let's replay your game.");
  }

  if (openingName) {
    parts.push(`The ${openingName}.`);
  }

  if (totalMoves >= 20) {
    parts.push('Stay alert. A tactic is hiding somewhere in this position.');
  } else if (contextDepth >= 15) {
    parts.push('Extended replay. Watch the position develop.');
  }

  return parts.join(' ');
}

export function createReplayNarration(
  san: string,
  isWhite: boolean,
  moveIndex: number,
  totalMoves: number,
): string | null {
  // For long replays, only narrate notable moves
  if (totalMoves > 10 && !isNotableMove(san, moveIndex, totalMoves)) {
    return null;
  }

  return describeMove(san, isWhite);
}

export function createTransition(): string {
  const phrases = [
    'A tactic is available. Can you find it?',
    "The tactic is here. It's your move.",
    'Something tactical is hiding in this position. Find it.',
    'Now — spot the tactic.',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function createCorrect(tacticType: TacticType, consecutiveSolves: number): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  if (consecutiveSolves >= 5) {
    return `Incredible. ${consecutiveSolves} in a row. You found the ${tacticLabel} through all that complexity.`;
  }
  if (consecutiveSolves >= 3) {
    return `The ${tacticLabel} — well done. Your alertness is improving.`;
  }
  return `You found the ${tacticLabel}. Good tactical awareness.`;
}

export function createIncorrect(tacticType: TacticType): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  return `The ${tacticLabel} was there. It's harder to spot after a long game — that's exactly what we're training.`;
}

export function createDepthIncrease(newDepth: number): string {
  if (newDepth >= 30) {
    return `Context depth is now ${newDepth} moves. You're replaying near-full games.`;
  }
  return `Context increasing to ${newDepth} moves.`;
}
