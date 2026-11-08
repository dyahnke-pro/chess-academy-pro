// MARKS APPEAR AS THEY ARE MENTIONED (David 2026-10-19: "all mentioned squares
// light up at the beginning of the narration, they need to light up AS THEY
// ARE MENTIONED" … "arrows need to appear as the moves are mentioned").
//
// The ONE schedule for every surface that speaks over a board (Learn, Review,
// chat, lessons, puzzles — David 2026-11-08). Given the text the voice is
// about to speak and the marks the kept facts carry, it says when each mark
// goes up: at the character where its square is first named, on the same
// ~55ms/char clock the paced reveal has always used (never TTS word timing).
// A sentence that names a mark clears the previous sentence's marks as it
// starts (David 2026-09-13: "stack until next phrase is spoken"), so a line's
// moves accumulate inside their sentence and give way to the next idea.
// A mark no sentence names goes up with the last sentence — never lost; a
// line's unnamed ply goes up right after the ply before it.
// A leaf: no imports.

export const MS_PER_CHAR = 55;

export interface PacedMark {
  /** Caller's handle for the mark (an arrow or a highlight). */
  id: string;
  /** The squares that announce it: an arrow's destination (then its origin), a
   *  highlight's square. The first one the text names wins. */
  squares: readonly string[];
  /** Words that announce it too, matched whole and case-blind: a piece by its
   *  spoken name ("their queen" — `pieceRef`, the one namer), a castling move
   *  ("castles"). The squares are tried first (David 2026-11-08: "ALL appear
   *  AS THEY ARE STATED" — "their queen" lit at the turn's end). */
  words?: readonly string[];
  /** The moves of ONE line share a group, in order. A ply the words never name
   *  (a line said by its shape — "Nxd4 and, two moves later, Rfxc8") goes up
   *  right after the ply before it, never at the turn's end. */
  group?: string;
  /** The sentence of the fact it belongs to: a square the words describe
   *  without naming ("only four squares", "each square") goes up when its own
   *  fact is said, never at the turn's end. */
  said?: string;
}

type MarkEvent =
  | { atMs: number; kind: 'clear' }
  | { atMs: number; kind: 'show'; id: string };

