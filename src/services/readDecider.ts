/**
 * THE READ DECIDER — which of a board's facts "Read this position" says, in
 * the order Danya reads a board, and the habit that closes it (David
 * 2026-11-18: "strip the decider so its bare, and just have it chose the facts
 * that we compute in this order" → 2026-11-19: "dial in on Danya's read of
 * each board").
 *
 * His order (read off his written reads, and off the order his ideas come in
 * across 209 of his boards):
 *   1. the story: who stands better and the reason; the kind of position; the
 *      target the board turns on; their threat; what they are after;
 *   2. the calm answer: the best move and what it does;
 *   3. the tempting move refuted, and their best try after your move refuted;
 *   4. the plan; the concept the board shows; the second front;
 *   5. the habit that catches it — decided here, said last.
 *
 * WHICH fact a step says is LEARNED, never a list order: every fact has a
 * weight — how often Danya says that kind of fact, from that computer, in that
 * kind of position (decided or still open), when it touches the best move's
 * squares — fitted on his reads (`scripts/danya/fit-read-weights.mjs` →
 * `read-decider-weights.json`), less how often it was wrong. A step says its
 * highest-weighted fact when that clears the table's bar (a BAR, never a
 * count: G4.5); the fact's stakes break ties within a weight. Rules, computed:
 *   - a verdict says its reason: a bare "You're winning." is never said;
 *   - their threat is said only when it is real — the best move answers it;
 *   - a fact that only restates the board (`restates`) is never a step's say;
 *   - a habit is never a step: the read closes on ONE habit, and "their threat
 *     first" (named) only when their threat is real and the side to move has
 *     no shot of its own;
 *   - PUZZLE MODE — the answer withheld and the side to move winning: the
 *     verdict with its reason, the mate's pattern, a concept about this board,
 *     never a fact on the answer's squares, and the attacking habit (checks,
 *     captures, threats). Their threats, targets and plans are silent: the
 *     winning line answers them.
 * Pure. One table, `READ_STEPS` + the weights, that the one door
 * (`coachDecider`) can read.
 */
import { jaccard, SAME_CLAIM_JACCARD } from './factSelector';
import { Chess, type Square } from 'chess.js';
import { PICTURE_ROLE, type PictureRole } from './positionPicture';
import weightTable from '../data/read-decider-weights.json';
import { readHabit } from './methodBeat';
import type { PictureConclusionId } from './gameStory';
import { jobClause, renderMoveJobs, type FactBoard } from './teachingSentence';
import { detectPlanRace } from './planRace';
import { fadeText, type FadeLevels } from './fadeText';
import { shortenLevel } from './recordShortening';
import type { FactKind } from './reviewFacetRank';

/** THE BOARD READ'S OWN KINDS, placed on the one fact vocabulary so the one
 *  shortener reads their layer. Null: never shortened by its layer (the
 *  standing, the position's character, a mate — the read's conclusions). */
/** The read's danger facts: shortened, never silenced. */
const DANGER_KINDS: ReadonlySet<string> = new Set(['refuted', 'their-refuted', 'refuted-positional', 'must-defend']);

const READ_KIND_AS_FACT: Readonly<Record<string, FactKind | null>> = {
  'their-refuted': 'refuted', tries: 'refuted', 'refuted-positional': 'refuted',
  'switch-wing': 'plan-steps', siege: 'plan-steps', 'their-plan': 'plan-steps',
  standing: null, character: null, 'mate-pattern': null, target: null, 'their-target': null,
};

/** Where a board fact came from: the board's own reads, a tempting move
 *  refuted, or what the engine's best move does. */
export type ReadFactFrom = 'position' | 'tempting' | 'bestMove';

export interface ReadFact {
  from: ReadFactFrom;
  kind: string;
  text: string;
  /** REQUIRED: the board the fact was computed on — its key, the path from
   *  the board on screen and the relation (CLAUDE.md, EVERY FACT KNOWS ITS
   *  BOARD). Stamped once, by the board bundle (`boardReadFacts`). */
  board: FactBoard;
  /** The computer that made it (catalog name), where the read knows it. */
  computer?: string;
  /** REQUIRED: the squares the fact is about, coupled by its producer (G4.5.1:
   *  never scraped back out of the words). Empty for a fact about no square. */
  squares: readonly string[];
  /** What rides on it (`factStakes.stakeValue`), where its producer staked it. */
  stakes?: number | null;
  /** It only restates what the board shows (the composer's quiet-move rule). */
  restates?: boolean;
  /** The skill the fact teaches (the record's tag), where its producer knows it. */
  skill?: string;
  /** The idea it states, as claim keys (`CoachFact.claims`): a fact sharing a
   *  claim with one already said is that idea again, never said twice. */
  claims?: readonly string[];
  /** A try whose result lands in another band than the best move's ("…Ke7
   *  throws the win"): the verdict's "but". */
  bandShift?: boolean;
  /** The squares the standing's reason is about ("your passed pawn on c6"),
   *  where the fact says a standing with its reason. */
  reasonSquares?: readonly string[];
  /** The defender's checks the read weighed as tries (uci). */
  checksRead?: readonly string[];
  /** Other tries this one fact refutes for the same reason (uci). */
  also?: readonly string[];
  /** The verdict said after its band was already said this game: the text
   *  without the standing ("Breaking through is another matter."); empty
   *  when the verdict is the standing alone. */
  afterStanding?: string;
  /** A try: the move (uci) the fact refutes. */
  move?: string;
  /** THE PICTURE'S VERDICT: the failed tries it names, in its own order — each
   *  try's refutation is the verdict's "but", heard right after it. */
  tries?: readonly string[];
  /** THE PICTURE'S PLAN: the line it plays (uci, the side to move first) — the
   *  pieces it moves and the squares it reaches, what its "because" and its
   *  details are read against. */
  line?: readonly string[];
  /** THE PICTURE'S CONCLUSION it states (`CoachFact.conclusion`): what a
   *  surface with a game's story commits when the read is said. */
  conclusion?: PictureConclusionId;
}

