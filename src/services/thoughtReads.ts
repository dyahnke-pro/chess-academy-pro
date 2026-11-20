// THE ONE FACT SET'S WRITER SETTINGS (the basket, 2026-11-19). Every computer
// the move's fact set reads (`moveThoughtFacts`) lives in the one registry
// (`boardComputers`); the surface hands it HOW the move is said — its seat, its
// tense, whether it may name the move — never a second copy of the sentence.
// This file holds those settings, the intro they make ("You play c4, which …",
// "Your move …", "Nf3: it …") and the one maker that turns a computer's read
// into the move's fact, placed by its own kind.
import { Chess } from 'chess.js';
import { introWithGerund, introWithPredicate, type IntroTense } from '../utils/moveIntro';
import { NO_PROOF, squaresProof } from './proof';
import { ideaClaim, type IdeaKind } from './ideaKind';
import { placeFact, stakesOf, LOCAL_THREAD, type CoachFact, type CoachFactKind, type FactSeat } from './coachFact';
import type { SpokenLine } from './voicePackage';
import type { FactStakes } from './factStakes';
import { planAimKey } from './nextPlans';
import { threadKey } from './gameStory';
import type { PhraseMemory } from '../utils/phraseMemory';
import type { AnalysisLine } from '../types';
import { criticalityThresholds } from './criticalityScan';
import { moverCp, type LineScore } from './winChance';
import type { BookJobKind } from './bookMoveWhy';
import { deepFact, bindingFact, moveHit, type TheirTarget } from './threeFacts';
import { moveAspects, joinReview, toClause } from './reviewMoveBriefing';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { NO_PREV_CAPTURE } from './captureRun';
import { NO_FOLLOW } from './exchangeLedger';
import { continueSentence } from '../utils/openSentence';

/** HOW THE MOVE IS SAID — the writer settings every fact-set read takes. */
export interface MoveWords {
  fenBefore: string;
  san: string;
  /** Whose move: undefined is a caller that does not know (said seat-free,
   *  "Nf3: it …"). */
  moverIsStudent: boolean | undefined;
  tense: IntroTense;
  /** May the words name the student's own move (Learn: never, "your move"). */
  namesPlayedMove: boolean;
}

const cleanSan = (san: string): string => san.replace(/[!?]+$/, '');
export const moveSeat = (w: MoveWords): FactSeat => (w.moverIsStudent !== false ? 'student' : 'opponent');
const unnamed = (w: MoveWords): boolean => w.moverIsStudent === true && !w.namesPlayedMove;

/** The move with what it does ("You play c4, which …"), rotated (`moveIntro`). */
export function moveLead(w: MoveWords, clause: string): string {
  if (unnamed(w)) return `Your move ${clause}`;
  return w.moverIsStudent === undefined ? `${cleanSan(w.san)}: it ${clause}` : introWithPredicate(moveSeat(w), cleanSan(w.san), clause, w.tense);
}

/** The move with what it was doing ("With c4 you were …"). */
export function moveGerund(w: MoveWords, clause: string): string {
  if (unnamed(w)) return `With your move you were ${clause}`;
  return w.moverIsStudent === undefined ? `${cleanSan(w.san)}: ${clause}` : introWithGerund(moveSeat(w), cleanSan(w.san), clause, w.tense);
}

/** A sentence closed with its stop. */
export const closeSentence = (s: string): string => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** THE PLAN THREAD A MOVE'S FACT IS ON (WO-STORY-MATRIX-01 P1-8b): a passer
 *  made is a step on the mover's passer thread on that file, a passer handed
 *  over on the other side's, an outpost planted on the mover's outpost thread,
 *  their king's cover prised open on the mover's attack on it. */
export function threadFor(kind: CoachFactKind, seat: FactSeat, squares: readonly string[]): CoachFact['thread'] {
  const on = (goal: string, at: string | null, whose: FactSeat): CoachFact['thread'] => {
    const aim = planAimKey(goal, at);
    return aim ? threadKey(whose, aim) : LOCAL_THREAD;
  };
  const other: FactSeat = seat === 'student' ? 'opponent' : 'student';
  switch (kind) {
    case 'aspect-passer': return on('passer', squares[0] ?? null, seat);
    case 'aspect-passer-handed': return on('passer', squares[0] ?? null, other);
    case 'aspect-outpost': return on('outpost', squares[0] ?? null, seat);
    case 'aspect-opens-king': return on('king-attack', null, seat);
    default: return LOCAL_THREAD;
  }
}

/** What a registry read hands its maker (the registry's `ReadParts`). */
export type ThoughtParts = Omit<CoachFact, 'id' | 'kind' | 'group' | 'step' | 'computer' | 'stakes'> & { key: string; stakes: FactStakes | null };

