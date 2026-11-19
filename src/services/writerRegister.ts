// THE WRITER'S SETTINGS, ONE ROW PER SURFACE (the one-coach goal: every
// computer's WORDS are written once, in its registry entry; what differs per
// surface is the decider and these settings).
//
// Before this table each call site passed its own literals — `namesPlayedMove:
// true`, `tense: 'past'`, `register: 'review'`, `theory: true` — so two call
// sites on one surface could disagree and nothing noticed. Now a surface's
// settings are read from its row (`writerFor`), and a new surface fails to
// compile until it answers every setting (`Record<CoachSurface, …>`).
//
// A LEAF: type imports only, so any computer may read it.
//
// The source of truth for each value is CLAUDE.md (LEARN NAMES NO MOVE UNASKED
// and its carve-outs, OPENING THEORY, ONE PERSPECTIVE, THE TWO REGISTERS); the
// comment on each field says what it changes and which registry ctx carries it.
//
// NOT writer settings, deliberately left out: `quietBareBalanced` (the opening
// ply decides it, not the surface), `kingCentreTaught` (a flag of this game's
// record), `plainThreatsSeen` beyond `plainThreatsFromRecord` (the student's
// record decides it), `corpusNotes` (a mount's REQUIRED answer, its own rule).
//
// Gate: `src/test/writerRegister.gate.test.ts`.

import type { CoachSurface } from './boardComputers';
import type { IntroTense } from '../utils/moveIntro';
import type { TreeTense } from './ifTheyPlay';
import type { SurfacePosture } from './coachDecider';

export type { CoachSurface };

/** When the better move may be named: always (the game is over, or it was
 *  asked), never (a puzzle being solved, a question being asked), or once the
 *  moment is past (Learn's carve-out 3: `pastBetterNameable`). */
export type BetterMoveNaming = 'always' | 'once-past' | 'never';

export interface WriterSettings {
  /** The tense a move is introduced in (`moveIntro.IntroTense`): 'past' for a
   *  move already played (Review's walk, Learn's turn), 'now' for a move being
   *  shown or asked about (a lesson, a question). Carried by `opensCheck` /
   *  `captureOrder` (`tense`) and `MoveThoughtInput.tense`. */
  tense: IntroTense;
  /** The register (CLAUDE.md TWO DISTINCT NARRATION REGISTERS): 'review' is the
   *  retrospective words about the student's own finished game, 'live' the
   *  present-tense words at the board. Carried by `slipAnswer.register`
   *  ('review' | 'now'), `tacticGeometry.register` ('review' | 'live') and
   *  `ifTheyPlay.tense` ('past' | 'live') — three spellings of one setting,
   *  each read through its own mapper below. */
  register: 'review' | 'live';
  /** May the student's OWN move, once played, be named? Learn says "your
   *  move" (LEARN NAMES NO MOVE UNASKED: "the user knows that, they see it play
   *  out"); every other surface names it. Their move is named everywhere
   *  (`namesPlayedMoveFor`). Carried by `principle` / `tradeRead`
   *  (`namesPlayedMove`) and `MoveThoughtInput.namesPlayedMove`. */
  namesPlayedMove: boolean;
  /** May the student's NEXT / available move be named (the move a fact points
   *  at, the move a plan prepares)? Learn holds it unasked; a puzzle being
   *  solved and a thinking question hold it too. Carried by `namesStudentMoves`
   *  (structureMove, squareChoice, pawnBreak, recapture, tradeDeal, kingAttack,
   *  openingStory, studentMoveTeaching, decisiveReason), `namesMoves`
   *  (structureLines, centralKingDanger) and `threatAnswer.namesMove`. */
  namesStudentMoves: boolean;
  /** When the better move may be named (`namesBetterMove` on errorWhy and
   *  structureMove; `namesBetterMoveFor`). */
  namesBetterMove: BetterMoveNaming;
  /** May the move's thought speak opening theory — the book move's job, the
   *  departure, the move order (`theory` on studentMoveTeaching,
   *  attributePrinciples, MoveThoughtInput, computePositionFacts). Review's
   *  walk teaches the opening (David 2026-11-12, option B). */
  theory: boolean;
  /** May the opening STORY speak its theory ground — the book's statistics,
   *  the usual reply, how deep theory runs (`openingStory.theory`)? Review
   *  keeps it behind the Theory button (2026-11-12: "still off in the walk"). */
  storyTheory: boolean;
  /** Does the move's thought carry the opening story (`MoveThoughtInput.story`)?
   *  Review says its story through its own lines, so its thought answers false. */
  story: boolean;
  /** Does the move's thought carry the move's BOARD READS — the king walked by
   *  hand, the moves a player weighs, the known slips (`MoveThoughtInput.
   *  moveReads`)? Each is one read every surface takes (`kingWalkReads`,
   *  `weighedReads`, `knownSlipReads`). Review reads them once a ply off the
   *  record in its facet builder and says them through its decider, so its
   *  thought answers false: never read twice, never read and dropped. */
  moveReads: boolean;
  /** Name the king's owner and say "reasonably safe" when nothing is wrong
   *  (`kingExposure.owner`): chat's answer to a question; elsewhere the bare clause. */
  owner: boolean;
  /** The book move said plainly (`bookMove.plain`): Learn true, elsewhere false. */
  plainBookMove: boolean;
  /** Does the surface read the student's record for plain threats
   *  (`plainThreatsSeen` = this AND the record's green)? A lesson and a
   *  question have no record to read (a plain threat is taught). */
  plainThreatsFromRecord: boolean;
}

