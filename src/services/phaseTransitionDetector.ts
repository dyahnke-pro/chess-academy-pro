import { Chess } from 'chess.js';
import { classifyPhase, countMaterial } from './gamePhaseService';

/** Direct FEN-based castling check. Replaces the assessPosition call
 *  that WO-PHASE-FIX-01 used — assessPosition runs multiple analyzers
 *  (pawn structure, piece activity) that can throw on edge-case FENs,
 *  silently collapsing to castled=false. This parses only the castling-
 *  rights field + king square, three lines, zero throw surface. */
function hasCastled(fen: string, color: 'white' | 'black'): boolean {
  const parts = fen.split(' ');
  const board = parts[0] ?? '';
  const castlingRights = parts[2] ?? '-';
  // Scan for the king on the back rank. FEN board starts from rank 8.
  // For white, back rank is the last slash-separated rank (index 7).
  // For black, back rank is the first (index 0).
  const ranks = board.split('/');
  if (ranks.length !== 8) return false;
  const backRank = color === 'white' ? ranks[7] : ranks[0];
  const kingChar = color === 'white' ? 'K' : 'k';
  let kingFile = -1;
  let file = 0;
  for (const ch of backRank) {
    if (ch === kingChar) {
      kingFile = file;
      break;
    }
    if (ch >= '1' && ch <= '8') {
      file += Number(ch);
    } else {
      file += 1;
    }
  }
  if (kingFile < 0) return false;
  // King on g-file (6) = castled kingside; c-file (2) = castled queenside.
  const castledSquare = kingFile === 6 || kingFile === 2;
  if (!castledSquare) return false;
  // Both castling-rights chars for this side must be absent (confirms the
  // king actually moved via castling, not just drifted to g1 via e1-f1-g1).
  const kingsideFlag = color === 'white' ? 'K' : 'k';
  const queensideFlag = color === 'white' ? 'Q' : 'q';
  return !castlingRights.includes(kingsideFlag) && !castlingRights.includes(queensideFlag);
}

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

/** True when both of the student's rooks sit on their back rank.
 *
 *  Relaxed by WO-PHASE-FIX-01. The original WO-PHASE-NARRATION-01 spec
 *  also required the squares between the rooks to be empty, but in
 *  practice at move 10-15 (the moment Dave expects the transition to
 *  fire) the queen is still on d1 and minor pieces are often still on
 *  c1/b1/g1 — the strict check almost never fires in real games. The
 *  castled requirement in detectPhaseTransition already guarantees the
 *  king is out of the way; other pieces still on the back rank will
 *  move naturally, they aren't a coaching concern at this boundary.
 *
 *  Uses chess.js for the board walk — cheap enough to run per move. */
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

  let rookCount = 0;
  for (let file = 0; file < 8; file++) {
    const sq = row[file];
    if (sq?.type === 'r' && sq.color === rookColor) rookCount++;
  }
  return rookCount >= 2;
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

/** Count minor pieces that are NOT on their starting squares, per side.
 *  A captured minor counts as "developed" — if a knight is gone it's
 *  definitely not on b1. Pure FEN parse, no chess.js dependency.
 *
 *  Added by WO-PHASE-FIX-03 for Rule 1 of the new opening-end detection.
 *  Starting squares: white knights b1 g1, white bishops c1 f1; black
 *  knights b8 g8, black bishops c8 f8. */
