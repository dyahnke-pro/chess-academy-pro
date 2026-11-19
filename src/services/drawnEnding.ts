// drawnEnding — THE DRAWING RESOURCE ON THE BOARD (WO-PICTURE-01, David
// 2026-11-19: "the coach explains WHY a try fails the way Daniel Naroditsky
// does").
//
// Danya rules a try out by the draw it lets the other side reach, with the
// material kept: "a corner pawn of the wrong colour", "is obviously a draw",
// "White cannot make progress", "a theoretical draw". Nothing read the known
// drawn endings, so a try that turned a win into one of them had no reason.
//
// The read is a KNOWN DRAWING SHAPE on the board, and it fires only when the
// engine's line from the board also ends level (within half a pawn) with one
// side a point or more up — the shape is the reason, the engine the proof:
//   cannotMate     — the side ahead has no pawns, and its pieces cannot force
//                    mate: one minor, two knights, or a rook against a lone
//                    minor;
//   wrongBishop    — bishop and rook pawns (one file) against the king, the
//                    bishop the wrong colour for the corner, the king in or
//                    next to that corner;
//   rookPawn       — king and rook pawns (one file) against the king, the
//                    defending king in front of them;
//   kingInFront    — king and one pawn against the king, the defending king on
//                    the pawn's file ahead of it;
//   oppositeBishops— a bishop each, on opposite colours, nothing else but
//                    pawns, the side ahead one or two pawns up;
//   oneWing        — a rook each, nothing else, one pawn up with every pawn on
//                    one wing;
//   locked         — kings and pawns only, every pawn rammed head to head and
//                    none able to take, and neither king able to reach a pawn
//                    it could take: the pawn chain walls every way in
//                    (`lockedPawns`). Material is level, so it is no one
//                    side's draw: both hold it.
// PURE: chess.js and the lines handed in (G0).
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, other, seatWords, sortedLines } from './engineLineRead';
import { sideMaterial } from './pieceValues';

export type DrawReason = 'cannotMate' | 'wrongBishop' | 'rookPawn' | 'kingInFront' | 'oppositeBishops' | 'oneWing' | 'locked';

export interface DrawnEnding {
  reason: DrawReason;
  /** The side that holds the draw (the side behind in material). */
  side: Color;
  text: string;
  squares: Square[];
}

/** A line that ends within this of level is a draw (centipawns). */
export const DRAW_LEVEL_CP = 50;

interface Pc { type: string; color: Color; square: Square }

