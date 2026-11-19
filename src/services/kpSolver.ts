// kpSolver — THE EXACT VALUE OF A KING-AND-PAWN ENDING (WO-PICTURE-01, David
// 2026-11-19: "the coach explains WHY a try fails the way Daniel Naroditsky
// does").
//
// Danya rules a try out with "White cannot make progress" and "the king gets
// there first": draws held by the kings and the tempo, not by a locked wall.
// The board computers could only SAY a drawing shape (`drawnEnding`); nothing
// could PROVE a kings-and-pawns board drawn. This does, the way a tablebase
// does, over the rules alone:
//
//   kpVerdict(fen) — kings and pawns only, at most MAX_MEN men: win for White,
//   win for Black, draw, or `unknown` when the proof does not close inside the
//   budget. It never guesses.
//
// THE SEARCH is retrograde, one PAWN SLICE at a time. Pawns only move forward,
// so every board with the same pawns forms a slice in which only the kings move
// (and kings can go round in circles: a cycle that nobody can break is a draw,
// which a depth-bounded search cannot prove). A pawn move or a king taking a
// pawn leaves the slice for a smaller one, solved first (memoised). Inside a
// slice, a standard win/loss propagation over the king moves; what no side can
// force is a draw. The board primitives are `zugzwangIfPassed`'s own (one
// set of kings-and-pawns rules, shared).
//
// WHAT A PROMOTION IS WORTH (the only place the solver leaves kings and pawns):
// a queen the other king cannot take at once, with no stalemate, against pawns
// that are all at least three pushes from queening, wins. A queen their king
// takes at once is worth no more than the board after the capture. A queen that
// stalemates is a draw for that move, and the rook is tried in its place (it
// wins only against a bare king). Anything else — a queen against a pawn about
// to queen — is UNKNOWN, carried as an interval: each value is a [low, high]
// bound, the slice is solved once with every unknown at its best for White and
// once at its worst, and a board is proven only where both agree. A knight or
// bishop promotion is not searched (a known limit: such a move could only add
// to the promoting side's chances).
//
// THE WHY (`kpDrawReason`): on a proven draw where one side has more pawns,
// the solved moves say why it holds — the defending king reaches the square in
// front of the pawn or a key square first, or every try the attacker has is met
// (the try that asks the most precise answer, and the answer that holds).
//
// PURE: chess.js reads the board and names the moves (G0).
import { Chess, type Color, type Square } from 'chess.js';
import { type KP, fileOf, rankOf, near, pawnHits, readKP } from './zugzwangIfPassed';
import { pawnKeySquares } from './keySquareRead';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export type KpValue = 'white' | 'black' | 'draw' | 'unknown';

export interface KpVerdict {
  value: KpValue;
  /** Slices solved (fresh, this call) — the work it took. */
  slices: number;
}

/** Kings and pawns, men at most. */
export const MAX_MEN = 7;
/** Pawn slices one call may solve before it answers `unknown` (a slice is
 *  about 3 ms; slices solved by earlier calls are kept and cost nothing). */
export const KP_SLICE_BUDGET = 400;
/** The board-computer path's budget (about 200 ms cold; the cache makes the
 *  boards of one game cheap after the first). */
export const KP_FAST_BUDGET = 80;
/** Slices kept between calls (8 KB each). */
const CACHE_MAX = 1500;

const N = 8192;
const KING_STEPS: number[][] = Array.from({ length: 64 }, (_, s) => {
  const out: number[] = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const f = fileOf(s) + df; const r = rankOf(s) + dr;
    if (f >= 0 && f <= 7 && r >= 0 && r <= 7) out.push(r * 8 + f);
  }
  return out;
});
/** The king steps flat (8 slots a square, `KN` used), for the hot loops. */
const KS = new Uint8Array(64 * 8);
const KN = new Uint8Array(64);
for (let k = 0; k < 64; k++) { KN[k] = KING_STEPS[k].length; KING_STEPS[k].forEach((t, j) => { KS[k * 8 + j] = t; }); }
/** Kings a step apart (or on one square), as a table. */
const NEAR = new Uint8Array(64 * 64);
for (let a = 0; a < 64; a++) for (let b = 0; b < 64; b++) NEAR[a * 64 + b] = near(a, b) ? 1 : 0;
const PAWN_HITS: number[][][] = [0, 1].map((c) => Array.from({ length: 64 }, (_, s) => pawnHits(s, c as 0 | 1)));

const idxOf = (kw: number, kb: number, t: number): number => (((kw << 6) | kb) << 1) | t;
const enc = (lo: number, hi: number, nm: number): number => (lo + 1) | ((hi + 1) << 2) | (nm << 4);
const decLo = (v: number): number => (v & 3) - 1;
const decHi = (v: number): number => ((v >> 2) & 3) - 1;
const decNm = (v: number): number => (v >> 4) & 1;

