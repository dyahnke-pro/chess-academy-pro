// THE STRUCTURAL CAUSES OF A MISTAKE (WO-LEARN-MISTAKES-ONLY, step B — the
// new rows of docs/teaching-cards/MISTAKE-CAUSES.md §B).
//
// `errorWhy` reads what a costly move ALLOWED and MISSED in material; a move
// that wins and loses nothing on the board but still costs was `positional`
// at best and `unexplained` at worst. These readers say what the move changed
// that is not material: a bishop's colour given away, a pawn left weak by a
// trade, a passed pawn handed over, an attack let go, a stalemate, an ending's
// rule broken, a move they could ignore.
//
// PURE: chess.js, the board readers that already exist (each named at its
// use — never a second copy), and the saved engine lines errorWhy already
// receives. No engine call, no Dexie. Every reader answers only what the
// MOVE caused: where the better move's own line shows the same thing, it was
// not this move's doing and the reader stays silent.
import { Chess, type Color, type Square } from 'chess.js';
import { describeStructure, newPawnWeaknesses } from './boardStructure';
import { canBeAimedAt, findPassedPawns, findWeakPawns, findWeakSquares, legalSeeGainFor, oppositionRead } from './positionReadingService';
import { blockade } from './blockade';
import { compensationReasons } from './compensation';
import { initiativeRead } from './initiativeRead';
import { materialBalance } from './pieceValues';
import { quietBalance } from './material';
import { emptyCheckAt } from './emptyCheck';
import { detectBluff } from './bluffDetector';
import { keySquaresOn } from './keySquareRead';
import { CONVERSION_EDGE } from './conversionMethod';
import { relativeRank } from './outpost';
import { DEFENDER_RULES, type DefenderRuleId } from './endgameDefenderRules';
import { classifyMatchup } from './endgameMatchup';
import { freedSquare, minorRetreat, missedTempo, wrongOrder } from './causeReaders';

export type StructuralCause =
  /** The move (or the reply it allowed) leaves their king no legal move and
   *  no check, with the mover ahead. `king`: their king's square. */
  | { kind: 'stalemate'; king: string; plies: number }
  /** An ending's method broken: the mover's king left/missed the key square,
   *  the opposition was given up, or a rook left its place behind a passer. */
  | { kind: 'technique-broken'; rule: TechniqueBrokenRule; piece: 'k' | 'r'; square: string; better: string | null }
  /** Their pawn that is newly passed (or whose blockade the move lifted). */
  | { kind: 'passer-handed'; pawn: string; toQueen: number; kingDistance: number; how: 'created' | 'blockade-lifted' }
  /** Down material for an attack, a quiet move, and the attack is gone. */
  | { kind: 'compensation-lost'; down: number; reasons: string[]; consolidate: string | null }
  /** A trade that leaves a pawn of the mover's weak where they can aim at it. */
  | { kind: 'traded-into-target'; pawn: string; weakness: 'isolated' | 'doubled' | 'backward' }
  /** The mover's last bishop of one colour traded off while theirs stays. */
  | { kind: 'colour-conceded'; colour: 'light' | 'dark'; target: string; enemyBishop: string; pawnTargets: string[]; holes: string[] }
  /** A move they can ignore: a check that is simply blocked, or an answer to
   *  a piece that threatened nothing. */
  | { kind: 'tempo-wasted'; how: TempoWastedHow; squares: string[]; answer?: 'block' | 'king' };

/** The ending rules a played move can break (`techniqueBroken`). */
export type TechniqueBrokenRule = 'key-square' | 'opposition' | 'rook-behind-passer' | 'king-in-front-of-pawn' | 'philidor-third-rank';
/** How a move gave the tempo away: a check simply met, an answer to a move
 *  that threatened nothing, an unforced retreat, a quiet move where a move
 *  with tempo was there, the right move in the wrong order, a chase that frees
 *  their stuck piece (`causeReaders`). */
