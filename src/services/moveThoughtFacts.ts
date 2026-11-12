// WHAT A MOVE CHANGED, AS FACTS FOR THE ONE COMPOSER (WO-ONE-COACH-01). The
// computers that say what a move does — the briefing's aspects, the move's
// job, the fundamentals, the board teacher, the deep fact, the answer to their
// last move, the trip, the tactic it lands, the stop it makes — each hand over
// a fact with its idea, its squares and its weight, so the composer can lead
// with the one worth most, say a second job, and never say one idea twice.
// The Danya bench (2026-10-30) found the lesson picking the wrong one of these
// (1…h3: "it makes luft" where his note and two other computers said "it keeps
// their bishop off g4") and stacking two that said one thing.
import { plyOfFen } from '../utils/plyOfFen';
import { introWithGerund, introWithPredicate, type IntroTense } from '../utils/moveIntro';
import { Chess } from 'chess.js';
import { NO_PREV_CAPTURE, type PrevCaptureContext } from './captureRun';
import { NO_FOLLOW } from './exchangeLedger';
import { sayIdea, type PhraseMemory } from '../utils/phraseMemory';
import { NO_PROOF, squaresProof, lineProof } from './proof';
import type { DecisiveReason } from './decisiveReason';
import { lineSeatAt } from '../utils/andList';
import { moveAspects, joinReview, toClause, newLessonVoice } from './reviewMoveBriefing';
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
import { composeThought, NOT_LED, type ComposedThought, type ThoughtFact, type ThoughtSource } from './thoughtComposer';
import { placeFact, stakesOf, LOCAL_THREAD, type CoachFact, type CoachFactKind, type ComputerName, type FactSeat, type FactGroup } from './coachFact';
import type { LessonVoice } from './reviewMoveBriefing';
import { planAimKey } from './nextPlans';
import { threadKey, keysUnder, STORY_KEY } from './gameStory';
import { moveIntent, intentRule, type IntentReads } from './moveIntent';
import { buildDeliberation, ruleOuts, NOTHING_SAID } from './deliberation';
import { refutedAltProof, type RefutedAlternative } from './refutedAlternativeCore';
import { costStakes, isStaked, stakeWc, NO_STAKES } from './factStakes';
import { moverCp, wcGap } from './winChance';
import { playedUci } from './planSteps';
import { evalReading } from './reviewMoveBriefing';
import { counterThreatTeaching, planChoiceTeaching, studentMoveTeaching } from './learnBoardTeaching';
import type { LearnLane } from './learnTurnDoor';
import { computeMustDefend } from './threatOut';
import { moveOrder } from './moveOrder';
import { readBoardAll, readKey } from './boardComputers';
import type { WeighRead } from './weighedMoves';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { INACCURACY_CP } from './engineConstants';

export interface MoveThoughtInput {
  fenBefore: string;
  san: string;
  /** REQUIRED: the tense the move is introduced in (`moveIntro.IntroTense`):
   *  'now' for a move being shown (a lesson, a question), 'past' for a move
   *  already played (Review's walk), built in that tense where it is made. */
  tense: IntroTense;
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
  /** Every SAN played before this move, from the line's start. REQUIRED:
   *  the student-move lanes read the game behind the move (which piece took
   *  last, the board a move earlier); a caller with none answers []. */
  history: readonly string[];
  /** The lesson's phrase memory (an idea said in full once, then referred to). */
  phrases: PhraseMemory | null;
  /** THE ENGINE'S READS AROUND THE MOVE (WO-STORY-MATRIX-01 P1-9): the fan
   *  before it, the read after it, and the pass reads where the surface has
   *  them. REQUIRED: a caller with no read answers null, so a computer that
   *  needs the engine is never silently starved (six were, until this). */
  reads: IntentReads | null;
  /** What the move cost its mover against the best move (cp, >= 0), from
   *  one search; null when the surface does not know. */
  costCp: number | null;
  /** REQUIRED: may this surface speak opening THEORY (the named opening this
   *  board equals, the book move)? Only where the student asked for it —
   *  Review's Theory button, chat, a lesson (David 2026-11-06: "Keep the
   *  theory part for review only. It belongs in the button"). */
  theory: boolean;
}

/** How much a job of each kind weighs on the board when nothing is at stake —
 *  the order `moveJob` already ranks them in. */
const JOB_WEIGHT: Record<BookJobKind, number> = {
  capture: 90, fork: 88, rescue: 76, attack: 70, stopsPin: 70, guard: 64, recapture: 60, stopsPush: 60,
  tempo: 60, prepares: 55, castle: 50, center: 50, develop: 40,
};

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** THE PLAN THREAD A MOVE'S FACT IS ON (WO-STORY-MATRIX-01 P1-8b): a goal the
 *  move works toward, keyed by its square — a passer made is a step on the
 *  mover's passer thread on that file, a passer handed over on the other
 *  side's, an outpost planted on the mover's outpost thread, their king's
 *  cover prised open on the mover's attack on it. Every other fact is about
 *  the move alone. */
