// wonEnding — WHY A WON PAWN ENDING IS WON (WO-PICTURE-01, David 2026-11-19:
// "the coach explains WHY a try fails the way Daniel Naroditsky does").
//
// `kpDrawReason` says why a proven draw holds; nothing said why a proven WIN
// wins, so "that loses the pawn ending by force" went out with no reason. The
// verdict is `kpVerdict`'s (kings and pawns, solved exactly); the reason is a
// shape on the board, each computed, the first that holds:
//
//   outsideSquare   — a passed pawn whose path is clear, and the other king
//                     outside its square (the double step and the side to move
//                     counted), while none of theirs queens as fast;
//   connected       — two connected passed pawns the king cannot take: each
//                     is guarded by the other, or taking it leaves the king
//                     outside the square of the other;
//   keySquare       — the winner's king on a key square of its passed pawn;
//   opposition      — the winner holds the opposition, and whichever way the
//                     other king steps, its king reaches a key square;
//   protectedPasser — a passed pawn guarded by a pawn, against a side with
//                     pawns of its own: their king can never take it, and it
//                     ties that king down;
//   outsidePasser   — a passed pawn three files or more from every other pawn,
//                     against a side with pawns elsewhere: it drags their king
//                     away from them.
// No shape, no reason: null (never a generic "it's winning"). Board fact only
// when the solver PROVES the win. PURE: chess.js, the solver and the key
// squares (G0).
import { Chess, type Color, type Square } from 'chess.js';
import { KP_FAST_BUDGET, kpVerdict } from './kpSolver';
import { isPassedPawn, keySquaresOn } from './keySquareRead';
import { seatWords } from './engineLineRead';
import { orList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export type WinReason = 'outsideSquare' | 'connected' | 'keySquare' | 'opposition' | 'protectedPasser' | 'outsidePasser';

export interface WonEnding {
  reason: WinReason;
  /** The side that wins. */
  side: Color;
  text: string;
  squares: Square[];
  key: string;
}

interface Man { type: string; color: Color; square: Square }
const fileOf = (s: string): number => s.charCodeAt(0) - 97;
const rankOf = (s: string): number => Number(s[1]);
const cheb = (a: string, b: string): number => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
const otherSide = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const promoOf = (s: string, c: Color): Square => `${s[0]}${c === 'w' ? 8 : 1}` as Square;

/** Moves a pawn needs to queen, the double step from its start counted. */
export function pushesToQueen(s: string, c: Color): number {
  const toGo = c === 'w' ? 8 - rankOf(s) : rankOf(s) - 1;
  const start = c === 'w' ? rankOf(s) === 2 : rankOf(s) === 7;
  return start ? toGo - 1 : toGo;
}

/** The king on `king` can catch a pawn of `c` on `pawn`: inside its square,
 *  `pawnToMove` saying whose move it is. */
export function kingInSquare(king: string, pawn: string, c: Color, pawnToMove: boolean): boolean {
  return cheb(king, promoOf(pawn, c)) <= pushesToQueen(pawn, c) + (pawnToMove ? 0 : 1);
}

/** No man on the squares in front of the pawn up to its queening square. */
function pathClear(all: readonly Man[], p: Man): boolean {
  const d = p.color === 'w' ? 1 : -1;
  for (let r = rankOf(p.square) + d; r >= 1 && r <= 8; r += d) if (all.some((m) => m.square === `${p.square[0]}${r}`)) return false;
  return true;
}

/** The pawn of `p.color` on `guard` protects `p`. */
const protects = (guard: Man, p: Man): boolean => guard.type === 'p' && guard.color === p.color
  && Math.abs(fileOf(guard.square) - fileOf(p.square)) === 1 && rankOf(p.square) - rankOf(guard.square) === (p.color === 'w' ? 1 : -1);

/** WHY THE PAWN ENDING ON `fen` IS WON, from `student`'s seat, or null: a
 *  proven win (`kpVerdict`) and the shape on the board that wins it. */
export function wonEnding(fen: string, student: Color, budget: number = KP_FAST_BUDGET): WonEnding | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const all: Man[] = c.board().flat().filter((x): x is NonNullable<typeof x> => !!x).map((x) => ({ type: x.type, color: x.color, square: x.square }));
  if (all.some((m) => m.type !== 'k' && m.type !== 'p')) return null;
  const v = kpVerdict(fen, budget);
  if (!v || (v.value !== 'white' && v.value !== 'black')) return null;
  const W: Color = v.value === 'white' ? 'w' : 'b';
  const L = otherSide(W);
  const kW = all.find((m) => m.type === 'k' && m.color === W)?.square;
  const kL = all.find((m) => m.type === 'k' && m.color === L)?.square;
  if (!kW || !kL) return null;
  const toMove = c.turn();
  const posKey = fen.split(' ').slice(0, 2).join(' ');
  const k = stemKeyOf(posKey);
  const U = seatWords(W, student);
  const D = seatWords(L, student);
  const mine = all.filter((m) => m.type === 'p' && m.color === W);
  const theirs = all.filter((m) => m.type === 'p' && m.color === L);
  const passers = mine.filter((p) => isPassedPawn(all, p))
    .sort((a, b) => pushesToQueen(a.square, W) - pushesToQueen(b.square, W) || a.square.localeCompare(b.square));
  const make = (reason: WinReason, text: string, squares: Square[]): WonEnding => ({ reason, side: W, text, squares: [...new Set(squares)], key: `won-ending:${reason}:${posKey}` });
  const fastestTheirs = Math.min(99, ...theirs.filter((p) => isPassedPawn(all, p) && pathClear(all, p)).map((p) => pushesToQueen(p.square, L)));

  // ── THE PAWN RUNS: their king outside its square ──
  for (const p of passers) {
    if (!pathClear(all, p)) continue;
    const n = pushesToQueen(p.square, W);
    if (n >= fastestTheirs) continue;
    if (kingInSquare(kL, p.square, W, toMove === W)) continue;
    const promo = promoOf(p.square, W);
    return make('outsideSquare', rotateStem([
      `${D.Whose} king is outside the square of ${U.whose} ${p.square[0]}-pawn: it cannot catch it, and the pawn runs through to ${promo}.`,
      `${U.Whose} ${p.square[0]}-pawn simply runs: ${D.whose} king stands outside its square and never reaches ${promo} in time.`,
    ], k), [p.square, promo, kL]);
  }

  // ── TWO CONNECTED PASSERS THE KING CANNOT TAKE ──
  for (let i = 0; i < passers.length; i += 1) {
    for (let j = i + 1; j < passers.length; j += 1) {
      const a = passers[i]; const b = passers[j];
      if (Math.abs(fileOf(a.square) - fileOf(b.square)) !== 1 || Math.abs(rankOf(a.square) - rankOf(b.square)) > 1) continue;
      // Taking `taken` loses: it is guarded by the other pawn or the king, or
      // the king that took it stands outside the other's square (the pawns to move).
      const safe = (taken: Man, runner: Man): boolean => protects(runner, taken) || cheb(kW, taken.square) <= 1
        || (pathClear(all.filter((m) => m.square !== taken.square), runner) && !kingInSquare(taken.square, runner.square, W, true));
      if (!safe(a, b) || !safe(b, a)) continue;
      const pair = [a.square, b.square].sort() as [Square, Square];
      return make('connected', rotateStem([
        `${U.Whose} connected pawns on ${pair[0]} and ${pair[1]} look after each other: ${D.whose} king cannot take either one without the other running away, and it cannot stop both.`,
        `${D.Whose} king cannot touch ${U.whose} pawns on ${pair[0]} and ${pair[1]}: taking one lets the other run, so the two walk through together.`,
      ], k), [...pair, kL]);
    }
  }

  // ── THE KING ON A KEY SQUARE, OR THE OPPOSITION ──
  const ks = keySquaresOn(fen, W);
  if (ks && ks.side === W && (ks.kind === 'holds' || ks.kind === 'opposition')) {
    const pawnName = `${U.whose} ${ks.pawn[0]}-pawn`;
    if (ks.kind === 'holds') {
      return make('keySquare', rotateStem([
        `${U.Whose} king on ${ks.king} stands on a key square of ${pawnName}: from there it escorts the pawn home, and the ending is won.`,
        `The ending is won because ${U.whose} king has reached ${ks.king}, a key square of ${pawnName}, and nothing can push it off.`,
      ], k), [ks.king, ks.pawn as Square]);
    }
    return make('opposition', rotateStem([
      `${U.who === 'you' ? 'You hold' : 'They hold'} the opposition: whichever way ${D.whose} king steps, ${U.whose} king goes to ${orList(ks.to)}, ${ks.to.length === 1 ? 'a key square' : 'each a key square'} of ${pawnName}. That wins.`,
      `The opposition wins it: ${D.whose} king has to give way, and ${U.whose} king walks to ${orList(ks.to)}, ${ks.to.length === 1 ? 'a key square' : 'each a key square'} of ${pawnName}.`,
    ], k), [ks.king, ...ks.to, ks.pawn as Square]);
  }

  // ── A PROTECTED PASSER, AGAINST PAWNS OF THEIRS ──
  if (theirs.length) {
    for (const p of passers) {
      const guard = mine.find((g) => protects(g, p));
      if (!guard) continue;
      return make('protectedPasser', rotateStem([
        `${U.Whose} passed pawn on ${p.square} is protected by the pawn on ${guard.square}: ${D.whose} king can never take it and has to stay in front of it, so ${U.whose} king is free to go after ${D.whose} pawns.`,
        `${D.Whose} king is tied to ${U.whose} protected passer on ${p.square}: it can never take it, and while it watches the pawn, ${U.whose} king eats ${D.whose} pawns.`,
      ], k), [p.square, guard.square, kL]);
    }
  }

  // ── THE OUTSIDE PASSER, THE DECOY ──
  if (theirs.length) {
    for (const p of passers) {
      const others = all.filter((m) => m.type === 'p' && m.square !== p.square);
      if (!others.every((m) => Math.abs(fileOf(m.square) - fileOf(p.square)) >= 3)) continue;
      const wing = theirs.every((m) => fileOf(m.square) >= 4) ? ' on the kingside' : theirs.every((m) => fileOf(m.square) <= 3) ? ' on the queenside' : '';
      return make('outsidePasser', rotateStem([
        `${U.Whose} ${p.square[0]}-pawn is an outside passed pawn: it drags ${D.whose} king over to stop it, far from ${D.whose} pawns${wing}, and ${U.whose} king takes them.`,
        `The outside passer on ${p.square} is the win: ${D.whose} king has to go and stop it, and that leaves ${D.whose} pawns${wing} to ${U.whose} king.`,
      ], k), [p.square, kL]);
    }
  }
  return null;
}
