import { Chess } from 'chess.js';
import { classifyPhase, countMaterial } from './gamePhaseService';
import { assessPosition } from './positionAssessor';

/**
 * Live phase-transition detector for coach games. Emits at most one event
 * per phase boundary per game. Stateless per call — the caller owns the
 * "already fired" ledger so transitions are bounded to a single game.
 *
 * Signal priority (per WO-PHASE-NARRATION-01):
 *   1. Stockfish `gamePhase` — not currently emitted by the engine, so
 *      the detector relies on the synchronous classifyPhase / material
 *      fallback below. If stockfishEngine gains a phase hint later, wire
 *      it in as the primary signal and keep these as the fallback.
 *   2. Opening → middlegame: phase ≠ 'opening' AND student has castled
 *      AND student's rooks are connected.
 *   3. Middlegame → endgame: phase === 'endgame', OR queens are off the
 *      board, OR both sides have ≤ 1 rook AND queens are off.
 *
 * Never fires on coach moves. Never re-fires a boundary.
 */

export type PhaseTransitionKind = 'opening-to-middlegame' | 'middlegame-to-endgame';

export interface PhaseTransitionEvent {
  kind: PhaseTransitionKind;
  fen: string;
  /** Ply count (1-indexed, odd = white) as stored in CoachGameMove.moveNumber. */
  moveNumber: number;
  playerColor: 'white' | 'black';
  triggeringMoveSan: string;
}

export interface PhaseTransitionState {
  openingToMiddlegameFired: boolean;
  middlegameToEndgameFired: boolean;
}

export interface LastMoveSnapshot {
  fen: string;
  san: string;
  /** Ply count. Odd = white's move. */
  moveNumber: number;
  isCoachMove: boolean;
}

export function createPhaseTransitionState(): PhaseTransitionState {
  return {
    openingToMiddlegameFired: false,
    middlegameToEndgameFired: false,
  };
}

/** True when both student rooks sit on the back rank with no piece
 *  (including the king) between them. Uses chess.js for the board
 *  walk — cheap enough to run per move. */
export function rooksConnected(fen: string, color: 'white' | 'black'): boolean {
  let board: ReturnType<Chess['board']>;
  try {
    board = new Chess(fen).board();
  } catch {
    return false;
  }
  const rank = color === 'white' ? 7 : 0;
  const rookColor = color === 'white' ? 'w' : 'b';
  const row = board[rank];
  if (!row) return false;

  const rookFiles: number[] = [];
  for (let file = 0; file < 8; file++) {
    const sq = row[file];
    if (sq?.type === 'r' && sq.color === rookColor) rookFiles.push(file);
  }
  if (rookFiles.length < 2) return false;

  // Any piece (of any color) between the two rooks on the back rank
  // blocks the connection — including the king that hasn't castled or
  // a bishop/knight still at home.
  const [leftFile, rightFile] = [rookFiles[0], rookFiles[rookFiles.length - 1]];
  for (let file = leftFile + 1; file < rightFile; file++) {
    if (row[file] != null) return false;
  }
  return true;
}

/** Material-based fallback for the middlegame → endgame boundary.
 *  Fires when queens are off, or when both sides have ≤ 1 rook AND
 *  queens are off. Matches the WO spec verbatim. */
function isEndgameByMaterialFallback(fen: string): boolean {
  const board = fen.split(' ')[0] ?? '';
  let whiteQueens = 0;
  let blackQueens = 0;
  let whiteRooks = 0;
  let blackRooks = 0;
  for (const ch of board) {
    if (ch === 'Q') whiteQueens++;
    else if (ch === 'q') blackQueens++;
    else if (ch === 'R') whiteRooks++;
    else if (ch === 'r') blackRooks++;
  }
  const queensOff = whiteQueens === 0 && blackQueens === 0;
  if (queensOff && whiteRooks <= 1 && blackRooks <= 1) return true;
  if (queensOff) return true;
  return false;
}

/**
 * Detect a phase transition produced by the most recent STUDENT move.
 * Returns `null` when no transition should fire, otherwise returns the
 * event AND mutates `state` so the boundary is marked fired. Never
 * mutates state when returning null.
 */
export function detectPhaseTransition(
  lastMove: LastMoveSnapshot,
  state: PhaseTransitionState,
  playerColor: 'white' | 'black',
): PhaseTransitionEvent | null {
  // Only the student's moves trigger narration — coach moves don't.
  if (lastMove.isCoachMove) return null;

  const phase = classifyPhase(lastMove.fen, lastMove.moveNumber);

  // ── Opening → middlegame ─────────────────────────────────────────
  if (!state.openingToMiddlegameFired && phase !== 'opening') {
    let castled = false;
    try {
      const features = assessPosition(lastMove.fen);
      castled = playerColor === 'white'
        ? features.kingSafety.whiteCastled
        : features.kingSafety.blackCastled;
    } catch {
      castled = false;
    }
    const connected = rooksConnected(lastMove.fen, playerColor);
    if (castled && connected) {
      state.openingToMiddlegameFired = true;
      return {
        kind: 'opening-to-middlegame',
        fen: lastMove.fen,
        moveNumber: lastMove.moveNumber,
        playerColor,
        triggeringMoveSan: lastMove.san,
      };
    }
  }

  // ── Middlegame → endgame ─────────────────────────────────────────
  if (!state.middlegameToEndgameFired) {
    const inEndgame = phase === 'endgame' || isEndgameByMaterialFallback(lastMove.fen);
    if (inEndgame) {
      state.middlegameToEndgameFired = true;
      return {
        kind: 'middlegame-to-endgame',
        fen: lastMove.fen,
        moveNumber: lastMove.moveNumber,
        playerColor,
        triggeringMoveSan: lastMove.san,
      };
    }
  }

  return null;
}

/** Exposed for tests + future tuning — read-only view of the internal
 *  classifier so callers can understand why a detection fired or not. */
export function debugPhaseDiagnostics(fen: string, moveNumber: number): {
  phase: 'opening' | 'middlegame' | 'endgame';
  material: number;
  endgameByMaterialFallback: boolean;
} {
  return {
    phase: classifyPhase(fen, moveNumber),
    material: countMaterial(fen),
    endgameByMaterialFallback: isEndgameByMaterialFallback(fen),
  };
}