function threadFor(kind: CoachFactKind, seat: FactSeat, squares: readonly string[]): CoachFact['thread'] {
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
const close = (s: string): string => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** A FIXED PHRASE AT MOST TWICE (the WHY rule's measure 3): the long horizon
 *  of an aspect is said with its first two changes of that kind in a lesson
 *  or a game. With no phrase memory (a one-off read) it is always said. */
const HORIZON_TIMES = 2;
function horizonSaid(phrases: PhraseMemory | null, kind: string): boolean {
  if (!phrases) return true;
  const key = `horizon:${kind}`;
  const n = phrases.get(key) ?? 0;
  phrases.set(key, n + 1);
  return n < HORIZON_TIMES;
}

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
  const san = i.san.replace(/[!?]+$/, '');
  /** The move with what it does, seat-stamped and rotated (`moveIntro`), or
   *  seat-free "Nf3: it …". */
  // The words around the move rotate, said like a person (`moveIntro`, David
  // 2026-11-09: "mix up the phrasing whenever possible").
  const lead = (clause: string): string => (i.moverIsStudent === undefined ? `${san}: it ${clause}` : introWithPredicate(seat, san, clause, i.tense));
  const gerund = (clause: string): string => (i.moverIsStudent === undefined ? `${san}: ${clause}` : introWithGerund(seat, san, clause, i.tense));
  /** The squares an idea is about beyond the move itself. */
  const beyond = (sqs: readonly string[]): string[] => [...new Set(sqs)].filter((s) => s !== from && s !== to);
  const facts: ThoughtFact[] = [];
  // A LESSON SHOWS THE LINE IT TEACHES: the student asked to be walked
  // through it, so no fact here names a move they have yet to find
  // (`CoachFact.namesStudentMove`). Each is known by its computer and place.
  // A fact's claim is THIS move's idea on its squares — two moves never share
  // one (…d5's own claim on the centre is not c4's strike at d5). Every call
  // names the fact's KIND and the computer that made it; the group and the
  // step follow from the kind (`placeFact`), never from the words.
  const add = (kind: CoachFactKind, computer: ComputerName, source: ThoughtSource, idea: IdeaKind, text: string, alsoText: string | undefined, squares: readonly string[], weight: number, restates = false, extraClaims: readonly string[] = []): void => {
    const sq = beyond(squares);
    // ITS PROOF IS ITS SQUARES: the moved piece and every square the idea
    // rests on, marked on the board when the student asks Why — the same
    // proof Learn's geometry lanes hand in.
    const said = close(text);
    facts.push({
      id: `${computer}:${facts.length}`, namesStudentMove: false,
      ...placeFact(kind, seat), computer, source, idea, text: said, alsoText: alsoText ? close(alsoText) : undefined, squares: sq, weight,
      thread: threadFor(kind, seat, squares), stakes: stakesOf(kind, null), proof: squaresProof(said, [...new Set([to, ...squares])]) ?? NO_PROOF.description, seat, fen: fenAfter, altFen: i.fenBefore,
      claims: [`move:${from}${to}:${ideaClaim(idea, sq)}`, ...extraClaims], restates,
    });
  };

  // THE BRIEFING'S ASPECTS — the threat, the material, the trade, the tactic,
  // the check, the promotion, the king cover, the structure made or conceded.
  // WHAT THE SURFACE KNOWS COMES AFTER THE MOVE (task 172): the engine's line
  // after it and the line the surface goes on with (the taught line, the
  // game). A capture's gain is said only when it stands in every one of them.
  const follow: string[][] = [];
  const engineAfter = i.reads?.after[0]?.moves ?? [];
  if (engineAfter.length > 0) {
    const sans: string[] = [];
    try { const c = new Chess(fenAfter); for (const u of engineAfter) sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { /* the playable prefix */ }
    if (sans.length > 0) follow.push(sans);
  }
  // The line a lesson or an answer SHOWS is the line the student sees next; a
  // game already played (Review, 'past') went on with moves a later slip of
  // either side changed, so there only the engine's line counts.
  if (i.tense === 'now' && i.line && i.line.length > 0) follow.push([...i.line]);
  const read = moveAspects({ fenBefore: i.fenBefore, san: i.san, prev: i.prev, moverIsStudent: i.moverIsStudent, follow });
  if (read?.mate) {
    add('checkmate', 'moveAspects', 'briefing', 'mate', `${i.moverIsStudent === undefined ? 'This delivers' : mine ? 'You deliver' : 'They deliver'} checkmate — the king has no reply`, undefined, [], 100);
    return facts;
  }
  for (const a of read?.aspects ?? []) {
    // The long horizon is a fixed phrase: said with its first two changes of
    // its kind in a lesson or a game (the WHY rule), then the change alone.
    const verb = a.horizon && horizonSaid(i.phrases, a.kind) ? `${a.verb}${a.horizon}` : a.verb;
    add(a.kind, 'moveAspects', 'briefing', a.idea, lead(verb), `It also ${verb}`, a.squares, a.weight, a.restates === true);
  }

  // THE MOVE'S JOB, from the speaker's seat.
  // A take-back reads the capture before it (Review passes the same).
  const prior = (() => {
    if (!i.theirLast || !/x/.test(i.theirLast.san)) return null;
    try { const pm = new Chess(i.theirLast.fenBefore).move(i.theirLast.san); return pm.captured ? { to: pm.to, captured: pm.captured, promoted: !!pm.promotion } : null; } catch { return null; }
  })();
  const job = (() => { try { return moveJob(i.fenBefore, i.san, sideOf(i.fenBefore), mine ? MINE : THEIRS, prior, follow); } catch { return null; } })();
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
    add('move-job', 'moveJob', 'moveJob', BOOK_JOB_IDEA[job.kind], lead(clause), `It also ${clause}`, job.squares, JOB_WEIGHT[job.kind], isBareJob(job));
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
    // A PUSH THE RULE CALLS PREPARED IS ONE A LINE GOES ON TO PLAY (task 172:
    // "…d6 prepares e5 — when the e-pawn goes forward, it will be supported"
    // in the Benko, where no line of the engine's and no move of the lesson's
    // plays …e5). The rule reads the board — the square is guarded now — and
    // the board cannot say the push is the plan; the lines the surface knows
    // follow can. With none known, the board is all there is.
    if (f.id === 'prepare-break' && f.names && follow.length > 0 && !follow.some((line) => linePlays(fenAfter, line, f.names as { from: string; to: string }))) continue;
    const idea = FUNDAMENTAL_IDEA[f.id];
    add('fundamental', 'computeMoveFundamentals', 'fundamental', idea, lead(seated(f.led)), `It also ${seated(f.led)}`, f.squares, f.weight, false, [`phrase:${idea}`]);
  }

  // THE BOARD TEACHER — the move's idea on the board, from the speaker's seat.
  const teacher = buildReviewMoveTeachingFact(i.fenBefore, i.san, mine, i.phrases);
  if (teacher) {
    const subjectLed = /^(The|A|An|This|That|Their|Your)\b/.test(teacher.text);
    // Its develop reading is its last resort ("the knight develops to d2,
    // joining the game") — the move read back, said only when nothing else is.
    add('board-teacher', 'buildReviewMoveTeachingFact', 'boardTeacher', teacher.idea, joinReview([toClause(teacher.text)], i.moverIsStudent, i.san, i.tense),
      subjectLed ? teacher.text : `It also ${continueSentence(teacher.text)}`, teacher.squares, 50, teacher.idea === 'develop' || teacher.restates === true);
  }

  // THE DEEP FACT — what the move made possible down the line.
  const deep = deepFact(i.fenBefore, i.san, i.line, mine);
  if (deep) add('deep-fact', 'deepFact', 'deepFact', 'set-up', gerund(deep.text), `It also ${deep.verb}`, [deep.target], 56);

  // THE ANSWER TO THEIR LAST MOVE — what it aimed at, and how this meets it.
  const tgt = theirTarget(i.theirLast, mine);
  if (tgt) {
    const ownPoint = deep?.target ?? read?.threat?.san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?:=[QRBN])?$/)?.[1] ?? moveHit(i.fenBefore, i.san);
    const bind = bindingFact(i.fenBefore, i.san, tgt, ownPoint, mine);
    if (bind) add('binding', 'bindingFact', 'binding', bind.idea, `${openSentence(tgt.text)}, ${bind.text}`, `${openSentence(tgt.text)}, ${bind.text}`, [tgt.square], 62);
  }

  // WHAT THEIR MOVE AIMS AT, on their move (WO-STORY-MATRIX-01 P1-9). It was
  // said only inside the answer to it, so a target the reply did not answer
  // was never said at all ("their exd5 is aimed at your bishop on c4" was
  // dropped while 9…exd5 led with "creates a passed pawn"). When the reply in
  // the line answers it, the reply says the aim and the answer in one breath
  // (the binding above), so it is not said twice. It weighs least of the
  // move's facts: what the piece now eyes is the move's point only when the
  // move does nothing else (a capture, a file opened, a break say more).
  if (i.moverIsStudent === false) {
    const aim = theirTarget({ fenBefore: i.fenBefore, san: i.san }, true);
    // Only an aim the student has to answer: a piece that really falls
    // (`computeMustDefend`, SEE-checked) — a capture that is taken straight
    // back, or a piece eyed behind its guards, aims at nothing.
    const threatened = aim ? computeMustDefend(fenAfter, sideOf(fenAfter)).pieces.some((p) => p.square === aim.square) : false;
    if (aim && threatened && !replyAnswers(fenAfter, i.line, aim)) {
      add('opp-target', 'theirTarget', 'theirAim', 'threat', openSentence(aim.text), openSentence(aim.text), [aim.square, aim.by], 45, false, [`aim:${aim.by}:${aim.square}`]);
    }
  }

  // THE PIECE'S TRIP down the line that follows.
  const route = pieceRoute(i.fenBefore, i.san, i.line);
  if (route && !(deep && route.path.includes(deep.follow.from))) {
    add('route', 'pieceRoute', 'pieceRoute', 'route', gerund(route.text), `It also ${route.verb}`, route.path, 52);
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
    const ib = inBetweenMove(i.fenBefore, pvSanToUci(i.fenBefore, [i.san, ...i.line]), { reads: i.reads?.before ?? [] });
    if (ib) {
      const first = ib.check ? 'The check' : 'The threat';
      const text = mine
        ? `Taking on ${ib.captureSquare} can wait — it isn't going anywhere. ${first} comes first, and you take after`
        : `They don't take on ${ib.captureSquare} yet — it isn't going anywhere. ${first} comes first, and they take after`;
      const said = close(text);
      facts.push({
        id: `inBetweenMove:${facts.length}`, namesStudentMove: false,
        ...placeFact('not-yet', seat), computer: 'inBetweenMove', source: 'notYet', idea: 'order', text: said, squares: [ib.captureSquare], weight: 70, thread: LOCAL_THREAD, stakes: stakesOf('not-yet', null),
        proof: lineProof({ fen: i.fenBefore, sans: ib.line }, mine ? 'you' : 'they') ?? NO_PROOF.description, seat, fen: fenAfter, altFen: i.fenBefore,
        claims: [`not-yet:${from}${to}:${ib.captureSquare}`],
      });
    }
  }

  // THE ORDER MATTERS (`moveOrder`, census #1, WO-STORY-MATRIX-01 P1-9): the
  // mover's follow-up played first would have run into an answer that costs
  // material or mates — read off the engine's line after this move and its
  // line where the follow-up came first. Both seats, the moves named (the
  // lesson shows its line).
  const ff = i.reads?.followFirst;
  const xLine = i.reads?.after[0];
  if (ff && xLine && i.moverIsStudent !== undefined) {
    const mo = moveOrder(i.fenBefore, i.san, ff.uci, xLine, ff.line, seat, true);
    if (mo) {
      const said = close(mo.text);
      facts.push({
        id: `moveOrder:${facts.length}`, namesStudentMove: false,
        ...placeFact('move-order', seat), computer: 'moveOrder', source: 'moveOrder', idea: 'order', text: said, squares: beyond(mo.squares), weight: 70,
        thread: LOCAL_THREAD, stakes: stakesOf('move-order', costStakes(mo.costCp)), proof: squaresProof(said, mo.squares) ?? NO_PROOF.description, seat, fen: fenAfter, altFen: i.fenBefore,
        claims: [`order:${from}${to}>${mo.followUp.uci}`],
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
    add('stop', 'findProphylaxis', 'prophylaxis', 'prevent', lead(`takes away ${stop.intent.to}: ${why}`), `It also takes away ${stop.intent.to}: ${why}`, stop.squares, 72);
  }

  // DANGER LEVELS — a piece left attacked and a bigger one hit instead
  // (`counterThreat`, WO-STORY-MATRIX-01 P1-9), the fact Learn's door says,
  // made by the same maker so the lesson keeps Learn's rule: the student's own
  // counter-threat is credited only when its cost says it held.
  if (i.moverIsStudent !== undefined) {
    const studentWB = mine ? sideOf(i.fenBefore) : sideOf(fenAfter);
    const ct = counterThreatTeaching(i.fenBefore, i.san, studentWB, i.costCp);
    if (ct) {
      const { lane: _lane, event: _event, arrows: _arrows, evidence: _evidence, ownMoveReason: _own, ...fact } = ct;
      facts.push({ ...fact, id: `counterThreat:${facts.length}`, source: 'counterThreat', idea: 'threat', weight: 72 });
    }
  }

  // TWO PLANS ON THE BOARD (`planChoice`, WO-STORY-MATRIX-01 P1-9): after
  // their move, the engine's two best lines for the student carry different
  // plans — level ("choose the one you understand") or one clearly stronger.
  // Read off the fan after the move (the student to move), made by Learn's own
  // maker; said on their move, before the student's reply plays one of them.
  if (i.moverIsStudent === false && i.reads && i.reads.after.length >= 2) {
    const pc = planChoiceTeaching(fenAfter, i.reads.after, sideOf(fenAfter) === 'w' ? 'white' : 'black', { fenBefore: i.fenBefore, san: i.san });
    if (pc) {
      const { lane: _lane, event: _event, arrows: _arrows, evidence: _evidence, ownMoveReason: _own, ...fact } = pc;
      facts.push({ ...fact, id: `planChoice:${facts.length}`, source: 'planChoice', idea: 'plan', weight: 50 });
    }
  }

  // THE STRUCTURAL CHOICE ON THE BOARD (`linesStructure` through the one
  // registry, WO-STORY-MATRIX-01 P1-9c): after their move, the student's two
  // best lines differ in structure — one makes the imbalance, the other keeps
  // it quiet — or the line opens a bishop that looks dead today. Read off the
  // fan after the move, said on their move before the reply plays one; a
  // lesson's line is a model line, so the moves are named.
  if (i.moverIsStudent === false && i.reads && i.reads.after.length >= 1) {
    const lines = i.reads.after.map((l) => ({ moves: l.moves, evaluation: l.evaluation, mate: l.mate ?? null }));
    for (const f of readBoardAll('structureLines', { fen: fenAfter, student: sideOf(fenAfter), lines, namesMoves: true })) {
      facts.push({ ...f, source: 'structureLines', idea: readKey(f).startsWith('fighting:') ? 'plan' : 'diagonal', weight: 48 });
    }
  }

  // THE CHOICES — the moves you'd weigh here and why each falls short, each
  // its own fact with the line that proves it (`buildDeliberation`, read off
  // the fan before the move). The played move is never weighed against
  // itself, and the engine's best is never named over it: a taught line's
  // move may not be the engine's (G3), so only the rule-outs are said.
  if (mine && i.reads && i.reads.before.length >= 2) {
    const d = buildDeliberation({ analysis: { topLines: [...i.reads.before] }, fenBefore: i.fenBefore, moverColor: sideOf(i.fenBefore), excludeSan: san, prevCapture: i.prev, priorMove: i.theirLast });
    if (d) {
      for (const r of ruleOuts(d, NOTHING_SAID)) {
        facts.push({
          id: `buildDeliberation:${facts.length}`, namesStudentMove: false,
          ...placeFact('deliberation', seat), computer: 'buildDeliberation', source: 'alternatives', idea: 'choice', text: close(r.text),
          squares: r.squares, weight: 50, thread: LOCAL_THREAD, stakes: stakesOf('deliberation', costStakes(r.deltaCp)),
          // A drop the board shows has its square as its proof (marked when asked Why).
          proof: r.proof ?? squaresProof(close(r.text), r.squares) ?? NO_PROOF.description, seat, fen: i.fenBefore, altFen: fenAfter,
          claims: [r.claim ?? `choice:${from}${to}:${r.san}`],
        });
      }
      // THE LINE PLAYED OUT — the move is the engine's own and its line wins
      // material or mates within the horizon. When the deep fact already says
      // what the move sets up, that is this line's point: it is not said twice.
      if (d.best.san === san && d.bestLineAfter && d.bestLineProof && !deep) {
        const said = close(d.bestLineAfter);
        facts.push({
          id: `buildDeliberation:${facts.length}`, namesStudentMove: false,
          ...placeFact('line', seat), computer: 'buildDeliberation', source: 'bestLine', idea: /and it's mate$/.test(d.bestLineAfter) ? 'mate' : 'win-material',
          text: said, squares: [], weight: 60, thread: LOCAL_THREAD, stakes: stakesOf('line', null), proof: d.bestLineProof, seat, fen: i.fenBefore, altFen: fenAfter,
          claims: [`line:${from}${to}:${(d.bestLineSans ?? []).join(',')}`],
        });
      }
    }
  }
  // THE KING WALKED BY HAND (his Scotch Gambit game, 2026-11-04), through the
  // one registry: where the king goes when it must walk, the castling-by-hand
  // plan and each step, the bishop kept home to block a check, the rule of
  // thumb. A lesson shows its line, so every move is named (the full text).
  if (i.moverIsStudent !== undefined) {
    const student = mine ? sideOf(i.fenBefore) : sideOf(fenAfter);
    const kingReads: Array<{ f: CoachFact; idea: IdeaKind }> = [
      ...readBoardAll('kingSquares', { fenBefore: i.fenBefore, san: i.san, student, lines: i.reads?.before ?? null, bestUci: i.reads?.before[0]?.moves[0] ?? null }).map((f) => ({ f, idea: 'choice' as IdeaKind })),
      ...readBoardAll('castleByHand', { fenBefore: i.fenBefore, san: i.san, student }).map((f) => ({ f, idea: 'king-safety' as IdeaKind })),
      ...readBoardAll('keptHome', { fenBefore: i.fenBefore, san: i.san, student }).map((f) => ({ f, idea: 'king-safety' as IdeaKind })),
      ...readBoardAll('kingFromCentre', { fenBefore: i.fenBefore, san: i.san, student }).map((f) => ({ f, idea: 'king-safety' as IdeaKind })),
    ];
    for (const { f, idea } of kingReads) {
      const { heldForm: _held, ...fact } = f;
      facts.push({ ...fact, namesStudentMove: false, source: 'kingWalk', idea, weight: 60 });
    }
    // THE MOVES A PLAYER WEIGHS (weighedMoves, 2026-11-05), through the one
    // registry: the natural move that fails and its line, the move of the
    // same worth and what separates them, the piece's other squares and what
    // goes wrong there. Each candidate's read is the surface's (`reads.weigh`)
    // or, where it read none of its own, the fan before the move — every line
    // of it is a read of its first move. A lesson has no student's rating in
    // hand, so the eye is the cold-start one (`DEFAULT_STUDENT_RATING`).
    const weighReads: readonly WeighRead[] | null = i.reads?.weigh
      ?? (i.reads && i.reads.before.length >= 2 ? i.reads.before.map((l) => ({ evaluation: l.evaluation, mate: l.mate, moves: l.moves, earlier: l.earlier?.moves ?? null })) : null);
    const prior = i.theirLast;
    const weighed: Array<{ f: CoachFact; weight: number }> = [
      ...readBoardAll('temptingRefuted', { fenBefore: i.fenBefore, san: i.san, student, rating: DEFAULT_STUDENT_RATING, reads: weighReads, priorMove: prior }).map((f) => ({ f, weight: 55 })),
      ...readBoardAll('alsoGood', { fenBefore: i.fenBefore, san: i.san, student, rating: DEFAULT_STUDENT_RATING, reads: weighReads }).map((f) => ({ f, weight: 45 })),
      ...readBoardAll('squareChoice', { fenBefore: i.fenBefore, san: i.san, student, rating: DEFAULT_STUDENT_RATING, reads: weighReads, priorMove: prior,
        beaten: i.costCp !== null && i.costCp >= INACCURACY_CP ? i.reads?.before[0]?.moves[0] ?? null : null, namesStudentMoves: true }).map((f) => ({ f, weight: 50 })),
    ];
    for (const { f, weight } of weighed) {
      // A lesson shows its line, so the move is named (the full text).
      const { heldForm: _held, ...fact } = f;
      facts.push({ ...fact, namesStudentMove: false, source: 'weighed', idea: 'choice', weight });
    }
    // THE TEACHING MOVES' NEW COMPUTERS (2026-11-05), through the one
    // registry: the pawn break and what it is for. Its idea is the file it
    // opens, so the briefing's own "opens the c-file" and the break are one
    // idea in the step (the break, which says what for, leads).
    const lastTo = ((): string | null => {
      if (!i.theirLast) return null;
      try { return new Chess(i.theirLast.fenBefore).move(i.theirLast.san).to; } catch { return null; }
    })();
    for (const f of readBoardAll('pawnBreak', { fenBefore: i.fenBefore, san: i.san, student, lastTo })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'file', weight: 55 });
    }
    // Opposite-coloured bishops settled by this move — a plan for the game.
    for (const f of readBoardAll('oppositeBishops', { fenBefore: i.fenBefore, san: i.san, student })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'plan', weight: 50 });
    }
    // THE PLAN'S NEXT STEPS and COMPENSATION (2026-11-12, the writers' "Bd3
    // and Qc2, both aimed at h7" and "a pawn down but slightly better"), off
    // the lesson's read after the move. A lesson shows its line: every move
    // named.
    const after0 = i.reads?.after[0];
    if (after0?.moves.length) {
      for (const f of readBoardAll('planSteps', { fenAfter, line: after0.moves, student, played: playedUci(i.fenBefore, i.san) })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'plan', weight: 52 });
      }
    }
    let standingSaid = false;
    if (after0 && after0.mate == null) {
      for (const f of readBoardAll('compensation', { fenAfter, student, studentCp: after0.evaluation * (student === 'w' ? 1 : -1), line: after0.moves })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'eval', weight: 48 });
        standingSaid = true;
      }
    }
    // THE STANDING WHEN THE MOVE CHANGED IT — Review's verdict and its board
    // reason, the one producer (`evalReading`). Compensation is the same idea
    // said with its reason, so it stands alone when it speaks.
    const before0 = i.reads?.before[0];
    if (!standingSaid && after0 && after0.mate == null && before0 && before0.mate == null) {
      const pov = (cp: number): number => cp * (student === 'w' ? 1 : -1);
      const m = (() => { try { return new Chess(i.fenBefore).move(i.san); } catch { return null; } })();
      const text = evalReading(fenAfter, pov(before0.evaluation), pov(after0.evaluation), null, student, m ? { to: m.to, captured: m.captured ?? null } : null);
      if (text) add('eval', 'evalReading', 'evalRead', 'eval', text, undefined, [], 45);
    }
  }
  // THE REPLY TREE (his "if Black plays Qe7, you play d4, cementing the
  // knight"), through the one registry: the replies likely at this level and
  // the engine's best, each with the answer its own line proves, off the
  // lesson's read of every reply. The line's own next move is the line itself,
  // so its branch is not said again. A lesson shows its line: every move named.
  const every = i.reads?.everyAfter;
  if (i.moverIsStudent !== undefined && every && every.replies.length) {
    const student = mine ? sideOf(i.fenBefore) : sideOf(fenAfter);
    let next: string | null = null;
    try { const m = i.line?.[0] ? new Chess(fenAfter).move(i.line[0]) : null; next = m ? `${m.from}${m.to}${m.promotion ?? ''}` : null; } catch { next = null; }
    for (const f of readBoardAll('ifTheyPlay', { fen: fenAfter, replies: every.replies, rating: every.rating, student, seconds: (i.reads?.after ?? []).map((l) => l.moves), played: next, tense: 'live', liveBoard: null })) {
      const { heldForm: _held, ...fact } = f;
      facts.push({ ...fact, namesStudentMove: false, source: 'ifTheyPlay', idea: fact.stakes && 'mate' in fact.stakes && fact.stakes.mate ? 'mate' : 'choice', weight: 60 });
    }
    // THE BAIT (WO-COACH-NEXT-TO-YOU-01 C4): the trap the student's move set —
    // the reply many players at this level choose that loses.
    for (const f of readBoardAll('baitSet', { fen: fenAfter, replies: every.replies, rating: every.rating, student, seconds: (i.reads?.after ?? []).map((l) => l.moves), played: next, tense: 'live', liveBoard: null })) {
      facts.push({ ...f, namesStudentMove: false, source: 'baitSet', idea: f.stakes && 'mate' in f.stakes && f.stakes.mate ? 'mate' : 'choice', weight: 60 });
    }
  }
  return withDecisionGap(facts, i, from, to, seat);
}

