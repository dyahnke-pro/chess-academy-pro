// blockade — THE PIECE IN FRONT OF THE PAWN (David 2026-11-17, the
// tie-everything build; Danya's speedruns: "you already have the dream: a
// blockading knight on d5" · "Black throws the rook to b8 to blockade the
// pawn" · "when your blockading knight leaves a square, re-check every break
// it used to prevent").
//
// The move `san` on `fenBefore`, either seat:
//   • SET — the piece that moved lands directly in front of an enemy passed
//     or isolated pawn (`findBlockades`, the one blockade read) and is safe
//     there by the legal exchange: the pawn cannot move.
//   • LIFTED — the piece that stood in front of such a pawn moves away and
//     leaves the square empty: the pawn can push again.
// Why that piece is a good blockader, said only where the board shows it: no
// pawn of the other side can ever come to kick it (`noPawnCanChallenge`, the
// one outpost test), a knight there still covers its squares (counted), and
// for a knight or bishop the other side has no bishop for that square's
// colour to challenge it.
//
// PURE: chess.js, the blockade read, the outpost test and the exchange count.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { findBlockades, legalSeeGainFor, type Blockade } from './positionReadingService';
import { noPawnCanChallenge, relativeRank } from './outpost';
import { sideToMoveAs } from './threatOut';
import { PIECE_NAMES } from '../types/tacticTypes';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface BlockadeRead {
  kind: 'set' | 'lifted';
  /** The side that blockades (or did). */
  side: Color;
  piece: PieceSymbol;
  /** Where the blockader stands (set) or stood (lifted). */
  square: Square;
  pawn: Square;
  passed: boolean;
  /** No pawn of the pawn's side can ever attack the blockade square. */
  unkickable: boolean;
  /** A knight's squares from the blockade square (set, a knight only). */
  knightSquares: number | null;
  /** The pawn's side has no bishop for the blockade square's colour (set, a
   *  knight or bishop only). */
  noBishop: 'light' | 'dark' | null;
  key: string;
}

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
/** A knight covering this many squares from its blockade square is still active. */
const KNIGHT_ACTIVE = 6;
const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** How many squares a knight on `sq` covers — the board's edge decides. */
function knightReach(sq: Square): number {
  const f = sq.charCodeAt(0) - 97;
  const r = Number(sq[1]) - 1;
  let n = 0;
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const x = f + df; const y = r + dr;
    if (x >= 0 && x < 8 && y >= 0 && y < 8) n += 1;
  }
  return n;
}

/** Can the pawn on `pawn` step forward on `fen`, with its side to move? */
function canPush(fen: string, pawn: Square): boolean {
  const c = new Chess(fen);
  const p = c.get(pawn);
  if (!p) return false;
  const f = sideToMoveAs(fen, p.color);
  if (!f) return false;
  // The step forward, and the pawn safe on its new square by the legal exchange.
  return new Chess(f).moves({ square: pawn, verbose: true }).some((m) => {
    if (m.captured) return false;
    const b = new Chess(f);
    b.move(m.san);
    return legalSeeGainFor(b.fen(), m.to, other(p.color)) <= 0;
  });
}

/** THE BLOCKADES WORTH A WORD. A knight or bishop in front of a passed pawn,
 *  or of an isolated centre pawn that has left its first square (the
 *  isolated queen's pawn and its neighbours — a rook's pawn at home is no
 *  blockade story); a rook or king in front of a passed pawn. A queen in front
 *  of a pawn is never the blockade lesson: it is the piece a blockade frees. */
function worthSaying(b: Blockade, pawnSide: Color): boolean {
  if (b.piece === 'q') return false;
  if (b.passed) return true;
  if (b.piece !== 'n' && b.piece !== 'b') return false;
  return 'cdef'.includes(b.pawn[0]) && relativeRank(b.pawn, pawnSide) >= 3;
}

