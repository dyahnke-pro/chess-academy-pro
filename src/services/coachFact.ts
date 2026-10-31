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
// A LEAF: types, tables and the doors' adapter (`toCoachFact`) — no chess.
import type { FactKind } from './reviewFacetRank';
import type { ThoughtStep } from './thoughtComposer';
import type { AspectKind } from './reviewMoveBriefing';
import type { FactStakes } from './factStakes';
import type { FactProof } from './proof';
import type { SpokenLine } from './voicePackage';
import type { WeaknessSignal } from './weaknessSignal';
import type { ThreadKey } from './gameStory';
import type { TacticType } from '../types';
import type { FacetRole } from './reviewFacetRank';
import type { StoryBeat } from './openingStory';

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
  | 'habit';

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
export type LessonFactKind = AspectKind | 'checkmate' | 'board-teacher' | 'deep-fact' | 'binding' | 'route' | 'stop';

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
  'plan-now': 'story', 'plan-race': 'story', 'plan-arc': 'story', 'plan-opening': 'story', 'plan-middlegame': 'story',
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
  'latent-danger': 'tactics', 'latent-chance': 'tactics',
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
 *  export of that name in that file. Today the lesson composer's nine and
 *  the board registry's (P1-6a); the rest join as their producers emit
 *  `CoachFact` (P1-6b–e). */
export const COMPUTER_CATALOG = {
  moveAspects: { file: 'services/reviewMoveBriefing.ts', says: 'what a move does on the board: the threat, the material, the trade, the tactic, the check, the promotion, the king cover, the structure made or conceded' },
  moveJob: { file: 'services/bookMoveWhy.ts', says: 'the job a move does against the board before it, from the speaker\'s seat' },
  computeMoveFundamentals: { file: 'services/moveFundamentals.ts', says: 'the fundamentals a move serves: develop, castle, centre, outpost, open file, passer, luft' },
  buildReviewMoveTeachingFact: { file: 'services/reviewMoveTeaching.ts', says: 'the move\'s idea on the board, the board teacher' },
  deepFact: { file: 'services/threeFacts.ts', says: 'what the move made possible down the line that follows' },
  bindingFact: { file: 'services/threeFacts.ts', says: 'what their last move aimed at, and how this move meets it' },
  pieceRoute: { file: 'services/pieceRoute.ts', says: 'the trip the moved piece takes down the line that follows' },
  inBetweenMove: { file: 'services/inBetweenMove.ts', says: 'not yet, first this: a forcing move before the capture that is still there after' },
  findProphylaxis: { file: 'services/prophylaxis.ts', says: 'the other side\'s wanted pin, kick or fork, and the move that stops it' },
  // The weighing as a choices fact — handed to the composer by the Danya
  // bench's `thought` variant today; the lesson reads it in P1-9.
  deliberationAlternativesFacts: { file: 'services/deliberation.ts', says: 'the moves you would weigh here and why each falls short' },
  // THE BOARD REGISTRY'S COMPUTERS (P1-6a): every `BOARD_COMPUTERS` read is a
  // fact made by one of these, named on its registry row.
  findPinBreaks: { file: 'services/pinBreak.ts', says: 'a pinned piece that walks out of the pin with tempo — the student\'s resource, or their piece the student pins' },
  findEnablingMove: { file: 'services/enablingMove.ts', says: 'why the engine\'s line plays A first: A clears the road its next piece move needs' },
  newTiedDefender: { file: 'services/tiedDefender.ts', says: 'their guard the student\'s move tied down, still tied after their reply' },
  obligationLifted: { file: 'services/obligationLifted.ts', says: 'their move took an attacker off a piece the student had to look after' },
  openingStoryAt: { file: 'services/openingStory.ts', says: 'the opening\'s story from master games: the fork, what it is, the choice and its price, their setup, the coming game and its key break' },
  bookMoveWhy: { file: 'services/bookMoveWhy.ts', says: 'the book move the student left, with the job it does on the board' },
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
  // THE DOORS' ADAPTER (P1-5): every fact a door is handed in its producer's
  // old shape is made here. Its row goes with the last old shape (P1-6), when
  // each of those producers emits CoachFact under its own name.
  toCoachFact: { file: 'services/coachFact.ts', says: 'a fact a door was handed in its producer\'s own shape — a live clause, a Review facet, a Learn lane, a phase report — until that producer emits CoachFact itself' },
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
  /** What rides on it — the step's lead is the fact worth most. */
  stakes: FactStakes | null;
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
  /** Which beat of the opening's story it is (`openingStory` only) — Learn
   *  speaks each beat in its own lane (`STORY_LANE`). */
  storyBeat?: StoryBeat;
}

/** A fact said without the move it names — see `CoachFact.heldForm`. */
export type HeldForm = Pick<CoachFact, 'text' | 'proof' | 'squares' | 'lines' | 'motif'>;

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

/** THE DOORS' ADAPTER (WO-STORY-MATRIX-01 P1-5) — a fact a door was handed in
 *  its producer's own shape (a live clause, a Review facet, a Learn lane, a
 *  phase report), as the one fact. Its place comes from its kind like every
 *  producer's (`placeFact`); a Learn producer that marks its fact as the
 *  reason for the student's own move places it in that step whatever its kind
 *  (`step`). The old shapes carry no plan thread (P1-8b threads the lesson
 *  composer's facts), so each caller answers `LOCAL_THREAD` until its producer
 *  emits CoachFact and answers its own. Deleted with the last old shape (P1-6). */
export function toCoachFact<K extends CoachFactKind>(
  f: Omit<CoachFact, 'kind' | 'group' | 'step' | 'computer'> & { kind: K; step?: ThoughtStep },
): CoachFact & { kind: K } {
  const placed = placeFact(f.kind, f.seat);
  return { ...f, kind: f.kind, group: placed.group, step: f.step ?? placed.step, computer: 'toCoachFact' };
}
