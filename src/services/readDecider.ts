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
import { Chess, type Square } from 'chess.js';
import weightTable from '../data/read-decider-weights.json';
import { readHabit, READ_HABIT } from './methodBeat';

/** Where a board fact came from: the board's own reads, a tempting move
 *  refuted, or what the engine's best move does. */
export type ReadFactFrom = 'position' | 'tempting' | 'bestMove';

export interface ReadFact {
  from: ReadFactFrom;
  kind: string;
  text: string;
  /** The computer that made it (catalog name), where the read knows it. */
  computer?: string;
  /** REQUIRED: the squares the fact is about, coupled by its producer (G4.5.1:
   *  never scraped back out of the words). Empty for a fact about no square. */
  squares: readonly string[];
  /** What rides on it (`factStakes.stakeValue`), where its producer staked it. */
  stakes?: number | null;
  /** It only restates what the board shows (the composer's quiet-move rule). */
  restates?: boolean;
}

export type ReadStep = 'verdict' | 'character' | 'priority' | 'their-move' | 'their-plan' | 'best-move' | 'tempting' | 'their-try' | 'plan' | 'concept' | 'second-front' | 'mate-pattern';

/** Whether the game is still to be decided: a mate or three pawns either way
 *  is decided (Danya's plans fall silent there; conversion and tactics speak). */
export type ReadBucket = 'decided' | 'open';

export interface ReadContext {
  /** The board read (null where the caller has only the facts). */
  fen: string | null;
  bucket: ReadBucket;
  /** The best move's two squares (empty when unread). */
  best: readonly string[];
  /** Squares a read must not touch: a puzzle's answer, still being solved. */
  withheld: readonly string[];
  /** The answer is withheld and the side to move is winning (a puzzle). */
  puzzle: boolean;
  /** A tactic on the board for the student, to play now. */
  studentShot: boolean;
  /** The one door ranks this a deciding moment (only move / critical). */
  decidingMoment: boolean;
}

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
  decidingMoment: boolean;
}): ReadContext {
  const sign = i.fen.split(' ')[1] === 'b' ? -1 : 1;
  const mate = i.top?.mate ?? null;
  const cp = i.top && mate == null ? i.top.evaluation * sign : null;
  const decided = mate != null || (cp != null && Math.abs(cp) >= DECIDED_CP);
  const moverWins = mate != null ? mate * sign > 0 : cp != null && cp >= PUZZLE_WIN_CP;
  return {
    fen: i.fen,
    bucket: decided ? 'decided' : 'open',
    best: i.bestUci ? [i.bestUci.slice(0, 2), i.bestUci.slice(2, 4)] : [],
    withheld: i.withheld ?? [],
    puzzle: !!i.withheld && moverWins,
    studentShot: i.studentShot,
    decidingMoment: i.decidingMoment,
  };
}

/** The kinds each step may say. `from` narrows a step to sources (with
 *  `positionKinds` the board's own pointers it also takes); `onTarget` takes a
 *  kind only when it names a square of the story's target; `sayOnce` steps
 *  describe the board and are said only when they name a square not yet named. */
interface StepRow { step: ReadStep; kinds: readonly string[]; from?: readonly ReadFactFrom[]; positionKinds?: readonly string[]; onTarget?: readonly string[]; sayOnce?: true }

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
    kinds: ['key-moment', 'timing', 'move-order', 'not-yet', 'checkmate', 'sac-why', 'aspect-threat', 'aspect-tactic-lands', 'aspect-wins', 'stop', 'stopped', 'move-job', 'aspect-tactic-set-up', 'board-teacher', 'technique', 'fundamental', 'king-read', 'pawn-break', 'trade', 'provoke', 'aspect-opens-king', 'count', 'contrast', 'nugget', 'trigger'],
    // What the best move does — and the board's own pointers at it.
    from: ['bestMove'], positionKinds: ['timing', 'move-order', 'not-yet', 'king-read'],
  },
  { step: 'tempting', kinds: ['refuted', 'refuted-positional', 'deliberation'] },
  { step: 'their-try', kinds: ['their-refuted'] },
  { step: 'plan', kinds: ['siege', 'plan-steps', 'plan-race', 'structure-plan'], sayOnce: true },
  // The concept the board shows. A played-out `line` is never a read's step:
  // it is said move by move, a score sheet (the voice rule).
  { step: 'concept', kinds: ['concept', 'speedrun-read'], sayOnce: true },
  { step: 'second-front', kinds: ['switch-wing'], onTarget: ['switch-wing'], sayOnce: true },
];

