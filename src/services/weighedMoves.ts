// weighedMoves — THE MOVES A PLAYER WEIGHS, AND HOW EACH FARES (David
// 2026-11-05, Danya's most common teaching move the app lacked).
//
// Naroditsky rarely names only the move he plays. He names the moves a player
// would look at first and says what happens to each: "the natural doubling
// with Rg8 and Rg2 fails to Rh4", "Qa4 is tempting, but first h3" (8.6% of his
// notes — the tempting move ruled out with its refutation); "Bf6 or Ng6 — take
// your pick", "Qe7 or Qc6 — Qc6, the bishop is still great" (2.3% — two good
// moves and the one thing between them); "not f3 — Nf3 would block your own
// fianchettoed bishop", "Bf4 runs into Nxd4, Bg5 is kicked by h6, Bd2 hangs
// the knight — fianchetto instead" (2.9% — which square for a piece).
//
// All three read ONE input: the moves a player would weigh here. Measured on
// his ~400 explicitly weighed moves, only 21% sit in the engine's top two lines
// and 39% in its top five, and of those outside the top five 81% are QUIET — a
// scan of checks and captures would not find them. So the candidate list is
// the human model's (`humanMove`): P(move) ∝ exp(w(rating)·features), fitted
// on what real players pick. Read with every move scored the same, the model
// is the EYE — what a player at this rating looks at before calculating
// (develops, castles, takes, checks, flees, never leaves a piece hanging). A
// surface with a score for every legal move reads the full model as well.
//
// The facts then rest on the engine, one read per candidate, handed in by the
// surface (`WeighRead`): a candidate ruled out only with the line that refutes
// it (`costReason`, named per `lineTrust`); two moves called equal only on
// their scores, and only with the board's own difference between them; a
// square ruled out only for what the board shows goes wrong there.
//
// PURE: chess.js, the human model's weights and the one cost walker. No engine.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { humanMoveProbabilities, type ScoredMove } from './humanMove';
import { costReason, reasonSans, reasonWinWords, type CostReason } from './costReason';
import { lineShape, lineShapePlies, orList, andList, type LineSeat } from '../utils/andList';
import { contrastMoves } from './moveContrast';
import { findHangingPieces } from './tacticClassifier';
import { legalSeeGainFor } from './positionReadingService';
import { lineProof, type Proof } from './proof';
import { seatCp, expectedScore } from './winChance';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { pieceRef } from './pieceRef';
import { openSentence } from '../utils/openSentence';
import { temptingKey } from './conceptKey';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** A move the eye weighs: at this share of the eye's read or above, a player
 *  at the rating looks at it. A BAR, not a cap — every move that clears it is
 *  a candidate. Measured 2026-11-05 on 32 moves he weighed out loud in his
 *  speedruns: 21 of the 32 he named sit in the list at 1500 (every legal move
 *  scored), against 10 in the engine's top five and 5 in its top two. */
export const CANDIDATE_BAR = 0.04;
/** A candidate that costs at least this much against the move played is one
 *  that FAILS — a pawn, the same bar a cost needs before it has a reason. */
export const TEMPTING_COST_CP = 100;
/** A tempting move is one a player at the rating might really PLAY: among
 *  the candidates, its share by the full model (what it costs included) is at
 *  least this. Measured 2026-11-05 on the moves he ruled out (the fixture
 *  `danya-weighed-reads.json`): the blunders he warns about sit at 0.3–1.6%
 *  of the moves read (…Nxe4 dropping a knight for a pawn 1.2%, e3 dropping a
 *  knight 0.6%). Among several that clear it, the one players play most is
 *  said first (`temptingRefutations`). */
export const TEMPTING_P_FLOOR = 0.003;
/** A second good move is said only when a player would seriously weigh it:
 *  its share among the moves read, the cost included. The two pairs he called
 *  a free choice in a won position sat at 36% and 65%. */
export const ALSO_GOOD_P_FLOOR = 0.1;
/** Two moves this close in expected score are worth the same (~30cp on a
 *  level board, more in a decided one: +5 and +6 are both a win). */
export const SAME_WORTH = 0.03;
/** …and both this close to the best, or they are not GOOD moves. */
export const GOOD_MOVE = 0.05;
/** Both moves keep a won game (expected score) — "take your pick". */
export const BOTH_WIN = 0.85;
/** A sibling square is one the eye weighs at least this share as much as the
 *  square the piece went to. */
export const SIBLING_SHARE = 0.5;
/** The moves of the opening, where a centre pawn at home is still the plan. */
const OPENING_MOVES = 12;

/** ONE ENGINE READ OF ONE CANDIDATE from the board before the move: the
 *  candidate first (UCI), then the line the engine expects; the score is
 *  White's view, the same convention as every analysis line. `earlier` is the
 *  same search two depths shallower, when the surface kept it (`lineTrust`). */
export interface WeighRead {
  evaluation: number;
  mate: number | null;
  moves: readonly string[];
  earlier?: readonly string[] | null;
}