/** One idea of the move, as its computer read it. */
export interface MoveIdea {
  kind: CoachFactKind;
  idea: IdeaKind;
  /** The computer's own importance on this board, 0–100. */
  weight: number;
  text: string;
  alsoText?: string;
  /** The squares the idea rests on (the move's own squares are dropped). */
  squares: readonly string[];
  restates?: boolean;
  extraClaims?: readonly string[];
  lines?: readonly SpokenLine[];
  /** What else of the read a surface needs back (`thoughtKey().tag`). */
  tag?: string;
  /** What the idea holds at stake, when its computer measured it (the only
   *  move: what the next best gives up). */
  stakes?: FactStakes | null;
}

/** THE MOVE'S FACT: its claim is the move's idea on its squares (two moves
 *  never share one), its proof the moved piece and every square the idea rests
 *  on, its place its own kind's. The idea, weight and tag ride its key. */
export function moveIdeaFact(make: (p: ThoughtParts) => CoachFact, w: MoveWords, m: MoveIdea): CoachFact | null {
  let fenAfter: string; let from: string; let to: string;
  try { const c = new Chess(w.fenBefore); const mv = c.move(w.san); fenAfter = c.fen(); from = mv.from; to = mv.to; } catch { return null; }
  const seat = moveSeat(w);
  const sq = [...new Set(m.squares)].filter((s) => s !== from && s !== to);
  const said = closeSentence(m.text);
  const f = make({
    key: `${m.kind}~${m.idea}~${m.weight}~${m.restates ? 1 : 0}~${sq.join(',')}~${m.tag ?? ''}`,
    // A TEMPO is a claim about the piece it hits, whoever says it: the count
    // that says that piece has to move is the same claim (composerSaysOnce).
    claims: [`move:${from}${to}:${ideaClaim(m.idea, sq)}`, ...(m.idea === 'tempo' ? [ideaClaim('tempo', sq)] : []), ...(m.extraClaims ?? [])],
    text: said, alsoText: m.alsoText ? closeSentence(m.alsoText) : undefined, squares: sq,
    stakes: null, thread: threadFor(m.kind, seat, m.squares),
    proof: squaresProof(said, [...new Set([to, ...m.squares])]) ?? NO_PROOF.description,
    seat, namesStudentMove: false, fen: fenAfter, altFen: w.fenBefore,
    ...(m.lines && m.lines.length > 0 ? { lines: m.lines } : {}),
  });
  return placedAs(f, m.kind, m.stakes ?? null);
}

/** A read placed by the kind its computer stated (one computer, several kinds
 *  of fact — as the opening story's and the plan thread's). */
export function placedAs(f: CoachFact, kind: CoachFactKind, stakes: FactStakes | null): CoachFact {
  return { ...f, ...placeFact(kind, f.seat), stakes: stakesOf(kind, stakes) };
}

/** What a move fact's key carries: its idea, weight, whether it only restates
 *  the board, and its computer's extra (`MoveIdea.tag`). */
export function thoughtKey(f: CoachFact): { idea: IdeaKind; weight: number; restates: boolean; tag: string } {
  const [, idea, weight, restates, , ...tag] = f.id.slice(f.id.indexOf(':') + 1).split('~');
  return { idea: idea as IdeaKind, weight: Number(weight), restates: restates === '1', tag: tag.join('~') };
}

/** Where the fact set's reads reach each surface: every surface that reads
 *  the one fact set (`moveThoughtFacts`) — the lesson, Review's walk, chat's
 *  move answers, Learn's shared facts and the thinking steps. */
export const FACT_SET_SURFACES = {
  lesson: { wired: 'services/moveThoughtFacts.ts' },
  review: { wired: 'services/moveThoughtFacts.ts' },
  chat: { wired: 'services/moveThoughtFacts.ts' },
  learn: { wired: 'services/moveThoughtFacts.ts' },
  think: { wired: 'services/moveThoughtFacts.ts' },
  // Play's tapped read and a puzzle's read once solved (`boardReadFacts` reads
  // the fact set on the engine's best move; the puzzle's is withheld until
  // it is solved). Play still volunteers nothing.
  play: { wired: 'services/moveThoughtFacts.ts' },
  tactics: { wired: 'services/moveThoughtFacts.ts' },
  weaknesses: { not: 'a reason for a move said once; the record grades the move\'s own cost' },
} as const;

/** How much a job of each kind weighs on the board when nothing is at stake —
 *  the order `moveJob` already ranks them in. */
export const JOB_WEIGHT: Record<BookJobKind, number> = {
  capture: 90, fork: 88, rescue: 76, attack: 70, stopsPin: 70, guard: 64, recapture: 60, stopsPush: 60,
  tempo: 60, prepares: 55, castle: 50, center: 50, develop: 40,
};

