// WHAT A MOVE CHANGED, AS FACTS FOR THE ONE COMPOSER (WO-ONE-COACH-01). The
// computers that say what a move does — the briefing's aspects, the move's
// job, the fundamentals, the board teacher, the deep fact, the answer to their
// last move, the trip, the tactic it lands, the stop it makes — each hand over
// a fact with its idea, its squares and its weight, so the composer can lead
// with the one worth most, say a second job, and never say one idea twice.
// The Danya bench (2026-10-30) found the lesson picking the wrong one of these
// (1…h3: "it makes luft" where his note and two other computers said "it keeps
// their bishop off g4") and stacking two that said one thing.
import { Chess } from 'chess.js';
import type { PrevCaptureContext } from './captureRun';
import type { PhraseMemory } from '../utils/phraseMemory';
import { NO_PROOF } from './proof';
import { moveAspects, joinReview, toClause } from './reviewMoveBriefing';
import { moveJob, isBareJob, MINE, THEIRS, type BookJobKind } from './bookMoveWhy';
import { computeMoveFundamentals } from './moveFundamentals';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { deepFact, theirTarget, bindingFact, moveHit } from './threeFacts';
import { pieceRoute } from './pieceRoute';
import { findProphylaxis } from './prophylaxis';
import { BOOK_JOB_IDEA, FUNDAMENTAL_IDEA, ideaClaim, type IdeaKind } from './ideaKind';
import { openSentence } from '../utils/openSentence';
import { composeThought, type ThoughtFact, type ThoughtSource } from './thoughtComposer';
import type { LessonVoice } from './reviewMoveBriefing';

export interface MoveThoughtInput {
  fenBefore: string;
  san: string;
  /** Whose move it is. Undefined: a caller that does not know whose line
   *  this is — the move is said seat-free ("Nf3: it …"), in the student's
   *  words, as the briefing always did. */
  moverIsStudent: boolean | undefined;
  /** The capture run before this move (a take-back is said as one). */
  prev: PrevCaptureContext;
  /** What follows the move: the taught line, the game's own moves. Null at
   *  the end of a line. */
  line: readonly string[] | null;
  /** The other side's move just before this one, with its board. */
  theirLast: { fenBefore: string; san: string } | null;
  /** The lesson's phrase memory (an idea said in full once, then referred to). */
  phrases: PhraseMemory | null;
}

/** How much a job of each kind weighs on the board when nothing is at stake —
 *  the order `moveJob` already ranks them in. */
const JOB_WEIGHT: Record<BookJobKind, number> = {
  capture: 90, fork: 88, rescue: 76, attack: 70, stopsPin: 70, guard: 64, recapture: 60, stopsPush: 60,
  tempo: 60, prepares: 55, castle: 50, center: 50, develop: 40,
};