export type TempoWastedHow = 'empty-check' | 'answered-bluff' | 'retreat' | 'missed-tempo' | 'wrong-order' | 'freed-square';

export type StructuralCauseKind = StructuralCause['kind'];

export interface StructuralArgs {
  fenBefore: string;
  playedSan: string;
  /** The line after the played move, their reply first. */
  replyLineUci: readonly string[];
  /** The better move's line, the better move first; null when unknown. */
  bestLineUci: readonly string[] | null;
  bestSan: string | null;
  costCp: number | null;
  priorMove: { fenBefore: string; san: string } | null;
}

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const shade = (sq: string): 'light' | 'dark' => ((sq.charCodeAt(0) - 97 + Number(sq[1]) - 1) % 2 === 0 ? 'dark' : 'light');
const cheb = (a: string, b: string): number => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));

/** Play `uci` on `c` as far as it is legal; the plies actually played. */
function playUci(c: Chess, uci: readonly string[], max: number, keep?: (m: { captured?: string }, i: number) => boolean): number {
  let n = 0;
  for (const u of uci.slice(0, max)) {
    let m;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    if (!m) break;
    n += 1;
    if (keep && !keep(m, n)) break;
  }
  return n;
}

/** The board after the played move and `plies` of the reply line. */
function afterPlayed(a: StructuralArgs, plies: number): Chess | null {
  try {
    const c = new Chess(a.fenBefore);
    if (!c.move(a.playedSan)) return null;
    playUci(c, a.replyLineUci, plies);
    return c;
  } catch { return null; }
}

/** The board after the better move's line, `plies` deep. */
function afterBest(a: StructuralArgs, plies: number): Chess | null {
  if (!a.bestLineUci?.length) return null;
  try {
    const c = new Chess(a.fenBefore);
    return playUci(c, a.bestLineUci, plies) ? c : null;
  } catch { return null; }
}

/** The mover's edge in points, the capture on offer counted only where the
 *  raw count agrees (the rule `compensation` keeps). */
function edgeOf(fen: string, mover: Color): number {
  const quiet = quietBalance(fen); const raw = materialBalance(fen);
  const bal = Math.sign(quiet) === Math.sign(raw) ? Math.sign(raw) * Math.min(Math.abs(quiet), Math.abs(raw)) : 0;
  return mover === 'w' ? bal : -bal;
}

// ── stalemate ──────────────────────────────────────────────────────────────
/** The move, or the reply line within two plies, stalemates THEIR king while
 *  the mover is ahead by the conversion edge (`stalemateWatch`'s bar). */
export function stalemateCause(a: StructuralArgs): StructuralCause | null {
  let c: Chess;
  try { c = new Chess(a.fenBefore); } catch { return null; }
  const mover = c.turn();
  const s = describeStructure(a.fenBefore);
  if (!s) return null;
  const edge = mover === 'w' ? s.material.balance : -s.material.balance;
  if (edge < CONVERSION_EDGE) return null;
  try { if (!c.move(a.playedSan)) return null; } catch { return null; }
  const kingOf = (b: Chess): string => b.findPiece({ type: 'k', color: other(mover) })[0] ?? '';
  if (c.isStalemate()) return { kind: 'stalemate', king: kingOf(c), plies: 0 };
  let plies = 0;
  for (const u of a.replyLineUci.slice(0, 2)) {
    try { if (!c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })) break; } catch { break; }
    plies += 1;
    if (c.isStalemate() && c.turn() === other(mover)) return { kind: 'stalemate', king: kingOf(c), plies };
    if (c.isGameOver()) break;
  }
  return null;
}

// ── technique-broken ───────────────────────────────────────────────────────
/** Does this ending's class hold `rule` among its defender rules? */
function endingRule(fen: string, rule: DefenderRuleId): boolean {
  try { return DEFENDER_RULES[classifyMatchup(fen).cls].includes(rule); } catch { return false; }
}