/** One row per surface. Where a surface's call sites disagreed with each
 *  other, the row holds the CLAUDE.md answer and the report names the site. */
export const WRITER: Record<CoachSurface, WriterSettings> = {
  // Learn free play: names no student move unasked (the better move once past,
  // carve-out 3); keeps its theory lanes "for now" (2026-11-06); the book move
  // plainly. Values from CoachTeachPage (namesStudentMoves/namesMoves/
  // namesPlayedMove/namesBetterMove false, openingStory theory true, bookMove
  // plain true) and learnSharedFacts (tense past, theory/story true).
  learn: {
    tense: 'past', register: 'live', namesPlayedMove: false, namesStudentMoves: false,
    namesBetterMove: 'once-past', theory: true, storyTheory: true, story: true, moveReads: true,
    owner: false, plainBookMove: true, plainThreatsFromRecord: false,
  },
  // Review: the game is over — names both moves and the better move, in the
  // retrospective register; the walk teaches the opening (2026-11-12) but the
  // story's statistics stay behind the Theory button. Values from
  // reviewFullData / coachFeatureService.
  review: {
    tense: 'past', register: 'review', namesPlayedMove: true, namesStudentMoves: true,
    namesBetterMove: 'always', theory: true, storyTheory: false, story: false, moveReads: false,
    owner: false, plainBookMove: false, plainThreatsFromRecord: true,
  },
  // A lesson (Teach me X, the opening pages, a generated Watch): the move is
  // shown, in the present (`lessonThought`), named, with its theory and story.
  lesson: {
    tense: 'now', register: 'live', namesPlayedMove: true, namesStudentMoves: true,
    namesBetterMove: 'always', theory: true, storyTheory: true, story: true, moveReads: true,
    owner: false, plainBookMove: false, plainThreatsFromRecord: false,
  },
  // Play volunteers nothing (PLAY_VOLUNTEERS_COACHING = false); what the
  // student TAPS is answered, live, naming moves (useLiveCoach, the position
  // read). This row is the asked answer's words.
  play: {
    tense: 'now', register: 'live', namesPlayedMove: true, namesStudentMoves: true,
    namesBetterMove: 'always', theory: true, storyTheory: true, story: false, moveReads: true,
    owner: false, plainBookMove: false, plainThreatsFromRecord: false,
  },
  // Chat: answers what was asked, in the present (`questionThought`), naming
  // what was asked, the king's owner included.
  chat: {
    tense: 'now', register: 'live', namesPlayedMove: true, namesStudentMoves: true,
    namesBetterMove: 'always', theory: true, storyTheory: true, story: true, moveReads: true,
    owner: true, plainBookMove: false, plainThreatsFromRecord: false,
  },
  // Tactics / My Mistakes: a puzzle being solved never hands over the answer
  // (mistakeNarration, slipCause: namesBetterMove false).
  tactics: {
    tense: 'now', register: 'live', namesPlayedMove: true, namesStudentMoves: false,
    namesBetterMove: 'never', theory: false, storyTheory: false, story: false, moveReads: true,
    owner: false, plainBookMove: false, plainThreatsFromRecord: false,
  },
  // Weaknesses: the student's finished games, read back (autoAnalyzeGame,
  // principleAttribution name the moves).
  weaknesses: {
    tense: 'past', register: 'review', namesPlayedMove: true, namesStudentMoves: true,
    namesBetterMove: 'always', theory: false, storyTheory: false, story: false, moveReads: true,
    owner: false, plainBookMove: false, plainThreatsFromRecord: true,
  },
  // Learn how to think (held from release): a question before the move asks,
  // it never answers.
  think: {
    tense: 'now', register: 'live', namesPlayedMove: true, namesStudentMoves: false,
    namesBetterMove: 'never', theory: false, storyTheory: false, story: false, moveReads: true,
    owner: false, plainBookMove: false, plainThreatsFromRecord: false,
  },
};

