/**
 * narrationBudget — how much AIRTIME a single ply is worth.
 *
 * David 2026-08-15, after seeing one ply reach 29 usable notes: "this is where
 * the gate matrix will help." It is the right instrument, and it is a different
 * instrument from the one that was just removed.
 *
 * ── WHY THIS IS NOT THE CAP THAT WAS JUST DELETED ───────────────────────────
 *
 * The old rule was ONE NOTE PER PLY, and it was indefensible: a count says
 * nothing about how long a ply speaks. Two notes of eleven words each is a
 * normal sentence; one note of a hundred and forty is a lecture. The cap cut
 * the first case and waved the second through. David's standing instruction
 * stands — "IF IT ADDS SOMETHING NEW IT GETS SPOKEN" — and nothing here
 * decides whether a note is TRUE, RELEVANT, or NEW. Those are `notesAtPosition`
 * and `addsSomething`, upstream, and they are untouched.
 *
 * What this decides is only how much of an already-qualified queue fits in one
 * breath, and it decides it in WORDS, which is what a student actually
 * experiences.
 *
 * ── THE NUMBERS ARE MEASURED, NOT PICKED ────────────────────────────────────
 *
 * Over the 1,310-ply repertoire walk with the count cap removed
 * (`audit-reports/narration-volume.json`), a speaking ply runs:
 *
 *     p50   47 words   ~19s      p90  153 words   ~61s
 *     p75   94 words   ~38s      max  787 words   ~5m15s   (Nimzo, ply 6)
 *
 * Five minutes of narration on move six is not teaching, it is a filibuster —
 * and it is the tail, not the norm: 766 of 1,310 plies have nothing to say at
 * all. So the budget is set to sit ABOVE the median and bite only the tail.
 * `routine` at 70 words leaves the median ply completely untouched.
 *
 * ── THE TWO RULES THAT KEEP IT HONEST ───────────────────────────────────────
 *
 * 1. THE FIRST NOTE ALWAYS SPEAKS, IN FULL. A budget that truncates the best
 *    teaching at this position mid-thought is worse than a long line. The
 *    budget governs STACKING — how many further notes join — never whether the
 *    primary one is heard. A single note is bounded by the corpus gate anyway
 *    (600 + 400 + 400 chars ≈ 230 words), so the 787-word plies are four or
 *    more notes deep and the budget reaches them.
 *
 * 2. IT CUTS AT A NOTE BOUNDARY, NEVER INSIDE ONE. A note that will not fit is
 *    SKIPPED and the queue keeps going, so one 200-word note cannot silence
 *    three 15-word ones behind it. Nothing is ever half-spoken.
 *
 * ── VERBOSITY ───────────────────────────────────────────────────────────────
 *
 * `brief` is G5's hard contract (2 sentences / 30 words) and is enforced
 * downstream by `applyBriefVoiceCap` regardless of what is generated here;
 * matching it means the clip has nothing to do. `silent` returns 0 — no note
 * stacks — though the voice layer short-circuits before this anyway.
 *
 * NOTE ON THE GENERATOR: walkthrough beats BAKE at generation time, when the
 * student's verbosity setting is not knowable, so `openingGenerator` passes
 * `full` and lets the speak-time gates do their job. Live surfaces that know
 * the setting should pass it.
 */

export type NarrationPhase = 'opening' | 'middlegame' | 'endgame';

/**
 * How much this ply is worth stopping on.
 *
 * `routine` — a developing move on a known path. Most plies.
 * `decision` — the line branches here; several named openings or plans diverge,
 *              and the student is about to be asked to choose.
 * `keystone` — the moment the lesson exists for: the tabiya, the point where
 *              the opening hands off to the middlegame plan, the refutation.
 *
 * The CALLER computes this from the board and the DB (G0 — code decides, the
 * model only phrases), which is why it arrives as a value rather than being
 * derived here from prose.
 */
export type PlyImportance = 'routine' | 'decision' | 'keystone';

export interface NarrationVerbosityContext {
  verbosity: 'silent' | 'brief' | 'full';
  phase: NarrationPhase;
  importance: PlyImportance;
}

/** Words per importance tier, at `full`. */
const FULL_BUDGET: Record<PlyImportance, number> = {
  routine: 70,
  decision: 140,
  keystone: 220,
};

/**
 * Phase multipliers.
 *
 * The opening is the baseline — it is where the corpus is densest and where a
 * student is being walked move by move. The middlegame gets more room because
 * that is where plans live and a plan does not fit in a clause; the payoff of
 * the whole lesson is the transition, and cutting it to the same length as a
 * developing move inverts the emphasis. The endgame gets less: endgame teaching
 * is concrete technique — the square, the opposition, the passer — and prose
 * there is usually padding around a fact.
 */
const PHASE_SCALE: Record<NarrationPhase, number> = {
  opening: 1,
  middlegame: 1.3,
  endgame: 0.8,
};

/** G5: brief is 2 sentences / 30 words, and it is a contract, not a hint. */
const BRIEF_BUDGET = 30;

export function narrationWordBudget(ctx: NarrationVerbosityContext): number {
  if (ctx.verbosity === 'silent') return 0;
  if (ctx.verbosity === 'brief') return BRIEF_BUDGET;
  return Math.round(FULL_BUDGET[ctx.importance] * PHASE_SCALE[ctx.phase]);
}

const wordCount = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Fit an ordered queue of already-qualified notes into the ply's budget.
 *
 * Order is RANK — the caller hands these over best-first — so a note is only
 * ever skipped for not fitting, never reordered to pack the budget tighter.
 * Packing would put a weaker note ahead of a stronger one for the sake of
 * arithmetic, which is the wrong trade in a teaching line.
 */
export function fitToBudget(parts: string[], budget: number): string[] {
  const usable = parts.filter((p) => p.trim().length > 0);
  if (usable.length === 0) return [];
  // Rule 1: the first note is not subject to the budget.
  const kept = [usable[0]];
  let spent = wordCount(usable[0]);
  for (const part of usable.slice(1)) {
    const w = wordCount(part);
    if (spent + w > budget) continue; // Rule 2: skip, never clip, keep looking.
    kept.push(part);
    spent += w;
  }
  return kept;
}

/** Queens gone or the board thinned out — the same test `noteLineGuard` uses to
 *  decide whether endgame teaching applies, kept in step with it deliberately. */
function looksLikeEndgame(fen: string): boolean {
  const placement = fen.split(' ')[0] ?? '';
  const pieces = placement.replace(/[^a-zA-Z]/g, '');
  const queens = (placement.match(/[qQ]/g) ?? []).length;
  return queens === 0 || pieces.length <= 14;
}

/**
 * The board's phase, from the board — never from a note's own `phase` tag,
 * which describes what the note TEACHES rather than where it is being spoken.
 *
 * The 20-ply opening boundary matches `notePhaseMismatchesBoard`'s fallback, so
 * a note's phase gate and its airtime agree about which phase this is.
 */
export function boardPhase(fen: string | undefined, historyPlies: number): NarrationPhase {
  if (fen && looksLikeEndgame(fen)) return 'endgame';
  return historyPlies < 20 ? 'opening' : 'middlegame';
}
