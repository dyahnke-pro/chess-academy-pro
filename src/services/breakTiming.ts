// breakTiming — THE PAWN BREAK, AND WHEN IT IS DUE (WO-DANYA-READS-01 #3,
// Danya's articles: "White would love to play b4-b5, but first the queen must
// come to c1", "only now, once the weapon is truly loaded…", and the stop
// before the break: "a4 stops …b5 for good"). Three reads of one idea:
//
//  - THE PREPARATION: the move that gets a break ready. The engine's line
//    after the move plays the break as the mover's next or next-but-one move,
//    and the move is what made it work: the break pawn's landing square is
//    no longer simply lost (the legal exchange there won for them before the
//    move, and wins nothing after it), or a rook now stands on the file the
//    break opens. Never said without one of those reasons, and never for a
//    move the engine refutes (the caller's cost gate).
//  - DUE NOW: the engine's best move IS the break (`pawnBreak` says what it
//    is for); the position read names it as the moment, the pieces in place.
//  - THE STOP: the move takes a break away from them — their break was
//    playable and worth something (`pawnBreak` reads a reason for it) and
//    landed safely; after the move it cannot be played, or the pawn is
//    simply lost on its square.
//
// Every break is the one break reader's (`isPawnBreak` + `pawnBreak`): a push
// that strikes nothing or opens nothing is a pawn move, not a break.
// PURE: chess.js and the board readers; the engine's line is an input.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { isPawnBreak, pawnBreak } from './pawnBreak';
import { legalSeeGainFor } from './positionReadingService';
import { sideToMoveAs } from './threatOut';
import { stackedAttackers } from './targetSelector';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

/** What the preparing move did for the break. */
export type ReadyReason = 'clears-square' | 'guards-square' | 'rook-on-file';

export interface BreakPrep {
  /** The preparing move (SAN, as played). */
  prep: { san: string; from: Square; to: Square; piece: PieceSymbol };
  /** The break the engine's line plays after it. */
  brk: { san: string; from: Square; to: Square };
  /** How many of the mover's moves come between (0: the very next move). */
  between: number;
  reason: ReadyReason;
  /** The file the break opens, for `rook-on-file`. */
  file: string | null;
  squares: Square[];
  key: string;
}

/**
 * The break the move `san` on `fenBefore` prepares, read off `lineAfter` (the
 * engine's line from the board after the move, the reply first), or null.
 */