/** THE GROUPS THAT EXPLAIN ONE DECISION (rule 1, stakes.md §5.2): the move's
 *  facts, their side's answer to it, and the line that proves it. */
const DECISION_GROUPS: ReadonlySet<FactGroup> = new Set<FactGroup>(['move', 'theirSide', 'line']);

/** WHAT RIDES ON THE MOVE'S DECISION (WO-STORY-MATRIX-01 P1-10, rule 1): the
 *  gap between the move and the next-best, in expected score, off the
 *  lesson's or the record's fan before it — the best move against the
 *  runner-up, or a move worse than the best against the best (paid). Null
 *  when the fan cannot say (no reads, one line). */
export function decisionGap(fenBefore: string, uci: string, reads: IntentReads | null, costCp: number | null): number | null {
  const lines = reads?.before ?? [];
  if (lines.length === 0) return null;
  const best = moverCp(fenBefore, lines[0]);
  if (lines[0].moves[0] === uci) return lines[1] ? wcGap(best, moverCp(fenBefore, lines[1])) : null;
  const own = lines.find((l) => l.moves[0] === uci);
  if (own) return wcGap(best, moverCp(fenBefore, own));
  return costCp !== null ? wcGap(best, best - costCp) : null;
}

/** RULE 1 — ONE DECISION, ONE GAP: every fact explaining the move shares the
 *  move's gap, and a fact claims no more than its own proof shows
 *  (`wc = min(G, own)`): "develops with tempo, hitting the queen" and "attacks
 *  their queen" tie on Nc3 and the fitted weights decide; the queen's points
 *  belong to their next decision. With no gap known the whole group is
 *  `unmeasured` — a partial gap is never written (Build 4: partial coverage
 *  made stakes a switch). The choices are re-read on the same curve, against
 *  the best move's own score. */
