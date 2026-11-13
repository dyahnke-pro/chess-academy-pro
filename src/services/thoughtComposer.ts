// THE ONE COMPOSER (WO-ONE-COACH-01, David 2026-10-30: "All of this is built!
// Why is it not wired in?" → the wiring map: 336 teaching computers reached
// the voice through 25 composers that each picked, ranked and deduped their
// own way, and decided on WORDS — so the same move got a different reason on
// every surface and the lesson composer heard 18 of the 121 computers that say
// what a move changed).
//
// One thought per move, in Danya's order (THE HEART: what the move changed →
// the moves you'd weigh and why each falls short → "not yet, first this" → the
// line played out → the habit). Every computer hands it a FACT — the step it
// says, the claim it makes, the squares, what is at stake, its proof, the seat
// — never a sentence to be read back. The composer:
//   1. places each fact in its step (the producer says which; never read off
//      the words);
//   2. orders each step by how deep the fact sits (`factDepth`: a hidden
//      consequence and the move's own job first, the obvious last), then by
//      the priors fitted on the writers and on Danya (`thought-policy.json`);
//      a red skill on the student's record rises;
//   3. SAYS EVERY VERIFIED FIND (David 2026-11-12) — one claim once, a skill
//      the record proves (green) held, a fact the board refutes never said;
//   4. says each claim once (the say-once memory a lesson, a review or a game
//      keeps), through the one voice package (board truth, no praise, no
//      interface talk).
// Surfaces differ only in which steps they ask for and whose record they
// read; the order and the choice are this file's.
import type { SaidSet } from './gameStory';
import { emitEverything, everythingListening } from './everythingEvents';
import { stakeValue } from './factStakes';
import { placeFact, type CoachFact } from './coachFact';
import thoughtPolicy from '../data/thought-policy.json';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { HeatState } from './holdRate';
import { sameIdea, isByProduct, type IdeaKind } from './ideaKind';
import { buildVoicePackage, claimKey, joinSpoken, spokenSentenceKeys, type VoiceFact } from './voicePackage';
import { TEACHING_MOVES } from './teachingMoves';

/** THE STEPS OF ONE THOUGHT, in the order they are said (WO-THINK-01):
 *    danger  — what is attacked on the board right now (always first);
 *    name    — the opening, once;
 *    yours   — what the student's move changed;
 *    theirs  — what the opponent's move changed;
 *    choices — the moves you'd weigh and why each falls short;
 *    notYet  — "not yet, first this";
 *    line    — the line played out, to what it achieves;
 *    board   — the idea on the board: the plan, the structure, the trip;
 *    verdict — what the position is about now;
 *    habit   — the habit that finds it next time. */
export type ThoughtStep = 'danger' | 'name' | 'yours' | 'theirs' | 'choices' | 'notYet' | 'line' | 'board' | 'verdict' | 'habit';
export const THOUGHT_ORDER: Record<ThoughtStep, number> = {
  danger: 0, name: 1, yours: 2, theirs: 3, choices: 4, notYet: 5, line: 6, board: 7, verdict: 8, habit: 9,
};

/** Every computer that hands the composer facts. A new one fails to compile
 *  until its depth is said (`SOURCE_DEPTH`). */
