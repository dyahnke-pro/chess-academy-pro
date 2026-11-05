// THE VOICE JUDGE — what KIND of sentence the coach speaks, by David's own
// definition (CLAUDE.md "WHAT TEACHING IS"; David 2026-11-05: "Do you
// understand the type of words I want to be hearing from coach?"). The
// pattern scorecard (`voice-scorecard.mjs`) only catches phrases it knows; a
// description in new words slips past it. This reads every spoken sentence of
// a Learn replay and types it by meaning, one fixed rubric, temperature 0, each
// sentence's verdict cached by its exact text so a re-run (and the build
// after) reads the same sentence the same way.
//
// An INSTRUMENT, never the product: nothing here decides what the coach says.
//
//   DEEPSEEK_KEY=… node scripts/scoreboard/voice-judge.mjs <cache.json> <learn-replay.json …> [--show]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const show = args.includes('--show');
const [CACHE, ...FILES] = args.filter((a) => !a.startsWith('--'));
const KEY = (process.env.DEEPSEEK_KEY ?? '').trim();
if (!CACHE || !FILES.length || !KEY) { console.error('usage: DEEPSEEK_KEY=… node voice-judge.mjs <cache.json> <replay.json …> [--show]'); process.exit(2); }
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

export const TEACHING = ['POINT', 'CONSEQUENCE', 'PLAN', 'PREVENT', 'REFUTED', 'LINE', 'KNOWLEDGE', 'HABIT', 'ASSESSMENT', 'DANGER'];
export const NOT_TEACHING = ['DESCRIPTION', 'FILLER', 'HEDGE', 'RULE', 'MISPLACED', 'NAMING', 'PRAISE', 'OTHER'];

const SYSTEM = `You judge a chess coach's spoken sentences for a student, one by one.
The owner's definition: "teaching is not telling you what to do — teaching is showing you how to think: what to recognize, how to plan, how to identify, prevent, strategize, and the consequences of a move", plus the knowledge that takes years to find alone (named patterns, technique, the hidden rules).
Give each sentence exactly one type.
TEACHING types:
- POINT: what a specific move is FOR (its purpose, what it prepares or stops) — e.g. "Their Bxe5 stops your Nc4 and prepares g4 to hit your h-pawn".
- CONSEQUENCE: what a move changed or allowed, with its effect — e.g. "Your b-pawn push left a4 weak for good".
- PLAN: where to go next and why — e.g. "The e-file is half-open — your rook belongs there".
- PREVENT: what the opponent wants or threatens and how to stop it.
- REFUTED: a tempting move and why it fails — e.g. "cxd4 is tempting, but Bxh6 wins a bishop".
- LINE: a concrete sequence played out in words ("if they take, you take back and …").
- KNOWLEDGE: a named pattern, technique, or an opening/structure idea WITH its why.
- HABIT: a thinking habit or question that fits THIS moment ("before you capture, ask what it leaves loose").
- ASSESSMENT: who stands better and the concrete reason.
- DANGER: a concrete warning about a real threat to the student's piece or king.
NOT teaching:
- DESCRIPTION: states what a piece sees, attacks, controls or guards, or where it stands, with no reason why it matters for a plan or decision ("Their pawn eyes the pawn on b4", "Their bishop adds its weight to d6").
- FILLER: stock advice true of almost any position ("nothing hinges on your next move", "keep your options open").
- HEDGE: says a difference or choice exists without saying what it is.
- RULE: a textbook rule recited for a routine move ("castling follows a rule worth keeping: castle your king to safety").
- MISPLACED: a habit or advice about something that is not happening now.
- NAMING: only names the opening or the move, no idea.
- PRAISE: credit with no chess reason.
- OTHER: anything else (greetings, game status).
Judge the sentence as the student hears it. A sentence that mixes a description with a real reason is the teaching type of the reason.
Reply JSON: {"types":["TYPE", …]} — one per sentence, in order.`;

const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z…])/).map((x) => x.trim()).filter(Boolean);

async function judge(context, list) {
  const body = {
    model: 'deepseek-chat', temperature: 0, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `${context}\nSentences:\n${list.map((s, i) => `${i + 1}. ${s}`).join('\n')}` }],
  };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      const types = JSON.parse(j.choices?.[0]?.message?.content ?? '{}').types;
      if (Array.isArray(types) && types.length === list.length) return types.map((t) => String(t).toUpperCase());
    } catch { /* retried */ }
  }
  return list.map(() => 'UNJUDGED');
}

const tally = new Map([...TEACHING, ...NOT_TEACHING, 'UNJUDGED'].map((t) => [t, 0]));
const examples = new Map();
let turns = 0; let words = 0;
for (const f of FILES) {
  const r = JSON.parse(readFileSync(f, 'utf8'));
  for (const t of r.turns) {
    if (typeof t.ply !== 'number') continue;
    turns += 1;
    const said = [...new Set((t.lines ?? []).map((x) => (typeof x === 'string' ? x : x.text ?? '')))];
    const seen = new Set();
    const utter = said.filter((s) => { const k = s.replace(/[^a-z]/gi, '').toLowerCase().slice(0, 12); if (seen.has(k)) return false; seen.add(k); return true; });
    const sents = utter.flatMap(sentences);
    const fresh = sents.filter((s) => !(s in cache));
    if (fresh.length) {
      const types = await judge(`The student's move: ${t.move}. The opponent's reply: ${t.reply ?? '—'}.`, fresh);
      fresh.forEach((s, i) => { cache[s] = types[i]; });
      writeFileSync(CACHE, JSON.stringify(cache, null, 1));
    }
    for (const s of sents) {
      words += s.split(/\s+/).length;
      const ty = tally.has(cache[s]) ? cache[s] : 'OTHER';
      tally.set(ty, tally.get(ty) + 1);
      const ex = examples.get(ty) ?? []; if (ex.length < 3) ex.push(`${r.game} ${t.move}: ${s}`); examples.set(ty, ex);
    }
  }
}
const total = [...tally.values()].reduce((a, b) => a + b, 0);
const teach = TEACHING.reduce((a, t) => a + tally.get(t), 0);
console.log(`${FILES.length} games · ${turns} turns · ${total} sentences · ${(words / Math.max(turns, 1)).toFixed(0)} words a turn`);
console.log(`TEACHING ${teach} = ${(100 * teach / Math.max(total, 1)).toFixed(1)}% · not teaching ${total - teach} = ${(100 * (total - teach) / Math.max(total, 1)).toFixed(1)}%`);
for (const [k, n] of [...tally.entries()].filter(([, n]) => n).sort((a, b) => b[1] - a[1])) console.log(`  ${(TEACHING.includes(k) ? '+ ' : '- ') + k.padEnd(12)} ${String(n).padStart(4)}  ${(100 * n / Math.max(total, 1)).toFixed(1)}%`);
if (show) for (const [k, ex] of examples) { if (TEACHING.includes(k)) continue; console.log(`\n${k}:`); for (const e of ex) console.log(`  ${e}`); }
