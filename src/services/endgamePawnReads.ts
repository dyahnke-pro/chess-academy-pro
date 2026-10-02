// ENDGAME PAWN READS — the pawn-ending ideas Naroditsky teaches most that the
// app did not compute (endgame comb 2026-10-01, "Principles of Chess Endgames":
// W0L passed pawns, iyl breakthroughs, VWe test your knowledge, Fxj advanced
// concepts, hUZ / QUq / mEZ games).
//
//   passerKinds        — a passed pawn's kind: protected, connected, outside
//   outsidePasserDecoy — in a pawn ending, the far passer is a decoy: it drags
//                        their king away while yours takes the other wing
//   pawnEndingTrade    — the move that takes the last pieces off: count the
//                        pawn ending before you trade into it
//
// A LEAF: chess.js only. Every claim is a fact on the board (or the engine's
// own cost, passed in); nothing here names a move it has not checked.
import { Chess } from 'chess.js';

type C = 'w' | 'b';
const FILES = 'abcdefgh';
const fileOf = (sq: string): number => FILES.indexOf(sq[0]);
const rankOf = (sq: string): number => Number(sq[1]);

interface Pawns { w: string[]; b: string[]; kings: Record<C, string>; pieces: Record<C, number> }
function read(fen: string): Pawns | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const out: Pawns = { w: [], b: [], kings: { w: '', b: '' }, pieces: { w: 0, b: 0 } };
  for (const row of c.board()) for (const p of row) {
    if (!p) continue;
    if (p.type === 'p') out[p.color].push(p.square);
    else if (p.type === 'k') out.kings[p.color] = p.square;
    else out.pieces[p.color] += 1;
  }
  return out;
}

function isPassed(sq: string, color: C, enemy: readonly string[]): boolean {
  const f = fileOf(sq); const r = rankOf(sq);
  return !enemy.some((e) => Math.abs(fileOf(e) - f) <= 1 && (color === 'w' ? rankOf(e) > r : rankOf(e) < r));
}

export interface PasserKind {
  square: string;
  /** Defended by one of its own pawns. */
  protected: boolean;
  /** Another passer of the same side on an adjacent file. */
  connected: boolean;
  /** Farther from the enemy pawns than any of its side's other pawns — on the
   *  wing away from the main mass (at least two files clear of every enemy pawn). */
  outside: boolean;
}

/** Every passed pawn of `color`, with its kind. */
export function passerKinds(fen: string, color: C): PasserKind[] {
  const b = read(fen);
  if (!b) return [];
  const mine = b[color]; const theirs = b[color === 'w' ? 'b' : 'w'];
  const passers = mine.filter((sq) => isPassed(sq, color, theirs));
  const back = color === 'w' ? -1 : 1;
  const gap = (sq: string): number => (theirs.length ? Math.min(...theirs.map((e) => Math.abs(fileOf(e) - fileOf(sq)))) : 8);
  return passers.map((sq) => {
    const f = fileOf(sq); const r = rankOf(sq);
    const prot = mine.some((p) => rankOf(p) === r + back && Math.abs(fileOf(p) - f) === 1);
    const conn = passers.some((p) => p !== sq && Math.abs(fileOf(p) - f) === 1);
    const outside = theirs.length > 0 && gap(sq) >= 2 && mine.every((p) => p === sq || gap(p) < gap(sq));
    return { square: sq, protected: prot, connected: conn, outside };
  });
}

export interface DecoyRead { passer: string; wing: string; text: string; squares: string[] }

/**
 * THE OUTSIDE PASSER AS A DECOY (W0L 21-24, iyl 26, VWe 21): a pure pawn
 * ending (kings and pawns only); `color` has an outside passer their king can
 * still catch (inside its square — otherwise it simply queens, which is the
 * rule-of-the-square lesson); both sides have pawns on the other wing. The
 * passer is pushed to drag their king over, and your king takes the other wing.
 */
export function outsidePasserDecoy(fen: string, color: C): DecoyRead | null {
  const b = read(fen);
  if (!b || b.pieces.w || b.pieces.b) return null;
  const enemy: C = color === 'w' ? 'b' : 'w';
  const outside = passerKinds(fen, color).find((k) => k.outside);
  if (!outside) return null;
  const f = fileOf(outside.square);
  const far = (sq: string): boolean => Math.abs(fileOf(sq) - f) >= 3;
  const theirWing = b[enemy].filter(far);
  const myWing = b[color].filter(far);
  if (!theirWing.length || !myWing.length) return null;
  // Their king can catch it (inside the square) — the decoy, not a race.
  const promo = `${outside.square[0]}${color === 'w' ? 8 : 1}`;
  const toGo = Math.abs((color === 'w' ? 8 : 1) - rankOf(outside.square));
  const k = b.kings[enemy];
  const kingDist = Math.max(Math.abs(fileOf(k) - fileOf(promo)), Math.abs(rankOf(k) - rankOf(promo)));
  if (kingDist > toGo + 1) return null;
  const side = theirWing.some((s) => fileOf(s) >= 4) ? 'kingside' : 'queenside';
  return {
    passer: outside.square,
    wing: side,
    text: `Your outside passed pawn on ${outside.square} is a decoy: push it, and while their king goes to stop it, yours walks over and takes the pawns on the ${side}.`,
    squares: [outside.square, ...theirWing],
  };
}

export interface PawnEndingTrade { text: string; verdict: 'lost' | 'won' | 'held' }

