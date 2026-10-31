/**
 * learnTurnDoor — the ONE place a Learn free-play turn decides what it says
 * (WO-COACH-TEACHER WO-1, David 2026-09-29: "Start the decider door").
 *
 * A Learn turn used to assemble its voice in two places inside
 * `CoachTeachPage`, each calling `buildVoicePackage` and then filtering by a
 * KIND whitelist (`DNA_VOICE_KINDS`). A whitelist of kinds cannot tell two
 * lanes of the same kind apart, and it silently dropped a whole lane that was
 * built to speak: the plan arc (2026-09-27, "There it is — … That was the
 * plan") carries kind `plan`, which the whitelist never listed, so on a real
 * 42-ply prod game it said nothing at all.
 *
 * So the unit of decision is the LANE, not the kind. Every lane that can speak
 * in Learn is declared here with the kind it speaks as, in a `Record` over the
 * union — a new lane fails to compile until someone answers for it.
 *
 * THERE ARE NO CLOSED LANES (G8.5, 2026-09-29). Five used to sit here marked
 * silent — the engine read, the eval split, the book fork, borrowed teaching,
 * the look-ahead paragraph — while their producers kept computing text nobody
 * heard. Closing a lane means deleting its producer and its row; a lane in
 * this table has a live producer (`learnTurnDoor.test.ts` holds both halves).
 * A MISSION (WO-MISSIONS-01) or a FOCUS (WO-LEARN-FOCUS-01) closes no lane:
 * while it owns a turn the door holds every lane it is offered and says why on
 * the row (`mission`, `focus-voice`, `off-focus`).
 *
 * Slice 1 (this file): route + record, behaviour-preserving. Ordering and dedupe are still
 * `buildVoicePackage`'s. Picking ONE lead per turn is the next slice.
 */
import { fadeText, fadeLevelOf, type FadeLevels } from './fadeText';
import { isProof, type FactProof, type Proof } from './proof';
import { emitLearnTurn, type LearnTurnTag, type PriceSearch } from './coachDecisionEvents';
import { COMPUTER_ROLES, saidBeforeTheMove } from './computerRoles';
import { buildVoicePackage, joinSpoken, type SpokenLine, type VoiceFact, type VoiceFactKind, type VoicePackage } from './voicePackage';

import { costStakes, stakeValue, STAKED_FLOOR, type FactStakes } from './factStakes';
import { sameClaim } from './factSelector';
import { FACT_ROLE, type FacetRole, type FactKind } from './reviewFacetRank';
import { isCoachFactKind, stepOf } from './coachFact';
import { BOARD_COMPUTERS } from './boardComputers';
import { THOUGHT_ORDER, type ThoughtStep } from './thoughtComposer';
import type { PhaseFact } from './positionFacts';
export type { PhaseFact } from './positionFacts';
import { isEndgameByMaterial } from './gamePhaseService';
import { STORY_KIND, type StoryBeat } from './openingStory';
import { namesPlayableStudentMove, type NamesStudentMove } from './studentMoveNaming';
import { samePosition } from '../utils/samePosition';
import { focusTags, type FocusId } from '../coach/focus/focusCard';
import { isMisconceptionTagId } from '../data/misconceptionTags';
export { buildVoicePackage, describeVoicePackage, keptLines, markableSquares, spokenSentenceKeys } from './voicePackage';
export type { SpokenLine } from './voicePackage';
export type { VoicePackage, VoiceFactKind } from './voicePackage';
export type { FactStakes } from './factStakes';

/** Why the door held a lane on a turn. */
type HoldReason = 'mission' | 'off-focus' | 'focus-voice' | 'names-move' | 'held-this-turn' | 'mate-turn' | 'verdict-turn' | 'mid-exchange' | 'danger-waits' | 'subsumed' | 'restates' | 'off-topic' | 'same-step' | 'second-thought' | 'marginal' | 'contradicts' | 'out-of-phase' | 'price-unsettled' | 'one-method';

/** WHO OWNS THE VOICE OF THIS TURN (WO-MISSIONS-01, WO-LEARN-FOCUS-01).
 *  - `open`: the classic Learn — the door decides as it always has.
 *  - `mission`: a Campaign mission owns the game. The door speaks NOTHING and
 *    holds every lane it was offered with reason `mission`.
 *  - `focus:<id>`: a Learn focus game. The door speaks NOTHING; a lane about
 *    the focus is held as `focus-voice` (the focus runner says it), every
 *    other lane as `off-focus`.
 *  Either way the silence is a recorded decision, not a gap; the owner's own
 *  lines go through its runner, never through here. REQUIRED at both
 *  production doors (`coachTurn`, `decidePhaseWave`). */
export type VoiceOwner = 'open' | 'mission' | `focus:${FocusId}`;

/** The AVERAGE a Learn turn is held to (CLAUDE.md WHY standard measure 4) —
 *  the scale of the marginal bar, never a limit. */
const TURN_WORD_TARGET = 80;

export type LearnLane =
  // ── the instant wave, spoken with the coach's reply ──
  | 'tactic'
  | 'prophylaxis'
  | 'threat'
  | 'dangerLevels'
  | 'playedConcept'
  | 'commentary'
  | 'behavior'
  | 'openingIdea'
  | 'openingIdentity'
  // ── the opening's story (`openingStory`), one lane per place in the turn ──
  | 'openingRoads'
  | 'openingChoice'
  | 'openingCost'
  | 'openingTheirs'
  | 'openingStory'
  | 'positional'
  // ── the late wave, spoken when the engine read settles ──
  | 'opening'
  | 'structure'
  | 'pieceQuality'
  | 'register'
  | 'gap'
  | 'positionFacts'
  | 'priorityFirst'
  | 'rejectedTempting'
  | 'bookMove'
  | 'planArc'
  | 'drawback'
  | 'mistake'
  | 'coachMistake'
  | 'fundamental'
  | 'movePoint'
  | 'foundMove'
  | 'heldMove'
  | 'slipAnswer'
  | 'moveIntent'
  | 'moveOrder'
  | 'theirMoveCost'
  | 'recapture'
  | 'kingAttack'
  | 'ruleException'
  | 'falseAlarm'
  | 'threatAnswer'
  | 'pushOrHold'
  | 'causalChain'
  | 'kingSafety'
  | 'phase'
  | 'character'
  | 'theirPurpose'
  | 'theirIntent'
  | 'tempo'
  | 'fileRace'
  | 'stalemate'
  | 'countMethod'
  | 'timing'
  | 'checkMethod'
  | 'trade'
  | 'kneeJerk'
  | 'blunderCheck'
  // THE MISTAKE'S HABIT — the fundamental's how, or the slip question — said
  // after the loss it is about (WO-ONE-COACH-01; the mistake turn David locked
  // 2026-10-20: what the move allowed, what the better move did, the habit).
  | 'mistakeHabit'
  | 'autopilot'
  | 'keepPressing'
  | 'pawnEnding'
  | 'strongChoice'
  // ── batch 1: opening equivalence, order and timing (`orderTeaching`) ──
  | 'openingEquivalence'
  | 'tradeLedger'
  | 'notYetPlayed'
  | 'holdResource'
  | 'captureChoice'
  | 'kickMap'
  | 'breakRace'
  | 'patternFails'
  | 'structureJudgement'
  // ── memory: this position, from the student's own games ──
  | 'lastTimeHere'
  | 'sameAsLastTime';

/** Lanes at or below this lead DESCRIBE the board (commentary, behaviour,
 *  the positional read, structure, piece quality) — the tier the scoreboard
 *  found we over-say. */
const DESCRIPTION_LEAD = 40;

interface LaneRule {
  /** THE KIND OF FACT THE LANE SAYS (WO-STORY-MATRIX-01 P1-4, REQUIRED): its
   *  step is read from the one group table (`FACT_GROUP[factKind]`), never
   *  from a lane table of its own. A lane fed by a registry computer takes
   *  that computer's kind, a story lane its beats' kind (`STORY_KIND`). */
  factKind: FactKind;
  /** The kind the package ranks it as. */
  kind: VoiceFactKind;
  /** What the lane teaches, in one line. */
  why: string;
  /** How strongly it claims the LEAD of a turn (WO-1b). Higher leads. The order
   *  is his: what is urgent, then what just happened, then what a move is FOR,
   *  and the board DESCRIPTION last — the scoreboard (2026-09-29) found we
   *  describe the board where he explains the move. */
  lead: number;
  /** Rides every turn it has something, whatever leads — the safety floor
   *  (a threat or a hanging piece is never held behind a "why?") and the
   *  once-only opening name. */
  always?: true;
}

/** A lane's place in the DNA beat. */
type DnaBeat = 'name' | 'affirm' | 'but' | 'refute' | 'their' | 'point' | 'verdict' | 'now';
const BEAT_ORDER: Record<DnaBeat, number> = { name: 0, affirm: 1, but: 2, refute: 3, their: 4, point: 5, verdict: 6, now: 7 };

/** Every lane answers where it sits in the DNA beat — a new lane fails to
 *  compile until it does. */
export const DNA_BEAT: Record<LearnLane, DnaBeat> = {
  opening: 'name', openingIdentity: 'name',
  // The opening's story sits where each beat belongs in the turn: what the
  // student chose and what it costs with their move, what they set up in their
  // beat, the coming game's plan with the ideas, and the crossroads in front of
  // the student last — it is about the move they are about to make.
  openingChoice: 'affirm', openingCost: 'but', openingTheirs: 'their', openingStory: 'point', openingRoads: 'now',
  foundMove: 'affirm', heldMove: 'affirm', slipAnswer: 'affirm', movePoint: 'affirm', moveIntent: 'affirm', recapture: 'affirm', kingAttack: 'affirm',
  ruleException: 'affirm', fileRace: 'affirm', trade: 'affirm', timing: 'affirm', strongChoice: 'affirm',
  falseAlarm: 'affirm', tempo: 'affirm', pushOrHold: 'affirm',
  mistake: 'but', drawback: 'but', fundamental: 'but', register: 'but', rejectedTempting: 'but', kneeJerk: 'but', bookMove: 'but',
  // The blunder check names the piece the move lost — the verdict's reason, so
  // it is the verdict's beat and rides a verdict turn (Learn audit 2026-10-14:
  // "e6 was a blunder — it cost three or four points" spoke, its reason held).
  blunderCheck: 'but', countMethod: 'but', mistakeHabit: 'but',
  moveOrder: 'refute', causalChain: 'refute',
  theirPurpose: 'their', theirIntent: 'their', theirMoveCost: 'their', coachMistake: 'their', gap: 'their',
  tactic: 'point', playedConcept: 'point', planArc: 'point', structureJudgement: 'point', openingIdea: 'point', structure: 'point', pieceQuality: 'point',
  positionFacts: 'point', commentary: 'point', positional: 'point', kingSafety: 'point',
  behavior: 'point',
  phase: 'verdict', character: 'verdict',
  threat: 'now', dangerLevels: 'now', threatAnswer: 'now', prophylaxis: 'now', priorityFirst: 'now',
  checkMethod: 'now', stalemate: 'now', autopilot: 'now', keepPressing: 'now', pawnEnding: 'now',
  openingEquivalence: 'name', tradeLedger: 'affirm', notYetPlayed: 'affirm', holdResource: 'affirm', captureChoice: 'affirm',
  breakRace: 'affirm', kickMap: 'point', patternFails: 'refute',
  lastTimeHere: 'affirm', sameAsLastTime: 'but',
};