export interface CandidateMove {
  uci: string;
  san: string;
  from: string;
  to: string;
  piece: string;
  /** The eye's read: the model's probability with every move scored alike. */
  eye: number;
  /** The full model's probability, when every legal move was scored. */
  p: number | null;
  played: boolean;
}

function boardOf(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

function uciOf(m: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}

/** The legal move `san` (or UCI) names on `fen`, or null. */
function moveOn(fen: string, move: string): Move | null {
  const b = boardOf(fen);
  if (!b) return null;
  try {
    return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)
      ? b.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] })
      : b.move(move);
  } catch { return null; }
}

/** THE EYE — what a player at `rating` looks at here before calculating: the
 *  human model over every legal move, all scored alike, so only what KIND of
 *  move it is decides (a capture, a check, a developing move, castling, a
 *  piece left where it can be taken …). */
export function eyeRead(fen: string, rating: number): Array<{ uci: string; p: number }> {
  const b = boardOf(fen);
  if (!b) return [];
  const legal = b.moves({ verbose: true }).map((m) => ({ uci: uciOf(m), cp: 0 }));
  return humanMoveProbabilities(fen, legal, rating).map((r) => ({ uci: r.uci, p: r.p }));
}

/**
 * (1) THE CANDIDATE LIST — the moves a player at `rating` would most weigh
 * here, plus the move played. `scored`: every legal move's score (mover's
 * view, `ScoredMove`) where the surface has one — then the full model joins
 * the eye, so a move the eye passes over that a player still finds (because
 * it is so much better) is weighed too. Ordered by the eye.
 */
export function candidateMoves(fen: string, rating: number, opts: { played: string | null; scored: readonly ScoredMove[] | null }): CandidateMove[] {
  const b = boardOf(fen);
  if (!b) return [];
  const played = opts.played ? moveOn(fen, opts.played) : null;
  const playedUci = played ? uciOf(played) : null;
  const eye = new Map(eyeRead(fen, rating).map((r) => [r.uci, r.p]));
  const full = opts.scored && opts.scored.length > 0
    ? new Map(humanMoveProbabilities(fen, opts.scored, rating).map((r) => [r.uci, r.p]))
    : null;
  const out: CandidateMove[] = [];
  for (const m of b.moves({ verbose: true })) {
    const uci = uciOf(m);
    const e = eye.get(uci) ?? 0;
    const p = full ? full.get(uci) ?? 0 : null;
    const isPlayed = uci === playedUci;
    if (!isPlayed && e < CANDIDATE_BAR && (p === null || p < CANDIDATE_BAR)) continue;
    out.push({ uci, san: m.san, from: m.from, to: m.to, piece: m.piece, eye: e, p, played: isPlayed });
  }
  return out.sort((x, y) => y.eye - x.eye);
}

function readOf(reads: readonly WeighRead[], uci: string): WeighRead | null {
  return reads.find((r) => r.moves[0] === uci) ?? null;
}

/** THE CANDIDATES A SURFACE READ, as a player weighs them: every move with a
 *  read (the move played left out), each with the eye's share and the full
 *  model's share among the moves read (`real` — what a player at the rating
 *  would PLAY of them, the cost included), kept when either clears the bar,
 *  most natural-looking first. */
function readCandidates(fen: string, played: Move, reads: readonly WeighRead[], rating: number): Array<{ c: CandidateMove; read: WeighRead; real: number }> {
  const mover = played.color;
  const playedUci = uciOf(played);
  const eye = new Map(eyeRead(fen, rating).map((r) => [r.uci, r.p]));
  const real = new Map(humanMoveProbabilities(fen, reads.filter((r) => !!r.moves[0]).map((r) => ({ uci: r.moves[0], cp: seatCp(r, mover) })), rating).map((r) => [r.uci, r.p]));
  const out: Array<{ c: CandidateMove; read: WeighRead; real: number }> = [];
  for (const read of reads) {
    const uci = read.moves[0];
    if (!uci || uci === playedUci) continue;
    const m = moveOn(fen, uci);
    if (!m) continue;
    const e = eye.get(uci) ?? 0;
    const p = real.get(uci) ?? 0;
    if (e < CANDIDATE_BAR && p < CANDIDATE_BAR) continue;
    out.push({ c: { uci, san: m.san, from: m.from, to: m.to, piece: m.piece, eye: e, p, played: false }, read, real: p });
  }
  return out.sort((x, y) => y.c.eye - x.c.eye);
}

/** Seat words for the side that moved and the other side. */
function seatWords(mover: Color, student: Color): { own: 'your' | 'their'; other: 'your' | 'their'; moverLine: LineSeat; otherLine: LineSeat; otherWho: 'you' | 'they' } {
  const mine = mover === student;
  return mine
    ? { own: 'your', other: 'their', moverLine: 'you', otherLine: 'they', otherWho: 'they' }
    : { own: 'their', other: 'your', moverLine: 'they', otherLine: 'you', otherWho: 'you' };
}

