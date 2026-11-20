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
import { MATERIAL_VALUE } from './pieceValues';
import { lineStory, changeReason } from './futures';
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { humanMoveProbabilities, type ScoredMove } from './humanMove';
import { costReason, reasonSans, reasonWinWords, type CostReason } from './costReason';
import { lineShape, lineShapePlies, orList, andList, type LineSeat } from '../utils/andList';
import { contrastMoves } from './moveContrast';
import { findHangingPieces } from './tacticClassifier';
import { detectTactics } from './tacticsDetector';
import { legalSeeGainFor, bestCaptureGainFor } from './positionReadingService';
import { exchangeEnd } from './material';
import { describeStructure, newPawnWeaknesses } from './boardStructure';
import { lineProof, type Proof } from './proof';
import { seatCp, expectedScore } from './winChance';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { markSaysMate } from '../utils/sanMark';
import { pieceRef } from './pieceRef';
import { openSentence } from '../utils/openSentence';
import { temptingKey } from './conceptKey';
import { INACCURACY_CP } from './engineConstants';
import { settledNetForLine, GAIN_HOLDS_PLIES, computeExchangeLedger, materialGainWords } from './exchangeLedger';
import { evalBand } from './evalBand';
import { boardReason } from './positionalReason';
import { phaseOfFen } from './boardConcepts';
import { withMover } from '../utils/sideToMove';
import { replyJob } from './replyJob';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE = MATERIAL_VALUE;

/** A move that WALKS INTO MATE is weighed from this share of the eye's read
 *  (Danya, "how to avoid blunders" 39.Kh3??: "the checkmate check" — the king
 *  move sat at 2% of the eye, under `CANDIDATE_BAR`, and Nxf4# was never
 *  warned about). Only a move that MAKES the mate: the other side had no mate
 *  in one before it (`walksIntoMate`), so a board with a mate already
 *  threatened does not turn every move into a temptation. */
export const MATE_WALK_BAR = 0.01;

/** The move `uci` on `fen` lets the other side mate in one where, before it,
 *  they had no mate in one (the mover's turn handed over). chess.js only. */
export function walksIntoMate(fen: string, uci: string): boolean {
  const b = boardOf(fen);
  if (!b) return false;
  const mover = b.turn();
  const mates = (c: Chess): boolean => c.moves({ verbose: true }).some((m) => m.san.endsWith('#'));
  try {
    const after = new Chess(fen);
    after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (after.isGameOver() || !mates(after)) return false;
  } catch { return false; }
  const before = withMover(fen, mover === 'w' ? 'b' : 'w');
  if (!before) return false;
  try { return !mates(new Chess(before)); } catch { return false; }
}

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
/** …and below this, the game is lost whatever is played: two moves of the
 *  same worth "hold" nothing (Danya kYbh2 24.Re2 at −3: "Re2 and Be4 both
 *  hold here"). About −2.5 pawns: past it nothing is "held". */
export const BOTH_LOSE = 0.3;
/** A sibling square is one the eye weighs at least this share as much as the
 *  square the piece went to. */
export const SIBLING_SHARE = 0.5;
/** The moves of the opening, where a centre pawn at home is still the plan. */
const OPENING_MOVES = 12;

/** MOVES WEIGHED FOR THE PLAN, not for the eye (his "Rh3 to hit them
 *  directly fails to …h4"): UCI → what the try goes after, in words ("their
 *  pawn on e6"). A considered move is a candidate whatever the eye or the
 *  human model says, and its refutation is worded as the direct try failing. */
export type ConsideredTries = ReadonlyMap<string, ConsideredTry>;
/** Why a move is weighed past the eye: the plan's direct try (with what it
 *  goes after), or a reason a strong player weighs every such move for
 *  (`tryCandidates.reasonTries`) — a capture, a check, a passed pawn's push, a
 *  king step in an ending, a quiet move that threatens or defends. Only the
 *  plan's try is worded as going straight at its target. */
export type ConsideredWhy = 'capture' | 'check' | 'passer' | 'king' | 'threat' | 'defence' | 'mate-threat' | 'lever' | 'double' | 'reroute';
export type ConsideredTry = { why: 'plan'; target: string; storm: boolean } | { why: ConsideredWhy; target: null };

/** What a plan's try goes after, in words: the weak pawn ("the pawn on b5"),
 *  or for a storm the king itself — never the king's square. */
function planAim(plan: { target: string; storm: boolean }, moverIsStudent: boolean): string {
  if (plan.storm) return moverIsStudent ? 'their king' : 'your king';
  return /^[a-h][1-8]$/.test(plan.target) ? `the pawn on ${plan.target}` : plan.target;
}

/** ONE ENGINE READ OF ONE CANDIDATE from the board before the move: the
 *  candidate first (UCI), then the line the engine expects; the score is
 *  White's view, the same convention as every analysis line. `earlier` is the
 *  same search two depths shallower, when the surface kept it (`lineTrust`). */
export interface WeighRead {
  evaluation: number;
  mate: number | null;
  moves: readonly string[];
  earlier?: readonly string[] | null;
  /** Read by the board's own deep search (its root MultiPV), not a try's
   *  board read on its own. The board's move is the best of these. */
  root?: boolean;
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

/** THE MOVES A PLAYER WEIGHS FOR WHAT THEY DO, NOT HOW THEY LOOK (CCT's
 *  "threats", and the natural defence; Danya havecheck 2026-11-19). The eye
 *  reads what KIND of move it is, so a quiet move that attacks a target or
 *  guards a pawn under fire scores like every other quiet move: his "h3 fails:
 *  …hxg4 fxg4 Bxg4" (h3 guards the g4-pawn that …h5 and the e6-bishop hit),
 *  "…Qg5 counterattacks the knight", "Rh3 to hit them directly" sat at 2–3%
 *  of the eye, under the bar, and were never read. A move the eye at least
 *  glances at (`MATE_WALK_BAR`) that THREATENS — after it the mover could win
 *  more with one capture than before (legal SEE, `bestCaptureGainFor`) — or
 *  DEFENDS — the other side could win something before it and less after — is
 *  weighed. Measured on the 209 boards of his articles: about three more
 *  candidates a board, 7 of the 14 tries he weighs that the eye missed. */
export function weighedForWhatItDoes(fen: string, uci: string): 'threat' | 'defence' | null {
  const b = boardOf(fen);
  if (!b) return null;
  const me = b.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  let after: Chess;
  try { after = new Chess(fen); after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; }
  if (after.isGameOver()) return null;
  if (bestCaptureGainFor(after.fen(), me) > bestCaptureGainFor(fen, me)) return 'threat';
  const theirs = bestCaptureGainFor(fen, them);
  if (theirs > 0 && bestCaptureGainFor(after.fen(), them) < theirs) return 'defence';
  return null;
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
    if (!isPlayed && e < CANDIDATE_BAR && (p === null || p < CANDIDATE_BAR) && !(e >= MATE_WALK_BAR && (walksIntoMate(fen, uci) || weighedForWhatItDoes(fen, uci)))) continue;
    out.push({ uci, san: m.san, from: m.from, to: m.to, piece: m.piece, eye: e, p, played: isPlayed });
  }
  return out.sort((x, y) => y.eye - x.eye);
}

/** The read scores a forced mate AGAINST `mover` (the side whose candidate
 *  it is). */
function matesMover(read: WeighRead, mover: Color): boolean {
  return read.mate !== null && seatCp(read, mover) < 0;
}