const lightSquare = (s: Square): boolean => ((s.charCodeAt(0) - 96) + Number(s[1])) % 2 === 1;
const dist = (a: Square, b: Square): number => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** The drawing shape on `fen`, proved by a level engine line, or null. */
export function drawnEnding(fen: string, lines: readonly EngineLine[], student: Color): DrawnEnding | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const ls = sortedLines(lines, c.turn());
  const top = ls[0];
  if (!top || top.mate !== null || top.cp === null || Math.abs(top.cp) > DRAW_LEVEL_CP) return null;
  // ── THE PAWNS LOCKED, NO WAY IN ── (level material: both sides hold it;
  // recorded as the side not to move, so one board always keys the same).
  const lock = lockedPawns(fen);
  if (lock) return { reason: 'locked', side: other(c.turn()), text: LOCKED_TEXT, squares: lock.rams };
  const mw = sideMaterial(fen, 'w');
  const mb = sideMaterial(fen, 'b');
  if (Math.abs(mw - mb) < 1) return null;
  const up: Color = mw > mb ? 'w' : 'b';
  const down = other(up);
  const pcs: Pc[] = c.board().flat().filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ type: p.type, color: p.color, square: p.square }));
  const of = (col: Color, t?: string): Pc[] => pcs.filter((p) => p.color === col && p.type !== 'k' && (t === undefined || p.type === t));
  const kingOf = (col: Color): Square | null => pcs.find((p) => p.color === col && p.type === 'k')?.square ?? null;
  const ku = kingOf(up);
  const kd = kingOf(down);
  if (!ku || !kd) return null;
  const upPawns = of(up, 'p');
  const upPieces = of(up).filter((p) => p.type !== 'p');
  const downPawns = of(down, 'p');
  const downPieces = of(down).filter((p) => p.type !== 'p');
  const U = seatWords(up, student);
  const D = seatWords(down, student);
  const promoRank = up === 'w' ? '8' : '1';

  // ── NO PAWNS LEFT TO WIN WITH ──
  if (!upPawns.length) {
    const types = upPieces.map((p) => p.type).sort().join('');
    const lone = upPieces.length === 1 && (types === 'n' || types === 'b');
    const twoKnights = types === 'nn';
    const rookVsMinor = types === 'r' && downPieces.length === 1 && ['n', 'b'].includes(downPieces[0].type) && !downPawns.length;
    if (lone || twoKnights || rookVsMinor) {
      const what = lone ? `a lone ${NAME[types]}` : twoKnights ? 'two knights' : `a rook against ${D.whose} ${NAME[downPieces[0].type]}`;
      const text = rookVsMinor
        ? `${U.Whose} rook against ${D.whose} ${NAME[downPieces[0].type]}, with no pawns left, is a known draw: ${D.who} keep the king away from the corner it could be mated in.`
        : `${U.Whose} last pawn is gone, and ${what} cannot force mate: ${U.who} cannot win this.`;
      return { reason: 'cannotMate', side: down, text, squares: [ku, kd, ...upPieces.map((p) => p.square)] };
    }
    return null;
  }

  // ── ROOK PAWNS ──
  const files = new Set(upPawns.map((p) => p.square[0]));
  if (files.size === 1 && ['a', 'h'].includes([...files][0]) && !downPieces.length && !downPawns.length) {
    const file = [...files][0];
    const corner = `${file}${promoRank}` as Square;
    const front = upPawns.reduce((a, p) => (up === 'w' ? Number(p.square[1]) > Number(a.square[1]) : Number(p.square[1]) < Number(a.square[1])) ? p : a);
    const ahead = kd[0] === file && (up === 'w' ? Number(kd[1]) > Number(front.square[1]) : Number(kd[1]) < Number(front.square[1]));
    if (upPieces.length === 1 && upPieces[0].type === 'b' && lightSquare(upPieces[0].square) !== lightSquare(corner) && dist(kd, corner) <= 1) {
      return { reason: 'wrongBishop', side: down,
        text: `${U.Whose} bishop is the wrong colour for the ${file}-pawn: it can never cover ${corner}, and ${D.whose} king sits in the corner. That is a draw.`,
        squares: [upPieces[0].square, corner, kd, front.square] };
    }
    if (!upPieces.length && (ahead || dist(kd, corner) <= 1)) {
      return { reason: 'rookPawn', side: down,
        text: `${D.Whose} king is in front of the ${file}-pawn, and a rook pawn cannot shoulder it out of the corner: a draw.`,
        squares: [kd, corner, front.square] };
    }
  }

  // ── ONE PAWN, THE KING IN FRONT ──
  if (upPawns.length === 1 && !upPieces.length && !downPieces.length && !downPawns.length) {
    const p = upPawns[0].square;
    const ahead = kd[0] === p[0] && (up === 'w' ? Number(kd[1]) > Number(p[1]) : Number(kd[1]) < Number(p[1]));
    if (ahead) {
      return { reason: 'kingInFront', side: down,
        text: `${D.Whose} king stands in front of the ${p[0]}-pawn: with the king blocking it, one pawn is not enough to win.`,
        squares: [kd, p] };
    }
  }

  // ── OPPOSITE-COLOURED BISHOPS ──
  const ub = upPieces.filter((p) => p.type === 'b');
  const db = downPieces.filter((p) => p.type === 'b');
  if (upPieces.length === 1 && downPieces.length === 1 && ub.length === 1 && db.length === 1 && lightSquare(ub[0].square) !== lightSquare(db[0].square)) {
    const extra = upPawns.length - downPawns.length;
    if (extra >= 1 && extra <= 2) {
      const colour = lightSquare(db[0].square) ? 'light' : 'dark';
      const pawnsWord = extra === 1 ? `${U.whose} extra pawn is` : `${U.whose} two extra pawns are`;
      return { reason: 'oppositeBishops', side: down,
        text: `The bishops are of opposite colours, so ${pawnsWord} not enough: ${D.whose} bishop and king hold the ${colour} squares in front of them, and ${U.whose} bishop can never touch those.`,
        squares: [ub[0].square, db[0].square] };
    }
  }

  // ── TOO FEW PAWNS: A ROOK EACH, ALL ON ONE WING ──
  if (upPieces.length === 1 && downPieces.length === 1 && upPieces[0].type === 'r' && downPieces[0].type === 'r'
    && upPawns.length - downPawns.length === 1 && downPawns.length >= 1) {
    const all = [...upPawns, ...downPawns].map((p) => p.square.charCodeAt(0) - 97);
    const oneWing = all.every((f) => f >= 4) || all.every((f) => f <= 3);
    if (oneWing) {
      const wing = all.every((f) => f >= 4) ? 'kingside' : 'queenside';
      return { reason: 'oneWing', side: down,
        text: `Every pawn is on the ${wing}, so ${U.whose} extra pawn is too little: ${D.whose} king stays in front of them, and there is no second weakness to stretch ${D.who === 'you' ? 'you' : 'them'} with.`,
        squares: [kd, ...upPawns.map((p) => p.square)] };
    }
  }
  return null;
}

