import { tacticTypeLabel } from './tacticalProfileService';
import type { TacticType } from '../types';
import { rotateStem } from '../utils/rotateStem';

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

/** @param key  STABLE rotation key (puzzle index, attempt count) — REQUIRED so
 *   the caller decides what is stable about this moment. */
export function drillTransition(tacticType: TacticType, key: number): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const setups = POSITION_SETUPS[tacticType];
  if (setups && setups.length > 0) {
    const setup = rotateStem(setups, key);
    return `${setup} Now find the ${tacticLabel}.`;
  }
  return `Study the position carefully. Now find the ${tacticLabel}.`;
}

/**
 * @param key  STABLE rotation key — see `drillTransition`.
 *
 * ⚠️ ZERO production callers (measured 2026-09-19), and that is load-bearing
 * here: its stems are "Well spotted!", "Excellent." — per-solve ACKNOWLEDGMENT,
 * which Narration Voice Rule 5 bans outright ("the position changing in the
 * student's favor IS the acknowledgment"). It is left in place rather than
 * rewritten because nothing speaks it; wiring it up means rewriting the stems
 * first, not just passing a key.
 */
export function drillCorrect(tacticType: TacticType, key: number): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const phrases = [
    `Well spotted! That's the ${tacticLabel}.`,
    `Excellent. You found the ${tacticLabel}.`,
    `That's it — the ${tacticLabel} wins material.`,
    `Sharp eyes. The ${tacticLabel} was the key move.`,
  ];
  return rotateStem(phrases, key);
}

export function drillIncorrect(tacticType: TacticType): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  return `The ${tacticLabel} was available here. Study the position.`;
}

// ─── Layer 3: Setup Narration ─────────────────────────────────────────────

/**
 * @param key  STABLE rotation key — the puzzle's place in the session (0, 1,
 *   2…). REQUIRED: two setup puzzles of the same theme back to back used to
 *   speak the IDENTICAL intro, which voiceService's say-once ledger then
 *   dropped, so the second puzzle opened in silence (hand walk 2026-10-03).
 *   Consecutive keys always draw different stems, so the intro always speaks.
 */
export function setupIntro(tacticType: TacticType, difficulty: number, key: number): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const depth = difficulty >= 3 ? ' — calculate it all the way out' : '';
  const stems = [
    `The quiet move comes first. Set up the ${tacticLabel}, then play it to the end${depth}.`,
    `No capture, no check to start. Find the move that prepares the ${tacticLabel}, then finish it${depth}.`,
    `One quiet move makes the ${tacticLabel} possible. Find it, then play the ${tacticLabel} out${depth}.`,
    `Prepare first, strike second. Your quiet move sets up the ${tacticLabel}${depth}.`,
  ];
  return rotateStem(stems, key);
}

/** What to look for, per motif — the IDEA of the tactic, never a square. */
const SETUP_LOOK_FOR: Partial<Record<TacticType, string>> = {
  fork: 'a square where one piece can hit two targets at once',
  pin: 'a line where a piece is stuck shielding something more valuable behind it',
  skewer: 'a line where a valuable piece stands in front of another one',
  discovered_attack: 'a piece that can step off a line and uncover an attack behind it',
  back_rank: 'a king boxed in on its back rank with no escape square',
  hanging_piece: 'a piece that is not defended, or can be cut off from its defender',
  promotion: 'a pawn that can be cleared toward its promotion square',
  deflection: 'a defender you can lure away from what it guards',
  overloaded_piece: 'a defender with two jobs at once',
  trapped_piece: 'a piece with no safe squares left once you take one more away',
  clearance: 'a square or line one of your own pieces is blocking',
  interference: 'a line between two enemy pieces you can cut',
  zwischenzug: 'an in-between move that changes what the obvious reply does',
  x_ray: 'a piece whose power runs through another piece on the same line',
  double_check: 'a way to give check with two pieces at once',
  removing_the_guard: 'the one defender holding the position together',
  checkmate: 'the squares around the king and which of them are covered',
};

/**
 * HINT TIER 1 — the IDEA only (hand walk 2026-10-03: the setup hint handed over
 * the full move on the first tap). Names the motif and what to look for; never
 * a square, never a piece, never a move. Computed from the puzzle's own tactic
 * type (G0) — no model is asked anything.
 */
export function setupHintIdea(tacticType: TacticType, isSetupMove: boolean): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const lookFor = SETUP_LOOK_FOR[tacticType] ?? 'the most forcing follow-up once your pieces are in place';
  return isSetupMove
    ? `The ${tacticLabel} is not there yet — your first move is quiet: no capture, no check. Look for ${lookFor}.`
    : `Keep the ${tacticLabel} going. Look for ${lookFor}.`;
}

/**
 * HINT TIER 2 — the piece that moves (its square is highlighted on the board),
 * still no destination. `pieceName` is read off the board by the caller.
 */
export function setupHintPiece(tacticType: TacticType, pieceName: string | null, isSetupMove: boolean): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  const piece = pieceName ? `Your ${pieceName}` : 'The highlighted piece';
  return isSetupMove
    ? `${piece} makes the quiet move. Where can it go to set up the ${tacticLabel}?`
    : `${piece} moves next. Where can it go?`;
}

/** Spoken once the quiet setup move lands — now the tactic is on. */
export function setupPrepPlanted(tacticType: TacticType): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  return `The setup's in. Now calculate the ${tacticLabel}.`;
}

export function setupRevealComplete(tacticType: TacticType): string {
  const tacticLabel = tacticTypeLabel(tacticType).toLowerCase();
  return `You calculated the ${tacticLabel} to the finish.`;
}

export function setupIncorrect(): string {
  return "That doesn't lead to the tactic. Look for the quiet move that sets it up.";
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
    parts.push(`Replay your game against ${opponentName}.`);
  } else {
    parts.push('Replay your game.');
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

/** @param key  STABLE rotation key — see `drillTransition`. */
export function createTransition(key: number): string {
  const phrases = [
    'A tactic is available. Can you find it?',
    "The tactic is here. It's your move.",
    'Something tactical is hiding in this position. Find it.',
    'Now — spot the tactic.',
  ];
  return rotateStem(phrases, key);
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
  return `The ${tacticLabel} was there. It's harder to spot after a long game — and that is exactly what you are training here.`;
}

export function createDepthIncrease(newDepth: number): string {
  if (newDepth >= 30) {
    return `Context depth is now ${newDepth} moves. You're replaying near-full games.`;
  }
  return `Context increasing to ${newDepth} moves.`;
}