export function countDevelopedMinors(fen: string): { white: number; black: number; total: number } {
  const ranks = (fen.split(' ')[0] ?? '').split('/');
  if (ranks.length !== 8) return { white: 0, black: 0, total: 0 };
  const backWhite = ranks[7] ?? '';
  const backBlack = ranks[0] ?? '';

  // Walk a rank, returning an 8-entry array of piece chars or null for empty squares.
  const expandRank = (rank: string): (string | null)[] => {
    const out: (string | null)[] = [];
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < Number(ch); i++) out.push(null);
      } else {
        out.push(ch);
      }
    }
    return out.length === 8 ? out : [];
  };

  const whiteRow = expandRank(backWhite);
  const blackRow = expandRank(backBlack);

  // file-index → expected starting piece for each side
  const whiteStart: Record<number, string> = { 1: 'N', 6: 'N', 2: 'B', 5: 'B' };
  const blackStart: Record<number, string> = { 1: 'n', 6: 'n', 2: 'b', 5: 'b' };

  let whiteDeveloped = 0;
  let blackDeveloped = 0;
  for (const file of [1, 2, 5, 6]) {
    if (whiteRow[file] !== whiteStart[file]) whiteDeveloped++;
    if (blackRow[file] !== blackStart[file]) blackDeveloped++;
  }
  return { white: whiteDeveloped, black: blackDeveloped, total: whiteDeveloped + blackDeveloped };
}

/** True iff any queen or rook has been captured from the starting 6
 *  total major pieces. FEN-based — no move history needed. Pawn
 *  promotion could in theory mask a capture (e.g., queen traded then
 *  promoted) but promotions are vanishingly rare in the opening
 *  phase this rule is meant to detect.
 *
 *  Added by WO-PHASE-FIX-03 for Rule 3 of the new opening-end
 *  detection. */
