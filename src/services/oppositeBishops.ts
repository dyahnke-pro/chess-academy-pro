// oppositeBishops — OPPOSITE-COLOURED BISHOPS, WHATEVER ELSE IS ON THE BOARD
// (2026-11-05, the teaching moves H-EVAL and S-PLAN in `teachingMoves.ts`).
// His Ruy Lopez speedrun (NFUuaZsR2S8): from move 14 his dark bishop against
// their light one, rooks on, and his read of the whole stretch was the
// bishops — winnable, but hard to win by grinding pawns, and the plan he
// regretted not playing was a king attack. The app named opposite bishops only
// in a pure bishop ending (`endgameMatchup`), so with rooks or queens on no
// computer said it.
//
// One reader of the board shape (`oppositeBishopsOn`: one bishop each, on
// squares of opposite colours, whatever else is on), said ONCE — on the move
// that makes it, either seat — with the consequence by what is left:
//   • queens or rooks on: the attacker's game. Each bishop rules squares the
//     other can never contest, so the side whose bishop already bears on the
//     enemy king's squares is told to play there; the side it bears on, to
//     guard those squares with other pieces. Read on the board: the king's
//     neighbouring squares of the bishop's colour that it attacks.
//   • bishops and pawns only: the most drawish ending — a pawn up is often
//     not enough (the method a pawn up or down is `pushOrHold`'s, which this
//     line shares its claims with).
//   • knights still on, no heavy piece: nothing — neither rule holds whole.
//
// Measured on the moves of his games (2026-11-05, 7,333 game moments): the
// shape is on the board at 149 of them; the reader fires on 29, in 16 games
// (said once a game, by its claim). Only 3 of his game moments name the
// bishops in words, and 1 is on this board — it fires there, on his Ruy
// Lopez's 13.Bxf6, his dark bishop hitting d8 and e7 beside their king.
//
// PURE: chess.js and the proof shape.
import { Chess, type Color, type Square } from 'chess.js';
import { andList } from '../utils/andList';
import { squaresProof, NO_PROOF, type FactProof } from './proof';

export interface OppositeBishopsBoard {
  white: Square;
  black: Square;
  /** Queens or rooks still on. */
  heavy: boolean;
  /** Knights still on. */
  knights: boolean;
  queens: boolean;
  rooks: boolean;
}

/** ONE BISHOP EACH, ON OPPOSITE COLOURS — the one reader of that board,
 *  whatever else is on it. Null otherwise. */
export function oppositeBishopsOn(fen: string): OppositeBishopsBoard | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const w = c.findPiece({ type: 'b', color: 'w' });
  const b = c.findPiece({ type: 'b', color: 'b' });
  if (w.length !== 1 || b.length !== 1) return null;
  if (c.squareColor(w[0]) === c.squareColor(b[0])) return null;
  const all = c.board().flat();
  const queens = all.some((p) => p?.type === 'q');
  const rooks = all.some((p) => p?.type === 'r');
  return { white: w[0], black: b[0], heavy: queens || rooks, knights: all.some((p) => p?.type === 'n'), queens, rooks };
}

export interface OppositeBishopsRead {
  text: string;
  /** The two bishops and the squares beside a king the attacking bishop hits. */
  squares: string[];
  proof: FactProof;
  /** Whose plan it is: the side whose bishop bears on the other king, else the mover. */
  seat: 'student' | 'opponent';
  key: string;
  claims: string[];
}

/** The shape SETTLED: opposite bishops, and no bishop the side to move can
 *  take — a bishop that just took and can be taken back is an exchange in
 *  flight, not the board the game goes on with. */
function settled(fen: string): OppositeBishopsBoard | null {
  const ob = oppositeBishopsOn(fen);
  if (!ob) return null;
  try { if (new Chess(fen).moves({ verbose: true }).some((m) => m.captured === 'b')) return null; } catch { return null; }
  return ob;
}

/** What the settled shape means with what is left: the attacker's game with
 *  queens or rooks on, the drawish ending with bishops and pawns only, and
 *  nothing whole with knights still on. */
type Consequence = 'attack' | 'ending';
function consequence(fen: string): Consequence | null {
  const ob = settled(fen);
  if (!ob) return null;
  return ob.heavy ? 'attack' : ob.knights ? null : 'ending';
}

