// MARKS APPEAR AS THEY ARE MENTIONED (David 2026-10-19: "all mentioned squares
// light up at the beginning of the narration, they need to light up AS THEY
// ARE MENTIONED" … "arrows need to appear as the moves are mentioned").
//
// The ONE schedule for every Learn speech path. Given the text the voice is
// about to speak and the marks the kept facts carry, it says when each mark
// goes up: at the character where its square is first named, on the same
// ~55ms/char clock the paced reveal has always used (never TTS word timing).
// A sentence that names a mark clears the previous sentence's marks as it
// starts (David 2026-09-13: "stack until next phrase is spoken"), so a line's
// moves accumulate inside their sentence and give way to the next idea.
// A mark no sentence names goes up with the last sentence — never lost.
// A leaf: no imports.

export const MS_PER_CHAR = 55;

export interface PacedMark {
  /** Caller's handle for the mark (an arrow or a highlight). */
  id: string;
  /** The squares that announce it: an arrow's destination (then its origin), a
   *  highlight's square. The first one the text names wins. */
  squares: readonly string[];
}

export type MarkEvent =
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

/** The schedule. Marks that share a square are revealed in order of their
 *  ids' position in `marks` at successive mentions — a line's plies landing on
 *  the same square appear one per mention. */
export function scheduleMarks(text: string, marks: readonly PacedMark[], msPerChar = MS_PER_CHAR): MarkEvent[] {
  const starts = sentenceStarts(text);
  const sentenceOf = (pos: number): number => { let s = 0; for (let i = 0; i < starts.length; i++) if (starts[i] <= pos) s = i; return s; };
  const cursor = new Map<string, number>();
  const placed: Array<{ id: string; pos: number }> = [];
  const tail: string[] = [];
  for (const mk of marks) {
    let best = -1;
    for (const sq of mk.squares) {
      const at = mentionAt(text, sq, cursor.get(sq) ?? 0);
      if (at >= 0 && (best < 0 || at < best)) best = at;
    }
    if (best < 0) { tail.push(mk.id); continue; }
    for (const sq of mk.squares) if (mentionAt(text, sq, best) === best) cursor.set(sq, best + sq.length);
    placed.push({ id: mk.id, pos: best });
  }
  const lastStart = starts[starts.length - 1];
  for (const id of tail) placed.push({ id, pos: lastStart });
  placed.sort((a, b) => a.pos - b.pos);
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