/** Sentence starts, conservative: a terminal mark followed by a capital. */
function sentenceStarts(text: string): number[] {
  const out = [0];
  const re = /[.!?]\s+(?=[A-Z0-9"'(…])/g;
  for (let m = re.exec(text); m; m = re.exec(text)) out.push(m.index + m[0].length);
  return out;
}

/** Where a square is first named at or after `from`: bare ("d5") or as a SAN
 *  destination ("Nxd5"). -1 when it is not. */
function mentionAt(text: string, square: string, from = 0): number {
  const re = new RegExp(`(?<![0-9])${square}(?![0-9])`, 'g');
  re.lastIndex = from;
  const m = re.exec(text);
  return m ? m.index : -1;
}

/** Where a fact's own sentence starts in what is spoken: its opening words,
 *  -1 when the fact is not in the text. */
function saidAt(text: string, said: string): number {
  const head = said.replace(/\s+/g, ' ').trim().slice(0, 40);
  return head ? text.indexOf(head) : -1;
}

/** Where words are first said, whole and case-blind, at or after `from`. */
function wordsAt(text: string, words: string, from = 0): number {
  const esc = words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'gi');
  re.lastIndex = from;
  const m = re.exec(text);
  return m ? m.index : -1;
}

/** How a mark found its words: its square, its piece's words, the ply before
 *  it in its line, its fact's sentence — or none, and it goes up with the last
 *  sentence (`tail`). */
export type MarkAnchor = 'square' | 'words' | 'follow' | 'said' | 'tail';

/** Where each mark goes up in the text, and what anchored it. */
export function placeMarks(text: string, marks: readonly PacedMark[]): Array<{ id: string; pos: number; anchor: MarkAnchor }> {
  const starts = sentenceStarts(text);
  const cursor = new Map<string, number>();
  const placed: Array<{ id: string; pos: number; anchor: MarkAnchor }> = [];
  const tail: string[] = [];
  // The last placed ply of each line, so an unnamed ply follows it.
  const groupAt = new Map<string, number>();
  for (const mk of marks) {
    let best = -1;
    let anchor: MarkAnchor = 'square';
    // A line's ply is looked for from where the line has reached.
    const floor = mk.group !== undefined ? (groupAt.get(mk.group) ?? 0) : 0;
    // Only a LINE's plies use the mentions up, one ply per mention: a
    // highlight and an arrow on the same square go up together at its name.
    const ckey = (k: string): string => `${mk.group ?? ''}|${k}`;
    for (const sq of mk.squares) {
      const at = mentionAt(text, sq, Math.max(floor, cursor.get(ckey(sq)) ?? 0));
      if (at >= 0 && (best < 0 || at < best)) best = at;
    }
    if (best < 0) {
      anchor = 'words';
      for (const w of mk.words ?? []) {
        const key = ckey(`w:${w.toLowerCase()}`);
        const at = wordsAt(text, w, Math.max(floor, cursor.get(key) ?? 0));
        if (at >= 0 && (best < 0 || at < best)) { best = at; if (mk.group !== undefined) cursor.set(key, at + w.length); }
      }
    } else if (mk.group !== undefined) {
      for (const sq of mk.squares) if (mentionAt(text, sq, best) === best) cursor.set(ckey(sq), best + sq.length);
    }
    if (best < 0 && mk.group !== undefined && groupAt.has(mk.group)) {
      // Said by its shape: right after the ply before it.
      best = (groupAt.get(mk.group) as number) + 1;
      anchor = 'follow';
    }
    if (best < 0 && mk.said) { best = saidAt(text, mk.said); anchor = 'said'; }
    if (best < 0) { tail.push(mk.id); continue; }
    if (mk.group !== undefined) groupAt.set(mk.group, best);
    placed.push({ id: mk.id, pos: best, anchor });
  }
  const lastStart = starts[starts.length - 1];
  for (const id of tail) placed.push({ id, pos: lastStart, anchor: 'tail' });
  return placed.sort((a, b) => a.pos - b.pos);
}

/** The schedule. A line's plies landing on the same square appear one per
 *  mention, in order; any other marks that share a square go up together at
 *  its first mention. */
export function scheduleMarks(text: string, marks: readonly PacedMark[], msPerChar = MS_PER_CHAR): MarkEvent[] {
  const starts = sentenceStarts(text);
  const sentenceOf = (pos: number): number => { let s = 0; for (let i = 0; i < starts.length; i++) if (starts[i] <= pos) s = i; return s; };
  const placed = placeMarks(text, marks);
  const events: MarkEvent[] = [];
  let shownSentence = -1;
  for (const p of placed) {
    const s = sentenceOf(p.pos);
    if (s !== shownSentence) {
      if (shownSentence >= 0) events.push({ atMs: starts[s] * msPerChar, kind: 'clear' });
      shownSentence = s;
    }
    events.push({ atMs: p.pos * msPerChar, kind: 'show', id: p.id });
  }
  return events;
}

/** Run a schedule: `paint` gets the ids shown so far at each event, while
 *  `current()` holds (a newer line owns the board otherwise). Returns the
 *  total time the schedule covers. */
export function runMarkSchedule(
  text: string,
  marks: readonly PacedMark[],
  paint: (shown: ReadonlySet<string>) => void,
  current: () => boolean,
  msPerChar = MS_PER_CHAR,
): number {
  const shown = new Set<string>();
  const events = scheduleMarks(text, marks, msPerChar);
  for (const ev of events) {
    setTimeout(() => {
      if (!current()) return;
      if (ev.kind === 'clear') shown.clear(); else shown.add(ev.id);
      paint(shown);
    }, ev.atMs);
  }
  return Math.max(text.length * msPerChar, ...events.map((e) => e.atMs));
}