/** THE THOUGHT (WO-THINK-01, David 2026-10-29: "the coach thinks out loud for
 *  the student, the way Danya does … One thread, never a stack"). A Learn turn
 *  is ONE thought, said in his order, each step saying one thing:
 *    danger  — what is attacked on the board right now (always first);
 *    name    — the opening, once;
 *    yours   — what the student's move changed: its reason, or on a slip the
 *              verdict and why it cost;
 *    theirs  — what their reply changed: its reason, or their slip;
 *    choices — the moves the student would weigh now and why each falls short;
 *    notYet  — "not yet, first this";
 *    board   — the idea on the board: the tactic, the plan, the structure;
 *    verdict — what the position is about now;
 *    habit   — the habit that finds it next time.
 *  The DNA beat stays the record's vocabulary (audits read it); this is the
 *  order the turn is SAID in and the unit the door picks one fact from. */
// The steps and their order live with the one composer (`thoughtComposer`),
// so Learn, Review, lessons and chat say a thought in one order.
export { THOUGHT_ORDER, type ThoughtStep } from './thoughtComposer';
/** The steps that carry the turn's one idea for the move to come — one thread
 *  across them: the most valuable leads, and another speaks only as its
 *  support (it shares a square) or as news in its own right (real stakes). */
export const CORE_STEPS: ReadonlySet<ThoughtStep> = new Set<ThoughtStep>(['choices', 'notYet', 'board']);

/** The step a fact says: its own kind for the lanes that carry many kinds,
 *  else its lane's — both read from the one group table (`FACT_GROUP`,
 *  WO-STORY-MATRIX-01 P1-4). A lane is placed by what it is ABOUT: the move
 *  just played (yours / theirs), the move to come (choices / notYet), the
 *  board. */
export function thoughtStepOf(lane: LearnLane, factKind?: string): ThoughtStep {
  if ((lane === 'positionFacts' || lane === 'phase') && factKind && isCoachFactKind(factKind)) {
    return stepOf(factKind, 'student');
  }
  return stepOf(LEARN_LANES[lane].factKind, 'student');
}

/** An answer the coach owes — a question posed, then answered once the
 *  student played — wins its step over any other reason for the move. */
const OWED_ANSWER: ReadonlySet<LearnLane> = new Set<LearnLane>(['heldMove', 'slipAnswer']);
/** THE FALLBACK REASON for a move — what it does on the board, said only when
 *  no sharper computer had a reason (the board teacher for yours, the board
 *  job for theirs): it ranks last in the move's one reason. */
function fallbackReason(claims: readonly string[] | undefined): boolean {
  return !!claims?.some((c) => c.startsWith('board-teacher:') || c.startsWith('their-board:'));
}
/** Steps whose facts still speak on a verdict turn whatever their stakes: the
 *  slip itself and its reasons, and the habit that catches it. A danger speaks
 *  there only when it costs something now (`presentDanger`, OS-1 replay
 *  2026-10-19): "No rush yet" waits for a calm move. */
const VERDICT_TURN_STEPS: ReadonlySet<ThoughtStep> = new Set<ThoughtStep>(['yours', 'habit']);

/** WHICH LANE CARRIES EACH BEAT OF THE OPENING'S STORY — the lane is the beat's
 *  place in the turn. A new beat fails to compile until it is placed. */
export const STORY_LANE: Record<StoryBeat, LearnLane> = {
  fork: 'openingRoads',
  identity: 'openingIdentity',
  'branch-choice': 'openingChoice',
  'structure-paid': 'openingChoice',
  'structure-cost': 'openingCost',
  'their-setup': 'openingTheirs',
  consequence: 'openingTheirs',
  character: 'openingStory',
  'key-break': 'openingIdea',
  'horizon-plan': 'openingStory',
};
/** The story's lanes — knowledge about the opening, which waits while a trade
 *  is in progress (the spoken name is not one of them). */
const STORY_LANES: ReadonlySet<LearnLane> = new Set(Object.values(STORY_LANE));

/** WHERE A LANE BELONGS IN THE GAME (David 2026-10-19: "the computed
 *  narrations are not focused on providing specific narrations in that phase
 *  of the game"). In an ending (`isEndgameByMaterial`, the one definition) the
 *  why of a move is kings, passers, rooks and technique — so a lane about the
 *  opening, castling, a middlegame structure or an attack on a sheltered king
 *  has nothing to say there, and the door holds it. Every lane answers; a new
 *  lane fails to compile until it does.
 *  - `any`: true in every phase;
 *  - `not-ending`: opening and middlegame only. */
type LanePhase = 'any' | 'not-ending';
/** A lane fed by one registry computer takes that computer's phase column
 *  (`BOARD_COMPUTERS[id].phase`, WO-STORY-MATRIX-01 P1-4) — never a second
 *  answer here. */
const phaseOfComputer = (phase: ReadonlySet<string>): LanePhase => (phase.has('any') || phase.has('endgame') ? 'any' : 'not-ending');
const STORY_PHASE = phaseOfComputer(BOARD_COMPUTERS.openingStory.phase);
export const LANE_PHASE: Record<LearnLane, LanePhase> = {
  tactic: 'any', prophylaxis: phaseOfComputer(BOARD_COMPUTERS.prophylaxis.phase), threat: 'any', dangerLevels: 'any', playedConcept: 'any',
  commentary: 'not-ending', behavior: 'not-ending', positional: 'not-ending',
  openingIdea: STORY_PHASE, openingIdentity: STORY_PHASE, openingEquivalence: 'not-ending',
  openingRoads: STORY_PHASE, openingChoice: STORY_PHASE, openingCost: STORY_PHASE, openingTheirs: STORY_PHASE, openingStory: STORY_PHASE,
  opening: 'not-ending', bookMove: phaseOfComputer(BOARD_COMPUTERS.bookMove.phase),
  lastTimeHere: phaseOfComputer(BOARD_COMPUTERS.lastTimeHere.phase), sameAsLastTime: phaseOfComputer(BOARD_COMPUTERS.lastTimeHere.phase),
  tempo: 'not-ending', notYetPlayed: 'not-ending', holdResource: 'not-ending',
  structure: 'not-ending', kingSafety: 'not-ending', kingAttack: 'not-ending',
  pieceQuality: 'any', register: 'any', gap: 'any', positionFacts: 'any', priorityFirst: phaseOfComputer(BOARD_COMPUTERS.priorityFirst.phase), rejectedTempting: 'any',
  planArc: 'any', drawback: 'any', mistake: 'any', coachMistake: 'any', fundamental: 'any', movePoint: 'any',
  foundMove: 'any', heldMove: 'any', slipAnswer: 'any', moveIntent: 'any', moveOrder: phaseOfComputer(BOARD_COMPUTERS.moveOrder.phase), theirMoveCost: 'any',
  recapture: 'any', ruleException: 'any', falseAlarm: 'any', threatAnswer: 'any', pushOrHold: 'any', causalChain: 'any',
  phase: 'any', character: 'any', theirPurpose: 'any', theirIntent: 'any', fileRace: 'any', stalemate: 'any',
  countMethod: phaseOfComputer(BOARD_COMPUTERS.countMethod.phase), timing: 'any', checkMethod: 'any', trade: 'any', kneeJerk: 'any', blunderCheck: 'any', mistakeHabit: 'any',
  autopilot: 'any', keepPressing: 'any', pawnEnding: 'any', strongChoice: 'any', tradeLedger: 'any',
  captureChoice: 'any', kickMap: 'any', breakRace: 'any', patternFails: 'any', structureJudgement: 'any',
};

/** Is this lane's fact out of place on this board? */
export function laneOutOfPhase(lane: LearnLane, fen: string): boolean {
  if (LANE_PHASE[lane] === 'any') return false;
  try { return isEndgameByMaterial(fen); } catch { return false; }
}