function withDecisionGap(facts: ThoughtFact[], i: MoveThoughtInput, from: string, to: string, seat: FactSeat): ThoughtFact[] {
  const decision = `${i.fenBefore}|${seat}`;
  const promo = (() => { try { return new Chess(i.fenBefore).move(i.san).promotion ?? ''; } catch { return ''; } })();
  const g = decisionGap(i.fenBefore, `${from}${to}${promo}`, i.reads, i.costCp);
  const best = i.reads?.before[0] ? moverCp(i.fenBefore, i.reads.before[0]) : null;
  return facts.map((f) => {
    if (DECISION_GROUPS.has(f.group)) {
      if (g === null) return { ...f, stakes: NO_STAKES.unmeasured };
      const own = isStaked(f.stakes) ? stakeWc(f.stakes) : g;
      const wc = Math.min(g, own);
      return { ...f, stakes: { points: isStaked(f.stakes) ? f.stakes.points : wc, plies: 0, wc, decision, ...(isStaked(f.stakes) && f.stakes.mate ? { mate: f.stakes.mate } : {}) } };
    }
    if (f.group === 'choices' && best !== null && isStaked(f.stakes)) {
      return { ...f, stakes: { ...f.stakes, wc: wcGap(best, best - f.stakes.points * 100), decision } };
    }
    return f;
  });
}