function readOf(reads: readonly WeighRead[], uci: string): WeighRead | null {
  return reads.find((r) => r.moves[0] === uci) ?? null;
}

/** THE CANDIDATES A SURFACE READ, as a player weighs them: every move with a
 *  read (the move played left out), each with the eye's share and the full
 *  model's share among the moves read (`real` — what a player at the rating
 *  would PLAY of them, the cost included), kept when either clears the bar,
 *  most natural-looking first. */
function readCandidates(fen: string, played: Move, reads: readonly WeighRead[], rating: number, considered: ConsideredTries | null = null): Array<{ c: CandidateMove; read: WeighRead; real: number; mateWalk: boolean }> {
  const mover = played.color;
  const playedUci = uciOf(played);
  const eye = new Map(eyeRead(fen, rating).map((r) => [r.uci, r.p]));
  // ONE READ A MOVE: a fan can report the same move twice (a bound line beside
  // the settled one at the same depth); a move counted twice is one
  // temptation weighed as two. The first read of a move is its read.
  const uniq = reads.filter((r, i) => !!r.moves[0] && reads.findIndex((x) => x.moves[0] === r.moves[0]) === i);
  const real = new Map(humanMoveProbabilities(fen, uniq.map((r) => ({ uci: r.moves[0], cp: seatCp(r, mover) })), rating).map((r) => [r.uci, r.p]));
  const out: Array<{ c: CandidateMove; read: WeighRead; real: number; mateWalk: boolean }> = [];
  for (const read of uniq) {
    const uci = read.moves[0];
    if (!uci || uci === playedUci) continue;
    const m = moveOn(fen, uci);
    if (!m) continue;
    const e = eye.get(uci) ?? 0;
    const p = real.get(uci) ?? 0;
    const mateWalk = e >= MATE_WALK_BAR && walksIntoMate(fen, uci);
    if (e < CANDIDATE_BAR && p < CANDIDATE_BAR && !mateWalk && !considered?.has(uci) && !(e >= MATE_WALK_BAR && weighedForWhatItDoes(fen, uci))) continue;
    out.push({ c: { uci, san: m.san, from: m.from, to: m.to, piece: m.piece, eye: e, p, played: false }, read, real: p, mateWalk });
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
  /** The refutation alone, no lead and no stop: "they play dxe4 — they win a
   *  knight for a pawn" — for a surface that has already named the move
   *  ("Why not Nxe4?") and answers with the one reason. */
  because: string;
  squares: string[];
  proof: Proof | null;
  /** Its say-once key, and the rule-out claim the deliberation makes for the
   *  same loss (one loss is ruled out once, whichever computer said it). */
  key: string;
  claims: string[];
}

const LOOKS: Partial<Record<string, string>> = { pin: 'a pin', fork: 'a fork', skewer: 'a skewer', discovered_attack: 'a discovered attack' };

/** The motif a candidate sets up for its mover, made by the piece that moved
 *  (`detectTactics` on the board after it): the look that makes it tempting.
 *  Null when it sets up none. */
export function tryLooksLike(fenBefore: string, san: string, mover: Color): string | null {
  let after: Chess;
  let to: string;
  try { after = new Chess(fenBefore); to = after.move(san).to; } catch { return null; }
  let tactics;
  try { tactics = detectTactics(after.fen()).tactics; } catch { return null; }
  for (const t of tactics) {
    const word = LOOKS[t.type];
    if (word && t.beneficiary === mover && t.involvedSquares[0] === to) return word;
  }
  return null;
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
  /** Tries weighed for the plan (`ConsideredTries`), past the human floor. */
  considered?: ConsideredTries;
}): TemptingRefuted | null {
  return temptingRefutations(args)[0] ?? null;
}

/** Every tempting candidate the engine's line refutes, most tempting first —
 *  the measurement reads them all; a surface says the first. */
export function temptingRefutations(args: Parameters<typeof temptingRefuted>[0]): TemptingRefuted[] {
  const played = moveOn(args.fenBefore, args.san);
  if (!played) return [];
  const playedRead = readOf(args.reads, uciOf(played));
  if (!playedRead) return [];
  const out: Array<TemptingRefuted & { real: number }> = [];
  // A temptation is a move someone at the rating would really play (`real`).
  const considered = args.considered ?? null;
  for (const { c, read, real, mateWalk } of readCandidates(args.fenBefore, played, args.reads, args.rating, considered)) {
    const weighed = considered?.get(c.uci) ?? null;
    const plan = weighed?.why === 'plan' ? weighed : null;
    // A move that walks into mate is weighed by the eye alone: the full model
    // prices the mate in, so its share collapses whatever the eye's pull (Kh3
    // at 2% of the eye, 0.04% once the mate is counted) — the blunder a
    // checkmate check exists to catch.
    // A FORCED MATE IS ALWAYS SAID (Danya's tries, 2026-11-19): a candidate
    // the eye weighs at all whose line mates the mover is ruled out however
    // rarely it would be played — the full model prices the mate in, which is
    // the very reason a player must hear it.
    if (real < TEMPTING_P_FLOOR && !mateWalk && !weighed && !matesMover(read, played.color)) continue;
    const t = refuteCandidate(args.fenBefore, c, read, playedRead, args.student, args.priorMove, plan ? planAim(plan, played.color === args.student) : null);
    if (!t) continue;
    // A PIECE SIMPLY GIVEN AWAY IS NOT A TEMPTATION: their first reply takes
    // the piece that moved, a rook's worth or more for nothing much (…Qxf2+
    // Kxf2). The eye likes the capture with check; no player weighs it. A
    // knight taken for a pawn (…Nxe4 dxe4) is the classic one, and stays.
    // Whatever the line goes on to play, the first reply taking the piece is
    // the giveaway: Qxe6+ Nxe6 is the queen given for a pawn even when the
    // line runs on a move ("…and you answer Kh2"; Capablanca, Danya's article).
    // A rook's worth (net four or more: a rook for a pawn) is the bar — the
    // article board, Korchnoi–Salov: "Rxg5+ was tempting for them … you play
    // fxg5" was a rook handed over with check.
    // A mate is never a giveaway: the piece taken is a step of the mate.
    if (!t.reason.mate && t.reason.plies[0]?.uci.slice(2, 4) === c.to && t.reason.netForWinner >= 4) continue;
    out.push({ ...t, real });
  }
  // THE MOST TEMPTING IS THE ONE A PLAYER WOULD MOST OFTEN PLAY — the eye's
  // pull and the cost together (`real`): …b6 dropping the rook is played
  // more than …Qxd4+ dropping the queen, though a queen capture with check
  // catches the eye more (his 17…Rb8, played because …b6 loses the rook).
  // A temptation that walks into mate is the one to warn about first, however
  // often the others are played (his 3…g6: "…Nf6 does not stop the mate",
  // over …d5 dropping a pawn — both refuted once later trades stopped reading
  // as material given back, 2026-11-13).
  return out.sort((x, y) => Number(y.reason.mate) - Number(x.reason.mate) || y.real - x.real).map(({ real: _real, ...t }) => t);
}

/** WHY ONE CANDIDATE FAILS, against the move it is measured with (`against`:
 *  the move played, or the engine's best) — the one reason walker and the one
 *  wording every tempting-move surface says. Null when it costs under a pawn
 *  against it, when its line proves no material or mate (`costReason`), or
 *  when the line may not be named (`lineTrust`). */
