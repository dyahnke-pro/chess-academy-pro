// CoachFact — THE ONE FACT SHAPE (WO-STORY-MATRIX-01 Phase 1, David
// 2026-10-30: "We need a matrix that is able to run these all, filter them
// down, and produce sentences that are meaningful to the game/position and
// create a story that follows the game" → "We start by wiring in the
// computers").
//
// The matrix runs on ONE fact object. Every fact says WHAT KIND of fact it is
// (`kind`, the one vocabulary), the GROUP that kind belongs to (one of the
// fourteen the matrix's regions are built from), and the COMPUTER that made it
// — each REQUIRED, each answered in one table, so a new kind, group or
// computer fails to compile until someone places it:
//   - `FACT_GROUP`: a new kind needs a group;
//   - `GROUP_STEP`: a new group needs its step of the thought;
//   - `COMPUTER_CATALOG`: a new computer needs a row.
// The step a fact is said in is DERIVED (`GROUP_STEP[FACT_GROUP[kind]](seat)`),
// never set by hand — four step tables that disagreed with each other is the
// drift this file exists to end.
//
// A LEAF: types and tables — no chess.
import type { FactKind } from './reviewFacetRank';
import type { ThoughtStep } from './thoughtComposer';
import type { AspectKind } from './reviewMoveBriefing';
import { NO_STAKES, type NoStakes, type Stakes } from './factStakes';
import type { FactProof } from './proof';
import type { SpokenLine } from './voicePackage';
import type { WeaknessSignal } from './weaknessSignal';
import type { ThreadKey } from './gameStory';
import type { TacticType } from '../types';
import type { FacetRole } from './reviewFacetRank';
import type { StoryBeat } from './openingStory';
import type { MisconceptionTagId } from '../data/misconceptionTags';

/** THE FOURTEEN GROUPS (PLAN WO-STORY-MATRIX-01, the regions table): the
 *  story (plans, the opening's story, the cause chain), the name (the opening,
 *  the book, a transposition), structure and pieces, the verdict; danger,
 *  their side, not yet / prevention; the move, the choices, the line; tactics
 *  on the board, endgame technique, concepts and nuggets; the habit. */
export type FactGroup =
  | 'story' | 'name' | 'structure' | 'verdict'
  | 'danger' | 'theirSide' | 'notYet'
  | 'move' | 'choices' | 'line'
  | 'tactics' | 'technique' | 'concepts'
  | 'habit' | 'bait' | 'setup';

/** Whose move or plan a fact is about. */
export type FactSeat = 'student' | 'opponent';

/** WHERE EACH GROUP IS SAID IN THE THOUGHT. The five knowledge-and-story
 *  groups share the board step until the matrix splits it (Phase 2); `move` is
 *  what a move changed, so it is the student's step on their move and theirs
 *  on the opponent's. Every group answers. */
export const GROUP_STEP: Record<FactGroup, (seat: FactSeat) => ThoughtStep> = {
  danger: () => 'danger',
  name: () => 'name',
  move: (seat) => (seat === 'student' ? 'yours' : 'theirs'),
  theirSide: () => 'theirs',
  choices: () => 'choices',
  notYet: () => 'notYet',
  line: () => 'line',
  story: () => 'board',
  structure: () => 'board',
  tactics: () => 'board',
  technique: () => 'board',
  concepts: () => 'board',
  verdict: () => 'verdict',
  habit: () => 'habit',
  // The bait is a line the student's move set up: said where a line is.
  bait: () => 'line',
  // A tactic one quiet move sets up: a board fact about the move to come.
  setup: () => 'board',
};

/** THE LESSON COMPOSER'S OWN KINDS — the facts `moveThoughtFacts` hands the
 *  one composer that the door's vocabulary (`FactKind`: Review's facets and
 *  the live clauses) has no name for: one per briefing aspect, the mate, the
 *  board teacher, the deep fact, the answer to their last move, the trip and
 *  the stop. They join the deciding door's tables (role, layer, proof, tie
 *  order) in the step that first hands a lesson fact to that door (Review's
 *  thought facts, P1-6d), with their first reader — never as rows nothing
 *  reads. Until then the door takes only facts of its own vocabulary
 *  (`coachDecider.DoorFact`). */
export type LessonFactKind = AspectKind | 'checkmate' | 'board-teacher' | 'deep-fact' | 'binding' | 'route' | 'stop'
  /** THE MOVE'S SECOND JOB (M-TWO-JOBS): a fact the composer says behind its
   *  step's lead, so the move is heard doing two things at once ("It also
   *  hits their bishop on b4"). Made by the composer from the fact it admits,
   *  never by a producer (`thoughtComposer.composeThought`). */
  | 'two-jobs'
  /** Opening theory, calculated (`openingTheory.ts`). */
  | 'book-standing' | 'book-alternatives' | 'book-reply' | 'book-score';

/** The one vocabulary of fact kinds: the door's and the lesson composer's. */
export type CoachFactKind = FactKind | LessonFactKind;

/** THE GROUP OF EVERY KIND. Exhaustive: a new kind fails to compile until it
 *  is placed. */
