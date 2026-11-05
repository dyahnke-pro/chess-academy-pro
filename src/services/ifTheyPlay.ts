// ifTheyPlay — "IF THEY X, I PLAY Y; IF Z, THEN W" (Danya's reply tree, 4.8% of
// his notes: "If Black plays Qe7, you play d4, cementing the knight" · "if
// Black takes on e5 you take back with the knight" · "if Black takes, e5 wins
// the pinned knight; if …g5, take with tempo; …Qc5+ has an interposition").
//
// After a move, the replies the other side is most likely to play AT THIS
// LEVEL — read by the human model (`humanMove`: P(move) over every legal move,
// fitted on real players by rating), because the replies a teacher walks
// through are the tempting ones, not the engine's: of the replies he names in
// "if they …" clauses, 75% are outside the engine's top three — plus the
// engine's best reply when it is not among them. For each, the mover's answer
// from the SAME read (the reply's own line, its second move), said only where
// the line proves it:
//   mate      — the answer forces mate (the one reason walker, `costReason`);
//   wins      — the answer wins material that holds (`costReason`, `lineTrust`);
//   recapture — the reply took and the answer takes back on that square;
//   block     — the reply checked and the answer blocks it;
//   job       — the answer's concrete job on the board (`moveJob`: a guard, a
//               rescue, a pin stopped, a tempo, an attack).
// A branch whose answer is none of these is description, and it is not said.
//
// ONE READ: the reply's score and its line come from one engine read that
// scored every legal reply (`humanReply.scoreEveryMove`, a pooled
// `scoreMoves` over every legal move). No second search here.
//
// Pure: chess.js, the human model, the one reason walker, the one job reader.
import { unmarked } from '../utils/sanMark';
import { Chess, type Color, type Move } from 'chess.js';
import { humanMoveProbabilities } from './humanMove';
import { costReason, reasonWinWords, type CostReason } from './costReason';
import { lineTrust, type LineTrust } from './lineTrust';
import { moveJob, isBareJob, MINE, THEIRS, type BookJobKind } from './bookMoveWhy';
import { tacticWord } from './tacticVocabulary';
import { withArticle } from '../utils/andList';
import type { TacticType } from '../types';

/** One legal reply, scored by the read of the board after the move. */
export interface ReplyRead {
  uci: string;
  /** Its score from the REPLIER's view (the side to move on the board), a mate
   *  folded to ±(2000+) the way the human model reads it (`foldScore`). */
  cp: number;
  /** Mate in N from the replier's view (negative: the replier is mated), or null. */
  mate: number | null;
  /** The read's line, the reply first. */
  pv: readonly string[];
}

/** The replies walked: the most likely at this level, up to this many (plus
 *  the engine's best). Measured on 31 of his branches read by hand: the reply
 *  he named was the human model's first, second or third at 1500 in 14
 *  (the engine's top three held it in 26% of 400 parsed branches). */
export const MAX_LIKELY_REPLIES = 3;
/** …each at least this likely: below it, a reply no one at this level plays. */
export const LIKELY_REPLY_P = 0.05;
/** A reply that gives up this much (cp, replier's view) is a mistake whose
 *  answer is read by the one reason walker: the answer wins or mates. */
const MISTAKE_CP = 100;

/** The jobs worth saying as an answer: concrete on the board. */
const ANSWER_JOBS: ReadonlySet<BookJobKind> = new Set<BookJobKind>(['guard', 'rescue', 'stopsPin', 'stopsPush', 'tempo', 'attack', 'fork', 'prepares', 'capture', 'recapture']);
/** The motifs a branch names beside what it wins (the cost reason's set). */
const SAID_MOTIFS: ReadonlySet<TacticType> = new Set<TacticType>([
  'fork', 'pin', 'skewer', 'discovered_attack', 'discovered_check', 'double_check', 'back_rank', 'deflection',
  'removing_the_guard', 'trapped_piece', 'overloaded_piece', 'x_ray',
]);

export type AnswerKind = 'mate' | 'wins' | 'recapture' | 'trade' | 'block' | 'job';

