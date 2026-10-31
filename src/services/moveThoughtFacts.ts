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
import { sayIdea, type PhraseMemory } from '../utils/phraseMemory';
import { NO_PROOF, squaresProof, lineProof } from './proof';
import { moveAspects, joinReview, toClause } from './reviewMoveBriefing';
import { moveJob, isBareJob, MINE, THEIRS, type BookJobKind } from './bookMoveWhy';
import { computeMoveFundamentals } from './moveFundamentals';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { deepFact, theirTarget, bindingFact, moveHit } from './threeFacts';
import { pieceRoute } from './pieceRoute';
import { findProphylaxis } from './prophylaxis';
import { toOtherSeat } from '../utils/seatPronouns';
import { inBetweenMove } from './inBetweenMove';
import { pvSanToUci } from './principleAttribution';
import { BOOK_JOB_IDEA, FUNDAMENTAL_IDEA, ideaClaim, type IdeaKind } from './ideaKind';
import { openSentence, continueSentence } from '../utils/openSentence';
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

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
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
  // A clause that carries its own dash takes a colon after the move, so one
  // sentence never holds two dashes ("You play Bxc3+: it wins a knight — if
  // Bxc3, …Qxc3+"), the briefing's own joining rule (`joinReview`); one that
  // carries both a dash and a colon starts its own sentence ("You play Kxf7.
  // It takes back on f7: you get a knight… — that is what they gave…").
  const joiner = (clause: string): string => (!clause.includes(' — ') ? ' — it' : clause.includes(': ') ? '. It' : ': it');
  const lead = (clause: string): string => (i.moverIsStudent === undefined ? `${san}: it ${clause}` : `${mine ? 'You play' : 'They play'} ${san}${joiner(clause)} ${clause}`);
  const gerund = (clause: string): string => (i.moverIsStudent === undefined ? `${san}: ${clause}` : `${mine ? 'You play' : 'They play'} ${san}, ${clause}`);
  /** The squares an idea is about beyond the move itself. */
  const beyond = (sqs: readonly string[]): string[] => [...new Set(sqs)].filter((s) => s !== from && s !== to);
  const facts: ThoughtFact[] = [];
  // A fact's claim is THIS move's idea on its squares — two moves never share
  // one (…d5's own claim on the centre is not c4's strike at d5).
  const add = (source: ThoughtSource, idea: IdeaKind, text: string, alsoText: string | undefined, squares: readonly string[], weight: number, restates = false, extraClaims: readonly string[] = []): void => {
    const sq = beyond(squares);
    // ITS PROOF IS ITS SQUARES: the moved piece and every square the idea
    // rests on, marked on the board when the student asks Why — the same
    // proof Learn's geometry lanes hand in.
    const said = close(text);
    facts.push({
      step, source, idea, text: said, alsoText: alsoText ? close(alsoText) : undefined, squares: sq, weight,
      stakes: null, proof: squaresProof(said, [...new Set([to, ...squares])]) ?? NO_PROOF.description, seat, fen: fenAfter, altFen: i.fenBefore,
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
    // A JOB SAID MANY TIMES A LESSON OR A GAME ROTATES ITS WORDS (v5 re-run
    // 2026-10-29: "Wins their pawn on a2, and nothing can take back." four
    // times in one review), and the context that makes a guard matter ("which
    // their bishop on c4 pins") is said with its first guard only. The phrase
    // memory counts both, so every surface that keeps one says them alike.
    const worded = job.contextKey && job.compact
      ? sayIdea(i.phrases, `job-context:${job.contextKey}`, [job.clause, job.compact])
      : job.forms?.length ? sayIdea(i.phrases, `job-kind:${job.kind}`, job.forms) : job.clause;
    const clause = worded.replace(/^it\s+/i, '');
    add('moveJob', BOOK_JOB_IDEA[job.kind], lead(clause), `It also ${clause}`, job.squares, JOB_WEIGHT[job.kind], isBareJob(job));
  }

  // THE FUNDAMENTALS — worded from the mover's own seat ("saves the queen from
  // their bishop"), so their move's is turned to the student's (`toOtherSeat`).
  // THEIR MOVE TOO (WO-ONE-COACH-01 Build 4): Danya explains the opponent's
  // move on 2,189 of his 7,477 notes, and the lesson said his idea on 18.7% of
  // them against 41.4% on the student's; with these it says 32% (the Danya
  // bench, 2026-10-30).
  // A STOCK PHRASE IS TAUGHT IN FULL ONCE A LESSON (the DNA template, David
  // 2026-10-07): every fundamental words its idea the same way every time, so
  // after the first the move's next fact speaks — the board teacher, which
  // keeps the phrase memory and refers back in a shorter form, for develop /
  // centre / castle / space. Review prod audit 2026-10-30: "it marches up — in
  // the endgame it stops hiding and becomes a fighting piece" on three king
  // moves of one game, when only those four were said once.
  const seated = (clause: string): string => (mine ? clause : toOtherSeat(clause));
  for (const f of computeMoveFundamentals(i.fenBefore, i.san, sideOf(i.fenBefore) === 'w' ? 'white' : 'black')) {
    const idea = FUNDAMENTAL_IDEA[f.id];
    add('fundamental', idea, lead(seated(f.led)), `It also ${seated(f.led)}`, f.squares, f.weight, false, [`phrase:${idea}`]);
  }

  // THE BOARD TEACHER — the move's idea on the board, from the speaker's seat.
  const teacher = buildReviewMoveTeachingFact(i.fenBefore, i.san, mine, i.phrases);
  if (teacher) {
    const subjectLed = /^(The|A|An|This|That|Their|Your)\b/.test(teacher.text);
    // Its develop reading is its last resort ("the knight develops to d2,
    // joining the game") — the move read back, said only when nothing else is.
    add('boardTeacher', teacher.idea, joinReview([toClause(teacher.text)], i.moverIsStudent, i.san),
      subjectLed ? teacher.text : `It also ${continueSentence(teacher.text)}`, teacher.squares, 50, teacher.idea === 'develop' || teacher.restates === true);
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

  // NOT YET — FIRST THIS (his "I didn't take on h4 right away; Be5 first,
  // hitting the rook, and only then did I take"): a capture is on the board,
  // this move is a different forcing move, and the capture is still there
  // later in the line that follows — the one in-between detector
  // (`inBetweenMove`, which the tactic record and the live read use too),
  // said about the move just played. Both seats: their in-between move is the
  // same lesson. The lesson said this idea on 0 of the 527 notes where he says
  // it (the Danya bench, 2026-10-30).
  if (i.line && i.line.length >= 2) {
    const ib = inBetweenMove(i.fenBefore, pvSanToUci(i.fenBefore, [i.san, ...i.line]));
    if (ib) {
      const first = ib.check ? 'The check' : 'The threat';
      const text = mine
        ? `Taking on ${ib.captureSquare} can wait — it isn't going anywhere. ${first} comes first, and you take after`
        : `They don't take on ${ib.captureSquare} yet — it isn't going anywhere. ${first} comes first, and they take after`;
      const said = close(text);
      facts.push({
        step: 'notYet', source: 'notYet', idea: 'order', text: said, squares: [ib.captureSquare], weight: 70, stakes: null,
        proof: lineProof({ fen: i.fenBefore, sans: ib.line }, mine ? 'you' : 'they') ?? NO_PROOF.description, seat, fen: fenAfter, altFen: i.fenBefore,
        claims: [`not-yet:${from}${to}:${ib.captureSquare}`],
      });
    }
  }

  // THE STOP: the other side's wanted pin, kick or fork, and this is the move
  // that stops it ("h3 takes away g4: Bg4 would pin your knight on f3"). BOTH
  // SEATS (the Danya bench, 2026-10-30: "Black plays a6, preventing a bishop to
  // b5" — his prevent notes are often about the opponent's move): read for
  // whoever moves, worded from the mover's seat, turned to the student's.
  const stop = findProphylaxis(i.fenBefore);
  if (stop && stop.prevention.san.replace(/[+#]$/, '') === i.san.replace(/[+#!?]+$/, '')) {
    const verb = stop.kind === 'pin' ? 'pin' : stop.kind === 'fork' ? 'fork' : 'hit';
    const why = seated(`${stop.intent.san} would ${verb} your ${PIECE_NAME[stop.victim.piece] ?? 'piece'} on ${stop.victim.square}`);
    add('prophylaxis', 'prevent', lead(`takes away ${stop.intent.to}: ${why}`), `It also takes away ${stop.intent.to}: ${why}`, stop.squares, 72);
  }
  return facts;
}

/** A LESSON'S LINE FOR ONE MOVE (WO-ONE-COACH-01): the move's facts through
 *  the one composer with the lesson's say-once memory and phrase memory.
 *  Replaces the briefing's
 *  top-three clause list (`lessonBeat`), which picked by aspect weight alone,
 *  cut at three and never heard the move's job or its fundamentals. '' when
 *  nothing earned a word: silence beats a repeat. */
export function lessonThought(input: Omit<MoveThoughtInput, 'phrases'>, voice: LessonVoice): string {
  return composeThought(moveThoughtFacts({ ...input, phrases: voice.phrases }), 'lesson', voice).spoken;
}

function sideOf(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}
