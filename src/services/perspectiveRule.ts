// perspectiveRule — ONE STANDARD, ONE STRING (David 2026-08-28: "Then yes. Lock
// in and make changes across entire app.").
//
// The perspective law was written into FIVE prompts in five different wordings
// — `openingGenerator` (the narration prompt), `coachPrompts` (×3) and
// `envelope` — which is the duplicated-constant drift CLAUDE.md warns about,
// and it rotted exactly the way that rule predicts. Two holes, both found by
// reading a real prod lesson (2026-09-17, a Scandinavian taught to a BLACK
// student):
//
//  1. THE RULE ITSELF PERMITTED THE DEFECT. Every copy banned "we / our / us"
//     and stopped there, so the coach said "White takes, and for the moment
//     HE's up a point of material", "the squares around HIS e-pawn", "HE has to
//     spend a move on this pawn's health" — obeying the rule as written. The
//     gate (`perspectiveVoice.test.ts`) scans for we/our, so it passed too.
//     A player's pronouns are never stated, so a player is "they".
//  2. THREE OF THE FOUR GENERATOR PROMPTS CARRIED NO RULE AT ALL. The drill,
//     find-the-move and punish prompts each declare "Student plays: <side>" and
//     then said nothing about how to address them.
//
// Three modes, because the doctrine sanctions exactly three seats — and a
// `Record` over the union, so a FOURTH mode fails to compile until someone
// decides its answer rather than silently inheriting one.

/** Which of the three sanctioned perspectives a surface speaks in. */
export type PerspectiveMode =
  /** The ordinary case: the coach talks to a student about their own game. */
  | 'student'
  /** `/coach/teach` guided play — the coach IS the opponent, so its own pieces
   *  are "I / my" (you cannot call yourself "they"). CLAUDE.md exception 1. */
  | 'coach-is-opponent'
  /** A pure spectator model game where the student plays neither side.
   *  CLAUDE.md exception 2. */
  | 'spectator';

/** The clause every mode shares — the one the five copies were all missing. */
const NO_GENDERED = 'NEVER "he / him / his" for a player: their pronouns are not '
  + 'stated and guessing them is wrong even when the phrasing reads naturally — '
  + 'a player is "they / their".';

const RULES: Record<PerspectiveMode, (studentSide?: string) => string> = {
  student: (studentSide) => 'PERSPECTIVE — ONE STANDARD, NO EXCEPTIONS (David 2026-08-28). '
    + (studentSide ? `The student is playing as ${studentSide}. ` : '')
    + 'The student\'s OWN side is "you / your" ("your knight eyes d5", "you take on e5"); '
    + 'the OPPONENT is "they / their" ("they answer …e6", "their bishop pins your knight"). '
    + 'NEVER "we / our / us" — it is ambiguous about whose piece it is; a live tester could not '
    + `tell if the coach meant them or the opponent. ${NO_GENDERED} `
    + 'Every pawn, piece and square you name belongs to exactly one side — '
    + `"your" if it is ${studentSide ?? "the student"}'s, "their" if it is the opponent's. `
    + 'Get this right on every sentence.',

  'coach-is-opponent': () => 'PERSPECTIVE — ONE STANDARD, NO EXCEPTIONS (David 2026-08-28). '
    + 'You are the student\'s opponent in this game, so your OWN pieces are "I / my" — '
    + 'never "they", because you cannot call yourself a third party. The student\'s pieces are '
    + `"you / your". NEVER "we / our / us" — it blurs whose piece it is. ${NO_GENDERED}`,

  spectator: () => 'PERSPECTIVE — ONE STANDARD, NO EXCEPTIONS (David 2026-08-28). '
    + 'The student plays NEITHER side here, so name the sides "White" and "Black". '
    + `Never "you / your" (it is not their game) and never "we / our / us". ${NO_GENDERED}`,
};

/**
 * The perspective rule for a prompt. `studentSide` is used only by the
 * `'student'` mode, where naming the colour is what makes "your" resolvable.
 */
export function perspectiveRule(mode: PerspectiveMode, studentSide?: 'white' | 'black'): string {
  return RULES[mode](studentSide);
}
