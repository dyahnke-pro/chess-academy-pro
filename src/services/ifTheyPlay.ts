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
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { humanMoveProbabilities } from './humanMove';
import { costReason, reasonWinWords, type CostReason } from './costReason';
import { lineTrust, type LineTrust } from './lineTrust';
import { NO_FOLLOW } from './exchangeLedger';
import { moveJob, isBareJob, MINE, THEIRS, type BookJobKind } from './bookMoveWhy';
import { tacticWord } from './tacticVocabulary';
import { lineShape, withArticle } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import type { TacticType } from '../types';

/** One legal reply, scored by the read of the board after the move. */
/** ONE BRANCH, ONE CLAIM (Review 2026-11-08, Carlsen–Caruana: "If you had
 *  taken on b5, queen takes g5 would have won a bishop" was followed by "A-pawn
 *  takes b5 looks natural, but it doesn't work: they play queen takes g5"). A
 *  reply the NEXT turn already weighed as a tempting move (`weighedMoves`,
 *  claim `tempting:<uci>`, said on that ply) is that turn's to say. */
export function repliesNotWeighed(replies: readonly ReplyRead[], walkSaid: ReadonlyMap<string, number>, nextPly: number | undefined): ReplyRead[] {
  if (nextPly === undefined) return [...replies];
  return replies.filter((r) => walkSaid.get(`tempting:${r.uci}`) !== nextPly);
}

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
  /** What the answer wins ("a knight"), for `wins` — null there when the
   *  answer's own promotion is the whole gain (its SAN says the new queen). */
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
  /** The replier's best score over every legal reply (their view): how sound
   *  the move that made this board was. */
  bestCp: number;
  /** The square the move that made this board landed on, or null. */
  landed: string | null;
  /** THE BAIT TAKEN (WO-DANYA-READS-01 group 8): the captures of the piece
   *  that just landed — the natural reply, the capture or the recapture a
   *  club player makes — likely at this level (`BAIT_TAKE_P`) but outside the
   *  walk, read the same way as a branch. Only the bait reads them. */
  baitTakes: ReplyBranch[];
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
 * or null. `landed` — REQUIRED, the square the move that made `fen` landed
 * on (null for castling or no move): taking that piece is the natural reply.
 */
export function ifTheyPlay(args: {
  fen: string;
  replies: readonly ReplyRead[];
  rating: number;
  student: Color;
  seconds: ReadonlyArray<readonly string[] | null | undefined>;
  played: string | null;
  landed: string | null;
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
    const b = branchOf(args, read, mover, bestCp, pOf.get(u) ?? 0, u === best?.uci, best?.pv ?? null);
    if ('why' in b) held.push({ uci: u, why: b.why });
    else branches.push(b);
  }
  // The captures of the piece that just landed, outside the walk.
  const baitTakes: ReplyBranch[] = [];
  if (args.landed) {
    for (const q of [...probs].sort((a, b) => b.p - a.p)) {
      if (q.p < BAIT_TAKE_P || walk.includes(q.uci) || q.uci.slice(2, 4) !== args.landed) continue;
      const read = byUci.get(q.uci);
      if (!read) continue;
      const mv = (() => { try { return new Chess(args.fen).move({ from: q.uci.slice(0, 2), to: q.uci.slice(2, 4), promotion: q.uci[4] }); } catch { return null; } })();
      if (!mv?.captured) continue;
      const b = branchOf(args, read, mover, bestCp, q.p, q.uci === best?.uci, best?.pv ?? null);
      if (!('why' in b)) baitTakes.push(b);
    }
  }
  return { fen: args.fen, replier, branches, held, bestCp, landed: args.landed, baitTakes };
}