/** An ending's rule the better move kept and the played move broke:
 *  - kings and pawns: the mover's king on a key square of its passer, or
 *    holding it by the opposition (`keySquaresOn`), after the better move and
 *    not after the played one;
 *  - kings and pawns: the opposition (`oppositionRead`) held after the better
 *    move and given up by the played one;
 *  - rooks: a rook of the mover's that stood behind a passed pawn on its file
 *    leaves the file behind it, where the better move keeps it there. */
export function techniqueBroken(a: StructuralArgs): StructuralCause | null {
  let before: Chess;
  try { before = new Chess(a.fenBefore); } catch { return null; }
  const mover = before.turn();
  const played = afterPlayed(a, 0);
  const best = afterBest(a, 1);
  if (!played || !best || !a.bestSan) return null;
  const pieces = before.board().flat().filter((x): x is NonNullable<typeof x> => !!x);
  const pawnEnding = pieces.every((p) => p.type === 'k' || p.type === 'p');
  const king = (b: Chess): string => b.findPiece({ type: 'k', color: mover })[0] ?? '';
  if (pawnEnding) {
    const good = (b: Chess): boolean => { const r = keySquaresOn(b.fen(), mover); return !!r && r.side === mover && (r.kind === 'holds' || r.kind === 'opposition'); };
    // A king on a key square wins by itself: the opposition is only the rule
    // where no key square is held (Kf4 for Ke4 keeps one; no opposition lost).
    if (good(played)) return null;
    if (good(best)) return { kind: 'technique-broken', rule: 'key-square', piece: 'k', square: king(best), better: a.bestSan };
    if (oppositionRead(best.fen(), mover)?.holds && !oppositionRead(played.fen(), mover)?.holds) {
      return { kind: 'technique-broken', rule: 'opposition', piece: 'k', square: king(best), better: a.bestSan };
    }
    // The defender's king in front of the passer (`DEFENDER_RULES`): it stood
    // in front of their passer, the played move left, the better move stays.
    const inFront = (b: Chess): boolean => {
      const k = king(b);
      return !!k && findPassedPawns(b.fen(), other(mover)).some((p) => p[0] === k[0] && (other(mover) === 'w' ? Number(k[1]) > Number(p[1]) : Number(k[1]) < Number(p[1])));
    };
    if (endingRule(a.fenBefore, 'king-in-front-of-pawn') && inFront(before) && !inFront(played) && inFront(best)) {
      return { kind: 'technique-broken', rule: 'king-in-front-of-pawn', piece: 'k', square: king(before), better: a.bestSan };
    }
    return null;
  }
  // The rook behind the passer: only in an ending (no queens, few pieces).
  const s = describeStructure(a.fenBefore);
  if (!s?.material.endgameType || s.material.queensOn) return null;
  const behindPasser = (b: Chess, rook: string): boolean => {
    for (const side of ['w', 'b'] as Color[]) {
      for (const p of findPassedPawns(b.fen(), side)) {
        if (p[0] !== rook[0]) continue;
        const pr = Number(p[1]); const rr = Number(rook[1]);
        if (side === 'w' ? rr >= pr : rr <= pr) continue;
        // Nothing between the rook and the pawn.
        const step = side === 'w' ? 1 : -1;
        let clear = true;
        for (let r = rr + step; r !== pr; r += step) if (b.get(`${rook[0]}${r}` as Square)) { clear = false; break; }
        if (clear) return true;
      }
    }
    return false;
  };
  let mv;
  try { mv = new Chess(a.fenBefore).move(a.playedSan); } catch { return null; }
  if (!mv || mv.piece !== 'r' || mv.captured) return null;
  // THE PHILIDOR THIRD RANK (`DEFENDER_RULES`): one rook each, their passers
  // no further than the fifth rank, the defender's rook leaves its third
  // rank while the better move keeps a rook there.
  const oneRookEach = pieces.every((p) => p.type === 'k' || p.type === 'p' || p.type === 'r')
    && pieces.filter((p) => p.type === 'r' && p.color === mover).length === 1
    && pieces.filter((p) => p.type === 'r' && p.color !== mover).length === 1;
  const third = mover === 'w' ? '3' : '6';
  const theirPassers = findPassedPawns(a.fenBefore, other(mover));
  if (oneRookEach && endingRule(a.fenBefore, 'philidor-third-rank') && theirPassers.length > 0 && theirPassers.every((p) => relativeRank(p, other(mover)) <= 5)
    && mv.from[1] === third && mv.to[1] !== third && !played.inCheck()
    && best.board().flat().some((p) => p?.type === 'r' && p.color === mover && p.square[1] === third)) {
    return { kind: 'technique-broken', rule: 'philidor-third-rank', piece: 'r', square: mv.from, better: a.bestSan };
  }
  if (!behindPasser(before, mv.from)) return null;
  if (behindPasser(played, mv.to)) return null;
  // The better move keeps that rook where it is.
  const bestMv = (() => { try { return new Chess(a.fenBefore).move(a.bestSan); } catch { return null; } })();
  if (!bestMv || bestMv.from === mv.from) return null;
  if (best.get(mv.from)?.type !== 'r' || !behindPasser(best, mv.from)) return null;
  return { kind: 'technique-broken', rule: 'rook-behind-passer', piece: 'r', square: mv.from, better: a.bestSan };
}

