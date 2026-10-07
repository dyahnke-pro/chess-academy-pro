// phraseMemory — SAY IT ONCE, THEN REFER (the DNA template, David 2026-10-07:
// "teach me x has a lot of repeated phrases"). One lesson measured 150
// "fighting for the center" across 25 lines. An idea is taught in full the
// first time it is said; after that it rotates through shorter references.
// ROTATED, NOT ROLLED: keyed on how often this lesson has already said the
// idea, so a replayed lesson says exactly the same words (resume-safe,
// testable — never Math.random). Text only: no chess judgement lives here.

export type PhraseMemory = Map<string, number>;

export function newPhraseMemory(): PhraseMemory {
  return new Map();
}

/** The phrasing for the next saying of `key`: the full form first, then the
 *  short forms in turn. With no memory (a one-off read), always the full form. */
export function sayIdea(mem: PhraseMemory | null | undefined, key: string, forms: readonly string[]): string {
  if (forms.length === 0) return '';
  if (!mem) return forms[0];
  const n = mem.get(key) ?? 0;
  mem.set(key, n + 1);
  if (n === 0 || forms.length === 1) return forms[0];
  return forms[1 + ((n - 1) % (forms.length - 1))];
}
