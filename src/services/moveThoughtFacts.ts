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
import type { SpokenLine } from './voicePackage';
import { openingTheoryFacts } from './openingTheory';
import { moveStops, stopsBreak } from './moveStops';
import { orderByThreat } from './orderByThreat';
import { namedStructureFormed, namedStructureLine } from './namedStructure';
import { pieceOutFirst } from './pieceOutFirst';
import { lineCut } from './lineCut';
import { pieceCage } from './pieceCage';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { criticalityThresholds } from './criticalityScan';
import { knownSlipIndexNow, knownSlipsAt } from './knownSlips';
import { detectOpeningByOrder } from './openingDetectionService';
import { preparesBreakClause } from './mastersPlanRead';
import { storyPlanAfter } from './openingStory';
import { transposedOpening } from './openingPositions';
import { openingEquivalence } from './openingEquivalence';
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
import { moverCp, seatCp, wcGap, type LineScore } from './winChance';
import { playedUci } from './planSteps';
import { evalReading, signedBand } from './reviewMoveBriefing';
import { counterThreatTeaching, planChoiceTeaching, studentMoveTeaching } from './learnBoardTeaching';
import type { LearnLane } from './learnTurnDoor';
import { computeMustDefend } from './threatOut';
import { moveOrder } from './moveOrder';
import { readBoardAll, readKey } from './boardComputers';
import { pvLineFromUci } from './pvPlayback';
/** A SAN line from a board, as UCI (moves it cannot play end it). */
function sansToUci(fen: string, sans: readonly string[]): string[] {
  const out: string[] = [];
  try { const c = new Chess(fen); for (const s of sans) { const m = c.move(s); out.push(`${m.from}${m.to}${m.promotion ?? ''}`); } } catch { /* stop at the first move that does not play */ }
  return out;
}
/** A line decisive for its mover: two and a half pawns or mate (Review's deep-threat floor). */
const DECISIVE_LINE_CP = 250;
import { detectTactics } from './tacticsDetector';
import { thinkStepOf } from './thinkingComputers';
import { desperadoAt, desperadoLine } from './desperado';
import { emptyCheckAt, emptyCheckLine } from './emptyCheck';
import type { ThinkingStep } from './thinkingSteps';
import type { WeighRead } from './weighedMoves';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { BLUNDER_CP, INACCURACY_CP, MATE_EVAL_VALUE, MISTAKE_CP } from './engineConstants';
import { allowedClause, costReason } from './costReason';
import { moveThreat } from './moveThreat';
import type { AnalysisLine } from '../types';
import { gambitIdea } from './gambitIdea';
import { campIdea } from './intoTheirCamp';
import { exchangeSacIdea } from './exchangeSacrifice';
import { majorityIdea } from './pawnMajority';

export interface MoveThoughtInput {
  fenBefore: string;
  san: string;
  /** REQUIRED: the student's record shows they see plain threats
   *  (`StudentRecord.plainThreats` green) — then a plain hit, plainly answered,
   *  is not said. A lesson has no record: false (taught). */
  plainThreatsSeen: boolean;
  /** REQUIRED: the tense the move is introduced in (`moveIntro.IntroTense`):
   *  'now' for a move being shown (a lesson, a question), 'past' for a move
   *  already played (Review's walk), built in that tense where it is made. */
  tense: IntroTense;
  /** REQUIRED — may the words name the move being read? Review, the lessons
   *  and chat name it ("You went for Rxd3, which …"); Learn never names the
   *  student's own move once it is played (LEARN NAMES NO MOVE UNASKED — "the
   *  user knows that, they see it play out"), so there the student's move is
   *  "your move". Their move is named on every surface. */
  namesPlayedMove: boolean;
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
  /** REQUIRED: the opening's story rides in this thought (a lesson, an
   *  answer). Review says its story through its own lines and answers false,
   *  so it does not pay ~45 ms a move for facts it drops. */
  story: boolean;
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
  // The student's move, unnamed where the surface does not name it.
  const unnamed = i.moverIsStudent === true && !i.namesPlayedMove;
  const lead = (clause: string): string => (unnamed ? `Your move ${clause}` : i.moverIsStudent === undefined ? `${san}: it ${clause}` : introWithPredicate(seat, san, clause, i.tense));
  const gerund = (clause: string): string => (unnamed ? `With your move you were ${clause}` : i.moverIsStudent === undefined ? `${san}: ${clause}` : introWithGerund(seat, san, clause, i.tense));
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
  const add = (kind: CoachFactKind, computer: ComputerName, source: ThoughtSource, idea: IdeaKind, text: string, alsoText: string | undefined, squares: readonly string[], weight: number, restates = false, extraClaims: readonly string[] = [], lines?: readonly SpokenLine[]): void => {
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
      ...(lines && lines.length > 0 ? { lines } : {}),
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
    // EVERY MATE ON THE BOARD (his "two mates in one, look for both"): the
    // other moves that mated, said behind the mate — the choices it had.
    if (i.moverIsStudent !== undefined) {
      const student = mine ? sideOf(i.fenBefore) : sideOf(fenAfter);
      for (const f of readBoardAll('everyMate', { fenBefore: i.fenBefore, san: i.san, student })) {
        facts.push({ ...f, namesStudentMove: false, source: 'boardRead', idea: 'choice', weight: 70 });
      }
    }
    return facts;
  }
  for (const a of read?.aspects ?? []) {
    // The long horizon is a fixed phrase: said with its first two changes of
    // its kind in a lesson or a game (the WHY rule), then the change alone.
    const verb = a.horizon && horizonSaid(i.phrases, a.kind) ? `${a.verb}${a.horizon}` : a.verb;
    add(a.kind, 'moveAspects', 'briefing', a.idea, lead(verb), `It also ${verb}`, a.squares, a.weight, a.restates === true);
  }

  // WHAT THE MOVE THREATENS, DEEPER (fix 3, 2026-11-13): the one-move threat
  // above is the briefing's; a threat two or three moves long (Bg5 → Bxf6 and
  // cxd5) is read off the null-move line (`moveThreat`). Not on a costly move:
  // its line is what it allows, said below.
  const oneMoveThreat = (read?.aspects ?? []).some((a) => a.kind === 'aspect-threat');
  if (!oneMoveThreat && i.reads && i.reads.passAfter.length > 0 && (i.costCp === null || i.costCp < MISTAKE_CP)) {
    const mover = sideOf(i.fenBefore);
    const studentWB: 'w' | 'b' = mine || i.moverIsStudent === undefined ? mover : mover === 'w' ? 'b' : 'w';
    const t = moveThreat(i.fenBefore, i.san, { before: i.reads.before, after: i.reads.after, passAfter: i.reads.passAfter }, studentWB);
    if (t) add('aspect-threat', 'moveThreat', 'moveThreat', /^threatens mate/.test(t.clause) ? 'mate' : 'threat', lead(t.clause), `It also ${t.clause}`, t.squares, /^threatens mate/.test(t.clause) ? 94 : 86, false);
  }

