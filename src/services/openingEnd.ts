/**
 * openingEnd — WHEN THE OPENING IS OVER, defined once (David 2026-10-10: "we
 * already define when the opening is done"). The seven rules were written
 * inside `detectPhaseTransition` as "the opening-end definition"; three other
 * phase readers each carried a different one (a 10-move cutoff in
 * `classifyPhase`, three of the seven in `boardConcepts.phaseOfBoard`, a
 * 16-ply fallback). They all read `openingIsOver` now. A leaf: chess.js only.
 */
import { Chess } from 'chess.js';

/** Direct FEN-based castling check. Replaces the assessPosition call
 *  that WO-PHASE-FIX-01 used — assessPosition runs multiple analyzers
 *  (pawn structure, piece activity) that can throw on edge-case FENs,
 *  silently collapsing to castled=false. This parses only the castling-
 *  rights field + king square, three lines, zero throw surface. */
export function hasCastled(fen: string, color: 'white' | 'black'): boolean {
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
 * True iff both d-pawns AND both e-pawns have left their starting
 * squares (moved or captured). When the central tension is resolved
 * and minor pieces are out, the position is structurally past opening
 * even when neither side has castled — the WO-PHASE-FIX-02 fix for
 * games where the king stays central.
 *
 * Pawns at game start: white d2 e2, black d7 e7. We just check those
 * four FEN squares; promotion to a pawn isn't legal so a missing pawn
 * here is unambiguous.
 */
export function centralPawnsResolved(fen: string): boolean {
  const board = fen.split(' ')[0] ?? '';
  const ranks = board.split('/');
  if (ranks.length !== 8) return false;
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
  // FEN ranks are stored 8..1 top-down; rank index 0 = rank 8, index 6 = rank 2, index 1 = rank 7.
  const rank2 = expandRank(ranks[6] ?? '');
  const rank7 = expandRank(ranks[1] ?? '');
  if (rank2.length !== 8 || rank7.length !== 8) return false;
  // file index: a=0, b=1, c=2, d=3, e=4, ...
  const whiteDPawnGone = rank2[3] !== 'P';
  const whiteEPawnGone = rank2[4] !== 'P';
  const blackDPawnGone = rank7[3] !== 'p';
  const blackEPawnGone = rank7[4] !== 'p';
  return whiteDPawnGone && whiteEPawnGone && blackDPawnGone && blackEPawnGone;
}

/**
 * THE OPENING IS OVER when any of the seven holds (WO-PHASE-FIX-02/03):
 *  1. both sides have developed at least 3 of 4 minors, move 8 or later;
 *  2. the side named has castled with its rooks connected (`'either'`: one
 *     side has — for a board with no student, a review or a stat);
 *  3. a queen or a rook has been captured;
 *  4. move 15 or later (the safety net);
 *  5. the central pawns are resolved and 5+ minors are developed;
 *  6. either side has all 4 minors out, move 10 or later;
 *  7. move 12 or later and 5+ minors developed.
 */
export type OpeningEndRule =
  | 'development' | 'castled-connected' | 'major-captured' | 'move-15-safety'
  | 'central-pawns-resolved' | 'asymmetric-full-development' | 'early-tempo';

/** Which of the seven ended the opening, first match wins; null while it
 *  lasts. */
export function openingEndRule(fen: string, fullMove: number, side: 'white' | 'black' | 'either'): OpeningEndRule | null {
  const dev = countDevelopedMinors(fen);
  const castledFor = (c: 'white' | 'black'): boolean => hasCastled(fen, c) && rooksConnected(fen, c);
  if (dev.white >= 3 && dev.black >= 3 && fullMove >= 8) return 'development';
  if (side === 'either' ? castledFor('white') || castledFor('black') : castledFor(side)) return 'castled-connected';
  if (hasMajorPieceCaptured(fen)) return 'major-captured';
  if (fullMove >= 15) return 'move-15-safety';
  if (centralPawnsResolved(fen) && dev.total >= 5) return 'central-pawns-resolved';
  if ((dev.white >= 4 || dev.black >= 4) && fullMove >= 10) return 'asymmetric-full-development';
  if (fullMove >= 12 && dev.total >= 5) return 'early-tempo';
  return null;
}

export function openingIsOver(fen: string, fullMove: number, side: 'white' | 'black' | 'either'): boolean {
  return openingEndRule(fen, fullMove, side) !== null;
}