export const FACT_GROUP: Record<CoachFactKind, FactGroup> = {
  // ── danger: what is attacked on the board right now ──
  threat: 'danger', 'must-defend': 'danger',
  // ── the name: the opening, a transposition, this position before ──
  opening: 'name', 'last-here': 'name', equivalence: 'name',
  // ── the move: what it changed ──
  principle: 'move', quality: 'move', praise: 'move', move: 'move', trade: 'move', forced: 'move', sac: 'move',
  'sac-why': 'move', does: 'move', note: 'move', held: 'move', rule: 'move', stopped: 'move', point: 'move',
  'move-job': 'move', fundamental: 'move',
  // ── their side: what their move or plan is after ──
  'opp-dev': 'theirSide', 'opp-target': 'theirSide', 'their-cost': 'theirSide', 'their-read': 'theirSide',
  'opponent-intent': 'theirSide', 'opponent-leans': 'theirSide',
  // ── the choices: the moves you'd weigh and why each falls short ──
  refuted: 'choices', bluff: 'choices', contrast: 'choices', 'capture-choice': 'choices', kick: 'choices',
  deliberation: 'choices', 'key-moment': 'choices', 'stop-flaw': 'choices',
  // ── not yet, first this — and prevention ──
  timing: 'notYet', 'prevent-test': 'notYet', 'not-yet': 'notYet',
  // ── the line played out ──
  consequence: 'line', line: 'line',
  // ── the story: plans, the opening's story ──
  'plan-now': 'story', 'plan-worst-piece': 'story', 'plan-race': 'story', 'plan-arc': 'story', 'plan-middlegame': 'story',
  'plan-line': 'story', 'structure-plan': 'story', 'student-leans': 'story',
  // The opening's story, each beat by what it is about: the price the
  // student's move paid is the move's (said with its verdict, OS-3
  // 2026-10-19), their system is their side, the rest is the story.
  'opening-cost': 'move', 'opening-theirs': 'theirSide', 'opening-story': 'story',
  // BENCH-PLACED (WO-STORY-MATRIX-01 P1-4): the plan's group definitions
  // leave two candidates for each of these — the crossroads ahead of the
  // student's move (choices / the name) and the priority before it (choices
  // / the habit). The Danya bench scored both placements alike (2026-10-31,
  // on the ~half of his notes read so far: the priority fires on 6 of 459
  // sampled notes and his idea is said on 2 of the 4 that carry one, either
  // way; the fork's step moves only its order, which the bench does not
  // score), so each stays where it is about the move to come: the choices.
  'opening-fork': 'choices',
  priority: 'choices',
  // ── structure and pieces ──
  structure: 'structure', passer: 'structure', badbishop: 'structure', worst: 'structure', minority: 'structure',
  complex: 'structure', king: 'structure', rook7: 'structure', judgement: 'structure', 'hole-access': 'structure',
  // ── tactics on the board ──
  tactic: 'tactics', loose: 'tactics', count: 'tactics', royal: 'tactics', trapped: 'tactics', 'king-read': 'tactics',
  'latent-danger': 'tactics',
  // ── a tactic one quiet move sets up (moment 3, WO-COACH-NEXT-TO-YOU-01) ──
  'latent-chance': 'setup',
  // ── endgame technique ──
  endgame: 'technique', technique: 'technique',
  // ── concepts and nuggets ──
  stock: 'concepts', 'trade-idea': 'concepts', 'defence-idea': 'concepts', nugget: 'concepts', 'attack-pattern': 'concepts',
  concept: 'concepts', 'speedrun-read': 'concepts',
  // ── the verdict ──
  eval: 'verdict', delta: 'verdict', verdict: 'verdict', 'game-end': 'verdict', murky: 'verdict', status: 'verdict', convert: 'verdict',
  // ── the habit ──
  method: 'habit', how: 'habit', 'their-habit': 'habit', 'your-habit': 'habit',
  // ── the lesson composer's kinds: what a move changed ──
  'aspect-threat': 'move', 'aspect-wins': 'move', 'aspect-trade': 'move', 'aspect-least-loss': 'move',
  'aspect-tactic-lands': 'move', 'aspect-tactic-set-up': 'move', 'aspect-check': 'move', 'aspect-promotes': 'move',
  'aspect-opens-king': 'move', 'aspect-outpost': 'move', 'aspect-passer': 'move', 'aspect-passer-handed': 'move',
  'aspect-opens-file': 'move', 'aspect-their-weakness': 'move', 'aspect-own-weakness': 'move', 'aspect-own-king-cover': 'move',
  checkmate: 'move', 'board-teacher': 'move', 'deep-fact': 'move', binding: 'move', route: 'move', stop: 'move',
  // The move's second job is what the move changed, said behind the first.
  'two-jobs': 'move',
  // Opening theory, calculated: what masters play here is about the move.
  // The move's standing is said with the move; the other main moves are the
  // choices, the masters' reply is the line, the score is the verdict — his
  // order, each in its step (a book line filed with the move named the move
  // twice: "You played c3: it isn't the only main move … Your c3 prepares d4").
  'book-standing': 'move', 'book-alternatives': 'choices', 'book-reply': 'line', 'book-score': 'verdict',
  // ── the teaching moves' own kinds (2026-11-05), each in the group of the
  // kind it came from: the reply tree a line played out; the move order "not
  // yet, first this"; castling the story's plan; the move most players play
  // and the trap ahead the choices; the false alarm, the exception and
  // push-or-hold the move (they were Learn's `rule` facts) ──
  'reply-tree': 'line', 'move-order': 'notYet', castling: 'story', 'common-wrong': 'choices', 'trap-ahead': 'choices',
  // The bait (WO-COACH-NEXT-TO-YOU-01 C4): a trap the student's sound move set —
  // its own group, so its moment is the bait.
  'trap-set': 'bait',
  'false-alarm': 'move', 'rule-exception': 'move', 'push-or-hold': 'move',
  // The habits that are teaching moves of their own close the turn like any habit.
  'opp-think': 'habit', 'forcing-scan': 'habit',
  // ── the teaching moves' new computers (2026-11-05): the break is what the
  // move changed ──
  'pawn-break': 'move',
  // Opposite-coloured bishops are the structure of the board from here.
  'opposite-bishops': 'structure',
  // The composer's two new computers (2026-11-12): the plan's next steps and
  // what pays for a material deficit.
  'plan-steps': 'story',
  'compensation': 'structure',
  // ── the teaching moves' own kinds, round 2, each in the group of the kind
  // it came from: the speed-run reads the concepts, their idea's condition
  // their side, the behaviours the story ──
  provoke: 'concepts', tension: 'concepts', trigger: 'concepts', 'their-trigger': 'theirSide',
  space: 'story', wishlist: 'story',
};

/** Is this string a kind of the one vocabulary? (A Learn fact carries its
 *  producer's kind as a string; an unknown one falls back to its lane's.) */
export function isCoachFactKind(kind: string): kind is CoachFactKind {
  return Object.prototype.hasOwnProperty.call(FACT_GROUP, kind);
}

/** The step a fact of this kind is said in, for this seat. */
export function stepOf(kind: CoachFactKind, seat: FactSeat): ThoughtStep {
  return GROUP_STEP[FACT_GROUP[kind]](seat);
}

/** A fact's place, from its kind: the group read from `FACT_GROUP`, the step
 *  derived — the one way a producer fills them. */
