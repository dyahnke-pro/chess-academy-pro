// claimSentences — ONE sentence splitter for everything that keeps or drops
// narration a sentence at a time (the voice package's dedupe and every
// board / eval / material claim stripper).
//
// A MOVE QUESTION BELONGS TO ITS ANSWER. "cxb3? Then axb3, and the rook
// falls." is ONE claim. Split at the "?", a stripper could judge the answer
// (a line about a FUTURE board) against the present one, drop it, and leave
// the bare "cxb3?" to be spoken — the 1380 hand walk heard exactly that
// ("c-pawn takes b3? Two moves keep the win here."). The glue lived in the
// voice package only; the strippers each split on their own and reopened it.
// One splitter makes the orphan impossible to express.
//
// A TEACHING QUESTION BELONGS TO ITS ANSWER too ("What do you do about it?
// Take it — Bxd1 …", "Do you have to react? No — Qxd5 comes first"). Split
// apart, the dedupe dropped the stem as said-before and left a bare answer
// (walk 2026-09-30). A short question (≤ 40 characters) glues to the next.
//
// Likewise "Here's how: …" belongs to the sentence it explains.

const BREAK = /(?<=[.!?])\s+/;
const BREAK_OR_NEWLINE = /(?<=[.!?])\s+|\n+/;

export function claimSentences(text: string, opts: { newlines?: boolean } = {}): string[] {
  const raw = text.split(opts.newlines ? BREAK_OR_NEWLINE : BREAK).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    if ((/^[^\s]{1,12}\?$/.test(raw[i]) || (raw[i].length <= 40 && raw[i].endsWith('?'))) && i + 1 < raw.length) {
      out.push(`${raw[i]} ${raw[i + 1]}`);
      i += 1;
    } else if (/^Here['’]s how:/.test(raw[i]) && out.length > 0) {
      out[out.length - 1] = `${out[out.length - 1]} ${raw[i]}`;
    } else out.push(raw[i]);
  }
  return out;
}