function refuteCandidate(fenBefore: string, c: Pick<CandidateMove, 'uci' | 'san' | 'from' | 'to' | 'eye'>, read: WeighRead, against: WeighRead, student: Color, priorMove: { fenBefore: string; san: string } | null, planTarget: string | null = null): TemptingRefuted | null {
  const mover: Color = fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  const w = seatWords(mover, student);
  const cost = seatCp(against, mover) - seatCp(read, mover);
  if (cost < TEMPTING_COST_CP) return null;
  const seconds = read.earlier && read.earlier[0] === c.uci ? [read.earlier.slice(1)] : [];
  const r = costReason({
    fenBefore, playedSan: c.san, mover, student, costCp: cost,
    // A mate the engine found against the mover is exact once the board plays
    // it out to checkmate (`lineTrust` `scoredMate`).
    after: { uci: read.moves.slice(1), source: 'deep', seconds, scoredMate: matesMover(read, mover) }, before: null, priorMove,
    // Measured against the other move's line: a loss its own line shares is no reason.
    against: against.moves,
  });
  if (!r || r.kind !== 'allowed' || !r.trust.name) return null;
  const sans = reasonSans(r);
  // What it wins beyond what the line, as said, already names: a line that
  // ends "they play a1, making a queen" has said its gain.
  const won = r.mate ? null : reasonWinWords(r, lineShapePlies(sans, r.fen, 'first'));
  const result = r.mate ? (markSaysMate(sans[sans.length - 1]) ? '' : ' — and it\'s mate') : won ? ` — ${w.otherWho} win ${won}` : '';
  // WHAT IT LOOKS LIKE (David 2026-11-17, Danya: "Bg5 looks like a pin, but
  // it drops the knight on d4"): the motif the try sets up on the board,
  // said in the lead — the reason someone would play it.
  const look = tryLooksLike(fenBefore, c.san, mover);
  const stem = stemKeyOf(`${fenBefore}|${c.uci}`);
  const lead = planTarget
    ? (mover === student
      ? rotateStem([`${c.san}, going straight at ${planTarget}, fails`, `${c.san} to hit ${planTarget} directly doesn't work`], stem)
      : rotateStem([`${c.san}, going straight at ${planTarget}, failed for them`, `${c.san} to hit ${planTarget} directly didn't work for them`], stem))
    : look
    ? (mover === student
      ? rotateStem([`${c.san} looks like ${look}, but it fails`, `${c.san} sets up ${look}, but it doesn't work`], stem)
      : rotateStem([`${c.san} looked like ${look} for them, but it fails`, `${c.san} would have set up ${look} for them, but it doesn't work`], stem))
    : mover === student
      // Three phrasings a seat (the human voice: a game never repeats a
      // formula more than twice; two stems put three tempting moves on one
      // wording a quarter of the time — the prod Review audit 2026-11-18).
      ? rotateStem([`${c.san} is tempting here, but it fails`, `${c.san} looks natural, but it doesn't work`, `${c.san} is the obvious try, but it doesn't hold up`], stem)
      : rotateStem([`${c.san} was tempting for them, but it fails`, `${c.san} looked natural for them, but it doesn't work`, `${c.san} was the obvious try for them, but it doesn't hold up`], stem);
  const because = `${lineShape(sans, w.otherLine, r.fen, 'first')}${result}`;
  const sq = blowSquare(sans);
  const key = temptingKey(c.uci);
  return {
    san: c.san, uci: c.uci, eye: c.eye, costCp: Math.round(cost), reason: r, text: `${lead}: ${because}.`, because,
    squares: [...new Set([c.from, c.to, ...(sq ? [sq] : [])])],
    proof: lineProof({ fen: fenBefore, sans: [c.san, ...r.plies.map((p) => p.san)] }, w.moverLine),
    key, claims: [key, ...(sq ? [r.mate ? `rule-out:mate:${sq}` : `rule-out:${sq}`] : [])],
  };
}

/**
 * WHY THIS ONE MOVE FAILS, for a surface that has already chosen the move it
 * warns about (Learn's register: "You'd love to play Qxd5 …"): the same
 * reason and wording as (A), measured against the engine's best of `reads`.
 * Null when the line does not prove it — then the surface says nothing about
 * that move failing.
 */
export function refutationOf(args: { fen: string; uci: string; student: Color; reads: readonly WeighRead[]; priorMove: { fenBefore: string; san: string } | null }): TemptingRefuted | null {
  const best = bestOfReads(args.fen, args.reads);
  const read = readOf(args.reads, args.uci);
  const m = moveOn(args.fen, args.uci);
  if (!best || !read || !m || best.read === read) return null;
  return refuteCandidate(args.fen, { uci: args.uci, san: m.san, from: m.from, to: m.to, eye: 0 }, read, best.read, args.student, args.priorMove);
}

/** The engine's best move among `reads` for the side to move on `fen` — the
 *  read that scores highest from the mover's seat — or null. */
export function bestOfReads(fen: string, reads: readonly WeighRead[]): { read: WeighRead; san: string } | null {
  const b = boardOf(fen);
  if (!b) return null;
  const mover = b.turn();
  let best: { read: WeighRead; san: string; cp: number } | null = null;
  // ONE MOVE PER BOARD: where the board's own search read moves, its best is
  // the move — a try's separate read never outranks the search it came from.
  const pool = reads.some((r) => r.root) ? reads.filter((r) => r.root) : reads;
  for (const r of pool) {
    const m = r.moves[0] ? moveOn(fen, r.moves[0]) : null;
    if (!m) continue;
    const cp = seatCp(r, mover);
    if (!best || cp > best.cp) best = { read: r, san: m.san, cp };
  }
  return best ? { read: best.read, san: best.san } : null;
}

/**
 * (A′) THE TEMPTING MOVE ON THE BOARD, BEFORE ANYTHING IS PLAYED — the board
 * read's half of (A): his "Ng5+ is tempting, but after …Kg7 and …Rg3 Black
 * parries" and "the greedy Rxc7 Nxc7 Bxc6?? loses to …Qc3" are said about the
 * board in front of the player, where no move has been played yet. The
 * candidates the eye weighs for the side to move, each measured against the
 * engine's BEST move (the best of the reads), refuted by its own line — the
 * one reason walker and the one wording of (A) (`temptingRefutations`), so a
 * temptation said before the move and the same one said after it are one
 * claim (`temptingKey`). Most tempting first; empty when nothing fails.
 */
export function temptingOnBoard(args: {
  fen: string;
  student: Color;
  rating: number;
  /** One read per candidate from `fen` (the best move among them): the fan a
   *  surface read, or a MultiPV whose every line reads its first move. */
  reads: readonly WeighRead[];
  /** The move that led to `fen`, so a recapture is half a trade. */
  priorMove: { fenBefore: string; san: string } | null;
  /** Tries weighed for the plan (`ConsideredTries`), past the human floor. */
  considered?: ConsideredTries;
}): TemptingRefuted[] {
  const best = bestOfReads(args.fen, args.reads);
  if (!best) return [];
  return temptingRefutations({ fenBefore: args.fen, san: best.san, student: args.student, rating: args.rating, reads: args.reads, priorMove: args.priorMove, considered: args.considered });
}

// ── (A″) THE TRY THAT COSTS THE RESULT ──────────────────────────────────────

/** A try ruled out by what it does to the result (`standingRefutations`). */
export interface StandingRefuted {
  san: string;
  uci: string;
  /** What it costs against the engine's best (cp, the mover's side). */
  costCp: number;
  /** The reply that meets it (SAN, "…" on a Black move). */
  reply: string;
  text: string;
  squares: string[];
  /** The tempting move's own claim: one rule-out a move, whichever shape said it. */
  key: string;
  claims: string[];
}