export type ReadStep = 'verdict' | 'character' | 'priority' | 'their-move' | 'their-plan' | 'best-move' | 'tempting' | 'their-try' | 'plan' | 'concept' | 'second-front' | 'mate-pattern';

/** Whether the game is still to be decided: a mate or three pawns either way
 *  is decided (Danya's plans fall silent there; conversion and tactics speak). */
export type ReadBucket = 'decided' | 'open';

export interface ReadContext {
  /** THE STUDENT'S LEVELS (`recordShortening.recordLevels`): how short each
   *  fact is said to this student, the one shortener every door reads. Null
   *  where no student is reading (a lesson's own board, a test). The real
   *  builder (`readContextOf`) takes it REQUIRED. */
  levels?: FadeLevels | null;
  /** The board read (null where the caller has only the facts). */
  fen: string | null;
  bucket: ReadBucket;
  /** The best move's two squares (empty when unread). */
  best: readonly string[];
  /** The best move's promotion piece, when it promotes. */
  bestPromotion?: string;
  /** The side to move is winning (two pawns or a mate): their slow plan is
   *  then no conclusion of the read — the win is (0GvdU …f1=N+: "their plan
   *  from here: Ke5, Kd6 and then the b4 break" a move from a new queen). */
  moverWins?: boolean;
  /** The squares the engine's best line plays on (its first moves): what a
   *  decided read is about. */
  lineSquares?: ReadonlySet<string>;
  /** Squares a read must not touch: a puzzle's answer, still being solved. */
  withheld: readonly string[];
  /** The answer is withheld and the side to move is winning (a puzzle). */
  puzzle: boolean;
  /** A tactic on the board for the student, to play now. */
  studentShot: boolean;
  /** The game story's say-once ledger: claims already said this game. A
   *  fact (past the standing and the picture's verdict and plan, which are
   *  read fresh every board) whose claim is in it is not said again, nor is
   *  the habit already closed on. */
  said: ReadonlySet<string>;
}

/** The best line's first moves a decided read is about. */
const LINE_SQUARES_PLIES = 6;
/** The descriptions that speak in a decided read only when linked to its line. */
const LINKED_ONLY: ReadonlySet<string> = new Set(['their-target', 'target', 'structure-plan', 'structure', 'concept', 'character', 'judgement']);

/** Three pawns: the band where his reads stop planning and start converting. */
const DECIDED_CP = 300;
/** Two pawns for the side to move: a puzzle with a winning shot. */
const PUZZLE_WIN_CP = 200;

/** The context a read is decided in, from the engine's best line (White's
 *  seat) and the withheld move's squares. */
export function readContextOf(i: {
  fen: string;
  top: { evaluation: number; mate: number | null } | null;
  bestUci: string | null;
  withheld: readonly string[] | null;
  studentShot: boolean;
  /** REQUIRED: the story's said claims (`ReadStory.claims`), or null with no story. */
  said: readonly string[] | null;
  /** The student's levels (`recordLevels`); the live callers pass it (gate:
   *  `oneShortener.gate`). */
  levels?: FadeLevels | null;
  /** The best line's moves (UCI), when read. */
  line?: readonly string[];
}): ReadContext {
  const sign = i.fen.split(' ')[1] === 'b' ? -1 : 1;
  const mate = i.top?.mate ?? null;
  const cp = i.top && mate == null ? i.top.evaluation * sign : null;
  const decided = mate != null || (cp != null && Math.abs(cp) >= DECIDED_CP);
  const moverWins = mate != null ? mate * sign > 0 : cp != null && cp >= PUZZLE_WIN_CP;
  return {
    fen: i.fen,
    levels: i.levels ?? null,
    bucket: decided ? 'decided' : 'open',
    best: i.bestUci ? [i.bestUci.slice(0, 2), i.bestUci.slice(2, 4)] : [],
    ...(i.bestUci && i.bestUci.length > 4 ? { bestPromotion: i.bestUci[4] } : {}),
    moverWins,
    lineSquares: new Set((i.line ?? []).slice(0, LINE_SQUARES_PLIES).flatMap((u) => [u.slice(0, 2), u.slice(2, 4)])),
    withheld: i.withheld ?? [],
    puzzle: !!i.withheld && moverWins,
    studentShot: i.studentShot,
    said: new Set(i.said ?? []),
  };
}

/** The kinds each step may say. `from` narrows a step to sources (with
 *  `positionKinds` the board's own pointers it also takes); `onTarget` takes a
 *  kind only when it names a square of the story's target; `sayOnce` steps
 *  describe the board and are said only when they name a square not yet named. */
interface StepRow { step: ReadStep; kinds: readonly string[]; from?: readonly ReadFactFrom[]; positionKinds?: readonly string[]; onTarget?: readonly string[]; sayOnce?: true;
  /** Computers the step says before any weight: the board's one plan, a
   *  goal and a way the best line plays, over a description of a piece or a
   *  file (Danya's plans, 2026-11-19: "their rook on f1 is well placed" beat
   *  "the rook lift Re1-e3-b3"). */
  first?: readonly string[];
  /** A CONCLUSION of the picture (WO-PICTURE-01 P5): what it rests on is said
   *  right after it — the verdict's failed tries (`tries`), or the plan's
   *  details and its "because" read against its line (`line`). */
  supports?: 'tries' | 'line'
  /** Sources the step says before any other, among its facts that clear the
   *  bar: the tempting step is the tempting move refuted (his step 3, "Nxb5
   *  looks natural, but…") — a deliberation over another candidate speaks
   *  there only when no tempting move was refuted (Korchnoi's board: the
   *  learned weight of a "why not Ne2?" otherwise outranks the natural
   *  capture that loses a knight). */
  firstFrom?: readonly ReadFactFrom[] }