export const LEARN_LANES: Record<LearnLane, LaneRule> = {
  // ── batch 1 (opening equivalence, order and timing) ──
  // The named opening this board is with moves thrown in or the colours
  // reversed — rides with the name, said once a game.
  openingEquivalence: { factKind: 'equivalence', kind: 'computed', why: 'the named opening this board is, with a move each thrown in or the colours reversed', lead: 44, always: true },
  tradeLedger: { factKind: 'trade', kind: 'computed', why: 'the trade, counted in moves: their recapturing piece had already moved, or their much-moved piece went for a fresh one', lead: 67 },
  notYetPlayed: { factKind: 'not-yet', kind: 'computed', why: 'development first: the piece that would hit your pawn has not come out yet', lead: 63 },
  holdResource: { factKind: 'not-yet', kind: 'computed', why: 'a pin or check kept in hand until their knight develops into it', lead: 65 },
  captureChoice: { factKind: 'capture-choice', kind: 'computed', why: 'which pawn capture — the other one hands their knight a square for good', lead: 71 },
  kickMap: { factKind: 'kick', kind: 'computed', why: 'the capture dragged their piece onto a square a pawn kicks it from, and where it can land', lead: 67 },
  breakRace: { factKind: 'point', kind: 'computed', why: 'both sides wanted one square for a pawn and yours got there first', lead: 66 },
  patternFails: { factKind: 'refuted', kind: 'computed', why: 'a stock shot that looks right and fails on this board, played out', lead: 72 },
  // MEMORY (David 2026-10-15): the student left theory from THIS position in
  // another game at a cost (`lastTimeHere`, off the book-departure rows). A
  // different move this time is the green direction; the same move again is the
  // hole repeating. Rare and earned, so both ride. Its kind (`last-here`)
  // rides beside the name, as it always has (whether it is said at all is
  // David's call, OUTLINE 2026-10-28) — never one of the move's reasons.
  lastTimeHere: { factKind: BOARD_COMPUTERS.lastTimeHere.kind, kind: 'computed', why: 'what the student played here in another game, what it cost, and that this time went another way', lead: 69, always: true },
  sameAsLastTime: { factKind: BOARD_COMPUTERS.lastTimeHere.kind, kind: 'computed', why: 'the same costly move the student played here in another game', lead: 78, always: true },
  tactic: { factKind: 'tactic', kind: 'tactic', why: 'a tactic the detectors proved for the student', lead: 90, always: true },
  threat: { factKind: 'threat', kind: 'threat', why: 'danger to the student on this board', lead: 95, always: true },
  // DANGER LEVELS (David 2026-10-18): a threat answered with a bigger one —
  // why their piece was left, and the line that punishes taking it. It covers
  // the threat it names, so it leads it.
  // THE CONCEPT A MOVE JUST PLAYED, either side (David 2026-10-18) — quiet on
  // a concept the student has proven (conceptRecord).
  playedConcept: { factKind: 'concept', kind: 'computed', why: 'the concept the move just played — a fork, a pin, a discovered attack — named for either side', lead: 78 },
  dangerLevels: { factKind: 'must-defend', kind: 'threat', why: 'a threat answered with a bigger one: the piece left, the bigger piece hit, and the line that punishes taking it', lead: 96, always: true },
  commentary: { factKind: 'concept', kind: 'computed', why: 'the computed board read (playCommentary)', lead: 30 },
  behavior: { factKind: 'student-leans', kind: 'observation', why: 'a Danya behaviour, rate-matched to his corpus', lead: 25 },
  // The opening's plan counted off master games (P2 #0): the break each side
  // actually goes for, with its share. Computed, never authored.
  openingIdea: { factKind: STORY_KIND['key-break'], kind: 'computed', why: 'the key break master games go for, as an idea while it still needs preparing (`openingStory`), and the opening summary', lead: 61 },
  // THE OPENING'S STORY (OS-3, `openingStory` through the board registry): on a
  // calm opening move these are the teaching — every fact teaches (role), so
  // none is an aside, and the turn's holds (a verdict, danger, a trade in
  // progress) keep them for a calm move.
  openingCost: { factKind: STORY_KIND['structure-cost'], kind: 'computed', why: "the hole the student's own pawn move left, and their piece that can reach it", lead: 63 },
  openingChoice: { factKind: STORY_KIND['branch-choice'], kind: 'computed', why: 'the branch the student chose against the main road, or the move that pays their structure its price', lead: 62 },
  openingTheirs: { factKind: STORY_KIND['their-setup'], kind: 'computed', why: 'the system their move chose and its master-game plan, or the hole their move gave away', lead: 60 },
  openingStory: { factKind: STORY_KIND.character, kind: 'computed', why: "the coming game's character once the kings are placed, or the board's plan once master games run out", lead: 59 },
  openingRoads: { factKind: STORY_KIND.fork, kind: 'computed', why: 'the real crossroads in front of the student, by family name, from master games', lead: 58 },
  // What the opening IS (the identity computer): what it provokes, the
  // structure its master main line reaches, a lasting gambit, sharpness, OTB
  // master games. Said once per game, right after the name.
  // Rides with the name (walk 2026-09-30, game 1: held all game because it
  // shares no square with the move being discussed).
  openingIdentity: { factKind: STORY_KIND.identity, kind: 'computed', why: 'what the named opening provokes, aims for and costs — computed from the master database (`openingStory`)', lead: 44, always: true },
  positional: { factKind: 'structure', kind: 'observation', why: 'the positional read', lead: 25 },
  opening: { factKind: 'opening', kind: 'opening', why: 'the opening named once, when it settles', lead: 45, always: true },
  structure: { factKind: 'structure', kind: 'computed', why: 'the named pawn structure and its plan', lead: 40 },
  pieceQuality: { factKind: 'worst', kind: 'computed', why: 'their best piece / your worst piece', lead: 35 },
  register: { factKind: 'deliberation', kind: 'computed', why: 'but-turn / hedge / candidate compare, where the move is earned', lead: 64 },
  gap: { factKind: 'their-cost', kind: 'computed', why: 'what the opponent’s move left undone', lead: 60 },
  positionFacts: { factKind: 'concept', kind: 'computed', why: 'position facts, already through coachDecider', lead: 50 },
  priorityFirst: { factKind: BOARD_COMPUTERS.priorityFirst.kind, kind: 'computed', why: 'the priority before the move', lead: 68 },
  // PROPHYLAXIS (census rank 2): the quiet move that stops their pin or kick before it lands.
  prophylaxis: { factKind: BOARD_COMPUTERS.prophylaxis.kind, kind: 'computed', why: 'the quiet move that stops their next pin or kick before it lands', lead: 66 },
  rejectedTempting: { factKind: 'refuted', kind: 'computed', why: 'the tempting move and its refutation', lead: 66 },
  // The book move the student left, named with the job it does on the board
  // and what their move left undone (bookMoveWhy) — the "but" of their move.
  // RIDES WITH ITS DEPARTURE (Learn audit 2026-10-14, game 1: a threat turn
  // held the reason and "You left the book with …" spoke bare). It is offered
  // only on the departure ply, where the `opening` line (always) names it.
  bookMove: { factKind: BOARD_COMPUTERS.bookMove.kind, kind: 'computed', why: 'the book move the student left, with the job it does on the board', lead: 64, always: true },
  // Behind the walkability check (2026-09-29): walk 2 heard 3 false lines in 4
  // — routes read off one engine line the CURRENT board cannot walk. Learn
  // filters aims through planArc.aimWalkableNow, and a student plan the
  // student never heard is never "let go".
  // Always rides (2026-09-30): it spoke 0 times in 252 walked plies, held
  // behind every stronger lead, though the computer fired 41 times offline on
  // 20 of his games. Their plan advancing IS the why of their move.
  planArc: { factKind: 'plan-arc', kind: 'plan', why: 'the plan taking shape / advancing / landing / given up — read twice, walkable from this board', lead: 70, always: true },
  // THE VERDICT ON THE STUDENT'S OWN MOVE always rides (Learn walk
  // 2026-10-01, game 1: …Rf6 threw −0.2 → −2.9 and the turn spoke only the
  // back-rank warning — the grade shared no square with it, so it was held).
  // backwardLook returns ONE of these two per move, so this adds one sentence.
  drawback: { factKind: 'quality', kind: 'drawback', why: 'what the student’s own move handed over', lead: 83, always: true },
  mistake: { factKind: 'move', kind: 'mistake', why: 'the mistake call-out', lead: 85, always: true },
  coachMistake: { factKind: 'their-cost', kind: 'coachMistake', why: 'the coach owning its own inaccuracy', lead: 84 },
  fundamental: { factKind: 'fundamental', kind: 'drawback', why: 'the fundamental the move broke', lead: 82 },
  movePoint: { factKind: 'point', kind: 'computed', why: 'the point of the student’s clean move', lead: 62 },
  // The verdict on a GOOD move at a decision moment (P2 #2): the student found
  // one of the only moves that held, and why the others failed.
  foundMove: { factKind: 'quality', kind: 'computed', why: 'the student found one of the only moves that held — and why the rest failed', lead: 79 },
  // THE ANSWER TO A HELD QUESTION (David 2026-10-02): at a deciding moment the
  // move was held back; once the student has played, it is revealed with its
  // reason. Always rides — a question posed and never answered is a tease.
  heldMove: { factKind: 'held', kind: 'computed', why: 'the move held back at a deciding moment, revealed after the student answered', lead: 80, always: true },
  slipAnswer: { factKind: 'held', kind: 'computed', why: 'the answer to the opponent\'s slip, revealed after the student moved from the board the coach said to look at', lead: 80, always: true },
  // What a quiet move is FOR — the reply it took away or the move it made
  // possible, both engine-proven (moveIntent). His most frequent point on a
  // clean move, and the one a board description never says.
  moveIntent: { factKind: 'point', kind: 'computed', why: 'what the student’s move prevents or prepares, engine-proven', lead: 75 },
  // "X first — Y straight away would have run into R" (census #1, his most
  // frequent missing point). Engine-proven by playing the follow-up first.
  // What THEIR move cost them (census #5): a hole your knight can use, their
  // own bishop shut in, castling given up, lasting structural damage.
  // Which piece takes back, and why (census #8): the file it opens, the
  // doubled pawn it avoids, the queen that would be hit with tempo.
  // Bringing pieces to their king (census #2): a shelter pawn taken, a
  // defender removed, a piece brought over or heading there next.
  kingAttack: { factKind: 'point', kind: 'computed', why: 'how the student’s move adds to the attack on their king', lead: 76 },
  // A rule broken for a reason (census #10): the same piece twice, a pawn in
  // front of your own king, the queen out early — the engine agrees, and the
  // board says why here.
  // Don't panic (census #7): their threat was real, the engine's move ignored
  // it, and the student played that move — "you didn't have to react".
  // Push for a win or hold (census #14): what a pawn up or down is worth in
  // THIS ending, while the engine keeps it better-not-won / worse-not-lost.
  pushOrHold: { factKind: 'convert', kind: 'computed', why: 'whether the ending is worth pressing or holding, by its type', lead: 60 },
  // The answer to the threat the instant wave just named (census T4): question
  // first, then what the engine's move does about it. Always rides — a threat
  // said without its answer is the describing he never does.
  threatAnswer: { factKind: 'must-defend', kind: 'computed', why: 'what to do about the threat just named — take, step out, kick, block, guard, or it can wait', lead: 81, always: true },
  falseAlarm: { factKind: 'point', kind: 'computed', why: 'a threat the student rightly ignored, and what answers it', lead: 72 },
  ruleException: { factKind: 'rule', kind: 'computed', why: 'a beginner’s rule the move breaks, and why it is right here', lead: 73 },
  recapture: { factKind: 'trade', kind: 'computed', why: 'which piece takes back and why — compared with the other recapture', lead: 66 },
  theirMoveCost: { factKind: 'their-cost', kind: 'computed', why: 'what the opponent’s move cost them that the student can use', lead: 74 },
  moveOrder: { factKind: BOARD_COMPUTERS.moveOrder.kind, kind: 'computed', why: 'why the move had to come first — the follow-up played first loses material', lead: 77 },
  // ALWAYS rides: a switch is said once, the move it happens — held behind a
  // threat it is lost for good (Fried Liver walk 2026-09-29: the turn to sharp
  // came WITH the threat, lost the lead to it, and was never heard).
  character: { factKind: 'verdict', kind: 'computed', why: 'what the position is about just changed — tactical, positional, converting or holding', lead: 73, always: true },
  // THEIR MOVE'S PURPOSE (hand walk 2026-09-30, Ruy …g6: "g6 has a point: it
  // stops the mate with Qxh7" was HELD behind "Qd3 takes aim at the center" —
  // both rode `positionFacts` and offer order picked). The scoreboard's
  // "their move's purpose" is one of his biggest teaching kinds (4% landed);
  // it is what just happened, so it outranks every description.
  theirPurpose: { factKind: 'opponent-intent', kind: 'computed', why: "what the opponent's move was FOR — the threat of yours it stopped", lead: 74 },
  // What their QUIET move prepares (P2 #5), engine-proven from their seat.
  theirIntent: { factKind: 'opponent-intent', kind: 'computed', why: "what the opponent's quiet move prepares — engine-proven from their seat", lead: 73 },
  // TEMPO, COUNTED (P2 #7): their piece's third move while the student develops.
  // The contested open file, taken by the student's rook (planRace, live).
  fileRace: { factKind: 'point', kind: 'computed', why: 'you both wanted the open file and your rook took it first', lead: 64 },
  tempo: { factKind: 'opp-dev', kind: 'computed', why: 'their piece keeps moving in the opening while you develop — free moves, counted', lead: 70 },
  // A STRONG PLAYER'S CHOICE (P3, depersonalized): what a strong player plays here.
  strongChoice: { factKind: 'quality', kind: 'computed', why: 'what a strong player chooses in this exact position, from real games', lead: 57 },
  // THE SAFETY HABITS (P3 method beats): close the beat after the grade.
  blunderCheck: { factKind: 'method', kind: 'computed', why: 'the move left a piece they simply took — the habit that catches it', lead: 61 },
  // The mistake's habit closes the turn it belongs to (WO-ONE-COACH-01).
  mistakeHabit: { factKind: 'your-habit', kind: 'computed', why: 'the habit that finds this mistake next game — said after the loss', lead: 61 },
  autopilot: { factKind: 'your-habit', kind: 'computed', why: 'the popular move here cost — the moment to stop and check', lead: 59 },
  keepPressing: { factKind: 'method', kind: 'computed', why: 'winning, and a slow move gave them time — keep forcing', lead: 58 },
  pawnEnding: { factKind: 'method', kind: 'computed', why: 'the last pieces came off — count the pawn ending; the outside passer is a decoy', lead: 62 },
  // QUESTION THE KNEE-JERK (P3 method beat): closes the beat after the grade.
  kneeJerk: { factKind: 'your-habit', kind: 'computed', why: 'the reflex recapture cost — ask what comes first', lead: 60 },
  // WAS THE TRADE A GOOD DEAL (P3, T3 #45).
  trade: { factKind: 'trade', kind: 'computed', why: 'the trade you just made — good or bad deal, and why', lead: 68 },
  // THREE WAYS TO MEET CHECK (P3 method beat): once per game, before the student moves.
  checkMethod: { factKind: 'deliberation', kind: 'computed', why: 'you are in check and the king move is not the best answer — list all three', lead: 78 },
  // THE TIMING (P3, parity with review): the move is right NOW because of what came first.
  // The timing of the student's own move ("it works now because their
  // bishop has left") — a reason for the move, not "not yet, first this".
  timing: { factKind: 'point', kind: 'computed', why: 'why this move works now and did not a move earlier', lead: 69 },
  // STALEMATE WATCH (P2 #9): the one move that throws away a won game.
  // Count before you take (P3 how-to-calculate): the student's move lost the count.
  // Split the position (P3 method beat): opposite-side castling, two races.
  countMethod: { factKind: BOARD_COMPUTERS.countMethod.kind, kind: 'computed', why: 'the move took or stood on a square their pieces outnumber — count before you go', lead: 77 },
  stalemate: { factKind: 'deliberation', kind: 'computed', why: 'you are winning and one of your moves would stalemate them', lead: 81 },
  phase: { factKind: 'status', kind: 'computed', why: 'the game has changed phase — take stock of what the position is about now', lead: 72 },
  kingSafety: { factKind: 'king', kind: 'observation', why: 'your own king is still in the centre and castling is ready', lead: 55 },
  // THE STRUCTURE JUDGEMENTS (batch 6, `structureReads`): the second weakness,
  // the key pawn, the semi-outpost, the right piece, the route that fails, the
  // fighting line — a plan-layer reason, proven by its squares or its line.
  // Below what a move is FOR, above the board descriptions.
  structureJudgement: { factKind: 'judgement', kind: 'computed', why: 'a structural judgement — the weakness to aim at, the square, the piece, the route or the plan — proven on the board', lead: 54 },
  causalChain: { factKind: 'does', kind: 'tactic', why: 'a cross-move cause proven on the board — the earlier move that left the piece loose', lead: 80 },
};

