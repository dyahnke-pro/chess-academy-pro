// minorMatchup — KNIGHT AGAINST BISHOP: WHICH MINOR IS BETTER, AND WHY (David
// 2026-11-17, the tie-everything build). Points call a knight and a bishop
// even; the board does not. One side keeps a knight, the other a bishop, and
// the pawns decide which one is worth more:
//   • the KNIGHT, when its bishop is bad (shut in behind its own pawns,
//     `findPieceQuality`'s bad-bishop note, its blockers from
//     `bishopBlockingPawns`), or when the board is CLOSED (two or more pairs of
//     pawns locked, `lockedPawnPairs`) and the knight has an outpost to stand on
//     (`isOutpost`) or to reach (`holeTargets`) — a knight on the rim is never
//     the better piece;
//   • the BISHOP, when the board is OPEN (no pawns locked), there are pawns on
//     both wings, the bishop is free (a forward diagonal open) and the knight
//     has no outpost to stand on or reach.
// Mixed boards say nothing. And the endgame fact beside it: a bishop and a
// rook's pawn against the lone king, the bishop the WRONG colour for the
// queening corner and the defending king in it — a draw
// (`detectRookPawnCorner`, its sentence `wrongBishopDrawText`).
//
// Said on the move that MAKES it, either seat: the trade that leaves knight
// against bishop (settled — the side to move takes no minor back), or the move
// that turns the verdict. `minorMatchupOn` is the standing read of a board.
// Reuses, never copies: the bad bishop and the outpost are the readers every
// other surface uses; `oppositeBishops` is the sibling (bishop against bishop).
// PURE: chess.js and the position readers.
import { Chess, type Color, type Square } from 'chess.js';
import { bishopBlockingPawns, findPieceQuality, holeTargets, signedLegalSeeFor } from './positionReadingService';
import { isOutpost } from './outpost';
import { lockedPawnPairs } from './boardStructure';
import { detectRookPawnCorner, wrongBishopDrawText } from './endgameTechnique';
import { andList, fileList } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

type Own = 'your' | 'their';

export interface MinorMatchupBoard {
  knight: { square: Square; color: Color };
  bishop: { square: Square; color: Color };
  better: 'knight' | 'bishop';
  /** The bishop's own pawns that shut it in, when it is bad. */
  badBishop: Square[] | null;
  /** The knight's outpost: the square it stands on, or one it reaches. */
  outpost: { square: Square; standing: boolean } | null;
  /** Files of the pawns locked head-to-head. */
  locked: string[];
  /** The bishop's own locked pawns on its colour, when that shuts the board
   *  for the knight; [] otherwise. */
  fixed: Square[];
}

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
/** The colour of a square, in words (a1 is dark). */
const shadeOf = (sq: Square): 'light' | 'dark' => new Chess().squareColor(sq) === 'light' ? 'light' : 'dark';
const WING_Q = ['a', 'b', 'c'] as const;
const WING_K = ['f', 'g', 'h'] as const;

interface Minor { square: Square; color: Color }

/** One minor each, a knight against a bishop, the rest of the pieces even and
 *  pawns within one. */
function shape(c: Chess): { knight: Minor; bishop: Minor } | null {
  const count = (type: 'n' | 'b' | 'r' | 'q' | 'p', color: Color): number => c.findPiece({ type, color }).length;
  for (const kc of ['w', 'b'] as const) {
    const bc = other(kc);
    if (count('n', kc) !== 1 || count('b', kc) !== 0 || count('b', bc) !== 1 || count('n', bc) !== 0) continue;
    if (count('r', kc) !== count('r', bc) || count('q', kc) !== count('q', bc)) return null;
    if (Math.abs(count('p', kc) - count('p', bc)) > 1) return null;
    return { knight: { square: c.findPiece({ type: 'n', color: kc })[0], color: kc }, bishop: { square: c.findPiece({ type: 'b', color: bc })[0], color: bc } };
  }
  return null;
}

/** SETTLED: neither minor can be taken for no loss (by the signed legal
 *  exchange), whoever is to move — a trade in flight or a piece left hanging
 *  is not the board the game goes on with. */
function settled(c: Chess, m: { knight: Minor; bishop: Minor }): boolean {
  const takeable = (p: Minor): boolean =>
    c.attackers(p.square, other(p.color)).length > 0 && signedLegalSeeFor(c.fen(), p.square, other(p.color)) >= 0;
  return !takeable(m.knight) && !takeable(m.bishop);
}