/** The kinds that state what the best move DOES — its jobs, required in a
 *  read whenever computed. */
const MOVE_JOB_KINDS: ReadonlySet<string> = new Set(['move-job', 'route', 'judgement', 'aspect-threat', 'aspect-prepares', 'aspect-tactic-lands', 'aspect-wins', 'aspect-tactic-set-up', 'aspect-opens-king', 'stop', 'stopped', 'board-teacher', 'fundamental', 'technique', 'sac-why', 'checkmate', 'pawn-break', 'trade', 'provoke']);

export const READ_STEPS: readonly StepRow[] = [
  // The standing with its reason; compensation and "convert" say the same
  // standing with the reason a player most needs.
  // A bare standing ("You're winning.") is never a step: a verdict is said
  // with its reason or not at all.
  { step: 'verdict', kinds: ['compensation', 'convert', 'standing', 'eval'] },
  { step: 'character', kinds: ['character'] },
  { step: 'priority', kinds: ['priority', 'target'], sayOnce: true },
  // Their threat, proven by the board and answered by the best move (the
  // habit that names it is the close, never a step).
  { step: 'their-move', kinds: ['must-defend'], sayOnce: true },
  { step: 'their-plan', kinds: ['their-target', 'their-plan'], sayOnce: true },
  {
    step: 'best-move',
    kinds: ['route', 'judgement', 'key-moment', 'timing', 'move-order', 'not-yet', 'checkmate', 'sac-why', 'aspect-threat', 'aspect-prepares', 'aspect-tactic-lands', 'aspect-wins', 'stop', 'stopped', 'move-job', 'aspect-tactic-set-up', 'board-teacher', 'technique', 'fundamental', 'king-read', 'pawn-break', 'trade', 'provoke', 'aspect-opens-king', 'count', 'contrast', 'nugget', 'trigger'],
    // What the best move does — and the board's own pointers at it.
    from: ['bestMove'], positionKinds: ['timing', 'move-order', 'not-yet', 'king-read'],
  },
  { step: 'tempting', kinds: ['refuted', 'refuted-positional', 'deliberation'], firstFrom: ['tempting'] },
  { step: 'their-try', kinds: ['their-refuted'] },
  // THE PLAN: the board's one plan (`planOfTheBoard` — a goal and a way the
  // best line plays) when the board has one; else the plan computers' own.
  { step: 'plan', kinds: ['siege', 'plan-steps', 'plan-race', 'structure-plan'], sayOnce: true, first: ['planOfTheBoard'] },
  // The concept the board shows. A played-out `line` is never a read's step:
  // it is said move by move, a score sheet (the voice rule).
  { step: 'concept', kinds: ['concept', 'speedrun-read'], sayOnce: true },
  { step: 'second-front', kinds: ['switch-wing'], onTarget: ['switch-wing'], sayOnce: true },
];

/** THE PICTURE'S ORDER (WO-PICTURE-01 P5, Danya's read: "White is hanging on
 *  the precipice, but it is very difficult to finish him off. …Qf6 is met by
 *  Rh5 … …c4 fails to Nxg5 … so a rook lift"). When the board's conclusions
 *  were read — the verdict after the tries, the plan that survives them — the
 *  read says them as ONE argument: the verdict with its reason; the "but", each
 *  failed try with the reply that refutes it; the plan, its details and its
 *  "because" (their counterplay, the target, linked by its line); the move with
 *  its jobs; then what the opponent wants and the lesson. The tries are said
 *  only as the verdict's "but": a try the verdict does not name is not a step.
 *  The target and their counterplay are said only as the because of a
 *  conclusion they are linked to — unlinked, they stay in the picture. */
export const PICTURE_STEPS: readonly StepRow[] = [
  { step: 'verdict', kinds: ['verdict'], first: ['pictureVerdict'], supports: 'tries' },
  { step: 'their-move', kinds: ['must-defend'], sayOnce: true },
  { step: 'plan', kinds: ['plan-now', 'siege', 'plan-steps', 'plan-race', 'structure-plan'], first: ['picturePlan', 'planOfTheBoard'], supports: 'line' },
  READ_STEPS.find((r) => r.step === 'best-move') as StepRow,
  { step: 'character', kinds: ['character'] },
  { step: 'their-plan', kinds: ['their-target', 'their-plan'], sayOnce: true },
  { step: 'their-try', kinds: ['their-refuted'] },
  { step: 'concept', kinds: ['concept', 'speedrun-read'], sayOnce: true },
];

/** A puzzle still being solved: the verdict, the mate's pattern, a concept
 *  about this board. The winning line answers their threats and plans. */
export const PUZZLE_STEPS: readonly StepRow[] = [
  { step: 'verdict', kinds: ['compensation', 'convert', 'standing', 'eval'] },
  { step: 'mate-pattern', kinds: ['mate-pattern'] },
  { step: 'concept', kinds: ['concept', 'king-read'], sayOnce: true },
];

interface WeightTable { bar: number; prior: number; weights: Partial<Record<string, number>> }
const TABLE = weightTable as WeightTable;

/** The keys of a fact, most specific first (`fit-read-weights.mjs` builds the
 *  same list). */
export function weightKeys(bucket: ReadBucket, onBest: boolean, from: ReadFactFrom, kind: string, computer: string | undefined): string[] {
  const c = computer ?? '-';
  const ob = onBest ? 'B' : 'n';
  return [`${bucket}|${ob}|${from}:${kind}:${c}`, `${ob}|${from}:${kind}:${c}`, `${bucket}|${from}:${kind}:${c}`, `${bucket}|${from}:${kind}`, `${from}:${kind}:${c}`, `${from}:${kind}`, kind];
}

/** A fact's weight: how often Danya says its kind of fact here, less how
 *  often it was wrong. A kind he was never measured on takes the prior. */