export interface LaneFact {
  lane: LearnLane;
  text: string;
  fen: string;
  squares?: readonly string[];
  /** The lines the sentence says — see `VoiceFact.lines`. */
  lines?: readonly SpokenLine[];
  /** Only for lanes whose producer decides the kind itself (the backward look
   *  returns drawback | mistake | coachMistake). */
  kind?: VoiceFactKind;
  /** The claims this line makes, so a claim already said is dropped (the
   *  claim ledger, `voicePackage`). */
  claims?: readonly string[];
  /** What rides on it (`factStakes`) — the door orders by this first. */
  stakes?: FactStakes;
  /** TEACH OR DESCRIBE, from the ONE role table (`FACT_ROLE`) over the fact's
   *  own kind, when the producer knows it. A lane can carry both — the
   *  position-facts lane carries rules ("a king left in the middle gets caught
   *  the moment the center opens") beside plain descriptions — so the fact's
   *  role decides, and the lane is only the fallback (David 2026-10-13: "the
   *  deciding computer needs to value why statements over others"). */
  role?: FacetRole;
  /** The producing computer's own kind for this fact (a position-facts clause
   *  kind: deliberation, your-habit, …). The lane says which producer; this
   *  says which of its facts — emitted on the row, and for the lanes that
   *  carry many kinds it places the fact in the thought (`thoughtStepOf`). */
  factKind?: string;
  /** THIS FACT IS A REASON FOR THE STUDENT'S OWN LAST MOVE, from a lane that
   *  also carries other kinds (a position-facts rule: "Your Qa5 saves it from
   *  their knight"). Set by the producer, never read off the words; the door
   *  places it in the thought's "yours" step, where the move keeps one reason. */
  ownMoveReason?: boolean;
  /** The skill this fact teaches (a MisconceptionTagId), when the producer
   *  knows it — the fade reads it before the lane's own tag, so a lane that
   *  teaches many skills (the rules, the fundamentals) fades per skill. */
  skill?: string;
  /** ITS PROOF, OR WHY IT NEEDS NONE — REQUIRED (root cause, David
   *  2026-10-07): a producer that cannot answer this cannot speak. */
  proof: FactProof;
  /** WHICH OF THE STUDENT'S MOVES IT NAMES — REQUIRED (OS-10): held while one
   *  of them is legal for the student (LEARN NAMES NO MOVE UNASKED). */
  namesStudentMove: NamesStudentMove;
}

/** DANGER speaks first, whatever else is on the board (David 2026-10-05:
 *  "threat first"): an insight before "your knight is attacked" is backwards. */
export const DANGER_LANES: ReadonlySet<LearnLane> = new Set<LearnLane>(['threat', 'dangerLevels', 'threatAnswer']);

/** The lead of one wave of a turn, handed to the next wave. `mateTurn` says a
 *  forced mate spoke in it: the turn stays on the mate across BOTH waves (the
 *  replay of 2026-10-19, 48.d6: "There's a forced mate here — mate in 2" in
 *  the instant wave, then a passed-pawn plan lecture in the late one). */
/** A price this high (centipawns) may carry a verdict, so the instant line
 *  waits for it (`instantWaitsForVerdict`, `nextBoardGate`). Whether the turn
 *  IS a verdict turn is the voiced slip (`LearnTurnTag.slipCp`), not this bar. */
export const VERDICT_TURN_CP = 100;

export interface TurnLead {
  lane: LearnLane; squares: readonly string[]; mateTurn?: true;
  /** The squares of the idea for the move to come that this turn's waves have
   *  said (the core thread, WO-THINK-01) — a later wave's idea must be its
   *  support or news in its own right. Absent when none was said. */
  thread?: readonly string[];
}

export interface TurnDecision {
  pkg: VoicePackage;
  /** Lanes offered this turn, in the order they were offered. */
  offered: LearnLane[];
  /** Lanes whose fact reached the voice. */
  spoke: LearnLane[];
  /** The lane that led, or null when nothing spoke (WO-1b). */
  lead: TurnLead | null;
  /** Board-true facts the lead pick kept quiet — not a cap: a lower-ranked
   *  claim that shares nothing with the lead is a second thought, and one
   *  thought per turn is the rule. Recorded so the audit can see what the
   *  ranking cost. */
  held: LearnLane[];
  /** Lanes that spoke their SHORT phrasing because the student's own record
   *  proves the skill (David 2026-09-30: "Short phrasing when green"). */
  faded: LearnLane[];
  /** THE PROOF LEDGER — the same contract as `CoachDecision` (one coach P1,
   *  2026-10-07): the proof of every fact that SPOKE, keyed by its spoken
   *  text, and the lanes that spoke a conclusion on the `stated` escape. */
  proofOf: ReadonlyMap<string, Proof>;
  unproven: number;
  unprovenLanes: LearnLane[];
}

/** THE FADE. A lane that teaches a skill the student has PROVEN (green on the
 *  heat map — `capabilityProven`) says only its first sentence: the point, not
 *  the lesson again. Not a cap (G4.5): the student's own record decides, and
 *  grey or red keeps the full teaching. A lane fades when it records the
 *  answer itself or is said before the move (its skill proven elsewhere); a
 *  line about a slip just made never fades. */
/** GRADUAL and per skill — the one rule in `fadeText` (every surface). */
export type { FadeLevels } from './fadeText';
export function fadeWhenGreen(lane: LearnLane, text: string, green: FadeLevels | null, skill?: string): string {
  if (!green || green.size === 0) return text;
  const role = COMPUTER_ROLES[lane];
  // A fact's own skill (recorded through the same tag table) fades it; else
  // the lane's tag, when the lane records answers itself OR is said before the
  // move (David 2026-10-18: threat-spotting green, the threat warning still
  // spoke in full — a pre-move warning records no answer, so the green proven
  // elsewhere never reached it). A line about a slip just made never fades.
  const fades = !!role?.tag && (role.held.state === 'wired' || saidBeforeTheMove(role));
  const tag = skill ?? (fades ? role.tag : null);
  return fadeText(text, fadeLevelOf(green, tag));
}

/** Lanes that always ride for a beginner: the principle, said every time. */
const BEGINNER_ALWAYS: ReadonlySet<LearnLane> = new Set<LearnLane>(['fundamental', 'ruleException']);

/** The door. Every Learn free-play utterance is assembled here. */
/** THEIR MOVE'S VERDICT AND COST — what it threw away or handed over. Like the
 *  'but' of the student's own move, these are not the reason for the move; one
 *  of them speaks beside the one reason. */
