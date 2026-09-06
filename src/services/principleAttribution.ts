/**
 * principleAttribution — WHICH FUNDAMENTAL a flagged move neglected, and the
 * proof (David 2026-09-05: "I want all mistakes to relate back to some
 * fundamental approach the user neglected. If there is one." → "make sure the
 * calculator is able to associate the error to the fundamental" → "This all
 * needs to be deterministic!!").
 *
 * ATTRIBUTION, NOT DETECTION. A fundamental attaches to a move ONLY when all
 * three hold, each computed with chess.js on the real board:
 *   1. PATTERN — the played move exhibits it (board + move history);
 *   2. PUNISHMENT — the cost the fundamental predicts is AVAILABLE and SOUND on
 *      the board right after the move (a safe centre push onto the square you
 *      left, a kick that gains a tempo, a capture that wins the piece you
 *      hung, …). Availability is a BOARD fact, so it does not depend on how
 *      deep the engine happened to search — the same move gets the same
 *      fundamentals on a phone and a desktop. The engine PV, when present, is
 *      CORROBORATION for the spoken evidence, never the gate;
 *   3. COUNTERFACTUAL — the engine's best move does NOT leave that same
 *      punishment on the board. That is what makes it THIS move's fault.
 * A pattern that is present but never punished stays SILENT. The engine
 * decides WHETHER the move was bad (the classification); this module names
 * WHY, and only where it can prove it.
 *
 * Pure. No engine, no model, no I/O — G0 by construction. Rendered by
 * principleVoice.ts; persisted PVs (annotation.pv) come from the review's
 * deep dive.
 */
import { Chess, type Color, type Square, type Move, type PieceSymbol } from 'chess.js';
import { seeGain } from './positionReadingService';
import type { MisconceptionTagId } from '../data/misconceptionTags';

export const FUNDAMENTAL_IDS = [
  // opening
  'same-piece-twice', 'tempo-handed', 'space-conceded', 'neglected-development',
  'early-queen-sortie', 'king-left-in-centre', 'greedy-pawn-grab', 'early-edge-pawns',
  'knights-before-bishops', 'buried-own-bishop', 'premature-centre-break', 'knight-to-the-rim',
  // middlegame
  'loose-piece', 'ignored-threat', 'passive-when-forcing-existed', 'weakened-king-shield',
  'created-pawn-weakness', 'overextended-pawn', 'traded-active-for-passive',
  'wrong-trade-for-material', 'worst-piece-unimproved', 'rook-ignored-open-file',
  'kept-bad-bishop',
  // endgame
  'passive-king-endgame', 'mistimed-pawn-break', 'rook-in-front-of-passer',
  'passed-pawn-neglected', 'lost-the-opposition', 'passive-rook-endgame',
] as const;
export type FundamentalId = (typeof FUNDAMENTAL_IDS)[number];

/** Closed-set weakness tag each fundamental files under (the drill spine). */
export const FUNDAMENTAL_TAG: Record<FundamentalId, MisconceptionTagId> = {
  'same-piece-twice': 'neglected-development',
  'tempo-handed': 'tempo-handed',
  'space-conceded': 'space-conceded',
  'neglected-development': 'neglected-development',
  'early-queen-sortie': 'neglected-development',
  'king-left-in-centre': 'king-stuck-center',
  'greedy-pawn-grab': 'greedy-pawn-grab',
  'early-edge-pawns': 'neglected-development',
  'knights-before-bishops': 'neglected-development',
  'buried-own-bishop': 'misplaced-piece',
  'premature-centre-break': 'king-stuck-center',
  'knight-to-the-rim': 'misplaced-piece',
  'loose-piece': 'hung-material',
  'ignored-threat': 'missed-opponents-threat',
  'passive-when-forcing-existed': 'missed-tactic',
  'weakened-king-shield': 'weakened-king-safety',
  'created-pawn-weakness': 'created-pawn-weakness',
  'overextended-pawn': 'overextended-pawn',
  'traded-active-for-passive': 'bad-trade',
  'wrong-trade-for-material': 'bad-trade-material',
  'worst-piece-unimproved': 'misplaced-piece',
  'rook-ignored-open-file': 'misplaced-piece',
  'kept-bad-bishop': 'misplaced-piece',
  'passive-king-endgame': 'passive-king-endgame',
  'mistimed-pawn-break': 'mistimed-pawn-break',
  'rook-in-front-of-passer': 'misplaced-piece',
  'passed-pawn-neglected': 'passed-pawn-neglected',
  'lost-the-opposition': 'passive-king-endgame',
  'passive-rook-endgame': 'passive-rook',
};

/** Rows whose "punishment" is a positional cost rather than a concrete move
 *  the opponent can play — they speak only when nothing move-verified attached. */
const CO_OCCURRENCE: ReadonlySet<FundamentalId> = new Set<FundamentalId>([
  'knights-before-bishops', 'knight-to-the-rim', 'rook-ignored-open-file',
  'worst-piece-unimproved', 'traded-active-for-passive', 'wrong-trade-for-material',
  'passive-king-endgame', 'rook-in-front-of-passer', 'buried-own-bishop',
  'passed-pawn-neglected', 'lost-the-opposition', 'passive-rook-endgame',
  'kept-bad-bishop',
]);

export interface PrincipleEvidence {
  /** Squares the verdict may name — every one is on the board. */
  squares: string[];
  /** The concrete punishing move(s) available on the board (SAN). */
  moves: string[];
  /** Engine-line moves that corroborate it (SAN, from the persisted PV). */
  pvMoves: string[];
  /** Proven: the best move does not allow this punishment. */
  counterfactualClean: true;
}

export interface PrincipleAttribution {
  id: FundamentalId;
  tag: MisconceptionTagId;
  /** Evidence strength — PV-corroborated move-punishments rank highest. */
  weight: number;
  coOccurrence: boolean;
  evidence: PrincipleEvidence;
  /** Small named facts the renderer slots into the sentence. */
  facts: Record<string, string | number>;
}

export interface AttributionInput {
  /** Every SAN of the game up to AND INCLUDING the played move. */
  historySans: readonly string[];
  /** The engine's best move at the position before the played move (SAN). */
  bestSan: string | null;
  /** cpLoss of the played move (mover POV). Attribution requires a flagged move. */
  classification: string | null;
  /** Persisted engine lines (SAN), optional corroboration. */
  pvAfterPlayed?: readonly string[];
  pvAfterBest?: readonly string[];
}