/** The squares beside `color`'s king of the colour `shade`. */
function kingZone(c: Chess, color: Color, shade: 'light' | 'dark'): Square[] {
  const k = c.findPiece({ type: 'k', color })[0];
  if (!k) return [];
  const f = k.charCodeAt(0);
  const r = Number(k[1]);
  const out: Square[] = [];
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (!df && !dr) continue;
      const ff = f + df; const rr = r + dr;
      if (ff < 97 || ff > 104 || rr < 1 || rr > 8) continue;
      const s = `${String.fromCharCode(ff)}${rr}` as Square;
      if (c.squareColor(s) === shade) out.push(s);
    }
  }
  return out;
}

/**
 * The move `san` on `fenBefore` (either seat) after which opposite-coloured
 * bishops stand settled on the board with a consequence they did not have
 * before — the shape made, or the heavy pieces gone — read for what that
 * means with what is left. Null otherwise.
 */
export function oppositeBishops(fenBefore: string, san: string, student: Color): OppositeBishopsRead | null {
  let after: Chess;
  let mover: Color;
  try { after = new Chess(fenBefore); mover = after.turn(); after.move(san); } catch { return null; }
  const now = consequence(after.fen());
  if (!now || now === consequence(fenBefore)) return null;
  const ob = settled(after.fen());
  if (!ob) return null;
  const them: Color = student === 'w' ? 'b' : 'w';
  const mine = student === 'w' ? ob.white : ob.black;
  const theirs = student === 'w' ? ob.black : ob.white;
  if (ob.heavy) {
    const what = ob.queens && ob.rooks ? 'queens and rooks' : ob.queens ? 'queens' : 'rooks';
    const shadeOf = (sq: Square): 'light' | 'dark' => (after.squareColor(sq) === 'light' ? 'light' : 'dark');
    // Each bishop's hits beside the other king, on its own colour.
    const hits = (bishop: Square, color: Color, enemy: Color): Square[] =>
      kingZone(after, enemy, shadeOf(bishop)).filter((s) => after.attackers(s, color).includes(bishop));
    const myHits = hits(mine, student, them);
    const theirHits = hits(theirs, them, student);
    const head = `Opposite-coloured bishops now, with ${what} on: a game for the attacker, not for grinding pawns`;
    if (myHits.length > 0 && theirHits.length === 0) {
      const shade = shadeOf(mine);
      return {
        text: `${head} — your bishop on ${mine} hits ${andList(myHits)} beside their king, and their bishop can never guard a ${shade} square, so aim at their king on the ${shade} squares.`,
        squares: [mine, theirs, ...myHits], proof: squaresProof(`Your bishop on ${mine} hits ${andList(myHits)}`, [mine, ...myHits]) ?? NO_PROOF.stated,
        seat: 'student', key: 'opposite-bishops:attack', claims: ['opposite-bishops:attack'],
      };
    }
    if (theirHits.length > 0 && myHits.length === 0) {
      const shade = shadeOf(theirs);
      return {
        text: `${head} — their bishop on ${theirs} hits ${andList(theirHits)} beside your king, and your bishop can never guard a ${shade} square, so cover the ${shade} squares around your king with your other pieces.`,
        squares: [theirs, mine, ...theirHits], proof: squaresProof(`Their bishop on ${theirs} hits ${andList(theirHits)}`, [theirs, ...theirHits]) ?? NO_PROOF.stated,
        seat: 'opponent', key: 'opposite-bishops:attack', claims: ['opposite-bishops:attack'],
      };
    }
    return {
      text: `${head} — each bishop rules squares the other can never contest, so whoever gets at the king first, on their own bishop's colour, gains the most.`,
      squares: [mine, theirs], proof: NO_PROOF.method,
      seat: mover === student ? 'student' : 'opponent', key: 'opposite-bishops:attack', claims: ['opposite-bishops:attack'],
    };
  }
  return {
    text: 'Opposite-coloured bishops and pawns now: the most drawish ending there is — a pawn up is often not enough, because each bishop can block on squares the other can never touch.',
    squares: [mine, theirs], proof: NO_PROOF.method,
    seat: mover === student ? 'student' : 'opponent', key: 'opposite-bishops:ending',
    // The same idea `pushOrHold` says a pawn up or down in this ending.
    claims: ['opposite-bishops:ending', 'ending-opposite-bishops-up', 'ending-opposite-bishops-down'],
  };
}