export function placeFact(kind: CoachFactKind, seat: FactSeat): { kind: CoachFactKind; group: FactGroup; step: ThoughtStep } {
  const group = FACT_GROUP[kind];
  return { kind, group, step: GROUP_STEP[group](seat) };
}

/** WHY A FACT OF THIS GROUP HAS NO GAP when its computer measured none
 *  (WO-STORY-MATRIX-01 P1-10, stakes.md §6): a name rides on nothing, the habit
 *  closes the turn, the verdict reports the state, and every other fact is
 *  unmeasured until its gap is threaded in. One table, so a fact never carries
 *  a bare null. */
const GROUP_NO_STAKES: Record<FactGroup, NoStakes> = {
  name: NO_STAKES.identity, habit: NO_STAKES.closes, verdict: NO_STAKES.state,
  story: NO_STAKES.unmeasured, structure: NO_STAKES.unmeasured, danger: NO_STAKES.unmeasured, theirSide: NO_STAKES.unmeasured,
  notYet: NO_STAKES.unmeasured, move: NO_STAKES.unmeasured, choices: NO_STAKES.unmeasured, line: NO_STAKES.unmeasured,
  tactics: NO_STAKES.unmeasured, technique: NO_STAKES.unmeasured, concepts: NO_STAKES.unmeasured, bait: NO_STAKES.unmeasured,
  setup: NO_STAKES.unmeasured,
};
/** A fact's stakes: its computer's gap (or a reason it already recorded), or
 *  its group's reason for none. */
export function stakesOf(kind: CoachFactKind, measured: Stakes | null | undefined): Stakes {
  return measured ?? GROUP_NO_STAKES[FACT_GROUP[kind]];
}

/** A computer that hands the one composer facts: where it lives and what it
 *  says. */
interface CatalogRow {
  /** The file it is exported from, under `src/`. */
  file: string;
  /** What it computes, in one line. */
  says: string;
}

/** THE CATALOG OF COMPUTERS (PLAN item 2): one row per computer that emits a
 *  `CoachFact`, keyed by the function's own name. A new computer fails to
 *  compile until it has a row; `coachFact.test.ts` holds every row to an
 *  export of that name in that file. Today the lesson composer's nine, the
 *  board registry's (P1-6a) and Learn's board teaching (P1-6b); the rest join
 *  as their producers emit `CoachFact` (P1-6c–e). */