export function readWeight(f: ReadFact, ctx: ReadContext): number {
  const onBest = f.squares.some((s) => ctx.best.includes(s));
  for (const k of weightKeys(ctx.bucket, onBest, f.from, f.kind, f.computer)) {
    const w = TABLE.weights[k];
    if (w !== undefined) return w;
  }
  return TABLE.prior;
}

/** What a fact on the story's target adds to its weight (Rd3 "presses down the
 *  d-file at their pawn on d5" over "adds a second guard to your bishop"). */
const ON_TARGET = 0.02;

/** The read: one fact per step, in his order, and the habit that closes it. */
const STANDING_KINDS: ReadonlySet<string> = new Set(['standing', 'standing-bare', 'eval', 'convert', 'compensation', 'verdict']);

export function decideRead<F extends ReadFact>(factsIn0: readonly F[], ctx: ReadContext): { facts: F[]; habit: string | null; said: string[] } {
  // THE STANDING REPEATS ONLY ON A CHANGE (CLAUDE.md, David 2026-11-20):
  // once a band is said in a game, a standing in that band is not said again
  // — its claim is the band (`standing:<band>`). A verdict whose band was
  // said goes on without it (`afterStanding`).
  const bandSaid = (f: F): boolean => (f.claims ?? []).some((c) => c.startsWith('standing:') && ctx.said.has(c));
  const factsIn = factsIn0.flatMap((f): F[] => {
    if (f.computer === 'pictureVerdict' && bandSaid(f)) return f.afterStanding ? [{ ...f, text: f.afterStanding }] : [];
    return [f];
  });
  // ONCE A GAME: what the story already said is not said again.
  const toldBefore = (f: F): boolean => (f.computer === 'pictureVerdict' ? false : STANDING_KINDS.has(f.kind) ? bandSaid(f) : f.computer !== 'picturePlan'
    && storyKeys(f).some((c) => ctx.said.has(c)));
  // ONE RELEVANCE RULE, in a decided read: a description of the board speaks
  // only when it is linked to the conclusion — it works on a square the best
  // line plays on (0Km5u …Qe3: "the target is your pawn on b5" and "push
  // your e-pawn" beside a mating attack on d1). Unlinked, it stays unspoken.
  const unlinked = (f: F): boolean => !!ctx.moverWins && !!ctx.lineSquares?.size && f.from === 'position' && LINKED_ONLY.has(f.kind)
    && !f.squares.some((sq) => ctx.lineSquares?.has(sq));
  const facts = factsIn.filter((f) => !toldBefore(f) && !(ctx.moverWins && f.kind === 'their-plan') && !unlinked(f));
  const out: F[] = [];
  let target = new Set<string>();
  const named = new Set<string>();
  // ONE IDEA ONCE, BY ITS CLAIM: a fact sharing a claim key with one said is
  // that idea in other words ("their …g6 break is dead", "it takes the …g6
  // break away").
  const claimed = new Set<string>();
  // THE STANDING IS ONE CLAIM: a standing, an eval, a convert or a
  // compensation line each says who stands better — the read says one.
  // TWO PLANS SHARE A CLAIM ONLY WHEN THEY ARE THE SAME PLAN (its goal and
  // target, carried by the plan's own claim) — never because both are plans.
  const claimsOf = (f: F): readonly string[] => (STANDING_KINDS.has(f.kind) ? [...(f.claims ?? []), 'standing'] : (f.claims ?? []));
  // ONE RELEVANCE RULE: a second plan speaks only when it is linked to what
  // was said — it works on a square the said plan or the best move works on.
  // An unlinked plan is another conclusion, and it stays unspoken (Korchnoi:
  // a3 and why, never the minority attack beside it).
  // Every kind of plan, the board's steps as much as the structure's: a
  // second plan unlinked to the first ("Nf1, Ne3 and then Nd5" beside the
  // rook lift) is another conclusion.
  const unlinkedPlan = (f: F): boolean => {
    if (!PLAN_KINDS.has(f.kind)) return false;
    const plans = out.filter((g) => PLAN_KINDS.has(g.kind));
    if (plans.length === 0) return false;
    const about = new Set([...plans.flatMap((g) => g.squares), ...ctx.best]);
    return !f.squares.some((sq) => about.has(sq));
  };
  const sameClaim = (f: F): boolean => claimsOf(f).some((c) => claimed.has(c)) || unlinkedPlan(f);
  const say = (f: F): void => {
    out.push(f);
    for (const sq of f.squares) named.add(sq);
    for (const c of claimsOf(f)) claimed.add(c);
  };
  const picture = !ctx.puzzle && facts.some((f) => f.computer === 'pictureVerdict' && f.kind === 'verdict');
  // A conclusion and what it rests on: their details are the supports the
  // picture linked, never a same-piece detail stapled on as well.
  const argued = new Set<F>();
  const onTarget = (f: F): boolean => f.squares.some((s) => target.has(s));
  // THE VERDICT'S REASON IS THE CLAIM (readers' flags 2026-11-19: beginner
  // chess strategy #6, how to survive a chess disaster #0): "you're losing —
  // their passed pawn on d6 is two steps from queening, your isolated pawn on
  // c3 …" and then "the target is your pawn on c3" or "both sides have a
  // runner" says the same pawns again. A target or a race line about a pawn
  // the verdict already named is that verdict said twice.
  let verdictPawns = new Set<string>();
  const racePawns = ((): Set<string> => {
    if (!ctx.fen) return new Set();
    try {
      const r = detectPlanRace(ctx.fen, ctx.fen.split(' ')[1] === 'b' ? 'b' : 'w');
      return r?.kind === 'passer-race' ? new Set([r.yourPawn, r.theirPawn]) : new Set();
    } catch { return new Set(); }
  })();
  const restatesVerdict = (f: F): boolean => {
    if (verdictPawns.size === 0) return false;
    // A RACE, read off the board (never the words): a structure line on both
    // runners the race detector finds.
    const race = f.kind === 'plan-race' || (f.kind === 'structure-plan' && racePawns.size > 0 && [...racePawns].every((sq) => f.squares.includes(sq)));
    // A structure line about the verdict's pawns and nothing else ("your
    // passed pawn on c6 is two pushes from queening") is the verdict's
    // reason said again (F5, the Saavedra).
    if (f.kind === 'structure-plan' && f.squares.length > 0 && f.squares.every((sq) => verdictPawns.has(sq))) return true;
    if (!race && f.kind !== 'target' && f.kind !== 'their-target') return false;
    return f.squares.some((sq) => verdictPawns.has(sq));
  };
  const steps = ctx.puzzle ? PUZZLE_STEPS : picture ? PICTURE_STEPS : READ_STEPS;
  for (const row of steps) {
    const candidates = facts.filter((x) =>
      row.kinds.includes(x.kind)
      && (!row.from || row.from.includes(x.from) || (x.from === 'position' && !!row.positionKinds?.includes(x.kind)))
      && (!row.onTarget?.includes(x.kind) || onTarget(x))
      && !x.restates
      // THEIR THREAT IS SAID ONLY WHEN IT IS REAL: the best move answers it.
      // "Three of your pieces are attacked and none matters" — Rxg7+ ignores
      // them all (readers' flags 2026-11-19: 6 of 16 threat lines FALSE).
      && (x.kind !== 'must-defend' || bestAnswers(x, ctx))
      && !x.squares.some((s) => ctx.withheld.includes(s))
      // A concept on a puzzle is about THIS board — a rule with no square is
      // off the point of the shot.
      && !(ctx.puzzle && row.step === 'concept' && x.squares.length === 0)
      && !out.some((o) => sameFact(o, x))
      && !sameClaim(x)
      && !restatesVerdict(x)
      // ONE IDEA ONCE: a story line whose every square was named adds nothing.
      && (!row.sayOnce || x.squares.length === 0 || x.squares.some((sq) => !named.has(sq))));
    // EVERY FACT THAT CLEARS THE BAR SPEAKS (G4.5: a bar, never a cap of one
    // a step). The picture's own computers lead their step; the rest follow
    // by weight, then stakes. Each is re-checked against what the step has
    // already said, so one idea is still said once.
    // The mate's pattern is the puzzle's lesson: said whenever it is found.
    const weightOf = (x: F): number => (x.kind === 'mate-pattern' ? 1 : readWeight(x, ctx) + (onTarget(x) ? ON_TARGET : 0));
    const firsts = candidates.filter((x) => !!x.computer && !!row.first?.includes(x.computer));
    const firstFrom = row.firstFrom;
    const rank = (x: F): number => (firstFrom?.includes(x.from) ? 1 : 0);
    // THE MOVE'S JOBS ARE REQUIRED (CLAUDE.md rule 3, by surface: a read
    // says every job): a job the best move does that was computed is said,
    // whatever its learned weight — the bar decides the board's other facts,
    // never whether the move is explained. Inside a step the computed STAKES
    // rank; the learned kind weight only breaks a tie.
    // THE MOVE'S JOBS ARE REQUIRED (CLAUDE.md rule 3, by surface: a board
    // read says EVERY job of the board's move): a job computed is said,
    // whatever its learned weight. One idea once is the claim's work
    // (`sameClaim`), and the jobs of one move are said as one sentence
    // (`mergeMoveJobs`) — never a word ceiling (G4.5).
    const required = (x: F): boolean => row.step === 'best-move' && !ctx.puzzle && x.from === 'bestMove' && MOVE_JOB_KINDS.has(x.kind);
    const rest = candidates.filter((x) => !firsts.includes(x) && (weightOf(x) >= TABLE.bar || required(x)))
      .sort((x, y) => rank(y) - rank(x) || (y.stakes ?? -1) - (x.stakes ?? -1) || weightOf(y) - weightOf(x));
    let lead: F | null = null;
    const stepSaid: F[] = [];
    for (const pick of [...firsts, ...rest]) {
      if (out.some((o) => sameFact(o, pick)) || sameClaim(pick) || restatesVerdict(pick)) continue;
      // Two facts of one step on the same squares (G4.5.1's subsumption bar)
      // are one claim about one geometry: the first, by order, says it.
      if (pick.squares.length > 0 && stepSaid.some((o) => o.squares.length > 0 && jaccard(o.squares, pick.squares) >= SAME_CLAIM_JACCARD)) continue;
      stepSaid.push(pick);
      if (row.sayOnce && pick.squares.length > 0 && pick.squares.every((sq) => named.has(sq))) continue;
      say(pick);
      if (!lead) {
        lead = pick;
        if (row.step === 'priority') target = new Set(pick.squares);
        // The pawns the verdict's reason is about (a passer, a weak pawn). The
        // picture's verdict names tries, not pawns.
        if (row.step === 'verdict' && ctx.fen) {
          const about = pick.reasonSquares ?? (picture ? [] : pick.squares);
          try { const bd = new Chess(ctx.fen); verdictPawns = new Set(about.filter((sq) => bd.get(sq as Square)?.type === 'p')); } catch { /* an unreadable board names no pawn */ }
        }
      }
      // The verdict's "but": every try that changes the result's band.
      if (row.step === 'verdict' && pick === lead && !picture) {
        for (const f of facts) if (f.bandShift && f.kind === 'refuted' && sayable(f, ctx, out, sameClaim)) say(f);
      }
      if (row.supports) {
        argued.add(pick);
        for (const f of supportsOf(row.supports, pick, facts, ctx, out, sameClaim)) { say(f); argued.add(f); }
      }
    }
  }
  // THE ONE SHORTENER (`recordShortening`): a fact this student has proven
  // is said shorter, or not at all — the same rule as Learn and Review.
  const kept = mergeMoveJobs(withDetails(out, facts, ctx, argued))
    .map((f) => {
      const level = shortenLevel(ctx.levels ?? null, f.skill ?? null, f.kind in READ_KIND_AS_FACT ? READ_KIND_AS_FACT[f.kind] : f.kind);
      // A danger is never silenced, at most said short (Learn keeps a warning
      // before the move, the composer its danger step): a refuted try and a
      // threat to meet are what keep a proven student from walking into it.
      const t = fadeText(f.text, level === 'silent' && DANGER_KINDS.has(f.kind) ? 'short' : level);
      return t === f.text ? f : { ...f, text: t };
    })
    .filter((f) => f.text.trim() !== '');
  const h = habitOf(facts, ctx);
  const habit = h && !ctx.said.has(`habit:${h.id}`) ? h : null;
  return { facts: kept, habit: habit?.text ?? null, said: [...kept.flatMap(storyKeys), ...(habit ? [`habit:${habit.id}`] : [])] };
}