// ── (A) THE TEMPTING MOVE, REFUTED ──────────────────────────────────────────

export interface TemptingRefuted {
  /** The candidate ruled out. */
  san: string;
  uci: string;
  eye: number;
  /** What it costs against the move played (cp, the mover's side). */
  costCp: number;
  /** The one cost walker's reason: the line after the candidate that wins
   *  material or mates for the other side, named per `lineTrust`. */
  reason: CostReason;
  text: string;
  squares: string[];
  proof: Proof | null;
  /** Its say-once key, and the rule-out claim the deliberation makes for the
   *  same loss (one loss is ruled out once, whichever computer said it). */
  key: string;
  claims: string[];
}

/** The square the blow lands on (the line's last move), for the claim the
 *  deliberation makes about the same loss. */
function blowSquare(sans: readonly string[]): string | null {
  const last = sans[sans.length - 1]?.replace(/^…/, '') ?? '';
  return /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(last)?.[1] ?? null;
}

/**
 * (A) THE NATURAL MOVE THAT FAILS — a candidate the eye weighs, worse than the
 * move played by a pawn or more, refuted by the line the engine plays after
 * it. Said only when that line proves the cost (`costReason`: it wins material
 * or mates for the other side) and may be named (`lineTrust`). The most
 * tempting such candidate is the one said. Null otherwise — never a guess.
 */
export function temptingRefuted(args: {
  fenBefore: string;
  /** The move played. */
  san: string;
  student: Color;
  rating: number;
  /** One read per candidate (the move played among them), from `fenBefore`. */
  reads: readonly WeighRead[];
  /** The move that led to `fenBefore`, so a recapture is half a trade. */
  priorMove: { fenBefore: string; san: string } | null;
}): TemptingRefuted | null {
  return temptingRefutations(args)[0] ?? null;
}

/** Every tempting candidate the engine's line refutes, most tempting first —
 *  the measurement reads them all; a surface says the first. */
export function temptingRefutations(args: Parameters<typeof temptingRefuted>[0]): TemptingRefuted[] {
  const played = moveOn(args.fenBefore, args.san);
  if (!played) return [];
  const mover = played.color;
  const playedRead = readOf(args.reads, uciOf(played));
  if (!playedRead) return [];
  const playedCp = seatCp(playedRead, mover);
  const w = seatWords(mover, args.student);
  const out: Array<TemptingRefuted & { real: number }> = [];
  // A temptation is a move someone at the rating would really play (`real`).
  for (const { c, read, real } of readCandidates(args.fenBefore, played, args.reads, args.rating)) {
    if (real < TEMPTING_P_FLOOR) continue;
    const cost = playedCp - seatCp(read, mover);
    if (cost < TEMPTING_COST_CP) continue;
    const seconds = read.earlier && read.earlier[0] === c.uci ? [read.earlier.slice(1)] : [];
    const r = costReason({
      fenBefore: args.fenBefore, playedSan: c.san, mover, student: args.student, costCp: cost,
      after: { uci: read.moves.slice(1), source: 'deep', seconds }, before: null, priorMove: args.priorMove,
      // Measured against the move played: a loss its own line shares is no reason.
      against: playedRead.moves,
    });
    if (!r || r.kind !== 'allowed' || !r.trust.name) continue;
    // A PIECE SIMPLY GIVEN AWAY IS NOT A TEMPTATION: their first reply takes
    // the piece that moved, a rook's worth or more for nothing much (…Qxf2+
    // Kxf2). The eye likes the capture with check; no player weighs it. A
    // knight taken for a pawn (…Nxe4 dxe4) is the classic one, and stays.
    if (r.blowPlies === 1 && r.plies[0]?.uci.slice(2, 4) === c.to && r.netForWinner >= 5) continue;
    const sans = reasonSans(r);
    // What it wins beyond what the line, as said, already names: a line that
    // ends "they play a1, making a queen" has said its gain.
    const won = r.mate ? null : reasonWinWords(r, lineShapePlies(sans.length));
    const result = r.mate ? ' — and it\'s mate' : won ? ` — ${w.otherWho} win ${won}` : '';
    const lead = mover === args.student
      ? rotateStem([`${c.san} is tempting here, but it fails`, `${c.san} looks natural, but it doesn't work`], stemKeyOf(`${args.fenBefore}|${c.uci}`))
      : rotateStem([`${c.san} was tempting for them, but it fails`, `${c.san} looked natural for them, but it doesn't work`], stemKeyOf(`${args.fenBefore}|${c.uci}`));
    const text = `${lead}: ${lineShape(sans, w.otherLine)}${result}.`;
    const sq = blowSquare(sans);
    const key = temptingKey(c.uci);
    out.push({
      real, san: c.san, uci: c.uci, eye: c.eye, costCp: Math.round(cost), reason: r, text,
      squares: [...new Set([c.from, c.to, ...(sq ? [sq] : [])])],
      proof: lineProof({ fen: args.fenBefore, sans: [c.san, ...r.plies.map((p) => p.san)] }, w.moverLine),
      key, claims: [key, ...(sq ? [r.mate ? `rule-out:mate:${sq}` : `rule-out:${sq}`] : [])],
    });
  }
  // THE MOST TEMPTING IS THE ONE A PLAYER WOULD MOST OFTEN PLAY — the eye's
  // pull and the cost together (`real`): …b6 dropping the rook is played
  // more than …Qxd4+ dropping the queen, though a queen capture with check
  // catches the eye more (his 17…Rb8, played because …b6 loses the rook).
  return out.sort((x, y) => y.real - x.real).map(({ real: _real, ...t }) => t);
}