class OutOfBudget extends Error {}

interface Ctx { fresh: number; budget: number }

const CACHE = new Map<string, Uint8Array>();
/** Forget every solved slice (tests and measurements that time a cold solve). */
export function kpClearCache(): void { CACHE.clear(); }
const sliceKey = (wp: readonly number[], bp: readonly number[]): string => `${[...wp].sort((a, b) => a - b).join(',')}|${[...bp].sort((a, b) => a - b).join(',')}`;

/** A slice already solved that is this one's mirror image: across the files
 *  (a ↔ h), across the colours (White's pawns become Black's, ranks turned),
 *  or both. Kings and pawns have no castling, so each image has the same
 *  values, read through the same image of the kings. */
type Image = { slice: Uint8Array; sq: number; colours: boolean };
function imageOf(wp: readonly number[], bp: readonly number[]): Image | null {
  const tries: Array<[number, boolean]> = [[7, false], [56, true], [63, true]];
  for (const [x, colours] of tries) {
    const w = (colours ? bp : wp).map((s) => s ^ x);
    const b = (colours ? wp : bp).map((s) => s ^ x);
    const hit = CACHE.get(sliceKey(w, b));
    if (hit) return { slice: hit, sq: x, colours };
  }
  return null;
}

function getSlice(wp: number[], bp: number[], ctx: Ctx): Uint8Array {
  const key = sliceKey(wp, bp);
  const hit = CACHE.get(key);
  if (hit) return hit;
  if (++ctx.fresh > ctx.budget) throw new OutOfBudget();
  // The budget, the cache and the order of every child slice stay exactly
  // the search's own (an image is counted as a fresh slice and its children
  // are still asked for): only the king tables are read off the image.
  const s = solveSlice(wp, bp, ctx, imageOf(wp, bp));
  if (CACHE.size >= CACHE_MAX) CACHE.clear();
  CACHE.set(key, s);
  return s;
}

/** A bound pair, White's view. */
type Iv = [number, number];
const neg = (v: Iv): Iv => [-v[1], -v[0]];

/** The board a promotion is read on: 1 where a man stands. */
const PBOARD = new Uint8Array(64);

/** A queen (or rook, `rook`) on `from` hits `target` across PBOARD. */
function sliderHits(from: number, target: number, rook: boolean): boolean {
  const ff = fileOf(target) - fileOf(from); const rr = rankOf(target) - rankOf(from);
  if (!ff && !rr) return false;
  const straight = ff === 0 || rr === 0;
  if (!straight && (rook || Math.abs(ff) !== Math.abs(rr))) return false;
  const df = Math.sign(ff); const dr = Math.sign(rr);
  let f = fileOf(from) + df; let r = rankOf(from) + dr;
  while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
    const t = r * 8 + f;
    if (t === target) return true;
    if (PBOARD[t]) return false;
    f += df; r += dr;
  }
  return false;
}

/** A pawn of `side` in `pawns` (but not on `skip`) hits `sq`. */
function pawnsHit(pawns: readonly number[], side: 0 | 1, sq: number, skip: number): boolean {
  for (let k = 0; k < pawns.length; k++) { const p = pawns[k]; if (p !== skip && PAWN_HITS[side][p].includes(sq)) return true; }
  return false;
}

/** One move of theirs (pawn `s` to `dest`, taking `cap` or -1) leaves their
 *  king safe from the new piece and the promoting side's pawns. */
function pawnMoveSafe(s: number, dest: number, cap: number, to: number, ko: number, rook: boolean, mine: readonly number[], me: 0 | 1): boolean {
  PBOARD[s] = 0; const was = PBOARD[dest]; PBOARD[dest] = 1;
  const safe = !sliderHits(to, ko, rook) && !pawnsHit(mine, me, ko, cap);
  PBOARD[dest] = was; PBOARD[s] = 1;
  return safe;
}

/** After the promotion to a queen (or a rook), the other side is mated, is
 *  stalemated, or has a move. */
