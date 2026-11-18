// initiativeRead — WHO IS MAKING THE THREATS (WO-DANYA-READS-01 #2, 2026-11-18).
//
// Danya's "White's initiative rages on", "the tables have turned", "Black has
// the initiative" on boards the engine calls level: the side that keeps
// making threats the other side has to answer. The engine's number cannot say
// it, and the board read had nothing to say it with.
//
// Read off the engine's own best line: each move in its first plies is
// FORCING when it gives check or leaves a new threat — after it, the mover
// could win material (the legal exchange) it could not win before, or mate in
// one. A side has the initiative when at least two of its moves in the line
// are forcing and it makes at least two more forcing moves than the other side
// (an exchange of checks is nobody's initiative). What each forcing move hit is
// kept, so the read names the targets: "their moves keep hitting your king and
// your knight on c6".
//
// PURE: chess.js and the engine's line handed in. Dual use: the initiative a
// lesson shows the student holding is the initiative a review shows them
// letting go.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { asIfToMove, legalSeeGainFor } from './positionReadingService';
import { andList } from '../utils/andList';
import { rotateStem } from '../utils/rotateStem';
import { CAPTURE_VALUE } from './pieceValues';

/** One engine line: UCI moves from the board's side to move. */
export interface InitiativeLine { moves: readonly string[] }

export interface ForcingMove {
  /** The move, SAN, as played in the line. */
  san: string;
  side: Color;
  kind: 'check' | 'threat';
  /** What it hits: the king for a check or a mate threat, else the piece it
   *  could now win. */
  target: { square: Square; piece: PieceSymbol };
}

export interface Initiative {
  /** The side with the initiative. */
  side: Color;
  /** Its forcing moves in the line, in order. */
  forcing: ForcingMove[];
  /** How many forcing moves the other side made in the same plies. */
  otherForcing: number;
  squares: Square[];
}

/** How many plies of the line are read: the next three moves of each side —
 *  far enough to see a run of threats, near enough that the line is still the
 *  engine's best play rather than a guess. */
export const INITIATIVE_PLIES = 6;

const VALUE = CAPTURE_VALUE;

/** What `side` could win on `fen` if it were its move, on one enemy piece:
 *  the legal exchange's gain on its square (0 when nothing of `side`'s hits
 *  it). */
function gainOn(as: string, board: Chess, sq: Square, side: Color): number {
  if (board.attackers(sq, side).length === 0) return 0;
  return legalSeeGainFor(as, sq, side);
}

/** The enemy pieces (not pawns — taking a pawn never wins more than the
 *  pawn) `side` could win a piece's worth on, `fen` with `side` to move. */
function winnable(fen: string, side: Color): Map<Square, { piece: PieceSymbol; gain: number }> {
  const out = new Map<Square, { piece: PieceSymbol; gain: number }>();
  const as = asIfToMove(fen, side);
  if (!as) return out;
  let board: Chess;
  try { board = new Chess(as); } catch { return out; }
  for (const row of board.board()) for (const cell of row) {
    if (!cell || cell.color === side || cell.type === 'k' || cell.type === 'p') continue;
    const g = gainOn(as, board, cell.square, side);
    if (g >= 3) out.set(cell.square, { piece: cell.type, gain: g });
  }
  return out;
}

/** The gain `side` has on `sq` of `fen` (with `side` to move). */
function gainAt(fen: string, sq: Square, side: Color): number {
  const as = asIfToMove(fen, side);
  if (!as) return 0;
  try { return gainOn(as, new Chess(as), sq, side); } catch { return 0; }
}

/** Could `side` mate in one on `fen` if it were its move? (chess.js marks a
 *  mating move with '#'.) */
function mateThreat(fen: string, side: Color): boolean {
  const as = asIfToMove(fen, side);
  if (!as) return false;
  try { return new Chess(as).moves().some((m) => m.endsWith('#')); } catch { return false; }
}

function kingSquare(board: Chess, color: Color): Square | null {
  for (const row of board.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === color) return cell.square;
  return null;
}