// ── (L) TWO GOOD MOVES, AND WHAT SEPARATES THEM ─────────────────────────────

/** The one board-true difference between two moves from the same board. */
export interface MoveDifference {
  kind: 'loose' | 'activity' | 'structure';
  /** From the seat of the side that moved. */
  text: string;
  /** The same difference with no move and no square — Learn's held form,
   *  said for the move that `favours`. */
  held: string;
  /** The held form said for the OTHER move, when the student played the one
   *  the difference does not favour ("the other keeps every piece guarded,
   *  and yours leaves one loose") — the edge, without naming the move. */
  heldOther: string;
  squares: string[];
}

/** Squares the piece on `sq` could move to with its side to move again (its
 *  reach from there) — the activity the board shows. */
function reachFrom(fenAfter: string, sq: string, side: Color): number {
  const p = fenAfter.split(' ');
  p[1] = side;
  p[3] = '-';
  const b = boardOf(p.join(' '));
  if (!b) return 0;
  try { return b.moves({ square: sq as Square, verbose: true }).length; } catch { return 0; }
}

/** After `san`, is the mover's piece on `sq` attacked by the other side? */
function hitAfter(fenBefore: string, san: string, sq: string): boolean {
  const b = boardOf(fenBefore);
  if (!b) return false;
  try { const m = b.move(san); return b.attackers(sq as Square, m.color === 'w' ? 'b' : 'w').length > 0; } catch { return false; }
}

/** The mover's pawns that are doubled or isolated after a move. */
function pawnFaults(fenAfter: string, side: Color): Set<string> {
  const b = boardOf(fenAfter);
  const out = new Set<string>();
  if (!b) return out;
  const files = new Map<string, string[]>();
  for (const row of b.board()) for (const c of row) {
    if (c && c.type === 'p' && c.color === side) files.set(c.square[0], [...(files.get(c.square[0]) ?? []), c.square]);
  }
  for (const [f, sqs] of files) {
    if (sqs.length > 1) for (const s of sqs) out.add(`doubled:${s}`);
    const fi = f.charCodeAt(0);
    const near = [String.fromCharCode(fi - 1), String.fromCharCode(fi + 1)].some((x) => files.has(x));
    if (!near) for (const s of sqs) out.add(`isolated:${s}`);
  }
  return out;
}

/**
 * What separates two moves of the same worth on the board: a piece one leaves
 * loose that the other keeps guarded (`contrastMoves`), a pawn left doubled or
 * isolated, or a piece that does much more from one square than the other. Said from the mover's
 * seat; the move named first (`a`) is the one the difference favours. Null
 * when the board shows none — then the two are not compared out loud.
 */
