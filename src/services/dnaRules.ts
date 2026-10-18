// dnaRules — THE CODE-SIDE DNA VOICE RULES that need no context (David
// 2026-10-07: "All narrations everywhere need to pass through this. On the code
// side, not the llm side"). ONE source for the two doors:
//   • `voicePackage.buildVoicePackage` (Learn, Review, lessons) — which adds the
//     context rules: say-once, the claim ledger, board-truth grading;
//   • `voiceService.speakInternal` — the chokepoint EVERY spoken line passes,
//     so no surface can speak around them.
// docs/DNA-outline.md. Leaf module: no imports, so the voice service can hold
// it without pulling the coach into its graph.

/** A sentence the DNA refuses outright, and why. */
export const DNA_REFUSE: ReadonlyArray<{ re: RegExp; why: string }> = [
  // Sentence-OPENING praise only: "the only good move here" is teaching.
  { re: /(?:^|[.!?]\s+)(?:great|nice|good|excellent|brilliant|well)\s+(?:move|job|find|done|play|shot)\b|\bwell done\b|\bgood job\b|(?:^|[.!?]\s+)(?:excellent|correct|great|nice|perfect)[!.]/i, why: 'dna: praise' },
  { re: /\b(?:tap|click|press)\s+(?:the|a|on)\b|\b(?:button|menu)\b/i, why: 'dna: interface talk' },
];

/** EARNED PRAISE (David 2026-10-18: "Praise!") — the ONE carve-out from the
 *  praise rule: said only when a Learn burst fires (a decision, an only move,
 *  a save, a punish), then followed by the why. The DNA lets EXACTLY these
 *  sentences through, so no other producer can praise by accident — a new
 *  line has to be added here, on purpose. Rotated by the ply, escalated by the
 *  streak (never Math.random). */
export type PraiseKind = 'decision' | 'onlyMove' | 'saved' | 'punished';
export const EARNED_PRAISE: Readonly<Record<PraiseKind, readonly string[]>> = {
  decision: ["That's the one.", 'There it is.', 'Exactly right.', 'Well found.'],
  onlyMove: ['The only move — and you found it.', 'Only one move held, and you played it.'],
  saved: ['Good defence.', 'Threat met.'],
  punished: ['You made them pay.', 'Punished.'],
};
export function isPraiseKind(k: string | null | undefined): k is PraiseKind {
  return !!k && Object.prototype.hasOwnProperty.call(EARNED_PRAISE, k);
}
const STREAK_WORDS = ['three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** "That's three in a row." — the streak's own praise, three and up. */
export const STREAK_PRAISE: readonly string[] = STREAK_WORDS.map((w) => `That's ${w} in a row.`);

export function earnedPraise(kind: PraiseKind, streak: number, rot: number): string {
  if (streak >= 3) return STREAK_PRAISE[Math.min(streak - 3, STREAK_PRAISE.length - 1)];
  const stems = EARNED_PRAISE[kind];
  return stems[((rot % stems.length) + stems.length) % stems.length];
}

const PRAISE_ALLOWED = new Set<string>([...Object.values(EARNED_PRAISE).flat(), ...STREAK_PRAISE]);

/** DNA rule 7 — no move-number prefixes ("12.Nf3" is read "twelve"). A
 *  rephrase, never a drop: the move stays, the number goes. */
export function stripMoveNumbers(text: string): string {
  // A COUNT IS NOT A MOVE NUMBER: "a forced mate in 3. Ng5, Be8…" lost its
  // 3 here (hard walk 2026-10-10). A number after "in / of / by / than" is a
  // count ending a sentence, never a move-number prefix.
  return text.replace(/(?<![\w.])(?<!\b(?:in|of|by|than|about|over|under)\s)\d{1,3}\s?(?:\.\.\.|…|\.)\s?(?=(?:[NBRQK][a-h1-8x]|O-O|[a-h][1-8x]))/g, (m) => (/(?:\.\.\.|…)/.test(m) ? '…' : ''));
}

export interface DnaPassResult { text: string; refused: string[] }

/** The context-free DNA pass over a line about to be spoken: move numbers
 *  rephrased away, and a sentence of praise or interface talk cut — the
 *  sentence, never the line, so the teaching beside it still speaks.
 *  `kid`: the kids contract allows milestone praise and tells a child what to
 *  tap, so only the move-number rule runs. `verbatim`: a passage the student
 *  asked to hear read (a book quote) is read as written. */
export function dnaPass(text: string, opts: { kid?: boolean; verbatim?: boolean } = {}): DnaPassResult {
  if (opts.verbatim) return { text, refused: [] };
  const stripped = stripMoveNumbers(text);
  if (opts.kid) return { text: stripped, refused: [] };
  const sentences = stripped.split(/(?<=[.!?])\s+/);
  const refused: string[] = [];
  const kept = sentences.filter((s) => {
    const hit = PRAISE_ALLOWED.has(s.trim()) ? undefined : DNA_REFUSE.find((r) => r.re.test(s));
    if (hit) refused.push(hit.why);
    return !hit;
  });
  return { text: kept.join(' ').trim(), refused };
}