export function breakPrep(fenBefore: string, san: string, lineAfter: readonly string[]): BreakPrep | null {
  let after: Chess;
  let mv: Move;
  try { after = new Chess(fenBefore); mv = after.move(san); } catch { return null; }
  if (mv.captured || after.inCheck()) return null;
  // A move that is a break itself is the break reader's to say.
  if (mv.piece === 'p' && isPawnBreak(fenBefore, mv.san, null)) return null;
  const me: Color = mv.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  // Walk the line: the mover's next two moves; the first pawn break is the one.
  const walk = new Chess(after.fen());
  let mine = 0;
  for (let k = 0; k < lineAfter.length && k < 4; k += 1) {
    const u = lineAfter[k];
    const fenHere = walk.fen();
    let m: Move;
    try { m = walk.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
    if (m.color !== me) {
      // A capture in between changes the board the break is played on.
      if (m.captured) return null;
      continue;
    }
    if (m.piece !== 'p' || m.captured) {
      mine += 1;
      if (mine >= 2) return null;
      continue;
    }
    const pb = pawnBreak(fenHere, m.san, 'your', null, true);
    if (!pb) { mine += 1; if (mine >= 2) return null; continue; }
    // THE REASON: what the preparing move changed for this break.
    const brkFrom = m.from;
    const brkTo = m.to;
    // 1. The landing square: lost before the move, safe after it.
    const lostBefore = (() => {
      const b = sideToMoveAs(fenBefore, me);
      if (!b) return false;
      const c = new Chess(b);
      try { c.move({ from: brkFrom, to: brkTo }); } catch { return false; }
      return legalSeeGainFor(c.fen(), brkTo, them) >= 1;
    })();
    const safeNow = legalSeeGainFor(walk.fen(), brkTo, them) <= 0;
    // The preparing piece guards the landing square after the move.
    const prepTouches = after.attackers(brkTo, me).includes(mv.to);
    // 0. The piece that stood on the landing square stepped off it, and the
    // pawn is safe there now.
    if (mv.from === brkTo && safeNow) return mk('clears-square', null);
    if (lostBefore && safeNow && prepTouches) {
      return mk('guards-square', null);
    }
    // 2. A rook on the file the break opens: the break pawn's file or the
    // file of the pawn it strikes, with no other pawn of the mover's on it.
    const onlyBreakPawn = (f: string): boolean => {
      for (let r = 1; r <= 8; r += 1) {
        const sq = `${f}${r}` as Square;
        const p = after.get(sq);
        if (p && p.type === 'p' && p.color === me && sq !== brkFrom) return false;
      }
      return true;
    };
    if (mv.piece === 'r' && (mv.to[0] === brkFrom[0] || mv.to[0] === brkTo[0]) && mv.from[0] !== mv.to[0] && onlyBreakPawn(mv.to[0])) {
      return mk('rook-on-file', mv.to[0]);
    }
    return null;

    function mk(reason: ReadyReason, file: string | null): BreakPrep {
      return {
        prep: { san: mv.san, from: mv.from, to: mv.to, piece: mv.piece },
        brk: { san: m.san, from: brkFrom, to: brkTo },
        between: mine,
        reason, file,
        squares: [...new Set([mv.from, mv.to, brkFrom, brkTo])],
        key: `break-prep:${brkFrom}${brkTo}`,
      };
    }
  }
  return null;
}

function student(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

/** The preparation said from the mover's seat. */
export function breakPrepLine(p: BreakPrep, fenBefore: string, whose: 'your' | 'their'): string {
  const brk = `${student(fenBefore) === 'b' ? '…' : ''}${p.brk.san}`;
  const key = stemKeyOf(`${fenBefore}|break-prep|${p.brk.from}${p.brk.to}`);
  const lead = rotateStem([
    `This gets the ${brk} break ready.`,
    `The point is the ${brk} break that comes next.`,
  ], key);
  const piece = NAME[p.prep.piece];
  const WHY: Record<ReadyReason, string> = {
    'clears-square': `The ${piece} stood on ${p.brk.to}, the square the pawn needs. Now it is out of the way, and the pawn is safe there.`,
    'guards-square': `Played now, ${brk} would just drop the pawn on ${p.brk.to}. After this move ${p.brk.to} is guarded, so the break works.`,
    'rook-on-file': `The rook is on the ${p.file}-file first, so the file the break opens is already ${whose === 'your' ? 'yours' : 'theirs'}.`,
  };
  const why = WHY[p.reason];
  return `${lead} ${why}`;
}

/**
 * The break the engine's best move plays now, with what it is for — the
 * position read's "the break is due". `bestUci`: the engine's best move on
 * `fen` for the side `me` to move. Null when it is no break with a reason.
 */
export function breakDueNow(fen: string, me: Color, bestUci: string | null): { text: string; squares: string[]; key: string } | null {
  if (!bestUci) return null;
  let san: string;
  try {
    const b = new Chess(fen);
    if (b.turn() !== me) return null;
    san = b.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] }).san;
  } catch { return null; }
  const pb = pawnBreak(fen, san, 'your', null, true);
  if (!pb) return null;
  const key = stemKeyOf(`${fen}|break-due|${bestUci}`);
  const lead = rotateStem(['Now is the moment to strike.', 'The time to break is now.'], key);
  return { text: `${lead} ${pb.text}`, squares: pb.squares, key: pb.key };
}