export function moveDifference(fenBefore: string, sanA: string, sanB: string, own: 'your' | 'their'): (MoveDifference & { favours: string; other: string }) | null {
  const a = moveOn(fenBefore, sanA);
  const bm = moveOn(fenBefore, sanB);
  if (!a || !bm) return null;
  const side = a.color;
  const cmp = contrastMoves(fenBefore, a.san, bm.san);
  // The moved piece itself standing unguarded is where it went, not what the
  // other move keeps guarded ("Nh5 keeps your knight on d5 guarded"); and a
  // piece left loose matters only when something already hits it (a b2 pawn
  // or a rook on a8 with no guard is half the boards of a game).
  if (cmp && cmp.square !== a.to && cmp.square !== bm.to && hitAfter(fenBefore, cmp.drops, cmp.square)) {
    return { kind: 'loose', favours: cmp.keeps, other: cmp.drops, squares: [cmp.square],
      text: `${cmp.keeps} keeps ${own} ${NAME[cmp.piece] ?? 'piece'} on ${cmp.square} guarded, and ${cmp.drops} leaves it loose`,
      // The held forms name the piece, never the other move (David
      // 2026-11-07: "I want specificity when we teach. Not a general
      // statement" — "the other leaves one loose" named nothing).
      held: `${own === 'your' ? 'yours' : 'theirs'} keeps ${own} ${NAME[cmp.piece] ?? 'piece'} on ${cmp.square} guarded, and the other leaves it loose`,
      heldOther: `the other keeps ${own} ${NAME[cmp.piece] ?? 'piece'} on ${cmp.square} guarded, and ${own === 'your' ? 'yours' : 'theirs'} leaves it loose` };
  }
  // Developing or castling first is the fundamentals' lesson (said by their
  // own computers on the move itself); between two moves of one worth it
  // separates nothing worth a sentence — on an opening board it would be said
  // on every move ("Nf3 brings a new piece into the game, and d4 is a pawn
  // move", decision baseline 2026-11-05).
  const afterA = boardOf(fenBefore); const afterB = boardOf(fenBefore);
  if (!afterA || !afterB) return null;
  try { afterA.move(a.san); afterB.move(bm.san); } catch { return null; }
  const fa = pawnFaults(afterA.fen(), side); const fb = pawnFaults(afterB.fen(), side);
  const before = pawnFaults(fenBefore, side);
  const newA = [...fa].filter((x) => !before.has(x)); const newB = [...fb].filter((x) => !before.has(x));
  if ((newA.length === 0) !== (newB.length === 0)) {
    const [f, o, faults] = newA.length === 0 ? [a, bm, newB] : [bm, a, newA];
    const [kind, sq] = faults[0].split(':');
    return { kind: 'structure', favours: f.san, other: o.san, squares: [sq],
      text: `${f.san} keeps ${own} pawns whole, and ${o.san} leaves ${own === 'your' ? 'you' : 'them'} ${kind === 'doubled' ? 'doubled pawns' : 'an isolated pawn'} on ${sq}`,
      held: `${own === 'your' ? 'yours' : 'theirs'} keeps ${own} pawns whole, where the other leaves ${own === 'your' ? 'you' : 'them'} ${kind === 'doubled' ? 'doubled pawns' : 'an isolated pawn'}`,
      heldOther: `the other keeps the pawns whole, and ${own === 'your' ? 'yours leaves you' : 'theirs leaves them'} ${kind === 'doubled' ? 'doubled pawns' : 'an isolated pawn'}` };
  }
  // Activity compares like with like: the same piece on its two squares — a
  // knight, a bishop or a rook (a queen reaches a dozen squares from almost
  // anywhere, and a queen's reach against a knight's says nothing).
  if (a.from === bm.from && 'nbr'.includes(a.piece)) {
    const ra = reachFrom(afterA.fen(), a.to, side);
    const rb = reachFrom(afterB.fen(), bm.to, side);
    const [hi, lo, rh, rl] = ra >= rb ? [a, bm, ra, rb] : [bm, a, rb, ra];
    if (rh - rl >= 3 && rh >= 1.5 * Math.max(1, rl)) {
      return { kind: 'activity', favours: hi.san, other: lo.san, squares: [hi.to, lo.to],
        text: `${own} ${NAME[hi.piece]} does more on ${hi.to}, with ${rh} squares from there against ${rl} on ${lo.to}`,
        // The played square is on the board; the other move's is never said.
        held: `${own} ${NAME[hi.piece]} reaches ${rh} squares from ${hi.to}, against ${rl} from the other square it had`,
        heldOther: `${own} ${NAME[lo.piece]} reaches only ${rl} squares from ${lo.to}, against ${rh} from the other square it had` };
    }
  }
  return null;
}

export interface AlsoGood {
  /** The other move of the same worth. */
  san: string;
  uci: string;
  /** The two scores' gap (cp, the mover's side). */
  gapCp: number;
  /** What separates them, or null when both simply keep a won game. */
  difference: (MoveDifference & { favours: string; other: string }) | null;
  text: string;
  /** The form that names no move and no square (Learn, the student's move,
   *  while the other move may still be theirs to play). */
  heldText: string;
  squares: string[];
  key: string;
}

/**
 * (L) TWO GOOD MOVES — a candidate the eye weighs whose score is within a
 * whisker of the move played, both good (near the best of the reads), said
 * WITH the one thing the board shows between them (`moveDifference`). Two
 * moves the board cannot tell apart are not compared out loud.
 */