function branchOf(
  args: { fen: string; student: Color; seconds: ReadonlyArray<readonly string[] | null | undefined>; played: string | null },
  read: ReplyRead, mover: Color, bestCp: number, p: number, engineBest: boolean,
  /** The best reply's line: what a reply gives up is measured against it. */
  bestLine: readonly string[] | null,
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
        against: bestLine,
      });
    } catch { r = null; }
    if (r && r.kind === 'allowed' && r.plies[0]?.uci === yUci) {
      if (!r.trust.name) return { why: 'not-proven' };
      const sans = [x.san, ...r.plies.map((q) => q.san)];
      const uci = [read.uci, ...r.plies.map((q) => q.uci)];
      return {
        ...base, kind: r.mate ? 'mate' : 'wins', sans, uci, blowPlies: r.blowPlies,
        // Said after the answer ("…a1=Q wins …"): a promotion the answer
        // itself makes is not named again (`reasonWinWords`).
        win: r.mate ? null : reasonWinWords(r, [0]), winPawns: r.mate ? null : r.netForWinner,
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
  // The answer's job is read with what the reply's own line plays after it: a
  // capture whose gain that line gives straight back is no "wins a pawn, and
  // nothing can take back" (task 172: "…Nf6, Nxe5 wins a pawn", with the read
  // going on …d6, Nf3, …Nxe4).
  let job: ReturnType<typeof moveJob> = null;
  try {
    const after: string[] = [];
    const walk = new Chess(y.after);
    for (const u of read.pv.slice(2)) { const m = playUci(walk, u); if (!m) break; after.push(m.san); }
    job = moveJob(fenX, y.san, mover, mover === args.student ? MINE : THEIRS, null, after.length ? [after] : NO_FOLLOW);
  } catch { job = null; }
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

function replyWords(b: ReplyBranch, replier: Color, tense: TreeTense, takers: number, twins: boolean): string {
  const { reply } = b;
  if (reply.castle) return tense === 'live' ? 'castle' : 'castled';
  if (reply.capture) {
    const piece = reply.san[0] === reply.san[0].toUpperCase() && /^[NBRQK]/.test(reply.san) ? NAME[reply.san[0].toLowerCase()] : 'pawn';
    // TWO OF A KIND THAT CAN BOTH TAKE ARE TOLD APART (task 172: "if they take
    // on d2 with the knight, …Bxg2 wins a bishop" — true of the knight from f3
    // only; the one from b1 takes safely).
    const withWhat = twins ? ` with the ${piece} from ${reply.from}` : takers > 1 ? ` with the ${piece}` : '';
    return `${tense === 'live' ? 'take' : 'taken'} on ${reply.to}${withWhat}`;
  }
  return `${tense === 'live' ? 'play' : 'played'} ${dots(reply.san, replier)}`;
}

function answerWords(b: ReplyBranch, mover: Color, subject: 'you' | 'they', tense: TreeTense, afterReply: string | null): string | null {
  const y = dots(b.answer.san, mover);
  const motif = b.motif ? ` — ${withArticle(tacticWord(b.motif))}` : '';
  const shown = b.sans.slice(1).map((s, i) => dots(s, i % 2 === 0 ? mover : (mover === 'w' ? 'b' : 'w')));
  // Every move of the line says whose it is ("Qxd4, …Qxd4+, Rxd4" was a score
  // sheet; prod focus audit 2026-11-09 heard "knight takes c4, bishop takes
  // g5, king takes f1"). The answer wins, so its side is the line's winner.
  const line = b.blowPlies > 2 ? `: ${lineShape(shown.slice(0, b.blowPlies), subject, afterReply, 'first')}` : '';
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
      // The answer's own promotion IS the gain ("…a1=Q", said "a1, making a
      // queen"): the answer is said, never its queen twice.
      if (!b.win) return tense === 'live' ? `${subject} answer ${y}${motif}${line}` : `${subject} would have answered ${y}${motif}${line}`;
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

/** The board the branch's line starts from: the tree's board after the reply. */
function boardAfterReply(t: ReplyTree, b: ReplyBranch): string | null {
  try { const c = new Chess(t.fen); c.move(b.reply.san); return c.fen(); } catch { return null; }
}

/** One branch as a clause: "if they take on e5, you take back with the knight". */
export function branchClause(t: ReplyTree, b: ReplyBranch, student: Color, tense: TreeTense): string | null {
  const p = branchParts(t, b, student, tense);
  if (!p) return null;
  // The past is ROTATED on the board and the reply (prod Review audit
  // 2026-11-11: "if they had taken on SQ, P takes SQ would have won a P for a
  // P" said three times in one game — the human-voice rule: two or three
  // phrasings, never Math.random). The live "if they take …" is the
  // speedrun's own phrase and stays.
  const key = stemKeyOf(`${t.fen}|${b.reply.uci}`);
  return tense === 'live'
    ? `if ${p.replierWord} ${p.x}, ${p.ans}`
    : rotateStem([`if ${p.replierWord} had ${p.x}, ${p.ans}`, `had ${p.replierWord} ${p.x}, ${p.ans}`, `${p.replierWord} could have ${p.x}, but ${p.ans}`], key);
}

/** A branch's two halves: the reply in words and the answer in words. */
function branchParts(t: ReplyTree, b: ReplyBranch, student: Color, tense: TreeTense): { replierWord: string; x: string; ans: string } | null {
  const mover: Color = t.replier === 'w' ? 'b' : 'w';
  const replierWord = t.replier === student ? 'you' : 'they';
  const moverWord = mover === student ? 'you' : 'they';
  let takers = 0;
  let twins = false;
  if (b.reply.capture) {
    try {
      const takes = new Chess(t.fen).moves({ verbose: true }).filter((m) => m.to === b.reply.to && m.captured);
      takers = new Set(takes.map((m) => m.piece)).size;
      const mine = takes.find((m) => m.from === b.reply.from);
      twins = !!mine && takes.filter((m) => m.piece === mine.piece).length > 1;
    } catch { takers = 1; }
  }
  const ans = answerWords(b, mover, moverWord, tense, boardAfterReply(t, b));
  if (!ans) return null;
  const x = replyWords(b, t.replier, tense, takers, twins);
  return { replierWord, x, ans };
}

/** THE BAIT (WO-COACH-NEXT-TO-YOU-01 C4 — the skill "induce mistakes", David
 *  2026-11-06: "teaching you how to … induce mistakes"). The student's SOUND
 *  move left a reply that many players at this level choose (the human model,
 *  at least `BAIT_P`) and that loses: material that holds, or a mate. Sound:
 *  the replier's best reply leaves them no better than `BAIT_SOUND_CP` — a
 *  trap that only works if they blunder and costs the student if they don't
 *  is not a bait. The most likely such reply; null when there is none. */
export const BAIT_P = 0.2;
/** THE BAIT TAKEN (WO-DANYA-READS-01 group 8, his "the natural …Nxg6 walks
 *  into mate"): taking the piece that just landed is the reply a club player
 *  reaches for first, so it is a trap at a lower bar than any other reply.
 *  Measured on his 207 article boards with a depth-10 read of every reply at
 *  1500: six captures of the landed piece lose to a proven answer, all six
 *  between 0.08 and 0.2, so the frequency bar alone said none of them. */
export const BAIT_TAKE_P = 0.08;
const BAIT_SOUND_CP = 50;
/** Does the branch take the piece that just landed? */
function takesLanded(t: ReplyTree, b: ReplyBranch): boolean {
  return b.reply.capture && t.landed !== null && b.reply.to === t.landed;
}
export function baitBranch(t: ReplyTree, student: Color): ReplyBranch | null {
  if (t.replier === student || t.bestCp > BAIT_SOUND_CP) return null;
  return [...t.branches, ...t.baitTakes]
    .filter((b) => (b.p >= BAIT_P || (takesLanded(t, b) && b.p >= BAIT_TAKE_P)) && b.trust.name && (b.kind === 'mate' || (b.kind === 'wins' && (b.winPawns ?? 0) >= 1)))
    .sort((a, b) => b.p - a.p)[0] ?? null;
}

/** The bait said: what most players here answer, and what it costs them —
 *  "This sets a trap: many players at this level answer …d5, and Nxf7 wins a
 *  knight." Past tense once the game went another way. `nameAnswer` false
 *  when the answer is still the student's to play (Learn names no move
 *  unasked): what the reply loses is said, never the move that wins it. */
export function baitSentence(t: ReplyTree, b: ReplyBranch, student: Color, tense: TreeTense, nameAnswer: boolean): string | null {
  const mover: Color = t.replier === 'w' ? 'b' : 'w';
  const who = b.p >= 0.5 ? 'most' : 'many';
  const reply = dots(b.reply.san, t.replier);
  // Below the frequency bar the bait is the natural capture, said as one —
  // never "many players" of a reply most do not play.
  const taken = b.p < BAIT_P ? (() => { try { return new Chess(t.fen).get(b.reply.to as Square); } catch { return undefined; } })() : undefined;
  const takenWord = taken ? `the ${NAME[taken.type]} on ${b.reply.to}` : null;
  const loses = b.kind === 'mate' ? 'walks into mate' : b.win ? `loses ${b.win}` : null;
  const past = (s: string): string => (tense === 'live' ? s : s.replace(/^loses/, 'would have lost').replace(/^walks/, 'would have walked'));
  if (takenWord) {
    // "This sets a trap: taking the knight on g6 looks natural, but after
    // …Nxg6, Qh7+ forces mate."
    const looks = tense === 'live' ? 'looks' : 'looked';
    const open = `${tense === 'live' ? 'This sets' : 'That set'} a trap: taking ${takenWord} ${looks} natural`;
    if (!nameAnswer) return loses ? `${open}, but ${reply} ${past(loses)}.` : null;
    const ans = answerWords(b, mover, mover === student ? 'you' : 'they', tense, boardAfterReply(t, b));
    return ans ? `${open}, but after ${reply}, ${ans}.` : null;
  }
  const lead = tense === 'live' ? `This sets a trap: ${who} players at this level answer ${reply}` : `That set a trap: ${who} players at this level answer ${reply} there`;
  if (!nameAnswer) {
    if (!loses) return null;
    return `${lead}, and it ${past(loses)}.`;
  }
  const ans = answerWords(b, mover, mover === student ? 'you' : 'they', tense, boardAfterReply(t, b));
  return ans ? `${lead}, and ${ans}.` : null;
}

/** THE PIECE THAT CANNOT BE TAKEN, BY THE LINE (WO-DANYA-READS-01 group 8 —
 *  `poisonedPiece` reads the mates by brute force; this reads the rest): the
 *  piece that just landed on `t.landed` looks free (the legal exchange wins it
 *  for them, `free`), yet EVERY capture of it gives up a proven amount — the
 *  read of every reply scores each capture a mistake against their best, and
 *  the capture's own line wins material that holds or mates. The move must be
 *  sound (their best reply leaves them no better). The most likely capture's
 *  branch is the one said; null when any capture is safe. */
export function everyTakeLoses(
  args: { fen: string; replies: readonly ReplyRead[]; rating: number; student: Color; seconds: ReadonlyArray<readonly string[] | null | undefined>; landed: string | null },
  free: boolean,
): ReplyBranch | null {
  if (!free || !args.landed || args.replies.length === 0) return null;
  let board: Chess;
  try { board = new Chess(args.fen); } catch { return null; }
  const replier = board.turn();
  const mover: Color = replier === 'w' ? 'b' : 'w';
  const bestCp = Math.max(...args.replies.map((r) => r.cp));
  if (bestCp > BAIT_SOUND_CP) return null;
  const best = args.replies.find((r) => r.cp === bestCp) ?? null;
  const takes = board.moves({ verbose: true }).filter((m) => m.to === args.landed && m.captured);
  if (takes.length === 0) return null;
  const probs = humanMoveProbabilities(args.fen, args.replies.map((r) => ({ uci: r.uci, cp: r.cp })), args.rating);
  const pOf = new Map(probs.map((q) => [q.uci, q.p]));
  const byUci = new Map(args.replies.map((r) => [r.uci, r]));
  const out: ReplyBranch[] = [];
  for (const m of takes) {
    const u = `${m.from}${m.to}${m.promotion ?? ''}`;
    const read = byUci.get(u);
    if (!read) return null;
    const b = branchOf({ ...args, played: null }, read, mover, bestCp, pOf.get(u) ?? 0, u === best?.uci, best?.pv ?? null);
    if ('why' in b || !b.trust.name || !(b.kind === 'mate' || (b.kind === 'wins' && (b.winPawns ?? 0) >= 1))) return null;
    out.push(b);
  }
  return out.sort((a, b) => b.p - a.p)[0] ?? null;
}

/** The piece that cannot be taken, said from the student's seat: "Your
 *  knight on e5 looks loose, but it can't be taken. After …Nxe5, Qa4+ wins a
 *  bishop." `nameAnswer` false while the answer is still the student's to
 *  play: what the capture loses is said, never the move that wins it. */
export function everyTakeSentence(t: { fen: string; replier: Color }, b: ReplyBranch, piece: string, student: Color, nameAnswer: boolean): string | null {
  const mover: Color = t.replier === 'w' ? 'b' : 'w';
  const own = mover === student ? 'your' : 'their';
  const sq = b.reply.to;
  const reply = dots(b.reply.san, t.replier);
  const key = stemKeyOf(`${t.fen}|everyTake|${sq}`);
  const open = rotateStem([
    `${openSentence(`${own} ${piece} on ${sq}`)} looks loose, but it can't be taken.`,
    `${openSentence(`${own} ${piece} on ${sq}`)} looks free, and it isn't.`,
    `Taking ${own} ${piece} on ${sq} is a mistake.`,
  ], key);
  if (!nameAnswer) {
    const loses = b.kind === 'mate' ? 'walks into mate' : b.win ? `loses ${b.win}` : null;
    return loses ? `${open} ${openSentence(reply)} ${loses}.` : null;
  }
  const tree: ReplyTree = { fen: t.fen, replier: t.replier, branches: [b], held: [], bestCp: 0, landed: sq, baitTakes: [] };
  const ans = answerWords(b, mover, mover === student ? 'you' : 'they', 'live', boardAfterReply(tree, b));
  return ans ? `${open} After ${reply}, ${ans}.` : null;
}

/** The branches said, a sentence each: "If they take on e5, you take back
 *  with the knight. If they play …Qe7, d4 guards your knight on e5." (prod
 *  focus audit 2026-11-09: the branches were one sentence on a spoken
 *  semicolon). Null: nothing to say. */
export function treeSentence(t: ReplyTree, branches: readonly ReplyBranch[], student: Color, tense: TreeTense): string | null {
  // Replies with ONE answer are said once ("If they play …Nf6 or …d6, d4
  // joins your knight against e5"), never the same answer twice in a row
  // (WO-OPENINGS-REWRITE-01 C3: the lesson said it once per reply).
  if (tense === 'live') {
    const groups: Array<{ replierWord: string; xs: string[]; ans: string }> = [];
    for (const b of branches) {
      const p = branchParts(t, b, student, tense);
      if (!p) continue;
      const g = groups.find((q) => q.ans === p.ans && q.replierWord === p.replierWord);
      if (g) g.xs.push(p.x); else groups.push({ replierWord: p.replierWord, xs: [p.x], ans: p.ans });
    }
    if (groups.length === 0) return null;
    // "play …Nf6 or …d6": a verb the replies share is said once.
    const or = (xs: string[]): string => {
      if (xs.length === 1) return xs[0];
      const verb = xs.every((x) => x.startsWith('play ')) ? 'play ' : '';
      const ys = xs.map((x) => x.slice(verb.length));
      return `${verb}${ys.slice(0, -1).join(', ')} or ${ys.at(-1)}`;
    };
    return groups.map((g) => `${openSentence(`if ${g.replierWord} ${or(g.xs)}, ${g.ans}`)}.`).join(' ');
  }
  const clauses = branches.map((b) => branchClause(t, b, student, tense)).filter((s): s is string => !!s);
  if (clauses.length === 0) return null;
  return clauses.map((c) => `${openSentence(c)}.`).join(' ');
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


/** The square a move in SAN lands on (its destination), or null for castling:
 *  the piece a natural reply takes (`ifTheyPlay`'s `landed`). */
export function landedSquare(san: string): string | null {
  if (/^O-O/.test(san.replace(/^…/, ''))) return null;
  const m = san.match(/[a-h][1-8]/g);
  return m ? m[m.length - 1] : null;
}