export type ThoughtSource =
  /** The opening's story (`openingStory`): the thread across the moves — the
   *  road chosen, its price, their setup, the key break, the plan. */
  | 'openingStory'
  | 'moveWhy' | 'briefing' | 'boardTeacher' | 'moveJob' | 'fundamental' | 'deepFact' | 'binding'
  | 'pieceRoute' | 'refuted' | 'alternatives' | 'prophylaxis' | 'notYet' | 'bestLine' | 'counterThreat' | 'theirAim' | 'planChoice' | 'moveOrder' | 'structureLines' | 'purpose' | 'studentMove'
  /** The king walked by hand (`kingWalk.ts`): the squares, the route, the bishop kept home, the rule. */
  | 'kingWalk'
  /** The reply tree (`ifTheyPlay.ts`): if they X, you play Y — the likely replies and their answers. */
  | 'ifTheyPlay'
  /** The bait (`ifTheyPlay.baitBranch`): the trap the student's move set — the reply many players at this level choose that loses. */
  | 'baitSet'
  /** The moves a player weighs (`weighedMoves.ts`): the tempting move refuted, the move of the same worth, the square. */
  | 'weighed'
  /** The teaching moves' new computers (2026-11-05): the pawn break (`pawnBreak.ts`). */
  | 'teachingMove'
  /** The position's standing when the move changed it (`reviewMoveBriefing.evalReading`). */
  | 'evalRead'
  /** Opening theory, calculated (`openingTheory.ts`): main move, other tries, reply, score. */
  | 'openingTheory'
  /** What a move stops, the order it keeps, the line it cuts (`moveStops`, `pieceOutFirst`, `lineCut`). */
  | 'moveGains'
  /** The club index's known mistakes and traps (`knownSlips`, the registry rows). */
  | 'knownSlip'
  /** What a costly move allows (`costReason` → `allowedClause`): the line that punishes it. */
  | 'costReason'
  /** What the move threatens two or three moves deep (`moveThreat`): the null-move line that wins material the board did not offer before. */
  | 'moveThreat'
  /** A gambit's idea and the engine's verdict (`gambitIdea`): what is given, what comes back, whether it pays. */
  | 'gambitIdea';

/** ONE FACT, the composer's only input — the one fact shape (`coachFact.ts`),
 *  its step derived from its kind, with what this composer ranks by: the
 *  computer's source, the idea it states and its weight. Only the lesson
 *  composer's producers answer those today; they join the one fact when
 *  every producer emits it (WO-STORY-MATRIX-01 P1-6). */
export interface ThoughtFact extends CoachFact {
  source: ThoughtSource;
  /** The words when it speaks BEHIND its step's lead ("It also makes luft"),
   *  where the lead already named the move. Absent: `text` serves both. */
  alsoText?: string;
  /** Which idea it states (ONE vocabulary). Two facts of one idea on the same
   *  squares are one idea: the step keeps the one that leads. */
  idea: IdeaKind;
  /** The producer's own importance on this board, 0–100 (the briefing's
   *  aspect weight, the fundamental's weight) — the order after the stakes. */
  weight: number;
  /** It only restates what the board shows (the capture, the check, a bare
   *  develop) — THE QUIET-MOVE RULE: a step of nothing else is not said. */
  restates?: boolean;
}

/** WHAT A SURFACE ASKS FOR. Every surface says the same steps in the same
 *  order and keeps every verified find (David 2026-11-12: "if computers find
 *  something we speak it"); a question picks its steps itself. */
export interface ThoughtRegister {
  /** The steps this surface says (in THOUGHT_ORDER whatever order is given). */
  steps: ReadonlySet<ThoughtStep>;
}

/** The surfaces that compose through here. Learn had a row and no caller
 *  (deleted, WO-STORY-MATRIX-01 P1-1, 2026-10-30): a surface that comes to the
 *  composer answers its register here first. Chat composes an answer (the
 *  question picks the steps, `questionThought`, David 2026-11-06). */
export type ThoughtSurface = 'lesson' | 'review' | 'chat';
const ALL_STEPS: ReadonlySet<ThoughtStep> = new Set(Object.keys(THOUGHT_ORDER) as ThoughtStep[]);
export const THOUGHT_REGISTER: Record<ThoughtSurface, ThoughtRegister> = {
  lesson: { steps: ALL_STEPS },
  review: { steps: ALL_STEPS },
  chat: { steps: ALL_STEPS },
};

/** The say-once memory a lesson, a review or a game keeps across its moves:
 *  sentence and claim keys already spoken — the story's ledger (`SaidSet`,
 *  a lesson line's or Review's), or a plain set a caller keeps on trial. */
export interface ThoughtMemory { keys: SaidSet }

export interface ComposedThought {
  /** The thought, ready to speak. '' when nothing earned a word. */
  spoken: string;
  /** The facts that spoke, in spoken order. */
  kept: ThoughtFact[];
  /** Facts that did not speak, and why — so a quiet move is diagnosable. */
  held: Array<{ fact: ThoughtFact; why: 'step-not-asked' | 'same-idea' | 'by-product' | 'restates' | 'already-said' | 'refused' | 'record-green' }>;
}