export function alsoGood(args: { fenBefore: string; san: string; student: Color; rating: number; reads: readonly WeighRead[] }): AlsoGood | null {
  const played = moveOn(args.fenBefore, args.san);
  if (!played) return null;
  const mover = played.color;
  const playedRead = readOf(args.reads, uciOf(played));
  if (!playedRead || args.reads.length < 2) return null;
  const es = (r: WeighRead): number => expectedScore(seatCp(r, mover));
  const playedEs = es(playedRead);
  const best = Math.max(...args.reads.map(es));
  if (best - playedEs > GOOD_MOVE) return null;
  const w = seatWords(mover, args.student);
  let bothWin: { c: CandidateMove; gap: number } | null = null;
  for (const { c, read, real } of readCandidates(args.fenBefore, played, args.reads, args.rating)) {
    if (real < ALSO_GOOD_P_FLOOR) continue;
    const ce = es(read);
    if (Math.abs(ce - playedEs) > SAME_WORTH || best - ce > GOOD_MOVE) continue;
    const gapCp = Math.round(Math.abs(seatCp(read, mover) - seatCp(playedRead, mover)));
    const d = moveDifference(args.fenBefore, played.san, c.san, w.own);
    if (!d) {
      if (!bothWin && ce >= BOTH_WIN && playedEs >= BOTH_WIN) bothWin = { c, gap: gapCp };
      continue;
    }
    // No dash chain (the human voice, 2026-11-08: "Be7 or Bd6 — both hold
    // here, and what separates them is this: … does more on d6 — 8 squares
    // from there" ran two dashes and a colon in one breath). The claim and its
    // difference stay ONE sentence: split, the voice kept "Nxe4 and dxe4 both
    // hold here." alone where it had refused the whole.
    const text = `${played.san} and ${c.san} both hold here, and what separates them is that ${d.text}.`;
    const heldText = mover === args.student
      ? `Another move was worth the same here — ${d.favours === played.san ? d.held : d.heldOther}.`
      : text;
    return { san: c.san, uci: c.uci, gapCp, difference: d, text, heldText,
      squares: [...new Set([played.to, c.to, ...d.squares])], key: `also-good:${uciOf(played)}:${c.uci}` };
  }
  // TWO ROADS TO A WON GAME (his 21.Bxf6+, with Nxg6+ called a free choice
  // since both win): both keep the win, and nothing on the board needs
  // choosing between them.
  if (bothWin) {
    const c = bothWin.c;
    const text = `${played.san} or ${c.san} — both keep the win, so take your pick.`;
    const heldText = mover === args.student ? 'Another move kept the win just as well — when you are winning, there is often more than one road.' : text;
    return { san: c.san, uci: c.uci, gapCp: bothWin.gap, difference: null, text, heldText,
      squares: [played.to, c.to], key: `also-good:${uciOf(played)}:${c.uci}` };
  }
  return null;
}

// ── (C) WHICH SQUARE FOR THE PIECE ──────────────────────────────────────────

export interface SquareFault {
  square: string;
  kind: 'hangs' | 'kicked' | 'blocks' | 'refuted';
  /** What goes wrong there, said after "on <square> it …". */
  text: string;
  squares: string[];
}

/** Their pawn push that hits the piece standing on `sq` (one step, or two
 *  from the start rank), on a square the push does not just lose the pawn. */
function pawnKick(fenAfter: string, sq: string, side: Color): string | null {
  const them: Color = side === 'w' ? 'b' : 'w';
  const p = fenAfter.split(' ');
  p[1] = them;
  p[3] = '-';
  const b = boardOf(p.join(' '));
  if (!b) return null;
  const piece = b.get(sq as Square);
  if (!piece || piece.type === 'p' || piece.type === 'k') return null;
  for (const m of b.moves({ verbose: true })) {
    if (m.piece !== 'p' || m.captured) continue;
    const after = boardOf(p.join(' '));
    if (!after) continue;
    try { after.move(m.san); } catch { continue; }
    if (!after.attackers(sq as Square, them).includes(m.to)) continue;
    // The push must not just drop the pawn: guarded, or nothing takes it.
    const takers = after.attackers(m.to, side);
    if (takers.length > 0 && after.attackers(m.to, them).length === 0) continue;
    return m.san;
  }
  return null;
}

/** An own bishop whose diagonal runs THROUGH the square and on past it — a
 *  piece put there would shut it in. Or an own centre pawn still at home
 *  right behind it. */
function blocksOwn(fenBefore: string, m: Move): { by: string; piece: string } | null {
  const b = boardOf(fenBefore);
  if (!b) return null;
  const side = m.color;
  const after = boardOf(fenBefore);
  if (!after) return null;
  try { after.move(m.san); } catch { return null; }
  for (const row of b.board()) for (const c of row) {
    if (!c || c.color !== side || c.square === m.from) continue;
    // A bishop's diagonal (his "Nf3 would block your own fianchettoed
    // bishop"): the long-range piece a natural square shuts in most often.
    if (c.type === 'b') {
      // The piece reached `m.to` before, and beyond it at least two more
      // squares along the same line — that is the line the move cuts — and
      // the bishop loses three squares or more by it (a c1 bishop already
      // behind its own e3 pawn is not shut in by Nd2: it was shut in).
      const reachBefore = new Set(b.moves({ square: c.square, verbose: true }).map((x) => x.to));
      if (b.turn() !== side) continue;
      if (!reachBefore.has(m.to)) continue;
      const reachAfter = reachFrom(after.fen(), c.square, side);
      if (reachBefore.size - reachAfter < 3) continue;
      const dx = Math.sign(m.to.charCodeAt(0) - c.square.charCodeAt(0));
      const dy = Math.sign(Number(m.to[1]) - Number(c.square[1]));
      let beyond = 0;
      for (let k = 1; k <= 7; k += 1) {
        const f = String.fromCharCode(m.to.charCodeAt(0) + dx * k);
        const r = Number(m.to[1]) + dy * k;
        if (f < 'a' || f > 'h' || r < 1 || r > 8) break;
        const there = b.get(`${f}${r}` as Square);
        if (there && there.color === side) break;
        beyond += 1;
        if (there) break;
      }
      if (beyond >= 2) return { by: c.square, piece: c.type };
    }
    // The c- or d-pawn still at home in the opening (his "Nc6 blocks the
    // c-pawn"): the pawn a queen's-pawn game wants to push. Past the opening a
    // pawn at home is not the plan.
    if (c.type === 'p' && 'cd'.includes(c.square[0]) && c.square[1] === (side === 'w' ? '2' : '7') && Number(fenBefore.split(' ')[5] ?? '1') <= OPENING_MOVES) {
      const front = `${c.square[0]}${side === 'w' ? 3 : 6}`;
      if (front === m.to) return { by: c.square, piece: 'p' };
    }
  }
  return null;
}