/** The move a job fact is about, off its claims (`move:<uci>:idea:…`). */
function jobMove(f: ReadFact): string | null {
  if (f.from !== 'bestMove' || !MOVE_JOB_KINDS.has(f.kind)) return null;
  for (const c of f.claims ?? []) { const m = /^move:([a-h][1-8][a-h][1-8][qrbn]?):idea:/.exec(c); if (m) return m[1]; }
  return null;
}

/** ONE MOVE, ONE SENTENCE (the decider's grouping): the jobs of the board's
 *  move that can be said after it ("It also …") join the first, in the
 *  decided order; a job in another shape stays its own fact. The merged fact
 *  carries every claim and square, so the record of what was said is whole. */
/** A job's idea and squares off its claim (`move:<uci>:idea:<idea>:<sq,…>`). */
function jobIdeas(f: ReadFact): Array<{ family: string; squares: string[] }> {
  return (f.claims ?? []).flatMap((c) => {
    const m = /^move:[a-h1-8qrbn]+:idea:([a-z-]+):(.*)$/.exec(c);
    return m ? [{ family: IDEA_FAMILY[m[1]] ?? m[1], squares: m[2] ? m[2].split(',') : [] }] : [];
  });
}
/** Ideas that are one claim when they touch the same square: hitting a piece
 *  is one idea whether a computer calls it pressure, a threat or an attack. */