  // WHAT A COSTLY MOVE ALLOWS (fix 1, 2026-11-13): a move the engine grades a
  // mistake or worse is said with the line that punishes it — the one cost
  // computer every surface grades with (`costReason`), worded by its one
  // renderer, both seats from the student's. The Stafford's Bxd8 said "it
  // wins a queen for a bishop" and nothing of …Bxf2+ Ke2 Bg4#; Ke2 allowing
  // …Qxe4# said a model game's name and nothing else.
  const after0r = i.reads?.after[0];
  // A MOVE THAT WALKS INTO A FORCED MATE costs everything, though no
  // centipawn number says so (a mate read has none — bench 2026-11-13: the
  // Scandinavian's 3.Ke2?? allowing …Qe4# was said to "prepare Qe1").
  const moverOfMove = sideOf(i.fenBefore);
  const matedAfter = (l: AnalysisLine | undefined): boolean => !!l && l.mate !== null && l.mate !== undefined && (moverOfMove === 'w' ? l.mate < 0 : l.mate > 0);
  const allowsMate = matedAfter(after0r) && !matedAfter(i.reads?.before[0]);
  const costOrMate = allowsMate ? Math.max(i.costCp ?? 0, MATE_EVAL_VALUE) : i.costCp;
  // A mistake or worse: what it allows is the lesson, not what it stops.
  const losesBig = costOrMate !== null && costOrMate >= MISTAKE_CP;
  // A BLUNDER IS NOT PRAISED (round-2 read 2026-11-13: …e6?? dropping the
  // queen to Bxd8 opened with "it opens the diagonal for your bishop"). Its
  // development and board points are dropped; what it loses is the lesson.
  const blunder = costOrMate !== null && costOrMate >= BLUNDER_CP;
  if (costOrMate !== null && costOrMate >= MISTAKE_CP && after0r && after0r.moves.length > 0) {
    const mover = sideOf(i.fenBefore);
    const studentWB: 'w' | 'b' = mine ? mover : mover === 'w' ? 'b' : 'w';
    const earlier = after0r.earlier?.moves;
    const r = costReason({
      fenBefore: i.fenBefore, playedSan: i.san, mover, student: studentWB, costCp: costOrMate,
      after: { uci: after0r.moves, source: 'deep', seconds: earlier && earlier.length > 0 ? [earlier] : [] },
      before: null, priorMove: null, against: i.reads?.before[0]?.moves ?? null,
    });
    const clause = r ? allowedClause(r, studentWB) : null;
    if (r && clause) {
      const sq = r.plies.slice(0, r.blowPlies).map((p) => p.uci.slice(2, 4));
      add('consequence', 'allowedClause', 'costReason', r.mate ? 'mate' : 'win-material', lead(clause), `It ${clause}`, sq, 92, false, [`allows:${r.plies[0]?.uci ?? ''}`]);
    }
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
    // A JOB THAT SAYS THE CHECK says the check's claim too ("gives check and
    // takes your queen out of reach"), so "it checks the king" is not said
    // again behind it; a bare "it gives check" is the check itself.
    const saysCheck = /^gives check\b/.test(clause);
    const idea: IdeaKind = job.clause === 'it gives check' ? 'check' : BOOK_JOB_IDEA[job.kind];
    add('move-job', 'moveJob', 'moveJob', idea, lead(clause), `It also ${clause}`, job.squares, JOB_WEIGHT[job.kind], isBareJob(job), [
      ...(saysCheck ? [`move:${from}${to}:${ideaClaim('check', [])}`] : []),
      ...(job.prepsCastle ? [castlePrepClaim(from, to)] : []),
    ]);
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
  // Only the stock phrases are taught once a lesson (develop, centre, castle,
  // space); a specific fact is never one ("h6 takes the g5 square away from
  // your bishop" was held because c6 had taken b5 — the h6 turn said nothing).
  const STOCK_PHRASE: ReadonlySet<IdeaKind> = new Set<IdeaKind>(['develop', 'center', 'castle', 'space']);
  const seated = (clause: string): string => (mine ? clause : toOtherSeat(clause));
  for (const f of blunder ? [] : computeMoveFundamentals(i.fenBefore, i.san, sideOf(i.fenBefore) === 'w' ? 'white' : 'black')) {
    // A PUSH THE RULE CALLS PREPARED IS ONE A LINE GOES ON TO PLAY (task 172:
    // "…d6 prepares e5 — when the e-pawn goes forward, it will be supported"
    // in the Benko, where no line of the engine's and no move of the lesson's
    // plays …e5). The rule reads the board — the square is guarded now — and
    // the board cannot say the push is the plan; the lines the surface knows
    // follow can. With none known, the board is all there is.
    if (f.id === 'prepare-break' && f.names && follow.length > 0 && !follow.some((line) => linePlays(fenAfter, line, f.names as { from: string; to: string }))) continue;
    // DEVELOPING WITH TEMPO IS A TEMPO, not a plain develop (2026-11-12): "Nc3
    // develops into the game with tempo, hitting the queen" says why the move
    // was played; the plain develop is what anyone sees, and goes last.
    const idea: IdeaKind = f.id === 'development' && f.forcing ? 'tempo' : FUNDAMENTAL_IDEA[f.id];
    add('fundamental', 'computeMoveFundamentals', 'fundamental', idea, lead(seated(f.led)), `It also ${seated(f.led)}`, f.squares, f.weight, false, STOCK_PHRASE.has(idea) ? [`phrase:${idea}`] : []);
  }

  // THE BOARD TEACHER — the move's idea on the board, from the speaker's seat.
  const teacher = blunder ? null : buildReviewMoveTeachingFact(i.fenBefore, i.san, mine, i.phrases);
  if (teacher) {
    const subjectLed = /^(The|A|An|This|That|Their|Your)\b/.test(teacher.text);
    // Its develop reading is its last resort ("the knight develops to d2,
    // joining the game") — the move read back, said only when nothing else is.
    add('board-teacher', 'buildReviewMoveTeachingFact', 'boardTeacher', teacher.idea, unnamed ? gerund(toClause(teacher.text)) : joinReview([toClause(teacher.text)], i.moverIsStudent, i.san, i.tense),
      subjectLed ? teacher.text : `It also ${continueSentence(teacher.text)}`, teacher.squares, 50, teacher.idea === 'develop' || teacher.restates === true);
  }

  // THE DEEP FACT — what the move made possible down the line.
  const deep = deepFact(i.fenBefore, i.san, i.line, mine);
  // A deep fact that TAKES a piece is about that piece too: its square rides
  // on the fact, so a move that already attacks it does not say it twice
  // ("Re2 attacks their pawn on c2. It also takes their pawn on c2 next").
  // ITS LINE IS DRAWN (marks sweep 2026-11-12: "It also heads on to e6 a move
  // later, where it gives check" was said in Review with nothing drawn): the
  // moves from this board to the follow-up, played on the walk's board.
  if (deep) add('deep-fact', 'deepFact', 'deepFact', 'set-up', gerund(deep.text), `It also ${deep.verb}`, /x/.test(deep.follow.san) ? [deep.follow.to, deep.target] : [deep.target], 56, false, [],
    i.line && i.line.length > deep.lineIndex ? [{ fen: fenAfter, sans: i.line.slice(0, deep.lineIndex + 1) }] : undefined);

  // THE ANSWER TO THEIR LAST MOVE — what it aimed at, and how this meets it.
  const tgt = theirTarget(i.theirLast, mine, i.plainThreatsSeen);
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
    const aim = theirTarget({ fenBefore: i.fenBefore, san: i.san }, true, i.plainThreatsSeen);
    // Only an aim the student has to answer: a piece that really falls
    // (`computeMustDefend`, SEE-checked) — a capture that is taken straight
    // back, or a piece eyed behind its guards, aims at nothing.
    const threatened = aim ? computeMustDefend(fenAfter, sideOf(fenAfter)).pieces.some((p) => p.square === aim.square) : false;
    if (aim && threatened && !replyAnswers(fenAfter, i.line, aim)) {
      add('opp-target', 'theirTarget', 'theirAim', 'threat', openSentence(aim.text), openSentence(aim.text), [aim.square, aim.by], 45, false, [`aim:${aim.by}:${aim.square}`]);
    }
  }

  // OPENING THEORY, CALCULATED (David 2026-11-12: "I want the gap filled"):
  // the masters' games at this board — the main move or a sideline, the other
  // main tries and what each aims for, the reply masters give, how it scores.
  // On every surface (David: "the new lines we are adding is what I want on").
  // Their move's expected reply is the student's next move: a surface that may
  // not name it holds it (`namesStudentMove`).
  for (const t of openingTheoryFacts(i.fenBefore, i.san, mine)) {
    // Only the standing is said about the move itself ("You play c4: masters
    // usually play it"); the rest are sentences of their own steps.
    const own = t.kind === 'book-standing';
    add(t.kind, 'openingTheoryFacts', 'openingTheory', 'theory', own ? lead(t.clause) : t.sentence, t.sentence, t.squares, 40, false, [`theory:${t.kind}:${t.names.join(',')}`]);
    if (t.kind === 'book-reply' && !mine) facts[facts.length - 1] = { ...facts[facts.length - 1], namesStudentMove: true };
  }