/** The verdict on a board of that shape, settled or not. */
function verdict(fen: string): MinorMatchupBoard | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const s = shape(c);
  if (!s) return null;
  const notes = findPieceQuality(fen);
  const note = (sq: Square, kind: string): boolean => notes.some((n) => n.square === sq && n.kind === kind);
  const bad = note(s.bishop.square, 'bad-bishop');
  const badBishop = bad ? bishopBlockingPawns(c, s.bishop.square, s.bishop.color) : null;
  const rim = note(s.knight.square, 'rim-knight');
  const standing = isOutpost(c, s.knight.square, s.knight.color, false);
  const reach = standing ? [] : holeTargets(fen, s.bishop.color, s.knight.color, 'n');
  const outpost = standing ? { square: s.knight.square, standing: true } : reach.length ? { square: reach[0], standing: false } : null;
  const pairs = lockedPawnPairs(c);
  const locked = [...new Set(pairs.map((p) => p.white[0]))];
  // CLOSED, for the knight: two or more pairs locked, one of them in the
  // centre, and the bishop's own locked pawns fixed on its colour — the pawns
  // that shut it in. Locked pawns on the other colour make it a good bishop.
  const shade = c.squareColor(s.bishop.square);
  const fixed = pairs.map((p) => (s.bishop.color === 'w' ? p.white : p.black) as Square).filter((sq) => c.squareColor(sq) === shade);
  const closed = pairs.length >= 2 && locked.some((f) => 'cdef'.includes(f)) && fixed.length >= 2;
  const base = { knight: s.knight, bishop: s.bishop, badBishop, outpost, locked, fixed: closed ? fixed : [] };
  if (!rim && (bad || (closed && outpost))) return { ...base, better: 'knight' };
  const files = new Set(c.board().flat().flatMap((p) => (p?.type === 'p' ? [p.square[0]] : [])));
  const bothWings = WING_Q.some((f) => files.has(f)) && WING_K.some((f) => files.has(f));
  const free = bishopBlockingPawns(c, s.bishop.square, s.bishop.color).length === 0;
  // With queens on, the fight is the kings' and the open-board edge of the
  // bishop is not yet the story; the bishop's edge is read with them off.
  const queens = c.findPiece({ type: 'q', color: 'w' }).length + c.findPiece({ type: 'q', color: 'b' }).length > 0;
  if (!queens && pairs.length === 0 && bothWings && !bad && free && !outpost) return { ...base, better: 'bishop' };
  return null;
}

/** THE STANDING READ: knight against bishop on `fen`, settled, and which is
 *  better and why — or null when the board is not that shape, not settled,
 *  or mixed. */
export function minorMatchupOn(fen: string): MinorMatchupBoard | null {
  const v = verdict(fen);
  if (!v) return null;
  return settled(new Chess(fen), v) ? v : null;
}

export interface MinorMatchupRead {
  text: string;
  squares: Square[];
  /** The side whose minor is better (or, for the wrong bishop, who holds). */
  winner: Color;
  key: string;
}

/** The read of a board in words, from the student's seat. `lead` is the
 *  sentence that opens it (the trade, or the standing); the reasons follow,
 *  one a sentence, and it ends on what it means. */
function reasons(m: MinorMatchupBoard, student: Color, key: number): string[] {
  const own = (c: Color): Own => (c === student ? 'your' : 'their');
  const out: string[] = [];
  if (m.better === 'knight') {
    if (m.badBishop) out.push(`${openSentence(own(m.bishop.color))} bishop on ${m.bishop.square} is stuck behind its own pawns on ${andList(m.badBishop)}.`);
    if (m.fixed.length) out.push(`The pawns are locked on ${fileList(m.locked)}, and ${own(m.bishop.color)} pawns on ${andList(m.fixed)} are stuck on ${shadeOf(m.bishop.square)} squares, the colour of ${own(m.bishop.color)} bishop on ${m.bishop.square}.`);
    if (m.outpost) {
      const k = openSentence(own(m.knight.color));
      const foe = own(m.bishop.color);
      out.push(m.outpost.standing
        ? `${k} knight on ${m.knight.square} stands where no pawn of ${foe === 'your' ? 'yours' : 'theirs'} can ever kick it.`
        : `${k} knight can reach ${m.outpost.square}, where no pawn of ${foe === 'your' ? 'yours' : 'theirs'} can ever kick it.`);
    }
    out.push(rotateStem([
      `${openSentence(own(m.knight.color))} knight is the better piece.`,
      `${openSentence(own(m.knight.color))} knight is worth more than ${own(m.bishop.color)} bishop now.`,
    ], key));
  } else {
    out.push(`The board is open, with no pawns locked and pawns on both wings, so ${own(m.bishop.color)} bishop on ${m.bishop.square} covers either side at once.`);
    out.push(`${openSentence(own(m.knight.color))} knight has no square to settle on, and it needs several moves to cross from one wing to the other.`);
    out.push(rotateStem([
      `${openSentence(own(m.bishop.color))} bishop is the better piece.`,
      `${openSentence(own(m.bishop.color))} bishop is worth more than ${own(m.knight.color)} knight now.`,
    ], key));
  }
  return out;
}

function minorPhrase(m: MinorMatchupBoard, piece: 'knight' | 'bishop'): string {
  if (m.better === 'knight') return piece === 'knight' ? 'a good knight' : m.badBishop ? 'a bad bishop' : 'a bishop';
  return piece === 'bishop' ? 'a free bishop' : 'a knight';
}