/** A LESSON'S LINE FOR ONE MOVE (WO-ONE-COACH-01): the move's facts through
 *  the one composer with the lesson's say-once memory and phrase memory.
 *  Replaces the briefing's
 *  top-three clause list (`lessonBeat`), which picked by aspect weight alone,
 *  cut at three and never heard the move's job or its fundamentals. '' when
 *  nothing earned a word: silence beats a repeat. */
export function lessonThought(shown: Omit<MoveThoughtInput, 'phrases' | 'tense'>, voice: LessonVoice, refuted: RefutedAlternative | null): string {
  // A lesson shows the move as it is played: its words are the present's.
  const input: Omit<MoveThoughtInput, 'phrases'> = { ...shown, tense: 'now' };
  // The line's story is at this move's ply: what it says is said here.
  voice.story.reach(plyOfFen(input.fenBefore));
  const facts = moveThoughtFacts({ ...input, phrases: voice.phrases });
  const alt = refuted ? refutedFact(refuted, input.fenBefore, input.moverIsStudent !== false ? 'student' : 'opponent') : null;
  const purpose = purposeFact(input, voice);
  return composeThought([...facts, ...(alt ? [alt] : []), ...(purpose ? [purpose] : []), ...studentMoveFacts(input)], 'lesson', voice, NOT_LED).spoken;
}