/** A STOCK PHRASE IS TAUGHT IN FULL ONCE A LESSON (the DNA template, David
 *  2026-10-07): develop, centre, castle and space word their idea the same way
 *  every time; a specific fact is never one. */
export const STOCK_PHRASE: ReadonlySet<IdeaKind> = new Set<IdeaKind>(['develop', 'center', 'castle', 'space']);

/** The claim "this move clears the way to castle", one key for every
 *  computer that says it (the move job, the purpose). */
export const castlePrepClaim = (from: string, to: string): string => `move:${from}${to}:castle-prep`;

/** A FIXED PHRASE AT MOST TWICE (the WHY rule's measure 3): the long horizon
 *  of an aspect is said with its first two changes of that kind in a lesson
 *  or a game. With no phrase memory (a one-off read) it is always said. */
const HORIZON_TIMES = 2;
export function horizonSaid(phrases: PhraseMemory | null, kind: string): boolean {
  if (!phrases) return true;
  const key = `horizon:${kind}`;
  const n = phrases.get(key) ?? 0;
  phrases.set(key, n + 1);
  return n < HORIZON_TIMES;
}

const sideOf = (fen: string): 'w' | 'b' => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

/** Does the side that just moved go on to play `mv` (from → to) in `line`
 *  (SAN from `fenAfter`, the other side's reply first)? */
export function linePlays(fenAfter: string, line: readonly string[], mv: { from: string; to: string }): boolean {
  try {
    const c = new Chess(fenAfter);
    for (let k = 0; k < line.length; k += 1) {
      const m = c.move(line[k]);
      if (k % 2 === 1 && m.from === mv.from && m.to === mv.to) return true;
    }
  } catch { /* the playable prefix was read */ }
  return false;
}

/** The engine's line after `follow` played instead (its reply first), read
 *  off the fan before the move; null when the fan does not hold it. */
export function followPvOf(fenBefore: string, follow: string | undefined, fan: readonly AnalysisLine[]): string[] | null {
  if (!follow) return null;
  let u: string;
  try { const mv = new Chess(fenBefore).move(follow.replace(/^…/, '')); u = `${mv.from}${mv.to}${mv.promotion ?? ''}`; } catch { return null; }
  const l = fan.find((x) => x.moves[0] === u);
  return l ? l.moves.slice(1) : null;
}

/** THE ORDER MATTERS ONLY WHEN THE ENGINE SAYS SO: "Why not X first?" is
 *  said only when X first is at least half a pawn worse than the move played
 *  by the fan read before the move (Danya speedrun tapes: "Why not …d5
 *  first? It would allow Bb5" with Bb5 losing, "Rg4 first … allow …d5"
 *  with Rg4 as good). X outside the fan is worse than all of it; with no
 *  read the board's reason stands alone. */
const ORDER_MATTERS_CP = 50;
export function orderMatters(fenBefore: string, san: string, follow: string, fan: readonly AnalysisLine[]): boolean {
  if (fan.length === 0) return true;
  const uci = (m: string): string | null => { try { const mv = new Chess(fenBefore).move(m.replace(/^…/, '')); return `${mv.from}${mv.to}${mv.promotion ?? ''}`; } catch { return null; } };
  const y = uci(follow);
  const p = uci(san);
  if (!y || !p) return false;
  const sgn = sideOf(fenBefore) === 'w' ? 1 : -1;
  const cp = (l: AnalysisLine): number => (l.mate != null ? Math.sign(l.mate) * (10_000 - Math.abs(l.mate)) : l.evaluation) * sgn;
  const yl = fan.find((l) => l.moves[0] === y);
  if (!yl) return true;
  const pl = fan.find((l) => l.moves[0] === p) ?? fan[0];
  return cp(pl) - cp(yl) >= ORDER_MATTERS_CP;
}

/** Whether the reply that follows in the line answers their aim — the same
 *  test the reply's own binding makes, from each point the reply may have
 *  (what it sets up, what it threatens, what the moved piece hits). */
export function replyAnswers(fen: string, line: readonly string[] | null, aim: TheirTarget): boolean {
  const reply = line?.[0];
  if (!reply) return false;
  const deep = deepFact(fen, reply, line.slice(1), true);
  const threat = moveAspects({ fenBefore: fen, san: reply, prev: NO_PREV_CAPTURE, moverIsStudent: true, follow: NO_FOLLOW })?.threat?.san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?:=[QRBN])?$/)?.[1] ?? null;
  return [deep?.target ?? null, threat, moveHit(fen, reply)].some((own) => bindingFact(fen, reply, aim, own, true) !== null);
}

/** THE BOARD TEACHER on the move — the move's idea on the board, from the
 *  speaker's seat (`buildReviewMoveTeachingFact`). Its develop reading is its
 *  last resort ("the knight develops to d2, joining the game"): the move read
 *  back, said only when nothing else is. */
