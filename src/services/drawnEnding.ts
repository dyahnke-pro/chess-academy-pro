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
//                    one wing.
// PURE: chess.js and the lines handed in (G0).
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, other, seatWords, sortedLines } from './engineLineRead';
import { sideMaterial } from './pieceValues';

export type DrawReason = 'cannotMate' | 'wrongBishop' | 'rookPawn' | 'kingInFront' | 'oppositeBishops' | 'oneWing';

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