export const ATTRIBUTION_MAX = 3;
const OPENING_PLIES = 24;

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MINOR_HOME: Record<Color, Square[]> = { w: ['b1', 'g1', 'c1', 'f1'], b: ['b8', 'g8', 'c8', 'f8'] };

// ─── board helpers (all pure chess.js) ──────────────────────────────────────

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }
function fileIdx(sq: string): number { return sq.charCodeAt(0) - 97; }
function rankNum(sq: string): number { return Number(sq[1]); }
/** Rank counted from `color`'s own side (1 = back rank, 8 = far rank). */
function relRank(sq: string, color: Color): number { return color === 'w' ? rankNum(sq) : 9 - rankNum(sq); }
function isCentreBox(sq: string): boolean { const f = fileIdx(sq); const r = rankNum(sq); return f >= 2 && f <= 5 && r >= 4 && r <= 5; }

function pieces(chess: Chess, color: Color, type?: PieceSymbol): { type: PieceSymbol; square: Square }[] {
  const out: { type: PieceSymbol; square: Square }[] = [];
  for (const row of chess.board()) for (const c of row) {
    if (c && c.color === color && (!type || c.type === type)) out.push({ type: c.type, square: c.square });
  }
  return out;
}
function developedMinors(chess: Chess, color: Color): number {
  return pieces(chess, color).filter((p) => (p.type === 'n' || p.type === 'b') && !MINOR_HOME[color].includes(p.square)).length;
}
function homeMinors(chess: Chess, color: Color): number {
  return pieces(chess, color).filter((p) => (p.type === 'n' || p.type === 'b') && MINOR_HOME[color].includes(p.square)).length;
}
function kingSquare(chess: Chess, color: Color): Square | null {
  return pieces(chess, color, 'k')[0]?.square ?? null;
}
function kingOnHome(chess: Chess, color: Color): boolean {
  return kingSquare(chess, color) === (color === 'w' ? 'e1' : 'e8');
}
function material(chess: Chess, color: Color): number {
  return pieces(chess, color).reduce((s, p) => s + (VAL[p.type] ?? 0), 0);
}
function queensOff(chess: Chess): boolean { return pieces(chess, 'w', 'q').length === 0 && pieces(chess, 'b', 'q').length === 0; }
function isEndgame(chess: Chess): boolean {
  const nonPawn = (c: Color) => pieces(chess, c).filter((p) => p.type !== 'p' && p.type !== 'k').reduce((s, p) => s + VAL[p.type], 0);
  return queensOff(chess) || (nonPawn('w') + nonPawn('b')) <= 14;
}
/** True when `mover` has just moved into the opposition: the kings face off
 *  with one square between (same file, rank, or diagonal) and it is the OPPONENT
 *  to move — so they must give way. Called on the position right after mover's
 *  move (opponent to move). */
function holdsOpposition(afterMoverMove: Chess, mover: Color): boolean {
  const mk = kingSquare(afterMoverMove, mover);
  const ok = kingSquare(afterMoverMove, other(mover));
  if (!mk || !ok) return false;
  const df = Math.abs(fileIdx(mk) - fileIdx(ok));
  const dr = Math.abs(rankNum(mk) - rankNum(ok));
  return (df === 0 && dr === 2) || (dr === 0 && df === 2) || (df === 2 && dr === 2);
}
/** Every piece of `color` is a king or a pawn (a pure king-and-pawn ending). */
function onlyKingAndPawns(chess: Chess, color: Color): boolean {
  return pieces(chess, color).every((p) => p.type === 'p' || p.type === 'k');
}
/** 0 = dark square, 1 = light square (parity of file+rank). */
function squareColor(sq: string): number { return (fileIdx(sq) + rankNum(sq)) % 2; }

/** A position with `color` to move regardless of whose turn it really is
 *  (null-move view). Castling/ep are preserved; ep cleared for safety. */
function withTurn(chess: Chess, color: Color): Chess | null {
  const parts = chess.fen().split(' ');
  if (parts[1] === color) return new Chess(chess.fen());
  parts[1] = color; parts[3] = '-';
  try { return new Chess(parts.join(' ')); } catch { return null; }
}
function legalMovesFor(chess: Chess, color: Color): Move[] {
  const v = withTurn(chess, color);
  if (!v) return [];
  try { return v.moves({ verbose: true }); } catch { return []; }
}
function applied(chess: Chess, san: string): Chess | null {
  const c = new Chess(chess.fen());
  try { return c.move(san.replace(/[?!]+$/, '')) ? c : null; } catch { return null; }
}
function appliedVerbose(chess: Chess, m: Move): Chess | null {
  const c = new Chess(chess.fen());
  try { return c.move({ from: m.from, to: m.to, promotion: m.promotion }) ? c : null; } catch { return null; }
}
/** Squares a pawn of `color` standing on `sq` attacks. */
function pawnAttacks(sq: string, color: Color): string[] {
  const f = fileIdx(sq); const r = rankNum(sq) + (color === 'w' ? 1 : -1);
  const out: string[] = [];
  if (r < 1 || r > 8) return out;
  if (f > 0) out.push(`${String.fromCharCode(96 + f)}${r}`);
  if (f < 7) out.push(`${String.fromCharCode(98 + f)}${r}`);
  return out;
}
/** SEE for the piece on `sq`: > 0 means its ENEMY wins material by capturing it. */
function hangsBy(chess: Chess, sq: Square): number {
  try { return seeGain(chess, sq); } catch { return 0; }
}
/** After `mover` plays `m` from `chess`: does the moved unit survive an exchange
 *  on its square (nobody wins material by taking it)? */
function landsSafely(chess: Chess, m: Move): boolean {
  const c = appliedVerbose(chess, m);
  return !!c && hangsBy(c, m.to) <= 0;
}
/** After `attacker`'s move `m`, the enemy pieces (non-pawn, ≥3pts) it newly attacks
 *  that must respond — the attacker cannot be taken for free (a real tempo). */
function tempoTargets(chess: Chess, m: Move, attacker: Color): Square[] {
  const c = appliedVerbose(chess, m);
  if (!c) return [];
  // Capturing the attacker must LOSE material for the defender (strictly), else
  // the exchange neutralises the tempo (exd5 Nxd5 is not a kick).
  if (hangsBy(c, m.to) >= 0 && c.get(m.to)) {
    // hangsBy>0 → attacker hangs; ==0 → can be traded off evenly. Both fail.
    if (hangsBy(c, m.to) > 0) return [];
    // For ==0, treat a pawn attacker as neutralisable, a piece attacker as real
    // only if it can't be captured at all.
    const cap = legalMovesFor(c, other(attacker)).some((x) => x.to === m.to);
    if (cap) return [];
  }
  const out: Square[] = [];
  const enemy = other(attacker);
  for (const p of pieces(c, enemy)) {
    if (p.type === 'p' || p.type === 'k') continue;
    const attackedNow = c.attackers(p.square, attacker).includes(m.to);
    const attackedBefore = chess.attackers(p.square, attacker).length > 0;
    // A real kick: taking the piece would now WIN material (so it must move).
    // Bb5 eyeing a knight that b7 defends is a pin to answer, not a tempo.
    if (attackedNow && !attackedBefore && hangsBy(c, p.square) > 0) out.push(p.square);
  }
  return out;
}
/** A kick available to `opp` right now: a pawn advance or a developing minor
 *  move that attacks a `mover` piece with tempo. Returns the first such move. */
