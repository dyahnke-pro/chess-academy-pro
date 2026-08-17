/**
 * teachStageRouting — which stage a typed (or picker-tapped) request asks for,
 * and what opening name survives the verb.
 *
 * Lifted out of `CoachTeachPage` so the picker's contract can be TESTED. Every
 * picker action builds a phrase and submits it as if the student had typed it,
 * which keeps the picker purely additive — but it also means a picker is only
 * as good as the regex its phrasing happens to hit, and nothing was checking
 * that pairing. Two phrasings in this file are already load-bearing for reasons
 * discovered on prod, not by reading the code:
 *
 *   - "play the Vienna against me" resolved the opening perfectly and then
 *     started a WALKTHROUGH; the board never moved because it was waiting to be
 *     watched (David 2026-08-09).
 *   - "teach me the traps in the Vienna" fell through to the brain, which is
 *     forbidden from inventing chess content and correctly refused, because no
 *     pattern claimed the word students actually use (David 2026-08-02).
 *
 * Both were one missing word, invisible until someone drove the surface. A test
 * over these patterns catches the next one at build time instead.
 *
 * ORDER IS SIGNIFICANT: the first match wins, so more specific arms come first.
 * Each pattern strips ONLY its own verb and connective — the opening name has
 * to survive for the resolver, which is why they are not written as whole-string
 * matches.
 */
export type TeachStage = 'concepts' | 'findMove' | 'drill' | 'punish' | 'play-real';

export const STAGE_PATTERNS: ReadonlyArray<{ regex: RegExp; stage: TeachStage }> = [
  { regex: /\b(?:drill|practice)\s+(?:the\s+)?/i, stage: 'drill' },
  { regex: /\b(?:the\s+)?(?:.+?)\s+drill(?:s)?\b/i, stage: 'drill' },
  { regex: /\bpunish(?:ment)?(?:\s+lines?)?\s+(?:in\s+|for\s+|from\s+)?(?:the\s+)?/i, stage: 'punish' },
  { regex: /\b(?:the\s+)?(?:.+?)\s+punish(?:ment)?(?:\s+lines?)?\b/i, stage: 'punish' },
  // TRAPS ARE THE PUNISH STAGE (David 2026-08-02). Nobody asks for "punish
  // lines" — they ask for traps, and the stage they mean already prefers the
  // curated, engine-verified gems. Two patterns mirroring the punish pair, each
  // matching only the keyword and its connective so the name survives.
  { regex: /\btraps?(?:\s+lines?)?\s+(?:in|for|from|of|against|with)\s+(?:the\s+)?/i, stage: 'punish' },
  { regex: /\btraps?(?:\s+lines?)?\b/i, stage: 'punish' },
  { regex: /\b(?:quiz\s+me\s+on|quiz)\s+(?:the\s+)?/i, stage: 'concepts' },
  { regex: /\b(?:concept(?:\s+check)?|concepts)\s+(?:for\s+|of\s+)?(?:the\s+)?/i, stage: 'concepts' },
  { regex: /\b(?:find(?:\s+the)?\s+moves?|recognition)\s+(?:in\s+|for\s+)?(?:the\s+)?/i, stage: 'findMove' },
  // 🔒 "PLAY X AGAINST ME" IS A REQUEST FOR A GAME, NOT A LECTURE (David
  // 2026-08-09). The against/with-me arm runs first because it is the most
  // specific; "play through the Vienna" is deliberately excluded below because
  // that is a watch ask and keeps its walkthrough.
  { regex: /\bplay\s+(?:it\s+)?(?:for\s+)?real\s+(?:the\s+)?/i, stage: 'play-real' },
  { regex: /\b(?:let'?s\s+|can\s+we\s+|could\s+we\s+|i\s+want\s+to\s+|wanna\s+)?play\s+(?:the\s+)?(?=.*\b(?:against|versus|vs\.?|with)\s+(?:me|you)\b)|\s*\b(?:against|versus|vs\.?|with)\s+(?:me|you)\b/gi, stage: 'play-real' },
  { regex: /\bplay\s+me\s+(?:the\s+)?/i, stage: 'play-real' },
  { regex: /\b(?:let'?s|can\s+we|could\s+we|wanna|i\s+want\s+to)\s+play\s+(?!through\b)(?:the\s+)?/i, stage: 'play-real' },
];

export interface StageRoute {
  /** null when the text asks for a plain walkthrough (the "teach" default). */
  stage: TeachStage | null;
  /** What is left once the verb is stripped — this is what gets resolved as an
   *  opening name, so an empty string means the phrasing ate the name. */
  remainder: string;
}

/**
 * Route a request the same way `CoachTeachPage.handleSubmit` does.
 *
 * Kept behaviourally identical to the loop it replaced, including the dangling
 * preposition trim: "play against me IN the Vienna" leaves "in the Vienna", and
 * the resolver has no opening called "in the".
 */
export function routeStage(text: string): StageRoute {
  let remainder = text.trim();
  for (const sp of STAGE_PATTERNS) {
    // A /g regex carries lastIndex between calls; reset so a module-level
    // pattern cannot mis-report on its second use.
    sp.regex.lastIndex = 0;
    const match = remainder.match(sp.regex);
    if (!match) continue;
    sp.regex.lastIndex = 0;
    remainder = remainder.replace(sp.regex, ' ').replace(/\s+/g, ' ').trim();
    remainder = remainder.replace(/^(?:in|with|on|at|using)\s+(?:the\s+)?/i, '').trim();
    return { stage: sp.stage, remainder };
  }
  return { stage: null, remainder };
}
