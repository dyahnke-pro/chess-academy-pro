/**
 * coachGreetings — the rotating Learn-with-Coach opening line + the
 * suggested-question chips that show a student what they can ask (David
 * 2026-07-04: "instead of always saying welcome to my classroom … it should
 * rotate through and maybe give some pickers to choose").
 *
 * Pure data + deterministic rotation (index in, string out) so it's unit-
 * testable and never depends on Math.random. The caller passes a rotation
 * index (e.g. a per-visit counter); we modulo into the pools. Every greeting
 * follows the narration voice rules — concrete, no "welcome" boilerplate on
 * repeat, varied stems so a returning student never hears the same line twice
 * in a row.
 */

/** Rotating opening lines. Each invites a question without the stale
 *  "welcome to my classroom" every time. */
export const COACH_GREETINGS: readonly string[] = [
  "What are we working on today?",
  "Good to see you. What's on your mind — an opening, your weak spots, a position?",
  "Ready when you are. Ask me about your game, or pick a line to drill.",
  "Back at the board. What would you like to sharpen today?",
  "Let's get to work. Curious about your stats, your openings, or a specific move?",
  "What can I help you with? Your weaknesses, a new opening, or a game to review?",
];

/** The starter questions a student can tap — each one routes to a GROUNDED
 *  vertical the coach answers from computed data (never an LLM guess). Kept
 *  short so they read cleanly as chips. Ordered pool; the caller rotates a
 *  window of N so the visible set varies per visit. */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  'What are my weaknesses?',
  'What should I work on?',
  "What's my best opening?",
  "What's my weakest opening?",
  'How are my tactics?',
  'Which phase am I weakest in?',
  'How often do I blunder?',
  "What's my rating?",
  'Am I improving?',
  "What's due for review?",
  'Am I better as White or Black?',
  'How do I do against the Sicilian?',
];

/** What the coach can TEACH, phrased the way a student would ask for it.
 *
 *  🔒 THESE LEAD THE PICKER, AND THE STATS QUESTIONS DO NOT (David 2026-08-18:
 *  *"These pickers I wanted to be more relevant"*, shown against a set reading
 *  "How often do I blunder? / What's my rating?"). Every chip above was a
 *  question about the STUDENT. Not one of them showed what the app had been
 *  built to do, so the surface advertised its scoreboard and hid its teaching.
 *
 *  Each template is a phrasing `teachStageRouting` actually routes — that
 *  pairing is asserted in `teachPickerRouting.test.ts`, because a picker is only
 *  as good as the regex its wording happens to hit and two of these have already
 *  been one missing word away from landing the student in the wrong surface.
 *
 *  The `{}` is filled with an opening the caller supplies. The caller passes the
 *  openings the student has favourited, or the ones the app teaches most deeply
 *  — so the chips track what has actually been built rather than a list written
 *  once and left to rot. */
export const TEACHING_OFFERS: readonly string[] = [
  'Teach me the {}',
  'Play the {} against me',
  'Traps in the {}',
  'Quiz me on the {}',
  'Drill the {}',
];

/** Build teaching chips by rotating openings against offers.
 *
 *  Rotating BOTH means a student who opens the app twice does not see the same
 *  four chips, and pairing offer `k` with opening `k` (rather than nesting the
 *  loops) means the visible set spreads across several openings instead of
 *  showing five ways to study one of them. */
export function pickTeachingOffers(
  openings: readonly string[],
  index: number,
  count = 3,
): string[] {
  const pool = openings.filter((o) => o.trim().length > 1);
  if (pool.length === 0) return [];
  const n = Math.max(0, Math.trunc(count));
  const start = Math.trunc(index);
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const offer = TEACHING_OFFERS[(((start + k) % TEACHING_OFFERS.length) + TEACHING_OFFERS.length) % TEACHING_OFFERS.length];
    const opening = pool[(((start + k) % pool.length) + pool.length) % pool.length];
    const chip = offer.replace('{}', opening);
    if (!out.includes(chip)) out.push(chip);
  }
  return out;
}

/** Pick a greeting by rotation index. */
export function pickGreeting(index: number): string {
  const i = ((Math.trunc(index) % COACH_GREETINGS.length) + COACH_GREETINGS.length) % COACH_GREETINGS.length;
  return COACH_GREETINGS[i];
}

/** Pick a rotating window of N suggested questions starting at `index`,
 *  wrapping around the pool. N is clamped to the pool size. Never returns
 *  duplicates within the window. */
export function pickSuggestedQuestions(index: number, count = 4): string[] {
  const n = Math.max(0, Math.min(Math.trunc(count), SUGGESTED_QUESTIONS.length));
  const start = ((Math.trunc(index) % SUGGESTED_QUESTIONS.length) + SUGGESTED_QUESTIONS.length) % SUGGESTED_QUESTIONS.length;
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    out.push(SUGGESTED_QUESTIONS[(start + k) % SUGGESTED_QUESTIONS.length]);
  }
  return out;
}

/** Build a targeted, data-driven nudge question from a computed weakness
 *  topic (e.g. "endgames", "forks", "the Sicilian"). Returns null when there's
 *  no clear weakness — the caller then shows only the generic rotating set.
 *  The phrasing routes to a grounded vertical (progress / opening-record) so
 *  the answer is still computed, not invented. */
export function weaknessNudgeQuestion(topic: string | null | undefined): string | null {
  const t = (topic ?? '').trim();
  if (t.length < 2) return null;
  return `Why do I struggle with ${t}?`;
}

/** Build the full data-driven nudge QUESTION from a stored weakness item
 *  (category + label) — so "the app identifies a weakness and suggests a study
 *  session" (David 2026-07-04) with a SPECIFIC target, and the phrasing is
 *  chosen per category so it ALWAYS routes to a grounded vertical:
 *  - tactics / calculation / endgame → "Why do I struggle with <topic>?" (progress)
 *  - openings → "What's my record in <name>?" (record-vs)
 *  Returns null for categories that aren't a chess skill (time management),
 *  aggregate labels ("3 openings never drilled"), or when nothing clean can be
 *  extracted — the caller then shows only the generic rotating chips. */
export function weaknessNudgeFromItem(category: string | undefined, label: string | undefined): string | null {
  const cat = (category ?? '').toLowerCase();
  const lbl = (label ?? '').trim();
  if (cat === 'openings') {
    const m = /(?:shaky in|weak at|weak in)\s+(.+)/i.exec(lbl);
    const name = m?.[1]?.trim();
    // Skip aggregate labels like "3 openings never drilled" / "Flashcard backlog".
    if (name && !/^\d/.test(name) && !/backlog|never drilled/i.test(name)) {
      return `What's my record in ${name}?`;
    }
    return null;
  }
  if (cat === 'tactics') return weaknessNudgeQuestion('tactics');
  if (cat === 'calculation') return weaknessNudgeQuestion('calculation');
  if (cat === 'endgame') return weaknessNudgeQuestion('endgames');
  return null; // time_management + anything unmapped → no topic nudge
}
