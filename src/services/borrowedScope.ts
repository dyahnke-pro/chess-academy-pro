/**
 * borrowedScope — may this borrowed note be spoken over a board it was not
 * written about?
 *
 * A note reached by STRUCTURE or CONCEPT transfer is, by construction, about a
 * different position. That is fine for an idea — "the bishop pair wants open
 * lines" survives the move to another board — and impossible for a CONTINUATION.
 * "If the queen recaptures, the rook pins her to the king" is a claim about a
 * specific sequence in a specific game, and no amount of framing makes it true
 * here.
 *
 * WHY THIS EXISTS. A full 20-move game driven on prod (David 2026-08-18: *"Play
 * a game under learn and find all irrelevant computed phrases and cut them
 * out"*) spoke ELEVEN borrowed notes, one on nearly every move, and every single
 * one narrated another game's moves:
 *
 *   "The knight lunges in desperation, but the bishop simply takes it. When the
 *    rook recaptures, the pawn falls…"
 *   "When a trade is offered here, take it. If the queen recaptures, the rook
 *    pins her to the king and wins her outright."
 *   "Capturing it wins material and trades off Black's most active piece."
 *
 * None of it happened, none of it was on offer, and all of it was introduced
 * with "As a rule in these positions:" — a frame that turns position-specific
 * commentary into a false generalisation and, because it names no square, makes
 * it unfalsifiable by every guard we have. The board grader has nothing to
 * check; `configurationClaims` has no structure to settle.
 *
 * 🔒 SCOPED TO `borrowed` ON PURPOSE. The corpus is 90% of what this coach says
 * (CLAUDE.md) and a scope guard that fires nine times in ten is a silencer, not
 * a guard — that exact mistake is recorded in `voicePackage`. This does NOT
 * touch position-keyed or baked notes, which were written about the board they
 * are spoken over and may narrate its moves freely. It only refuses the
 * transferred tier the one thing transfer cannot carry.
 */

/** Move-sequence language: a claim about what happens next, not what IS. */
const CONTINUATION: ReadonlyArray<{ re: RegExp; why: string }> = [
  // "If the queen recaptures…", "When the rook takes…", "Once that knight leaves…"
  {
    re: /\b(?:if|when|once|after|unless)\s+(?:the\s+|a\s+|an\s+|that\s+|his\s+|her\s+|their\s+)?(?:queen|king|rook|bishop|knight|pawn|white|black|he|she|it|they)\b[^.;]{0,48}?\b(?:takes|captures?|recaptures?|plays|checks|moves|pushes|declines|accepts|leaves|retreats|drops|falls)\b/i,
    why: 'narrates a continuation',
  },
  // "just take it", "simply takes it", "capturing it wins…"
  { re: /\b(?:just\s+|simply\s+)?(?:take|takes|capture|captures|recapture|recaptures)\s+(?:it|him|her|there|back)\b/i, why: 'narrates a capture' },
  { re: /\b(?:capturing|taking|recapturing)\s+(?:it|him|her|there|on\s+[a-h][1-8])\b/i, why: 'narrates a capture' },
  // "the trade surrenders…", "the pawn sacrifice buys…", "the prize after the capture"
  { re: /\b(?:the|that|this)\s+(?:trade|exchange|capture|sacrifice|recapture)\b/i, why: 'names a specific trade' },
  // "Trading those bishops is safe." A gerund with a determiner points at
  // pieces on one board — the general form has no "those".
  { re: /\b(?:trading|exchanging|capturing|sacrificing|taking)\s+(?:those|these|that|this|the|off\s+(?:the|his|her|their))\b/i, why: 'names a specific trade' },
  // "The bishop takes, and the king steps aside." A named piece with a capture
  // verb and no object at all is still a move being narrated — the version with
  // an object is caught above, and this one slipped through on a comma.
  { re: /\b(?:the|a|an|his|her|their|that|this)\s+(?:queen|king|rook|bishop|knight|pawn)\s+(?:takes|captures|recaptures|takes off)\b/i, why: 'narrates a capture' },
  // "the bishop strikes, and the queen follows", "the pawn falls"
  { re: /\b(?:strikes|falls|wins (?:her|him|it) outright|wins material)\b/i, why: 'narrates an outcome' },
  // "White cannot develop without losing a pawn" — a verdict on one position.
  { re: /\b(?:white|black)\s+(?:cannot|can't|must|has to|is left with|is forced)\b/i, why: 'passes a verdict on one position' },
];

/**
 * Why this borrowed note may not be spoken here, or null when it may.
 *
 * Deliberately narrow, in the spirit of `configurationClaims`: a guard that
 * guesses is worse than one that admits its scope. Anything that reads as a
 * standing idea — "the bishop pair wants open lines", "a knight on an outpost
 * no pawn can challenge is worth a bishop" — carries no continuation and passes.
 */
export function borrowedNoteIsOutOfScope(text: string): string | null {
  for (const c of CONTINUATION) if (c.re.test(text)) return c.why;
  return null;
}