function afterPromotion(me: 0 | 1, km: number, ko: number, mine: readonly number[], theirs: readonly number[], to: number, rook: boolean): 0 | 1 | 2 {
  const op = (1 - me) as 0 | 1;
  PBOARD.fill(0);
  PBOARD[km] = 1; PBOARD[to] = 1;
  for (const p of mine) PBOARD[p] = 1;
  for (const p of theirs) PBOARD[p] = 1;
  // Their king steps (the piece's lines read through the king's own square;
  // a pawn of the promoting side taken only where nothing else guards it).
  for (const t of KING_STEPS[ko]) {
    if (t === to || theirs.includes(t) || NEAR[t * 64 + km] || pawnsHit(mine, me, t, t)) continue;
    if (sliderHits(to, t, rook)) continue;
    return 2;
  }
  PBOARD[ko] = 1;
  const inCheck = sliderHits(to, ko, rook) || pawnsHit(mine, me, ko, -1);
  // Their pawn moves, each tried for the king's safety (a pin, a check).
  const dir = op === 0 ? 8 : -8;
  for (const s of theirs) {
    const one = s + dir;
    if (one >= 0 && one < 64 && !PBOARD[one]) {
      if (pawnMoveSafe(s, one, -1, to, ko, rook, mine, me)) return 2;
      const two = s + 2 * dir;
      if (rankOf(s) === (op === 0 ? 1 : 6) && !PBOARD[two] && pawnMoveSafe(s, two, -1, to, ko, rook, mine, me)) return 2;
    }
    for (const h of PAWN_HITS[op][s]) if (mine.includes(h) && pawnMoveSafe(s, h, h, to, ko, rook, mine, me)) return 2;
  }
  return inCheck ? 0 : 1;
}

const IV_WIN: Iv = [1, 1]; const IV_DRAW: Iv = [0, 0]; const IV_ANY: Iv = [-1, 1]; const IV_NOT_LOST: Iv = [0, 1];

/**
 * A promotion's worth for the promoting side `me` (its own view): `mine`
 * without the promoting pawn, `theirs` after any capture, the new piece on
 * `to`. `child`: the slice after their king takes the new piece.
 */
function promotionValue(me: 0 | 1, km: number, ko: number, mine: readonly number[], theirs: readonly number[], to: number, child: () => Uint8Array): Iv {
  const op = (1 - me) as 0 | 1;
  const guarded = NEAR[to * 64 + km] === 1 || pawnsHit(mine, me, to, -1);
  if (NEAR[to * 64 + ko] && !guarded) {
    // Their king takes it at once: worth no more than the board after that.
    const v = child()[me === 0 ? idxOf(km, to, me) : idxOf(to, km, me)];
    return [-1, me === 0 ? decHi(v) : -decLo(v)];
  }
  const q = afterPromotion(me, km, ko, mine, theirs, to, false);
  if (q === 0) return IV_WIN;
  if (q === 2) {
    for (const p of theirs) if ((op === 0 ? 7 - rankOf(p) : rankOf(p)) < 3) return IV_ANY;
    return IV_WIN;
  }
  // The queen stalemates: that move is a draw; the rook in its place.
  const r = afterPromotion(me, km, ko, mine, theirs, to, true);
  if (r === 0) return IV_WIN;
  if (r === 1) return IV_DRAW;
  return theirs.length === 0 ? IV_WIN : IV_NOT_LOST;
}

const SCRATCH = {
  valid: new Uint8Array(N), inChk: new Uint8Array(N), exLo: new Int8Array(N), exHi: new Int8Array(N), hasEx: new Uint8Array(N),
  fwdN: new Uint8Array(N), noMoves: new Uint8Array(N),
  status: new Int8Array(N), decided: new Uint8Array(N), remaining: new Uint8Array(N), queue: new Int32Array(N),
  outHi: new Int8Array(N), outLo: new Int8Array(N),
  steps: new Uint8Array(2 * 64 * 8), stepN: new Uint8Array(2 * 64),
};