const IDEA_FAMILY: Record<string, string> = { pressure: 'hit', threat: 'hit', attack: 'hit', 'win-material': 'hit', check: 'check', file: 'file', 'passed-pawn': 'push', promote: 'push' };

export function mergeMoveJobs<F extends ReadFact>(facts: readonly F[]): F[] {
  const out: F[] = [];
  // ONE IDEA ONCE, BY CLAIM: a job of the same idea family on a square an
  // earlier job of the move already named (or with no square, the same family)
  // is that idea again ("hits their bishop on g4" / "attacks their bishop on g4").
  const saidIdeas = new Map<string, Array<{ family: string; squares: string[] }>>();
  const repeats = (mv: string, f: F): boolean => {
    const prior = saidIdeas.get(mv) ?? [];
    const mine = jobIdeas(f);
    return mine.length > 0 && mine.every((i) => prior.some((p) => p.family === i.family && (i.squares.length === 0 || p.squares.length === 0 || i.squares.some((q) => p.squares.includes(q)))));
  };
  const lead = new Map<string, number>();
  const parts = new Map<number, string[]>();
  for (const f of facts) {
    const mv = jobMove(f);
    if (mv && repeats(mv, f)) continue;
    if (mv) saidIdeas.set(mv, [...(saidIdeas.get(mv) ?? []), ...jobIdeas(f)]);
    const at = mv ? lead.get(mv) : undefined;
    if (mv && at !== undefined && jobClause(f.text)) {
      const host = out[at];
      parts.get(at)?.push(f.text);
      out[at] = { ...host, claims: [...new Set([...(host.claims ?? []), ...(f.claims ?? [])])], squares: [...new Set([...host.squares, ...f.squares])], stakes: host.stakes == null && f.stakes == null ? host.stakes : Math.max(host.stakes ?? -Infinity, f.stakes ?? -Infinity) };
      continue;
    }
    if (mv && at === undefined) { lead.set(mv, out.length); parts.set(out.length, [f.text]); }
    out.push(f);
  }
  for (const [at, texts] of parts) if (texts.length > 1) out[at] = { ...out[at], text: renderMoveJobs(texts) };
  return out;
}

/** A FACT'S IDENTITY, read off its data — the computer, the kind, the move
 *  it refutes, its claims, its squares and its board — never its words: the
 *  decider decides on data (CLAUDE.md rule 3). */
export function factId(f: ReadFact): string {
  return [f.computer ?? '-', f.kind, f.move ?? '', [...(f.claims ?? [])].sort().join('|'), [...f.squares].sort().join(','), f.board?.key ?? '', (f.board?.path ?? []).join(' ')].join('#');
}
function sameFact(a: ReadFact, b: ReadFact): boolean { return a === b || factId(a) === factId(b); }

/** A fact's keys in the story's ledger: its claims, or — for a fact with
 *  none — its computer and the squares it is about (the same general line on
 *  the same squares is the same idea). */
function storyKeys(f: ReadFact): string[] {
  return f.claims?.length ? [...f.claims] : [`fact:${f.computer ?? f.kind}:${[...f.squares].sort().join(',')}`];
}

/** May this fact be said here at all: not a restatement, not on a withheld
 *  square, not said already. */
function sayable<F extends ReadFact>(f: F, ctx: ReadContext, out: readonly F[], sameClaim: (f: F) => boolean): boolean {
  return !f.restates && !f.squares.some((s) => ctx.withheld.includes(s)) && !out.some((o) => sameFact(o, f)) && !sameClaim(f);
}

