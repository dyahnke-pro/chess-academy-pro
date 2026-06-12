/**
 * walkthroughControlIntent — deterministic detection of walkthrough
 * CONTROL commands typed into /coach/teach while a walkthrough is on the
 * board (paused OR mid-narration).
 *
 * Why this exists (David 2026-06-12): with a walkthrough PAUSED, typing a
 * control word like "start" / "go" / "new lesson" fell into the bare-name
 * fuzzy opening router — it fuzzy-matched "start" as an opening NAME and
 * surfaced a nonsense "I don't have an exact match for 'start'. Did you
 * mean one of these?" picker with random openings, while the paused
 * walkthrough just sat there. The coach never stopped what it was doing,
 * never started a new lesson, never resumed.
 *
 * This classifier recognizes the three control intents up front so the
 * surface can act DETERMINISTICALLY — code decides, the LLM never sees
 * this routing choice and never has to decide to call a tool (G0: "THE
 * LLM DECIDES NOTHING — it voices facts computed in code"). Pure +
 * dependency-free so it's trivially unit-testable.
 *
 *   - 'new'    : the student asked for a DIFFERENT / new lesson without
 *                naming an opening ("new lesson", "teach me something
 *                else", "switch lessons", "start a new one"). The surface
 *                tears down the current walkthrough and invites a new ask.
 *   - 'stop'   : the student wants to END the walkthrough ("stop", "end
 *                this", "quit the lesson", "I'm done"). Surface tears the
 *                walkthrough down.
 *   - 'resume' : a BARE continue word ("start", "go", "resume",
 *                "continue", "next"). The surface resumes a PAUSED
 *                walkthrough. (Only acted on while paused.)
 *
 * Order matters: 'new' is tested before 'resume' so "start a new lesson"
 * classifies as 'new' (not 'resume' on the leading "start").
 */

export type WalkthroughControl = 'new' | 'stop' | 'resume';

/** Lowercase, collapse whitespace, drop trailing sentence punctuation. */
function norm(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Explicit "give me a DIFFERENT lesson" — no opening named. */
const NEW_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(?:new|different|another|other)\s+(?:lesson|opening|walk\s?through|walkthrough|line|one)\b/,
  /\b(?:teach|show|give|start|do|try|learn|pick|choose)\s+(?:me\s+)?(?:something|anything)\s+(?:else|different|new)\b/,
  /\b(?:let'?s\s+)?(?:switch|change|move\s+on)\s+(?:to\s+)?(?:a\s+)?(?:different|new|another)\b/,
  /\bswitch\s+(?:lessons?|openings?)\b/,
  /\bstart\s+(?:a\s+|an\s+)?(?:new|different|fresh)\b/,
  /\b(?:pick|choose|learn)\s+(?:a\s+)?(?:new|different|another)\s+(?:lesson|opening|one|line)\b/,
];

/** End / abandon the current walkthrough. */
const STOP_PATTERNS: ReadonlyArray<RegExp> = [
  /^(?:stop|end|quit|exit|cancel|close|nevermind|never\s*mind)$/,
  /^(?:stop|end|quit|cancel|close)\s+(?:this|that|it)$/,
  /\b(?:end|stop|quit|exit|close|leave|drop)\s+(?:the\s+|this\s+)?(?:walk\s?through|walkthrough|lesson|session)\b/,
  /^i'?m\s+done$/,
  /\bforget\s+(?:it|this|the\s+lesson|the\s+walk\s?through|the\s+walkthrough)\b/,
];

/** A BARE continue word — the WHOLE input is just the control verb. */
const RESUME_PATTERN =
  /^(?:start|begin|resume|unpause|continue|go|go\s+on|go\s+ahead|keep\s+going|carry\s+on|proceed|next|play\s+on|continue\s+(?:the\s+)?(?:lesson|walk\s?through|walkthrough)|resume\s+(?:the\s+)?(?:lesson|walk\s?through|walkthrough))$/;

/**
 * Classify a chat message as a walkthrough control command, or null if it
 * isn't one. Precision over recall — anything that isn't an unambiguous
 * control phrase returns null so the normal opening router still runs.
 */
export function classifyWalkthroughControl(text: string): WalkthroughControl | null {
  const t = norm(text);
  if (!t || t.length > 60) return null;

  // 'new' first — "start a new lesson" must not be read as a bare resume.
  if (NEW_PATTERNS.some((re) => re.test(t))) return 'new';
  if (STOP_PATTERNS.some((re) => re.test(t))) return 'stop';
  if (RESUME_PATTERN.test(t)) return 'resume';
  return null;
}

/**
 * True iff the input is ANY walkthrough control phrase. The opening router
 * uses this to keep control words ("start", "go", "stop", …) out of the
 * bare-name fuzzy matcher even when no walkthrough is active — so they
 * never surface a bogus "did you mean <opening>?" picker.
 */
export function isWalkthroughControlPhrase(text: string): boolean {
  return classifyWalkthroughControl(text) !== null;
}