export const COMPUTER_CATALOG = {
  moveAspects: { file: 'services/reviewMoveBriefing.ts', says: 'what a move does on the board: the threat, the material, the trade, the tactic, the check, the promotion, the king cover, the structure made or conceded' },
  moveJob: { file: 'services/bookMoveWhy.ts', says: 'the job a move does against the board before it, from the speaker\'s seat' },
  computeMoveFundamentals: { file: 'services/moveFundamentals.ts', says: 'the fundamentals a move serves: develop, castle, centre, outpost, open file, passer, luft' },
  buildReviewMoveTeachingFact: { file: 'services/reviewMoveTeaching.ts', says: 'the move\'s idea on the board, the board teacher' },
  deepFact: { file: 'services/threeFacts.ts', says: 'what the move made possible down the line that follows' },
  bindingFact: { file: 'services/threeFacts.ts', says: 'what their last move aimed at, and how this move meets it' },
  theirTarget: { file: 'services/threeFacts.ts', says: 'what their move newly aims at among your pieces, said on their move when your reply does not answer it' },
  pieceRoute: { file: 'services/pieceRoute.ts', says: 'the trip the moved piece takes down the line that follows' },
  pieceOutFirst: { file: 'services/pieceOutFirst.ts', says: 'a bishop or queen brought out before its own pawn push closes its road (…Bf5 before …e6)' },
  lineCut: { file: 'services/lineCut.ts', says: "a queen, rook or bishop of the mover's whose line the moved piece now blocks — a centre square, a guard or an attack lost" },
  namedStructureFormed: { file: 'services/namedStructure.ts', says: 'the move creates a named pawn structure (Carlsbad, French chain, KID chain, Maróczy, Stonewall, Hedgehog, Benoni, Scheveningen), said with both sides\' plans' },
  orderByThreat: { file: 'services/orderByThreat.ts', says: "the mover's next move in the line, played first, would let the other side pin, fork or kick a piece this order keeps safe" },
  stopsBreak: { file: 'services/moveStops.ts', says: "the move makes the pawn break the other side plays in master games from here lose material, or takes it away" },
  preparesBreakClause: { file: 'services/mastersPlanRead.ts', says: "the move covers the square of its side's masters' break: it prepares the break, with how often masters push it from here" },
  onlyMove: { file: 'services/moveThoughtFacts.ts', says: "the move played is the only one that holds: the engine's next best gives up at least the only-move gap" },
  moveStops: { file: 'services/moveStops.ts', says: "the opponent's useful moves (a pin, a kick, a fork, a safe check) a move takes away" },
  openingTheoryFacts: { file: 'services/openingTheory.ts', says: "opening theory, calculated from the masters' games: the main move, the other tries and their aims, the reply, the score" },
  inBetweenMove: { file: 'services/inBetweenMove.ts', says: 'not yet, first this: a forcing move before the capture that is still there after' },
  findProphylaxis: { file: 'services/prophylaxis.ts', says: 'the other side\'s wanted pin, kick or fork, and the move that stops it' },
  // The weighing as a choices fact — handed to the composer by the Danya
  // bench's `thought` variant today; the lesson reads it in P1-9.
  // THE BOARD REGISTRY'S COMPUTERS (P1-6a): every `BOARD_COMPUTERS` read is a
  // fact made by one of these, named on its registry row.
  findPinBreaks: { file: 'services/pinBreak.ts', says: 'a pinned piece that walks out of the pin with tempo — the student\'s resource, or their piece the student pins' },
  findEnablingMove: { file: 'services/enablingMove.ts', says: 'why the engine\'s line plays A first: A clears the road its next piece move needs' },
  newTiedDefender: { file: 'services/tiedDefender.ts', says: 'their guard the student\'s move tied down, still tied after their reply' },
  obligationLifted: { file: 'services/obligationLifted.ts', says: 'their move took an attacker off a piece the student had to look after' },
  openingStoryAt: { file: 'services/openingStory.ts', says: 'the opening\'s story from master games: the fork, what it is, the choice and its price, their setup, the coming game and its key break' },
  openingSlip: { file: 'services/openingSlip.ts', says: 'the student left the book: the move order, the wrong square or a different line, said only when it changes a tactic or the book square has a job' },
  countMethod: { file: 'services/countMethod.ts', says: 'count before you take: the student\'s move took or stood on a square their pieces outnumber' },
  buildPriorityFirst: { file: 'services/playCommentary.ts', says: 'the priority before the move: the engine\'s best move aims at a weak pawn' },
  lastTimeHere: { file: 'services/lastTimeHere.ts', says: 'the student\'s own costly departure from this position in another game' },
  findQueenGrabTraps: { file: 'services/queenGrabTrap.ts', says: 'a capture that looks free and leaves the queen with no safe square' },
  trappedOnBoard: { file: 'services/reviewTeachingPoints.ts', says: 'the student\'s queen or rook attacked with no safe square' },
  provenThreatLine: { file: 'services/threatProof.ts', says: 'a threat warning with the cost it claims proven on the board' },
  studentMoveStructure: { file: 'services/structureReads.ts', says: 'the structural judgements of the student\'s move' },
  theirMoveStructure: { file: 'services/structureReads.ts', says: 'what their move did to the student\'s structure and squares' },
  boardStructure: { file: 'services/structureReads.ts', says: 'the standing structural facts, the student to move' },
  linesStructure: { file: 'services/structureReads.ts', says: 'the plan choices off the student\'s MultiPV' },
  planThreadTurn: { file: 'services/planThread.ts', says: 'the student\'s plan carried across moves: its stop proven off their move, then the next plan' },
  geometryReads: { file: 'services/tacticGeometry.ts', says: 'the line tactics: interference, clearance, decoy and deflection, discoveries, in-between moves, interposition, the loaded line' },
  // LEARN'S BOARD TEACHING (P1-6b): every fact `learnBoardTeaching` and
  // `orderTeaching` hand the page — and Review the rules among them — made by
  // one of these, named on the fact.
  recaptureChoice: { file: 'services/recaptureChoice.ts', says: 'which piece takes back, and why, against the other recapture' },
  mateLine: { file: 'services/lineCalc.ts', says: 'the mate the move\'s engine line forces, said to the mate' },
  lineWins: { file: 'services/lineCalc.ts', says: 'the material the move\'s engine line wins, said to where it lands' },
  kneeJerk: { file: 'services/kneeJerk.ts', says: 'the reflex recapture that cost: something stronger came first' },
  strongChoice: { file: 'services/strongChoice.ts', says: 'what strong players choose in this exact position, from real games' },
  fileClaimed: { file: 'services/planRace.ts', says: 'the open file both sides wanted, taken by the student\'s rook' },
  blunderCheck: { file: 'services/safetyHabits.ts', says: 'the piece the move left that they simply took, and the habit that catches it' },
  autopilotGuard: { file: 'services/safetyHabits.ts', says: 'the popular move here cost: the moment to stop and check' },
  keepPressing: { file: 'services/safetyHabits.ts', says: 'winning, and a slow move gave them time: keep forcing' },
  spareTempoWasted: { file: 'services/endgamePawnReads.ts', says: 'a spare pawn tempo spent before the pawn ending needed it' },
  pawnEndingTrade: { file: 'services/endgamePawnReads.ts', says: 'the trade into a pawn ending, counted first' },
  outsidePasserDecoy: { file: 'services/endgamePawnReads.ts', says: 'with only kings and pawns left, the outside passer is a decoy' },
  kingCourse: { file: 'services/endgamePawnReads.ts', says: 'in a king-and-pawn ending, the king\'s target is the weak pawn, not the centre' },
  tradeJudgement: { file: 'services/tradeJudgement.ts', says: 'the trade just made: a good or a bad deal, and why' },
  readTiming: { file: 'services/moveTiming.ts', says: 'why the move works now and did not a move earlier' },
  kingAttack: { file: 'services/kingAttack.ts', says: 'what the move adds to the attack on their king' },
  ruleException: { file: 'services/ruleException.ts', says: 'a beginner\'s rule the move breaks, and why it is right here' },
  falseAlarm: { file: 'services/falseAlarm.ts', says: 'a threat of theirs the student\'s move rightly ignored, and what answers it' },
  pushOrHold: { file: 'services/pushOrHold.ts', says: 'whether this ending is worth pressing or holding, by its type' },
  theirMoveCost: { file: 'services/theirMoveCost.ts', says: 'what the opponent\'s move cost them that the student can use' },
  counterThreat: { file: 'services/counterThreat.ts', says: 'a threat answered with a bigger one: the piece left, the bigger piece hit, the line that punishes taking it' },
  playedConcept: { file: 'services/playedConcept.ts', says: 'the concept a move just played, for either side: a fork, a pin, a discovered attack' },
  tempoCount: { file: 'services/tempoCount.ts', says: 'their piece keeps moving in the opening while the student develops, counted' },
  stalemateWatch: { file: 'services/stalemateWatch.ts', says: 'winning, and one of the student\'s moves would stalemate them' },
  checkMethod: { file: 'services/checkMethod.ts', says: 'in check, and the king move is not the best answer: the three ways to meet check' },
  planChoice: { file: 'services/planChooser.ts', says: 'the engine\'s two best lines carry different plans for the student' },
  criticalMomentFound: { file: 'services/criticalMoment.ts', says: 'at a real decision moment, the student found one of the only moves that held' },
  readZugzwang: { file: 'services/zugzwang.ts', says: 'zugzwang at the student\'s turn, from the tablebase' },
  tradeLedger: { file: 'services/tempoCount.ts', says: 'the trade counted in moves: their recapturing piece had already moved, or their much-moved piece went' },
  notYetPlayed: { file: 'services/notYetPlayed.ts', says: 'development first: the piece that would hit the pawn has not come out yet' },
  heldResource: { file: 'services/holdResource.ts', says: 'a pin or check kept in hand until their knight develops into it' },
  captureChoice: { file: 'services/captureChoice.ts', says: 'which pawn capture: the other one hands their knight a square for good' },
  kickAfterRecapture: { file: 'services/kickMap.ts', says: 'the capture dragged their piece onto a square a pawn kicks it from, and where it can land' },
  pawnSquareTaken: { file: 'services/planRace.ts', says: 'both sides wanted one square for a pawn, and the student\'s got there first' },
  patternFails: { file: 'services/patternFails.ts', says: 'a stock shot that looks right and fails on this board, played out' },
  openingEquivalence: { file: 'services/openingEquivalence.ts', says: 'the named opening this board is, with a move each thrown in or the colours reversed' },
  // THE DOORS' ADAPTER (P1-5): every fact a door is handed in its producer's
  // old shape is made here. Its row goes with the last old shape (P1-6), when
  // each of those producers emits CoachFact under its own name.
  // THE POSITION COMPOSER'S COMPUTERS (P1-6c): every fact `computePositionFacts`
  // hands its door is made by one of these, named at the site that makes it.
  statusBandChange: { file: 'services/positionFacts.ts', says: 'the game\'s standing crossed a band since the last read: better, level, worse, winning, lost' },
  buildDeliberation: { file: 'services/deliberation.ts', says: 'the moves the student would weigh here and why each falls short, then the move' },
  detectTradeCreatesPin: { file: 'services/latentDanger.ts', says: 'a trade the student is about to make lines their own pieces up for a pin or skewer' },
  detectLatentDanger: { file: 'services/latentDanger.ts', says: 'two of the student\'s pieces share a line their piece can reach: a pin in waiting' },
  pawnHit: { file: 'services/trappedPiece.ts', says: 'a pawn move that leaves one of their pieces no safe square, its line taking that piece' },
  detectLatentFork: { file: 'services/latentFork.ts', says: 'a fork one move away, for either side' },
  detectSetUpChance: { file: 'services/setUpChance.ts', says: 'a tactic the student can set up with one quiet move: a sound engine line that wins or mates a move or two later, every motif the one classifier names, or a pin on their king or queen' },
  detectKingExposure: { file: 'services/kingSafety.ts', says: 'a castled king with a broken shelter and real attackers on it' },
  computeMustDefend: { file: 'services/threatOut.ts', says: 'what the opponent threatens now, read by letting them move twice' },
  detectBluff: { file: 'services/bluffDetector.ts', says: 'their threat that does not work, and the move that shows it' },
  refutedFromFan: { file: 'services/refutedAlternativeCore.ts', says: 'the move most players choose here, what it costs and the line that punishes it' },
  decisiveReason: { file: 'services/decisiveReason.ts', says: 'THE reason a move is best: what accounts for the gap to the next-best move, and that gap' },
  principleLine: { file: 'services/moveFundamentals.ts', says: 'the opening rule the student\'s clean move kept' },
  principleContrastLine: { file: 'services/moveFundamentals.ts', says: 'the rule the engine\'s move kept where the student\'s clean move kept none' },
  threatStoppedBy: { file: 'services/opponentMovePurpose.ts', says: 'their reply took the student\'s threat off the board' },
  trickSidestepped: { file: 'services/forkTrick.ts', says: 'a move that stepped out of the fork trick, either seat' },
  phaseVerdictLine: { file: 'services/reviewPositionalAssessment.ts', says: 'the balance sheet at a phase change: what each side holds' },
  detectCentralKingDanger: { file: 'services/kingSafety.ts', says: 'an uncastled king in the centre with tension around it' },
  readConversion: { file: 'services/conversionMethod.ts', says: 'the next step converting a won position: the passer to escort, the trade to make' },
  computeImportance: { file: 'services/narrationImportance.ts', says: 'how much this moment earns voice; in a decided game, technique' },
  conceptForBoard: { file: 'services/conceptEngine.ts', says: 'the named concept this board shows: a tactic, a technique, a matchup' },
  pinPressureConcept: { file: 'services/positionFacts.ts', says: 'a pin of the student\'s with its principle: pile on the pinned piece' },
  guardRemovalConcept: { file: 'services/positionFacts.ts', says: 'remove the guard: the student\'s capture of the piece guarding another' },
  readCriticalMoment: { file: 'services/criticalMoment.ts', says: 'a moment where one move matters most, for whoever is to move' },
  buildOpponentIntent: { file: 'services/opponentIntent.ts', says: 'what the opponent wants to do next and the squares it aims at' },
  computeLeansOn: { file: 'services/perturbation.ts', says: 'the piece each side leans on most: take it away and the position falls' },
  strategicReason: { file: 'services/moveFundamentals.ts', says: 'the fundamental the student\'s best move serves' },
  structurePlanFact: { file: 'services/nextPlans.ts', says: 'the plan this pawn structure earns, announced or changed' },
  liveMethodBeat: { file: 'services/methodBeat.ts', says: 'the habit that finds this next time, in the present tense' },
  readTrade: { file: 'services/tradeQuality.ts', says: 'what a trade just played did: who it favoured and why' },
  findTradeTarget: { file: 'services/tradeQuality.ts', says: 'the piece of theirs worth trading off now' },
  boardPlanFacts: { file: 'services/boardPlanFacts.ts', says: 'the plans the board earns: development, breaks, files, outposts, the worst piece' },
  readPosition: { file: 'services/positionalRead.ts', says: 'the positional read of the board for both sides' },
  depthClauses: { file: 'services/thinkAloud.ts', says: 'the look ahead: not yet, the tactic, the refutation, the line, the plan race, both seats' },
  exchangeIdeas: { file: 'services/exchangeIdeas.ts', says: 'the trade, defence and conversion ideas, and the principles behind them' },
  // REVIEW'S COMPUTERS (P1-6d): every fact Review's walk weighs is made by
  // one of these, named where it is made.
  plyFactsForMove: { file: 'services/pvPlayback.ts', says: 'what a move did on the board: the piece, the capture, the check' },
  settledExchange: { file: 'services/exchangeLedger.ts', says: 'a capture counted to the end of its trades: what each side won' },
  describeMoveInfluence: { file: 'services/reviewFullData.ts', says: 'the new pressure a move creates: the pieces it now hits' },
  computeBoardDelta: { file: 'services/boardDelta.ts', says: 'the lines a move opened and what it gave up' },
  correctionAgainstHeard: { file: 'services/reviewFullData.ts', says: 'the deeper read correcting the grade heard live' },
  errorWhy: { file: 'services/inaccuracyCall.ts', says: 'what a costly move allowed or missed, with the line that shows it' },
  allowedClause: { file: 'services/costReason.ts', says: 'what a costly move allows: the punishing line, from the student\'s seat' },
  tacticInvariant: { file: 'services/conceptEngine.ts', says: 'the rule a tactic rests on, said where the student missed it' },
  renderFundamentalVerdict: { file: 'services/principleVoice.ts', says: 'the fundamental a move broke and how to keep it' },
  computeMoveFacets: { file: 'services/reviewFullData.ts', says: 'Review\'s own read of a move: the eval bar\'s swing, a piece left loose' },
  detectTactics: { file: 'services/tacticsDetector.ts', says: 'the tactics standing on the board: forks, pins, skewers, discoveries' },
  detectNewThreat: { file: 'services/groundedAnswer.ts', says: 'the new threat a move made' },
  assessPositionalEdge: { file: 'services/reviewPositionalAssessment.ts', says: 'who stands better and why, the positional verdict' },
  describeStructure: { file: 'services/boardStructure.ts', says: 'the pawn structure on the board' },
  enemyKingStuckInCenter: { file: 'services/reviewSacrifice.ts', says: 'their king stuck in the centre with a central file open' },
  findTrappedPiece: { file: 'services/reviewTeachingPoints.ts', says: 'a piece with no safe square, attacked' },
  attackerDefenderCount: { file: 'services/reviewTeachingPoints.ts', says: 'the attackers and defenders counted on a target' },
  royalDefenderTarget: { file: 'services/reviewTeachingPoints.ts', says: 'the piece that guards their king, and the way to remove it' },
  rookOnSeventh: { file: 'services/reviewTeachingPoints.ts', says: 'a rook on the seventh rank' },
  badEnemyBishop: { file: 'services/reviewTeachingPoints.ts', says: 'their bishop hemmed in by its own pawns' },
  pieceWish: { file: 'services/pieceWish.ts', says: 'the student\'s bad or idle piece, the square it wants and why' },
  passedPawnPush: { file: 'services/reviewTeachingPoints.ts', says: 'a passed pawn and its push' },
  findMinorityAttack: { file: 'services/positionReadingService.ts', says: 'a minority attack and the weak pawn it leaves' },
  findColorComplexWeakness: { file: 'services/positionReadingService.ts', says: 'squares of one colour no bishop or pawn can cover' },
  planRaceClause: { file: 'services/planRace.ts', says: 'two plans of one kind, counted to who gets there first' },
  sacrificeCompensation: { file: 'services/reviewSacrifice.ts', says: 'what a sacrifice gets for the material' },
  explainMatingSacMechanism: { file: 'services/reviewForcedSequence.ts', says: 'how a mating sacrifice works' },
  describeSacBreaksKingShield: { file: 'services/reviewSacrifice.ts', says: 'a sacrifice that breaks the king\'s shield' },
  contrastMoves: { file: 'services/moveContrast.ts', says: 'two good moves and the one board-true thing that separates them' },
  kingReadsForBestLine: { file: 'services/kingAttackReads.ts', says: 'the king attack the best line runs' },
  studentMovePoint: { file: 'services/playCommentary.ts', says: 'the point of the student\'s quiet move' },
  intentWithFallback: { file: 'services/movePurpose.ts', says: 'what a move was for: the engine read of its purpose' },
  moveIntent: { file: 'services/moveIntent.ts', says: 'what a move prepares, proven against the null-move reads — with the rule behind it, once a lesson (`intentRule`)' },
  opponentHabits: { file: 'services/thinkAloud.ts', says: 'a habit the opponent keeps showing this game' },
  habitsOf: { file: 'services/thinkAloud.ts', says: 'a habit the student keeps showing this game' },
  readTheirMove: { file: 'services/opponentMoveReads.ts', says: 'what their move did and what it asks' },
  playItAnyway: { file: 'services/opponentMovePurpose.ts', says: 'their threat stopped, and why the student can play the plan anyway' },
  knownAttack: { file: 'services/attackLibrary.ts', says: 'a known attacking pattern on the board' },
  detectForcedMatingSequence: { file: 'services/reviewForcedSequence.ts', says: 'a forced checking run to mate' },
  buildMiddlegameOrientation: { file: 'services/reviewStrategicOrientation.ts', says: 'where the middlegame is going for each side' },
  mastersPlanLine: { file: 'services/mastersPlanRead.ts', says: 'the plan masters played from this opening' },
  buildOpponentMoveTeaching: { file: 'services/reviewOpponentCommentary.ts', says: 'what their move targets' },
  buildOpponentDevelopmentRead: { file: 'services/reviewOpponentCommentary.ts', says: 'how their development is going' },
  nameEndgamePhase: { file: 'services/reviewMoveTeaching.ts', says: 'the endgame reached, named' },
  openingAnnouncementForGame: { file: 'services/openingAnnouncement.ts', says: 'the opening this game is, named once with what it teaches' },
  whatItAsks: { file: 'services/bookMoveWhy.ts', says: 'what their attack on a piece asks the student to do' },
  moveThoughtFacts: { file: 'services/moveThoughtFacts.ts', says: 'the move\'s thought: what it changed, the choices, the line' },
  theirOpeningVerdict: { file: 'services/openingAnnouncement.ts', says: 'what their opening move cost them' },
  whyItEnded: { file: 'services/gameEndReads.ts', says: 'why the game ended: the move that decided it' },
  idlePiece: { file: 'services/gameEndReads.ts', says: 'a piece that sat idle all game' },
  quietDecider: { file: 'services/gameEndReads.ts', says: 'the quiet move that decided the game' },
  exploreInvite: { file: 'services/gameEndReads.ts', says: 'an invitation to explore the line that would have won' },
  murkyRead: { file: 'services/gameEndReads.ts', says: 'a move where the position was too sharp to read cleanly' },
  gameArcSteps: { file: 'services/lookaheadPlan.ts', says: 'the game\'s plan arc: plans announced, carried and changed' },
  renderThesis: { file: 'services/teachingSelector.ts', says: 'the game\'s thesis at a phase change: where it turned and why' },
  speakDeepestLookahead: { file: 'services/liveTacticsContext.ts', says: 'the deepest computed foresight: the line that lands furthest ahead' },
  structureNamingLine: { file: 'services/learnBoardTeaching.ts', says: 'the pawn structure the game has reached, named with what it asks' },
  pieceQualityLines: { file: 'services/pieceValueRead.ts', says: 'a piece the engine values far above or below its count — the good and the bad piece' },
  opponentGapClause: { file: 'services/opponentGap.ts', says: 'the chance their move left open for the student' },
  buildRejectedTempting: { file: 'services/playCommentary.ts', says: 'the tempting move ruled out, and the reply that refutes it' },
  characterTurn: { file: 'services/positionCharacter.ts', says: 'the position\'s character changing — quiet to sharp, sharp to conversion' },
  buildCausalChain: { file: 'services/causalChain.ts', says: 'a cross-move cause: the earlier move that left the piece loose' },
  threatAnswer: { file: 'services/threatAnswer.ts', says: 'what the engine\'s best move does about the threat just named — take, step out, kick, block, guard, or it can wait' },
  payoffFor: { file: 'services/learnBoardTeaching.ts', says: 'the payoff of a plan the game announced, landed by this move' },
  openingBreak: { file: 'services/gameStory.ts', says: 'the opening\'s key pawn break, from the game\'s story' },
  backwardLook: { file: 'services/backwardLook.ts', says: 'what the move just played allowed, and the better move that was past' },
  mistakeTurnLine: { file: 'services/mistakeTurnLine.ts', says: 'the habit that catches the mistake next time' },
  learnFundamentalVerdict: { file: 'services/learnFundamentalNarration.ts', says: 'the fundamental behind a slip and how to keep it' },
  studentMovePointFact: { file: 'services/playCommentary.ts', says: 'what the student\'s move does on the board' },
  moveOrder: { file: 'services/moveOrder.ts', says: 'the move order: the move that had to come first' },
  learnMoveReason: { file: 'services/learnBoardTeaching.ts', says: 'the engine-read reason for a move: what it prepares or stops' },
  kingPawnUnderFire: { file: 'services/learnBoardTeaching.ts', says: 'a pawn beside the student\'s king the opponent can win' },
  cheaperAttackerHit: { file: 'services/learnBoardTeaching.ts', says: 'a piece of the student\'s attacked by a cheaper one, with no capture that answers it' },
  gambitPoint: { file: 'services/learnBoardTeaching.ts', says: 'what a gambit they accepted bought: a passed pawn, a file for a rook, or time' },
  detectImmediateTactics: { file: 'services/liveTacticsContext.ts', says: 'the tactics standing on the live board for either side, no line needed' },
  detectHangingPieces: { file: 'services/liveTacticsContext.ts', says: 'the pieces left en prise on the live board' },
  scanUpcomingTactics: { file: 'services/tacticClassifier.ts', says: 'a tactic that lands later in the engine\'s line' },
  prizeTeaching: { file: 'services/learnBoardTeaching.ts', says: 'a piece of theirs the student can win, said without naming the move' },
  temptingTurnClause: { file: 'services/tacticalRead.ts', says: 'the tempting move ruled out, and what refutes it' },
  uncertaintyClause: { file: 'services/tacticalRead.ts', says: 'the moves that hold equally well, when the read is level' },
  candidateCompareRead: { file: 'services/tacticalRead.ts', says: 'the candidate moves compared by what each decides' },
  stepArc: { file: 'services/planArc.ts', says: 'a step of a plan\'s arc: a plan emerging, advancing or arriving' },
  heldFoundText: { file: 'services/deliberation.ts', says: 'the held move the student found, credited' },
  slipAnswerText: { file: 'services/playCommentary.ts', says: 'the answer to their slip the student found' },
  buildPlayCommentary: { file: 'services/playCommentary.ts', says: 'the computed beat on the live board: a tactic, a threat or the move\'s point' },
  detectBehaviors: { file: 'services/danyaBehaviors.ts', says: 'a board habit worth naming: an outpost, the bishop pair, a pawn break' },
  buildPositionalRead: { file: 'services/positionalRead.ts', says: 'the positional read of the live board: king, plan, files, outposts' },
  castleByHandMove: { file: 'services/kingWalk.ts', says: 'a king that lost castling walked to safety by hand: the plan, the move that clears its route, each step, and the walk done' },
  kingFromCentre: { file: 'services/kingWalk.ts', says: 'the rule of thumb on a king walked out of the centre: further from the centre is safer' },
  keptHome: { file: 'services/kingWalk.ts', says: 'a bishop left at home on purpose while the king walks: it blocks the check they can give' },
  kingSquares: { file: 'services/kingWalk.ts', says: 'in check with only king moves: the squares that walk into a forced mate, and the square chosen' },
  knownSlip: { file: 'services/knownSlips.ts', says: 'a move club players really play at this board that the other side punishes — a known mistake, or a trap when it clears the trap bar — and what the punishment wins' },
  ifTheyPlay: { file: 'services/ifTheyPlay.ts', says: 'if they X, you play Y: the replies likely at this level (the human model) and the engine\'s best, each with the answer its own line proves — a recapture, a block, a job, a win or a mate' },
  baitBranch: { file: 'services/ifTheyPlay.ts', says: 'the bait: the student\'s sound move left a reply many players at this level choose that loses material or walks into mate (WO-COACH-NEXT-TO-YOU-01 C4)' },
  temptingRefuted: { file: 'services/weighedMoves.ts', says: 'the natural move a player weighs here that fails, with the engine line that refutes it' },
  alsoGood: { file: 'services/weighedMoves.ts', says: 'two moves of the same worth and the one thing the board shows between them' },
  squareChoice: { file: 'services/weighedMoves.ts', says: 'which square for the piece: its other squares a player weighs, and what goes wrong on each' },
  oppositeBishops: { file: 'services/oppositeBishops.ts', says: 'opposite-coloured bishops whatever else is on: with queens or rooks the attacker\'s game (the bishop that hits the other king\'s squares), bishops and pawns the drawish ending' },
  planSteps: { file: 'services/planSteps.ts', says: 'the plan\'s next steps in the engine\'s quiet line: the mover\'s next two or three moves and what ties them (a square they line up on, a break they build to, castling to finish)' },
  evalReading: { file: 'services/reviewMoveBriefing.ts', says: 'the position\'s standing in words when a move changed it (a band change or a real swing): who is better and the board\'s reason — material, the more exposed king, a passed pawn, an isolated pawn' },
  compensation: { file: 'services/compensation.ts', says: 'who is better when one side is down material, and the board\'s reason for it: a development lead, a king left in the middle, the bishop pair, an advanced passed pawn' },
  pawnBreak: { file: 'services/pawnBreak.ts', says: 'the pawn break and what it is for: the pawn it strikes (the base of their chain), the file it opens for the rooks, the bishop it frees' },
} satisfies Record<string, CatalogRow>;