const THEIR_MOVE_VERDICT: ReadonlySet<LearnLane> = new Set<LearnLane>(['coachMistake', 'theirMoveCost', 'gap', 'tempo']);
/** A reason for the student's own move: what it did, never its verdict. */
function ownMoveReasonStep(lane: LearnLane, step: ThoughtStep): boolean { return step === 'yours' && DNA_BEAT[lane] !== 'but'; }
/** A reason for their move: what it was for, never its verdict or cost. */
function theirMoveReasonStep(lane: LearnLane, step: ThoughtStep): boolean { return step === 'theirs' && !THEIR_MOVE_VERDICT.has(lane); }

export function decideTurn(
  facts: readonly LaneFact[],
  /** What this turn has already said out loud (see `buildVoicePackage`). */
  alreadySaid?: string,
  /** Every phrase already spoken this game. */
  priorKeys?: ReadonlySet<string>,
  /** The lead an EARLIER wave of this same turn already spoke. This wave may
   *  only lead if it outranks it; otherwise it speaks support and safety only,
   *  so a turn stays one thought across its two waves. */
  priorLead?: TurnLead | null,
  /** The tags the student's record has PROVEN (`loadProvenTags`) — lanes on
   *  them fade to their short phrasing. Null when the record is not loaded. */
  green?: FadeLevels | null,
  /** Beginner mode (`isBeginnerMode`): the fundamental behind a slip and the
   *  beginner's rule a move breaks ride every turn instead of competing for
   *  the lead (David 2026-10-02: "Explain fundamentals"). Register only — the
   *  other lanes decide exactly as for anyone else. */
  beginner = false,
  /** Which turn this wave belongs to — emitted on the row so an audit can
   *  join a student move's waves. */
  turn: LearnTurnTag | null = null,
  /** THE TURN'S HOLDS — claims an earlier wave of THIS turn kept quiet, for
   *  any reason. A later wave may not speak them (7.O-O replay 2026-10-20: the
   *  late wave held the Bg4 idea as an aside and the phase wave said it). The
   *  door reads it and writes what it holds; the caller starts a fresh set
   *  for each turn, so a held claim is free again once the turn moves on. */
  heldThisTurn: Set<string> | null = null,
  /** Who owns the voice of this turn (`VoiceOwner`). */
  owner: VoiceOwner = 'open',
): TurnDecision {
  const decideStart = Date.now();
  if (owner !== 'open') return ownedTurn(facts, turn, decideStart, owner);
  const offered: LearnLane[] = [];
  const faded: LearnLane[] = [];
  const open: Array<VoiceFact & { lane: LearnLane; step: ThoughtStep; offerValue: number; offerRank: number }> = [];
  const phaseHeld: LearnLane[] = [];
  const moveHeld: LearnLane[] = [];
  const heldEarlier: LearnLane[] = [];
  for (const f of facts) {
    if (!f.text.trim()) continue;
    offered.push(f.lane);
    if (laneOutOfPhase(f.lane, f.fen)) { if (!phaseHeld.includes(f.lane)) phaseHeld.push(f.lane); for (const c of f.claims ?? []) heldThisTurn?.add(c); continue; }
    if (heldThisTurn && f.claims?.some((c) => heldThisTurn.has(c))) { if (!heldEarlier.includes(f.lane)) heldEarlier.push(f.lane); continue; }
    // LEARN NAMES NO MOVE UNASKED (OS-10): a fact that names a move the
    // student can play next waits — the producer said which (REQUIRED).
    if (namesPlayableStudentMove(f.namesStudentMove)) { if (!moveHeld.includes(f.lane)) moveHeld.push(f.lane); for (const c of f.claims ?? []) heldThisTurn?.add(c); continue; }
    const text = fadeWhenGreen(f.lane, f.text, green ?? null, f.skill);
    if (text !== f.text && !faded.includes(f.lane)) faded.push(f.lane);
    // ONE REASON PER MOVE, ACROSS EVERY WAVE AND BOTH SEATS (Learn tapes
    // 2026-10-19 and 2026-10-29: "That's what strong players play here — it
    // saves it…" then "Your queen to a5 saves it…"; "Their d4 frees their
    // bishop…" then "Their d4 stakes a claim in the center…"). Every reason for
    // a move — whichever computer gave it — carries the one claim for that
    // move, so the say-once ledger keeps one: the most valuable in this wave
    // (the package keeps the first of a claim, and the facts go in by value),
    // and in a later wave the reason an earlier one already said.
    // A producer that knows its fact is the reason for the student's own move
    // says so (`ownMoveReason`); the lane is only the fallback.
    const step: ThoughtStep = f.ownMoveReason ? 'yours' : thoughtStepOf(f.lane, f.factKind);
    const moveClaim = turn && turn.kind !== 'phase'
      ? (ownMoveReasonStep(f.lane, step) ? `own-move-reason:${turn.ply}` : theirMoveReasonStep(f.lane, step) ? `their-move-reason:${turn.ply}` : null)
      : null;
    const claims = moveClaim ? [...(f.claims ?? []), moveClaim] : f.claims;
    // A story beat speaks whole or not at all (prod audit 2026-10-20).
    open.push({ lane: f.lane, kind: f.kind ?? LEARN_LANES[f.lane].kind, text, fen: f.fen, squares: f.squares, claims, lines: f.lines, proof: f.proof, whole: STORY_LANES.has(f.lane), step,
      offerValue: stakeValue(f.stakes) ?? LEARN_LANES[f.lane].lead,
      offerRank: (OWED_ANSWER.has(f.lane) ? 1 : 0) - (fallbackReason(f.claims) ? 1 : 0) });
  }
  // THE FACTS GO IN BY VALUE, so where two claim one thing the package keeps
  // the one worth more — never the one a producer happened to offer first. An
  // answer the coach owes goes first; a move's fallback reason (its board job)
  // last — it is said only when no sharper computer had one.
  const byOffer = open.map((o, i) => ({ o, i })).sort((a, b) => b.o.offerRank - a.o.offerRank || b.o.offerValue - a.o.offerValue || a.i - b.i).map((x) => x.o);
  const verified = buildVoicePackage(byOffer.map(({ kind, text, fen, squares, claims, lines, whole }) => ({ kind, text, fen, squares, claims, lines, whole })), alreadySaid, priorKeys);
  // Which lane each surviving fact came from (the package may trim the text).
  const laneOf = (k: VoiceFact): LearnLane | undefined =>
    open.find((o) => o.text === k.text || (k.text.length > 0 && o.text.includes(k.text)))?.lane;
  const survivors = verified.kept
    .map((k) => ({ fact: k, lane: laneOf(k) }))
    .filter((x): x is { fact: VoiceFact; lane: LearnLane } => x.lane !== undefined);
  const refusedWhy: Partial<Record<LearnLane, string>> = {};
  for (const d of verified.dropped) { const l = laneOf(d.fact); if (l && !survivors.some((x) => x.lane === l)) refusedWhy[l] ??= d.reason; }

  // ONE ORDER, NO HOLD (David 2026-10-05: "If there are 5 important facts or a
  // plan that comes from the move then the user needs to hear it"). The door
  // no longer picks one thought and holds the rest: every survivor of the
  // package speaks. What decides the SEQUENCE is computed, not a lane table:
  //   1. danger first (the threat, and what to do about it);
  //   2. then the fact with the most at stake (`factStakes.stakeValue`);
  //   3. then the rest in his turn grammar (the DNA beat), stakes first
  //      inside a beat, the lane table only as the tie-break for facts that
  //      carry no stakes.
  const stakesOf = (lane: LearnLane, text: string): FactStakes | undefined => {
    const f = open.find((o) => o.lane === lane && (o.text === text || o.text.includes(text)));
    return f ? facts.find((x) => x.lane === lane && x.text.trim() && (x.text === f.text || fadeWhenGreen(x.lane, x.text, green ?? null, x.skill) === f.text))?.stakes : undefined;
  };
  const stakeOf = (lane: LearnLane, text: string): number => stakeValue(stakesOf(lane, text)) ?? 0;
  // The fact's own role (`LaneFact.role`), read the same way as its stakes.
  const roleOf = (lane: LearnLane, text: string): FacetRole | undefined => {
    const f = open.find((o) => o.lane === lane && (o.text === text || o.text.includes(text)));
    return f ? facts.find((x) => x.lane === lane && x.text.trim() && (x.text === f.text || fadeWhenGreen(x.lane, x.text, green ?? null, x.skill) === f.text))?.role : undefined;
  };
  /** A fact that TEACHES — its role says so, or (no role) its lane is not a
   *  board description. A teaching fact is a reason, never "an aside". */
  const teaches = (x: { fact: VoiceFact; lane: LearnLane }): boolean => {
    const r = roleOf(x.lane, x.fact.text);
    if (r) return r === 'teach';
    return !(LEARN_LANES[x.lane].lead <= DESCRIPTION_LEAD || x.lane === 'positionFacts');
  };
  const value = (x: { fact: VoiceFact; lane: LearnLane }): number => stakeOf(x.lane, x.fact.text) || LEARN_LANES[x.lane].lead;
  /** Which step of the thought a surviving fact says (its own clause kind for
   *  the lanes that carry many). */
  const stepOf = (x: { fact: VoiceFact; lane: LearnLane }): ThoughtStep =>
    open.find((o) => o.lane === x.lane && (o.text === x.fact.text || o.text.includes(x.fact.text)))?.step ?? thoughtStepOf(x.lane);
  /** A reason for the student's own move that teaches (never its verdict). */
  const ownReasonOf = (x: { fact: VoiceFact; lane: LearnLane }): boolean => ownMoveReasonStep(x.lane, stepOf(x)) && teaches(x);
  // ONE CLAIM, ONE SEAT (unity U6, Learn walk #26: the d5 pawn was "a
  // discovered attack in waiting" for them AND "pinned by your rook" — one
  // geometry read from both sides). Facts about the same squares collapse to
  // the one that matters: danger first, then the bigger stake. Squares are
  // the facts' own, coupled at emission — never read back out of the prose.
  const subsumed = new Set<{ fact: VoiceFact; lane: LearnLane }>();
  for (const a of survivors) {
    if (subsumed.has(a)) continue;
    for (const b of survivors) {
      if (a === b || subsumed.has(b)) continue;
      if (!sameClaim({ sq: a.fact.squares ?? [], family: null }, { sq: b.fact.squares ?? [], family: null })) continue;
      const ad = DANGER_LANES.has(a.lane); const bd = DANGER_LANES.has(b.lane);
      // A MOVE'S VERDICT IS ITS OWN CLAIM: its cost ("it left e5 short of a
      // defender") shares squares with what the move does ("it attacks e5")
      // and is not the same claim. One geometry read from two seats (a pin
      // and the discovery behind it) still collapses; danger still subsumes.
      if (!ad && !bd && (DNA_BEAT[a.lane] === 'but') !== (DNA_BEAT[b.lane] === 'but')) continue;
      // THE STUDENT'S OWN MOVE KEEPS ITS REASON (V6, Learn on David's record
      // 2026-10-20: "the point of your move" lost to a board read of the same
      // squares, and the move got no reason). One claim, said once — as what
      // the move did, unless the other seat is danger.
      const ao = !ad && ownReasonOf(a);
      const bo = !bd && ownReasonOf(b);
      const loser = ad !== bd ? (ad ? b : a) : ao !== bo ? (ao ? b : a) : value(b) > value(a) ? a : b;
      subsumed.add(loser);
      if (loser === a) break;
    }
  }
  // YOUR FORCED MATE COMES FIRST (2026-10-13). Danger leads a turn — unless
  // the student has a forced mate on the board: they mate before any threat
  // of theirs lands, so "they threaten Qxf2" beside "you have mate in three"
  // teaches the wrong priority. The seat and the forcing come from the stake
  // (`mateStakes`), never from the prose.
  const ownForcedMate = survivors.some((x) => {
    if (subsumed.has(x)) return false;
    const m = stakesOf(x.lane, x.fact.text)?.mate;
    return m?.for === 'you' && m.forced;
  });
  const dangerWaits = (x: { lane: LearnLane }): boolean => ownForcedMate && DANGER_LANES.has(x.lane);
  // A MATE TURN STAYS ON THE MATE (hard-question walk 2026-10-11, 21.e6: the
  // allowed mate in 6 was said between a weak-pawn lecture and "the scare is
  // empty"). A fact staked at a forced mate makes every fact that is neither
  // danger nor itself a mate wait for a calm board.
  // A forced mate, whoever's and however far — read off the stake's own flag.
  const isMateFact = (x: { fact: VoiceFact; lane: LearnLane }): boolean => !!stakesOf(x.lane, x.fact.text)?.mate?.forced;
  const mateTurn = !!priorLead?.mateTurn || survivors.some((x) => !subsumed.has(x) && isMateFact(x));
  const verdict = survivors.find((x) => x.lane === 'mistake' && !subsumed.has(x)) ?? null;
  // A DANGER THAT COSTS SOMETHING NOW (OS-1 replay 2026-10-19, 22.Rxa5: "No
  // rush yet — if you play b4 and they answer Ra1, their rook pins your
  // bishop" spoke for twenty seconds and the blunder's verdict, queued behind
  // it, was never heard). A warning with nothing lost by force this move is
  // not danger on a verdict turn: it waits. A danger with stakes always
  // speaks — the stakes are the producer's own (`threatStakes`), never prose.
  // Read by the thought's own step, so a board clause that is danger
  // (`must-defend`) is held by the same rule as a danger lane.
  const presentDanger = (x: { fact: VoiceFact; lane: LearnLane }): boolean =>
    (DANGER_LANES.has(x.lane) || stepOf(x) === 'danger') && stakeOf(x.lane, x.fact.text) > 0;
  /** A slip the turn SAYS makes this whole turn a verdict turn, weighed by
   *  its own price — the one grade, never a raw-cp bar beside it. */
  const slipCp = turn ? turn.slipCp : null;
  const costTurnValue = slipCp !== null ? stakeValue(costStakes(slipCp)) ?? null : null;
  // THE TURN'S HOLDS DECIDE BEFORE ITS LEAD (Learn audit 2026-10-14, LD2: a
  // lead was picked, then held by the mate rule, and the row named a lead that
  // never spoke). One predicate, read by the lead pick and the speak loop.
  const midExchange = turn ? turn.midExchange : null;
  const priceUnsettled = !!turn && !turn.priceSettled;
  // ONE ANSWER PER HELD FACT: why it waits (the hold and its reason used to be
  // two computations, and a costly-move hold was reported as 'mate-turn').
  const holdWhy = (x: { fact: VoiceFact; lane: LearnLane }): HoldReason | null => {
    // AN AFFIRM NEVER SPEAKS ON AN UNSETTLED PRICE: it can wait a turn; a
    // move praised at depth 14 and a mistake at 16 is the coach lying twice.
    if (priceUnsettled && DNA_BEAT[x.lane] === 'affirm') return 'price-unsettled';
    if (mateTurn && !DANGER_LANES.has(x.lane) && !isMateFact(x)) return 'mate-turn';
    // A VERDICT TURN STAYS ON THE VERDICT (David 2026-10-11, the "very good"
    // bar: 35–50 words, one lead). When the student's move is graded, the
    // grade, its cost ('but' beats) and any danger speak; a plan, a route or a
    // method aside worth less than the verdict waits for a calm move.
    if (verdict && x !== verdict && !presentDanger(x) && !VERDICT_TURN_STEPS.has(stepOf(x))
      && stakeOf(x.lane, x.fact.text) < stakeOf(verdict.lane, verdict.fact.text)) return 'verdict-turn';
    // …AND A COSTLY MOVE IS A VERDICT TURN IN EVERY WAVE, whichever lane
    // carries the grade: the move's own cost is the verdict's weight.
    if (!verdict && costTurnValue !== null && !presentDanger(x) && !VERDICT_TURN_STEPS.has(stepOf(x))
      && stakeOf(x.lane, x.fact.text) < costTurnValue) return 'verdict-turn';
    // A TRADE IN PROGRESS IS A NOW TURN (Learn walk 2026-10-19, 12…Nxb3 and
    // 13…Bxg3: "break open with the pawn push that is ready now" and
    // "overprotect your best piece" while the recapture was owed). An idea, a
    // plan or a board read waits until the trade is finished; danger, the
    // verdict and a tactic still speak.
    if (midExchange && (DNA_BEAT[x.lane] === 'point' || STORY_LANES.has(x.lane)) && x.lane !== 'tactic' && !isMateFact(x)) return 'mid-exchange';
    return null;
  };
  const turnHolds = (x: { fact: VoiceFact; lane: LearnLane }): boolean => holdWhy(x) !== null;
  let top: { fact: VoiceFact; lane: LearnLane } | null = null;
  for (const x of survivors) {
    if (subsumed.has(x) || dangerWaits(x) || turnHolds(x)) continue;
    if (!top) { top = x; continue; }
    const xd = DANGER_LANES.has(x.lane); const td = DANGER_LANES.has(top.lane);
    if (xd !== td) { if (xd) top = x; continue; }
    if (value(x) > value(top)) top = x;
  }
  // ONE REASON FOR ONE MOVE (Learn audit 2026-10-18, 121 words: "The queen
  // bears down on c5, d5, e5 and f5…" AND "Your queen to a5 saves it from
  // their knight on c3"): every reason for the move carries the move's one
  // claim, so the package kept one (by value; the board-teacher's fallback
  // last). EVERY STUDENT MOVE GETS ITS OWN REASON (David 2026-10-14): that one
  // is never an aside — on a good move it was held whenever a plan or a board
  // read led the turn, so the coach explained danger and never what a good
  // move was for.
  const live = (x: { fact: VoiceFact; lane: LearnLane }): boolean => !subsumed.has(x) && !dangerWaits(x) && !turnHolds(x);
  // IMPORTANT IS COMPUTED, NOT COUNTED (David 2026-10-06: "if there are 5
  // important facts … the user needs to hear it"): at least a pawn at stake
  // (`factStakes`, discounted by distance), a forced mate, or a beginner's
  // principle speaks in its step whatever else the step holds.
  const important = (x: { fact: VoiceFact; lane: LearnLane }): boolean =>
    stakeOf(x.lane, x.fact.text) >= STAKED_FLOOR + 100 || isMateFact(x) || (beginner && BEGINNER_ALWAYS.has(x.lane));
  // ONE FACT PER STEP (WO-THINK-01): each move keeps one reason, the student's
  // move one cost and their move one verdict, the position one verdict, the
  // turn one habit — the most valuable (an answer the coach owes first, a
  // move's fallback reason last). A further cost, verdict or habit speaks when
  // it carries real stakes or must ride ("every reason for a slip speaks" —
  // each carries the slip's price); a second reason for one move never does.
  // The move claims above keep the reason one across waves.
  type Slot = 'yours-reason' | 'yours-cost' | 'their-reason' | 'their-verdict' | 'verdict' | 'habit';
  const slotOf = (x: { fact: VoiceFact; lane: LearnLane }): Slot | null => {
    const st = stepOf(x);
    if (st === 'verdict' || st === 'habit') return st;
    if (st === 'yours') return DNA_BEAT[x.lane] === 'but' ? 'yours-cost' : 'yours-reason';
    if (st === 'theirs') return THEIR_MOVE_VERDICT.has(x.lane) ? 'their-verdict' : 'their-reason';
    return null;
  };
  // The turn is about the slip, so its own habit is the turn's one habit —
  // as it was when the habit rode inside the verdict (WO-ONE-COACH-01).
  const slotRank = (x: { fact: VoiceFact; lane: LearnLane }): number =>
    (OWED_ANSWER.has(x.lane) || x.lane === 'mistakeHabit' ? 1e6 : 0) - (fallbackReason(x.fact.claims) ? 1e6 : 0) + value(x);
  const slotPick = new Map<Slot, { fact: VoiceFact; lane: LearnLane }>();
  for (const x of survivors) {
    const slot = slotOf(x);
    if (!slot || !live(x)) continue;
    const best = slotPick.get(slot);
    if (!best || slotRank(x) > slotRank(best)) slotPick.set(slot, x);
  }
  // The move's one reason (when it teaches) — never an aside, it rides.
  const ownReason = ((): { fact: VoiceFact; lane: LearnLane } | null => { const p = slotPick.get('yours-reason'); return p && ownReasonOf(p) ? p : null; })();
  // ONE THREAD FOR THE MOVE TO COME (WO-THINK-01, David 2026-10-29: "One
  // thread, never a stack"; prod Learn 2026-10-29 said "don't cash in on g4
  // yet", "nothing attacks f7 yet", "a pawn break is ready now" and "their
  // knight sits in front of c2" in one turn). The choices, the not-yet and the
  // board carry ONE idea: the most valuable leads it, and another speaks only
  // as its support — it shares a square, one per step — or as news in its own
  // right (important). An earlier wave's idea anchors this wave's.
  const isCore = (x: { fact: VoiceFact; lane: LearnLane }): boolean => CORE_STEPS.has(stepOf(x));
  // A reason leads the thread over a description; then the more valuable.
  const coreLive = survivors.filter((x) => live(x) && isCore(x)).sort((a, b) => Number(teaches(b)) - Number(teaches(a)) || value(b) - value(a));
  const priorThread = priorLead?.thread ?? null;
  const touches = (x: { fact: VoiceFact }, sq: readonly string[]): boolean => (x.fact.squares ?? []).some((q) => sq.includes(q));
  const thread = priorThread ? coreLive.find((x) => touches(x, priorThread)) ?? null : coreLive[0] ?? null;
  const threadSquares = thread ? (thread.fact.squares ?? []) : (priorThread ?? []);
  const coreKeep = new Set<{ fact: VoiceFact; lane: LearnLane }>();
  {
    const usedStep = new Set<ThoughtStep>();
    if (thread) { coreKeep.add(thread); usedStep.add(stepOf(thread)); }
    for (const x of coreLive) {
      if (x === thread) continue;
      if (important(x)) { coreKeep.add(x); continue; }
      if (!usedStep.has(stepOf(x)) && touches(x, threadSquares)) { coreKeep.add(x); usedStep.add(stepOf(x)); }
    }
  }
  /** Why the thought holds this fact, or null when it speaks. */
  const thoughtHold = (x: { fact: VoiceFact; lane: LearnLane }): HoldReason | null => {
    if (isCore(x)) return coreKeep.has(x) ? null : 'second-thought';
    const slot = slotOf(x);
    if (!slot || slotPick.get(slot) === x) return null;
    // A move has ONE reason whatever rides on the others (Learn tape
    // 2026-10-29: two reasons for their d4 in one turn); a second cost,
    // verdict or habit with real stakes, or one that must ride, is news.
    if (slot === 'yours-reason' || slot === 'their-reason') return 'same-step';
    return important(x) || LEARN_LANES[x.lane].always === true ? null : 'same-step';
  };
  const priorValue = priorLead ? LEARN_LANES[priorLead.lane].lead : -1;
  const ownLead = top && (!priorLead || DANGER_LANES.has(top.lane) || value(top) > priorValue) ? top : null;
  const anchor = ownLead ? (ownLead.fact.squares ?? []) : (priorLead?.squares ?? []);

  const keep: VoiceFact[] = [];
  const spoke: LearnLane[] = [];
  const held: LearnLane[] = [];
  // WHY each lane was held — the door's decision made inspectable (A-plan P0:
  // "count before you take" was held 4 of 4 and nothing said why).
  const heldWhy: Partial<Record<LearnLane, HoldReason>> = {};
  const hold = (lane: LearnLane, why: HoldReason): void => { if (!held.includes(lane)) held.push(lane); heldWhy[lane] ??= why; };
  for (const l of phaseHeld) hold(l, 'out-of-phase');
  for (const l of moveHeld) hold(l, 'names-move');
  for (const l of heldEarlier) hold(l, 'held-this-turn');
  // "NOTHING HINGES ON YOUR NEXT MOVE" NEVER SITS BESIDE A STAKE (Alekhine
  // walk 2026-10-19: "Watch c2 — a knight forks there in 2…" then "Nothing
  // hinges on your next move"). Both were true — every top move met the fork —
  // but the calm read only speaks on a turn where nothing else is at stake.
  const calmRead = (x: { fact: VoiceFact }): boolean => !!x.fact.claims?.includes('srr:any-move-fine');
  const somethingAtStake = survivors.some((y) => !calmRead(y) && !subsumed.has(y) && stakeOf(y.lane, y.fact.text) > 0);
  for (const x of survivors) {
    { const why = holdWhy(x); if (why) { hold(x.lane, why); continue; } }
    if (dangerWaits(x)) { hold(x.lane, 'danger-waits'); continue; }
    if (somethingAtStake && calmRead(x)) { hold(x.lane, 'contradicts'); continue; }
    // A DESCRIPTION — nothing at stake, from a lane that describes the board
    // (or an unstaked board-read riding position facts) — speaks only as
    // SUPPORT: it must touch the lead's squares AND add one of its own. "Your
    // queen on d3 takes aim at the center" beside "g6 stops the mate" is the
    // board described where he explains the move (hand walks 2026-09-30).
    // Everything staked or teaching speaks, however many there are.
    const describes = x !== ownLead && stakeOf(x.lane, x.fact.text) === 0 && !(beginner && BEGINNER_ALWAYS.has(x.lane))
      && !teaches(x);
    const sq = x.fact.squares ?? [];
    const restates = describes && !(sq.some((q) => anchor.includes(q)) && sq.some((q) => !anchor.includes(q)));
    // A DANGER TURN STAYS ON THE DANGER (prod tape 2026-10-06: a hanging queen
    // and, in the same breath, a slow-plan test and "leave the capture hanging
    // over them" — 171 words). While a threat leads, another fact speaks if it
    // touches the danger's squares, is bigger news by stake, or must ride;
    // the rest waits for a calm board. Relevance, not a count.
    const offTopic = !!ownLead && DANGER_LANES.has(ownLead.lane) && x !== ownLead && x !== ownReason && !DANGER_LANES.has(x.lane)
      // A must-ride lane still rides — unless it is a board IDEA (the point
      // beat: their plan, the structure), which keeps until the board calms.
      && (LEARN_LANES[x.lane].always !== true || DNA_BEAT[x.lane] === 'point') && !(beginner && BEGINNER_ALWAYS.has(x.lane))
      && !sq.some((q) => anchor.includes(q)) && value(x) < value(ownLead);
    // THE THOUGHT (WO-THINK-01): one fact per step, one thread for the move to
    // come — replacing "a reason is important too", under which every fact a
    // producer marked as teaching spoke, so a turn stacked five reasons about
    // five different things (prod Learn 2026-10-29, 102 words a move). A reason
    // is still valued over a description: it leads its step.
    const thought = thoughtHold(x);
    if (subsumed.has(x)) { hold(x.lane, 'subsumed'); continue; }
    if (!restates && !offTopic && !thought) {
      keep.push(x.fact);
      if (!spoke.includes(x.lane)) spoke.push(x.lane);
    } else hold(x.lane, restates ? 'restates' : offTopic ? 'off-topic' : thought ?? 'second-thought');
  }
  // ONE HABIT A TURN (prod Learn audit 2026-10-20: a 142-word mistake turn
  // taught "End every move with a count…" AND "Blunder check… run CCT… That is
  // the 'Is my move safe?' habit"). A fact carrying a `method:` claim teaches a
  // habit; the turn keeps one — the habit the verdict itself carries (the turn
  // is about that slip), else the most valuable — and holds the rest. A habit
  // already said in an earlier wave of the turn holds this wave's, unless it
  // rides inside the verdict.
  const METHOD_SAID = 'turn:method-said';
  const teachesMethod = (f: VoiceFact): boolean => !!f.claims?.some((c) => c.startsWith('method:'));
  const methodKept = survivors.filter((x) => keep.includes(x.fact) && teachesMethod(x.fact));
  if (methodKept.length > 0) {
    const saidBefore = !!heldThisTurn?.has(METHOD_SAID);
    // The verdict's own habit: inside the verdict, or its own fact in the
    // habit step (`mistakeHabit`, said last — WO-ONE-COACH-01).
    const verdictHabit = methodKept.find((x) => x === verdict) ?? methodKept.find((x) => x.lane === 'mistakeHabit');
    const winner = saidBefore ? (verdictHabit ?? null)
      : (verdictHabit ?? [...methodKept].sort((a, b) => value(b) - value(a))[0]);
    for (const x of methodKept) {
      if (x === winner) continue;
      keep.splice(keep.indexOf(x.fact), 1);
      if (!keep.some((f) => survivors.find((y) => y.fact === f)?.lane === x.lane)) { const i = spoke.indexOf(x.lane); if (i >= 0) spoke.splice(i, 1); }
      hold(x.lane, 'one-method');
    }
    if (winner) heldThisTurn?.add(METHOD_SAID);
  }
  // THE MARGINAL BAR — LENGTH IS DECIDED BY VALUE, NEVER BY A COUNT (David
  // 2026-10-19: "Too many words should be controlled by the algo!!", after a
  // real-record walk averaged 158 words a move). Every fact above cleared the
  // relevance tests, and every "important" one spoke however much the turn had
  // already said. Up to the 80-word average nothing changes. Past it, a further
  // fact must carry real stakes (a pawn or more, `factStakes`) or be a reason
  // the student's move fell short; an unstaked lesson or description waits for
  // a calm move. The lead, danger, the move's own reason, a mate and a
  // beginner's principle always ride. No word cap (2026-10-15): a staked fact
  // still speaks however long the turn — the bar rises, it never stops.
  const wordsIn = (t: string): number => t.split(/\s+/).filter(Boolean).length;
  const rides = (x: { fact: VoiceFact; lane: LearnLane }): boolean => x === ownLead || x === ownReason
    || DANGER_LANES.has(x.lane) || DNA_BEAT[x.lane] === 'but' || isMateFact(x) || (beginner && BEGINNER_ALWAYS.has(x.lane));
  const laneOfKept = (f: VoiceFact): LearnLane | undefined => survivors.find((y) => y.fact === f)?.lane;
  const kept = survivors.filter((x) => keep.includes(x.fact));
  let words = wordsIn(alreadySaid ?? '') + kept.filter(rides).reduce((n, x) => n + wordsIn(x.fact.text), 0);
  for (const x of kept.filter((k) => !rides(k)).sort((a, b) => value(b) - value(a))) {
    if (words >= TURN_WORD_TARGET && stakeOf(x.lane, x.fact.text) < STAKED_FLOOR + 100) {
      keep.splice(keep.indexOf(x.fact), 1);
      if (!keep.some((f) => laneOfKept(f) === x.lane)) { const i = spoke.indexOf(x.lane); if (i >= 0) spoke.splice(i, 1); }
      hold(x.lane, 'marginal');
      continue;
    }
    words += wordsIn(x.fact.text);
  }
  const laneFor = (f: VoiceFact): LearnLane | undefined => survivors.find((x) => x.fact === f)?.lane;
  const beatOf = (f: VoiceFact): number => {
    const lane = laneFor(f);
    return lane ? BEAT_ORDER[DNA_BEAT[lane]] : BEAT_ORDER.point;
  };
  // THE TURN IS SAID IN HIS ORDER (WO-THINK-01): danger first, then the name,
  // what your move changed, what theirs changed, the choices, "not yet", the
  // idea on the board, what the position is about, and the habit last — never
  // as an opener (Learn tape 2026-10-15: "Blunder check before you let go of a
  // piece…" spoke before "Castle queenside was a mistake"). Inside a step the
  // thread's own fact leads, then the DNA beat (a move's reason before its
  // cost), then the more valuable.
  const stepRank = (f: VoiceFact): number => {
    const x = survivors.find((y) => y.fact === f);
    if (!x) return THOUGHT_ORDER.board;
    return DANGER_LANES.has(x.lane) ? -1 : THOUGHT_ORDER[stepOf(x)];
  };
  const threadFirst = (f: VoiceFact): number => (thread && f === thread.fact ? 0 : 1);
  const worth = (f: VoiceFact): number => { const lane = laneFor(f); return lane ? value({ fact: f, lane }) : 0; };
  keep.sort((a, b) => stepRank(a) - stepRank(b) || threadFirst(a) - threadFirst(b) || beatOf(a) - beatOf(b) || worth(b) - worth(a));
  // What this wave held joins the turn's holds — the producer's own claims,
  // never the per-move reason marker (a held reason must not silence the
  // reason a later wave gives the same move).
  if (heldThisTurn) {
    for (const x of survivors) {
      if (keep.includes(x.fact)) continue;
      for (const c of x.fact.claims ?? []) if (!c.startsWith('own-move-reason:') && !c.startsWith('their-move-reason:')) heldThisTurn.add(c);
    }
  }
  const pkg: VoicePackage = {
    spoken: joinSpoken(keep),
    kept: keep,
    dropped: [
      ...verified.dropped,
      ...survivors.filter((x) => !keep.includes(x.fact)).map((x) => ({ fact: x.fact, reason: 'a description that adds nothing to the lead' })),
    ],
  };
  // THE LEAD IS WHAT SPOKE (prod Learn audit 2026-10-29, ply 18): a lead held
  // after it was chosen — "one habit a turn" kept the verdict's habit over the
  // blunder check that led — hands the lead to the first fact that speaks, so
  // the next wave anchors on a sentence the student heard.
  const spokenLead = ownLead && keep.includes(ownLead.fact) ? ownLead
    : ownLead && keep[0] ? survivors.find((x) => x.fact === keep[0]) ?? null
      : null;
  // The turn's idea travels with its lead: this wave's thread if it spoke,
  // else the one an earlier wave said.
  const threadSaid = thread && keep.includes(thread.fact) ? (thread.fact.squares ?? []) : priorThread;
  const lead: TurnLead | null = spokenLead
    ? { lane: spokenLead.lane, squares: spokenLead.fact.squares ?? [], ...(mateTurn ? { mateTurn: true as const } : {}), ...(threadSaid ? { thread: threadSaid } : {}) }
    : null;
  // THE PROOF LEDGER over what spoke — the proof travels with the fact from
  // its producer (`LaneFact.proof`), never re-derived.
  const proofOf = new Map<string, Proof>();
  const unprovenLanes: LearnLane[] = [];
  for (const k of keep) {
    const lane = laneFor(k);
    const src = lane ? open.find((o) => o.lane === lane && (o.text === k.text || o.text.includes(k.text))) : undefined;
    if (!src) continue;
    if (isProof(src.proof)) proofOf.set(k.text, src.proof);
    else if (src.proof && src.proof.none === 'stated' && lane && !unprovenLanes.includes(lane)) unprovenLanes.push(lane);
  }
  // THE WHY THAT WAS COMPUTED AND NOT SAID — measured, never decided here.
  const proofUnsaid: LearnLane[] = [];
  for (const k of keep) {
    const p = proofOf.get(k.text); const lane = laneFor(k);
    if (p && lane && p.short && !k.text.includes(p.short) && !proofUnsaid.includes(lane)) proofUnsaid.push(lane);
  }
  const heldWithProof: LearnLane[] = [];
  const heldStaked: LearnLane[] = [];
  for (const x of survivors) {
    if (keep.includes(x.fact)) continue;
    const src = open.find((o) => o.lane === x.lane && (o.text === x.fact.text || o.text.includes(x.fact.text)));
    if (isProof(src?.proof) && !heldWithProof.includes(x.lane)) heldWithProof.push(x.lane);
    if (stakeOf(x.lane, x.fact.text) > 0 && !heldStaked.includes(x.lane)) heldStaked.push(x.lane);
  }
  // EMIT every decision (the algo-audit rule): a door whose decisions cannot be
  // inspected can only be judged by reading the tape.
  // Read off the thought's "yours" step — the facts about the student's own
  // move, whichever lane carried them (a position-facts rule, a binding) —
  // with the DNA beat saying a reason ('affirm') from a cost ('but').
  const ownKept = keep.map((f) => survivors.find((x) => x.fact === f)).filter((x): x is { fact: VoiceFact; lane: LearnLane } => !!x && stepOf(x) === 'yours');
  const ownMove = ownKept.some((x) => DNA_BEAT[x.lane] === 'but') ? 'but' : ownKept.length > 0 ? 'affirm' : null;
  // WHICH COMPUTER gave the move its reason — so an audit can tell an
  // engine-proven purpose from a board description (the why counter reads
  // wording; this reads the source).
  const ownLanes = [...new Set(ownKept.map((x) => x.lane))];
  // …and whether that reason carries a COMPUTED proof (a line, proven
  // squares) — the lane alone cannot say: `movePoint` carries both the
  // engine's winning line and a board description.
  const ownProven = ownKept.some((x) => proofOf.has(x.fact.text));
  // WHAT spoke inside a many-fact lane (A-plan P0: the weighing and the habit
  // ride the position-facts lane, so a lane count could not see them).
  const spokeKinds = keep.flatMap((f) => {
    const l = laneFor(f);
    const k = facts.find((x) => x.lane === l && (x.text === f.text || x.text.includes(f.text) || f.text.includes(x.text)))?.factKind;
    return k ? [k] : [];
  });
  if (offered.length > 0) emitLearnTurn({ spokeKinds, offered: [...offered], spoke: [...spoke], lead: lead?.lane ?? null, held: [...held], faded: [...faded], unproven: unprovenLanes.length, unprovenLanes: [...unprovenLanes], proofUnsaid: [...proofUnsaid], heldWithProof: [...heldWithProof], heldStaked: [...heldStaked], heldWhy: { ...heldWhy }, refusedWhy: { ...refusedWhy }, ownMove, ownLanes, ownProven, turn, decidedAt: Date.now(), decideMs: Date.now() - decideStart });
  return { pkg, offered, spoke, lead, held, faded, proofOf, unproven: unprovenLanes.length, unprovenLanes };
}

