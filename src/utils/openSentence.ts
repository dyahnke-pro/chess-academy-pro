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

/**
 * The other direction: a sentence carried on after a colon or a dash starts
 * lower-case — but only a plain word. A move ("Nxe4", "O-O", "Qd2+") is
 * notation and keeps its capital, and so does "I" (the 2026-10-10 sweep: hand
 * copies turned "Nxe4 wins" into "nxe4 wins" when a reason led with a move).
 */
export function continueSentence(text: string): string {
  if (!/^[A-Z][a-z]/.test(text)) return text;
  if (/^[KQRBN][a-h]?[1-8]?x?[a-h][1-8]/.test(text) || /^O-O/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}