/** WHAT A CONCLUSION RESTS ON, in the order it is heard after it.
 *  - The verdict's "but": each try it names, refuted by its own line, in the
 *    verdict's order — a refutation the ranking holds under the bar is not
 *    said (G4.5: the weights decide, no count).
 *  - The plan's details, then its "because": a plan fact about a piece the
 *    plan's line moves (the rook it lifts), then the target or their
 *    counterplay the line goes after (below). */
function supportsOf<F extends ReadFact>(kind: 'tries' | 'line', lead: F, facts: readonly F[], ctx: ReadContext, out: readonly F[], sameClaim: (f: F) => boolean): F[] {
  const got: F[] = [];
  const ok = (f: F): boolean => sayable(f, ctx, [...out, ...got], sameClaim) && !got.some((g) => (g.claims ?? []).some((c) => (f.claims ?? []).includes(c)));
  if (kind === 'tries') {
    for (const uci of lead.tries ?? []) {
      // A try the verdict NAMES is said with its reason (F2): the verdict has
      // already judged it worth naming, so no second bar holds its "but".
      const f = facts.find((x) => (x.move === uci || !!x.also?.includes(uci)) && x.kind === 'refuted' && ok(x));
      if (f) got.push(f);
    }
    return got;
  }
  if (!ctx.fen || !lead.line || lead.line.length === 0) return got;
  // The plan's own pieces: one the plan names AND its line moves.
  // (F2, Alekhine's gun: the plan's own STEPS — "Rc2, Rfc1 and then Rc3" —
  // are its detail for any piece the line moves, named by the lead or not.)
  const lineMoved = movedPieces(ctx.fen, lead.line);
  // …and the squares those pieces travel through on the line (the steps name
  // where the rooks go: c2, c1, c3).
  const moved = new Set([...lineMoved].filter((sq) => lead.squares.includes(sq)));
  lead.line.slice(0, 2 * LINE_MOVES).forEach((u, k) => { if (k % 2 === 0) lineMoved.add(u.slice(2, 4)); });
  // THE DETAILS: another plan fact about a piece this plan moves is the same
  // plan said in more detail (the rook's road for "the rook lift"), never a
  // rival plan about some other piece.
  for (const f of facts) {
    if (f === lead || !PLAN_KINDS.has(f.kind) || !ok(f)) continue;
    if (f.squares.some((sq) => moved.has(sq))) got.push(f);
  }
  const steps = facts.filter((f) => f !== lead && STEP_KINDS.has(f.kind) && f.squares.some((sq) => lineMoved.has(sq)));
  // THE BECAUSE: the target, or their counterplay, the plan's line goes after.
  for (const f of facts) {
    if (!BECAUSE_KINDS.has(f.kind) && f.computer !== 'pictureCounterplay') continue;
    if (!ok(f)) continue;
    if (lineReaches(ctx.fen, lead.line, f)) got.push(f);
  }
  // The plan's steps, last: what it does and why first, then how it goes.
  const step = steps.find((f) => ok(f));
  if (step && !got.some((g) => STEP_KINDS.has(g.kind))) got.push(step);
  return got;
}

const STEP_KINDS: ReadonlySet<string> = new Set(['plan-steps', 'siege']);
/** The plan kinds: a plan said again in more detail is one of these. */
const PLAN_KINDS: ReadonlySet<string> = new Set(['plan-now', 'siege', 'plan-steps', 'plan-race', 'structure-plan']);
/** The target kinds: a target is said as a plan's "because" — the first square
 *  each producer couples is the target itself. */
const BECAUSE_KINDS: ReadonlySet<string> = new Set(['priority', 'target', 'their-target']);
/** How many of the mover's moves down the line a link is looked for in (the
 *  picture's own reach, `pictureVerdict.LINK_MOVES`). */
const LINE_MOVES = 6;