function solveSlice(wp: number[], bp: number[], ctx: Ctx, image: Image | null = null): Uint8Array {
  const res = new Uint8Array(N);
  if (wp.length === 0 && bp.length === 0) { res.fill(enc(0, 0, 0)); return res; }
  const pawns: [number[], number[]] = [wp, bp];
  const occ = new Int8Array(64);
  for (const p of wp) occ[p] = 1;
  for (const p of bp) occ[p] = 2;
  const att: [Uint8Array, Uint8Array] = [new Uint8Array(64), new Uint8Array(64)];
  for (const c of [0, 1] as const) for (const p of pawns[c]) for (const h of PAWN_HITS[c][p]) att[c][h]++;


  const addExit = (i: number, me: number, lo: number, hi: number): void => {
    if (!hasEx[i]) { exLo[i] = lo; exHi[i] = hi; hasEx[i] = 1; return; }
    if (me === 0) { if (lo > exLo[i]) exLo[i] = lo; if (hi > exHi[i]) exHi[i] = hi; }
    else { if (lo < exLo[i]) exLo[i] = lo; if (hi < exHi[i]) exHi[i] = hi; }
  };
  const without = (arr: readonly number[], x: number): number[] => arr.filter((p) => p !== x);
  const moved = (arr: readonly number[], a: number, b: number): number[] => arr.map((p) => (p === a ? b : p));
  const sliceFor = (me: 0 | 1, mine: number[], theirs: number[]): Uint8Array => (me === 0 ? getSlice(mine, theirs, ctx) : getSlice(theirs, mine, ctx));

  // Every pawn move of each side, its child slice solved once (the kings only
  // decide whether it is legal: a king in the way, a check).
  interface PMove { s: number; to: number; cap: number; two: number; promo: boolean; mine: number[]; theirs: number[]; rest: number[]; child: Uint8Array; childFn: () => Uint8Array;
    epTakers: Array<{ q: number; child: Uint8Array }> }
  const pmoves: [PMove[], PMove[]] = [[], []];
  const capSlice: [Array<Uint8Array | undefined>, Array<Uint8Array | undefined>] = [new Array<Uint8Array | undefined>(64), new Array<Uint8Array | undefined>(64)];
  for (const me of [0, 1] as const) {
    const op = (1 - me) as 0 | 1;
    const mine = pawns[me]; const theirs = pawns[op];
    const dir = me === 0 ? 8 : -8; const last = me === 0 ? 7 : 0;
    for (const p of theirs) capSlice[me][p] = sliceFor(me, mine, without(theirs, p));
    const push = (m: Omit<PMove, 'child' | 'childFn' | 'epTakers' | 'rest'>): void => {
      // A promotion's child is the board after their king takes the new piece.
      const child = m.promo ? sliceFor(me, without(mine, m.s), m.theirs) : sliceFor(me, m.mine, m.theirs);
      const epTakers: PMove['epTakers'] = [];
      if (m.two >= 0) {
        for (const q of theirs) if (rankOf(q) === rankOf(m.to) && Math.abs(fileOf(q) - fileOf(m.to)) === 1) {
          epTakers.push({ q, child: sliceFor(me, without(m.mine, m.to), moved(theirs, q, m.two)) });
        }
      }
      pmoves[me].push({ ...m, rest: without(mine, m.s), child, childFn: () => child, epTakers });
    };
    for (const s of mine) {
      const one = s + dir;
      if (!occ[one]) {
        push({ s, to: one, cap: -1, two: -1, promo: rankOf(one) === last, mine: moved(mine, s, one), theirs });
        const two = s + 2 * dir;
        if (rankOf(s) === (me === 0 ? 1 : 6) && !occ[two]) push({ s, to: two, cap: -1, two: one, promo: false, mine: moved(mine, s, two), theirs });
      }
      for (const h of PAWN_HITS[me][s]) if (occ[h] === op + 1) {
        push({ s, to: h, cap: h, two: -1, promo: rankOf(h) === last, mine: moved(mine, s, h), theirs: without(theirs, h) });
      }
    }
  }

  // Every child slice is solved above. A mirror image already solved gives
  // the king tables (each valid board read through the image; the colour
  // image turns White's view round: a win for one is a win for the other).
  if (image) {
    const x = image.sq; const src = image.slice;
    for (let kw = 0; kw < 64; kw++) for (let kb = 0; kb < 64; kb++) {
      if (NEAR[kw * 64 + kb] || occ[kw] || occ[kb]) continue;
      for (let t = 0; t < 2; t++) {
        const ko = t === 0 ? kb : kw;
        if (att[t][ko]) continue;
        if (!image.colours) { res[idxOf(kw, kb, t)] = src[idxOf(kw ^ x, kb ^ x, t)]; continue; }
        const v = src[idxOf(kb ^ x, kw ^ x, 1 - t)];
        res[idxOf(kw, kb, t)] = enc(-decHi(v), -decLo(v), decNm(v));
      }
    }
    return res;
  }

  // Nothing below recurses: the scratch tables are shared between slices.
  const { valid, inChk, exLo, exHi, hasEx, fwdN, noMoves } = SCRATCH;
  // Each side's king steps off its own pawns and off the squares the other
  // side's pawns hit, read once a slice (the kings' distance is read below).
  const { steps, stepN } = SCRATCH;
  for (let me = 0; me < 2; me++) {
    const op = 1 - me;
    for (let k = 0; k < 64; k++) {
      let n = 0;
      for (let j = 0; j < KN[k]; j++) { const t = KS[k * 8 + j]; if (occ[t] !== me + 1 && !att[op][t]) steps[(me * 64 + k) * 8 + n++] = t; }
      stepN[me * 64 + k] = n;
    }
  }
  valid.fill(0); inChk.fill(0); hasEx.fill(0); fwdN.fill(0); noMoves.fill(0);
  for (let kw = 0; kw < 64; kw++) for (let kb = 0; kb < 64; kb++) {
    if (NEAR[kw * 64 + kb] || occ[kw] || occ[kb]) continue;
    for (let t = 0; t < 2; t++) {
      const me = t as 0 | 1; const op = (1 - t) as 0 | 1;
      const km = me === 0 ? kw : kb; const ko = me === 0 ? kb : kw;
      if (att[me][ko]) continue; // the side not to move is in check
      const i = idxOf(kw, kb, t);
      valid[i] = 1;
      const checks = att[op][km];
      if (checks) inChk[i] = 1;
      let moves = 0;
      const sb = (me * 64 + km) * 8; const sn = stepN[me * 64 + km];
      for (let j = 0; j < sn; j++) {
        const s = steps[sb + j];
        if (NEAR[s * 64 + ko]) continue;
        moves++;
        const ci = me === 0 ? idxOf(s, kb, op) : idxOf(kw, s, op);
        if (occ[s] === op + 1) { const v = (capSlice[me][s] as Uint8Array)[ci]; addExit(i, me, decLo(v), decHi(v)); }
        else fwdN[i]++;
      }
      if (checks < 2) {
        let checker = -1;
        if (checks) for (const p of pawns[op]) if (PAWN_HITS[op][p].includes(km)) checker = p;
        const ci = idxOf(kw, kb, op);
        for (const m of pmoves[me]) {
          if (m.cap < 0) {
            if (checks || m.to === kw || m.to === kb || (m.two >= 0 && (m.two === kw || m.two === kb))) continue;
          } else if (checks && m.cap !== checker) continue;
          moves++;
          if (m.promo) {
            const v = promotionValue(me, km, ko, m.rest, m.theirs, m.to, m.childFn);
            if (me === 0) addExit(i, me, v[0], v[1]); else addExit(i, me, -v[1], -v[0]);
            continue;
          }
          const base = m.child[ci];
          if (!m.epTakers.length) { addExit(i, me, decLo(base), decHi(base)); continue; }
          // The other side may take en passant: its best of the plain board
          // (unless it had no move there) and each capture.
          let lo = 0; let hi = 0; let first = true;
          const take = (l: number, h: number): void => {
            if (first) { lo = l; hi = h; first = false; return; }
            if (op === 0) { lo = Math.max(lo, l); hi = Math.max(hi, h); } else { lo = Math.min(lo, l); hi = Math.min(hi, h); }
          };
          if (!decNm(base)) take(decLo(base), decHi(base));
          for (const e of m.epTakers) { const v = e.child[idxOf(kw, kb, me)]; take(decLo(v), decHi(v)); }
          addExit(i, me, lo, hi);
        }
      }
      if (!moves) noMoves[i] = 1;
    }
  }

  // Win/loss propagation over the king moves, once per bound.
  const passHi = propagate(valid, exHi, hasEx, fwdN, noMoves, inChk, SCRATCH.outHi);
  let unknown = false;
  for (let i = 0; i < N; i++) if (valid[i] && hasEx[i] && exLo[i] !== exHi[i]) { unknown = true; break; }
  const passLo = unknown ? propagate(valid, exLo, hasEx, fwdN, noMoves, inChk, SCRATCH.outLo) : passHi;
  for (let i = 0; i < N; i++) if (valid[i]) res[i] = enc(passLo[i], passHi[i], noMoves[i]);
  return res;
}