/** THE STEPS ANOTHER LINE ON THIS MOVE ALREADY LEADS (Review's rule or point
 *  on the same move, `speaksBehindLead`): there the composer's first fact is
 *  the move's second job, and nothing follows it. A surface whose composer
 *  speaks alone answers `NOT_LED`. */
export const NOT_LED: ReadonlySet<ThoughtStep> = new Set<ThoughtStep>();

/** THE MOVE'S SECOND JOB, said as its own kind (`two-jobs`, the teaching move
 *  M-TWO-JOBS) with the words it speaks. */
function asSecondJob(f: ThoughtFact, text: string): ThoughtFact {
  return { ...f, ...placeFact('two-jobs', f.seat), text };
}

/** WHAT THE MOVE GAVE UP IS NOT ONE OF ITS JOBS: a fact whose kind makes the
 *  opportunity-cost move (M-OPP-COST, `teachingMoves`) — "it also loosens your
 *  own king's cover", "concedes an isolated pawn" — is said behind the move as
 *  before, but never counted as a job nor said as one. */
function isCost(f: ThoughtFact): boolean {
  return TEACHING_MOVES[f.kind].includes('M-OPP-COST');
}

/** HOW DEEP A FACT SITS (David 2026-11-12: "I want second and third order
 *  consequences weighted heavily. Tactics, the deep line calculations. Traps."
 *  → "The obvious facts I want at the bottom of the list" → "Prophylaxis needs
 *  to be weighted highly"):
 *    hidden  — a consequence the board does not show: the line played out, what
 *              the move makes possible later, a stopped pin, kick or fork, a
 *              tactic, a trap, the move order, why the other move fails;
 *    why     — what the move does, with its reason;
 *    obvious — what anyone sees: it develops, castles, takes back, checks.
 *  A hidden fact is ALWAYS said and never folded into a plainer fact on the
 *  same squares, and an obvious one comes last. Measured on the benches (held
 *  out): putting the hidden facts FIRST lost both leads (Danya's 34.6 → 27.6,
 *  the writers' 48.7 → 40.6) — both lead with the move's own job and give the
 *  consequence next — so hidden and why share the top of the order. */
export type FactDepth = 'hidden' | 'why' | 'obvious';
/** The computers whose facts are consequences, never the move's face. */
export const SOURCE_DEPTH: Record<ThoughtSource, 'hidden' | 'why'> = {
  moveWhy: 'why', briefing: 'why', fundamental: 'why', boardTeacher: 'why', moveJob: 'why', pieceRoute: 'why',
  purpose: 'why', studentMove: 'why', kingWalk: 'why', planChoice: 'why', structureLines: 'why', teachingMove: 'why', evalRead: 'why', openingTheory: 'why', openingStory: 'why',
  // A stop is the move's reason, never above the answer to a threat (Fried
  // Liver 8…Nb4: "it stops Qd3" led over "their Nc3 is aimed at your knight
  // on d5, and this covers it").
  moveGains: 'why',
  // A known mistake and its punishment is a consequence the board hides.
  knownSlip: 'hidden',
  costReason: 'hidden',
  // A threat is the move's reason: what it asks the opponent to answer.
  moveThreat: 'why',
  gambitIdea: 'why',
  deepFact: 'hidden', binding: 'hidden', bestLine: 'hidden', notYet: 'hidden', prophylaxis: 'hidden', baitSet: 'hidden',
  // What their move aims at now is the attack itself, one claim with the
  // other lines on its square (decision baseline 2026-11-12: "Their Qd8 is
  // aimed at your queen on c8. Their queen attacks your queen on c8").
  theirAim: 'why',
  ifTheyPlay: 'hidden', counterThreat: 'hidden', moveOrder: 'hidden', refuted: 'hidden',
  alternatives: 'hidden', weighed: 'hidden',
};
/** The ideas that are consequences, or plain sight, whichever computer says them. */
export const IDEA_DEPTH: Record<IdeaKind, FactDepth> = {
  tactic: 'hidden', 'set-up': 'hidden', mate: 'hidden', order: 'hidden',
  // Why the other move falls short: the line that refutes it.
  choice: 'hidden',
  // A STOPPED pin, kick or fork (the move's job, the prophylaxis computer). A
  // square merely taken from a piece ("takes d5 from their bishop", the
  // fundamentals' reading) is the move's face, not a stop: Danya says those
  // 2.5% of the time (the 2026-11-12 graphs).
  prevent: 'hidden',
  develop: 'obvious', castle: 'obvious', recapture: 'obvious', check: 'obvious',
  // Square control and space: what a piece or pawn covers is on the board for
  // anyone to see (the board teacher's "covers f4, holding back their f-pawn",
  // the description the writers and Danya leave out).
  center: 'obvious', space: 'obvious',
  'win-material': 'why', trade: 'why', rescue: 'why', guard: 'why', threat: 'why', pressure: 'why', prepare: 'why',
  unpin: 'why', 'king-safety': 'why', 'attack-king': 'why', outpost: 'why', file: 'why',
  diagonal: 'why', 'passed-pawn': 'why', promote: 'why', weakness: 'why', tempo: 'why', 'king-activity': 'why',
  route: 'why', plan: 'why', eval: 'why', theory: 'why', structure: 'why',
};
/** AN IDEA THAT CONTAINS ANOTHER: a kick is an attack that gains time, a
 *  material win or a tactic is an attack that lands. On the same squares the
 *  containing fact is the claim said with more. */