/** A turn a mission or a focus owns: nothing speaks, every offered lane is
 *  held — as `mission`, or in a focus game as `focus-voice` (the fact is about
 *  the focus: the runner says it) or `off-focus` — and the row is emitted
 *  like any other decision. */
function ownedTurn(facts: readonly LaneFact[], turn: LearnTurnTag | null, decideStart: number, owner: Exclude<VoiceOwner, 'open'>): TurnDecision {
  const offered = facts.filter((f) => f.text.trim()).map((f) => f.lane);
  const held = [...new Set(offered)];
  const heldWhy: Partial<Record<LearnLane, HoldReason>> = {};
  const focus = owner === 'mission' ? null : (owner.slice('focus:'.length) as FocusId);
  const tags = focus ? focusTags(focus) : null;
  const onFocus = (f: LaneFact): boolean => {
    const tag = f.skill ?? COMPUTER_ROLES[f.lane]?.tag ?? null;
    return !!tags && !!tag && isMisconceptionTagId(tag) && tags.has(tag);
  };
  for (const l of held) {
    heldWhy[l] = !focus ? 'mission' : facts.some((f) => f.lane === l && f.text.trim() && onFocus(f)) ? 'focus-voice' : 'off-focus';
  }
  if (offered.length > 0) emitLearnTurn({ spokeKinds: [], offered: [...offered], spoke: [], lead: null, held: [...held], faded: [], unproven: 0, unprovenLanes: [], proofUnsaid: [], heldWithProof: [], heldStaked: [], heldWhy, refusedWhy: {}, ownMove: null, ownLanes: [], ownProven: false, turn, decidedAt: Date.now(), decideMs: Date.now() - decideStart });
  return { pkg: { spoken: '', kept: [], dropped: [] }, offered, spoke: [], lead: null, held, faded: [], proofOf: new Map(), unproven: 0, unprovenLanes: [] };
}