/** The values (White's view) with every exit taken at `ex`. */
function propagate(valid: Uint8Array, ex: Int8Array, hasEx: Uint8Array, fwdN: Uint8Array,
  noMoves: Uint8Array, inChk: Uint8Array, out: Int8Array): Int8Array {
  // status in the mover's view: 1 win, -1 loss, 0 draw; decided marks it final.
  const { status, decided, remaining } = SCRATCH;
  status.fill(0); decided.fill(0); remaining.fill(0);
  const exM = (i: number): number => ((i & 1) === 0 ? ex[i] : -ex[i]);
  const queue = SCRATCH.queue; let qh = 0; let qt = 0;
  const set = (i: number, v: number): void => { status[i] = v; decided[i] = 1; if (v !== 0) queue[qt++] = i; };
  for (let i = 0; i < N; i++) {
    if (!valid[i]) continue;
    if (noMoves[i]) { set(i, inChk[i] ? -1 : 0); continue; }
    if (hasEx[i] && exM(i) === 1) { set(i, 1); continue; }
    remaining[i] = fwdN[i];
    if (fwdN[i] === 0) set(i, exM(i));
  }
  while (qh < qt) {
    const s = queue[qh++];
    // Its predecessors by a king move: the side that just moved had its king
    // on a square next to where it stands (any valid such board can step
    // here: this board being valid proves the step legal).
    const t = s & 1; const kw = s >> 7; const kb = (s >> 1) & 63;
    const moverWhite = t === 1;
    const from = moverWhite ? kw : kb;
    for (let j = 0, n = KN[from]; j < n; j++) {
      const st = KS[from * 8 + j];
      const p = moverWhite ? idxOf(st, kb, 0) : idxOf(kw, st, 1);
      if (!valid[p] || decided[p]) continue;
      if (status[s] === -1) set(p, 1);
      else if (--remaining[p] === 0) set(p, hasEx[p] && exM(p) === 0 ? 0 : -1);
    }
  }
  out.fill(0);
  for (let i = 0; i < N; i++) if (valid[i]) out[i] = (i & 1) === 0 ? status[i] : -status[i];
  return out;
}