function playOn(b: Chess, u: string): ReturnType<Chess['move']> | null {
  try { return b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
}

/** The squares the pieces the line moves stand on at the start (the mover's
 *  own, within its reach), on the read's board. */
function movedPieces(fen: string, line: readonly string[]): Set<string> {
  const out = new Set<string>();
  let b: Chess;
  try { b = new Chess(fen); } catch { return out; }
  const mover = b.turn();
  // Where each of the mover's pieces now stands → where it started.
  const origin = new Map<string, string>();
  let k = 0;
  for (const u of line) {
    const m = playOn(b, u);
    if (!m) break;
    if (m.color !== mover) continue;
    if (k >= LINE_MOVES) break;
    k += 1;
    const start = origin.get(m.from) ?? m.from;
    origin.delete(m.from);
    origin.set(m.to, start);
    out.add(start);
  }
  return out;
}

/** DOES THE PLAN'S LINE GO AFTER THIS? Computed on the boards of the line, by
 *  chess.js — never by the squares the two facts share:
 *  - a target: a move of the plan's side lands on it or newly bears on it (to
 *    win it, or to guard it when it is theirs to win);
 *  - their counterplay (the break, `pictureCounterplay`: the pawn's square,
 *    then the square it breaks to): before the break is played, a move of the
 *    plan's side lands on the break's square or newly bears on it. */
function lineReaches(fen: string, line: readonly string[], f: ReadFact): boolean {
  let b: Chess;
  try { b = new Chess(fen); } catch { return false; }
  const mover = b.turn();
  const breakMove = f.computer === 'pictureCounterplay' && f.squares.length >= 2 ? `${f.squares[0]}${f.squares[1]}` : null;
  const at = breakMove ? f.squares[1] : f.squares[0];
  if (!at) return false;
  let k = 0;
  for (const u of line) {
    if (breakMove && u.slice(0, 4) === breakMove) return false;
    const before = new Chess(b.fen());
    const m = playOn(b, u);
    if (!m) return false;
    if (m.color !== mover) continue;
    if (k >= LINE_MOVES) return false;
    k += 1;
    if (m.to === at) return true;
    try {
      if (b.attackers(at as Square, mover).includes(m.to) && !before.attackers(at as Square, mover).includes(m.from)) return true;
    } catch { return false; }
  }
  return false;
}

/** THE DETAIL OF EACH STEP (WO-PICTURE-01 P4, David 2026-11-19: "Those are
 *  important pieces of the puzzle that help form the details of the picture.
 *  Otherwise we just have an outline"). A step says ONE fact; every other fact
 *  about the SAME PIECE on the board read — the piece standing on a square the
 *  step's fact names — is its detail and is heard right after it. A shared
 *  empty square is not the same thing; a restatement, a withheld square and a
 *  fact already said stay out. Each detail is heard once, after the first step
 *  it belongs to. */
const DETAIL_ROLES: ReadonlySet<PictureRole> = new Set(['asset', 'weakness', 'board', 'threat']);

function withDetails<F extends ReadFact>(picked: readonly F[], all: readonly F[], ctx: ReadContext, argued: ReadonlySet<F>): F[] {
  if (!ctx.fen) return [...picked];
  let board: Chess;
  try { board = new Chess(ctx.fen); } catch { return [...picked]; }
  const pieceAt = (sq: string): string | null => {
    try { const p = board.get(sq as Square); return p ? `${p.color}${p.type}` : null; } catch { return null; }
  };
  const used = new Set<string>(picked.map(factId));
  // ONE IDEA ONCE, BY ITS CLAIM — for a detail as for a step: a fact sharing
  // a claim key with one said is that idea again ("The plan: plant a knight in
  // one of the holes" and "Their light squares are holes … Put a knight on
  // one" are one idea).
  const claimed = new Set<string>(picked.flatMap((f) => f.claims ?? []));
  // Only what a read says at all: a kind no step takes (a played-out line, a
  // score sheet) is never a read's detail either.
  const steps = ctx.puzzle ? PUZZLE_STEPS : READ_STEPS;
  const sayable = new Set(steps.flatMap((r) => r.kinds));
  const out: F[] = [];
  for (const lead of picked) {
    out.push(lead);
    if (argued.has(lead)) continue;
    const pieces = new Set(lead.squares.filter((sq) => pieceAt(sq) !== null));
    if (pieces.size === 0) continue;
    for (const f of all) {
      if (used.has(factId(f)) || f.restates || !sayable.has(f.kind)) continue;
      if ((f.claims ?? []).some((c) => claimed.has(c))) continue;
      // A detail DESCRIBES the piece; it is never a second conclusion (another
      // plan, another try, another verdict, another move's job) — the step
      // already chose its one conclusion, and a rival plan heard as its
      // "detail" contradicts it (rook lift #2: the lift, then "break with d5",
      // the try the same read had just refuted).
      const role = f.computer ? (PICTURE_ROLE as Record<string, PictureRole | undefined>)[f.computer] : undefined;
      if (!role || !DETAIL_ROLES.has(role)) continue;
      if (f.kind === 'must-defend' && !bestAnswers(f, ctx)) continue;
      if (f.squares.some((s) => ctx.withheld.includes(s))) continue;
      if (!f.squares.some((sq) => pieces.has(sq))) continue;
      used.add(factId(f));
      for (const c of f.claims ?? []) claimed.add(c);
      out.push(f);
    }
  }
  return out;
}

/** THE HABIT THAT CLOSES THE READ: on a puzzle, the attacking scan; else the
 *  routine that finds this board's point next time — "their threat first"
 *  only when the board proves their threat (a must-defend) and you have no
 *  shot of your own, the forcing scan when you have one. Nothing on a withheld
 *  board that is not a winning shot. */
function habitOf(facts: readonly ReadFact[], ctx: ReadContext): { id: string; text: string } | null {
  const bestForcing = ((): boolean | null => {
    if (!ctx.fen || ctx.best.length < 2) return null;
    try { const m = new Chess(ctx.fen).move({ from: ctx.best[0], to: ctx.best[1], promotion: ctx.bestPromotion ?? 'q' }); return !!m.captured || /[+#]/.test(m.san); } catch { return null; }
  })();
  // A puzzle still being solved keeps CCT: a habit that says "quiet" hands over the answer's kind.
  if (ctx.puzzle) { const r = readHabit({ studentShot: true, bestForcing: true }); return r ? { id: r.habit, text: r.text } : null; }
  if (ctx.withheld.length) return null;
  const real = facts.some((f) => f.kind === 'must-defend' && bestAnswers(f, ctx));
  // Their threat's habit is the live beat's, with the threat named.
  if (real && !ctx.studentShot) { const t = facts.find((f) => f.kind === 'opp-think')?.text; return t ? { id: 'opp-think', text: t } : null; }
  const r = readHabit({ studentShot: ctx.studentShot, bestForcing });
  return r ? { id: r.habit, text: r.text } : null;
}

/** Does the best move answer the threat on this fact's square — the piece
 *  steps away, takes an attacker, or gains a guard? */
function bestAnswers(f: ReadFact, ctx: ReadContext): boolean {
  const fen = ctx.fen;
  if (!fen || ctx.best.length < 2) return false;
  const [from, to] = ctx.best;
  try {
    const b = new Chess(fen);
    const me = b.turn();
    const them = me === 'w' ? 'b' : 'w';
    return f.squares.some((sq) => {
      const victim = b.get(sq as Square);
      if (!victim || victim.color !== me) return false;
      if (from === sq) return true;
      if (b.attackers(sq as Square, them).includes(to as Square)) return true;
      const guardsBefore = b.attackers(sq as Square, me).length;
      const after = new Chess(fen);
      after.move({ from, to, promotion: 'q' });
      // A CHECK answers it too: they must meet the check first, and the
      // threat is met with tempo (0LeQy Rg1+: their queen on b6 hits yours).
      if (after.inCheck()) return true;
      return after.attackers(sq as Square, me).length > guardsBefore;
    });
  } catch { return false; }
}