/** THE QUESTION PICKS THE IDEAS (the reversed matrix, David 2026-11-06:
 *  "help answer questions from users"). A question about a move is answered by
 *  the same facts a lesson says on it, through the same composer, keeping only
 *  the groups the question asks about ("why did they play that?" — their
 *  move, their side, the danger, the line; `questionThought.QUESTION_IDEAS`):
 *  one ordering for every surface, never a lane's own stack of sentences. */
export function questionThought(asked: Omit<MoveThoughtInput, 'phrases' | 'tense'>, groups: ReadonlySet<FactGroup>, refuted: RefutedAlternative | null, reason: DecisiveReason | null): ComposedThought {
  // A question is answered on the board in front of the student, in the present.
  const input: Omit<MoveThoughtInput, 'phrases'> = { ...asked, tense: 'now' };
  const voice = newLessonVoice();
  voice.story.reach(plyOfFen(input.fenBefore));
  const facts = moveThoughtFacts({ ...input, phrases: voice.phrases });
  const alt = refuted ? refutedFact(refuted, input.fenBefore, input.moverIsStudent !== false ? 'student' : 'opponent') : null;
  const purpose = purposeFact(input, voice);
  const next = reason ? nextBestFact(reason, input.fenBefore, input.moverIsStudent !== false ? 'student' : 'opponent') : null;
  const all = [...facts, ...(alt ? [alt] : []), ...(next ? [next] : []), ...(purpose ? [purpose] : []), ...studentMoveFacts(input)];
  return composeThought(all.filter((f) => groups.has(f.group)), 'chat', voice, NOT_LED);
}