/** The en-passant square of the FEN, when a pawn of the side to move can take there. */
function epSquare(fen: string): number {
  const f = fen.split(' ')[3];
  if (!f || f === '-') return -1;
  return (Number(f[1]) - 1) * 8 + (f.charCodeAt(0) - 97);
}

function valueOf(b: KP, ep: number, ctx: Ctx): Iv {
  const sl = getSlice(b.p[0], b.p[1], ctx);
  const base = sl[idxOf(b.k[0], b.k[1], b.turn)];
  if (ep < 0) return [decLo(base), decHi(base)];
  const me = b.turn; const op = (1 - me) as 0 | 1;
  const dir = me === 0 ? 8 : -8;
  const victim = ep - dir;
  const takers = b.p[me].filter((p) => PAWN_HITS[me][p].includes(ep));
  if (!takers.length || !b.p[op].includes(victim)) return [decLo(base), decHi(base)];
  const opts: Iv[] = decNm(base) ? [] : [[decLo(base), decHi(base)]];
  for (const q of takers) {
    const nMine = b.p[me].map((p) => (p === q ? ep : p)); const nTheirs = b.p[op].filter((p) => p !== victim);
    const s2 = me === 0 ? getSlice(nMine, nTheirs, ctx) : getSlice(nTheirs, nMine, ctx);
    const v = s2[idxOf(b.k[0], b.k[1], op)];
    opts.push([decLo(v), decHi(v)]);
  }
  const pick = me === 0 ? Math.max : Math.min;
  return [pick(...opts.map((o) => o[0])), pick(...opts.map((o) => o[1]))];
}

/** The proven value of a kings-and-pawns board, or `unknown`. Null when the
 *  board is not kings and pawns (or has more than MAX_MEN men). */
export function kpVerdict(fen: string, budget: number = KP_SLICE_BUDGET): KpVerdict | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.board().flat().filter(Boolean).length > MAX_MEN) return null;
  const b = readKP(c);
  if (!b) return null;
  const ctx: Ctx = { fresh: 0, budget };
  if (c.isCheckmate()) return { value: b.turn === 0 ? 'black' : 'white', slices: 0 };
  if (c.isStalemate()) return { value: 'draw', slices: 0 };
  try {
    const [lo, hi] = valueOf(b, epSquare(fen), ctx);
    if (lo !== hi) return { value: 'unknown', slices: ctx.fresh };
    return { value: lo === 1 ? 'white' : lo === -1 ? 'black' : 'draw', slices: ctx.fresh };
  } catch (e) {
    if (e instanceof OutOfBudget) return { value: 'unknown', slices: ctx.fresh };
    throw e;
  }
}

/** Every legal move on a kings-and-pawns board with the proven value after it
 *  (queen promotions only; see the header). */
export function kpMoveValues(fen: string, budget: number = KP_SLICE_BUDGET): Array<{ san: string; from: Square; to: Square; piece: string; value: KpValue }> | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (!readKP(c)) return null;
  const out: Array<{ san: string; from: Square; to: Square; piece: string; value: KpValue }> = [];
  for (const m of c.moves({ verbose: true })) {
    if (m.promotion && m.promotion !== 'q') continue;
    if (m.promotion) {
      // A queen leaves kings and pawns: score it as the search does.
      const after = new Chess(fen); after.move(m);
      const v = after.isCheckmate() ? (c.turn() === 'w' ? 'white' : 'black') : promotionVerdict(fen, m.from, m.to);
      out.push({ san: m.san, from: m.from, to: m.to, piece: m.piece, value: v });
      continue;
    }
    const after = new Chess(fen); after.move(m);
    out.push({ san: m.san, from: m.from, to: m.to, piece: m.piece, value: kpVerdict(after.fen(), budget)?.value ?? 'unknown' });
  }
  return out;
}