/** The turn the student is in right now, as its waves have left it. */
export interface LiveTurn {
  /** The board the turn's waves read (the board after the coach's reply). */
  fen: string;
  ply: number;
  /** The slip this turn says (`LearnTurnTag.slipCp`). */
  slipCp: number | null;
  /** The move's price is settled (`MovePrice.settled`). */
  priceSettled: boolean;
  /** How the move's price was searched, once it has landed. */
  price: PriceSearch | null;
  midExchange: string | null;
  /** Everything the turn's earlier waves said out loud. */
  said: string;
  /** The turn's holds (`decideTurn`'s `turnHolds`). */
  holds: Set<string>;
}

/** THE PHASE REPORT IS ONE MORE WAVE OF THE TURN IT WAS READ ON (root cause 6,
 *  Smith-Morra replay 2026-10-19). It used to reach the voice one sentence at
 *  a time, each its own door call with no turn and nothing already said, so
 *  subsumption, the verdict hold and the word average never saw it — and six
 *  lines dripped out over 47 s, after 8.Bxf7+'s verdict, about the board
 *  before it. Now the whole report is decided ONCE, inside the turn: its cost,
 *  its trade, what it already said and the lead it spoke. A report whose turn
 *  is over (the student has moved on) is not a wave of the live turn, and
 *  returns null — its board is gone. */