function kickAvailable(chess: Chess, opp: Color, targetSq?: string): { san: string; hits: Square[] } | null {
  for (const m of legalMovesFor(chess, opp)) {
    const developing = (m.piece === 'n' || m.piece === 'b') && MINOR_HOME[opp].includes(m.from);
    const centrePawn = m.piece === 'p' && (m.to[0] === 'd' || m.to[0] === 'e' || m.to[0] === 'c' || m.to[0] === 'f');
    const anyPawn = m.piece === 'p';
    if (!developing && !centrePawn && !anyPawn) continue;
    if (m.captured) continue;
    const hits = tempoTargets(chess, m, opp);
    const relevant = targetSq ? hits.filter((h) => h === targetSq) : hits;
    if (relevant.length) return { san: m.san, hits: relevant };
  }
  return null;
}
/** A pawn one push away from attacking `targetSq` next move (a4 → a5 hits b6),
 *  where the first push is safe and cannot be stopped by a capture. */
function twoStepKick(chess: Chess, opp: Color, targetSq: string): { san: string; then: string } | null {
  for (const m of legalMovesFor(chess, opp)) {
    if (m.piece !== 'p' || m.captured) continue;
    if (!landsSafely(chess, m)) continue;
    const after = appliedVerbose(chess, m);
    if (!after) continue;
    // Next push from m.to
    const next = legalMovesFor(after, opp).find((n) => n.piece === 'p' && n.from === m.to && !n.captured && pawnAttacks(n.to, opp).includes(targetSq));
    if (next && landsSafely(after, next)) return { san: m.san, then: next.san };
  }
  return null;
}
/** How many times THIS piece had already moved — followed back along its own
 *  chain of squares (g8→f6, f6→d5 for a knight now leaving d5 = 2). */