// ── passer-handed ──────────────────────────────────────────────────────────
/** Their pawn that is passed after the move and its answer (two plies of the
 *  reply line) and was not before — on a file that held no passer of theirs,
 *  that the mover cannot simply win, and that the better move's own line
 *  does not give them; or their passer whose blockade the move lifted
 *  (`blockade` 'lifted'). Out of its own half, or anywhere in an ending. */
export function passerHanded(a: StructuralArgs): StructuralCause | null {
  let before: Chess;
  try { before = new Chess(a.fenBefore); } catch { return null; }
  const mover = before.turn(); const them = other(mover);
  const promo = (p: string): string => `${p[0]}${them === 'w' ? 8 : 1}`;
  const shape = (p: string, b: Chess, how: 'created' | 'blockade-lifted'): StructuralCause => {
    const k = b.findPiece({ type: 'k', color: mover })[0] ?? promo(p);
    return { kind: 'passer-handed', pawn: p, toQueen: 8 - relativeRank(p, them), kingDistance: cheb(k, promo(p)), how };
  };
  const lifted = blockade(a.fenBefore, a.playedSan);
  if (lifted?.kind === 'lifted' && lifted.side === mover) {
    const b = afterPlayed(a, 0);
    if (b) return shape(lifted.pawn, b, 'blockade-lifted');
  }
  const settled = afterPlayed(a, 2);
  if (!settled) return null;
  const files = (fen: string): Set<string> => new Set(findPassedPawns(fen, them).map((p) => p[0]));
  const had = files(a.fenBefore);
  const best = afterBest(a, 3);
  const bestFiles = best ? files(best.fen()) : new Set<string>();
  const ending = !!describeStructure(settled.fen())?.material.endgameType;
  for (const p of findPassedPawns(settled.fen(), them)) {
    if (had.has(p[0]) || bestFiles.has(p[0])) continue;
    if (!ending && relativeRank(p, them) < 4) continue;
    if (legalSeeGainFor(settled.fen(), p, mover) > 0) continue;
    return shape(p, settled, 'created');
  }
  return null;
}

// ── compensation-lost ──────────────────────────────────────────────────────
/** The mover was down material with something for it on the board
 *  (`compensationReasons`) or the initiative in the better move's line
 *  (`initiativeRead`), the better move was forcing (a check or a capture) and
 *  the played move was quiet, and in the reply line the initiative is not the
 *  mover's any more. */