/** The standing as a signed step from the mover's seat: 0 level, ±1 slightly,
 *  ±2 clearly, ±3 winning/losing (`evalBand`, the one scale). */
function bandStep(cp: number): number {
  const steps: Record<ReturnType<typeof evalBand>, number> = { level: 0, slightly: 1, clearly: 2, decisive: 3 };
  return Math.sign(cp) * steps[evalBand(cp)];
}

const BAND_WORDS: Readonly<Record<number, string>> = {
  [-3]: 'losing', [-2]: 'clearly worse', [-1]: 'slightly worse', 0: 'level', 1: 'slightly better', 2: 'clearly better', 3: 'winning',
};

/** What the try does to the result, from the mover's seat (his "throws the
 *  win", "keeps only a slight edge", "the edge is gone"): one sentence, or
 *  null when the band does not drop. `subject` is what the sentence calls the
 *  try: "It" right after the line that names it, the move itself once another
 *  sentence (naming another move) stands between — REQUIRED, so no caller
 *  leaves "it" pointing at the wrong move. */
export function resultShift(bestCp: number, tryCp: number, mine: boolean, subject: string): string | null {
  const from = bandStep(bestCp);
  const to = bandStep(tryCp);
  // THE RESULT CHANGES, not the size of an edge: a win, an edge, level, or
  // worse (his "throws the win", "the edge is gone", "it leaves you worse").
  // A clear edge that stays an edge is the same result.
  const result = (b: number): number => (b >= 3 ? 2 : b > 0 ? 1 : b === 0 ? 0 : -1);
  if (result(to) >= result(from)) return null;
  const you = mine ? "you're" : "they're";
  const own = mine ? 'your' : 'their';
  const after = subject === 'It' ? 'it' : subject;
  if (from === 3) return to === 0 ? `${subject} throws the win: the game is level after it.` : to > 0 ? `${subject} lets the win slip: ${you} only ${BAND_WORDS[to]} after it.` : `${subject} throws the win: ${you} ${BAND_WORDS[to]} after it.`;
  if (from > 0 && to === 0) return `After ${after} ${own} edge is gone.`;
  return `${subject} leaves ${mine ? 'you' : 'them'} ${BAND_WORDS[to]}.`;
}

/** WHAT A TRY THAT KEEPS THE RESULT STILL COSTS (his "Rc7 achieves nothing",
 *  "keeps only a slight edge"): it gives back part of the edge, or leaves the
 *  side a little worse than the better move would. Said only where the result
 *  holds (`resultShift` is null) and the try costs half a pawn at least. */
export function smallerShift(bestCp: number, mine: boolean, nothingSaid: boolean, costCp: number, subject: string): string {
  const from = bandStep(bestCp);
  const own = mine ? 'your' : 'their';
  const them = mine ? 'you' : 'them';
  // A pawn or more, inside one band (a won game stays won, a lost one lost):
  // a real cost, never "achieves nothing".
  if (costCp >= SHIFT_COST_CP) {
    if (from > 0) return `${subject} gives back a big part of ${own} edge.`;
    if (from === 0) return `${subject} leaves ${them} clearly worse than the better move would.`;
    return `${subject} makes ${own} position a lot harder.`;
  }
  const lead = nothingSaid ? subject : `${subject} achieves nothing, and`;
  if (from > 0) return `${lead} gives back part of ${own} edge.`;
  if (from === 0) return `${lead} leaves ${them} a little worse than the better move would.`;
  return `${lead} makes ${own} position harder still.`;
}

/** WHY THE TRY FALLS SHORT on the board, from the computers that already read
 *  it (his "…d5 blocks Black's own bishop", "achieves nothing"): the bishop
 *  the move shuts in (`blocksOwn`), the pawn that kicks the piece where it
 *  went (`pawnKick`), the check or capture whose line wins nothing (the
 *  ledger), or what the board after it gives up against the best move
 *  (`positionalReason.boardReason`). Null when none reads it. */
function tryMechanism(fen: string, m: Move, sans: readonly string[], bestSan: string, own: 'your' | 'their', other: 'your' | 'their'): string | null {
  const blk = blocksOwn(fen, m);
  if (blk) {
    let after: Chess;
    try { after = new Chess(fen); after.move(m.san); } catch { return null; }
    const ref = pieceRef(after.fen(), blk.by, m.color);
    return `It shuts in ${ref ? ref.words : `${own} ${NAME[blk.piece]} on ${blk.by}`}.`;
  }
  if (m.piece !== 'p' && m.piece !== 'k') {
    try {
      const after = new Chess(fen); after.move(m.san);
      const kick = pawnKick(after.fen(), m.to, m.color);
      if (kick && sans[1] === kick) return `${cap(other)} ${kick[0]}-pawn kicks ${own} ${NAME[m.piece]} straight back.`;
    } catch { /* no kick read */ }
  }
  if (/x|\+/.test(m.san) && sans.length >= 2) {
    let k = 0;
    for (let j = 0; j < sans.length; j += 1) if (/x/.test(sans[j])) k = j + 1;
    k = Math.max(k, 2);
    if (settledNetForLine(fen, sans.slice(0, k), m.color) === 0 && settledNetForLine(fen, sans, m.color) === 0) return 'It wins nothing: the trades leave the material level.';
  }
  // WHAT THE REPLY DOES (his "…Qf6! hits e6 and a1", "Nd5+ comes with
  // check"): a motif it sets up with the piece it moved, or the tempo of a
  // check — read on the board after it. A piece it takes is no reason here:
  // the line keeps the material level, so a capture is half a trade.
  let tryBoard: Chess;
  try { tryBoard = new Chess(fen); tryBoard.move(m.san); } catch { return null; }
  const replier: Color = m.color === 'w' ? 'b' : 'w';
  let rm: Move;
  try { rm = tryBoard.move(sans[1]); } catch { return null; }
  const replyWords = `${replier === 'b' ? '…' : ''}${rm.san}`;
  const named = (sq: string, viewer: Color): string => pieceRef(tryBoard.fen(), sq, viewer)?.words ?? sq;
  try {
    for (const t of detectTactics(tryBoard.fen()).tactics) {
      const word = LOOKS[t.type];
      if (!word || t.beneficiary !== replier || t.involvedSquares[0] !== rm.to) continue;
      const targets = t.involvedSquares.slice(1).map((sq) => named(sq, m.color));
      if (targets.length === 0) continue;
      return `${replyWords} is ${word}: it hits ${andList(targets)}.`;
    }
  } catch { /* no motif read */ }
  if (/\+$/.test(rm.san)) return `${replyWords} comes with check, so ${other === 'your' ? 'you gain' : 'they gain'} a tempo.`;
  const why = boardReason(fen, m.san, bestSan, phaseOfFen(fen) ?? 'middlegame');
  if (!why) return null;
  // A board reason about a piece the line takes is false (Kf1?? …Bxc5: "your
  // bishop on c5 reaches fewer squares" — it is gone): the squares the line
  // captures on are not described.
  const taken = new Set<string>();
  try {
    const walk = new Chess(fen);
    for (const san of sans) { const mv = walk.move(san); if (mv.captured) taken.add(mv.to); }
  } catch { /* read the squares taken so far */ }
  if ((why.note.match(/\b[a-h][1-8]\b/g) ?? []).some((q) => taken.has(q))) return null;
  return why.note;
}