/** A check's board-teacher line ("forces the king to react") is true of every
 *  check: it restates the move (checkAnswers, the briefing's bare check). */
export function boardTeacherThought(make: (p: ThoughtParts) => CoachFact, w: MoveWords, phrases: PhraseMemory | null): CoachFact | null {
  const t = buildReviewMoveTeachingFact(w.fenBefore, w.san, w.moverIsStudent !== false, phrases);
  if (!t) return null;
  const subjectLed = /^(The|A|An|This|That|Their|Your)\b/.test(t.text);
  return moveIdeaFact(make, w, {
    kind: 'board-teacher', idea: t.idea, weight: 50,
    text: unnamed(w) ? moveGerund(w, toClause(t.text)) : joinReview([toClause(t.text)], w.moverIsStudent, w.san, w.tense),
    alsoText: subjectLed ? t.text : `It also ${continueSentence(t.text)}`, squares: t.squares, restates: t.idea === 'develop' || t.idea === 'check' || t.restates === true,
  });
}

/** THE DEEP FACT on the move — what it made possible down the line
 *  (`deepFact`). A deep fact that TAKES a piece is about that piece too: its
 *  square rides on the fact, so a move that already attacks it does not say it
 *  twice. ITS LINE IS DRAWN: the moves from this board to the follow-up. The
 *  tag carries its target and the follow-up's square (`deepTag`). */
export function deepThought(make: (p: ThoughtParts) => CoachFact, w: MoveWords, line: readonly string[] | null): CoachFact | null {
  const deep = deepFact(w.fenBefore, w.san, line, w.moverIsStudent !== false);
  if (!deep) return null;
  let fenAfter: string;
  try { const c = new Chess(w.fenBefore); c.move(w.san); fenAfter = c.fen(); } catch { return null; }
  return moveIdeaFact(make, w, {
    kind: 'deep-fact', idea: 'set-up', weight: 56, text: moveGerund(w, deep.text), alsoText: `It also ${deep.verb}`,
    squares: /x/.test(deep.follow.san) ? [deep.follow.to, deep.target] : [deep.target],
    lines: line && line.length > deep.lineIndex ? [{ fen: fenAfter, sans: line.slice(0, deep.lineIndex + 1) }] : undefined,
    tag: `${deep.target}|${deep.follow.from}`,
  });
}

/** A deep-fact read's target and its follow-up's from-square. */
export function deepTag(f: CoachFact): { target: string; from: string } {
  const [target, from] = thoughtKey(f).tag.split('|');
  return { target, from };
}

/** THE ONLY MOVE (gap B6, "the only move not to lose"): the move played is
 *  the engine's best on the fan before it, the next best gives up at least
 *  the app's only-move gap, and the game is still in contest. Returns the
 *  next best and what it gives up — never a bare "only move" — or null. */
export function onlyMove(fenBefore: string, playedUci: string, lines: readonly (LineScore & { moves: readonly string[] })[]): { secondSan: string; gives: string; gapCp: number } | null {
  if (lines.length < 2 || lines[0].moves[0]?.slice(0, 4) !== playedUci.slice(0, 4)) return null;
  const best = moverCp(fenBefore, lines[0]);
  const gap = best - moverCp(fenBefore, lines[1]);
  if (gap < criticalityThresholds().onlyMove || Math.abs(best) >= 400) return null;
  let secondSan: string;
  try { const u = lines[1].moves[0]; secondSan = new Chess(fenBefore).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { return null; }
  const pawns = Math.round(gap / 100);
  // WHAT IT GIVES UP, SAID AS MATERIAL (Learn prod audit 2026-11-18: "the
  // next best, h5, gives up far more" named nothing): the gap in the pieces a
  // player counts in.
  return { secondSan, gapCp: gap, gives: pawns >= 5 ? "gives up more than a rook's worth" : pawns >= 3 ? "gives up about a piece's worth" : pawns === 2 ? 'gives up about two pawns' : 'gives up about a pawn' };
}

/** THE REGISTRY ENTRIES WHOSE READS STATE SEVERAL KINDS of fact on the one
 *  move (`placedAs`): the briefing's aspects, the book read, the choices and
 *  the line, and each read whose kind is the move's lesson kind. */
export type FactSetMultiKind = 'moveAspect' | 'moveThreatDeep' | 'moveCut' | 'moveCage' | 'moveStopsBreak' | 'moveRoute' | 'takesAway' | 'movePurpose'
  | 'openingTheory' | 'moveGains' | 'deliberation' | 'boardTeacherOwn' | 'boardTeacherTheirs' | 'studentDeepFact' | 'theirDeepFact' | 'binding';