export const SAYS_MORE: Partial<Record<IdeaKind, readonly IdeaKind[]>> = {
  tempo: ['threat', 'pressure'],
  'win-material': ['threat', 'pressure'],
  tactic: ['threat', 'pressure'],
  'attack-king': ['threat', 'pressure'],
  mate: ['threat', 'check', 'pressure'],
  // An attack on a target that can be won contains the bare attack.
  pressure: ['threat'],
};

/** The plain faces of a move that turn into its reason when they name what
 *  they act on (a develop that attacks e5, a check that forks). Square control
 *  and space always name squares, so naming them is no reason. */
const NAMED_IS_WHY: ReadonlySet<IdeaKind> = new Set<IdeaKind>(['develop', 'castle', 'recapture', 'check']);
export function factDepth(f: Pick<ThoughtFact, 'restates' | 'source' | 'idea' | 'squares'>): FactDepth {
  if (f.restates === true) return 'obvious';
  if (SOURCE_DEPTH[f.source] === 'hidden') return 'hidden';
  // A move's stop read off the board (the fundamentals, `moveStops`) is its
  // reason, never a hidden consequence above the answer to a threat.
  if (f.idea === 'prevent' && (f.source === 'fundamental' || f.source === 'moveGains')) return 'why';
  // THE MOVE'S JOB is its reason by construction (`bookMoveWhy`), and it marks
  // its bare forms itself (`isBareJob` → restates): "Kxf7 gets you a knight
  // for the pawn, but your king has left its back rank" is no plain recapture.
  if (f.source === 'moveJob' && IDEA_DEPTH[f.idea] === 'obvious') return 'why';
  // AN OBVIOUS IDEA THAT NAMES WHAT IT ACTS ON SAYS WHY: "Nf3 develops into
  // the game, attacking the pawn on e5, and it needs an answer" is the move's
  // reason; "it brings your knight out" is what anyone sees.
  if (NAMED_IS_WHY.has(f.idea) && f.squares.length > 0) return 'why';
  return IDEA_DEPTH[f.idea];
}

/** THE STUDENT'S RECORD, for the surfaces that know whose game it is (Review).
 *  Read off the one heat map (`holdRate`), never a second estimator. A lesson
 *  is the same for everyone and a question was asked, so both pass null. */
export interface ThoughtRecord { stateOf(skill: MisconceptionTagId): HeatState }
/** THE SKILL A FACT TEACHES, by its idea and whose move it is — the record's
 *  row it is read against. Exhaustive: a new idea fails to compile until it
 *  says which skill it teaches, or that it teaches none. */