const cap = openSentence;

/**
 * (A″) THE TRY THAT COSTS THE RESULT — Danya's choices, as he reads them: of
 * his 76 weighed moves, 3 are refuted by material or mate; the rest by what
 * they do to the RESULT ("27.Rc7 achieves nothing because …Rf7 meets it",
 * "48…Ke7?? throws the win", "Rb3 keeps only a slight edge", "31.Nxe7+ Rxe7
 * gives no relief") and the mechanism behind it ("…d5 blocks Black's own
 * bishop"). A candidate the eye weighs for what it is or what it does,
 * measured against the engine's best: its standing band drops (`resultShift`,
 * checked on the engine's own scores, half a pawn at least); the reply that
 * meets it is named (the engine's first move after it — one move deep, the
 * named-line rule's near case); the mechanism is said when a computer reads
 * one (`tryMechanism`). A try whose loss or mate the material refuter names
 * (`temptingOnBoard`) is left to it; one it stays silent on is said here, with
 * its material and its result. Most tempting first.
 */
export function standingRefutations(args: {
  fen: string;
  student: Color;
  rating: number;
  /** One read per candidate from `fen`, the engine's best among them. */
  reads: readonly WeighRead[];
  /** Tries weighed for the plan (`ConsideredTries`), past the human floor. */
  considered?: ConsideredTries;
  /** Told why a candidate was not said (the tries bench reads it). A try
   *  dropped for `no-reason` carries the two lines the difference reader
   *  compares, so a caller with an engine can read the futures deeper. */
  onDrop?: (uci: string, gate: StandingGate, futures?: ChangeReasonArgs) => void;
  /** The difference reader's reasons, read with the engine-backed computers
   *  on the futures (`futures.changeReasonWithEngine`), by try: the reason a
   *  pure read could not find. */
  engineReasons?: ReadonlyMap<string, string>;
}): StandingRefuted[] {
  const best = bestOfReads(args.fen, args.reads);
  if (!best || best.read.mate !== null) return [];
  const played = moveOn(args.fen, best.san);
  if (!played) return [];
  const mover = played.color;
  const mine = mover === args.student;
  const w = seatWords(mover, args.student);
  const bestCp = seatCp(best.read, mover);
  const out: Array<StandingRefuted & { real: number }> = [];
  const considered = args.considered ?? null;
  for (const { c, read, real } of readCandidates(args.fen, played, args.reads, args.rating, considered)) {
    const weighed = considered?.get(c.uci) ?? null;
    const plan = weighed?.why === 'plan' ? weighed : null;
    const drop = (g: StandingGate): void => { args.onDrop?.(c.uci, g); };
    // A try that walks into mate is the material refuter's when it says the
    // mate (past the tempting floor too: a forced mate is always said); when
    // it stays silent the line's own story says it here.
    if (read.mate !== null && refuteCandidate(args.fen, c, read, best.read, args.student, null, plan ? planAim(plan, mine) : null)) { drop('mate-line'); continue; }
    if (real < TEMPTING_P_FLOOR && !weighed) { drop('not-tempting'); continue; }
    const tryCp = seatCp(read, mover);
    const cost = bestCp - tryCp;
    // The plan's direct try is weighed against the plan, not the eye: it
    // "leads nowhere" well before it costs a pawn (his Qc5 at −0.85, "leads
    // nowhere after …Qd7!") — the result still has to change.
    if (cost < (plan ? PLAN_TRY_COST_CP : ACHIEVES_NOTHING_CP)) { drop('small-cost'); continue; }
    // THE RESULT HOLDS, BUT THE TRY ACHIEVES NOTHING (his ?! moves: of 240
    // refuted tries, ~37 cost half a pawn to a pawn and keep the band): said
    // as giving back part of the edge, with its reason like any other. The
    // plan's lower bar needs the result to change; at half a pawn the plan's
    // try is weighed like any other (his "c4? bxc4", a plan try at −0.6 that
    // kept the band was dropped while the same move from the eye was said).
    // The result sentence names the try by its move once another sentence
    // stands between it and the lead (the reply's job, the reason): "It"
    // there points at whatever that sentence named last ("Their d4 is aimed
    // at your pawn. It achieves nothing" read as d4). Decided below, once the
    // middle sentences are known; the band is read here.
    const shiftOf = (subject: string): string | null => (plan || cost >= SHIFT_COST_CP ? resultShift(bestCp, tryCp, mine, subject) : null);
    const bandShift = shiftOf('It');
    if (!bandShift && cost < ACHIEVES_NOTHING_CP) { drop('same-result'); continue; }
    const m = moveOn(args.fen, c.uci);
    if (!m || read.moves.length < 2) continue;
    const sans: string[] = [];
    try {
      const b = new Chess(args.fen);
      // THE COUNT ENDS WHERE THE TRADES END, not mid-trade: a line cut on a
      // capture with the line going on counts the next move too (Nd3 …Ba4 …
      // Bxc6 Rxc3 is a knight for a pawn, not three pawns — the recapture
      // was the seventh move).
      for (let i = 0; i < read.moves.length; i += 1) {
        if (i >= GAIN_HOLDS_PLIES && !/x/.test(sans[sans.length - 1] ?? '')) break;
        const u = read.moves[i];
        sans.push(b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
      }
    } catch { /* count the moves that played */ }
    if (sans.length < 2) continue;
    const net = settledNetForLine(args.fen, sans, mover);
    // HAND OFF ONLY TO A REFUTER THAT SPEAKS: a try whose line loses material
    // is the material refuter's when it names the loss; when it stays silent
    // (a pawn lost on a three-pawn cost, an unconfirmed line), the loss is
    // said here, with the result.
    if (net !== null && net < 0 && refuteCandidate(args.fen, c, read, best.read, args.student, null, plan ? planAim(plan, mine) : null)) { drop('loses-material'); continue; }
    // WHAT THEY WIN, in pieces ("a knight for a pawn"), by the one ledger
    // namer — never a point total.
    const lostWords = net !== null && net < 0
      ? ((): string | null => { const l = computeExchangeLedger(args.fen, sans, mover === 'w' ? 'b' : 'w'); return l ? materialGainWords(l) : null; })()
      : null;
    const lost = lostWords ? `${cap(w.otherWho)} win ${lostWords} in the line.` : null;
    const reply = `${mover === 'w' ? '…' : ''}${sans[1]}`;
    // NO REASON, NO REFUTATION: his every rule-out says why it falls short.
    // The plan's try has its own reason: what became of the target.
    // WHAT THE LINE DOES (his "with a perpetual check", "and White promotes"),
    // then the reply's mechanism, then what changed on the board after it.
    const futureArgs: ChangeReasonArgs = { fen: args.fen, student: args.student, rating: args.rating, other: w.other,
      tryLine: { moves: read.moves, cp: read.mate === null ? read.evaluation : null, mate: read.mate },
      bestLine: { moves: best.read.moves, cp: best.read.mate === null ? best.read.evaluation : null, mate: best.read.mate } };
    const story = lineStory(args.fen, read.moves, w.other, read.mate === null ? read.evaluation : null);
    const mech = story?.text
      ?? lost
      ?? tryMechanism(args.fen, m, sans, best.san, w.own, w.other)
      ?? (plan ? targetOutcome(args.fen, sans, plan.target, mover, w.other) : null)
      ?? changeReason(futureArgs)
      ?? args.engineReasons?.get(c.uci)
      ?? null;
    if (!mech) { args.onDrop?.(c.uci, 'no-reason', futureArgs); continue; }
    // WHAT THE REPLY DOES (his "…Qd7 guards b5", "…h4 kicks the knight"):
    // the reply's job, said right after the lead names it — unless the reason
    // already says what the reply does (one idea said once). It explains a
    // refutation the board already gives a reason for; it never makes one.
    const job = replyJob(args.fen, read.moves, plan?.target ?? null, args.student);
    // A recapture is the trade, not a reason: the ledger already says what it nets.
    const jobSaid = !!job && job.kind !== 'recaptures' && !mech.includes(sans[1]) && !(job.kind === 'kicks' && /kicks/.test(mech));
    // "…Kd5 holds the pawn on c6" and "the pawn on c6 still stands" are one idea.
    const kept = jobSaid && job?.kind === 'guards' && /still stands/.test(mech) ? null : mech;
    // A reason that calls the try "It" (`tryMechanism`'s own lead) says so
    // right after the lead; with the reply's job between them, "It" would
    // point at the reply — the try is named instead.
    const reason = kept && jobSaid ? kept.replace(/^It\b/, c.san) : kept;
    // A line that mates ends the game: no band words for that.
    const subject = jobSaid || reason ? c.san : 'It';
    const shift = story?.kind === 'mates' ? (mine ? `${subject} loses the game.` : `${subject} loses them the game.`) : shiftOf(subject) ?? smallerShift(bestCp, mine, !!reason && /wins nothing/.test(reason), cost, subject);
    const stem = stemKeyOf(`${args.fen}|result|${c.uci}`);
    const lead = plan
      ? (plan.storm
        ? (mine
          ? rotateStem([`${c.san} storms their king, but ${reply} meets it.`, `${c.san}, throwing a pawn at their king, runs into ${reply}.`], stem)
          : rotateStem([`${c.san} stormed your king for them, but ${reply} meets it.`, `${c.san}, throwing a pawn at your king, ran into ${reply} for them.`], stem))
        : mine
        ? rotateStem([`${c.san} goes straight at ${planAim(plan, true)}, but ${reply} meets it.`, `${c.san} to hit ${planAim(plan, true)} directly runs into ${reply}.`], stem)
        : rotateStem([`${c.san} went straight at ${planAim(plan, false)} for them, but ${reply} meets it.`, `${c.san} to hit ${planAim(plan, false)} directly ran into ${reply} for them.`], stem))
      : mine
      ? rotateStem([`${c.san} looks natural, but ${reply} meets it.`, `${c.san} is the obvious try, but ${reply} is the answer.`, `${c.san} is tempting, but ${reply} takes the sting out of it.`], stem)
      : rotateStem([`${c.san} looked natural for them, but ${reply} meets it.`, `${c.san} was the obvious try for them, but ${reply} is the answer.`, `${c.san} was tempting for them, but ${reply} takes the sting out of it.`], stem);
    const text = [lead, jobSaid ? job?.follow : null, reason, shift].filter(Boolean).join(' ');
    const key = temptingKey(c.uci);
    out.push({ san: c.san, uci: c.uci, costCp: Math.round(cost), reply, text, squares: [...new Set([c.from, c.to, read.moves[1].slice(2, 4), ...(jobSaid && job ? job.squares : [])])], key, claims: [key], real });
  }
  return out.sort((x, y) => y.real - x.real).map(({ real: _real, ...t }) => t);
}

/** What the difference reader compares for a try: its line against the best. */
export type ChangeReasonArgs = Parameters<typeof changeReason>[0];

/** Why the result refuter left a candidate unsaid. */
export type StandingGate = 'not-tempting' | 'mate-line' | 'small-cost' | 'same-result' | 'loses-material' | 'no-reason';

/** A pawn, the tempting move's own bar: a smaller drop is the band's edge, not a cost. */
export const SHIFT_COST_CP = TEMPTING_COST_CP;
/** A try that keeps the result but achieves nothing: half a pawn given back. */
export const ACHIEVES_NOTHING_CP = 50;
/** The plan's direct try: under a pawn, as long as the result changes. */
export const PLAN_TRY_COST_CP = 40;

/** WHAT BECAME OF THE TARGET down the try's line: taken by the mover ("it wins
 *  the pawn on b5, and that is all it does"), or still standing ("the pawn on
 *  e6 still stands"). Read off the line's own moves. */
function targetOutcome(fen: string, sans: readonly string[], target: string, mover: Color, other: 'your' | 'their'): string | null {
  if (!/^[a-h][1-8]$/.test(target)) return null;
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const piece = b.get(target as Square);
  if (!piece || piece.type !== 'p' || piece.color === mover) return null;
  let taken = false;
  try {
    for (const s of sans) {
      const m = b.move(s);
      // The target walks away (his "b4? cxb4": the c5 pawn takes on b4) —
      // it does not "still stand", and whatever lands on its square later is
      // another piece.
      if (m.color !== mover && m.from === target) return `${cap(other)} pawn on ${target} ${m.captured ? 'takes on' : 'steps to'} ${m.to} instead.`;
      if (m.color === mover && m.to === target && m.captured) { taken = true; break; }
    }
  } catch { return null; }
  return taken
    ? `It wins ${other} pawn on ${target}, and that is all it does.`
    : `${cap(other)} pawn on ${target} still stands.`;
}

// ── (L) TWO GOOD MOVES, AND WHAT SEPARATES THEM ─────────────────────────────

/** The one board-true difference between two moves from the same board. */
export interface MoveDifference {
  kind: 'loose' | 'activity' | 'structure' | 'file';
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

/** The board at the end of `follow` (UCI) played from `fen`, or null when the
 *  line does not play. */
function boardAfterLine(fen: string, follow: readonly string[]): string | null {
  const b = boardOf(fen);
  if (!b) return null;
  try { for (const u of follow) b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
  return b.fen();
}

/** THE FAULTS A MOVE LEAVES ITS MOVER, READ WHEN ITS EXCHANGE IS OVER (task
 *  172, the single most frequent false fact on the fact sheets: "exd4 leaves
 *  you doubled pawns on d6" with Nxd4 next, on six Philidor moves; "dxc5
 *  leaves you doubled pawns on c5" on five London moves). New against the
 *  board before the move, on the board `exchangeEnd` settles on — and, when
 *  the surface read the move's line (`follow`), still standing at the end of
 *  it: …dxc4 doubles no c-pawns in a line that plays Bxc4 three moves on. */
function newFaultsAfter(fenBefore: string, m: Move, follow: readonly string[] | null): Array<{ kind: string; square: string }> {
  const end = exchangeEnd(fenBefore, m.san);
  if (!end || !end.standing) return [];
  const before = describeStructure(fenBefore)?.pawns;
  const after = describeStructure(end.fen)?.pawns;
  if (!before || !after) return [];
  const lineEnd = follow && follow.length > 0 ? boardAfterLine(m.after, follow) : null;
  const atLineEnd = lineEnd ? describeStructure(lineEnd)?.pawns ?? null : null;
  const pawnsOn = (file: string): string[] => {
    const b = boardOf(end.fen);
    const out: string[] = [];
    if (b) for (const row of b.board()) for (const c of row) if (c && c.type === 'p' && c.color === m.color && c.square[0] === file) out.push(c.square);
    return out;
  };
  const out: Array<{ kind: string; square: string }> = [];
  // The one read of a weakness a move made (`boardStructure.newPawnWeaknesses`).
  for (const w of newPawnWeaknesses(before, after, m.color)) {
    if (follow && follow.length > 0) {
      const still = !!atLineEnd && (w.kind === 'doubled' ? atLineEnd.doubledFiles[m.color].includes(w.file) : atLineEnd.isolatedPawns[m.color].some((sq) => sq[0] === w.file));
      if (!still) continue;
    }
    // Named by the pawn the move put there, else the file's first pawn.
    const sqs = pawnsOn(w.file);
    out.push({ kind: w.kind, square: sqs.includes(m.to) ? m.to : sqs[0] ?? m.to });
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
/** A pawn capture that leaves its own file with no pawn of the mover's on it,
 *  with a rook of the mover's standing on that file. */
function opensRookFile(fenBefore: string, m: Move): { file: string; rook: string } | null {
  if (m.piece !== 'p' || !m.captured || m.from[0] === m.to[0]) return null;
  const file = m.from[0];
  let after: Chess;
  try { after = new Chess(fenBefore); after.move(m.san); } catch { return null; }
  let rook: string | null = null;
  for (let r = 1; r <= 8; r++) {
    const p = after.get(`${file}${r}` as Square);
    if (p?.color === m.color && p.type === 'p') return null;
    if (p?.color === m.color && p.type === 'r' && !rook) rook = `${file}${r}`;
  }
  return rook ? { file, rook } : null;
}

export function moveDifference(
  fenBefore: string, sanA: string, sanB: string, own: 'your' | 'their',
  /** REQUIRED: the line the surface read after each move (UCI, the reply
   *  first), or null where it read none — a fault the move's own line undoes
   *  is not said. */
  follow: { a: readonly string[] | null; b: readonly string[] | null },
): (MoveDifference & { favours: string; other: string }) | null {
  const a = moveOn(fenBefore, sanA);
  const bm = moveOn(fenBefore, sanB);
  if (!a || !bm) return null;
  const side = a.color;
  const cmp = contrastMoves(fenBefore, a.san, bm.san);
  // The moved piece itself standing unguarded is where it went, not what the
  // other move keeps guarded ("Nh5 keeps your knight on d5 guarded"); and a
  // piece left loose matters only when something already hits it (a b2 pawn
  // or a rook on a8 with no guard is half the boards of a game).
  // …nor the square a move leaves: after a4 the pawn is not on a5 to be kept
  // guarded (Review prod audit 2026-11-12, Giri–Carlsen 25…a4: "a4 keeps your
  // pawn on a5 guarded, and Bxe4 leaves it loose").
  if (cmp && !([a.to, bm.to, a.from, bm.from] as string[]).includes(cmp.square) && hitAfter(fenBefore, cmp.drops, cmp.square)) {
    return { kind: 'loose', favours: cmp.keeps, other: cmp.drops, squares: [cmp.square],
      text: `${cmp.keeps} keeps ${own} ${NAME[cmp.piece] ?? 'piece'} on ${cmp.square} guarded, and ${cmp.drops} leaves it loose`,
      // The held forms name the piece, never the other move (David
      // 2026-11-07: "I want specificity when we teach. Not a general
      // statement" — "the other leaves one loose" named nothing).
      held: `${own === 'your' ? 'yours' : 'theirs'} keeps ${own} ${NAME[cmp.piece] ?? 'piece'} on ${cmp.square} guarded, and the other leaves it loose`,
      heldOther: `the other keeps ${own} ${NAME[cmp.piece] ?? 'piece'} on ${cmp.square} guarded, and ${own === 'your' ? 'yours' : 'theirs'} leaves it loose` };
  }
  // A PAWN CAPTURE THAT OPENS A FILE FOR THE MOVER'S OWN ROOK (Danya aEKS
  // 14…fxe4: "it opens the f-file for the rook"; …dxe4 keeps it shut): the
  // board's reason one recapture is the better of two that both hold.
  const opA = opensRookFile(fenBefore, a);
  const opB = opensRookFile(fenBefore, bm);
  if (opA && !opB) {
    const rook = `${own} rook on ${opA.rook}`;
    return { kind: 'file', favours: a.san, other: bm.san, squares: [opA.rook, `${opA.file}${a.color === 'w' ? 8 : 1}`],
      text: `${a.san} opens the ${opA.file}-file for ${rook}, and ${bm.san} keeps it shut`,
      held: `${own === 'your' ? 'yours' : 'theirs'} opens the ${opA.file}-file for ${rook}`,
      heldOther: `the other opens the ${opA.file}-file for ${rook}` };
  }
  if (opB && !opA) {
    const rook = `${own} rook on ${opB.rook}`;
    return { kind: 'file', favours: bm.san, other: a.san, squares: [opB.rook, `${opB.file}${bm.color === 'w' ? 8 : 1}`],
      text: `${bm.san} opens the ${opB.file}-file for ${rook}, and ${a.san} keeps it shut`,
      held: `${own === 'your' ? 'yours' : 'theirs'} opens the ${opB.file}-file for ${rook}`,
      heldOther: `the other opens the ${opB.file}-file for ${rook}` };
  }
  // Developing or castling first is the fundamentals' lesson (said by their
  // own computers on the move itself); between two moves of one worth it
  // separates nothing worth a sentence — on an opening board it would be said
  // on every move ("Nf3 brings a new piece into the game, and d4 is a pawn
  // move", decision baseline 2026-11-05).
  const afterA = boardOf(fenBefore); const afterB = boardOf(fenBefore);
  if (!afterA || !afterB) return null;
  try { afterA.move(a.san); afterB.move(bm.san); } catch { return null; }
  const newA = newFaultsAfter(fenBefore, a, follow.a); const newB = newFaultsAfter(fenBefore, bm, follow.b);
  if ((newA.length === 0) !== (newB.length === 0)) {
    const [f, o, faults] = newA.length === 0 ? [a, bm, newB] : [bm, a, newA];
    const { kind, square: sq } = faults[0];
    return { kind: 'structure', favours: f.san, other: o.san, squares: [sq],
      text: `${f.san} keeps ${own} pawns whole, and ${o.san} leaves ${own === 'your' ? 'you' : 'them'} ${kind === 'doubled' ? 'doubled pawns' : 'an isolated pawn'} on ${sq}`,
      held: `${own === 'your' ? 'yours' : 'theirs'} keeps ${own} pawns whole, where the other leaves ${own === 'your' ? 'you' : 'them'} ${kind === 'doubled' ? 'doubled pawns' : 'an isolated pawn'}`,
      heldOther: `the other keeps the pawns whole, and ${own === 'your' ? 'yours leaves you' : 'theirs leaves them'} ${kind === 'doubled' ? 'doubled pawns' : 'an isolated pawn'}` };
  }
  // Activity compares like with like: the same piece on its two squares — a
  // knight, a bishop or a rook (a queen reaches a dozen squares from almost
  // anywhere, and a queen's reach against a knight's says nothing).
  // …and only a piece that STAYS on its square does anything from it: a bishop
  // taken the move after ("Bg3 or Bxd6 — your bishop does more on d6", with
  // …Qxd6 next) reaches nothing (task 172).
  const stays = (m: Move): boolean => !m.captured || exchangeEnd(fenBefore, m.san)?.pieceStays === true;
  if (a.from === bm.from && 'nbr'.includes(a.piece) && stays(a) && stays(bm)) {
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
/** The held same-worth line's openers (the move is never named: Learn holds
 *  the student's move, and the other one is still theirs to find). */
const SAME_WORTH_STEMS: readonly string[] = [
  'Another move was worth the same here',
  'A second move did just as well here',
  'You had another move of the same worth',
];

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
  if (playedEs < BOTH_LOSE) return null;
  const w = seatWords(mover, args.student);
  let bothWin: { c: CandidateMove; gap: number } | null = null;
  for (const { c, read, real } of readCandidates(args.fenBefore, played, args.reads, args.rating)) {
    if (real < ALSO_GOOD_P_FLOOR) continue;
    const ce = es(read);
    if (Math.abs(ce - playedEs) > SAME_WORTH || best - ce > GOOD_MOVE) continue;
    const gapCp = Math.round(Math.abs(seatCp(read, mover) - seatCp(playedRead, mover)));
    const d = moveDifference(args.fenBefore, played.san, c.san, w.own, { a: playedRead.moves.slice(1), b: read.moves.slice(1) });
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
    // ROTATED on the board (prod focus audit 2026-11-09: "Another move was
    // worth the same here —" opened seven lines of one game). Each stem names
    // the other move, so "the other" in the difference has its referent.
    const heldText = mover === args.student
      ? `${rotateStem(SAME_WORTH_STEMS, stemKeyOf(args.fenBefore))} — ${d.favours === played.san ? d.held : d.heldOther}.`
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
  /** What would go wrong there, said after "on <square> it …" — in the
   *  conditional, since the piece went elsewhere (prod Learn 2026-11-11:
   *  "Their knight went to a3. On d6 it blocks their bishop"). */
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
    // The push must not just drop the pawn, counted to the end of the trades
    // (speedrun kYbh2 7.Be2: "on c4 it would be kicked by your d-pawn" —
    // …d5 there loses the pawn, three attackers against two guards; it is
    // the square that stops …d5).
    if (legalSeeGainFor(after.fen(), m.to, side) >= 1) continue;
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
      text: h.square === m.to ? 'would hang' : `would leave ${named(h.square, h.piece)} hanging` });
  }
  const kick = pawnKick(after.fen(), m.to, m.color);
  if (kick) out.push({ square: m.to, kind: 'kicked', squares: [m.to], text: `would be kicked by ${other} ${kick[0]}-pawn` });
  const blk = blocksOwn(fenBefore, m);
  if (blk) {
    out.push({ square: m.to, kind: 'blocks', squares: [blk.by], text: `would block ${named(blk.by, blk.piece)}` });
  }
  if (reason && out.length === 0) {
    const sans = reasonSans(reason);
    // The first move is said; a promotion it makes is not named again.
    const won = reason.mate ? null : reasonWinWords(reason, [0]);
    out.push({ square: m.to, kind: 'refuted', squares: [m.to],
      text: `would run into ${sans[0]}${reason.mate ? (markSaysMate(sans[0]) ? '' : ', and it\'s mate') : won ? ` — ${other === 'your' ? 'you' : 'they'} win ${won}` : ''}` });
  }
  return out;
}

/** Does the board show no fault on the square `move` takes the piece to: it
 *  hangs nothing, no pawn kicks it there, it shuts in none of the mover's own
 *  bishops — `faultsOn` without its words. The flexible move's good
 *  square (`flexibleMove`) reads it, so the two say "good square" the same way. */
export function squareIsSound(fenBefore: string, move: string): boolean {
  const m = moveOn(fenBefore, move);
  if (!m) return false;
  if (hangsAfter(fenBefore, m) || blocksOwn(fenBefore, m)) return false;
  const after = boardOf(fenBefore);
  if (!after) return false;
  try { after.move(m.san); } catch { return false; }
  return !pawnKick(after.fen(), m.to, m.color);
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
export function squareChoice(args: {
  fenBefore: string; san: string; student: Color; rating: number; reads: readonly WeighRead[] | null; priorMove: { fenBefore: string; san: string } | null;
  /** REQUIRED: the engine's better move (UCI) when the surface's own price
   *  of the move played reached an inaccuracy (\`INACCURACY_CP\`); null when
   *  it did not, or the surface has no price. */
  beaten: string | null;
  /** REQUIRED: may the move just played be named? Review and the lessons
   *  yes; Learn asks why that square instead of saying where the piece went
   *  (David 2026-11-09: "the user knows that, they see it play out"). */
  namesStudentMoves: boolean;
}): SquareChoice | null {
  const played = moveOn(args.fenBefore, args.san);
  // A knight's or a bishop's square — his examples all are; a queen or a rook
  // has a dozen squares and "on e5 it is kicked by f6" said of each is noise.
  if (!played || !'nb'.includes(played.piece) || played.captured) return null;
  const mover = played.color;
  const w = seatWords(mover, args.student);
  const playedFaults = new Set(faultsOn(args.fenBefore, played, w.own, w.other, null).map((f) => f.kind));
  const playedRead = args.reads ? readOf(args.reads, uciOf(played)) : null;
  const playedCp = playedRead ? seatCp(playedRead, mover) : null;
  // THE PIECE'S SQUARE WAS ANOTHER ONE (prod Review 2026-11-09, Carlsen–
  // Caruana 22…Nh5: "Better was Ne2+" and then "Why h5 for their knight?").
  // When the engine's better move takes this same piece elsewhere — handed
  // by the surface that priced the move, or in the reads — "why that
  // square?" has no answer but "it was not the square", so it is not asked.
  const otherSquare = (uci: string | null | undefined): boolean => !!uci && uci.slice(0, 2) === played.from && uci !== uciOf(played);
  if (otherSquare(args.beaten)) return null;
  if (args.reads && playedCp !== null && args.reads.some((r) => otherSquare(r.moves[0]) && seatCp(r, mover) - playedCp >= INACCURACY_CP)) return null;
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
    // A SQUARE THE ENGINE READ NO WORSE IS NO FAULT (prod Review 2026-11-09,
    // Carlsen–Caruana 22…Nh5: "Better was Ne2+" and then "Why h5 for their
    // knight? On h3 or e2 it hangs"). The board's one-move faults are what
    // the eye sees; where the surface read the square, the engine says
    // whether the eye was right, and a square it scores at least as well as
    // the one played is never said to fail.
    if (read && playedCp !== null && seatCp(read, mover) >= playedCp) continue;
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
  // The move is never restated: the turn's head already said it (prod Review
  // audit 2026-11-11: "They played knight to f6 — it attacks your e-pawn …
  // Their knight went to f6. On e7 it …" — one move head a turn). ROTATED on
  // the board and the move (prod Review 2026-11-06: "Why that square for …?"
  // said three times in one game).
  const text = (() => {
      const whose = mover === args.student ? 'your' : 'their';
      // Learn never says where the student's piece just went: the stem that
      // names the square is left out there.
      const namesSquare = args.namesStudentMoves || mover !== args.student;
      return rotateStem([
        `Why that square for ${whose} ${piece}? ${openSentence(said)}.`,
        ...(namesSquare ? [`Why ${played.to} for ${whose} ${piece}? ${openSentence(said)}.`] : []),
        // "The other squares" only when more than one square is said.
        ...(new Set(faults.map((f) => f.square)).size > 1 ? [`The other squares for ${whose} ${piece} are worse: ${said}.`] : []),
      ], stemKeyOf(`${args.fenBefore}|${uciOf(played)}`));
    })();
  return { piece: played.piece, to: played.to, faults, text,
    squares: [...new Set([played.to, ...faults.flatMap((f) => [f.square, ...f.squares])])],
    key: `square:${uciOf(played)}` };
}