/** A surface's settings. */
export function writerFor(surface: CoachSurface): WriterSettings {
  return WRITER[surface];
}

/** A read with NO surface — a shared computer (`computePositionFacts`) whose
 *  callers do not pass one: the bare words. Named so the choice is one place,
 *  never a literal in the computer. */
export const BARE_READ: Pick<WriterSettings, 'owner' | 'plainBookMove'> = { owner: false, plainBookMove: false };

/** May this mover's played move be named? Their move always is. */
export function namesPlayedMoveFor(w: WriterSettings, moverIsStudent: boolean): boolean {
  return !moverIsStudent || w.namesPlayedMove;
}

/** May a move this mover will play be named? Their move always is. */
export function namesStudentMovesFor(w: WriterSettings, moverIsStudent: boolean): boolean {
  return !moverIsStudent || w.namesStudentMoves;
}

/** May the better move be named? `past`: the moment is no longer the
 *  student's to find (`pastBetterNameable`) — read only where the row says
 *  'once-past'. A finished game is past. */
export function namesBetterMoveFor(w: WriterSettings, past: boolean): boolean {
  return w.namesBetterMove === 'always' || (w.namesBetterMove === 'once-past' && past);
}

/** `slipAnswer.register`. */
export function slipRegister(w: WriterSettings): 'review' | 'now' {
  return w.register === 'review' ? 'review' : 'now';
}

/** `tacticGeometry.register`. */
export function geometryRegister(w: WriterSettings): 'review' | 'live' {
  return w.register;
}

/** `ifTheyPlay.tense`. */
export function treeTense(w: WriterSettings): TreeTense {
  return w.register === 'review' ? 'past' : 'live';
}

/** `plainThreatsSeen`: the record's green, where the surface reads a record. */
export function plainThreatsSeenFor(w: WriterSettings, recordGreen: boolean): boolean {
  return w.plainThreatsFromRecord && recordGreen;
}

/** The settings a move's thought takes from its surface. */
export function thoughtSettings(w: WriterSettings): { namesPlayedMove: boolean; theory: boolean; story: boolean; moveReads: boolean } {
  return { namesPlayedMove: w.namesPlayedMove, theory: w.theory, story: w.story, moveReads: w.moveReads };
}