/**
 * COUNT THE PAWN ENDING BEFORE YOU TRADE INTO IT (QUq 08, VWe 06, hUZ 06, mEZ
 * 06). `san` from `fenBefore` takes the last pieces off — after it and the
 * forced recapture (`replySan`, when given) only kings and pawns remain.
 * `cpLoss` is the engine's cost of the move; `evalAfterCp` the student's eval
 * after it. Null unless the trade really reaches a pure pawn ending.
 */
export function pawnEndingTrade(fenBefore: string, san: string, replySan: string | null, cpLoss: number, evalAfterCp: number | null): PawnEndingTrade | null {
  const before = read(fenBefore);
  if (!before || before.pieces.w + before.pieces.b === 0) return null;
  let c: Chess;
  let to: string;
  try {
    c = new Chess(fenBefore);
    to = c.move(san).to;
    if (replySan) c.move(replySan);
  } catch { return null; }
  const pure = (fen: string): boolean => { const r = read(fen); return !!r && r.pieces.w + r.pieces.b === 0; };
  // No reply known yet: the trade is real when taking back on the square
  // leaves only kings and pawns.
  const reached = pure(c.fen()) || (!replySan && c.moves({ verbose: true }).some((m) => {
    if (m.to !== to) return false;
    const t = new Chess(c.fen()); t.move(m); return pure(t.fen());
  }));
  if (!reached) return null;
  if (cpLoss >= 100) {
    return { verdict: 'lost', text: 'That trade went into a pawn ending that does not hold. Before you trade the last pieces, count the pawn ending out — it cannot be undone.' };
  }
  if (evalAfterCp !== null && evalAfterCp >= 200) {
    return { verdict: 'won', text: 'Trading into the pawn ending was right — it is winning. Count it out first, then trade: pawn endings are the most concrete endings there are.' };
  }
  return { verdict: 'held', text: 'That takes it into a pawn ending. Every tempo counts now — count the king moves and the pawn moves before each step.' };
}


/**
 * SPARE TEMPI — ONE SQUARE AT A TIME (n3F 12-16, Fxj 04-07, iyl 39-41): in a
 * pawn ending a pawn's single steps are spare moves, and pushing it two squares
 * throws one away. Said only when the engine proves it: the student pushed a
 * pawn two squares, the engine's best was the SAME pawn one square, and the
 * difference cost at least a pawn. Kings and pawns only.
 */
export function spareTempoWasted(fenBefore: string, san: string, bestSan: string | null, cpLoss: number): string | null {
  if (!bestSan || cpLoss < 100) return null;
  const b = read(fenBefore);
  if (!b || b.pieces.w + b.pieces.b !== 0) return null;
  try {
    const played = new Chess(fenBefore).move(san);
    const best = new Chess(fenBefore).move(bestSan);
    if (played.piece !== 'p' || best.piece !== 'p' || played.from !== best.from) return null;
    if (Math.abs(rankOf(played.to) - rankOf(played.from)) !== 2 || Math.abs(rankOf(best.to) - rankOf(best.from)) !== 1) return null;
  } catch { return null; }
  return `In a pawn ending every pawn step is a spare move — ${bestSan} kept one in reserve, and the two-square push threw it away. One square at a time, so you still have a waiting move when the kings face off.`;
}

/**
 * CHART A COURSE — the king goes to the weakest pawn, not the centre (n3F
 * 19-21 and 53-56, mhU 09-11). Kings and pawns only: the target is the nearest
 * enemy pawn no pawn of theirs can ever defend (no friendly pawn on an
 * adjacent file behind it). Said as the king's destination, never as a move.
 */
export function kingCourse(fen: string, color: C): { target: string; text: string } | null {
  const b = read(fen);
  if (!b || b.pieces.w + b.pieces.b !== 0) return null;
  const enemy: C = color === 'w' ? 'b' : 'w';
  const theirs = b[enemy];
  const k = b.kings[color];
  if (!k) return null;
  const behind = (p: string, q: string): boolean => (enemy === 'w' ? rankOf(q) <= rankOf(p) : rankOf(q) >= rankOf(p));
  const weak = theirs.filter((p) => !theirs.some((q) => q !== p && Math.abs(fileOf(q) - fileOf(p)) === 1 && behind(p, q)));
  if (!weak.length) return null;
  const dist = (sq: string): number => Math.max(Math.abs(fileOf(sq) - fileOf(k)), Math.abs(rankOf(sq) - rankOf(k)));
  const target = [...weak].sort((x, y) => dist(x) - dist(y))[0];
  if (dist(target) <= 1) return null;
  return { target, text: `Chart a course: your king's job is the pawn on ${target} — no pawn of theirs can ever defend it. In a pawn ending the king heads for the weak pawn, not the centre.` };
}

/**
 * THE BREAKTHROUGH (iyl, his whole breakthroughs video; the platform's
 * Breakthrough lesson). Read off a best line (SAN, from `fen`): the side to
 * move's first move is a PAWN SACRIFICE — a pawn to a square an enemy pawn
 * attacks — and one of that side's pawns promotes within the next ten plies.
 * Kings and pawns only. Null when the line is not that.
 */
export function findBreakthrough(fen: string, line: readonly string[]): { sac: string; queens: string } | null {
  const b = read(fen);
  if (!b || b.pieces.w + b.pieces.b !== 0) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  let first;
  try { first = c.move(line[0]); } catch { return null; }
  if (first.piece !== 'p') return null;
  if (!c.moves({ verbose: true }).some((m) => m.piece === 'p' && m.to === first.to && !!m.captured)) return null;
  for (let i = 1; i < line.length && i < 12; i += 1) {
    let m;
    try { m = c.move(line[i]); } catch { return null; }
    if (m.color === side && m.promotion) return { sac: first.san, queens: m.to };
  }
  return null;
}