function movedBefore(history: Move[], mover: Color, last: Move): number {
  let count = 0;
  let square = last.from;
  for (let i = history.length - 1; i >= 0 && count < 16; i--) {
    const h = history[i];
    if (h.color !== mover || h.piece !== last.piece || h.to !== square) continue;
    count += 1;
    square = h.from;
  }
  return count;
}
function pieceMobility(chess: Chess, sq: Square, color: Color): number {
  return legalMovesFor(chess, color).filter((m) => m.from === sq).length;
}
function pvHas(pv: readonly string[] | undefined, pred: (san: string, i: number) => boolean, plies = 4): string[] {
  if (!pv) return [];
  return pv.slice(0, plies).filter((s, i) => pred(s, i));
}
function isolatedPawns(chess: Chess, color: Color): Square[] {
  const ps = pieces(chess, color, 'p');
  const files = new Set(ps.map((p) => fileIdx(p.square)));
  return ps.filter((p) => !files.has(fileIdx(p.square) - 1) && !files.has(fileIdx(p.square) + 1)).map((p) => p.square);
}
function doubledPawns(chess: Chess, color: Color): Square[] {
  const ps = pieces(chess, color, 'p');
  return ps.filter((p) => ps.some((q) => q.square !== p.square && fileIdx(q.square) === fileIdx(p.square))).map((p) => p.square);
}
function isPassed(chess: Chess, sq: Square, color: Color): boolean {
  const f = fileIdx(sq); const r = rankNum(sq);
  const enemy = other(color);
  for (const p of pieces(chess, enemy, 'p')) {
    const pf = fileIdx(p.square); const pr = rankNum(p.square);
    if (Math.abs(pf - f) > 1) continue;
    if (color === 'w' ? pr > r : pr < r) return false;
  }
  return true;
}
function supportedPawn(chess: Chess, sq: Square, color: Color): boolean {
  return pieces(chess, color, 'p').some((p) => Math.abs(fileIdx(p.square) - fileIdx(sq)) === 1
    && (color === 'w' ? rankNum(p.square) < rankNum(sq) : rankNum(p.square) > rankNum(sq)));
}
function fileIsOpen(chess: Chess, file: number, forColor?: Color): boolean {
  for (let r = 1; r <= 8; r++) {
    const p = chess.get(`${String.fromCharCode(97 + file)}${r}` as Square);
    if (p && p.type === 'p' && (!forColor || p.color === forColor)) return false;
  }
  return true;
}
function isForcing(san: string): boolean { return /[x+#]/.test(san); }
/** The verbose move `san` makes from `chess` (a copy), or null. */
function tryMove(chess: Chess, san: string): Move | null {
  try { return new Chess(chess.fen()).move(san.replace(/[?!]+$/, '')) ?? null; } catch { return null; }
}
/** The least-valuable capture `color` can make on `sq` (the one a player would). */
function cheapestCapture(chess: Chess, sq: Square, color: Color): Move | null {
  const caps = legalMovesFor(chess, color).filter((m) => m.to === sq && m.captured);
  caps.sort((a, b) => VAL[a.piece] - VAL[b.piece]);
  return caps[0] ?? null;
}
function pvWinsMaterial(chess: Chess, pv: readonly string[] | undefined, mover: Color): boolean {
  if (!pv || pv.length === 0) return false;
  const c = new Chess(chess.fen());
  const before = material(c, mover) - material(c, other(mover));
  let n = 0;
  for (const s of pv.slice(0, 6)) { try { if (!c.move(s)) break; n++; } catch { break; } }
  if (n === 0) return false;
  return (material(c, mover) - material(c, other(mover))) - before >= 2 || c.isCheckmate();
}

// ─── the attributor ─────────────────────────────────────────────────────────

interface Ctx {
  before: Chess; after: Chess; afterBest: Chess;
  mover: Color; opp: Color; last: Move; best: Move;
  history: Move[]; plyIndex: number; opening: boolean; endgame: boolean;
  pvP?: readonly string[]; pvB?: readonly string[];
}

type Detector = (c: Ctx) => Omit<PrincipleAttribution, 'tag' | 'coOccurrence'> | null;

function att(id: FundamentalId, weight: number, evidence: Omit<PrincipleEvidence, 'counterfactualClean'>, facts: Record<string, string | number> = {}): Omit<PrincipleAttribution, 'tag' | 'coOccurrence'> {
  return { id, weight, evidence: { ...evidence, counterfactualClean: true }, facts };
}

const DETECTORS: Detector[] = [
  // 1. Same piece twice — a non-capturing re-move of a piece that had already
  // moved, with minors still at home, that the board punishes with a tempo or
  // a development gap; the best move does not re-move that piece quietly.
  (c) => {
    if (!c.opening) return null;
    const { last, best, mover, opp } = c;
    if (last.piece === 'p' || last.piece === 'k' || last.captured) return null;
    const times = movedBefore(c.history.slice(0, -1), mover, last);
    if (times === 0) return null;
    if (homeMinors(c.before, mover) < 2) return null;
    const bestRemoves = best.piece === last.piece && best.from === last.from && !best.captured;
    if (bestRemoves) return null;
    const kick = kickAvailable(c.after, opp) ?? null;
    const two = twoStepKick(c.after, opp, last.to);
    const devGap = developedMinors(c.after, opp) + 1 > developedMinors(c.after, mover) && homeMinors(c.after, mover) >= 2;
    if (!kick && !two && !devGap) return null;
    const kickBest = kickAvailable(c.afterBest, opp);
    if (kick && kickBest && kickBest.san === kick.san) {
      // same kick exists after the best move → not this move's doing; fall to devGap
      if (!devGap && !two) return null;
    }
    const moves = [kick?.san, two ? `${two.san} ${two.then}` : null].filter((x): x is string => !!x);
    return att('same-piece-twice', 2 + (moves.length ? 1 : 0), {
      squares: [last.from, last.to], moves,
      pvMoves: pvHas(c.pvP, (s) => moves.some((m) => m.split(' ').includes(s))),
    }, { piece: PNAME[last.piece], nth: times + 1, homeMinors: homeMinors(c.after, mover) });
  },
  // 2. Tempo handed — after the move the opponent has a SAFE developing move or
  // pawn advance that attacks a piece with tempo (it must move again), or a
  // two-step kick of the moved piece; the best move leaves no such kick.
  (c) => {
    const { last, opp } = c;
    if (last.piece === 'p' || last.piece === 'k') return null;
    const kick = kickAvailable(c.after, opp);
    const two = kick ? null : twoStepKick(c.after, opp, last.to);
    if (!kick && !two) return null;
    const bestKick = kickAvailable(c.afterBest, opp);
    if (kick && bestKick && bestKick.hits.length >= kick.hits.length) return null;
    if (two && twoStepKick(c.afterBest, opp, c.best.to)) return null;
    const moves = kick ? [kick.san] : two ? [two.san, two.then] : [];
    if (moves.length === 0) return null;
    const target: Square = kick ? kick.hits[0] : last.to;
    return att('tempo-handed', 3, {
      squares: [last.to, target], moves,
      pvMoves: pvHas(c.pvP, (s) => moves.includes(s)),
    }, { target: `${PNAME[c.after.get(target)?.type ?? 'n']} on ${target}`, kick: moves.join(' then ') });
  },
  // 3. Space conceded — the piece left a centre-box square and the opponent can
  // now push a centre pawn onto/over it SAFELY (capturing the pawn loses
  // material); after the best move that push is not sound.
  (c) => {
    const { last, opp, mover } = c;
    if (last.piece === 'p' || last.piece === 'k' || last.captured) return null;
    if (!isCentreBox(last.from)) return null;
    if (relRank(last.to, mover) >= relRank(last.from, mover) && isCentreBox(last.to)) return null;
    const pushOnto = (chess: Chess): Move | null => {
      for (const m of legalMovesFor(chess, opp)) {
        if (m.piece !== 'p' || m.captured) continue;
        if (m.to[0] !== 'd' && m.to[0] !== 'e') continue;
        if (m.to !== last.from && !(m.to[0] === last.from[0] && relRank(m.to, opp) >= relRank(last.from, opp))) continue;
        const a = appliedVerbose(chess, m);
        if (a && hangsBy(a, m.to) < 0) return m;
      }
      return null;
    };
    const push = pushOnto(c.after);
    if (!push) return null;
    if (pushOnto(c.afterBest)) return null;
    return att('space-conceded', 2, {
      squares: [last.from, push.to], moves: [push.san],
      pvMoves: pvHas(c.pvP, (s) => s === push.san),
    }, { square: last.from, push: push.san });
  },
  // 4. Neglected development — pawn/queen move with ≥2 minors home while a
  // developing move existed and the best move IS one; the board shows the
  // gap (opponent ahead in development after the move).
  (c) => {
    if (!c.opening) return null;
    const { last, best, mover, opp } = c;
    if (last.piece !== 'p' && last.piece !== 'q') return null;
    if (last.captured) return null;
    if (homeMinors(c.before, mover) < 2) return null;
    const bestDevelops = ((best.piece === 'n' || best.piece === 'b') && MINOR_HOME[mover].includes(best.from)) || best.san.startsWith('O-O');
    if (!bestDevelops) return null;
    if (developedMinors(c.after, opp) < developedMinors(c.after, mover)) return null;
    return att('neglected-development', 2, {
      squares: pieces(c.after, mover).filter((p) => (p.type === 'n' || p.type === 'b') && MINOR_HOME[mover].includes(p.square)).map((p) => p.square),
      moves: [best.san], pvMoves: [],
    }, { homeMinors: homeMinors(c.after, mover), better: best.san });
  },
  // 5. Early queen sortie — queen off the back rank with <3 minors developed,
  // and the opponent can attack it with a developing move / pawn safely.
  (c) => {
    if (!c.opening) return null;
    const { last, mover, opp } = c;
    if (last.piece !== 'q' || last.captured) return null;
    if (relRank(last.to, mover) === 1 || developedMinors(c.before, mover) >= 3) return null;
    const kick = kickAvailable(c.after, opp, last.to);
    if (!kick) return null;
    if (c.best.piece === 'q' && kickAvailable(c.afterBest, opp, c.best.to)) return null;
    return att('early-queen-sortie', 3, {
      squares: [last.to], moves: [kick.san], pvMoves: pvHas(c.pvP, (s) => s === kick.san),
    }, { square: last.to, kick: kick.san });
  },
  // 6. King left in the centre — castling was legal and declined; the opponent
  // now has a sound check or a central capture/opening; the best move castles.
  (c) => {
    const { last, best, mover, opp } = c;
    if (last.san.startsWith('O-O')) return null;
    if (!kingOnHome(c.before, mover)) return null;
    const couldCastle = c.before.moves().some((m) => m.startsWith('O-O'));
    if (!couldCastle || !best.san.startsWith('O-O')) return null;
    const punish = legalMovesFor(c.after, opp).find((m) => (m.san.includes('+') && landsSafely(c.after, m))
      || (m.captured && (m.to[0] === 'd' || m.to[0] === 'e') && landsSafely(c.after, m)));
    if (!punish) return null;
    return att('king-left-in-centre', 2, {
      squares: [kingSquare(c.after, mover) ?? last.to], moves: [punish.san],
      pvMoves: pvHas(c.pvP, (s) => s === punish.san),
    }, { punish: punish.san });
  },
  // 7. Greedy pawn grab — took a pawn while the king sits home / minors home,
  // and the opponent gets a sound tempo or check; the best move declines it.
  (c) => {
    const { last, best, mover, opp } = c;
    if (last.captured !== 'p') return null;
    if (!kingOnHome(c.before, mover) && homeMinors(c.before, mover) < 2) return null;
    if (best.captured === 'p') return null;
    const kick = kickAvailable(c.after, opp) ?? null;
    const check = legalMovesFor(c.after, opp).find((m) => m.san.includes('+') && landsSafely(c.after, m)) ?? null;
    const punish = kick?.san ?? check?.san;
    if (!punish) return null;
    return att('greedy-pawn-grab', 2, {
      squares: [last.to], moves: [punish], pvMoves: pvHas(c.pvP, (s) => s === punish),
    }, { pawn: last.to, punish });
  },
  // 8. Early edge pawns — a/h pawn push with the centre unclaimed and pieces
  // home; the best move develops or claims the centre.
  (c) => {
    if (!c.opening) return null;
    const { last, best, mover } = c;
    if (last.piece !== 'p' || last.captured || (last.to[0] !== 'a' && last.to[0] !== 'h')) return null;
    if (homeMinors(c.before, mover) < 3) return null;
    const bestCentral = (best.piece === 'p' && (best.to[0] === 'd' || best.to[0] === 'e')) || ((best.piece === 'n' || best.piece === 'b') && MINOR_HOME[mover].includes(best.from));
    if (!bestCentral) return null;
    return att('early-edge-pawns', 1, { squares: [last.to], moves: [best.san], pvMoves: [] }, { pawn: last.to, better: best.san });
  },
  // 9. Knights before bishops — second bishop committed before any knight, and
  // the opponent can hit it with a pawn safely; best develops a knight.
  (c) => {
    if (!c.opening) return null;
    const { last, best, mover, opp } = c;
    if (last.piece !== 'b' || last.captured) return null;
    const knightsOut = c.history.filter((h) => h.color === mover && h.piece === 'n').length;
    const bishopMoves = c.history.filter((h) => h.color === mover && h.piece === 'b').length;
    if (knightsOut > 0 || bishopMoves < 2) return null;
    if (best.piece !== 'n') return null;
    const kick = kickAvailable(c.after, opp, last.to);
    if (!kick) return null;
    return att('knights-before-bishops', 1, { squares: [last.to], moves: [kick.san], pvMoves: pvHas(c.pvP, (s) => s === kick.san) }, { square: last.to, kick: kick.san });
  },
  // 10. Buried own bishop — the move leaves one of the mover's bishops with ≤1
  // move where it had more; after the best move it still breathes.
  (c) => {
    const { last, mover } = c;
    if (last.piece === 'b') return null;
    for (const b of pieces(c.before, mover, 'b')) {
      if (b.square === last.to) continue;
      const beforeMob = pieceMobility(c.before, b.square, mover);
      const afterMob = pieceMobility(c.after, b.square, mover);
      const bestMob = pieceMobility(c.afterBest, b.square, mover);
      if (beforeMob >= 2 && afterMob <= 1 && bestMob >= 2) {
        return att('buried-own-bishop', 1, { squares: [b.square, last.to], moves: [], pvMoves: [] }, { bishop: b.square, blocker: last.to });
      }
    }
    return null;
  },
  // 11. Premature centre break — a d/e pawn thrust while behind in development
  // or uncastled vs a castled opponent, and the centre opens with a sound
  // capture/check for the opponent; the best move is not that break.
  (c) => {
    const { last, best, mover, opp } = c;
    if (last.piece !== 'p' || (last.to[0] !== 'd' && last.to[0] !== 'e')) return null;
    const r = relRank(last.to, mover);
    if (r !== 4 && r !== 5) return null;
    const behind = developedMinors(c.before, mover) < developedMinors(c.before, opp);
    const kingLag = kingOnHome(c.before, mover) && !kingOnHome(c.before, opp);
    if (!behind && !kingLag) return null;
    if (best.piece === 'p' && best.to[0] === last.to[0]) return null;
    const punish = legalMovesFor(c.after, opp).find((m) => (m.captured || m.san.includes('+')) && landsSafely(c.after, m) && (m.to[0] === 'd' || m.to[0] === 'e' || m.san.includes('+')));
    if (!punish) return null;
    return att('premature-centre-break', 2, { squares: [last.to], moves: [punish.san], pvMoves: pvHas(c.pvP, (s) => s === punish.san) }, { pawn: last.to, reason: behind ? 'behind in development' : 'with the king still in the centre', punish: punish.san });
  },
  // 12. Knight to the rim — a knight lands on the a/h file and the opponent can
  // kick it with a safe pawn move; the best move keeps it central.
  (c) => {
    const { last, best, opp } = c;
    if (last.piece !== 'n' || last.captured || (last.to[0] !== 'a' && last.to[0] !== 'h')) return null;
    if (best.piece === 'n' && (best.to[0] === 'a' || best.to[0] === 'h')) return null;
    const kick = kickAvailable(c.after, opp, last.to);
    if (!kick) return null;
    return att('knight-to-the-rim', 1, { squares: [last.to], moves: [kick.san], pvMoves: pvHas(c.pvP, (s) => s === kick.san) }, { square: last.to, kick: kick.san });
  },
  // 13. Loose piece — after the move a piece (≥3pts, non-king) can be taken for
  // material RIGHT NOW; after the best move nothing of the kind hangs.
  (c) => {
    const { mover } = c;
    const hangingAfter = pieces(c.after, mover).filter((p) => p.type !== 'k' && VAL[p.type] >= 3 && hangsBy(c.after, p.square) >= 2)
      .sort((a, b) => VAL[b.type] - VAL[a.type]);
    if (hangingAfter.length === 0) return null;
    const hangingBest = pieces(c.afterBest, mover).filter((p) => p.type !== 'k' && VAL[p.type] >= 3 && hangsBy(c.afterBest, p.square) >= 2);
    if (hangingBest.length >= hangingAfter.length) return null;
    const h = hangingAfter[0];
    const cap = cheapestCapture(c.after, h.square, c.opp);
    return att('loose-piece', 3, { squares: [h.square], moves: cap ? [cap.san] : [], pvMoves: pvHas(c.pvP, (s) => !!cap && s === cap.san) }, { piece: PNAME[h.type], square: h.square });
  },
  // 14. Ignored threat — a piece was already en prise BEFORE the move, the move
  // did not address it, and the best move does.
  (c) => {
    const { mover, last } = c;
    const threatened = pieces(c.before, mover).filter((p) => p.type !== 'k' && VAL[p.type] >= 3 && hangsBy(c.before, p.square) >= 2);
    if (threatened.length === 0) return null;
    const still = threatened.filter((p) => p.square !== last.from && hangsBy(c.after, p.square) >= 2);
    if (still.length === 0) return null;
    const fixedByBest = threatened.every((p) => !c.afterBest.get(p.square) || c.afterBest.get(p.square)?.color !== mover || hangsBy(c.afterBest, p.square) < 2);
    if (!fixedByBest) return null;
    const t = still[0];
    const cap = cheapestCapture(c.after, t.square, c.opp);
    return att('ignored-threat', 3, { squares: [t.square], moves: cap ? [cap.san] : [], pvMoves: pvHas(c.pvP, (s) => !!cap && s === cap.san) }, { piece: PNAME[t.type], square: t.square });
  },
  // 15. Passive when a forcing move existed — the played move is quiet, the
  // best move is forcing and wins material / mates (board-checked on the
  // best line when present, else SEE on the capture).
  (c) => {
    const { last, best, mover } = c;
    if (isForcing(last.san) || !isForcing(best.san)) return null;
    let wins = false;
    if (c.pvB && c.pvB.length) wins = pvWinsMaterial(c.afterBest, c.pvB, other(mover)) ? false : pvWinsMaterial(c.before, [best.san, ...c.pvB], mover);
    if (!wins && best.captured) {
      const a = c.afterBest;
      wins = (VAL[best.captured] - Math.max(0, hangsBy(a, best.to))) >= 2 || a.isCheckmate();
    }
    if (!wins && c.afterBest.isCheckmate()) wins = true;
    if (!wins) return null;
    return att('passive-when-forcing-existed', 3, { squares: [best.to], moves: [best.san], pvMoves: pvHas(c.pvB, () => true, 2) }, { better: best.san });
  },
  // 16. Weakened king shield — a shield pawn moved without need, and the
  // opponent has a sound check or a piece that can land next to the king.
  (c) => {
    const { last, best, mover, opp } = c;
    if (last.piece !== 'p' || last.captured) return null;
    const k = kingSquare(c.before, mover);
    if (!k || kingOnHome(c.before, mover)) return null;
    if (Math.abs(fileIdx(last.from) - fileIdx(k)) > 1 || relRank(last.from, mover) > 3) return null;
    if (best.piece === 'p' && Math.abs(fileIdx(best.from) - fileIdx(k)) <= 1) return null;
    const punish = legalMovesFor(c.after, opp).find((m) => m.san.includes('+') && landsSafely(c.after, m));
    if (!punish) return null;
    if (legalMovesFor(c.afterBest, opp).some((m) => m.san === punish.san && landsSafely(c.afterBest, m))) return null;
    return att('weakened-king-shield', 2, { squares: [last.from, k], moves: [punish.san], pvMoves: pvHas(c.pvP, (s) => s === punish.san) }, { pawn: last.from, king: k, punish: punish.san });
  },
  // 17. Created pawn weakness — the move leaves a new isolated/doubled pawn the
  // opponent can attack; the best move does not.
  (c) => {
    const { mover, opp } = c;
    const weakBefore = new Set([...isolatedPawns(c.before, mover), ...doubledPawns(c.before, mover)]);
    const weakAfter = [...isolatedPawns(c.after, mover), ...doubledPawns(c.after, mover)].filter((s) => !weakBefore.has(s));
    if (weakAfter.length === 0) return null;
    const weakBest = new Set([...isolatedPawns(c.afterBest, mover), ...doubledPawns(c.afterBest, mover)]);
    const newOnlyHere = weakAfter.filter((s) => !weakBest.has(s));
    if (newOnlyHere.length === 0) return null;
    const target = newOnlyHere.find((s) => legalMovesFor(c.after, opp).some((m) => !m.captured && appliedVerbose(c.after, m)?.attackers(s, opp).length));
    if (!target) return null;
    return att('created-pawn-weakness', 2, { squares: [target], moves: [], pvMoves: [] }, { pawn: target });
  },
  // 18. Overextended pawn — a pawn advanced past its support (rank ≥5, no
  // pawn behind it on a neighbouring file) that the opponent can win or
  // attack soundly; the best move keeps it supported.
  (c) => {
    const { last, mover, opp } = c;
    if (last.piece !== 'p' || last.captured) return null;
    if (relRank(last.to, mover) < 5 || supportedPawn(c.after, last.to, mover)) return null;
    const attackable = hangsBy(c.after, last.to) > 0 || legalMovesFor(c.after, opp).some((m) => !m.captured && landsSafely(c.after, m) && appliedVerbose(c.after, m)?.attackers(last.to, opp).length);
    if (!attackable) return null;
    const bestPawnSame = c.best.piece === 'p' && c.best.to === last.to;
    if (bestPawnSame) return null;
    return att('overextended-pawn', 2, { squares: [last.to], moves: [], pvMoves: pvHas(c.pvP, (s) => s.includes(`x${last.to}`)) }, { pawn: last.to });
  },
  // 19. Traded active for passive / gave up the bishop pair — an exchange that
  // hands the opponent the bishop pair or swaps the mover's more mobile piece
  // for a less mobile one; the best move is not that capture.
  (c) => {
    const { last, best, mover, opp } = c;
    if (!last.captured || last.piece === 'p' || last.piece === 'k' || last.captured === 'p') return null;
    if (VAL[last.piece] !== VAL[last.captured]) return null;
    if (best.captured && best.to === last.to) return null;
    const bishopsB = pieces(c.before, mover, 'b').length; const bishopsA = pieces(c.after, mover, 'b').length;
    const oppBishops = pieces(c.after, opp, 'b').length;
    const gavePair = last.piece === 'b' && bishopsB === 2 && bishopsA < 2 && oppBishops === 2;
    const myMob = pieceMobility(c.before, last.from, mover);
    const theirMob = pieceMobility(c.before, last.to, opp);
    const activeForPassive = myMob >= theirMob + 4;
    if (!gavePair && !activeForPassive) return null;
    return att('traded-active-for-passive', 1, { squares: [last.from, last.to], moves: [], pvMoves: [] }, { piece: PNAME[last.piece], kind: gavePair ? 'bishop pair' : 'activity' });
  },
  // 20. Wrong trade for the material situation — ahead: trade pieces; behind:
  // keep pieces (trade pawns). The best move does the opposite of the played.
  (c) => {
    const { last, best, mover, opp } = c;
    const lead = material(c.before, mover) - material(c.before, opp);
    const isPieceTrade = (m: Move) => !!m.captured && m.captured !== 'p' && m.piece !== 'p' && VAL[m.captured] === VAL[m.piece];
    if (lead >= 2 && isPieceTrade(best) && !isPieceTrade(last) && !last.captured) {
      return att('wrong-trade-for-material', 1, { squares: [best.to], moves: [best.san], pvMoves: [] }, { situation: 'ahead', better: best.san });
    }
    if (lead <= -2 && isPieceTrade(last) && !isPieceTrade(best)) {
      return att('wrong-trade-for-material', 1, { squares: [last.to], moves: [best.san], pvMoves: [] }, { situation: 'behind', better: best.san });
    }
    return null;
  },
  // 21. Worst piece unimproved — the best move improves the mover's least
  // mobile piece; the played move does not, and that piece stays stuck.
  (c) => {
    const { last, best, mover } = c;
    if (c.opening) return null;
    const cands = pieces(c.before, mover).filter((p) => p.type === 'n' || p.type === 'b' || p.type === 'r');
    if (cands.length < 2) return null;
    const worst = cands.map((p) => ({ p, mob: pieceMobility(c.before, p.square, mover) })).sort((a, b) => a.mob - b.mob)[0];
    if (worst.mob > 2) return null;
    if (best.from !== worst.p.square || last.from === worst.p.square) return null;
    if (pieceMobility(c.after, worst.p.square, mover) > 2) return null;
    return att('worst-piece-unimproved', 1, { squares: [worst.p.square], moves: [best.san], pvMoves: [] }, { piece: PNAME[worst.p.type], square: worst.p.square, better: best.san });
  },
  // 22. Rook ignored the open file — the best move puts a rook on an open
  // file; the played move does not, and the opponent can take it first.
  (c) => {
    const { last, best, opp } = c;
    if (best.piece !== 'r' || last.piece === 'r') return null;
    const f = fileIdx(best.to);
    if (!fileIsOpen(c.before, f)) return null;
    const oppTakes = legalMovesFor(c.after, opp).find((m) => m.piece === 'r' && fileIdx(m.to) === f && landsSafely(c.after, m));
    if (!oppTakes) return null;
    return att('rook-ignored-open-file', 1, { squares: [best.to], moves: [best.san, oppTakes.san], pvMoves: pvHas(c.pvP, (s) => s === oppTakes.san) }, { file: best.to[0], better: best.san });
  },
  // 23. Passive king in the endgame — the best move walks the king toward the
  // action; the played move is not a king move and the opponent's king can step up.
  (c) => {
    const { last, best, mover, opp } = c;
    if (!c.endgame || best.piece !== 'k' || last.piece === 'k') return null;
    const bk = kingSquare(c.before, mover); if (!bk) return null;
    const oppKingUp = legalMovesFor(c.after, opp).some((m) => m.piece === 'k' && relRank(m.to, opp) > relRank(m.from, opp));
    if (!oppKingUp) return null;
    return att('passive-king-endgame', 1, { squares: [bk, best.to], moves: [best.san], pvMoves: [] }, { king: bk, better: best.san });
  },
  // 24. Mistimed pawn break in the endgame — the advanced pawn can be won or
  // fixed as a weakness right away; the best move does not push it.
  (c) => {
    const { last, best, mover } = c;
    if (!c.endgame || last.piece !== 'p' || last.captured) return null;
    if (best.piece === 'p' && best.from === last.from) return null;
    const lost = hangsBy(c.after, last.to) > 0;
    const isolatedNow = isolatedPawns(c.after, mover).includes(last.to) && !isolatedPawns(c.before, mover).includes(last.from);
    if (!lost && !isolatedNow) return null;
    return att('mistimed-pawn-break', 2, { squares: [last.to], moves: [], pvMoves: pvHas(c.pvP, (s) => s.includes(`x${last.to}`)) }, { pawn: last.to, cost: lost ? 'it can be taken' : 'it is isolated' });
  },
  // 25. Rook in front of the passed pawn (Tarrasch) — the rook went to the
  // passer's file on the wrong side of it; the best move puts it behind.
  (c) => {
    const { last, best, mover, opp } = c;
    if (last.piece !== 'r' || best.piece !== 'r') return null;
    const passers = [
      ...pieces(c.after, mover, 'p').map((p) => ({ ...p, color: mover })),
      ...pieces(c.after, opp, 'p').map((p) => ({ ...p, color: opp })),
    ].filter((p) => isPassed(c.after, p.square, p.color));
    for (const p of passers) {
      const pc = p.color;
      if (fileIdx(last.to) !== fileIdx(p.square) || fileIdx(best.to) !== fileIdx(p.square)) continue;
      const ahead = pc === 'w' ? rankNum(last.to) > rankNum(p.square) : rankNum(last.to) < rankNum(p.square);
      const bestBehind = pc === 'w' ? rankNum(best.to) < rankNum(p.square) : rankNum(best.to) > rankNum(p.square);
      if (ahead && bestBehind) return att('rook-in-front-of-passer', 1, { squares: [last.to, p.square, best.to], moves: [best.san], pvMoves: [] }, { rook: last.to, pawn: p.square, better: best.san });
    }
    return null;
  },
  // 26. Passed pawns must be pushed — the best move advances a passed pawn; the
  // played move leaves it home, where the opponent gets time to blockade it.
  // Positional (co-occurrence): the cost is the stall, so it speaks only when no
  // concrete-punishment fundamental attached.
  (c) => {
    const { last, best, mover } = c;
    if (!c.endgame || best.piece !== 'p' || best.captured) return null;
    if (!isPassed(c.before, best.from, mover)) return null;         // PATTERN: best pushes a passer
    if (last.piece === 'p' && last.from === best.from) return null; // COUNTERFACTUAL: played didn't push it
    return att('passed-pawn-neglected', 1, { squares: [best.from, best.to], moves: [best.san], pvMoves: [] }, { pawn: best.from, better: best.san });
  },
  // 27. Take the opposition — in a king-and-pawn ending the best move seizes the
  // opposition with the king; the played move surrenders it. Positional.
  (c) => {
    const { best, mover } = c;
    if (!c.endgame || best.piece !== 'k') return null;
    if (!onlyKingAndPawns(c.before, 'w') || !onlyKingAndPawns(c.before, 'b')) return null;
    // best holds the opposition; the played move does not (and did not already)
    if (!holdsOpposition(c.afterBest, mover) || holdsOpposition(c.after, mover)) return null;
    const bk = kingSquare(c.before, mover);
    return att('lost-the-opposition', 1, { squares: bk ? [bk, best.to] : [best.to], moves: [best.san], pvMoves: [] }, { better: best.san });
  },
  // 28. An active rook belongs on the seventh — the best move swings a rook to
  // the mover's seventh rank where it lands safely; the played move leaves it
  // passive. Positional. (Open-file activity is rook-ignored-open-file, #22.)
  (c) => {
    const { last, best, mover } = c;
    if (!c.endgame || best.piece !== 'r') return null;
    if (relRank(best.to, mover) !== 7) return null;                 // the seventh from the mover's side
    if (!landsSafely(c.before, best)) return null;
    if (last.piece === 'r' && relRank(last.to, mover) === 7) return null; // played already went to the seventh
    return att('passive-rook-endgame', 1, { squares: [best.from, best.to], moves: [best.san], pvMoves: [] }, { square: best.to, better: best.san });
  },
  // 29. Trade off the bad bishop — the mover's bishop is hemmed in by its own
  // pawns fixed on its colour (a board fact), and the best move frees or trades
  // it; the played move leaves it buried. Positional (co-occurrence).
  (c) => {
    const { last, best, mover } = c;
    if (c.opening) return null;
    if (best.piece !== 'b') return null;
    for (const b of pieces(c.before, mover, 'b')) {
      if (best.from !== b.square || last.from === b.square) continue;
      const onColour = pieces(c.before, mover, 'p').filter((p) => squareColor(p.square) === squareColor(b.square)).length;
      if (onColour < 4) continue;                            // ≥4 own pawns on the bishop's colour = a bad bishop
      if (pieceMobility(c.before, b.square, mover) > 3) continue;
      return att('kept-bad-bishop', 1, { squares: [b.square, best.to], moves: [best.san], pvMoves: [] }, { bishop: b.square, pawns: onColour, better: best.san });
    }
    return null;
  },
];

function isFlagged(classification: string | null): boolean {
  return classification === 'inaccuracy' || classification === 'mistake' || classification === 'blunder' || classification === 'miss';
}

/**
 * The fundamentals this flagged move neglected, ranked, at most ATTRIBUTION_MAX.
 * Empty when the move is not flagged, the best move is unknown, or nothing
 * can be PROVED — silence over a story.
 */
export function attributePrinciples(input: AttributionInput): PrincipleAttribution[] {
  if (!isFlagged(input.classification) || !input.bestSan) return [];
  if (input.historySans.length === 0) return [];
  const before = new Chess();
  const history: Move[] = [];
  try {
    for (const san of input.historySans.slice(0, -1)) {
      const m = before.move(san.replace(/[?!]+$/, ''));
      if (!m) return [];
      history.push(m);
    }
  } catch { return []; }
  const playedSan = input.historySans[input.historySans.length - 1];
  const after = applied(before, playedSan);
  if (!after) return [];
  const last = tryMove(before, playedSan);
  if (!last) return [];
  history.push(last);
  let afterBest = applied(before, input.bestSan);
  if (!afterBest) return [];
  const best = tryMove(before, input.bestSan);
  if (!best) return [];
  if (best.san === last.san) return [];
  // The counterfactual board is the position after the best move AND the
  // opponent's natural recapture when the best move started an exchange —
  // otherwise "after 6...Nxc3, White can push d5" counts a kick White cannot
  // play before taking the knight back. Deterministic: least-valuable
  // recapturer, only when recapturing does not lose material.
  if (best.captured) {
    const re = cheapestCapture(afterBest, best.to, other(last.color));
    if (re && hangsBy(afterBest, best.to) >= 0) {
      const resolved = appliedVerbose(afterBest, re);
      if (resolved) afterBest = resolved;
    }
  }
  const mover = last.color;
  const ctx: Ctx = {
    before, after, afterBest, mover, opp: other(mover), last, best, history,
    plyIndex: input.historySans.length, opening: input.historySans.length <= OPENING_PLIES,
    endgame: isEndgame(before), pvP: input.pvAfterPlayed, pvB: input.pvAfterBest,
  };
  const found: PrincipleAttribution[] = [];
  for (const d of DETECTORS) {
    let r: ReturnType<Detector> = null;
    try { r = d(ctx); } catch { r = null; }
    if (!r) continue;
    const corroborated = r.evidence.pvMoves.length > 0 ? 1 : 0;
    found.push({ ...r, weight: r.weight + corroborated, tag: FUNDAMENTAL_TAG[r.id], coOccurrence: CO_OCCURRENCE.has(r.id) });
  }
  // One story per cost: a specific fundamental subsumes the generic one that
  // names the same punishment (the early queen IS the tempo it hands over; the
  // early queen IS the development it neglected).
  const ids = new Set(found.map((f) => f.id));
  const subsumed = new Set<FundamentalId>();
  if (ids.has('early-queen-sortie')) { subsumed.add('tempo-handed'); subsumed.add('neglected-development'); }
  if (ids.has('loose-piece')) subsumed.add('greedy-pawn-grab');
  if (ids.has('ignored-threat')) subsumed.add('loose-piece');
  const kept = found.filter((f) => !subsumed.has(f.id));
  const verified = kept.filter((f) => !f.coOccurrence);
  const pool = verified.length > 0 ? verified : kept.slice(0, 1);
  return pool.sort((a, b) => b.weight - a.weight || FUNDAMENTAL_IDS.indexOf(a.id) - FUNDAMENTAL_IDS.indexOf(b.id)).slice(0, ATTRIBUTION_MAX);
}

/** Convenience: UCI PV → SAN list from a FEN (bad moves truncate the line). */
export function pvUciToSan(fen: string, uci: readonly string[]): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
      if (!m) break;
      out.push(m.san);
    }
  } catch { /* truncate */ }
  return out;
}
