// queenHunt — A QUEEN WITH NOWHERE TO RUN (Danya speedruns LJa5Df75CJI, 9…Bg4:
// "White's untouched queenside boxes in his queen: …Bg4 attacks it and it has
// no safe square"; hv0P9kotpJw, 14.Bb5: "Bb5 drives the queen back; after
// …Qa2, Ra1 traps it"; Ytkf3qZTj74: "bring the queen back before it gets
// trapped in the corner").
//
// Two board facts, both seats:
//   - THE HUNT: the move hits the other side's queen with a smaller piece, and
//     the queen has no safe square to run to, or exactly one. With one, and a
//     move of the hunter's side that traps it there (`trappedAt`, the one
//     trapped-piece computer), that move is named too.
//   - THE ESCAPE: the mover's own queen leaves a square where one move of the
//     other side would have trapped it (`trappedAt` again).
// A safe square is read with the trapped-piece computer's own rule: not hit by
// a smaller piece, and not hit while unguarded; a capture is safe when the
// exchange there does not lose. PURE: chess.js and the trapped-piece computer.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { trappedAt } from './trappedPiece';
import { legalSeeGainOn, legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { sideToMoveAs } from './threatOut';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;
/** A piece's worth, the king counted as more than anything it could hit. */
const worth = (t: PieceSymbol): number => (t === 'k' ? 100 : MATERIAL_VALUE[t] ?? 0);

export interface QueenHunt {
  shape: 'boxed' | 'one-square' | 'escape';
  /** Whose queen: the mover hunts the other side's, or saves its own. */
  queen: Square;
  /** The hunter (boxed / one-square): the piece of the mover's that hits it. */
  hunter: { square: Square; piece: PieceSymbol } | null;
  /** The queen's one safe square (one-square), else null. */
  exit: Square | null;
  /** The move that traps the queen: on its one square (one-square), or on the
   *  square it just left (escape). Null when there is none. */
  net: { san: string; from: Square; to: Square; pins: boolean } | null;
  /** The squares the proof marks. */
  squares: Square[];
}

/** The queen's safe squares on `fen` with its owner to move — the trapped-piece
 *  computer's rule for each square the queen can reach. */
export function queenSafeSquares(fen: string, sq: Square): Square[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  const q = c.get(sq);
  if (!q || q.type !== 'q' || c.turn() !== q.color) return [];
  const enemy: Color = q.color === 'w' ? 'b' : 'w';
  const out: Square[] = [];
  for (const m of c.moves({ square: sq, verbose: true })) {
    const a = new Chess(fen);
    a.move(m);
    if (m.captured) {
      if (legalSeeGainOn(a, m.to) - worth(m.captured) < 1) out.push(m.to);
      continue;
    }
    const atk = a.attackers(m.to, enemy);
    if (atk.length === 0) { out.push(m.to); continue; }
    const smaller = atk.some((s) => worth(a.get(s)?.type ?? 'k') < 9);
    if (!smaller && a.attackers(m.to, q.color).length > 0) out.push(m.to);
  }
  return out;
}

/** A move of the side to move on `fen` that leaves the queen on `sq` trapped
 *  — the engine's own next move first (`preferUci`), when it does. */
function trapMove(fen: string, sq: Square, preferUci: string | null): QueenHunt['net'] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const moves = c.moves({ verbose: true });
  if (preferUci) moves.sort((a, b) => Number(`${b.from}${b.to}` === preferUci.slice(0, 4)) - Number(`${a.from}${a.to}` === preferUci.slice(0, 4)));
  for (const m of moves) {
    c.move(m);
    const hit = c.isAttacked(sq, m.color) && !c.inCheck() && trappedAt(c.fen(), sq) !== null;
    const pins = hit && pinnedToKing(c, sq, m.to);
    c.undo();
    if (hit) return { san: m.san, from: m.from, to: m.to, pins };
  }
  return null;
}

/** The piece on `sq` stands between the piece on `by` and its own king. */
function pinnedToKing(c: Chess, sq: Square, by: Square): boolean {
  const owner = c.get(sq)?.color;
  if (!owner) return false;
  const probe = new Chess(c.fen());
  probe.remove(sq);
  const king = probe.board().flat().find((x) => x?.type === 'k' && x.color === owner)?.square;
  return !!king && probe.attackers(king, owner === 'w' ? 'b' : 'w').includes(by);
}

