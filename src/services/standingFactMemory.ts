/**
 * standingFactMemory — the say-once set that FORGETS when the board goes
 * backwards. One implementation (the computer-unification map, Phase 4 —
 * docs/plans/2026-09-17-computer-unification.md).
 *
 * A STANDING fact ("your d5 pawn is backward", "their bishop is buried") is
 * true for many plies, so a coach that recomputes it every ply opens every beat
 * with the same sentence. Every surface that speaks standing facts therefore
 * keeps a say-once set — and every one of them also has to decide when to
 * FORGET it, because a set that never clears makes the coach mute for the rest
 * of a session after one mention.
 *
 * 🚨 WHY THIS EXISTS AS A MODULE. The rule was implemented TWICE, with two ref
 * names, in two surfaces:
 *
 *   usePhaseNarration.ts  `if (fullmove < lastFullmoveRef.current) saidRef.current = new Set()`
 *   CoachTeachPage.tsx    `if (lessonFullmove < lastLessonFullmoveRef.current) saidStandingRef.current = new Set()`
 *
 * The page's own comment said "Same reasoning as the phase hook" — the author
 * knew it was a copy. That is the divergence this phase exists to close: two
 * surfaces of one coach, each carrying its own copy of a shared rule, free to
 * drift the moment one is tuned.
 *
 * THE RULE, stated once. The fullmove number going DOWN is the honest signal
 * that this is a different game — or at least a rewound one. Neither surface
 * has a game id (both are mounted per session), so a second game inside one
 * mount would otherwise inherit the first game's silence. Rewinding is the safe
 * direction to be wrong in: forgetting makes the coach repeat itself, while
 * suppressing makes it mute for a reason nobody can trace. So the doubt
 * resolves toward forgetting.
 */
export interface StandingFactMemory {
  /**
   * Note the board's fullmove number. Clears the set when the board has gone
   * BACKWARDS (a new or rewound game). Returns true when it forgot, so a caller
   * can audit the transition.
   */
  observe(fullmove: number): boolean;
  /** The say-once set, for passing as `alreadySaid`. */
  readonly said: Set<string>;
  /** Mark a fact spoken. */
  remember(text: string): void;
  /** Mark several spoken (the `pf.remember` shape). */
  rememberAll(texts: Iterable<string>): void;
}

/** Read a FEN's fullmove number, defaulting to 1 on anything unparseable. */
export function fullmoveOf(fen: string): number {
  return Number.parseInt(fen.split(' ')[5] ?? '1', 10) || 1;
}

export function createStandingFactMemory(): StandingFactMemory {
  let lastFullmove = 0;
  let said = new Set<string>();
  return {
    observe(fullmove: number): boolean {
      const forgot = fullmove < lastFullmove;
      if (forgot) said = new Set();
      lastFullmove = fullmove;
      return forgot;
    },
    get said(): Set<string> { return said; },
    remember(text: string): void { said.add(text); },
    rememberAll(texts: Iterable<string>): void { for (const t of texts) said.add(t); },
  };
}