export const IDEA_SKILL: Record<IdeaKind, { student: MisconceptionTagId | null; opponent: MisconceptionTagId | null }> = {
  mate: { student: 'missed-your-mate', opponent: 'missed-their-mate' },
  'win-material': { student: 'missed-your-free-piece', opponent: 'hung-material' },
  tactic: { student: 'missed-tactic', opponent: 'missed-opponents-threat' },
  'set-up': { student: 'missed-set-up', opponent: 'missed-opponents-threat' },
  threat: { student: null, opponent: 'missed-opponents-threat' },
  pressure: { student: null, opponent: 'missed-opponents-threat' },
  check: { student: null, opponent: 'missed-opponents-threat' },
  prevent: { student: 'missed-opponents-threat', opponent: null },
  develop: { student: 'neglected-development', opponent: null },
  castle: { student: 'king-stuck-center', opponent: null },
  'king-safety': { student: 'weakened-king-safety', opponent: null },
  tempo: { student: null, opponent: 'tempo-handed' },
  space: { student: null, opponent: 'space-conceded' },
  trade: { student: 'bad-trade', opponent: null },
  'passed-pawn': { student: 'passed-pawn-neglected', opponent: null },
  promote: { student: 'passed-pawn-neglected', opponent: null },
  'king-activity': { student: 'passive-king-endgame', opponent: null },
  outpost: { student: 'misplaced-piece', opponent: null },
  route: { student: 'misplaced-piece', opponent: null },
  file: { student: 'passive-rook', opponent: null },
  plan: { student: 'no-plan', opponent: null },
  recapture: { student: null, opponent: null }, rescue: { student: null, opponent: null }, guard: { student: null, opponent: null },
  unpin: { student: null, opponent: null }, 'attack-king': { student: null, opponent: null }, center: { student: null, opponent: null },
  diagonal: { student: null, opponent: null }, weakness: { student: null, opponent: null }, choice: { student: null, opponent: null },
  order: { student: null, opponent: null }, eval: { student: null, opponent: null }, theory: { student: null, opponent: null }, structure: { student: null, opponent: null }, prepare: { student: null, opponent: null },
};
function recordStateOf(f: ThoughtFact, record: ThoughtRecord | null): HeatState | null {
  if (!record) return null;
  const skill = IDEA_SKILL[f.idea][f.seat];
  return skill ? record.stateOf(skill) : null;
}

/** THE ORDER INSIDE A STEP, FITTED (WO-COMPOSER-ORDER, 2026-11-12): the depth's
 *  band, then one prior per idea and per computer, fitted on the hand-written
 *  Watch beats and Danya's notes together (`scripts/bench/fit-composer-order.py`,
 *  half the courses and half his videos; scored on the other halves). A hidden
 *  idea or computer is never fitted below zero — David's rule, measured: it
 *  costs the writers' lead 1.4 points. */
const POLICY: {
  depth: Record<FactDepth, number>;
  ideaPrior: Partial<Record<IdeaKind, number>>;
  sourcePrior: Partial<Record<ThoughtSource, number>>;
  recordRaise: number;
} = thoughtPolicy as unknown as typeof POLICY;

/** What a fact is worth in its step's order. A red skill on the student's
 *  record rises within its band. */
function valueOf(f: ThoughtFact, record: ThoughtRecord | null): number {
  const red = recordStateOf(f, record) === 'red' ? POLICY.recordRaise : 0;
  return POLICY.depth[factDepth(f)] + (POLICY.ideaPrior[f.idea] ?? 0) + (POLICY.sourcePrior[f.source] ?? 0) + red + f.weight / 100;
}

function orderWith(record: ThoughtRecord | null): (a: ThoughtFact, b: ThoughtFact, ia: number, ib: number) => number {
  return (a, b, ia, ib) => (THOUGHT_ORDER[a.step] - THOUGHT_ORDER[b.step])
    // THE DANGER STEP is the nearest thing at stake first: a piece hanging now
    // before a threat that needs setting up.
    || (a.step === 'danger' ? (stakeValue(b.stakes) ?? 0) - (stakeValue(a.stakes) ?? 0) : 0)
    // THE STORY FOLLOWS THE MOVE (his order: what the move changed first): the
    // opening's thread — the price paid, their setup, the key break — is said
    // behind whatever the move itself does in its step, never ahead of it.
    || (Number(a.source === 'openingStory') - Number(b.source === 'openingStory'))
    || (valueOf(b, record) - valueOf(a, record))
    || (ia - ib);
}