function promotionVerdict(fen: string, from: Square, to: Square): KpValue {
  const c = new Chess(fen);
  const b = readKP(c);
  if (!b) return 'unknown';
  const sq = (s: string): number => (Number(s[1]) - 1) * 8 + (s.charCodeAt(0) - 97);
  const me = b.turn; const op = (1 - me) as 0 | 1;
  const f = sq(from); const t = sq(to);
  try {
    const mine = b.p[me].filter((p) => p !== f); const theirs = b.p[op].filter((p) => p !== t);
    const ctx: Ctx = { fresh: 0, budget: KP_SLICE_BUDGET };
    const v = promotionValue(me, b.k[me], b.k[op], mine, theirs, t, () => (me === 0 ? getSlice(mine, theirs, ctx) : getSlice(theirs, mine, ctx)));
    const w = me === 0 ? v : neg(v);
    if (w[0] !== w[1]) return 'unknown';
    return w[0] === 1 ? 'white' : w[0] === -1 ? 'black' : 'draw';
  } catch (e) {
    if (e instanceof OutOfBudget) return 'unknown';
    throw e;
  }
}

// ── THE WHY OF A PROVEN DRAW ──────────────────────────────────────────────

export interface KpDrawReason {
  /** The side a pawn or more up, which cannot win. */
  attacker: Color;
  /** `front`: the defending king gets in front of the passed pawn first;
   *  `key`: onto its key square first; `met`: every try is met. */
  kind: 'front' | 'key' | 'met';
  /** The attacker's try that asks the most precise answer, and the answer. */
  tryMove: { san: string; from: Square; to: Square } | null;
  answer: { san: string; from: Square; to: Square; only: boolean } | null;
  /** The defending king's square that holds (after the answer, or now). */
  holdSquare: Square | null;
  /** The pawn the defending king stands in front of. */
  pawn: Square | null;
  text: string;
  squares: Square[];
}

const sqName = (s: number): Square => `${String.fromCharCode(97 + fileOf(s))}${rankOf(s) + 1}` as Square;
const sqNum = (s: string): number => (Number(s[1]) - 1) * 8 + (s.charCodeAt(0) - 97);

/** The defending king on `ks` blocks an attacker pawn: in front of it on its
 *  file (within two squares), or on one of its key squares. */
function kingInFrontOf(ks: number, pawns: readonly number[], atk: 0 | 1): { pawn: number; how: 'file' | 'key' } | null {
  const ahead = (p: number): number => (atk === 0 ? rankOf(ks) - rankOf(p) : rankOf(p) - rankOf(ks));
  const sorted = [...pawns].sort((a, b) => (atk === 0 ? rankOf(b) - rankOf(a) : rankOf(a) - rankOf(b)));
  for (const p of sorted) if (fileOf(p) === fileOf(ks) && ahead(p) >= 1) return { pawn: p, how: 'file' };
  for (const p of sorted) if (pawnKeySquares(sqName(p), atk === 0 ? 'w' : 'b').includes(sqName(ks))) return { pawn: p, how: 'key' };
  return null;
}

/**
 * Why a proven draw holds, when one side has more pawns: from the solved moves
 * (`kpMoveValues`). `student` words the seats. Null when the board is not a
 * proven draw with a side a pawn or more up.
 */