// ─── THE DECIDER'S HALF ──────────────────────────────────────────────────────
// How deep the one decider goes on each surface. NOT the order: the order is
// one table for every surface (`coachFact.FACT_GROUP` → `stepOf`), never here.
// No field is a cap (G4.5): the length is an AVERAGE the audits hold.

/** Which steps of the one order a surface says:
 *   all        — every step that earned a word (Review's walk, a lesson);
 *   one-thread — the turn's one idea for the move to come (Learn's door,
 *                `learnTurnDoor.CORE_STEPS`: one reason per move, one fact a
 *                step, one thread);
 *   asked      — the steps the question picks (`questionThought`); nothing
 *                unasked. */
export type StepScope = 'all' | 'one-thread' | 'asked';

export interface DeciderSettings {
  /** The door's rule (`coachDecider.SurfacePosture`, plus Learn's turn door
   *  'learn'): 'walk' every ply is a beat, 'interrupt' importance gates,
   *  'asked' the question earned the read. */
  posture: SurfacePosture | 'learn';
  /** Which steps the surface says (`StepScope`). */
  steps: StepScope;
  /** Does the coach speak without being asked? Play: no
   *  (`PLAY_VOLUNTEERS_COACHING = false`); a question box: no. */
  volunteers: boolean;
  /** The AVERAGE spoken words a turn is held to — the scale of a bar, never a
   *  limit (G4.5, the WHY standard's measure 4). null: reported, no target
   *  (David 2026-11-07: "Learn, no hard bar … should adapt"). */
  averageWords: number | null;
}

export const DECIDER: Record<CoachSurface, DeciderSettings> = {
  // Learn's turn door (`coachTurn({ posture: 'learn' })`); its marginal bar is
  // scaled by an 80-word average (`learnTurnDoor.TURN_WORD_TARGET`).
  learn: { posture: 'learn', steps: 'one-thread', volunteers: true, averageWords: 80 },
  // Review's walk (`coachFeatureService` → decide(…, 'walk')); every step
  // (`THOUGHT_REGISTER.review`); the audit holds a 100-word average.
  review: { posture: 'walk', steps: 'all', volunteers: true, averageWords: 100 },
  // A lesson walks the line the student asked for (`THOUGHT_REGISTER.lesson`).
  lesson: { posture: 'walk', steps: 'all', volunteers: true, averageWords: null },
  // Play says nothing unless asked; a tap's answer is judged 'interrupt'
  // (`useLiveCoach`).
  play: { posture: 'interrupt', steps: 'asked', volunteers: false, averageWords: null },
  // Chat: the question earned the read; the question picks the steps.
  chat: { posture: 'asked', steps: 'asked', volunteers: false, averageWords: null },
  // Tactics: the puzzle's method line walks (`puzzleMethod`, 'walk'); the
  // answer is never said unasked.
  tactics: { posture: 'walk', steps: 'asked', volunteers: false, averageWords: null },
  // Weaknesses: the record read back as a walk; no decider caller today.
  weaknesses: { posture: 'walk', steps: 'all', volunteers: true, averageWords: null },
  // Learn how to think: asks, never answers unasked.
  think: { posture: 'asked', steps: 'asked', volunteers: false, averageWords: null },
};

/** The door posture of a surface decided by `coachDecider.decide` (every
 *  surface but Learn, whose turn door is its own rule). */
export function momentPosture(surface: Exclude<CoachSurface, 'learn'>): SurfacePosture {
  const p = DECIDER[surface].posture;
  if (p === 'learn') throw new Error(`writerRegister: ${surface} has no moment posture`);
  return p;
}

/** A surface's average-words target; throws for a surface that only reports
 *  its length (a caller that scales by it must have one). */
export function averageWordsOf(surface: CoachSurface): number {
  const n = DECIDER[surface].averageWords;
  if (n == null) throw new Error(`writerRegister: ${surface} has no average-words target`);
  return n;
}