/** A piece of the mover's (worth a minor or more) the move leaves en prise:
 *  hanging on the board and lost to the exchange. */
function hangsAfter(fenBefore: string, m: Move): { square: string; piece: string } | null {
  const after = boardOf(fenBefore);
  if (!after) return null;
  try { after.move(m.san); } catch { return null; }
  const them: Color = m.color === 'w' ? 'b' : 'w';
  let worst: { square: string; piece: string } | null = null;
  try {
    for (const h of findHangingPieces(after)) {
      if (h.color !== m.color) continue;
      const t = h.piece.toLowerCase();
      if ((VALUE[t] ?? 0) < 3) continue;
      if (legalSeeGainFor(after.fen(), h.square as Square, them) <= 0) continue;
      if (!worst || VALUE[t] > VALUE[worst.piece]) worst = { square: h.square, piece: t };
    }
  } catch { return null; }
  return worst;
}

/** What goes wrong on the square a move takes the piece to, from the board
 *  (and the move's engine read, when the surface has one). */
function faultsOn(fenBefore: string, m: Move, own: 'your' | 'their', other: 'your' | 'their', reason: CostReason | null): SquareFault[] {
  const out: SquareFault[] = [];
  const after = boardOf(fenBefore);
  if (!after) return out;
  try { after.move(m.san); } catch { return out; }
  // A piece is named the way a person names it (`pieceRef`): "your other
  // knight", "your d-pawn" — its square lit on the board, not read out.
  const named = (sq: string, piece: string): string => {
    const ref = pieceRef(after.fen(), sq, own === 'your' ? m.color : (m.color === 'w' ? 'b' : 'w'));
    return ref ? ref.words : `${own} ${NAME[piece]} on ${sq}`;
  };
  const h = hangsAfter(fenBefore, m);
  if (h) {
    out.push({ square: m.to, kind: 'hangs', squares: [h.square],
      text: h.square === m.to ? 'hangs' : `leaves ${named(h.square, h.piece)} hanging` });
  }
  const kick = pawnKick(after.fen(), m.to, m.color);
  if (kick) out.push({ square: m.to, kind: 'kicked', squares: [m.to], text: `is kicked by ${other} ${kick[0]}-pawn` });
  const blk = blocksOwn(fenBefore, m);
  if (blk) {
    out.push({ square: m.to, kind: 'blocks', squares: [blk.by], text: `blocks ${named(blk.by, blk.piece)}` });
  }
  if (reason && out.length === 0) {
    const sans = reasonSans(reason);
    // The first move is said; a promotion it makes is not named again.
    const won = reason.mate ? null : reasonWinWords(reason, [0]);
    out.push({ square: m.to, kind: 'refuted', squares: [m.to],
      text: `runs into ${sans[0]}${reason.mate ? ', and it\'s mate' : won ? ` — ${other === 'your' ? 'you' : 'they'} win ${won}` : ''}` });
  }
  return out;
}

export interface SquareChoice {
  /** The piece and the square it went to. */
  piece: string;
  to: string;
  /** The other squares it could have gone to, each with what goes wrong. */
  faults: SquareFault[];
  text: string;
  squares: string[];
  key: string;
}

/**
 * (C) WHICH SQUARE FOR THE PIECE — the piece the move played (a knight or a
 * bishop), its other squares the eye weighs, and what the board
 * shows goes wrong on each: it hangs a piece there, a pawn kicks it, it shuts
 * in one of the mover's own pieces, or (with the surface's read of it) the
 * engine's line refutes it. A fault the square played has too is no reason to
 * prefer it, so it is not said. Null when no other square has a fault.
 */