/** The hunt or the escape on the move `san` from `fenBefore`, or null. */
export function queenHunt(fenBefore: string, san: string, line: readonly string[] | null): QueenHunt | null {
  let before: Chess;
  let after: Chess;
  let mv;
  try {
    before = new Chess(fenBefore);
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  if (before.inCheck() || after.isGameOver()) return null;
  const me = mv.color;
  const them: Color = me === 'w' ? 'b' : 'w';

  // THE ESCAPE: the mover's own queen steps off a square one move would have trapped.
  if (mv.piece === 'q' && !mv.captured) {
    const asThem = sideToMoveAs(fenBefore, them);
    if (asThem && !new Chess(asThem).inCheck()) {
      const net = trapMove(asThem, mv.from, null);
      // Where it went, the same move must not trap it again.
      if (net && !after.isAttacked(mv.to, them)) {
        return { shape: 'escape', queen: mv.from, hunter: null, exit: null, net, squares: [mv.from, mv.to, net.to] };
      }
    }
  }

  // THE HUNT: the other side's queen, newly hit by a smaller piece.
  if (after.inCheck()) return null;
  for (const row of after.board()) for (const cell of row) {
    if (!cell || cell.color !== them || cell.type !== 'q') continue;
    const sq = cell.square;
    const hunters = after.attackers(sq, me).filter((s) => worth(after.get(s)?.type ?? 'k') < 9);
    if (hunters.length === 0) continue;
    // Newly hit: no smaller piece of the mover's hit it before the move.
    if (before.attackers(sq, me).some((s) => s !== mv.from && worth(before.get(s)?.type ?? 'k') < 9)) continue;
    const hunter = hunters.includes(mv.to) ? mv.to : hunters[0];
    // A hunter they can win for nothing hunts nothing.
    if (legalSeeGainFor(after.fen(), hunter, them) > 0) continue;
    const exits = queenSafeSquares(after.fen(), sq);
    if (exits.length > 1) continue;
    const hunterPiece = after.get(hunter)?.type ?? 'p';
    if (exits.length === 0) {
      return { shape: 'boxed', queen: sq, hunter: { square: hunter, piece: hunterPiece }, exit: null, net: null, squares: [hunter, sq] };
    }
    const exit = exits[0];
    // The trap on its one square: the queen runs there, and a move of the
    // mover's traps it.
    let net: QueenHunt['net'] = null;
    try {
      const ran = new Chess(after.fen());
      ran.move({ from: sq, to: exit });
      // The engine's line after the move: the queen's run, then its next move.
      const ranLine = line && line[0]?.slice(0, 4) === `${sq}${exit}` ? line[1] ?? null : null;
      if (!ran.inCheck()) net = trapMove(ran.fen(), exit, ranLine);
    } catch { net = null; }
    return { shape: 'one-square', queen: sq, hunter: { square: hunter, piece: hunterPiece }, exit, net, squares: net ? [hunter, sq, exit, net.to] : [hunter, sq, exit] };
  }
  return null;
}

/** Said from the mover's seat (`own`: your / their), one idea a sentence,
 *  phrasings rotated on the board. */
export function queenHuntLine(h: QueenHunt, own: 'your' | 'their', fen: string): string {
  const other = own === 'your' ? 'their' : 'your';
  const key = stemKeyOf(`${fen}|queenHunt|${h.queen}`);
  if (h.shape === 'escape' && h.net) {
    const net = h.net;
    return rotateStem([
      `${cap(own)} queen gets off ${h.queen} in time. There, ${net.san} would have ${net.pins ? 'pinned it to the king and won it' : 'trapped it'}.`,
      `${cap(own)} queen leaves ${h.queen} before it gets caught. ${net.san} would have ${net.pins ? 'pinned it to the king there' : 'left it no way out there'}.`,
      `${cap(own)} queen pulls back from ${h.queen}. On that square ${net.san} would have ${net.pins ? 'pinned it and won it' : 'trapped it'}.`,
    ], key);
  }
  if (!h.hunter) return '';
  const hunter = `${own} ${NAME[h.hunter.piece]} on ${h.hunter.square}`;
  if (h.shape === 'boxed') {
    return rotateStem([
      `${cap(other)} queen on ${h.queen} has no safe square. ${cap(hunter)} hits it, and every square it could run to is covered.`,
      `${cap(other)} queen on ${h.queen} has nowhere to run. Every square it could reach is covered, and ${hunter} is hitting it.`,
      `${cap(hunter)} leaves ${other} queen on ${h.queen} with no safe square. Every square it could run to is covered.`,
    ], key);
  }
  const base = rotateStem([
    `${cap(hunter)} hits ${other} queen on ${h.queen}. Its only safe square is ${h.exit}.`,
    `${cap(other)} queen on ${h.queen} has to run from ${hunter}, and ${h.exit} is the one safe square left.`,
    `${cap(hunter)} drives ${other} queen back. The only square where it is safe is ${h.exit}.`,
  ], key);
  return h.net ? `${base} Once it goes there, ${h.net.san} ${h.net.pins ? 'pins it to the king' : 'traps it'}.` : base;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