export function blockade(fenBefore: string, san: string): BlockadeRead | null {
  let after: Chess;
  let mv;
  try { after = new Chess(fenBefore); mv = after.move(san.replace(/[!?]+$/, '')); } catch { return null; }
  // Mate or check is its own idea.
  if (after.isCheckmate()) return null;
  const fenAfter = after.fen();
  const mover = mv.color;
  const enemy = other(mover);

  // SET: the moved piece lands in front of their passed or isolated pawn.
  const set = findBlockades(fenAfter, mover).find((b) => b.blocker === mv.to && worthSaying(b, enemy));
  if (set && !findBlockades(fenBefore, mover).some((b) => b.blocker === set.blocker && b.pawn === set.pawn)) {
    if (legalSeeGainFor(fenAfter, set.blocker, enemy) <= 0) return setRead(after, set, mover);
  }

  // LIFTED: the blockader that stood in front of a passed pawn walks away,
  // quietly (a capture or a check is the move's own reason), and the pawn's
  // step forward is safe.
  if (mv.captured || after.inCheck()) return null;
  const was = findBlockades(fenBefore, mover).find((b) => b.blocker === mv.from && b.passed && worthSaying(b, enemy));
  if (was && !after.get(was.blocker) && after.get(was.pawn)?.type === 'p' && canPush(fenAfter, was.pawn)) {
    return {
      kind: 'lifted', side: mover, piece: was.piece, square: was.blocker, pawn: was.pawn, passed: was.passed,
      unkickable: false, knightSquares: null, noBishop: null,
      key: `blockade:lifted:${was.pawn}`,
    };
  }
  return null;
}

function setRead(after: Chess, b: Blockade, side: Color): BlockadeRead {
  const enemy = other(side);
  const minor = b.piece === 'n' || b.piece === 'b';
  const shade = after.squareColor(b.blocker) === 'light' ? 'light' : 'dark';
  const theirBishops = after.findPiece({ type: 'b', color: enemy });
  const noBishop = minor && !theirBishops.some((sq) => after.squareColor(sq) === shade) ? shade : null;
  return {
    kind: 'set', side, piece: b.piece, square: b.blocker, pawn: b.pawn, passed: b.passed,
    unkickable: noPawnCanChallenge(after, b.blocker, side),
    knightSquares: b.piece === 'n' ? knightReach(b.blocker) : null,
    noBishop,
    key: `blockade:set:${b.pawn}`,
  };
}

/** The blockade in words, from the student's seat: `own` is whose blockader
 *  it is. One idea a sentence; names only the blockader and the pawn. */
export function blockadeLine(b: BlockadeRead, own: 'your' | 'their', fenAfter: string): string {
  const key = stemKeyOf(fenAfter);
  const foe = own === 'your' ? 'their' : 'your';
  const Own = openSentence(own);
  const name = PIECE_NAMES[b.piece];
  const pawnWords = `${foe} ${b.passed ? 'passed' : 'isolated'} pawn on ${b.pawn}`;
  if (b.kind === 'lifted') {
    return rotateStem([
      `${Own} ${name} has left ${b.square}, so the blockade is gone. ${openSentence(pawnWords)} can push again.`,
      `That lifts the blockade: ${own} ${name} is no longer in front of ${pawnWords}, and the pawn is free to push.`,
    ], key);
  }
  const lead = rotateStem([
    `${Own} ${name} on ${b.square} blockades ${pawnWords}.`,
    `${Own} ${name} on ${b.square} sits right in front of ${pawnWords}.`,
  ], key);
  const theirs = foe === 'your' ? 'yours' : 'theirs';
  const hold = b.unkickable
    ? `The pawn can't move, and no pawn of ${theirs} can ever come to kick the ${name} off.`
    : `The pawn can't move while the ${name} stays there.`;
  const reasons: string[] = [lead, hold];
  // A knight in the middle still reaches most of its squares; on the rim it
  // does not, and that is no reason to praise it.
  if (b.knightSquares !== null && b.knightSquares >= KNIGHT_ACTIVE) reasons.push(`From there the knight still covers ${NUMBER[b.knightSquares]} squares, so it blocks without going passive.`);
  if (b.noBishop) reasons.push(`${openSentence(foe === 'your' ? 'you' : 'they')} have no bishop for the ${b.noBishop} squares to challenge it.`);
  reasons.push(b.passed
    ? rotateStem([
      'While the blockade holds, the passed pawn goes nowhere.',
      `The passed pawn is stopped for as long as the ${name} stays.`,
    ], key)
    : rotateStem([
      'The isolated pawn is stuck where it stands.',
      'The isolated pawn is fixed on its square.',
    ], key));
  return reasons.join(' ');
}
