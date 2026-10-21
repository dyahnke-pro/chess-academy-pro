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
const COUNT_WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'] as const;

export function countWord(n: number): string {
  return COUNT_WORD[n] ?? String(n);
}

/** Files as SAID: "the c-file", "the b- and c-files", "the a-, b- and c-files".
 *  The one wording for a list of files — "the b, c-file" was read aloud as
 *  "the bishop, c-file" (walk 900). Empty → ''. */
export function fileList(files: readonly string[]): string {
  if (files.length === 0) return '';
  if (files.length === 1) return `the ${files[0]}-file`;
  return `the ${andList(files.map((f) => `${f}-`)).replace(/-$/, '')}-files`;
}

/** WHO PLAYS A MOVE OF A SPOKEN LINE. A line said as bare moves — "Nxd5, Nxd5
 *  and Bxd5" — leaves the listener to work out whose move each one is (OS-8
 *  gap 7, Smith-Morra replay 2026-10-19). Every line is said with its movers:
 *  "you" / "they" from the student's seat, "White" / "Black" where there is
 *  no student. */
export type LineSeat = 'you' | 'they' | 'White' | 'Black';
const OTHER_SEAT: Record<LineSeat, LineSeat> = { you: 'they', they: 'you', White: 'Black', Black: 'White' };

/** The seat that plays a line's FIRST move: the side to move on `fen`, seen
 *  from `student` (null: no student, so the colour). */
export function lineSeatAt(fen: string, student: 'w' | 'b' | null): LineSeat {
  const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  if (!student) return turn === 'w' ? 'White' : 'Black';
  return turn === student ? 'you' : 'they';
}

/** One move of a line with its mover: "you play Nxd5", "they answer Nxd5",
 *  "White castles kingside". */
function seatedPly(san: string, who: LineSeat, answer: boolean): string {
  const s = san.replace(/^…/, '');
  const third = who === 'White' || who === 'Black';
  const castle = /^O-O-O/.test(s) ? 'queenside' : /^O-O/.test(s) ? 'kingside' : null;
  if (castle) return `${who} castle${third ? 's' : ''} ${castle}${/#$/.test(s) ? ' with mate' : /\+$/.test(s) ? ' with check' : ''}`;
  return `${who} ${answer ? 'answer' : 'play'}${third ? 's' : ''} ${s}`;
}

/** EVERY move of a line, each with its mover: "you play Nxd5, they answer Nxd5
 *  and you play Bxd5". `first` is REQUIRED — the seat that plays `sans[0]` —
 *  so no caller can say a line without saying whose moves it is. */
export function seatedLine(sans: readonly string[], first: LineSeat): string {
  return andList(sans.map((san, i) => seatedPly(san, i % 2 === 0 ? first : OTHER_SEAT[first], i % 2 === 1)));
}

/**
 * A LINE AS THE VOICE SAYS IT (proof guard 2: the voice says the shape, the
 * board shows the detail). Up to three moves are said in full, each with its
 * mover; a longer line is said as its first move and where it lands — the
 * whole line is drawn on the board and kept in the proof (Learn audit
 * 2026-10-15: "That wins the exchange: Bc5, gxf6, Bxd4, Nxd4, Qe5+, Qe2 and
 * Qxd4" read aloud).
 */
export function lineShape(sans: readonly string[], first: LineSeat): string {
  if (sans.length <= 3) return seatedLine(sans, first);
  // The first move and where the line LANDS — "the moves that follow" named
  // nothing (claim check 2026-10-17: 144 weighings said "e7? Then the moves
  // that follow — …", a line no student can picture). Full moves, not plies.
  const later = Math.ceil((sans.length - 1) / 2);
  const last = (sans.length - 1) % 2 === 0 ? first : OTHER_SEAT[first];
  return `${seatedPly(sans[0], first, false)} and, ${later === 1 ? 'a move' : `${NUMBER_WORDS[later] ?? later} moves`} later, ${seatedPly(sans[sans.length - 1], last, false)}`;
}
/** A LINE ONCE ITS FIRST MOVE IS ALREADY NAMED — "Qh4? Then …", "Qh4 didn't
 *  work: …": the sentence has said the move, so the line is said from the
 *  reply on ("you play Qh4 and they answer Nxh4 — they win a queen" → "they
 *  answer Nxh4 — they win a queen"). One reader of the one format this file
 *  writes; the two private copies of it drifted when the format gained its
 *  movers (OS-8 gap 7). The text unchanged when it does not open with `san`. */
export function lineAfterFirst(san: string, text: string): string {
  const bare = (x: string): string => x.replace(/^…|^\.\.\./, '');
  const esc = bare(san).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^(?:(?:you|they) (?:play|answer) |(?:White|Black) (?:plays|answers) )?(?:…)?${esc}(?: — |, | and, | and )`).exec(text);
  return m ? text.slice(m[0].length) : text;
}

const NUMBER_WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine' };

/**
 * "a fork", "an overloaded defender", "an inaccuracy", "an e-file", "an
 * 8-point gap" — the indefinite article by SOUND, in front of a phrase computed
 * somewhere else. The ONE way to put "a" or "an" before an interpolated noun: a
 * template that wrote "a ${word}" itself said "You have a overloaded defender"
 * (Learn tape 2026-10-21), and a private letter rule here and there drifted
 * from it. Gate: `noHandWrittenArticle.test.ts`.
 */
export function withArticle(phrase: string | number): string {
  const p = String(phrase).trim();
  return `${articleFor(p)} ${p}`;
}

function articleFor(p: string): 'a' | 'an' {
  const word = p.split(/\s/)[0] ?? '';
  // A number by how it is said: eight…, eleven, eighteen — and their
  // hundreds and thousands ("an 1800-rated player", "an 11-move line").
  const num = /^\d+/.exec(word)?.[0];
  if (num) {
    if (num.startsWith('8')) return 'an';
    return (num.startsWith('11') || num.startsWith('18')) && [2, 4, 5].includes(num.length) ? 'an' : 'a';
  }
  // A lone letter is said as its name — a file or a square: "an e-pawn", "an
  // f4 knight", "an h-file", "a b5 bishop".
  if (/^[a-z](?:\d|-|$)/i.test(word)) return /^[aefhilmnorsx]/i.test(word) ? 'an' : 'a';
  const w = word.toLowerCase();
  // Vowel letters said with a consonant ("a one-move threat", "a unique
  // move", "a useful square"), and a silent h ("an hour").
  if (/^(?:one\b|once|unit|uniq|unif|univ|unis|union|use|usu|uti|ura|ure|uro|eu|ewe)/.test(w)) return 'a';
  if (/^(?:hour|honest|honou?r|heir)/.test(w)) return 'an';
  return /^[aeiou]/.test(w) ? 'an' : 'a';
}