/** The standing read in words (`minorMatchupOn`), from the student's seat —
 *  for a surface that asks about a board, not a move. */
export function minorMatchupLine(m: MinorMatchupBoard, student: Color, fen: string): string {
  const own = (c: Color): Own => (c === student ? 'your' : 'their');
  const key = stemKeyOf(fen);
  const lead = `It is ${own(m.knight.color)} knight against ${own(m.bishop.color)} bishop.`;
  return [lead, ...reasons(m, student, key)].join(' ');
}

/**
 * The move `san` on `fenBefore` (either seat) that MAKES the matchup: after it
 * knight against bishop stands settled with a verdict it did not have before
 * (the trade that leaves it, or the move that turns it), or the bishop and
 * rook's pawn are left the wrong colour against the king in the corner. Null
 * otherwise.
 */
export function minorMatchup(fenBefore: string, san: string, student: Color): MinorMatchupRead | null {
  let after: Chess;
  let mv;
  try { after = new Chess(fenBefore); mv = after.move(san); } catch { return null; }
  const fenAfter = after.fen();
  const key = stemKeyOf(fenAfter);
  const mover = mv.color;
  const Mover = mover === student ? 'You' : 'They';
  const moverOwn: Own = mover === student ? 'your' : 'their';
  const otherOwn: Own = mover === student ? 'their' : 'your';

  // THE WRONG BISHOP — an endgame fact, made by the move that leaves it.
  const wrong = detectRookPawnCorner(fenAfter);
  if (wrong?.kind === 'wrong-bishop' && detectRookPawnCorner(fenBefore)?.kind !== 'wrong-bishop') {
    const attacker: Color = wrong.side === 'white' ? 'w' : 'b';
    const defender = other(attacker);
    const bishop = after.findPiece({ type: 'b', color: attacker })[0];
    const lead = attacker === student
      ? rotateStem([
        `Your bishop on ${bishop} is the wrong colour for this pawn, so the extra material does not win.`,
        `Your bishop and pawn cannot win this: the bishop on ${bishop} is the wrong colour.`,
      ], key)
      : rotateStem([
        `Their bishop on ${bishop} is the wrong colour for their pawn, so you hold the draw.`,
        `Their bishop and pawn cannot beat you here: the bishop on ${bishop} is the wrong colour.`,
      ], key);
    return {
      text: `${lead} ${wrongBishopDrawText(wrong)}`,
      squares: [bishop, wrong.pawn, wrong.corner],
      winner: defender,
      key: `minor-matchup:wrong-bishop:${wrong.corner}`,
    };
  }

  // A check or a mate is its own idea.
  if (after.isCheckmate() || (after.inCheck() && !mv.captured)) return null;
  const now = minorMatchupOn(fenAfter);
  if (!now) return null;
  // Made by THIS move: the board before held no such verdict, settled or not
  // (a minor that was hanging and is now safe did not make the matchup).
  const was = verdict(fenBefore);
  let shapeBefore = false;
  try { shapeBefore = shape(new Chess(fenBefore)) !== null; } catch { shapeBefore = false; }
  if (was && was.better === now.better && was.knight.color === now.knight.color) return null;
  const winner = now.better === 'knight' ? now.knight.color : now.bishop.color;
  const moverPiece: 'knight' | 'bishop' = now.knight.color === mover ? 'knight' : 'bishop';
  const otherPiece: 'knight' | 'bishop' = moverPiece === 'knight' ? 'bishop' : 'knight';
  const own = (c: Color): Own => (c === student ? 'your' : 'their');
  // A minor taken is a trade of minors; anything else taken is a capture.
  const trade = mv.captured === 'n' || mv.captured === 'b';
  const lead = trade
    ? rotateStem([
      `${Mover} trade into ${minorPhrase(now, moverPiece)} against ${otherOwn} ${minorPhrase(now, otherPiece).replace(/^an? /, '')}.`,
      `That trade leaves ${moverOwn} ${minorPhrase(now, moverPiece).replace(/^an? /, '')} against ${otherOwn} ${minorPhrase(now, otherPiece).replace(/^an? /, '')}.`,
    ], key)
    : mv.captured && !shapeBefore
      ? `That capture leaves ${own(now.knight.color)} knight against ${own(now.bishop.color)} bishop.`
      : rotateStem([
      `Now it is ${own(now.knight.color)} knight against ${own(now.bishop.color)} bishop.`,
      `That leaves ${own(now.knight.color)} knight against ${own(now.bishop.color)} bishop.`,
    ], key);
  const squares: Square[] = [now.knight.square, now.bishop.square, ...(now.badBishop ?? []), ...now.fixed, ...(now.outpost && !now.outpost.standing ? [now.outpost.square] : [])];
  return {
    text: [lead, ...reasons(now, student, key)].join(' '),
    squares,
    winner,
    // Said once a game for one verdict (its claim): the knight moving on
    // keeps the same matchup.
    key: `minor-matchup:${now.better}:${now.knight.color}`,
  };
}
