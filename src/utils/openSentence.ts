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

/**
 * A move's teaching sentence has a subject. The board teacher writes some
 * reasons verb-first ("Stakes a claim in the center…", "Forces the king to
 * react…") so a caller can hang them on its own subject; spoken bare they are
 * fragments (review audit 2026-10-14). This is the ONE place a stem gets one:
 * a verb-first sentence takes `subject` ("d4 stakes a claim…"), a sentence
 * that already has a subject is returned as is.
 */
const HAS_SUBJECT = /^(The|It|Its|Your|You|Their|They|That|This|These|Those|A|An|Now|Nothing|Every|Each|Both|No|Castling|There|Here|If|When|With|After|Once|Careful)\b/;
export function withSubject(sentence: string, subject: string): string {
  const s = sentence.trim();
  if (!s || HAS_SUBJECT.test(s)) return s;
  if (/^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8]|^O-O/.test(s)) return s;
  return `${subject} ${continueSentence(s)}`;
}
