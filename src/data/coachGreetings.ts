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
  "What are we working on today? Name an opening and I'll teach it to you move by move.",
  "Good to see you. Want me to teach you an opening, dig into your weak spots, or look at a position?",
  "Ready when you are. Pick a line to learn — just say “teach me the Caro-Kann” — or ask about your game.",
  "Back at the board. Name any opening and I'll walk you through it, or tell me what to sharpen.",
  "Let's get to work. I can teach you a specific opening move by move — or talk stats, openings, and weak spots.",
  "What can I help with? Learn a new opening, drill your weaknesses, or review a game — your call.",
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
  'Teach me the Caro-Kann',
  'Teach me the Italian Game',
];

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