// ── THE LOCKED PAWN ENDING (his "White cannot make progress", "the position
// is totally locked up") ──

export const LOCKED_TEXT = 'The pawns are locked, and the pawn chain walls off every way in: neither king can ever reach a pawn it could take. Neither side can make progress, so it is a draw.';

export interface LockedPawns {
  /** Every pawn, each rammed head to head with an enemy pawn. */
  rams: Square[];
  /** The squares each king can ever walk to (the frozen chain decides them). */
  reach: Record<Color, Square[]>;
}

const sq = (f: number, r: number): Square | null => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? `${String.fromCharCode(97 + f)}${r}` as Square : null);

/**
 * A locked pawn ending, proved by the rules alone: only kings and pawns; every
 * pawn has an enemy pawn on the square in front of it and no enemy pawn to
 * take, so no pawn can ever move again and the chain is frozen for good; and
 * for each king, the squares it can ever walk to (empty, not covered by an
 * enemy pawn — the chain never changes, so neither does that set) touch no
 * enemy pawn that is not guarded by a pawn of its own. Then no pawn can ever
 * fall and nothing on the board can change: a draw. Null otherwise.
 */
export function lockedPawns(fen: string): LockedPawns | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const board = c.board();
  const at = (s: Square) => c.get(s);
  const pawns: { square: Square; color: Color }[] = [];
  const kings: Partial<Record<Color, Square>> = {};
  for (const p of board.flat()) {
    if (!p) continue;
    if (p.type === 'k') kings[p.color] = p.square;
    else if (p.type === 'p') pawns.push({ square: p.square, color: p.color });
    else return null;
  }
  if (!kings.w || !kings.b || !pawns.length) return null;
  const covers = (s: Square, color: Color): Square[] => {
    const f = s.charCodeAt(0) - 97; const r = Number(s[1]) + (color === 'w' ? 1 : -1);
    return [sq(f - 1, r), sq(f + 1, r)].filter((x): x is Square => !!x);
  };
  // Every pawn rammed, none able to take.
  for (const p of pawns) {
    const f = p.square.charCodeAt(0) - 97;
    const ahead = sq(f, Number(p.square[1]) + (p.color === 'w' ? 1 : -1));
    const front = ahead ? at(ahead) : null;
    if (!front || front.type !== 'p' || front.color === p.color) return null;
    if (covers(p.square, p.color).some((x) => { const t = at(x); return !!t && t.type === 'p' && t.color !== p.color; })) return null;
  }
  const coveredBy = (color: Color): Set<Square> => new Set(pawns.filter((p) => p.color === color).flatMap((p) => covers(p.square, color)));
  const pawnSquares = new Set(pawns.map((p) => p.square));
  const reach = {} as Record<Color, Square[]>;
  for (const side of ['w', 'b'] as const) {
    const foe = other(side);
    // A square an enemy pawn covers: the king may not step there, and an enemy
    // pawn standing there is guarded.
    const barred = coveredBy(foe);
    const seen = new Set<Square>([kings[side] as Square]);
    const queue: Square[] = [kings[side] as Square];
    while (queue.length) {
      const s = queue.shift() as Square;
      const f = s.charCodeAt(0) - 97; const r = Number(s[1]);
      for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) {
        const n = sq(f + df, r + dr);
        if (!n || seen.has(n)) continue;
        if (pawnSquares.has(n)) {
          // An enemy pawn no pawn guards, next to a square the king reaches: it falls.
          if (pawns.some((p) => p.square === n && p.color === foe) && !barred.has(n)) return null;
          continue;
        }
        if (barred.has(n)) continue;
        seen.add(n);
        queue.push(n);
      }
    }
    reach[side] = [...seen];
  }
  return { rams: pawns.map((p) => p.square), reach };
}