/** Ideas the fundamentals say in a stock phrase. */
const STOCK_PHRASE: ReadonlySet<IdeaKind> = new Set<IdeaKind>(['develop', 'center', 'castle', 'space']);
const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const lowerFirst = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);
const close = (s: string): string => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** Every fact a move earns on its own board. */
export function moveThoughtFacts(i: MoveThoughtInput): ThoughtFact[] {
  let fenAfter: string;
  let from: string;
  let to: string;
  try {
    const c = new Chess(i.fenBefore);
    const m = c.move(i.san);
    fenAfter = c.fen();
    from = m.from;
    to = m.to;
  } catch {
    return [];
  }
  const mine = i.moverIsStudent !== false;
  const seat: 'student' | 'opponent' = mine ? 'student' : 'opponent';
  const step = mine ? 'yours' : 'theirs';
  const san = i.san.replace(/[!?]+$/, '');
  /** "You play Nf3 — it …", "They play …", or seat-free "Nf3: it …". */
  const lead = (clause: string): string => (i.moverIsStudent === undefined ? `${san}: it ${clause}` : `${mine ? 'You play' : 'They play'} ${san} — it ${clause}`);
  const gerund = (clause: string): string => (i.moverIsStudent === undefined ? `${san}: ${clause}` : `${mine ? 'You play' : 'They play'} ${san}, ${clause}`);
  /** The squares an idea is about beyond the move itself. */
  const beyond = (sqs: readonly string[]): string[] => [...new Set(sqs)].filter((s) => s !== from && s !== to);
  const facts: ThoughtFact[] = [];
  // A fact's claim is THIS move's idea on its squares — two moves never share
  // one (…d5's own claim on the centre is not c4's strike at d5).
  const add = (source: ThoughtSource, idea: IdeaKind, text: string, alsoText: string | undefined, squares: readonly string[], weight: number, restates = false, extraClaims: readonly string[] = []): void => {
    const sq = beyond(squares);
    facts.push({
      step, source, idea, text: close(text), alsoText: alsoText ? close(alsoText) : undefined, squares: sq, weight,
      stakes: null, proof: NO_PROOF.stated, seat, fen: fenAfter, altFen: i.fenBefore,
      claims: [`move:${from}${to}:${ideaClaim(idea, sq)}`, ...extraClaims], restates,
    });
  };

  // THE BRIEFING'S ASPECTS — the threat, the material, the trade, the tactic,
  // the check, the promotion, the king cover, the structure made or conceded.
  const read = moveAspects({ fenBefore: i.fenBefore, san: i.san, prev: i.prev, moverIsStudent: i.moverIsStudent });
  if (read?.mate) {
    add('briefing', 'mate', `${i.moverIsStudent === undefined ? 'This delivers' : mine ? 'You deliver' : 'They deliver'} checkmate — the king has no reply`, undefined, [], 100);
    return facts;
  }
  for (const a of read?.aspects ?? []) {
    add('briefing', a.idea, lead(a.verb), `It also ${a.verb}`, a.squares, a.weight, a.restates === true);
  }

  // THE MOVE'S JOB, from the speaker's seat.
  // A take-back reads the capture before it (Review passes the same).
  const prior = (() => {
    if (!i.theirLast || !/x/.test(i.theirLast.san)) return null;
    try { const pm = new Chess(i.theirLast.fenBefore).move(i.theirLast.san); return pm.captured ? { to: pm.to, captured: pm.captured, promoted: !!pm.promotion } : null; } catch { return null; }
  })();
  const job = (() => { try { return moveJob(i.fenBefore, i.san, sideOf(i.fenBefore), mine ? MINE : THEIRS, prior); } catch { return null; } })();
  if (job) {
    const clause = job.clause.replace(/^it\s+/i, '');
    add('moveJob', BOOK_JOB_IDEA[job.kind], lead(clause), `It also ${clause}`, job.squares, JOB_WEIGHT[job.kind], isBareJob(job));
  }

  // THE FUNDAMENTALS — worded from the mover's own seat, so said only for the
  // student's move ("saves the queen from their bishop").
  // A STOCK PHRASE IS TAUGHT IN FULL ONCE A LESSON (the DNA template, David
  // 2026-10-07): the fundamentals word develop / centre / castle / space the
  // same way every time, so after the first, the board teacher — which keeps
  // the lesson's phrase memory and refers back in a shorter form — says it.
  if (mine) {
    for (const f of computeMoveFundamentals(i.fenBefore, i.san, sideOf(i.fenBefore) === 'w' ? 'white' : 'black')) {
      const idea = FUNDAMENTAL_IDEA[f.id];
      add('fundamental', idea, lead(f.led), `It also ${f.led}`, f.squares, f.weight, false, STOCK_PHRASE.has(idea) ? [`phrase:${idea}`] : []);
    }
  }

  // THE BOARD TEACHER — the move's idea on the board, from the speaker's seat.
  const teacher = buildReviewMoveTeachingFact(i.fenBefore, i.san, mine, i.phrases);
  if (teacher) {
    const subjectLed = /^(The|A|An|This|That|Their|Your)\b/.test(teacher.text);
    // Its develop reading is its last resort ("the knight develops to d2,
    // joining the game") — the move read back, said only when nothing else is.
    add('boardTeacher', teacher.idea, joinReview([toClause(teacher.text)], i.moverIsStudent, i.san),
      subjectLed ? teacher.text : `It also ${lowerFirst(teacher.text)}`, teacher.squares, 50, teacher.idea === 'develop');
  }

  // THE DEEP FACT — what the move made possible down the line.
  const deep = deepFact(i.fenBefore, i.san, i.line, mine);
  if (deep) add('deepFact', 'set-up', gerund(deep.text), `It also ${deep.verb}`, [deep.target], 56);

  // THE ANSWER TO THEIR LAST MOVE — what it aimed at, and how this meets it.
  const tgt = theirTarget(i.theirLast, mine);
  if (tgt) {
    const ownPoint = deep?.target ?? read?.threat?.san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?:=[QRBN])?$/)?.[1] ?? moveHit(i.fenBefore, i.san);
    const bind = bindingFact(i.fenBefore, i.san, tgt, ownPoint, mine);
    if (bind) add('binding', bind.idea, `${openSentence(tgt.text)}, ${bind.text}`, `${openSentence(tgt.text)}, ${bind.text}`, [tgt.square], 62);
  }

  // THE PIECE'S TRIP down the line that follows.
  const route = pieceRoute(i.fenBefore, i.san, i.line);
  if (route && !(deep && route.path.includes(deep.follow.from))) {
    add('pieceRoute', 'route', gerund(route.text), `It also ${route.verb}`, route.path, 52);
  }

  // THE STOP: their wanted pin, kick or fork, and this is the move that stops
  // it ("h3 takes away g4: Bg4 would pin your knight on f3"). Worded from the
  // student's seat, so said for the student's move.
  const stop = mine ? findProphylaxis(i.fenBefore) : null;
  if (stop && stop.prevention.san.replace(/[+#]$/, '') === i.san.replace(/[+#!?]+$/, '')) {
    const verb = stop.kind === 'pin' ? 'pin' : stop.kind === 'fork' ? 'fork' : 'hit';
    const why = `${stop.intent.san} would ${verb} your ${PIECE_NAME[stop.victim.piece] ?? 'piece'} on ${stop.victim.square}`;
    add('prophylaxis', 'prevent', lead(`takes away ${stop.intent.to}: ${why}`), `It also takes away ${stop.intent.to}: ${why}`, stop.squares, 72);
  }
  return facts;
}

/** A LESSON'S LINE FOR ONE MOVE (WO-ONE-COACH-01): the move's facts, and any
 *  computed line about the move to come, through the one composer with the
 *  lesson's say-once memory and phrase memory. Replaces the briefing's
 *  top-three clause list (`lessonBeat`), which picked by aspect weight alone,
 *  cut at three and never heard the move's job or its fundamentals. '' when
 *  nothing earned a word: silence beats a repeat. */
export function lessonThought(input: Omit<MoveThoughtInput, 'phrases'>, voice: LessonVoice, extra: readonly ThoughtFact[] = []): string {
  const facts = [...moveThoughtFacts({ ...input, phrases: voice.phrases }), ...extra];
  return composeThought(facts, 'lesson', voice).spoken;
}

function sideOf(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

/** A computed line about the move to come (the choices: the alternative most
 *  people play and why it fails, the tempting moves weighed) as a fact. */
export function choiceFact(source: 'refuted' | 'alternatives', text: string, fen: string, moverIsStudent: boolean, weight: number): ThoughtFact {
  return {
    step: 'choices', source, idea: 'choice', text: close(text), squares: [], weight, stakes: null,
    proof: NO_PROOF.stated, seat: moverIsStudent ? 'student' : 'opponent', fen, claims: [`choice:${source}`],
  };
}