export function compensationLost(a: StructuralArgs): StructuralCause | null {
  let before: Chess;
  try { before = new Chess(a.fenBefore); } catch { return null; }
  const mover = before.turn();
  const down = -edgeOf(a.fenBefore, mover);
  if (down < 1 || !a.bestSan || !a.bestLineUci?.length) return null;
  let mv; let bestMv;
  try { mv = new Chess(a.fenBefore).move(a.playedSan); bestMv = new Chess(a.fenBefore).move(a.bestSan); } catch { return null; }
  if (!mv || !bestMv || mv.captured || /[+#]/.test(mv.san)) return null;
  if (!bestMv.captured && !/[+#]/.test(bestMv.san)) return null;
  const { reasons } = compensationReasons(before, mover, mover);
  const ini = initiativeRead(a.fenBefore, [{ moves: [...a.bestLineUci] }]);
  if (ini?.side === mover) reasons.push('you have the initiative');
  if (!reasons.length) return null;
  const played = afterPlayed(a, 0);
  if (!played) return null;
  const after = a.replyLineUci.length ? initiativeRead(played.fen(), [{ moves: [...a.replyLineUci] }]) : null;
  if (after?.side === mover) return null;
  let consolidate: string | null = null;
  try { const u = a.replyLineUci[0]; consolidate = u ? played.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })?.san ?? null : null; } catch { consolidate = null; }
  return { kind: 'compensation-lost', down: Math.round(down), reasons, consolidate };
}

// ── traded-into-target ─────────────────────────────────────────────────────
/** A trade (the move captures, or their reply takes the piece that moved)
 *  played to its quiet end leaves the mover a pawn newly isolated, doubled
 *  (`newPawnWeaknesses`) or backward (`findWeakPawns`), on a file the better
 *  move's own line leaves sound, and that they can aim a piece at
 *  (`canBeAimedAt`). */
export function tradedIntoTarget(a: StructuralArgs): StructuralCause | null {
  let c: Chess;
  try { c = new Chess(a.fenBefore); } catch { return null; }
  const mover = c.turn(); const them = other(mover);
  let mv;
  try { mv = c.move(a.playedSan); } catch { return null; }
  if (!mv) return null;
  const firstReplyTakes = (() => { const u = a.replyLineUci[0]; return !!u && u.slice(2, 4) === mv.to && !!c.get(mv.to); })();
  if (!mv.captured && !firstReplyTakes) return null;
  // The exchange to its quiet end: their reply, then captures while they last.
  playUci(c, a.replyLineUci, 3, (m, i) => i === 1 ? true : !!m.captured);
  const settled = c.fen();
  const sb = describeStructure(a.fenBefore)?.pawns; const sa = describeStructure(settled)?.pawns;
  if (!sb || !sa) return null;
  const best = afterBest(a, 3);
  const sBest = best ? describeStructure(best.fen())?.pawns : null;
  const bestBad = new Set<string>();
  if (sBest) for (const w of newPawnWeaknesses(sb, sBest, mover)) bestBad.add(w.file);
  if (best) for (const p of findWeakPawns(best.fen(), mover).backward) bestBad.add(p[0]);
  const pawnsOnFile = (f: string): string[] => c.findPiece({ type: 'p', color: mover }).filter((s) => s[0] === f)
    .sort((x, y) => (mover === 'w' ? Number(y[1]) - Number(x[1]) : Number(x[1]) - Number(y[1])));
  const candidates: { pawn: string; weakness: 'isolated' | 'doubled' | 'backward' }[] = [];
  for (const w of newPawnWeaknesses(sb, sa, mover)) {
    if (bestBad.has(w.file)) continue;
    const squares = w.squares.length ? w.squares : pawnsOnFile(w.file);
    for (const sq of squares) candidates.push({ pawn: sq, weakness: w.kind });
  }
  const backBefore = new Set(findWeakPawns(a.fenBefore, mover).backward.map((s) => s[0]));
  for (const p of findWeakPawns(settled, mover).backward) {
    if (!backBefore.has(p[0]) && !bestBad.has(p[0])) candidates.push({ pawn: p, weakness: 'backward' });
  }
  const hit = candidates.find((x) => canBeAimedAt(settled, x.pawn as Square, them));
  return hit ? { kind: 'traded-into-target', pawn: hit.pawn, weakness: hit.weakness } : null;
}

// ── colour-conceded ────────────────────────────────────────────────────────
/** THE MOVE THAT GIVES UP A COLOUR (card findColorComplexWeakness F2): after
 *  the move and their answer the mover has no bishop of one square-colour it
 *  had before, they still have one, and the mover's pawns on that colour the
 *  bishop hits (directly or through the mover's own pieces) or the holes of
 *  that colour in the mover's half (`findWeakSquares`) are its targets. No
 *  "two holes" gate: one pawn target is enough. The better move's own line
 *  keeping the bishop is what makes it this move's doing.
 *
 *  `replyLineUci`: their answer and the mover's next move (the recapture);
 *  null = no line known, then any capture of the piece that moved is the
 *  trade on offer. */
export function colourConceded(fenBefore: string, san: string, replyLineUci: readonly string[] | null = null, bestLineUci: readonly string[] | null = null): StructuralCause | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const mover = c.turn(); const them = other(mover);
  const bishopsOf = (b: Chess, side: Color): Record<'light' | 'dark', string[]> => {
    const out: Record<'light' | 'dark', string[]> = { light: [], dark: [] };
    for (const sq of b.findPiece({ type: 'b', color: side })) out[shade(sq)].push(sq);
    return out;
  };
  const had = bishopsOf(c, mover);
  let mv;
  try { mv = c.move(san); } catch { return null; }
  if (!mv) return null;
  if (replyLineUci?.length) {
    const u = replyLineUci[0];
    let r;
    try { r = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
    // A TRADE, NOT A LOSS: their capture is answered on the same square, or
    // the material is even again — a bishop simply taken is the piece lost,
    // which the material readers tell.
    const back = replyLineUci[1];
    if (r?.captured && back && back.slice(2, 4) === r.to) {
      try { c.move({ from: back.slice(0, 2), to: back.slice(2, 4), promotion: back[4] }); } catch { /* the reply stands */ }
    }
  } else {
    const take = c.moves({ verbose: true }).find((m) => m.to === mv.to && m.captured);
    if (!take) return null;
    c.move(take.san);
  }
  const raw = (fen: string): number => (mover === 'w' ? materialBalance(fen) : -materialBalance(fen));
  if (raw(c.fen()) < raw(fenBefore) - 1) return null;
  const now = bishopsOf(c, mover); const theirs = bishopsOf(c, them);
  const bestBoard = (() => {
    if (!bestLineUci?.length) return null;
    try { const b = new Chess(fenBefore); return playUci(b, bestLineUci, 2) ? b : null; } catch { return null; }
  })();
  for (const colour of ['dark', 'light'] as const) {
    if (!had[colour].length || now[colour].length || !theirs[colour].length) continue;
    if (bestBoard && !bishopsOf(bestBoard, mover)[colour].length) continue;
    const enemyBishop = theirs[colour][0];
    const pawnTargets: string[] = [];
    for (const eb of theirs[colour]) {
      for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let f = eb.charCodeAt(0) - 97 + df; let r = Number(eb[1]) + dr;
        while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
          const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
          const p = c.get(sq);
          if (p) {
            if (p.color !== mover) break;
            if (p.type === 'p' && !pawnTargets.includes(sq)) pawnTargets.push(sq);
          }
          f += df; r += dr;
        }
      }
    }
    // The pawns it hits straight away first, nearest first.
    const direct = (sq: string): number => (c.attackers(sq as Square, them).some((x) => c.get(x)?.type === 'b') ? 0 : 1);
    pawnTargets.sort((x, y) => direct(x) - direct(y) || cheb(enemyBishop, x) - cheb(enemyBishop, y));
    const holes = (mover === 'w' ? findWeakSquares(c.fen()).white : findWeakSquares(c.fen()).black)
      .filter((h) => shade(h) === colour && (mover === 'w' ? Number(h[1]) <= 4 : Number(h[1]) >= 5));
    const target = pawnTargets[0] ?? holes[0];
    if (!target) continue;
    return { kind: 'colour-conceded', colour, target, enemyBishop, pawnTargets, holes };
  }
  return null;
}