  // A PIECE OUT BEFORE ITS PAWN SHUTS IT IN (gap B1): "…Bf5 comes out
  // before …e6, which would shut the bishop in". Read off the line that
  // follows (the lesson's, the game's, the engine's).
  const outFirst = pieceOutFirst(i.fenBefore, i.san, i.line ?? follow[0] ?? []);
  if (outFirst) {
    // Said as theory teaches it, the question first (gap E1), rotated on the
    // board so a lesson never repeats one form.
    const also = rotateStem([
      `The ${outFirst.piece} comes out before ${outFirst.pawn}, which would have shut it in`,
      `Why not ${outFirst.pawn} first? It would have shut the ${outFirst.piece} in`,
    ], stemKeyOf(`${i.fenBefore}|${i.san}`));
    // Its own step ("not yet, first this") follows the move's: said as a
    // sentence of its own, never a second intro of the same move.
    add('move-order', 'pieceOutFirst', 'moveGains', 'order', also, also, outFirst.squares, 72, false, [`out-first:${outFirst.squares.join('')}`]);
  }
  // THE ORDER, READ OFF THE BOARD (gap B1): the mover's next move in the line,
  // played first, would let them pin, fork or kick — this order does not.
  const orderLine = i.line ?? follow[0] ?? [];
  const order = outFirst ? null : orderByThreat(i.fenBefore, i.san, orderLine, mine, followPvOf(i.fenBefore, orderLine[1], i.reads?.before ?? []));
  if (order && orderMatters(i.fenBefore, i.san, order.follow, i.reads?.before ?? [])) {
    const does = order.would.replace(/^would (\w+)/, (_m, v: string) => `${v}s`);
    const said = rotateStem([
      `Why not ${order.follow} first? It would allow ${order.answer}, which ${does}`,
      `The order matters: ${order.follow} straight away would allow ${order.answer}, which ${does}`,
    ], stemKeyOf(`${i.fenBefore}|${i.san}|order`));
    // ONE CLAIM WITH THE STOP ON THE SAME REPLY: "it stops …c4" and "Re1 at
    // once would allow …c4" are one idea (colle800 16.e5) — the stop says it.
    add('move-order', 'orderByThreat', 'moveGains', 'order', said, said, order.squares, 72, false, [`order-board:${order.follow}>${order.answer}`, `stops:${order.answer}`]);
  }

  // TWO PIECES HANGING: SELL THE ONE YOU CANNOT SAVE (desperado, Danya 1Rejj):
  // the engine's best move is a capture by one of two hanging pieces.
  {
    const d = desperadoAt(i.fenBefore, i.san, i.reads?.before[0]?.moves[0] ?? null);
    if (d) add('defence-idea', 'desperadoAt', 'desperado', 'rescue', desperadoLine(d, mine ? 'your' : 'their', i.fenBefore), undefined, [d.from, d.to, ...(d.other ? [d.other.square] : [])], 66, false, [`desperado:${d.from}${d.to}`]);
  }

  // A CHECK THAT GOES NOWHERE (Danya Ytkf3): it cost half a pawn and the
  // engine's answer is a block or a king step.
  {
    const e = emptyCheckAt(i.fenBefore, i.san, i.costCp, i.reads?.after[0]?.moves[0] ?? null);
    if (e) add('method', 'emptyCheckAt', 'emptyCheck', 'check', emptyCheckLine(e, mine ? 'your' : 'their', i.fenBefore), undefined, e.squares, 58, false, [`empty-check:${e.squares.join('')}`]);
  }