/** The steps that say what a move did: a fact there on the squares a picked
 *  fact names is ONE CLAIM in other words ("guards e5" /
 *  "supports the center, guarding e5") — the geometry is said once (G4.5.1).
 *  A hidden consequence on those squares is a different claim. */
const MOVE_STEPS: ReadonlySet<ThoughtStep> = new Set<ThoughtStep>(['yours', 'theirs']);

/** WHEN ANOTHER LINE ALREADY LEADS THE MOVE'S STEP (Review's rule or point
 *  on the same move), a fact here speaks unless it restates the board or says
 *  that line's squares again — a hidden consequence always speaks. */
export function speaksBehindLead(f: ThoughtFact, leadSquares: ReadonlySet<string>): boolean {
  if (f.restates === true) return false;
  const depth = factDepth(f);
  // Behind a line that already teaches the move, what anyone sees adds nothing
  // ("…Nxd5 — the knight lands in the centre", then "it adds its weight to f4").
  if (depth === 'obvious') return false;
  return depth === 'hidden' || !f.squares.some((s) => leadSquares.has(s));
}

/** ONE THOUGHT from the facts a move earned. */
export function composeThought(
  facts: readonly ThoughtFact[],
  surface: ThoughtSurface,
  memory: ThoughtMemory | null,
  ledOutside: ReadonlySet<ThoughtStep>,
  /** The student's record where the surface knows whose game it is (Review);
   *  null on a lesson (the same for everyone) and an asked question. */
  record: ThoughtRecord | null,
): ComposedThought {
  const reg = THOUGHT_REGISTER[surface];
  const held: ComposedThought['held'] = [];
  // ONE CLAIM, THE WORDS THAT SAY MORE: a fact whose idea another fact on the
  // same squares contains ("attacks your bishop on b5" inside "kicks your
  // bishop off b5, gaining time") is that fact said with less, whatever their
  // order — held before the order is read.
  // …AND OF ONE CLAIM IN THE SAME WORDS' WORTH, THE ONE WITH MORE AT STAKE
  // (David 2026-11-12: importance from the evaluation): "hits your pawn on d5,
  // and nothing guards it" over "attacks your pawn on d5".
  const oneClaim = (f: ThoughtFact, g: ThoughtFact): boolean => g.step === f.step && g.text.trim().length > 0
    && (factDepth(g) === 'hidden') === (factDepth(f) === 'hidden') && g.squares.some((s) => f.squares.includes(s));
  const staked = (f: ThoughtFact): number => stakeValue(f.stakes) ?? 0;
  const saidWithMore = (f: ThoughtFact): boolean => MOVE_STEPS.has(f.step) && facts.some((g) => g !== f && oneClaim(f, g)
    && ((SAYS_MORE[g.idea] ?? []).includes(f.idea) || (g.idea === f.idea && staked(g) > staked(f))));
  for (const f of facts) if (f.text.trim() && saidWithMore(f)) held.push({ fact: f, why: 'same-idea' });
  const indexed = facts.map((f, i) => ({ f, i })).filter(({ f }) => f.text.trim().length > 0 && !saidWithMore(f));
  const order = orderWith(record);
  const sorted = indexed.sort((x, y) => order(x.f, y.f, x.i, y.i)).map(({ f }) => f);

  // EVERY VERIFIED FIND IS SAID (David 2026-11-12: "if computers come back
  // empty in those slots then obviously it doesn't get said. But if computers
  // find something we speak it. Unless the student record shows it doesn't
  // need to be said."). A fact is held only when it is the same claim as one
  // already picked, false on the board (the voice refuses it), already said in
  // this lesson, review or game, a skill the student's record proves (green),
  // or the board restated. No floor, no bar, no count of jobs.
  const picked: ThoughtFact[] = [];
  const leadOf = new Map<ThoughtStep, ThoughtFact>();
  // A FACT THE VOICE WOULD REFUSE NEVER TAKES A PLACE (the reversed matrix,
  // 2026-11-06: "h4 or dxc5 — both hold here" led the choices step, was then
  // refused as untrue on the board, and the true "Nh5 is about as good" behind
  // it was held as not the lead's support — the step said nothing). The one
  // voice package is asked at pick time, against what is already picked.
  const pickedSaid = new Set<string>(memory?.keys ?? []);
  const voiceRefuses = (f: ThoughtFact): ComposedThought['held'][number]['why'] | null => {
    const pkg = buildVoicePackage([{ kind: 'computed', text: f.text, fen: f.fen, altFen: f.altFen, squares: f.squares, claims: f.claims, lines: f.lines, proof: f.proof }], undefined, pickedSaid);
    if (pkg.kept.length > 0) return null;
    const reason = pkg.dropped.length > 0 ? pkg.dropped[0].reason : '';
    return /already|duplicate|same observation/.test(reason) ? 'already-said' : 'refused';
  };
  /** Say `said` (the fact as it will be heard) unless the voice refuses it;
   *  a refused fact is held and takes no place. */
  const pick = (f: ThoughtFact, said: ThoughtFact = f): boolean => {
    const refused = voiceRefuses(said);
    if (refused) { held.push({ fact: f, why: refused }); return false; }
    picked.push(said);
    const pkg = buildVoicePackage([{ kind: 'computed', text: said.text, fen: said.fen, altFen: said.altFen, squares: said.squares, claims: said.claims, lines: said.lines, proof: said.proof }], undefined, pickedSaid);
    for (const key of spokenSentenceKeys(pkg)) pickedSaid.add(key);
    return true;
  };
  for (const f of sorted) {
    if (!reg.steps.has(f.step)) { held.push({ fact: f, why: 'step-not-asked' }); continue; }
    // ALREADY SAID in this lesson, review or game: it never takes a step's
    // lead, so the next fact of the step can say something new.
    if (memory && f.claims.some((c) => memory.keys.has(claimKey(c)))) { held.push({ fact: f, why: 'already-said' }); continue; }
    // ONE IDEA IS SAID ONCE, by the computer that leads it: "keeps their bishop
    // off g4" and "takes the g4 square away from their bishop" are one idea.
    if (picked.some((p) => p.step === f.step && sameIdea(p, f))) { held.push({ fact: f, why: 'same-idea' }); continue; }
    // THE RECORD PROVES IT: a skill the student holds (green) is not taught
    // again — unless it is a danger now, or a consequence the board hides
    // (one rule with Learn's threat voice: green and hidden still speaks).
    if (f.step !== 'danger' && factDepth(f) !== 'hidden' && recordStateOf(f, record) === 'green') { held.push({ fact: f, why: 'record-green' }); continue; }
    const lead = leadOf.get(f.step);
    // A FACT THAT ONLY RESTATES THE BOARD ("it gives check", "it brings your
    // knight out") is not a find: behind a fact of its step it adds nothing.
    if ((lead || ledOutside.has(f.step)) && f.restates === true) { held.push({ fact: f, why: 'restates' }); continue; }
    if (MOVE_STEPS.has(f.step)) {
      const outside = ledOutside.has(f.step);
      if (!lead && !outside) { if (pick(f)) leadOf.set(f.step, f); continue; }
      const depth = factDepth(f);
      const sameClaim = picked.some((p) => p.step === f.step && (factDepth(p) === 'hidden') === (depth === 'hidden') && f.squares.some((s) => p.squares.includes(s)));
      if (sameClaim) { held.push({ fact: f, why: 'same-idea' }); continue; }
      const job = !isCost(f);
      const jobs = picked.filter((p) => p.step === f.step && !isCost(p));
      const jobsBefore = jobs.length + (outside ? 1 : 0);
      // A job after another job is one more of the move's jobs (its own kind);
      // a cost, or the move's first job, speaks as itself.
      const said = (text: string): ThoughtFact => (job && jobsBefore >= 1 ? asSecondJob(f, text) : { ...f, text });
      // Behind another producer's line on this move: the caller kept only
      // what speaks there (`speaksBehindLead`), in its own words.
      if (!lead) { if (pick(f, said(f.text))) leadOf.set(f.step, f); continue; }
      const firstJob = jobs.at(0) ?? lead;
      if (job && isByProduct(firstJob.idea, f.idea)) { held.push({ fact: f, why: 'by-product' }); continue; }
      pick(f, said(f.alsoText ?? f.text));
      continue;
    }
    if (!lead) { if (pick(f)) leadOf.set(f.step, f); continue; }
    pick(f, { ...f, text: f.alsoText ?? f.text });
  }

  // THE QUIET-MOVE RULE (WO-DECIDER-02): a step whose facts only restate the
  // board ("You play Nxe3 — it takes back the bishop") says nothing.
  for (const st of new Set(picked.map((f) => f.step))) {
    const inStep = picked.filter((f) => f.step === st);
    if (inStep.every((f) => f.restates)) {
      const at = picked.indexOf(inStep[0]);
      for (const f of inStep) { held.push({ fact: f, why: 'restates' }); picked.splice(picked.indexOf(f), 1); }
      // …AND THE FACT THAT EXPLAINS THE SAME IDEA TAKES ITS PLACE (task 172:
      // "it trades bishops" led the step, held "Bxe4 is a good trade — it takes
      // off their bishop that was bearing down on your king" as the same idea,
      // and was then dropped for only restating the board — the step said
      // nothing). A restating fact never silences the one that says why.
      const explains = held.find((h) => h.why === 'same-idea' && h.fact.step === st && h.fact.restates !== true && inStep.some((p) => sameIdea(p, h.fact)));
      if (explains) { held.splice(held.indexOf(explains), 1); picked.splice(at, 0, explains.fact); }
      // …AND A BY-PRODUCT OF THAT LEAD IS ONE NO MORE (2026-11-12, the
      // decision baseline: Bxc4 "completes the trade" led, held "it covers f7,
      // attacking their pawn there, which only their king guards" as its
      // by-product, and was then dropped — the move said nothing). With the
      // restating lead gone, what the move does from its square speaks.
      const freed = held.filter((h) => h.why === 'by-product' && h.fact.step === st);
      freed.forEach((h, k) => {
        held.splice(held.indexOf(h), 1);
        const first = !explains && k === 0;
        picked.splice(at + (explains ? 1 : 0) + k, 0, first ? h.fact : { ...h.fact, text: h.fact.alsoText ?? h.fact.text });
      });
    }
  }

  // Say once, board-true: each picked fact through the one voice package, in
  // thought order, against everything already said (the memory, then this
  // thought's own earlier facts) — so a kept line is known by the fact it came
  // from, never matched back by its words.
  const said = new Set<string>(memory?.keys ?? []);
  const kept: ThoughtFact[] = [];
  const keptVoice: VoiceFact[] = [];
  for (const f of picked) {
    const pkg = buildVoicePackage([{ kind: 'computed', text: f.text, fen: f.fen, altFen: f.altFen, squares: f.squares, claims: f.claims, lines: f.lines, proof: f.proof }], undefined, said);
    if (pkg.kept.length === 0) {
      const reason = pkg.dropped.length > 0 ? pkg.dropped[0].reason : '';
      held.push({ fact: f, why: /already|duplicate|same observation/.test(reason) ? 'already-said' : 'refused' });
      continue;
    }
    const k = pkg.kept[0];
    for (const key of spokenSentenceKeys(pkg)) said.add(key);
    kept.push({ ...f, text: k.text, lines: k.lines });
    keptVoice.push(k);
  }
  if (memory) for (const key of spokenSentenceKeys({ kept: keptVoice })) memory.keys.add(key);
  // EVERYTHING THE THOUGHT WEIGHED (the owner's drawer, `everythingEvents`).
  if (everythingListening()) {
    emitEverything({
      surface,
      door: 'composer',
      lines: [
        ...kept.map((f) => ({ computer: `${f.computer} (${f.source})`, kind: f.kind, text: f.text, said: true, why: null, fen: f.fen })),
        ...held.map((h) => ({ computer: `${h.fact.computer} (${h.fact.source})`, kind: h.fact.kind, text: h.fact.text, said: false, why: h.why, fen: h.fact.fen })),
      ],
    });
  }
  return { spoken: joinSpoken(keptVoice), kept, held };
}