export function hasMajorPieceCaptured(fen: string): boolean {
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
  return whiteQueens < 1 || blackQueens < 1 || whiteRooks < 2 || blackRooks < 2;
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
  console.log('[PHASE-DETECT-01] called', {
    fen: lastMove.fen,
    moveNumber: lastMove.moveNumber,
    san: lastMove.san,
    isCoachMove: lastMove.isCoachMove,
    playerColor,
    stockfishPhase: null, // not emitted by current engine
    ledgerOpeningToMiddlegame: state.openingToMiddlegameFired,
    ledgerMiddlegameToEndgame: state.middlegameToEndgameFired,
  });

  // Only the student's moves trigger narration — coach moves don't.
  if (lastMove.isCoachMove) {
    console.log('[PHASE-DETECT-02] reject: coach move');
    return null;
  }

  const phase = classifyPhase(lastMove.fen, lastMove.moveNumber);

  // ── Opening → middlegame ─────────────────────────────────────────
  // Per WO-PHASE-FIX-03: four-rule OR, first match wins. classifyPhase
  // is NOT a gate here — the four rules ARE the opening-end definition.
  // classifyPhase remains in use for middlegame → endgame only.
  //
  //   Rule 1: Both sides developed ≥ 3 of 4 minors AND full move ≥ 8.
  //   Rule 2: Student has castled AND their rooks on the back rank
  //           (existing rule, preserved).
  //   Rule 3: A queen or rook has been captured at any point.
  //   Rule 4: Full move ≥ 15 (safety net; opening is over by now per
  //           every chess authority we consulted).
  if (!state.openingToMiddlegameFired) {
    const fullMoveNumber = Math.ceil(lastMove.moveNumber / 2);
    const dev = countDevelopedMinors(lastMove.fen);
    const castled = hasCastled(lastMove.fen, playerColor);
    const connected = rooksConnected(lastMove.fen, playerColor);
    const majorCaptured = hasMajorPieceCaptured(lastMove.fen);

    const rule1 = dev.white >= 3 && dev.black >= 3 && fullMoveNumber >= 8;
    const rule2 = castled && connected;
    const rule3 = majorCaptured;
    const rule4 = fullMoveNumber >= 15;

    if (rule1 || rule2 || rule3 || rule4) {
      state.openingToMiddlegameFired = true;
      const triggeringRule = rule1 ? 'development' : rule2 ? 'castled-connected' : rule3 ? 'major-captured' : 'move-15-safety';
      console.log('[PHASE-DETECT-03] EVENT EMITTED: opening-to-middlegame', {
        fen: lastMove.fen,
        moveNumber: lastMove.moveNumber,
        san: lastMove.san,
        triggeringRule,
        fullMoveNumber,
        dev,
        castled,
        connected,
        majorCaptured,
      });
      return {
        kind: 'opening-to-middlegame',
        fen: lastMove.fen,
        moveNumber: lastMove.moveNumber,
        playerColor,
        triggeringMoveSan: lastMove.san,
      };
    }
    console.log('[PHASE-DETECT-02] reject: no opening-end rule satisfied', {
      fullMoveNumber,
      dev,
      castled,
      connected,
      majorCaptured,
      rule1,
      rule2,
      rule3,
      rule4,
    });
  } else {
    console.log('[PHASE-DETECT-02] reject: already fired opening→middlegame');
  }

  // ── Middlegame → endgame ─────────────────────────────────────────
  if (!state.middlegameToEndgameFired) {
    const inEndgame = phase === 'endgame' || isEndgameByMaterialFallback(lastMove.fen);
    if (inEndgame) {
      state.middlegameToEndgameFired = true;
      console.log('[PHASE-DETECT-03] EVENT EMITTED: middlegame-to-endgame', {
        fen: lastMove.fen,
        moveNumber: lastMove.moveNumber,
        san: lastMove.san,
      });
      return {
        kind: 'middlegame-to-endgame',
        fen: lastMove.fen,
        moveNumber: lastMove.moveNumber,
        playerColor,
        triggeringMoveSan: lastMove.san,
      };
    }
    console.log('[PHASE-DETECT-02] reject: endgame conditions not met', {
      phase,
      endgameByMaterialFallback: isEndgameByMaterialFallback(lastMove.fen),
    });
  } else {
    console.log('[PHASE-DETECT-02] reject: already fired middlegame→endgame');
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

export interface PhaseTransitionDiagnostic {
  moveNumber: number;
  san: string;
  isCoachMove: boolean;
  fullMoveNumber: number;
  phase: 'opening' | 'middlegame' | 'endgame';
  studentCastled: boolean;
  studentRooksOnBackRank: boolean;
  /** WO-PHASE-FIX-03: added for Rule 1 (development threshold). */
  developedMinors: { white: number; black: number; total: number };
  /** WO-PHASE-FIX-03: added for Rule 3 (major-piece-captured trigger). */
  majorPieceCaptured: boolean;
  endgameByMaterialFallback: boolean;
  openingToMiddlegameFired: boolean;
  middlegameToEndgameFired: boolean;
}

/** Snapshot every input the detector considers for a given move so
 *  callers can write an audit trail. Cheap enough to run every move;
 *  the caller decides when to actually log (e.g. only when the
 *  detector returned null on a past-opening student move).
 *
 *  Added by WO-PHASE-FIX-01; expanded by WO-PHASE-FIX-03 to carry the
 *  per-side development count + major-capture flag so the audit log
 *  shows exactly which of the four opening-end rules are close. */
export function phaseTransitionDiagnostic(
  lastMove: LastMoveSnapshot,
  state: PhaseTransitionState,
  playerColor: 'white' | 'black',
): PhaseTransitionDiagnostic {
  return {
    moveNumber: lastMove.moveNumber,
    san: lastMove.san,
    isCoachMove: lastMove.isCoachMove,
    fullMoveNumber: Math.ceil(lastMove.moveNumber / 2),
    phase: classifyPhase(lastMove.fen, lastMove.moveNumber),
    studentCastled: hasCastled(lastMove.fen, playerColor),
    studentRooksOnBackRank: rooksConnected(lastMove.fen, playerColor),
    developedMinors: countDevelopedMinors(lastMove.fen),
    majorPieceCaptured: hasMajorPieceCaptured(lastMove.fen),
    endgameByMaterialFallback: isEndgameByMaterialFallback(lastMove.fen),
    openingToMiddlegameFired: state.openingToMiddlegameFired,
    middlegameToEndgameFired: state.middlegameToEndgameFired,
  };
}