export function squareChoice(args: { fenBefore: string; san: string; student: Color; rating: number; reads: readonly WeighRead[] | null; priorMove: { fenBefore: string; san: string } | null }): SquareChoice | null {
  const played = moveOn(args.fenBefore, args.san);
  // A knight's or a bishop's square — his examples all are; a queen or a rook
  // has a dozen squares and "on e5 it is kicked by f6" said of each is noise.
  if (!played || !'nb'.includes(played.piece) || played.captured) return null;
  const mover = played.color;
  const w = seatWords(mover, args.student);
  const playedFaults = new Set(faultsOn(args.fenBefore, played, w.own, w.other, null).map((f) => f.kind));
  const playedRead = args.reads ? readOf(args.reads, uciOf(played)) : null;
  const playedCp = playedRead ? seatCp(playedRead, mover) : null;
  const faults: SquareFault[] = [];
  // The piece's other squares the eye weighs: each at least half as natural
  // as the square it went to (`SIBLING_SHARE`).
  const eye = new Map(eyeRead(args.fenBefore, args.rating).map((r) => [r.uci, r.p]));
  const playedEye = eye.get(uciOf(played)) ?? 0;
  const siblings = (boardOf(args.fenBefore)?.moves({ verbose: true }) ?? [])
    .filter((m) => m.from === played.from && m.to !== played.to && (eye.get(uciOf(m)) ?? 0) >= SIBLING_SHARE * playedEye)
    .map((m) => ({ uci: uciOf(m), san: m.san }))
    .sort((x, y) => (eye.get(y.uci) ?? 0) - (eye.get(x.uci) ?? 0));
  for (const c of siblings) {
    const m = moveOn(args.fenBefore, c.san);
    if (!m || m.captured) continue;
    let reason: CostReason | null = null;
    const read = args.reads ? readOf(args.reads, c.uci) : null;
    if (read && playedCp !== null) {
      const cost = playedCp - seatCp(read, mover);
      if (cost >= TEMPTING_COST_CP) {
        const r = costReason({ fenBefore: args.fenBefore, playedSan: c.san, mover, student: args.student, costCp: cost,
          after: { uci: read.moves.slice(1), source: 'deep', seconds: read.earlier && read.earlier[0] === c.uci ? [read.earlier.slice(1)] : [] }, before: null, priorMove: args.priorMove,
          against: playedRead?.moves ?? null });
        reason = r && r.kind === 'allowed' && r.trust.name ? r : null;
      }
    }
    // A kick is a reason only against a square at least as natural as the
    // one chosen (his "Bg5 is kicked by h6", the pin square every player
    // looks at first); any square of the fifth rank can be kicked.
    const natural = (eye.get(c.uci) ?? 0) >= playedEye;
    const f = faultsOn(args.fenBefore, m, w.own, w.other, reason).find((x) => !playedFaults.has(x.kind) && (x.kind !== 'kicked' || natural));
    if (f) faults.push(f);
  }
  if (faults.length === 0) return null;
  const piece = NAME[played.piece];
  // One fault, said once, with every square it is true on, in the order first
  // met. SAID LIKE A PERSON (David 2026-11-05: "naming a bunch of squares …
  // sounds too robotic"): at most two squares out loud. One other square:
  // "Your bishop goes to d3 — on b5 their c-pawn would kick it." More: the
  // square it went to is on the board already — "Why that square for their
  // knight? On h5 or g4 their g-pawn kicks it" — and a fault true on three
  // squares or more is said of "its other squares". Every square stays lit.
  const byText = new Map<string, string[]>();
  for (const f of faults) byText.set(f.text, [...(byText.get(f.text) ?? []), f.square]);
  const groups = [...byText.entries()];
  const outLoud = (t: string): number => new Set(t.match(/\b[a-h][1-8]\b/g) ?? []).size;
  const clause = ([t, sqs]: [string, string[]]): string => (sqs.length <= 2 ? `on ${orList(sqs)} it ${t}` : `on its other squares it ${t}`);
  const all = andList(groups.map(clause));
  // Different faults on different squares stack into a list ("On f4 it is
  // kicked by their e-pawn, on e3 it is kicked by their d-pawn and on e7 or d8
  // it hangs"): a person names the most tempting square and its fault, then
  // sums up the rest (`faults` is in the eye's order, most natural first).
  const said = outLoud(all) <= 2 ? all : `on ${faults[0].square} it ${faults[0].text}, and its other squares are no better`;
  const text = outLoud(said) <= 1
    // The square, then the fault on the other square its own sentence ("Their
    // bishop went to e4 — on g4 it runs into …Bxf3+ — you win the exchange"
    // was a dash chain).
    ? `${mover === args.student ? `Your ${piece} goes to ${played.to}` : `Their ${piece} went to ${played.to}`}. ${openSentence(said)}.`
    // ROTATED on the board and the move (prod Review 2026-11-06: "Why that
    // square for …?" said three times in one game).
    : (() => {
      const whose = mover === args.student ? 'your' : 'their';
      return rotateStem([
        `Why that square for ${whose} ${piece}? ${openSentence(said)}.`,
        `Why ${played.to} for ${whose} ${piece}? ${openSentence(said)}.`,
        `The other squares for ${whose} ${piece} are worse: ${said}.`,
      ], stemKeyOf(`${args.fenBefore}|${uciOf(played)}`));
    })();
  return { piece: played.piece, to: played.to, faults, text,
    squares: [...new Set([played.to, ...faults.flatMap((f) => [f.square, ...f.squares])])],
    key: `square:${uciOf(played)}` };
}