export function kpDrawReason(fen: string, student: Color, opts: { attacker?: Color; budget?: number } = {}): KpDrawReason | null {
  const v = kpVerdict(fen, opts.budget);
  if (!v || v.value !== 'draw') return null;
  const c = new Chess(fen);
  const b = readKP(c);
  if (!b) return null;
  const up = b.p[0].length === b.p[1].length ? null : (b.p[0].length > b.p[1].length ? 0 : 1);
  // The side that wanted more: named by the caller (the side whose win the
  // draw threw away), or the side with more pawns.
  const atk: 0 | 1 | null = opts.attacker ? (opts.attacker === 'w' ? 0 : 1) : up;
  if (atk === null) return null;
  const def = (1 - atk) as 0 | 1;
  const pawnUp = up === atk;
  const attacker: Color = atk === 0 ? 'w' : 'b';
  const mover: Color = c.turn();
  const key = stemKeyOf(fen.split(' ').slice(0, 2).join(' '));
  const mineAtk = attacker === student;
  const atkKing = mineAtk ? 'your king' : 'their king';
  const DefKing = mineAtk ? 'Their king' : 'Your king';
  const atkPawn = mineAtk ? 'your pawn' : 'their pawn';
  const dotted = (san: string, col: Color): string => (col === 'b' ? `…${san}` : san);

  // The defender's drawing answer to a board (the defender to move).
  const answerOn = (f0: string): { san: string; from: Square; to: Square; only: boolean } | null => {
    const mv = kpMoveValues(f0, opts.budget);
    if (!mv) return null;
    const holds = mv.filter((m) => m.value === 'draw');
    if (!holds.length) return null;
    // The answer a strong player gives: the king in front of the pawn, then
    // onto a key square, then any king move, then the rest.
    const order = (m: typeof holds[number]): number => {
      if (m.piece !== 'k') return 3;
      const f = kingInFrontOf(sqNum(m.to), readKP(new Chess(f0))?.p[atk] ?? [], atk);
      return f ? (f.how === 'file' ? 0 : 1) : 2;
    };
    const pick = [...holds].sort((x, y) => order(x) - order(y) || x.san.localeCompare(y.san))[0];
    return { san: pick.san, from: pick.from, to: pick.to, only: holds.length === 1 && mv.length > 1 };
  };

  let tryMove: KpDrawReason['tryMove'] = null;
  let answer: KpDrawReason['answer'] = null;
  if (mover === attacker) {
    // Every try draws at best: the one that asks the defender the most precise
    // answer (the fewest drawing replies), a king move before a pawn move.
    const mv = kpMoveValues(fen, opts.budget) ?? [];
    let best: { t: typeof mv[number]; holds: number; ans: NonNullable<ReturnType<typeof answerOn>> } | null = null;
    for (const t of mv) {
      if (t.value !== 'draw') continue;
      const after = new Chess(fen); after.move(t.san);
      const replies = kpMoveValues(after.fen(), opts.budget) ?? [];
      const holds = replies.filter((r) => r.value === 'draw').length;
      const ans = answerOn(after.fen());
      if (!ans || holds === 0) continue;
      const better = !best || holds < best.holds || (holds === best.holds && (t.piece === 'k' ? 0 : 1) < (best.t.piece === 'k' ? 0 : 1))
        || (holds === best.holds && (t.piece === 'k') === (best.t.piece === 'k') && t.san < best.t.san);
      if (better) best = { t, holds, ans };
    }
    if (best) { tryMove = { san: best.t.san, from: best.t.from, to: best.t.to }; answer = best.ans; }
  } else {
    answer = answerOn(fen);
  }
  // Where the defending king stands once the answer is played (or now).
  let hold = b.k[def];
  let atkPawns = b.p[atk];
  let defPawns = b.p[def];
  if (answer || tryMove) {
    const after = new Chess(fen);
    if (tryMove) after.move(tryMove.san);
    if (answer) after.move(answer.san);
    const ab = readKP(after);
    if (ab) { hold = ab.k[def]; atkPawns = ab.p[atk]; defPawns = ab.p[def]; }
  }
  // Only a passed pawn has a square in front to hold.
  const passed = atkPawns.filter((p) => !defPawns.some((q) => Math.abs(fileOf(q) - fileOf(p)) <= 1 && (atk === 0 ? rankOf(q) > rankOf(p) : rankOf(q) < rankOf(p))));
  const front = kingInFrontOf(hold, passed, atk);
  const squares: Square[] = [];
  const parts: string[] = [];
  const at = sqName(hold);
  if (front && front.how === 'file') {
    parts.push(rotateStem([
      `${DefKing} gets to ${at} first, in front of ${atkPawn}, and holds the draw.`,
      `${DefKing} reaches ${at} in time, right in front of ${atkPawn}. That holds the draw.`,
    ], key));
    squares.push(at, sqName(front.pawn));
  } else if (front) {
    parts.push(rotateStem([
      `${DefKing} gets to ${at} first. That is a key square of ${atkPawn}, the square ${atkKing} needed, and it holds the draw.`,
      `${DefKing} takes ${at} first, the key square ${atkKing} needed in front of ${atkPawn}. That holds the draw.`,
    ], key));
    squares.push(at, sqName(front.pawn));
  } else {
    parts.push(pawnUp ? rotateStem([
      `${mineAtk ? 'You are' : 'They are'} a pawn up, but ${mineAtk ? 'you' : 'they'} cannot make progress.`,
      `The extra pawn does not win: ${atkKing} has no way through.`,
    ], key) : rotateStem([
      `${mineAtk ? 'You' : 'They'} cannot make progress: it is a draw.`,
      `There is no way through for ${atkKing}, so it is a draw.`,
    ], key));
    squares.push(at);
  }
  const defColor: Color = attacker === 'w' ? 'b' : 'w';
  if (tryMove && answer) {
    const Whose = mineAtk ? 'Your' : 'Their';
    parts.push(rotateStem([
      `Every try is met. ${Whose} most testing one, ${dotted(tryMove.san, attacker)}, runs into ${dotted(answer.san, defColor)}.`,
      `Even the best try, ${dotted(tryMove.san, attacker)}, is met by ${dotted(answer.san, defColor)}.`,
    ], key));
    squares.push(tryMove.to, answer.to);
  } else if (answer && answer.only) {
    parts.push(`${dotted(answer.san, defColor)} is the only move that holds it.`);
    squares.push(answer.to);
  }
  return {
    attacker, kind: front ? (front.how === 'file' ? 'front' : 'key') : 'met', tryMove, answer,
    holdSquare: sqName(hold), pawn: front ? sqName(front.pawn) : null,
    text: parts.join(' '), squares: [...new Set(squares)],
  };
}
