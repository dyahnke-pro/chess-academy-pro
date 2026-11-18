/**
 * THE READ DECIDER — which of a board's facts "Read this position" says, in
 * the order Danya reads a board (David 2026-11-18: "strip the decider so its
 * bare, and just have it chose the facts that we compute in this order").
 *
 * His order, read off his own written reads of positions, one board at a time
 * (Korchnoi–Salov, Alekhine–Nimzowitsch, Karpov–Spassky):
 *   1. the story: who stands better, what kind of position it is, and the
 *      reason — the target the board turns on; then what their last move does
 *      and what they are after;
 *   2. the calm answer: the best move and what it does — to that target when
 *      it does something to it;
 *   3. the tempting move, and the reply that refutes it — or what it gives
 *      up — and their best try after your move, refuted;
 *   4. the plan, in the moves that carry it out — or the plan against the
 *      story's target, when no line shows its moves — and the second front
 *      when the target holds;
 *   5. the habit that catches it — said by the composer after the read
 *      (`methodBeat.readHabit`), so it is not a step here.
 * Each step says at most ONE fact: the first of its kinds, in the order listed
 * (the most decisive kind first). A step with no fact says nothing. Pure.
 */

/** Where a board fact came from: the board's own reads, a tempting move
 *  refuted, or what the engine's best move does. */
export type ReadFactFrom = 'position' | 'tempting' | 'bestMove';

export interface ReadFact {
  from: ReadFactFrom;
  kind: string;
  text: string;
}

export type ReadStep = 'verdict' | 'character' | 'priority' | 'their-move' | 'their-plan' | 'best-move' | 'tempting' | 'their-try' | 'plan' | 'second-front';

/** The kinds that answer each step, the most decisive first. `from` narrows a
 *  kind to one source where the same kind is made by more than one;
 *  `onTarget` takes the kind only when it names a square the story named. */
interface StepKind { kind: string; from?: ReadFactFrom; onTarget?: true }

export const READ_STEPS: ReadonlyArray<{ step: ReadStep; kinds: readonly StepKind[]; preferTarget?: true }> = [
  // The standing; compensation and "convert" say the same standing with the
  // reason a player most needs, so they come first.
  { step: 'verdict', kinds: [{ kind: 'compensation' }, { kind: 'convert' }, { kind: 'eval' }, { kind: 'standing' }] },
  // What kind of position it is, and so what kind of play it asks for.
  { step: 'character', kinds: [{ kind: 'character' }] },
  // The reason under the standing: what the board turns on (Karpov–Spassky:
  // the isolated d-pawn, and the move that aims at it).
  { step: 'priority', kinds: [{ kind: 'priority' }, { kind: 'target' }] },
  { step: 'their-move', kinds: [{ kind: 'opp-think' }, { kind: 'must-defend' }] },
  // What they are after over the next moves: your pawn they can win, or the
  // plan their engine line shows.
  { step: 'their-plan', kinds: [{ kind: 'their-target' }, { kind: 'their-plan' }] },
  {
    step: 'best-move',
    // What the move does to the story's target outranks its other jobs (Rd3
    // "presses down the d-file at their pawn on d5" over "adds a second guard
    // to your bishop on c3").
    preferTarget: true,
    kinds: [
      // The only move, and the move-order reads, say why THIS move and why now.
      { kind: 'key-moment', from: 'bestMove' }, { kind: 'timing' }, { kind: 'move-order' }, { kind: 'not-yet' },
      // Then what the best move itself does, the sharpest job first.
      { kind: 'checkmate' }, { kind: 'sac-why' }, { kind: 'aspect-threat' }, { kind: 'aspect-tactic-lands' },
      { kind: 'aspect-wins' }, { kind: 'stop' }, { kind: 'stopped' }, { kind: 'move-job', from: 'bestMove' },
      { kind: 'aspect-tactic-set-up' }, { kind: 'board-teacher' }, { kind: 'technique' }, { kind: 'fundamental', from: 'bestMove' },
      // Last, the board's own pointer at the move (on a puzzle still being
      // solved, the only one left: it names the job, not the move).
      { kind: 'king-read', from: 'position' },
    ],
  },
  { step: 'tempting', kinds: [{ kind: 'refuted' }, { kind: 'refuted-positional' }, { kind: 'deliberation' }] },
  // Their best try after your move, refuted (his "…Nd8 would have led to
  // immediate calamity: Black cannot stop the rook getting to c7").
  { step: 'their-try', kinds: [{ kind: 'their-refuted' }] },
  // The plan, concrete: the siege on the target, the moves that carry it out,
  // or the race for a square; else the structure plan aimed at the story's
  // target. Structure plans that name no target of the story are never said.
  { step: 'plan', kinds: [{ kind: 'siege' }, { kind: 'plan-steps' }, { kind: 'plan-race' }, { kind: 'structure-plan', onTarget: true }] },
  // The second front, when the target holds and ties their pieces down.
  { step: 'second-front', kinds: [{ kind: 'switch-wing', onTarget: true }] },
];

const squaresOf = (text: string): Set<string> => new Set(text.match(/\b[a-h][1-8]\b/g) ?? []);

/** The steps that describe the board rather than a move: said only when they
 *  name a square the read has not named yet. */
const SAY_ONCE: ReadonlySet<ReadStep> = new Set<ReadStep>(['priority', 'their-move', 'their-plan', 'second-front']);

/** The read: one fact per step, in his order. */
export function decideRead<F extends ReadFact>(facts: readonly F[]): F[] {
  const out: F[] = [];
  // The story's target: the squares the reason under the standing names.
  let target = new Set<string>();
  const named = new Set<string>();
  const onTarget = (f: F): boolean => [...squaresOf(f.text)].some((s) => target.has(s));
  for (const { step, kinds, preferTarget } of READ_STEPS) {
    const candidates = kinds.flatMap((k) => facts.filter((x) =>
      x.kind === k.kind && (!k.from || x.from === k.from) && (!k.onTarget || onTarget(x)) && !out.some((o) => o.text === x.text)));
    // ONE IDEA ONCE (Danya never says the same square twice in a read): a
    // story line whose every square was already named adds nothing.
    const fresh = SAY_ONCE.has(step) ? candidates.filter((x) => { const q = [...squaresOf(x.text)]; return q.length === 0 || q.some((sq) => !named.has(sq)); }) : candidates;
    const f = (preferTarget ? fresh.find(onTarget) : undefined) ?? fresh[0];
    if (!f) continue;
    out.push(f);
    for (const sq of squaresOf(f.text)) named.add(sq);
    if (step === 'priority') target = squaresOf(f.text);
  }
  return out;
}
