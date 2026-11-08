/**
 * THE ROBOTIC PATTERNS — one list, read by the counter (`robotic-count.mjs`)
 * and the gate (`src/test/humanVoice.gate.test.ts`). Each is something a
 * coach at the board does not say (David 2026-11-08, reading the threat
 * answer: "I like your wording better than the robotic wording of the app"):
 *
 *  - dash-chain     two or more " — " in one sentence: clauses bolted on;
 *  - move-chain     "you play …, they answer …, you play …" four times or
 *                   more in a sentence: a line read out like a score sheet;
 *  - square-repeat  the same square named three times in one line;
 *  - long-sentence  more than 32 words in one sentence;
 *  - eyeing         "eyeing": a machine's word for "attacks";
 *  - stock-opener   "Beyond that", "Anything else, like …": template seams;
 *  - engine-talk    "the engine's …": the coach hiding behind its tool;
 *  - semicolon      a semicolon read aloud.
 *
 * A bracketed lane tag ("[timing] …") is a row label, never spoken.
 */
export const MARKS = ['dash-chain', 'move-chain', 'square-repeat', 'long-sentence', 'eyeing', 'stock-opener', 'engine-talk', 'semicolon'];

// A sentence starts on a capital, an ellipsis, a quote — or a pawn move ("g3
// was stronger", "e5 sidesteps …"): without the last, a line's next sentence
// was glued to the one before it and read as one 37-word sentence.
const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-Z…"]|[a-h](?:x[a-h])?[1-8]\b)/).filter((s) => s.trim());

/** The marks in one spoken line, each with the bit that tripped it. */
export function roboticMarks(raw) {
  const text = raw.replace(/\[[a-z][a-z-]*\]\s*/g, '').trim();
  const out = [];
  for (const s of sentences(text)) {
    if ((s.match(/ — /g) ?? []).length >= 2) out.push({ mark: 'dash-chain', hit: s.slice(0, 90) });
    if ((s.match(/\b(?:you|they) (?:play|answer|castle)\b/g) ?? []).length >= 4) out.push({ mark: 'move-chain', hit: s.slice(0, 90) });
    const words = s.split(/\s+/).filter(Boolean).length;
    if (words > 32) out.push({ mark: 'long-sentence', hit: `${words} words: ${s.slice(0, 70)}` });
    if (s.includes(';')) out.push({ mark: 'semicolon', hit: s.slice(Math.max(0, s.indexOf(';') - 40), s.indexOf(';') + 30) });
  }
  const squares = text.match(/\b[a-h][1-8]\b/g) ?? [];
  const counts = {};
  for (const sq of squares) counts[sq] = (counts[sq] ?? 0) + 1;
  for (const [sq, n] of Object.entries(counts)) if (n >= 3) out.push({ mark: 'square-repeat', hit: `${sq} ×${n}` });
  const eye = /\beyeing\b/i.exec(text);
  if (eye) out.push({ mark: 'eyeing', hit: text.slice(Math.max(0, eye.index - 30), eye.index + 40) });
  const open = /\b(?:Beyond that|Anything else, like)\b/.exec(text);
  if (open) out.push({ mark: 'stock-opener', hit: text.slice(open.index, open.index + 60) });
  const eng = /\bthe engine(?:'s)?\b/i.exec(text);
  if (eng) out.push({ mark: 'engine-talk', hit: text.slice(Math.max(0, eng.index - 20), eng.index + 50) });
  return out;
}
