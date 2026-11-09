import { Chess } from 'chess.js';

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

/** A line this long or shorter is said move by move (`lineShape`). */
const LINE_SAID_IN_FULL = 3;

const PIECE_POINTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** What each move of the line takes (a promotion counts what it adds), and
 *  who plays it, read off the board the line starts on; null when there is
 *  no board or the line does not play on it. */
function lineTakes(sans: readonly string[], fen: string): { took: number; to: string; color: 'w' | 'b' }[] | null {
  try {
    const c = new Chess(fen);
    return sans.map((san) => {
      const m = c.move(san.replace(/^…/, ''));
      const took = (m.captured ? PIECE_POINTS[m.captured] ?? 0 : 0) + (m.promotion ? (PIECE_POINTS[m.promotion] ?? 0) - 1 : 0);
      return { took, to: m.to, color: m.color };
    });
  } catch { return null; }
}

/** The board after the first `k` moves of a line — for a caller that says a
 *  line from its second move on. Null when there is no board or the moves do
 *  not play on it. */
export function fenAfterSans(fen: string | null, sans: readonly string[]): string | null {
  if (!fen) return null;
  try {
    const c = new Chess(fen);
    for (const san of sans) c.move(san.replace(/^…/, ''));
    return c.fen();
  } catch { return null; }
}

/** THE MOVE THAT WINS, inside a line (David 2026-11-09: a long line said as
 *  its first and last move skipped the capture that won — "they play Bxb7
 *  and, two moves later, you play Rxa8 — you give up a rook" never said the
 *  …Bxa8 that took the rook). Read on the line's board: the side the line
 *  wins for, and of its captures between the first move and the last the one
 *  that takes the most — never one half of a trade (a capture taken straight
 *  back on its square for the same value). It is said unless the line's last
 *  move is that side's and takes as much, so the line already names it. With
 *  no board nothing is added. One move, never a score sheet. */
function winningMove(sans: readonly string[], fen: string | null): number | null {
  const takes = fen ? lineTakes(sans, fen) : null;
  if (!takes) return null;
  const won = { w: 0, b: 0 };
  for (const t of takes) won[t.color] += t.took;
  if (won.w === won.b) return null;
  const winner: 'w' | 'b' = won.w > won.b ? 'w' : 'b';
  const traded = (i: number): boolean => {
    const a = takes[i];
    const next = takes[i + 1];
    const prev = takes[i - 1];
    return (!!next && next.to === a.to && next.took === a.took) || (!!prev && prev.to === a.to && prev.took === a.took);
  };
  let best: number | null = null;
  for (let i = 1; i < takes.length - 1; i += 1) {
    const t = takes[i];
    if (t.color !== winner || t.took === 0 || traded(i)) continue;
    if (best === null || t.took > takes[best].took) best = i;
  }
  if (best === null) return null;
  const last = takes[takes.length - 1];
  return last.color === winner && last.took >= takes[best].took ? null : best;
}

/** The moves `lineShape` SAYS, by index into the line: every one up to
 *  three, otherwise the first, the move that wins (`winningMove`), and the
 *  last — so a result said after the line can leave out what those moves
 *  already said (a promotion is said "a1, making a queen"). `fen` is
 *  REQUIRED: the board the line starts on, or null where the caller has none.
 *  One rule with `lineShape`. */
export function lineShapePlies(sans: readonly string[], fen: string | null): number[] {
  const n = sans.length;
  if (n <= 0) return [];
  if (n <= LINE_SAID_IN_FULL) return Array.from({ length: n }, (_, i) => i);
  const won = winningMove(sans, fen);
  return won === null ? [0, n - 1] : [0, won, n - 1];
}

/**
 * A LINE AS THE VOICE SAYS IT (proof guard 2: the voice says the shape, the
 * board shows the detail). Up to three moves are said in full, each with its
 * mover; a longer line is said as its first move, the capture that wins the
 * material when the end does not name it, and where it lands — the whole line is drawn on the board and
 * kept in the proof (Learn audit 2026-10-15: "That wins the exchange: Bc5,
 * gxf6, Bxd4, Nxd4, Qe5+, Qe2 and Qxd4" read aloud). `fen` is REQUIRED: the
 * board the line starts on (null where the caller has none), so the move
 * that wins can be found (`lineShapePlies`).
 */
export function lineShape(sans: readonly string[], first: LineSeat, fen: string | null): string {
  if (sans.length <= LINE_SAID_IN_FULL) return seatedLine(sans, first);
  // The first move, the capture that wins, and where the line LANDS — "the
  // moves that follow" named nothing (claim check 2026-10-17: 144 weighings
  // said "e7? Then the moves that follow — …", a line no student can picture).
  // Full moves, not plies.
  const said = lineShapePlies(sans, fen);
  const seatOf = (i: number): LineSeat => (i % 2 === 0 ? first : OTHER_SEAT[first]);
  const gap = (from: number, to: number): string => {
    const later = Math.ceil((to - from) / 2);
    return later === 1 ? 'a move' : `${NUMBER_WORDS[later] ?? later} moves`;
  };
  // Each said move after the first: the reply that comes straight after is
  // said as an answer ("they answer Rxa8"); the move that wins, with moves
  // left out before it, says how far on it comes ("and Bxa8 a move later");
  // the end the same ("and, two moves later, you play Rxe1"). The whole line
  // is drawn on the board.
  let out = seatedPly(sans[0], first, false);
  let then = false;
  said.slice(1).forEach((i, k) => {
    const prev = said[k];
    const last = k === said.length - 2;
    const and = then ? ', and ' : ' and ';
    if (i - prev === 1) {
      out += `${last ? and : ', '}${seatedPly(sans[i], seatOf(i), seatOf(i) !== seatOf(prev))}`;
    } else if (last) {
      out += `${and.trimEnd()}, ${gap(prev, i)} later, ${seatedPly(sans[i], seatOf(i), false)}`;
    } else {
      out += seatOf(i) === seatOf(prev)
        ? ` and ${sans[i].replace(/^…/, '')} ${gap(prev, i)} later`
        : `, and ${gap(prev, i)} later ${seatedPly(sans[i], seatOf(i), false)}`;
      then = true;
    }
  });
  return out;
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