export interface BreakStop {
  /** The move that stops it. */
  stop: { san: string; from: Square; to: Square; piece: PieceSymbol };
  /** Their break, as they would have played it before the move. */
  brk: { san: string; from: Square; to: Square };
  /** How it is stopped: it can no longer be played, or the pawn is lost. */
  how: 'illegal' | 'drops-pawn';
  squares: Square[];
  key: string;
}

/**
 * The break of theirs the move `san` on `fenBefore` takes away, or null. Their
 * break was a break with a reason on the board before the move (read as if it
 * were their turn) and landed safely; after the move it is not legal, or the
 * pawn is lost on its square by the legal exchange.
 */
export function breakStopped(fenBefore: string, san: string): BreakStop | null {
  let after: Chess;
  let mv: Move;
  try { after = new Chess(fenBefore); mv = after.move(san); } catch { return null; }
  if (after.inCheck()) return null;
  const me: Color = mv.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const asThem = sideToMoveAs(fenBefore, them);
  if (!asThem) return null;
  const board = new Chess(asThem);
  const beforeBoard = new Chess(fenBefore);
  for (const b of board.moves({ verbose: true })) {
    if (b.piece !== 'p' || b.captured) continue;
    // Only a break the move can have touched: it lands on (or passes) the
    // square, or the move changed who hits the square — read first, cheap.
    const path = Math.abs(Number(b.to[1]) - Number(b.from[1])) === 2 ? `${b.from[0]}${(Number(b.from[1]) + Number(b.to[1])) / 2}` : null;
    const count = (c: Chess): string => `${stackedAttackers(c, b.to, me).length}:${stackedAttackers(c, b.to, them).length}`;
    if (mv.to !== b.to && mv.to !== path && count(beforeBoard) === count(after)) continue;
    // Their break must be worth something and land safely before the move.
    if (!pawnBreak(asThem, b.san, 'their', null, true)) continue;
    board.move(b);
    const safeBefore = legalSeeGainFor(board.fen(), b.to, me) <= 0;
    board.undo();
    if (!safeBefore) continue;
    // After the move, on their real turn.
    let how: BreakStop['how'] | null = null;
    const a = new Chess(after.fen());
    let played;
    try { played = a.move({ from: b.from, to: b.to }); } catch { played = null; }
    if (!played) how = 'illegal';
    else if (legalSeeGainFor(a.fen(), b.to, me) >= 1) how = 'drops-pawn';
    if (!how) continue;
    return {
      stop: { san: mv.san, from: mv.from, to: mv.to, piece: mv.piece },
      brk: { san: b.san, from: b.from, to: b.to },
      how,
      squares: [...new Set([mv.from, mv.to, b.from, b.to])],
      key: `break-stop:${b.from}${b.to}`,
    };
  }
  return null;
}

/** The stop said from the mover's seat. */
export function breakStoppedLine(s: BreakStop, fenBefore: string, whose: 'your' | 'their'): string {
  const other = whose === 'your' ? 'their' : 'your';
  const theyMove = student(fenBefore) === 'w' ? 'b' : 'w';
  const brk = `${theyMove === 'b' ? '…' : ''}${s.brk.san}`;
  const key = stemKeyOf(`${fenBefore}|break-stop|${s.brk.from}${s.brk.to}`);
  const lead = rotateStem([
    `This stops ${other} ${brk} break before it comes.`,
    `It takes the ${brk} break away from ${whose === 'your' ? 'them' : 'you'}.`,
  ], key);
  // The break is named once, in the lead (the human voice: never the same
  // square three times in one line — "…d5 break … …d5 would now just drop the
  // pawn on d5", the decision baseline 2026-11-18).
  const how = s.how === 'illegal'
    ? s.stop.to === s.brk.to
      ? `${openSentence(whose)} ${NAME[s.stop.piece]} takes that square first, so the break can't be played.`
      : `The break can't be played now.`
    : `The pawn would just be lost there now.`;
  return `${lead} ${how}`;
}
