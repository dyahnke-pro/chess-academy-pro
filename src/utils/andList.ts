/**
 * Join EVERY item as English ("a", "a and b", "a, b and c").
 *
 * The single source of truth for enumerating computed facts in narration.
 * There is NO cap — David 2026-09-16, emphatic: "I DONT WANT ANYTHING
 * LIMITED!!! We cannot set hard caps!!! That's how things don't get stated or
 * teachings left out." A long list is a PHRASING problem; it is never a reason
 * to drop a fact the board already earned (CLAUDE.md §G4.5).
 *
 * If a call site feels like it wants a `.slice(0, N)` in front of this, the
 * answer is a different rendering — a count plus the list ("four holes: d5,
 * b5, c4 and e4") — never a truncation.
 */
export function andList(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** The same, joined with "or" — for alternatives the student picks between. */
export function orList(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  if (xs.length === 2) return `${xs[0]} or ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
}

/**
 * "four holes: d5, b5, c4 and e4" — the sanctioned rendering when a list is
 * long enough that the student benefits from knowing how many there are before
 * hearing them. Still every item; the count is a signpost, not a budget.
 */
const COUNT_WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'] as const;

export function countWord(n: number): string {
  return COUNT_WORD[n] ?? String(n);
}

export function countedList(xs: readonly string[], nounSingular: string, nounPlural: string): string {
  if (xs.length === 0) return '';
  if (xs.length === 1) return `${nounSingular} ${xs[0]}`;
  return `${countWord(xs.length)} ${nounPlural}: ${andList(xs)}`;
}

/** Files as SAID: "the c-file", "the b- and c-files", "the a-, b- and c-files".
 *  The one wording for a list of files — "the b, c-file" was read aloud as
 *  "the bishop, c-file" (walk 900). Empty → ''. */
export function fileList(files: readonly string[]): string {
  if (files.length === 0) return '';
  if (files.length === 1) return `the ${files[0]}-file`;
  return `the ${andList(files.map((f) => `${f}-`)).replace(/-$/, '')}-files`;
}