/** Each forcing move in the first `INITIATIVE_PLIES` of `line` from `fen`. */
export function forcingMoves(fen: string, line: readonly string[]): ForcingMove[] {
  const out: ForcingMove[] = [];
  let board: Chess;
  try { board = new Chess(fen); } catch { return out; }
  for (const uci of line.slice(0, INITIATIVE_PLIES)) {
    const side = board.turn();
    const enemy: Color = side === 'w' ? 'b' : 'w';
    const before = board.fen();
    let san: string;
    try { san = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined }).san; } catch { break; }
    const after = board.fen();
    if (board.inCheck()) {
      const k = kingSquare(board, enemy);
      if (k) out.push({ san, side, kind: 'check', target: { square: k, piece: 'k' } });
      continue;
    }
    if (board.isGameOver()) break;
    // A capture that does not check is the trade going on or material taken,
    // not a threat made; a king that walks up to a piece is an ending's march,
    // not an initiative.
    const played = board.history({ verbose: true }).at(-1);
    if (played?.captured || played?.piece === 'k') continue;
    // A NEW threat: after the move it could mate, or win material it could
    // not win before (the gain it already had does not count — a hanging
    // piece left hanging is not a threat this move made).
    if (mateThreat(after, side) && !mateThreat(before, side)) {
      const k = kingSquare(board, enemy);
      if (k) out.push({ san, side, kind: 'threat', target: { square: k, piece: 'k' } });
      continue;
    }
    let hit: { square: Square; piece: PieceSymbol; gain: number } | null = null;
    // A threat worth answering wins a piece (three points or more); a pawn
    // to be won is a target, not the initiative.
    for (const [sq, w] of winnable(after, side)) {
      if (gainAt(before, sq, side) >= w.gain) continue;
      if (!hit || w.gain > hit.gain || (w.gain === hit.gain && VALUE[w.piece] > VALUE[hit.piece])) hit = { square: sq, ...w };
    }
    if (hit) out.push({ san, side, kind: 'threat', target: { square: hit.square, piece: hit.piece } });
  }
  return out;
}

/** The side with the initiative in the engine's best line from `fen`, or null
 *  when neither side is forcing the play. `lines`: the engine's lines from
 *  `fen`, best first (only the best is read). */
export function initiativeRead(fen: string, lines: readonly InitiativeLine[]): Initiative | null {
  if (lines.length === 0 || lines[0].moves.length === 0) return null;
  const line = lines[0].moves;
  const forcing = forcingMoves(fen, line);
  for (const side of ['w', 'b'] as const) {
    const mine = forcing.filter((f) => f.side === side);
    const theirs = forcing.length - mine.length;
    if (mine.length >= 2 && mine.length >= theirs + 2) {
      const squares = [...new Set(mine.map((f) => f.target.square))];
      return { side, forcing: mine, otherForcing: theirs, squares };
    }
  }
  return null;
}

const NOUN: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The initiative said from the student's seat, leading with what the moves
 *  hit: "You have the initiative: your moves keep hitting their king and
 *  their knight on c6, and they have to answer each one." Rotated on the
 *  board (`key`). */
export function initiativeLine(i: Initiative, student: Color, key: number): string {
  const mine = i.side === student;
  const owner = mine ? 'their' : 'your';
  // The pieces hit, each once (a queen chased from square to square is one
  // target); with three squares or more the pieces are named without them —
  // the board lights where.
  const hit: ForcingMove['target'][] = [];
  for (const f of i.forcing) {
    const same = hit.find((t) => t.square === f.target.square || (t.piece === f.target.piece && (t.piece === 'k' || t.piece === 'q')));
    if (!same) hit.push(f.target);
  }
  const squared = hit.filter((t) => t.piece !== 'k').length <= 2;
  const targets = hit.map((t) => (t.piece === 'k' ? `${owner} king` : squared ? `${owner} ${NOUN[t.piece]} on ${t.square}` : `${owner} ${NOUN[t.piece]}`));
  const hits = andList(targets);
  const stems = mine
    ? [
      `You have the initiative: your moves keep hitting ${hits}, and they have to answer each one.`,
      `The initiative is yours. Your moves keep coming with threats, against ${hits}, and they are always answering.`,
    ]
    : [
      `They have the initiative: their moves keep hitting ${hits}, and you have to answer each one.`,
      `The initiative is theirs. Their moves keep coming with threats, against ${hits}, and you are always answering.`,
    ];
  return rotateStem(stems, key);
}