/** WHAT LEARN'S STUDENT-MOVE LANES MAY SAY IN A LESSON, AND AS WHICH IDEA
 *  (WO-STORY-MATRIX-01 P1-9c): one answer per lane `studentMoveTeaching`
 *  (and its `orderTeaching`) can emit. Null = not said in a lesson, with the
 *  reason. A lane missing here is never said in a lesson (gate:
 *  `moveThoughtFacts.test` — every lane the bundle emits is answered). */
export const LESSON_STUDENT_LANE: Partial<Record<LearnLane, IdeaKind | null>> = {
  recapture: 'recapture',
  fileRace: 'file',
  trade: 'trade',
  timing: 'tempo',
  kingAttack: 'attack-king',
  ruleException: 'develop',
  falseAlarm: 'threat',
  pushOrHold: 'passed-pawn',
  structureJudgement: 'weakness',
  pawnEnding: 'king-activity',
  captureChoice: 'recapture',
  tradeLedger: 'trade',
  openingEquivalence: 'develop',
  breakRace: 'passed-pawn',
  holdResource: 'prevent',
  kickMap: 'tempo',
  patternFails: 'tactic',
  // The line a winning move wins: the lesson's own played-out line says it
  // (deliberation, `moverLineProof`) — said twice otherwise.
  movePoint: null,
  // "Not yet": the lesson's in-between-move fact owns it (`inBetweenMove`).
  notYetPlayed: null,
  // A games-database statistic is not a reason (WO-ONE-COACH-01 map).
  strongChoice: null,
  // A slip's habits: a taught line's move is never the student's slip.
  kneeJerk: null,
  blunderCheck: null,
  autopilot: null,
  keepPressing: null,
};

/** Learn's student-move bundle, read for a lesson's move by the student
 *  (both reads and the move's cost from the lesson's engine pass), each lane
 *  said as the idea the table names. Lesson-only: Review calls the bundle
 *  through its own producers. */
function studentMoveFacts(i: Omit<MoveThoughtInput, 'phrases'>): ThoughtFact[] {
  if (i.moverIsStudent !== true) return [];
  const me = sideOf(i.fenBefore);
  const best = i.reads?.before[0];
  const after = i.reads?.after[0];
  let bestSan: string | null = null;
  try {
    const u = best?.moves[0];
    if (u) bestSan = new Chess(i.fenBefore).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san;
  } catch { bestSan = null; }
  const cpAfter = after && after.mate == null ? after.evaluation * (me === 'w' ? 1 : -1) : null;
  let out: ReturnType<typeof studentMoveTeaching>;
  try {
    out = studentMoveTeaching({
      theory: i.theory, namesStudentMoves: true,
      fenBefore: i.fenBefore, san: i.san.replace(/[!?]+$/, ''),
      history: [...i.history, i.san.replace(/[!?]+$/, '')],
      cpLoss: i.costCp,
      bothCp: !!best && !!after && best.mate == null && after.mate == null,
      bestSan, bestLine: best, reply: i.line?.[0] ?? null,
      linesAfter: (i.reads?.after ?? []).map((l) => l.moves),
      cpAfter, ...(i.reads ? { topLines: i.reads.before } : {}),
    });
  } catch { return []; }
  const facts: ThoughtFact[] = [];
  for (const t of out) {
    const idea = LESSON_STUDENT_LANE[t.lane];
    if (!idea) continue;
    const { lane: _lane, event: _event, arrows: _arrows, evidence: _evidence, ownMoveReason: _own, ...fact } = t;
    facts.push({ ...fact, id: `studentMove:${t.lane}:${facts.length}`, source: 'studentMove', idea, weight: 50 });
  }
  return facts;
}

/** WHAT THE MOVE PREPARES, PROVEN, WITH THE RULE BEHIND IT (WO-STORY-MATRIX-01
 *  P1-9c): the follow-up the move made possible, read against the null-move
 *  reads (`moveIntent`), and once a lesson the principle that makes that
 *  follow-up worth it (`intentRule` → `ruleForPurpose`, "…and castling is
 *  worth it because …") — Learn's own line. A lesson only: Review says the
 *  move's purpose through its own intent read. Null without the pass reads,
 *  which are the proof. */