/** A puzzle still being solved: the verdict, the mate's pattern, a concept
 *  about this board. The winning line answers their threats and plans. */
export const PUZZLE_STEPS: readonly StepRow[] = [
  { step: 'verdict', kinds: ['compensation', 'convert', 'standing', 'eval'] },
  { step: 'mate-pattern', kinds: ['mate-pattern'] },
  { step: 'concept', kinds: ['concept', 'king-read'], sayOnce: true },
];

interface WeightTable { bar: number; prior: number; weights: Record<string, number> }
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
export function decideRead<F extends ReadFact>(facts: readonly F[], ctx: ReadContext): { facts: F[]; habit: string | null } {
  const out: F[] = [];
  let target = new Set<string>();
  const named = new Set<string>();
  const onTarget = (f: F): boolean => f.squares.some((s) => target.has(s));
  const steps = ctx.puzzle ? PUZZLE_STEPS : READ_STEPS;
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
      && !out.some((o) => o.text === x.text)
      // ONE IDEA ONCE: a story line whose every square was named adds nothing.
      && (!row.sayOnce || x.squares.length === 0 || x.squares.some((sq) => !named.has(sq))));
    let pick: F | null = null;
    let pickW = -Infinity;
    for (const x of candidates) {
      // The mate's pattern is the puzzle's lesson: said whenever it is found.
      const w = x.kind === 'mate-pattern' ? 1 : readWeight(x, ctx) + (onTarget(x) ? ON_TARGET : 0);
      if (w < TABLE.bar) continue;
      if (w > pickW || (w === pickW && (x.stakes ?? -1) > (pick?.stakes ?? -1))) { pick = x; pickW = w; }
    }
    if (!pick) continue;
    out.push(pick);
    for (const sq of pick.squares) named.add(sq);
    if (row.step === 'priority') target = new Set(pick.squares);
  }
  return { facts: out, habit: habitOf(facts, ctx) };
}

/** THE HABIT THAT CLOSES THE READ: on a puzzle, the attacking scan; else the
 *  routine that finds this board's point next time — "their threat first"
 *  only when the board proves their threat (a must-defend) and you have no
 *  shot of your own. Nothing on a withheld board that is not a winning shot. */
function habitOf(facts: readonly ReadFact[], ctx: ReadContext): string | null {
  if (ctx.puzzle) return READ_HABIT['forcing-scan'];
  if (ctx.withheld.length) return null;
  const real = facts.some((f) => f.kind === 'must-defend' && bestAnswers(f, ctx));
  // Their threat's habit is the live beat's, with the threat named.
  if (real && !ctx.studentShot) return facts.find((f) => f.kind === 'opp-think')?.text ?? null;
  return readHabit({ studentShot: ctx.studentShot, theirThreat: false, decidingMoment: ctx.decidingMoment })?.text ?? null;
}

/** Does the best move answer the threat on this fact's square — the piece
 *  steps away, takes an attacker, or gains a guard? */
function bestAnswers(f: ReadFact, ctx: ReadContext): boolean {
  if (!ctx.fen || ctx.best.length < 2) return false;
  const [from, to] = ctx.best;
  try {
    const b = new Chess(ctx.fen);
    const me = b.turn();
    const them = me === 'w' ? 'b' : 'w';
    return f.squares.some((sq) => {
      const victim = b.get(sq as Square);
      if (!victim || victim.color !== me) return false;
      if (from === sq) return true;
      if (b.attackers(sq as Square, them).includes(to as Square)) return true;
      const guardsBefore = b.attackers(sq as Square, me).length;
      const after = new Chess(ctx.fen!);
      after.move({ from, to, promotion: 'q' });
      return after.attackers(sq as Square, me).length > guardsBefore;
    });
  } catch { return false; }
}