// ── tempo-wasted ───────────────────────────────────────────────────────────
/** A move they can ignore: a check their best answer simply blocks or steps
 *  out of (`emptyCheckAt`), or a move that answers their previous move when
 *  that move threatened nothing (`detectBluff`, read with the better move as
 *  the reply the bluff test asks about) — the played move moves one of its
 *  targets or adds a guard to one, quietly. */
export function tempoWasted(a: StructuralArgs): StructuralCause | null {
  const empty = emptyCheckAt(a.fenBefore, a.playedSan, a.costCp, a.replyLineUci[0] ?? null);
  if (empty) return { kind: 'tempo-wasted', how: 'empty-check', squares: empty.squares, answer: empty.kind };
  const bluffed = answeredBluff(a);
  if (bluffed) return bluffed;
  // The cause readers that give the move away (`causeReaders`).
  const back = minorRetreat(a.fenBefore, a.playedSan);
  if (back) return { kind: 'tempo-wasted', how: 'retreat', squares: [back.from, back.to] };
  const tempo = missedTempo(a.fenBefore, a.playedSan, a.bestSan);
  if (tempo) return { kind: 'tempo-wasted', how: 'missed-tempo', squares: tempo.target ? [tempo.target] : [] };
  if (a.bestLineUci && wrongOrder(a.fenBefore, a.playedSan, a.bestLineUci)) {
    return { kind: 'tempo-wasted', how: 'wrong-order', squares: [a.bestLineUci[0].slice(0, 2), a.bestLineUci[0].slice(2, 4)] };
  }
  const freed = freedSquare(a.fenBefore, a.playedSan, a.replyLineUci, a.bestSan);
  return freed ? { kind: 'tempo-wasted', how: 'freed-square', squares: [freed.square, freed.from] } : null;
}