export function decidePhaseWave(
  facts: readonly PhaseFact[],
  readFen: string,
  live: LiveTurn | null,
  ctx: { priorKeys?: ReadonlySet<string>; priorLead?: TurnLead | null; green?: FadeLevels | null; beginner: boolean; owner: VoiceOwner },
): TurnDecision | null {
  if (!live || !samePosition(live.fen, readFen)) return null;
  return decideTurn(
    facts.map((f) => ({
      lane: 'phase' as const, text: f.text, fen: f.gradeFen ?? readFen, claims: f.claims, proof: f.proof, namesStudentMove: f.namesStudentMove,
      ...(f.squares ? { squares: f.squares } : {}), ...(f.stakes ? { stakes: f.stakes } : {}), ...(f.lines ? { lines: f.lines } : {}),
      ...(f.factKind && f.factKind in FACT_ROLE ? { role: FACT_ROLE[f.factKind as keyof typeof FACT_ROLE] } : {}),
      ...(f.factKind ? { factKind: f.factKind } : {}), ...(f.skill ? { skill: f.skill } : {}),
    })),
    live.said, ctx.priorKeys, ctx.priorLead ?? null, ctx.green ?? null, ctx.beginner,
    { kind: 'phase', ply: live.ply, slipCp: live.slipCp, priceSettled: live.priceSettled, price: live.price, midExchange: live.midExchange },
    live.holds,
    ctx.owner,
  );
}

/** One line for the audit log: which lanes were offered and which spoke. */
export function describeTurnDecision(d: TurnDecision): string {
  return `lanes offered=[${d.offered.join(',')}] spoke=[${d.spoke.join(',')}] lead=${d.lead?.lane ?? '-'} held=[${d.held.join(',')}]`;
}