function purposeFact(i: Omit<MoveThoughtInput, 'phrases'>, voice: LessonVoice): ThoughtFact | null {
  if (!i.reads || i.moverIsStudent === undefined) return null;
  if (i.reads.passBefore.length === 0 && i.reads.passAfter.length === 0) return null;
  const seat: FactSeat = i.moverIsStudent ? 'student' : 'opponent';
  // The line the lesson goes on with: a move it plays was not "stopped".
  const lineAfter: string[] = [];
  if (i.tense === 'now' && i.line) {
    try {
      const c = new Chess(i.fenBefore);
      c.move(i.san);
      for (const s of i.line) { const m = c.move(s); lineAfter.push(`${m.from}${m.to}${m.promotion ?? ''}`); }
    } catch { /* the playable prefix */ }
  }
  const intent = moveIntent(i.fenBefore, i.san, lineAfter.length ? { ...i.reads, lineAfter } : i.reads, seat);
  if (!intent?.prepares) return null;
  const mover = sideOf(i.fenBefore);
  const studentColor: 'white' | 'black' = (mover === 'w') === i.moverIsStudent ? 'white' : 'black';
  // The rule is said on the board where the prepared move would be played:
  // after the reply in the line.
  let rule: { text: string; keys: string[] } | null = null;
  const reply = i.line?.[0];
  if (reply) {
    try {
      const c = new Chess(i.fenBefore);
      c.move(i.san);
      c.move(reply);
      const taught = keysUnder(voice.story.heard(c.fen()).claims, STORY_KEY.principle(''));
      rule = intentRule(intent, c.fen(), studentColor, taught);
    } catch { rule = null; }
  }
  const text = rule ? `${intent.text.replace(/\.$/, '')} — ${rule.text}.` : intent.text;
  const kind: CoachFactKind = i.moverIsStudent ? 'point' : 'opponent-intent';
  return {
    id: `moveIntent:${intent.prepares.uci}`, namesStudentMove: false,
    ...placeFact(kind, seat), computer: 'moveIntent', source: 'purpose', idea: 'prepare', text: close(text),
    squares: intent.squares, weight: 58, thread: LOCAL_THREAD, stakes: stakesOf(kind, costStakes(intent.prepares.gainCp)),
    proof: squaresProof(text, intent.squares) ?? NO_PROOF.description, seat, fen: i.fenBefore,
    claims: [`purpose:prepares:${intent.prepares.uci}`, ...(rule?.keys.map((k) => STORY_KEY.principle(k)) ?? [])],
  };
}

/** THE NEXT-BEST MOVE, AS A CHOICE (the reversed matrix, 2026-11-06): "why
 *  is it best?" asks what the move does AND why the others fall short. The
 *  decisive reason's other moves (`DecisiveReason.choice`: "Anything else,
 *  like a3, gives up about half a point", "The other plan is O-O…", "Bxh7+?
 *  That drops the queen") are the choices step; what the move does is the
 *  move's own facts. Null when the reason says nothing about the other moves. */
export function nextBestFact(r: DecisiveReason, fenBefore: string, seat: FactSeat): ThoughtFact | null {
  const text = r.choice;
  if (!text) return null;
  const said = close(text);
  let squares: string[] = [];
  try { if (r.nextBestSan) { const m = new Chess(fenBefore).move(r.nextBestSan); squares = [m.from, m.to]; } } catch { squares = []; }
  const mover = sideOf(fenBefore);
  const student = seat === 'student' ? mover : mover === 'w' ? 'b' : 'w';
  const line = r.about === 'alternative' && r.line ? lineProof(r.line, lineSeatAt(r.line.fen, student)) : null;
  return {
    id: 'decisiveReason:next-best', namesStudentMove: false,
    // "About as good" is no cost: it rides on nothing, so a choice the board
    // proves (the other squares, the other move's refutation) leads the step.
    ...placeFact('refuted', seat), computer: 'decisiveReason', source: 'alternatives', idea: 'choice', text: said, squares, weight: r.kind === 'close' ? 40 : 52,
    thread: LOCAL_THREAD, stakes: stakesOf('refuted', r.kind === 'close' ? null : costStakes(r.gapCp)), proof: line ?? squaresProof(said, squares) ?? NO_PROOF.description, seat, fen: fenBefore,
    claims: [`refuted:${(r.nextBestSan ?? '').replace(/[+#!?]+$/, '')}`],
  };
}

/** THE MOVE MOST PLAYERS CHOOSE HERE INSTEAD, AS A CHOICE (WO-STORY-MATRIX-01
 *  P1-9): what it costs and the line that punishes it (`refutedFromFan`), in
 *  the choices step beside the engine's own rule-outs — so the composer, not a
 *  splice after it, decides which of them the move's thought says. Lessons
 *  read it off the games database; null where a surface has none. */
export function refutedFact(r: RefutedAlternative, fenBefore: string, seat: FactSeat): ThoughtFact {
  const said = close(r.text);
  let squares: string[] = [];
  try { const am = new Chess(fenBefore).move(r.alt); squares = [am.from, am.to]; } catch { squares = []; }
  return {
    id: 'refutedFromFan:0', namesStudentMove: false,
    ...placeFact('common-wrong', seat), computer: 'refutedFromFan', source: 'refuted', idea: 'choice', text: said, squares, weight: 55,
    thread: LOCAL_THREAD, stakes: stakesOf('common-wrong', costStakes(r.costCp)), proof: refutedAltProof(fenBefore, r) ?? squaresProof(said, squares) ?? NO_PROOF.description, seat, fen: fenBefore,
    claims: [`refuted:${r.alt.replace(/[+#!?]+$/, '')}`],
  };
}

function sideOf(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

/** Does the side that just moved go on to play `mv` (from → to) in `line`
 *  (SAN from `fenAfter`, the other side's reply first)? */
function linePlays(fenAfter: string, line: readonly string[], mv: { from: string; to: string }): boolean {
  try {
    const c = new Chess(fenAfter);
    for (let k = 0; k < line.length; k += 1) {
      const m = c.move(line[k]);
      if (k % 2 === 1 && m.from === mv.from && m.to === mv.to) return true;
    }
  } catch { /* the playable prefix was read */ }
  return false;
}

/** Whether the reply that follows in the line answers their aim — the same
 *  test the reply's own binding makes, from each point the reply may have
 *  (what it sets up, what it threatens, what the moved piece hits). */
function replyAnswers(fen: string, line: readonly string[] | null, aim: NonNullable<ReturnType<typeof theirTarget>>): boolean {
  const reply = line?.[0];
  if (!reply) return false;
  const deep = deepFact(fen, reply, line.slice(1), true);
  const threat = moveAspects({ fenBefore: fen, san: reply, prev: NO_PREV_CAPTURE, moverIsStudent: true, follow: NO_FOLLOW })?.threat?.san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?:=[QRBN])?$/)?.[1] ?? null;
  return [deep?.target ?? null, threat, moveHit(fen, reply)].some((own) => bindingFact(fen, reply, aim, own, true) !== null);
}