/** A move that answers their previous move when that move threatened nothing
 *  (`detectBluff`): it moves one of the bluff's targets or adds a guard. */
function answeredBluff(a: StructuralArgs): StructuralCause | null {
  if (!a.priorMove) return null;
  const bluff = detectBluff(a.priorMove.fenBefore, a.priorMove.san, a.bestSan);
  if (!bluff) return null;
  let c: Chess; let mv;
  try { c = new Chess(a.fenBefore); mv = c.move(a.playedSan); } catch { return null; }
  if (!mv || mv.captured || c.inCheck()) return null;
  const mover = mv.color;
  for (const t of bluff.targets) {
    if (mv.from === t.square) return { kind: 'tempo-wasted', how: 'answered-bluff', squares: [bluff.square, t.square] };
    const was = new Chess(a.fenBefore).attackers(t.square as Square, mover).length;
    if (c.attackers(t.square as Square, mover).length > was) return { kind: 'tempo-wasted', how: 'answered-bluff', squares: [bluff.square, t.square] };
  }
  return null;
}

/** THE ONE STRUCTURAL CAUSE of a move, in the order a cause is told: the
 *  game thrown away first, then the ending's rule, the passer, the attack
 *  given up, the weak pawn, the colour, the tempo. */
export function readStructuralCause(a: StructuralArgs): StructuralCause | null {
  const readers: ((x: StructuralArgs) => StructuralCause | null)[] = [
    stalemateCause,
    techniqueBroken,
    passerHanded,
    compensationLost,
    tradedIntoTarget,
    (x) => colourConceded(x.fenBefore, x.playedSan, x.replyLineUci, x.bestLineUci),
    tempoWasted,
  ];
  for (const r of readers) {
    try { const out = r(a); if (out) return out; } catch { /* a reader that cannot read says nothing */ }
  }
  return null;
}