export interface ReplyBranch {
  /** The reply (the other side's move). */
  reply: { uci: string; san: string; from: string; to: string; capture: boolean; check: boolean; castle: boolean };
  /** Its probability at the rating asked (the human model). */
  p: number;
  /** The engine's best reply. */
  engineBest: boolean;
  /** The reply the line (the game, the lesson) actually goes on with. */
  played: boolean;
  /** The mover's answer, the reply's own line's second move. */
  answer: { uci: string; san: string; to: string; piece: string };
  kind: AnswerKind;
  /** The line from the board: the reply, the answer, up to the blow. */
  sans: string[];
  uci: string[];
  /** Plies after the reply to the blow (1: the answer itself). */
  blowPlies: number;
  /** What the answer wins ("a knight"), for `wins`. */
  win: string | null;
  /** Its material, in pawns, for `wins` (a mate is null). */
  winPawns: number | null;
  motif: TacticType | null;
  /** The answer's job clause, for `job` ("guards your knight on e5"). */
  job: string | null;
  trust: LineTrust;
}

/** Why a likely reply is not a branch said (recorded, never a gap). */
export type HeldBranchWhy = 'no-answer' | 'not-proven' | 'description';

export interface ReplyTree {
  /** The board the replies are played on (the replier to move). */
  fen: string;
  replier: Color;
  /** The branches with a proven answer, most likely first (the played one included). */
  branches: ReplyBranch[];
  /** The likely replies that are not a branch, and why. */
  held: Array<{ uci: string; why: HeldBranchWhy }>;
}

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function playUci(c: Chess, u: string): Move | null {
  try { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
}

/**
 * THE TREE after a move: `fen` is the board after it, the replier to move.
 * `replies` — every legal reply scored by one read (REQUIRED: an empty read
 * says nothing). `rating` — the replier's (REQUIRED: the human model reads it).
 * `seconds` — other reads of `fen` (lines that open with a reply), which may
 * vouch for a longer answer line. `played` — the reply the line goes on with,
 * or null.
 */
export function ifTheyPlay(args: {
  fen: string;
  replies: readonly ReplyRead[];
  rating: number;
  student: Color;
  seconds: ReadonlyArray<readonly string[] | null | undefined>;
  played: string | null;
}): ReplyTree | null {
  let board: Chess;
  try { board = new Chess(args.fen); } catch { return null; }
  if (board.isGameOver() || args.replies.length === 0) return null;
  const replier = board.turn();
  const mover: Color = replier === 'w' ? 'b' : 'w';
  const probs = humanMoveProbabilities(args.fen, args.replies.map((r) => ({ uci: r.uci, cp: r.cp })), args.rating);
  if (probs.length === 0) return null;
  const pOf = new Map(probs.map((q) => [q.uci, q.p]));
  const byUci = new Map(args.replies.map((r) => [r.uci, r]));
  const bestCp = Math.max(...args.replies.map((r) => r.cp));
  const best = args.replies.find((r) => r.cp === bestCp) ?? null;
  const likely = [...probs].sort((a, b) => b.p - a.p).filter((q) => q.p >= LIKELY_REPLY_P).slice(0, MAX_LIKELY_REPLIES).map((q) => q.uci);
  const walk = [...likely, ...(best && !likely.includes(best.uci) ? [best.uci] : [])];
  const branches: ReplyBranch[] = [];
  const held: ReplyTree['held'] = [];
  for (const u of walk) {
    const read = byUci.get(u);
    if (!read) continue;
    const b = branchOf(args, read, mover, bestCp, pOf.get(u) ?? 0, u === best?.uci);
    if ('why' in b) held.push({ uci: u, why: b.why });
    else branches.push(b);
  }
  return { fen: args.fen, replier, branches, held };
}

function branchOf(
  args: { fen: string; student: Color; seconds: ReadonlyArray<readonly string[] | null | undefined>; played: string | null },
  read: ReplyRead, mover: Color, bestCp: number, p: number, engineBest: boolean,
): ReplyBranch | { why: HeldBranchWhy } {
  const c = new Chess(args.fen);
  const x = playUci(c, read.uci);
  if (!x) return { why: 'no-answer' };
  const fenX = c.fen();
  const yUci = read.pv[0] === read.uci ? read.pv[1] : undefined;
  if (!yUci || c.isGameOver()) return { why: 'no-answer' };
  const y = playUci(new Chess(fenX), yUci);
  if (!y) return { why: 'no-answer' };
  const reply = {
    uci: read.uci, san: x.san, from: x.from, to: x.to, capture: !!x.captured,
    check: /[+#]$/.test(x.san), castle: x.isKingsideCastle() || x.isQueensideCastle(),
  };
  const answer = { uci: yUci, san: y.san, to: y.to, piece: y.piece };
  const played = args.played === read.uci;
  // The other reads of the board after the reply: a second read of `fen`
  // that opens with this reply is a read of `fenX` from its second move.
  const seconds = args.seconds.filter((l): l is readonly string[] => !!l && l[0] === read.uci && l.length > 1).map((l) => l.slice(1));
  const base = { reply, p, engineBest, played, answer, motif: null as TacticType | null };
  // A REPLY THAT GIVES SOMETHING UP: the one reason walker reads what the
  // answer wins (or mates), from before the reply, to where it lands.
  const cost = bestCp - read.cp;
  if (cost >= MISTAKE_CP) {
    let r: CostReason | null = null;
    try {
      r = costReason({
        fenBefore: args.fen, playedSan: x.san, mover: x.color, student: args.student, costCp: cost,
        after: { uci: read.pv.slice(1), source: 'deep', seconds }, before: null, priorMove: null,
      });
    } catch { r = null; }
    if (r && r.kind === 'allowed' && r.plies[0]?.uci === yUci) {
      if (!r.trust.name) return { why: 'not-proven' };
      const sans = [x.san, ...r.plies.map((q) => q.san)];
      const uci = [read.uci, ...r.plies.map((q) => q.uci)];
      return {
        ...base, kind: r.mate ? 'mate' : 'wins', sans, uci, blowPlies: r.blowPlies,
        win: r.mate ? null : reasonWinWords(r), winPawns: r.mate ? null : r.netForWinner,
        motif: r.motif && SAID_MOTIFS.has(r.motif) ? r.motif : null, job: null, trust: r.trust,
      };
    }
  }
  // AN ORDINARY REPLY: the answer is named only when its point is on the board.
  const near = lineTrust({ fen: fenX, uci: [yUci], plies: 1, winner: mover, seconds });
  const sans = [x.san, y.san];
  const uci = [read.uci, yUci];
  const plain = { ...base, sans, uci, blowPlies: 1, win: null, winPawns: null, trust: near };
  if (x.captured && y.captured && y.to === x.to) {
    return { ...plain, kind: 'recapture', job: null };
  }
  // A LIKE-FOR-LIKE CAPTURE THEY CAN TAKE BACK: the answer offers the trade
  // ("if Black plays Bxe6, we trade queens").
  if (y.captured && y.captured === y.piece && y.piece !== 'p' && new Chess(y.after).attackers(y.to, x.color).length > 0) {
    return { ...plain, kind: 'trade', job: null };
  }
  if (reply.check && y.piece !== 'k' && !y.captured) {
    return { ...plain, kind: 'block', job: null };
  }
  let job: ReturnType<typeof moveJob> = null;
  try { job = moveJob(fenX, y.san, mover, mover === args.student ? MINE : THEIRS); } catch { job = null; }
  if (job && !isBareJob(job) && ANSWER_JOBS.has(job.kind) && /^it /.test(job.clause)) {
    return { ...plain, kind: 'job', job: job.clause.replace(/^it /, '') };
  }
  return { why: 'description' };
}

/** The tense a tree is said in: before the reply (a lesson's line, a branch
 *  the line did not take is still ahead), or after it (the game went on, the
 *  branch was not taken). */
export type TreeTense = 'live' | 'past';

const dots = (san: string, color: Color): string => (color === 'b' ? `…${san}` : san);

function replyWords(b: ReplyBranch, replier: Color, tense: TreeTense, takers: number): string {
  const { reply } = b;
  if (reply.castle) return tense === 'live' ? 'castle' : 'castled';
  if (reply.capture) {
    const piece = reply.san[0] === reply.san[0].toUpperCase() && /^[NBRQK]/.test(reply.san) ? NAME[reply.san[0].toLowerCase()] : 'pawn';
    const withWhat = takers > 1 ? ` with the ${piece}` : '';
    return `${tense === 'live' ? 'take' : 'taken'} on ${reply.to}${withWhat}`;
  }
  return `${tense === 'live' ? 'play' : 'played'} ${dots(reply.san, replier)}`;
}

function answerWords(b: ReplyBranch, mover: Color, subject: 'you' | 'they', tense: TreeTense): string | null {
  const y = dots(b.answer.san, mover);
  const motif = b.motif ? ` — ${withArticle(tacticWord(b.motif))}` : '';
  const shown = b.sans.slice(1).map((s, i) => dots(s, i % 2 === 0 ? mover : (mover === 'w' ? 'b' : 'w')));
  const line = b.blowPlies > 2 ? `: ${shown.slice(0, b.blowPlies).join(', ')}` : '';
  switch (b.kind) {
    // After the game went on, a branch is worth saying only for what it would
    // have won: "if they had taken, you'd have taken back" teaches nothing
    // about a trade that never happened.
    case 'recapture':
      return tense === 'live' ? `${subject} take back with the ${NAME[b.answer.piece]}` : null;
    case 'block':
      return tense === 'live' ? `${y} blocks the check` : null;
    case 'trade':
      return tense === 'live' ? `${y} trades ${NAME[b.answer.piece]}s` : null;
    case 'wins':
      return tense === 'live' ? `${y} wins ${b.win}${motif}${line}` : `${y} would have won ${b.win}${motif}${line}`;
    case 'mate':
      if (b.blowPlies <= 1) return tense === 'live' ? `${unmarked(y)} is mate` : `${unmarked(y)} would have been mate`;
      return tense === 'live' ? `${y} forces mate${line}` : `${y} would have forced mate${line}`;
    case 'job':
      return tense === 'live' ? `${y} ${b.job}` : null;
    default:
      return null;
  }
}

/** One branch as a clause: "if they take on e5, you take back with the knight". */
export function branchClause(t: ReplyTree, b: ReplyBranch, student: Color, tense: TreeTense): string | null {
  const mover: Color = t.replier === 'w' ? 'b' : 'w';
  const replierWord = t.replier === student ? 'you' : 'they';
  const moverWord = mover === student ? 'you' : 'they';
  let takers = 0;
  if (b.reply.capture) {
    try { takers = new Set(new Chess(t.fen).moves({ verbose: true }).filter((m) => m.to === b.reply.to && m.captured).map((m) => m.piece)).size; } catch { takers = 1; }
  }
  const ans = answerWords(b, mover, moverWord, tense);
  if (!ans) return null;
  const x = replyWords(b, t.replier, tense, takers);
  return tense === 'live' ? `if ${replierWord} ${x}, ${ans}` : `if ${replierWord} had ${x}, ${ans}`;
}

/** The branches said, joined: "If they take on e5, you take back with the
 *  knight; if they play …Qe7, d4 guards your knight on e5." Null: nothing
 *  to say. */
export function treeSentence(t: ReplyTree, branches: readonly ReplyBranch[], student: Color, tense: TreeTense): string | null {
  const clauses = branches.map((b) => branchClause(t, b, student, tense)).filter((s): s is string => !!s);
  if (clauses.length === 0) return null;
  const body = clauses.join('; ');
  return `${body[0].toUpperCase()}${body.slice(1)}.`;
}

/** Can this branch be said? A trusted line (the naming rule) with words in
 *  this tense. */
export function sayable(t: ReplyTree, b: ReplyBranch, student: Color, tense: TreeTense): boolean {
  return b.trust.name && branchClause(t, b, student, tense) !== null;
}

/** A read of the board's every legal move from a fan of White-POV lines
 *  (`scoreMoves` over every legal move, `AnalysisLine`s) — the replier's view,
 *  a mate folded the way the human model reads it. */
export function replyReadsFromFan(fen: string, lines: ReadonlyArray<{ evaluation: number; mate: number | null; moves: readonly string[] }>): ReplyRead[] {
  const replierWhite = fen.split(' ')[1] === 'w';
  const sign = replierWhite ? 1 : -1;
  const out = new Map<string, ReplyRead>();
  for (const l of lines) {
    const u = l.moves[0];
    if (!u || out.has(u)) continue;
    const mate = l.mate === null ? null : l.mate * sign;
    const cp = mate === null ? l.evaluation * sign : Math.sign(mate || 1) * (2000 + (100 - Math.min(99, Math.abs(mate))));
    out.set(u, { uci: u, cp, mate, pv: [...l.moves] });
  }
  return [...out.values()];
}

