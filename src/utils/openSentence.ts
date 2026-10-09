/**
 * A reply starts with a capital (hand walk 2026-10-09: "bishop to b5 with check
 * (Bb5+) is the best move here" — a spoken move name opened the answer in lower
 * case). A square or a pawn move ("e4 is …", "dxe5 wins …") is notation and
 * stays as written.
 */
export function openSentence(text: string): string {
  const lead = /^(\s*["'“(]?)([a-z])/.exec(text);
  if (!lead) return text;
  if (/^\s*["'“(]?[a-h](?:[1-8]|x[a-h])/.test(text)) return text;
  return text.slice(0, lead[1].length) + lead[2].toUpperCase() + text.slice(lead[1].length + 1);
}