  // THE TRADES (Danya speedruns, S4): the even trade offered while ahead, the
  // rook trade for an open file, the trade into a won pawn ending, and the
  // trade on offer kept off the board for a reason the board proves — each
  // read off the engine lines around the move, through the one registry.
  if (i.reads) {
    const mover = sideOf(i.fenBefore);
    const studentWB: 'w' | 'b' = mine ? mover : mover === 'w' ? 'b' : 'w';
    const a0: AnalysisLine | null = i.reads.after.length > 0 ? i.reads.after[0] : null;
    const afterCp = a0 ? (a0.mate != null ? (a0.mate > 0 ? 1 : -1) * MATE_EVAL_VALUE : a0.evaluation) * (mover === 'w' ? 1 : -1) : null;
    const priorMove = (() => {
      if (!i.theirLast) return null;
      try { const m = new Chess(i.theirLast.fenBefore).move(i.theirLast.san); return { to: m.to, captured: m.captured ?? null }; } catch { return null; }
    })();
    const base = { fenBefore: i.fenBefore, san: i.san, student: studentWB, costCp: i.costCp };
    // The move's cost from one search, or — where the surface priced nothing
    // (chat's "why that move?") — read off the fan before it when the move is
    // in it: the best line's score less the move's own.
    const b0 = i.reads.before[0];
    const playedUci = (() => { try { const m = new Chess(i.fenBefore).move(i.san); return `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; } })();
    const playedLine = playedUci ? i.reads.before.find((l) => l.moves[0] === playedUci) : undefined;
    const costHere = i.costCp ?? (b0 && playedLine ? Math.max(0, seatCp(b0, mover) - seatCp(playedLine, mover)) : null);
    const trades = [
      ...readBoardAll('tradeOffer', { ...base, afterCp }).map((f) => ({ f, idea: 'trade' as IdeaKind, weight: 64 })),
      ...readBoardAll('fileTrade', { ...base, line: a0?.moves ?? null }).map((f) => ({ f, idea: 'file' as IdeaKind, weight: 66 })),
      ...readBoardAll('pawnEndingTrade', { ...base, after: a0 }).map((f) => ({ f, idea: 'trade' as IdeaKind, weight: 70 })),
      ...readBoardAll('tradeKept', { fenBefore: i.fenBefore, san: i.san, student: studentWB, before: i.reads.before, priorMove, theirLast: i.theirLast }).map((f) => ({ f, idea: 'choice' as IdeaKind, weight: 58 })),
      // THE KEY DEFENDER (Danya group 6): the trade that takes off the piece
      // doing a job no other piece of theirs does, with the engine's word.
      ...readBoardAll('keyDefender', { ...base, costCp: costHere, after: a0 }).map((f) => ({ f, idea: 'trade' as IdeaKind, weight: 68 })),
    ];
    for (const { f, idea, weight } of trades) facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea, weight });
    // PRACTICAL CHANCES (Danya group 7): worse, the move makes them find
    // something — one good reply, a grab that gives the edge back, or a long
    // way through — read on the engine's replies to it.
    {
      const standCp = b0 && b0.mate == null ? seatCp(b0, mover) : null;
      for (const f of readBoardAll('practicalChance', { fenBefore: i.fenBefore, san: i.san, student: studentWB, reads: { moverCp: standCp, costCp: costHere, after: i.reads.after } })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'choice', weight: 70 });
      }
    }
  }

  // TRANSPOSITION AND ANALOGY (gaps A7, A11): "this transposes into the
  // Exchange French"; "a reversed Sicilian", "an Alekhine with c3 and c5
  // thrown in". Every name is a real DB position (the offline index).
  {
    const after = [...i.history, i.san];
    const byOrder = detectOpeningByOrder(after);
    const into = transposedOpening(fenAfter, after.length, byOrder);
    if (into) add('equivalence', 'openingEquivalence', 'openingTheory', 'theory', lead(`transposes into the ${into}`), `It transposes into the ${into}`, [to], 44, false, [`transposed:${into}`]);
    const eq = openingEquivalence(after, mine === (sideOf(i.fenBefore) === 'w') ? 'w' : 'b');
    if (eq) add('equivalence', 'openingEquivalence', 'openingTheory', 'theory', eq.text, eq.text, eq.squares, 42, false, [eq.claim]);
    // THE MASTERS' BREAK THE MOVE PREPARES (David 2026-10-27, "the a3
    // Sicilian": 2.a3 covers b4, and masters push b4 in 56% of their games):
    // the move's own job, read in the composer like every other — it was a
    // fill-in for a beat with nothing to say, so the opening story's "their
    // break is b4" took its place and the move lost its reason (2026-11-12).
    const prep = preparesBreakClause(i.fenBefore, i.san, storyPlanAfter(after), mine);
    if (prep) add('move-job', 'preparesBreakClause', 'openingTheory', 'prepare', lead(prep.clause), `It also ${prep.clause}`, prep.squares, 62, false, [`prepares-break:${prep.squares[1]}`]);
  }

  // THE STRUCTURE BY NAME, WITH ITS PLANS (gap D1): said when the move
  // creates it — "That makes it the French pawn chain. Your plan is to hit
  // the chain at its base …" — from the student's seat.
  {
    const formed = namedStructureFormed(i.fenBefore, i.san);
    if (formed) {
      const studentSeat: 'w' | 'b' = mine === (sideOf(i.fenBefore) === 'w') ? 'w' : 'b';
      const line = namedStructureLine(formed, studentSeat);
      add('structure-plan', 'namedStructureFormed', 'structureLines', 'structure', line, line, formed.squares, 58, false, [`structure:${formed.name}`]);
    }
  }

  // THE OPENING'S STORY in the lesson (infrastructure item 2, 2026-11-12):
  // the fork ahead, the road chosen and its price, their setup, the coming
  // game's character, the key break and the plan — the same computer Learn and
  // Review read (`openingStory`), so a lesson says the opening's ideas, not
  // only each move's. A lesson shows its line, so its moves may be named.
  {
    const studentColor: 'w' | 'b' = mine === (sideOf(i.fenBefore) === 'w') ? 'w' : 'b';
    for (const f of i.story ? readBoardAll('openingStory', { history: [...i.history, i.san], fen: fenAfter, student: studentColor, namesStudentMoves: true, theory: i.theory }) : []) {
      facts.push({ ...f, namesStudentMove: false, source: 'openingStory', idea: 'plan', weight: 38 });
    }
  }

  // THE KNOWN MISTAKES AND TRAPS (gaps C1-C2, David 2026-11-12: "You can
  // have coach state those lines and tactics … Let's not hold anything
  // back"): the club index's slip at this board — the move played, if it is
  // one, with its punishment; else the slip waiting at the board it reached.
  // Read through the registry's one door. Review reads the same rows from its
  // own facet builder, so it skips these here (`source` 'knownSlip').
  {
    // The club index once loaded; the curated gems answer before it and where
    // it holds nothing for a board (`knownSlipsAt`).
    const index = knownSlipIndexNow();
    {
      const studentColor: 'w' | 'b' = mine === (sideOf(i.fenBefore) === 'w') ? 'w' : 'b';
      const told = i.history.length;
      const played = readBoardAll('knownSlip', { fen: i.fenBefore, gems: knownSlipsAt(index, i.fenBefore), played: i.san, student: studentColor, verdictPunish: null, saidNext: null, told });
      const ahead = played.length > 0 ? [] : readBoardAll('trapAhead', { fen: fenAfter, gems: knownSlipsAt(index, fenAfter), played: i.line?.[0] ?? null, student: studentColor, verdictPunish: null, saidNext: null, told });
      for (const f of [...played, ...ahead]) facts.push({ ...f, source: 'knownSlip', idea: 'tactic', weight: 64 });
    }
  }

  // THE ONLY MOVE (gap B6): said with the next best and what it gives up.
  {
    const only = onlyMove(i.fenBefore, `${from}${to}`, i.reads?.before ?? []);
    if (only) add('key-moment', 'onlyMove', 'moveGains', 'choice', lead(`is the only move that holds here — the next best, ${only.secondSan}, ${only.gives}`), `It's the only move that holds here: the next best, ${only.secondSan}, ${only.gives}`, [to], 66, false, [`only:${from}${to}`]);
  }

  // WHAT THE MOVE CUTS (gap B3): "Bd3 cuts the queen off from d4" — the moved
  // piece stands in the mover's own line to a centre square or a piece.
  const cut = lineCut(i.fenBefore, i.san, mine);
  if (cut) add('aspect-own-weakness', 'lineCut', 'moveGains', 'weakness', lead(`cuts ${cut.piece} off from ${cut.lost}`), `It also cuts ${cut.piece} off from ${cut.lost}`, cut.squares, 46, false, [`cut:${cut.squares.join('')}`]);

  // THE CAGE (Danya, 32.e4: "e4 takes d5; the knight can only shuttle between
  // b6 and a8"): the move takes the squares their knight needs. A move that
  // loses big is not credited with it.
  const cage = losesBig ? null : pieceCage(i.fenBefore, i.san, mine);
  if (cage) add('aspect-their-weakness', 'pieceCage', 'moveGains', 'prevent', lead(cage.clause), `It also ${cage.clause}`, cage.squares, 62, false, [`cage:${cage.knight}`]);

  // WHAT THE MOVE STOPS (gap B2): their pin, kick, fork or safe check that
  // worked before the move and no longer does — "it stops …Bg4, which would
  // pin your knight on f3 against your queen". Both seats.
  // A MOVE THAT LOSES BIG IS NOT CREDITED with what it stops (bench
  // 2026-11-13: Bxe6+?? "stops …h6" — what it allows is the lesson).
  for (const s of losesBig ? [] : moveStops(i.fenBefore, i.san, mine)) {
    add('stop', 'moveStops', 'moveGains', 'prevent', lead(s.clause), `It also ${s.clause}`, s.squares, 70, false, [`stops:${s.san}`]);
  }
  // THEIR BREAK, STOPPED ("a5, stopping b4"): the pawn break their side
  // plays in master games from here, which the move makes lose material.
  {
    const plan = storyPlanAfter(i.history);
    const moverWhite = sideOf(i.fenBefore) === 'w';
    const theirBreak = plan ? (moverWhite ? plan.black : plan.white) : null;
    const brk = theirBreak ? stopsBreak(i.fenBefore, i.san, theirBreak.san, mine) : null;
    if (brk) add('stop', 'stopsBreak', 'moveGains', 'prevent', lead(brk.clause), `It also ${brk.clause}`, brk.squares, 72, false, [`stops-break:${brk.san}`]);
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
    for (const f of readBoardAll('pawnBreak', { fenBefore: i.fenBefore, san: i.san, student, lastTo, namesStudentMoves: true })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'file', weight: 55 });
    }
    // One piece moved again while the others wait at home (S4, his "the
    // bishop has moved five times for nothing").
    for (const f of readBoardAll('pieceMovedAgain', { history: i.history, fenBefore: i.fenBefore, san: i.san, student, costCp: i.costCp })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'develop', weight: 50 });
    }
    // The early queen chased with tempo, both seats (his "the knight to c3
    // with tempo, hitting the queen"): the queen's moves against the pieces out.
    for (const f of readBoardAll('queenChased', { history: i.history, fenBefore: i.fenBefore, san: i.san, student })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'tempo', weight: 56 });
    }
    // The castling the move took away, and which way the king castled
    // against their pawns (S4, his speedruns).
    for (const f of [...readBoardAll('castlingTaken', { fenBefore: i.fenBefore, san: i.san, student }), ...readBoardAll('castlingWing', { fenBefore: i.fenBefore, san: i.san, student })]) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'king-safety', weight: 55 });
    }
    // Opposite-coloured bishops settled by this move — a plan for the game.
    for (const f of readBoardAll('oppositeBishops', { fenBefore: i.fenBefore, san: i.san, student })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'plan', weight: 50 });
    }
    // Knight against bishop made by this move, and which minor is better.
    for (const f of readBoardAll('minorMatchup', { fenBefore: i.fenBefore, san: i.san, student })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'plan', weight: 50 });
    }
    // A piece in front of a passed or isolated pawn, both seats (his "a
    // blockading knight on d5"), or the blockader of a passer walking away.
    for (const f of readBoardAll('blockade', { fenBefore: i.fenBefore, san: i.san, student })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'prevent', weight: 52 });
    }
    // DEFENCE, both seats (Danya's speedruns, 2026-11-17): a pin that will
    // not hold, the queen's escapes counted, two hanging pieces one move saves.
    for (const f of readBoardAll('harmlessPin', { fenBefore: i.fenBefore, san: i.san, student, line: i.reads?.after[0]?.moves ?? [] })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'unpin', weight: 56 });
    }
    for (const f of readBoardAll('queenNet', { fenBefore: i.fenBefore, san: i.san, student })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'tactic', weight: 62 });
    }
    {
      const replies = (i.reads?.after ?? []).map((l) => ({ cp: l.evaluation, mate: l.mate ?? null, moves: l.moves }));
      // The top line's second read (the search two depths shallower): a
      // sacrifice's line is named by the one naming rule.
      const topSeconds = ((e) => (e && e.length > 0 ? [e] : []))(i.reads?.after[0]?.earlier?.moves);
      for (const f of readBoardAll('bothSaved', { fenBefore: i.fenBefore, san: i.san, student, replies })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'rescue', weight: 64 });
      }
      // The stalemate trick, both seats: the side behind leaves a capture that
      // stalemates it.
      for (const f of readBoardAll('stalemateTrick', { fenBefore: i.fenBefore, san: i.san, student })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'rescue', weight: 70 });
      }
      // The piece's journey in the game, both seats: the move that completes
      // a minor piece's reroute (f3–d2–c4).
      for (const f of readBoardAll('pieceItinerary', { fenBefore: i.fenBefore, san: i.san, student, history: i.history })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'route', weight: 56 });
      }
      // The forced finish, both seats: the move that begins a checking run to
      // mate in the moves that follow.
      for (const f of readBoardAll('forcedRun', { fenBefore: i.fenBefore, san: i.san, student, history: i.history, line: i.line, evalsAfter: null })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'mate', weight: 90 });
      }
      // What a threat is really for, both seats: the engine's decisive line
      // through the move, when its first move looks aimed at one piece and
      // the line wins another.
      {
        const uci = (() => { try { const m = new Chess(i.fenBefore).move(i.san); return m ? `${m.from}${m.to}${m.promotion ?? ''}` : null; } catch { return null; } })();
        const read = uci ? i.reads?.before.find((l) => l.moves[0] === uci) ?? null : null;
        const moverWhite = i.fenBefore.split(' ')[1] !== 'b';
        const moverCp = read ? (read.mate !== null && read.mate !== undefined ? (read.mate > 0 === moverWhite ? 100_000 : -100_000) : (moverWhite ? read.evaluation : -read.evaluation)) : null;
        const line = read && moverCp !== null && moverCp >= DECISIVE_LINE_CP ? pvLineFromUci(i.fenBefore, read.moves) : null;
        for (const f of readBoardAll('threatPurpose', { line, student })) {
          facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'threat', weight: 74 });
        }
      }
      // Why not just take? Both seats: the tempting capture the move leaves
      // alone, and why it fails.
      for (const f of readBoardAll('temptingCapture', { fenBefore: i.fenBefore, san: i.san, student, line: i.line ? [i.san, ...i.line] : null })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'win-material', weight: 62 });
      }
      // The board after the move, from the student's seat: the contested
      // piece counted, the piece guarding their king, a rook on the seventh,
      // their bad bishop, the ending reached.
      {
        const fenAfterMove = (() => { try { const c = new Chess(i.fenBefore); c.move(i.san); return c.fen(); } catch { return null; } })();
        if (fenAfterMove) {
          const onBoard = { fen: fenAfterMove, student };
          const add = (f: CoachFact, idea: IdeaKind, weight: number): void => { facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea, weight }); };
          for (const f of readBoardAll('count', onBoard)) add(f, 'win-material', 60);
          for (const f of readBoardAll('royal', onBoard)) add(f, 'pressure', 58);
          for (const f of readBoardAll('rook7', onBoard)) add(f, 'pressure', 56);
          for (const f of readBoardAll('badBishop', onBoard)) add(f, 'weakness', 52);
          for (const f of readBoardAll('endgamePhase', onBoard)) add(f, 'plan', 50);
          for (const f of readBoardAll('kingInCentre', onBoard)) add(f, 'pressure', 62);
          for (const f of readBoardAll('trappedPiece', { ...onBoard, lineUci: i.line ? sansToUci(fenAfterMove, i.line) : [] })) add(f, 'win-material', 80);
          for (const f of readBoardAll('worstPiece', { ...onBoard, movedTo: (() => { try { return new Chess(i.fenBefore).move(i.san).to; } catch { return null; } })() })) add(f, 'route', 48);
          for (const f of readBoardAll('passerPush', { ...onBoard, pushed: (() => { try { const m = new Chess(i.fenBefore).move(i.san); return m.piece === 'p' ? m.to : null; } catch { return null; } })() })) add(f, 'passed-pawn', 58);
          for (const f of readBoardAll('minority', onBoard)) add(f, 'plan', 52);
          for (const f of readBoardAll('colourComplex', onBoard)) add(f, 'weakness', 50);
          for (const f of readBoardAll('raceOfPlans', onBoard)) add(f, 'plan', 60);
        }
      }
      // What their move cost them, for the student to use.
      for (const f of readBoardAll('theirCost', { fenBefore: i.fenBefore, san: i.san, student })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'weakness', weight: 58 });
      }
      // The fortress, both seats: a piece down and a draw the board explains,
      // read off the engine's lines after the move.
      for (const f of readBoardAll('fortress', { fenBefore: i.fenBefore, san: i.san, student, replies })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'eval', weight: 60 });
      }
      // ENDGAME TECHNIQUE, both seats (WO-DANYA-READS-01 #5): the opposition a
      // king move takes, the zugzwang a move makes (the engine's read with the
      // null-move read after it, or the bounded count in a pawn ending), the
      // named ending reached or its step taken, the pawn race counted and
      // played out, and the piece a promotion makes.
      const afterLine = i.reads?.after[0] ?? null;
      const afterCp = afterLine ? (afterLine.mate ? seatCp(afterLine, 'w') : afterLine.evaluation) : null;
      for (const f of readBoardAll('oppositionRead', { fenBefore: i.fenBefore, san: i.san, student, afterCp })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'king-activity', weight: 66 });
      }
      for (const f of readBoardAll('zugzwangRead', { fenBefore: i.fenBefore, san: i.san, student, after: i.reads?.after ?? null, passAfter: i.reads?.passAfter ?? null })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'tempo', weight: 70 });
      }
      for (const f of readBoardAll('theoreticalEnding', { fenBefore: i.fenBefore, san: i.san, student, afterCp })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'plan', weight: 64 });
      }
      for (const f of readBoardAll('raceCount', { fenBefore: i.fenBefore, san: i.san, student })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'passed-pawn', weight: 64 });
      }
      for (const f of readBoardAll('promotionChoice', { fenBefore: i.fenBefore, san: i.san, student })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'promote', weight: 72 });
      }
      // Checks that come back to the same board (a perpetual) and the
      // discovered-check see-saw (a windmill), both seats.
      for (const f of readBoardAll('perpetualCheck', { fenBefore: i.fenBefore, san: i.san, student, replies })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'tactic', weight: 66 });
      }
      for (const f of readBoardAll('windmill', { fenBefore: i.fenBefore, san: i.san, student })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'tactic', weight: 68 });
      }
      // THE KINGS (WO-DANYA-READS-01 group 1), both seats: the king the move
      // leaves outnumbered, a back rank one piece now holds, a discovered
      // check loaded, and a sacrifice at the king with the line that proves it.
      for (const f of readBoardAll('kingSiege', { fenBefore: i.fenBefore, san: i.san, student, replies })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'attack-king', weight: 64 });
      }
      for (const f of readBoardAll('backRankWeakness', { fenBefore: i.fenBefore, san: i.san, student })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'king-safety', weight: 66 });
      }
      for (const f of readBoardAll('loadedDiscovery', { fenBefore: i.fenBefore, san: i.san, student })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'tactic', weight: 66 });
      }
      for (const f of readBoardAll('kingSacrifice', { fenBefore: i.fenBefore, san: i.san, student, replies, seconds: topSeconds })) {
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'attack-king', weight: 70 });
      }
      // The hidden combination (group 8), both seats: material given away from
      // the king, and the forced line that wins it back with interest or mates.
      for (const f of readBoardAll('deepCombination', { fenBefore: i.fenBefore, san: i.san, student, replies, seconds: topSeconds })) {
        const mate = !!(f.stakes && 'mate' in f.stakes && f.stakes.mate);
        facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: mate ? 'mate' : 'win-material', weight: 70 });
      }
    }
    // THE FLEXIBLE MOVE, both seats (the option principle): of moves as good
    // as each other, the one that keeps the important moves open — the read
    // per candidate the weighing reads (`weighReads`).
    for (const f of readBoardAll('flexibleMove', { fenBefore: i.fenBefore, san: i.san, student, reads: weighReads })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'order', weight: 52 });
    }
    // THE EXCHANGE SACRIFICE, both seats (Danya's "give up the rook, because
    // in return you get a monster"): the rook given on purpose, the engine's
    // read per candidate vouching, and what it buys.
    for (const f of readBoardAll('exchangeSacrifice', { fenBefore: i.fenBefore, san: i.san, student, reads: weighReads })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: exchangeSacIdea(f.claims[0] ?? ''), weight: 62 });
    }
    // THE PAWN MAJORITY, both seats (Danya's "White gets a queenside majority,
    // you get a kingside majority"): made, crippled, given up or set moving —
    // a recapture read against the board before their move began the trade.
    for (const f of readBoardAll('pawnMajority', { fenBefore: i.fenBefore, san: i.san, student, prior: i.theirLast })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: majorityIdea(f.claims[0] ?? ''), weight: 50 });
    }
    // Getting into their camp, both seats (Danya's speedruns): a piece gets in
    // and hits what they cannot keep, the rooks on the seventh, a rook lift or
    // swing, the rooks connected — or still cut off on move 12.
    for (const f of readBoardAll('intoTheirCamp', { fenBefore: i.fenBefore, san: i.san, student })) {
      // Getting in and hitting what they cannot keep weighs like a move's job;
      // the rooks seeing each other is a development note, below the move's
      // own reason (decision baseline: it led Bxg5, which wins the queen).
      const idea = campIdea(f.claims[0] ?? '');
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea, weight: idea === 'develop' ? 40 : 50 });
    }
    // What the pawn move did to the lines through its squares, the piece at a
    // chain's base, the pawn guard pinned to its king (S4 pawns).
    for (const f of [...readBoardAll('pawnCutsGuard', { fenBefore: i.fenBefore, san: i.san, student }), ...readBoardAll('pinnedPawnGuard', { fenBefore: i.fenBefore, san: i.san, student })]) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'tactic', weight: 60 });
    }
    for (const f of readBoardAll('chainBase', { fenBefore: i.fenBefore, san: i.san, student })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: f.stakes ? 'pressure' : 'guard', weight: 50 });
    }
    // THE S4 KING GROUP's move reads (Danya's speedruns): the queen hunted or
    // saved, the second attacker that makes the count, the piece put out of
    // reach, the piece poisoned by a mate (every mate is read with the mate,
    // above). Each is the
    // move's own job, so it leads the same idea the job and the fundamentals
    // say more plainly ("attacks their queen", "joins your bishop", "the a4
    // outpost").
    const moveReads: Array<{ f: CoachFact; idea: IdeaKind; weight: number }> = [
      // A queen with nowhere to run is a tactic: it says more than the bare hit.
      ...readBoardAll('queenHunt', { fenBefore: i.fenBefore, san: i.san, student, line: i.reads?.after[0]?.moves ?? null }).map((f) => ({ f, idea: 'tactic' as IdeaKind, weight: 74 })),
      // The count wins material (or mates): more than the job's bare "joins".
      ...readBoardAll('secondAttacker', { fenBefore: i.fenBefore, san: i.san, student }).map((f) => ({ f, idea: (readKey(f).endsWith(':mate') ? 'mate' : 'win-material') as IdeaKind, weight: 72 })),
      // Out of an attack it is the piece's rescue said with more; else its square.
      ...readBoardAll('outOfReach', { fenBefore: i.fenBefore, san: i.san, student, altUcis: (i.reads?.before ?? []).map((l) => l.moves[0] ?? '') }).map((f) => ({ f, idea: (readKey(f).endsWith(':rescue') ? 'rescue' : 'outpost') as IdeaKind, weight: 86 })),
      ...readBoardAll('poisonedPiece', { fenBefore: i.fenBefore, san: i.san, student, fan: i.reads?.everyAfter ?? null }).map((f) => ({ f, idea: (f.stakes && 'mate' in f.stakes && f.stakes.mate ? 'mate' : 'win-material') as IdeaKind, weight: 80 })),
    ];
    for (const { f, idea, weight } of moveReads) facts.push({ ...f, namesStudentMove: false, source: 'boardRead', idea, weight });
    // DANYA'S METHOD POINTS (S4, 2026-11-17), through the one registry: the
    // check the move cleared and then gave ("…Ne4 opens the queen's d8–h4
    // diagonal, so …Qh4+ comes next"), the capture with check taken first
    // ("first take the rook with check, then collect the other one"), and a
    // pawn on its knight's natural square ("…c6 takes away the b8 knight's
    // square"). A lesson shows its line, so its moves are named.
    for (const f of readBoardAll('opensCheck', { fenBefore: i.fenBefore, san: i.san, line: i.line, student, tense: i.tense })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'check', weight: 58, altFen: i.fenBefore });
    }
    for (const f of readBoardAll('captureOrder', { fenBefore: i.fenBefore, san: i.san, line: i.line, reads: i.reads?.before ?? [], student, tense: i.tense })) {
      facts.push({ ...f, namesStudentMove: false, source: 'moveOrder', idea: 'order', weight: 70, altFen: i.fenBefore });
    }
    // The move's cost from one search, or — where the surface has none (an
    // asked question) — off the reads around it: the best before against the
    // read after, the mover's view (no mate read: no number).
    const bestBefore = i.reads?.before[0];
    const readCost = bestBefore && after0r && bestBefore.mate == null && after0r.mate == null
      ? Math.max(0, seatCp(bestBefore, moverOfMove) - seatCp(after0r, moverOfMove)) : null;
    // Pressure on their target, both seats (his "doubling rooks is always a
    // good way to begin", Alekhine's gun): the pawn no pawn can guard, the
    // count, and the siege the engine's line builds on its file.
    for (const f of readBoardAll('targetPressure', { fenBefore: i.fenBefore, san: i.san, student, lineAfter: i.reads?.after[0]?.moves ?? [], costCp: i.costCp ?? readCost })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'pressure', weight: 54 });
    }
    // The pawn break and when it is due, both seats (his "first the queen to
    // c1, then b4-b5", "a4 stops …b5 for good"): the move that gets a break
    // ready, and the move that takes theirs away.
    for (const f of readBoardAll('breakPrep', { fenBefore: i.fenBefore, san: i.san, student, lineAfter: i.reads?.after[0]?.moves ?? [], costCp: i.costCp ?? readCost })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'prepare', weight: 54 });
    }
    for (const f of readBoardAll('breakStopped', { fenBefore: i.fenBefore, san: i.san, student, costCp: i.costCp ?? readCost })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'prevent', weight: 56 });
    }
    for (const f of readBoardAll('knightSquareTaken', { fenBefore: i.fenBefore, san: i.san, student, costCp: i.costCp ?? readCost })) {
      facts.push({ ...f, namesStudentMove: false, source: 'teachingMove', idea: 'develop', weight: 46, altFen: i.fenBefore });
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
    // A GAMBIT (fix 4, 2026-11-13): what the move gives, what comes back along
    // the line that takes it, and the engine's verdict, said apart ("offers a
    // pawn: if they play dxc3 and you answer Nxc3, you're a piece ahead in
    // development. The engine calls it about level"). It is the standing for
    // this move, so compensation does not say it again.
    if (i.reads && i.reads.after.length > 0) {
      const g = gambitIdea(i.fenBefore, i.san, i.reads.after, student, costOrMate);
      if (g) {
        // ONE GIFT, SAID ONCE: the opening's own line about this capture
        // ("It offers a pawn, and they almost always take it on f4") is the
        // same claim; the gambit's idea and verdict replace it.
        for (let k = facts.length - 1; k >= 0; k -= 1) {
          if (facts[k].source === 'openingStory' && facts[k].squares.includes(g.captureSquare)) facts.splice(k, 1);
        }
        add('compensation', 'gambitIdea', 'gambitIdea', 'eval', `${lead(g.clause)}. ${g.verdict}`, `It ${g.clause}. ${g.verdict}`, g.squares, 80, false, [`gambit:${g.sans[0]}`]);
        standingSaid = true;
      }
    }
    if (!standingSaid && after0 && after0.mate == null) {
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
      const text = evalReading(fenAfter, pov(before0.evaluation), pov(after0.evaluation), null, student, m ? { to: m.to, captured: m.captured ?? null } : null, i.reads?.after ?? null);
      // ONE STANDING IS ONE CLAIM: "you're losing — you're down a pawn" said on
      // move after move was the same claim (the say-once memory holds it).
      if (text) add('eval', 'evalReading', 'evalRead', 'eval', text, undefined, [], 45, false, [`standing:${signedBand(pov(after0.evaluation))}`]);
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
    for (const f of readBoardAll('ifTheyPlay', { fen: fenAfter, replies: every.replies, rating: every.rating, student, seconds: (i.reads?.after ?? []).map((l) => l.moves), played: next, tense: 'live', liveBoard: null, madeBy: i.san })) {
      const { heldForm: _held, ...fact } = f;
      facts.push({ ...fact, namesStudentMove: false, source: 'ifTheyPlay', idea: fact.stakes && 'mate' in fact.stakes && fact.stakes.mate ? 'mate' : 'choice', weight: 60 });
    }
    // THE BAIT (WO-COACH-NEXT-TO-YOU-01 C4): the trap the student's move set —
    // the reply many players at this level choose that loses.
    for (const f of readBoardAll('baitSet', { fen: fenAfter, replies: every.replies, rating: every.rating, student, seconds: (i.reads?.after ?? []).map((l) => l.moves), played: next, tense: 'live', liveBoard: null, madeBy: i.san })) {
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
export function lessonThought(shown: Omit<MoveThoughtInput, 'phrases' | 'tense' | 'plainThreatsSeen'>, voice: LessonVoice, refuted: RefutedAlternative | null): string {
  // A lesson shows the move as it is played: its words are the present's. It
  // reads no student record, so a plain threat is taught.
  const input: Omit<MoveThoughtInput, 'phrases'> = { ...shown, tense: 'now', plainThreatsSeen: false };
  // The line's story is at this move's ply: what it says is said here.
  voice.story.reach(plyOfFen(input.fenBefore));
  const facts = moveThoughtFacts({ ...input, phrases: voice.phrases });
  const alt = refuted ? refutedFact(refuted, input.fenBefore, input.moverIsStudent !== false ? 'student' : 'opponent') : null;
  const purpose = purposeFact(input, voice);
  return composeThought([...facts, ...(alt ? [alt] : []), ...(purpose ? [purpose] : []), ...studentMoveFacts(input), ...lessonBoardFacts(input)], 'lesson', voice, NOT_LED, null).spoken;
}

/** The story's lines that are about the move itself (its price, what their
 *  setup chose) — the ones a question about that move may hear. */
const MOVE_STEPS_OF_STORY: ReadonlySet<string> = new Set(['yours', 'theirs']);

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
  // The board reads a lesson says on the move answer a question about it too
  // (David 2026-11-17: "Learn needs to be able to answer the questions about the line").
  const all = [...facts, ...(alt ? [alt] : []), ...(next ? [next] : []), ...(purpose ? [purpose] : []), ...studentMoveFacts(input), ...lessonBoardFacts(input)];
  // A story line about the board, not the move ("both kings are on the
  // kingside"), answers no question about a move: the lesson's thread only.
  return composeThought(all.filter((f) => groups.has(f.group) && !(f.source === 'openingStory' && !MOVE_STEPS_OF_STORY.has(f.step))), 'chat', voice, NOT_LED, null);
}

/** THE ORDER MATTERS ONLY WHEN THE ENGINE SAYS SO: "Why not X first?" is
 *  said only when X first is at least half a pawn worse than the move played
 *  by the fan read before the move (Danya speedrun tapes: "Why not …d5
 *  first? It would allow Bb5" with Bb5 losing, "Rg4 first … allow …d5"
 *  with Rg4 as good). X outside the fan is worse than all of it; with no
 *  read the board's reason stands alone. */
/** The engine's line after `follow` played instead (its reply first), read
 *  off the fan before the move; null when the fan does not hold it. */
function followPvOf(fenBefore: string, follow: string | undefined, fan: readonly AnalysisLine[]): string[] | null {
  if (!follow) return null;
  let u: string;
  try { const mv = new Chess(fenBefore).move(follow.replace(/^…/, '')); u = `${mv.from}${mv.to}${mv.promotion ?? ''}`; } catch { return null; }
  const l = fan.find((x) => x.moves[0] === u);
  return l ? l.moves.slice(1) : null;
}
const ORDER_MATTERS_CP = 50;
function orderMatters(fenBefore: string, san: string, follow: string, fan: readonly AnalysisLine[]): boolean {
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

/** A "Learn how to think" step board: the board the question was asked on
 *  (the student to move), the engine's best line from it (UCI, [] unknown),
 *  the student's own move from it where the board came from their game, and
 *  the opponent's move that made it. */
export interface StepBoard {
  fen: string;
  pv: readonly string[];
  played: string | null;
  theirLast: { fenBefore: string; san: string } | null;
}

/** THE REGISTRY READS A STEP BOARD CARRIES: every board computer whose
 *  context a step board can fill, each as the idea it states. One list, so a
 *  computer reached here is reached on every step whose table row names it. */
const STEP_BOARD_READS: ReadonlyArray<{ idea: IdeaKind; read: (b: StepBoard, student: 'w' | 'b') => CoachFact[] }> = [
  { idea: 'rescue', read: (b, student) => readBoardAll('trapped', { fen: b.fen, student }) },
  { idea: 'unpin', read: (b, student) => readBoardAll('pinBreakOwn', { fen: b.fen, student }) },
  { idea: 'tactic', read: (b) => readBoardAll('queenGrabTrap', { fen: b.fen }) },
  { idea: 'weakness', read: (b, student) => readBoardAll('structureBoard', { fen: b.fen, student }) },
  { idea: 'prevent', read: (b) => (b.pv.length ? readBoardAll('prophylaxis', { fen: b.fen, engineFirstMoves: [b.pv[0]] }) : []) },
  { idea: 'order', read: (b) => (b.pv.length >= 3 ? readBoardAll('enablingMove', { fen: b.fen, pv: b.pv }) : []) },
  { idea: 'weakness', read: (b, student) => (b.pv.length ? readBoardAll('priorityFirst', { fen: b.fen, student, bestUci: b.pv[0] }) : []) },
  { idea: 'tactic', read: (b, student) => readBoardAll('tacticGeometry', { fen: b.fen, me: student, pv: b.pv, ...(b.theirLast ? { lastOpponentMove: b.theirLast } : {}), register: 'live' }) },
  { idea: 'guard', read: (b, student) => (b.played ? readBoardAll('countMethod', { fenBefore: b.fen, playedSan: b.played, student, costCp: null }) : []) },
  { idea: 'threat', read: (b, student) => (b.theirLast ? readBoardAll('obligationLifted', { fenBefore: b.theirLast.fenBefore, fenAfter: b.fen, student }) : []) },
  { idea: 'weakness', read: (b, student) => (b.theirLast ? readBoardAll('structureTheirMove', { fenBefore: b.theirLast.fenBefore, san: b.theirLast.san, student }) : []) },
];

/** THE BOARD READS A LESSON'S MOVE CARRIES (WO-SPEEDRUN-01: "It's not just
 *  how to think that needs unification. It's all coach surfaces"): the same
 *  registry reads Review makes on a move, in the same seats — the opponent's
 *  move lifts an obligation, lets a pinned piece of yours walk out, lets your
 *  pin be broken, sets a queen grab, changes the structure; your move plays the
 *  engine's order or its priority. A read of the board ITSELF (a pin break, a
 *  queen grab, the structure) speaks on the move only when THE MOVE MADE IT:
 *  the same read on the board before the move did not find it. A lesson walks
 *  every move of a line, and a standing fact said on every move is a recital. */
const LESSON_MOVE_READS: ReadonlyArray<{ idea: IdeaKind; seat: 'opponent' | 'student'; standing: boolean; read: (fen: string, i: Omit<MoveThoughtInput, 'phrases'>, student: 'w' | 'b', fenAfter: string) => CoachFact[] }> = [
  { idea: 'threat', seat: 'opponent', standing: false, read: (_f, i, student, fenAfter) => readBoardAll('obligationLifted', { fenBefore: i.fenBefore, fenAfter, student }) },
  { idea: 'weakness', seat: 'opponent', standing: false, read: (_f, i, student) => readBoardAll('structureTheirMove', { fenBefore: i.fenBefore, san: i.san, student }) },
  { idea: 'unpin', seat: 'opponent', standing: true, read: (fen, _i, student) => readBoardAll('pinBreakOwn', { fen, student }) },
  { idea: 'unpin', seat: 'opponent', standing: true, read: (fen, _i, student) => {
    let pins: string[] = [];
    try { pins = detectTactics(fen).tactics.filter((t) => t.type === 'pin' && t.beneficiary === student && t.involvedSquares[1]).map((t) => t.involvedSquares[1]); } catch { pins = []; }
    return pins.flatMap((pinned) => readBoardAll('pinBreakTheirs', { fen, student, pinned }));
  } },
  { idea: 'tactic', seat: 'opponent', standing: true, read: (fen) => readBoardAll('queenGrabTrap', { fen }) },
  // After their move, the student's turn: the move a player is drawn to that
  // fails (WO-DANYA-READS-01 group 4), read off the fan after the move — each
  // line a read of its first move. The same claim the move ruled out after the
  // student's move makes (`temptingKey`), so it is said once.
  { idea: 'choice', seat: 'opponent', standing: false, read: (fen, i, student) => {
    const after = i.reads?.after ?? [];
    return after.length >= 2 ? readBoardAll('temptingNow', { fen, student, rating: DEFAULT_STUDENT_RATING, priorMove: { fenBefore: i.fenBefore, san: i.san },
      reads: after.map((l) => ({ evaluation: l.evaluation, mate: l.mate, moves: l.moves, earlier: l.earlier?.moves ?? null })) }) : [];
  } },
  { idea: 'order', seat: 'student', standing: false, read: (_f, i) => { const pv = i.reads?.before[0]?.moves ?? []; return pv.length >= 2 ? readBoardAll('enablingMove', { fen: i.fenBefore, pv }) : []; } },
  { idea: 'weakness', seat: 'student', standing: false, read: (_f, i, student) => { const b = i.reads?.before[0]?.moves[0]; return b ? readBoardAll('priorityFirst', { fen: i.fenBefore, student, bestUci: b }) : []; } },
  { idea: 'weakness', seat: 'student', standing: true, read: (fen, _i, student) => readBoardAll('structureBoard', { fen, student }) },
  // The geometry a move leaves (an overload, a line through two pieces), read
  // as Review reads it after either seat's move, on the engine's line after it.
  { idea: 'tactic', seat: 'student', standing: true, read: (fen, i, student) => readBoardAll('tacticGeometry', { fen, me: student, pv: i.reads?.after[0]?.moves ?? [], register: 'live' }) },
  { idea: 'tactic', seat: 'opponent', standing: true, read: (fen, i, student) => readBoardAll('tacticGeometry', { fen, me: student, pv: i.reads?.after[0]?.moves ?? [], lastOpponentMove: { fenBefore: i.fenBefore, san: i.san }, register: 'live' }) },
];

/** The lesson's board reads on its move (`LESSON_MOVE_READS`), each a fact. */
export function lessonBoardFacts(i: Omit<MoveThoughtInput, 'phrases'>): ThoughtFact[] {
  if (i.moverIsStudent === undefined) return [];
  let fenAfter: string;
  try { const c = new Chess(i.fenBefore); c.move(i.san.replace(/[!?]+$/, '')); fenAfter = c.fen(); } catch { return []; }
  const mover = sideOf(i.fenBefore);
  const student: 'w' | 'b' = i.moverIsStudent === (mover === 'w') ? 'w' : 'b';
  const seat = i.moverIsStudent ? 'student' : 'opponent';
  const out: ThoughtFact[] = [];
  for (const r of LESSON_MOVE_READS) {
    if (r.seat !== seat) continue;
    let facts: CoachFact[];
    try { facts = r.read(fenAfter, i, student, fenAfter); } catch { facts = []; }
    if (r.standing && facts.length) {
      let before: ReadonlySet<string>;
      try { before = new Set(r.read(i.fenBefore, i, student, fenAfter).map((f) => f.id)); } catch { before = new Set(); }
      facts = facts.filter((f) => !before.has(f.id));
    }
    for (const f of facts) {
      const { heldForm: _held, ...fact } = f;
      out.push({ ...fact, namesStudentMove: false, source: 'boardRead', idea: r.idea, weight: 50 });
    }
  }
  return out;
}

/** THE STEP'S TEACHING (David 2026-11-17: "Make sure how to think gets these
 *  computers … a unified coach structure. That is a non negotiable rule."). A
 *  "Learn how to think" step is taught with the same facts every surface says:
 *  the one composer's facts on the step's move (`asked`, null on a board with
 *  no move to explain) and the registry's reads of the step board, kept to
 *  the computers that serve THIS step (`THINK_STEP`), in the thought's order. */
export function stepThought(step: ThinkingStep, board: StepBoard, asked: Omit<MoveThoughtInput, 'phrases' | 'tense'> | null): ComposedThought {
  const voice = newLessonVoice();
  const all: ThoughtFact[] = [];
  if (asked) {
    const input: Omit<MoveThoughtInput, 'phrases'> = { ...asked, tense: 'now' };
    voice.story.reach(plyOfFen(input.fenBefore));
    all.push(...moveThoughtFacts({ ...input, phrases: voice.phrases }), ...studentMoveFacts(input));
  }
  const student = sideOf(board.fen);
  for (const r of STEP_BOARD_READS) {
    for (const f of r.read(board, student)) {
      const { heldForm: _held, ...fact } = f;
      all.push({ ...fact, namesStudentMove: false, source: 'boardRead', idea: r.idea, weight: 50 });
    }
  }
  return composeThought(all.filter((f) => thinkStepOf(f.computer) === step), 'lesson', voice, NOT_LED, null);
}

/** WHAT LEARN'S STUDENT-MOVE LANES MAY SAY IN A LESSON, AND AS WHICH IDEA
 *  (WO-STORY-MATRIX-01 P1-9c): one answer per lane `studentMoveTeaching`
 *  (and its `orderTeaching`) can emit. Null = not said in a lesson, with the
 *  reason. A lane missing here is never said in a lesson (gate:
 *  `moveThoughtFacts.test` — every lane the bundle emits is answered). */
export const LESSON_STUDENT_LANE: Partial<Record<LearnLane, IdeaKind | null>> = {
  // Which piece takes back and why ("…exd5 frees your bishop; …Qxd5 would
  // just lose the queen to Nxd5"): the other captures weighed, a choice.
  recapture: 'choice',
  fileRace: 'file',
  trade: 'trade',
  timing: 'tempo',
  kingAttack: 'attack-king',
  ruleException: 'develop',
  falseAlarm: 'threat',
  pushOrHold: 'passed-pawn',
  structureJudgement: 'weakness',
  pawnEnding: 'king-activity',
  // Which piece takes back, and why the other capture fails ("Qxd5 would just
  // lose the queen to Nxd5"): a choice weighed, not the recapture itself.
  captureChoice: 'choice',
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
export function studentMoveFacts(i: Omit<MoveThoughtInput, 'phrases'>): ThoughtFact[] {
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
    // The opening this board is, read on the board after THEIR reply: the
    // composer reads it on the move's own board (`openingEquivalence` above),
    // so a lesson never says the next board's transposition on this move
    // ("Take back your c3 and their …d6" on the c3 beat, before …Nc6).
    if (t.computer === 'openingEquivalence') continue;
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
/** The claim "this move clears the way to castle", one key for every
 *  computer that says it (the move job, the purpose). */
const castlePrepClaim = (from: string, to: string): string => `move:${from}${to}:castle-prep`;

function purposeFact(i: Omit<MoveThoughtInput, 'phrases'>, voice: LessonVoice): ThoughtFact | null {
  if (!i.reads || i.moverIsStudent === undefined) return null;
  if (i.reads.passBefore.length === 0 && i.reads.passAfter.length === 0) return null;
  // A MOVE THAT LOSES BIG PREPARES NOTHING worth saying: its plan never
  // arrives (3.Ke2?? "prepares Qe1" beside …Qe4#). What it allows is said.
  const moverWB = sideOf(i.fenBefore);
  const a0 = i.reads.after[0];
  const mated = !!a0 && a0.mate !== null && a0.mate !== undefined && (moverWB === 'w' ? a0.mate < 0 : a0.mate > 0);
  if (mated || (i.costCp !== null && i.costCp >= BLUNDER_CP)) return null;
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
    claims: [
      `purpose:prepares:${intent.prepares.uci}`,
      // Castling made ready is the move job's claim too ("brings your bishop
      // out and clears the way to castle next move"): said once a turn.
      ...(/^O-O/.test(intent.prepares.san) ? (() => { try { const m = new Chess(i.fenBefore).move(i.san); return [castlePrepClaim(m.from, m.to)]; } catch { return []; } })() : []),
      ...(rule?.keys.map((k) => STORY_KEY.principle(k)) ?? []),
    ],
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

/** THE ONLY MOVE (gap B6, "the only move not to lose"): the move played is
 *  the engine's best on the fan before it, the next best gives up at least
 *  the app's only-move gap, and the game is still in contest. Returns the
 *  next best and what it gives up — never a bare "only move" — or null. */
export function onlyMove(fenBefore: string, playedUci: string, lines: readonly (LineScore & { moves: readonly string[] })[]): { secondSan: string; gives: string } | null {
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
  return { secondSan, gives: pawns >= 5 ? "gives up more than a rook's worth" : pawns >= 3 ? "gives up about a piece's worth" : pawns === 2 ? 'gives up about two pawns' : 'gives up about a pawn' };
}