export type ComputerName = keyof typeof COMPUTER_CATALOG;

/** ONE FACT, every door's and every composer's input. */
export interface CoachFact {
  /** WHICH FACT IT IS — REQUIRED, unique among the facts handed to one
   *  decision (WO-STORY-MATRIX-01 P1-5). A door knows a fact by this and never
   *  by its words: the voice package may trim a sentence, two facts may share
   *  words ("It also guards e5" / "guards e5"), and Review rewords a fact on
   *  its way in. What a door kept carries it back (`VoiceFact.factId`). */
  id: string;
  /** What kind of fact it is (the one vocabulary). */
  kind: CoachFactKind;
  /** Its group — always `FACT_GROUP[kind]` (`placeFact`), never set by hand. */
  group: FactGroup;
  /** The computer that made it (a `COMPUTER_CATALOG` key). */
  computer: ComputerName;
  /** The step it is said in — DERIVED: `GROUP_STEP[group](seat)`. */
  step: ThoughtStep;
  /** The words, a whole sentence with its own subject — said when the fact
   *  leads its step ("You play h3 — it keeps their bishop off g4"). */
  text: string;
  /** The idea it states, as claim keys — the say-once ledger keeps one fact
   *  per claim across the whole lesson, review or game. At the deciding door
   *  they are also what a description claims beyond the relation its squares
   *  draw (`supportedFacts`). */
  claims: readonly string[];
  /** The squares it is about (the board's half; support is read off these). */
  squares: readonly string[];
  /** What rides on it — the step's lead is the fact worth most. REQUIRED: a
   *  gap, or the named reason it has none (`NO_STAKES`). */
  stakes: Stakes;
  /** Its proof, or why it needs none (REQUIRED, proof.ts). */
  proof: FactProof;
  /** Whose move or plan it is about. At the deciding door, a fact about what
   *  the opponent is doing TO the student breaks a tie inside a same-claim
   *  group (`selectFacts`). */
  seat: FactSeat;
  /** IT NAMES A MOVE THE STUDENT HAS YET TO FIND — REQUIRED (P1-5; OS-10,
   *  LEARN NAMES NO MOVE UNASKED): a move of theirs that is legal on the board
   *  they move on next (`namesPlayableStudentMove`). The Learn door holds such
   *  a fact until the move is past. A lesson or a review shows the student a
   *  line they asked to see, so nothing there is theirs to find. */
  namesStudentMove: boolean;
  /** THE PLAN THREAD IT IS ON (REQUIRED, WO-STORY-MATRIX-01 P1-8b) — the
   *  seat's plan it advances, keyed by its goal (`gameStory.threadKey`: a
   *  passer made is a step on that side's passer thread, an outpost planted a
   *  step on the outpost's), or `{ none: 'local' }`: a fact about the move
   *  alone. Read by the game's story when the door keeps the fact
   *  (`StoryStore.commitFacts`), so a thread is followed by what was SAID on
   *  it, on every surface. */
  thread: ThreadKey | typeof LOCAL_THREAD;
  /** The board the claim was computed on; the package grades it there. */
  fen: string;
  /** A second board it may describe (the one before the move). */
  altFen?: string;
  /** The lines it says, played on the board. */
  lines?: readonly SpokenLine[];
  /** The skill it teaches (a MisconceptionTagId), when its computer knows it —
   *  the fade reads it per skill, before the fact's layer or lane. */
  skill?: string;
  /** THE STUDENT'S HOLE THE SURFACE ALREADY MATCHED to this exact fact — the
   *  student term of its value (`factValue`'s `matched`). Absent: the door
   *  joins the fact's kind to the record. Null: the student has no record of
   *  it — grey, never a hole borrowed from a coarser bucket. */
  hole?: WeaknessSignal | null;
  /** The motif it names, in the one tactic vocabulary (tacticVocabulary.ts) —
   *  the weakness join, where its computer names one. */
  motif?: TacticType;
  /** Teach or describe, where its computer knows (a structural judgement can
   *  be either; the book move always teaches) — else `FACT_ROLE` over its
   *  kind. The door values a reason over a description. */
  role?: FacetRole;
  /** THE FACT WITHOUT THE MOVE (LEARN NAMES NO MOVE UNASKED, David
   *  2026-10-10): for a fact that names the student's move, the same idea
   *  said without it — its own words, proof, squares and line, so a surface
   *  that holds the move back still says what stays true. */
  heldForm?: HeldForm;
  /** The moves it draws, each only when the fact is said: their move it
   *  warns about, the move it asks the student to play (engine-vouched), a
   *  route walked hop by hop on its own boards. */
  marks?: FactMarks;
  /** Which beat of the opening's story it is (`openingStoryAt` only) — Learn
   *  speaks each beat in its own lane (`STORY_LANE`). */
  storyBeat?: StoryBeat;
}

/** A fact said without the move it names — see `CoachFact.heldForm`. */
export type HeldForm = Pick<CoachFact, 'text' | 'proof' | 'squares' | 'lines' | 'motif'> & {
  /** A POINTER AT THE STUDENT'S NEXT DECISION (David 2026-11-05: "keep the
   *  point at moves without stating them for beginners but not … for players
   *  that don't need it"): the skill it is a hint for. Learn's door says it
   *  only while that skill is red or grey in the student's record, once a game,
   *  and the move it points at counts as prompted. Absent: the same fact about
   *  the move already played, minus the move's name — said for everyone. */
  points?: MisconceptionTagId;
};

/** One move drawn on the board. */
interface MarkMove { from: string; to: string }

/** The moves a fact draws — see `CoachFact.marks`. */
export interface FactMarks {
  theirs?: MarkMove;
  play?: MarkMove;
  route?: ReadonlyArray<MarkMove & { fen: string }>;
}

/** A fact about the move alone — on no plan thread (`CoachFact.thread`). The
 *  one constant every producer answers with. */
export const LOCAL_THREAD = { none: 'local' } as const;

