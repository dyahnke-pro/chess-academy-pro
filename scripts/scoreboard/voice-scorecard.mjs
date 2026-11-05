// THE VOICE SCORECARD (David 2026-11-05: "Are we finally saying teaching
// ideas?" → "Do you understand the type of words I want to be hearing from
// coach?"). Every sentence the Learn voice spoke in a replay, typed by what it
// does for the student:
//   TEACHING — the point of a move, a consequence, the plan, what to prevent,
//              the tempting move refuted, knowledge, the habit that fits;
//   or one of the kinds he does not want to hear:
//   filler       stock advice that fits any board ("nothing hinges on your
//                next move", "keep your options open");
//   hedge        a sentence that says a difference exists and not what it is;
//   rule         a textbook rule recited ("…follows a rule worth keeping");
//   description  a piece's reach with no reason ("their pawn eyes b4");
//   misplaced    a habit about something not happening now — typed by the
//                LLM judge (`voice-judge.mjs`); a pattern cannot tell (the king
//                habit it once flagged is about the NEXT move, the king's).
// A sentence is said once a turn (the log carries each line twice: the page's
// text and the voice's). The patterns are the instrument, not the product:
// each is pinned by the lines the 2026-11-05 tapes actually spoke.
//
//   node scripts/scoreboard/voice-scorecard.mjs <learn-replay.json …> [--show]
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const show = args.includes('--show');
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length) { console.error('usage: node scripts/scoreboard/voice-scorecard.mjs <learn-replay.json …> [--show]'); process.exit(2); }

const BAD = [
  ['filler', /nothing hinges on your next move|keep your clock for|not a big decision|a few moves do the same job|keep your options open|the pawn move will still be there later/i],
  ['hedge', /another move was worth the same|weigh what each leaves behind|has a point of its own/i],
  ['rule', /follows a rule worth keeping|^the rule behind /i],
  ['description', /^(?:their|your) [\w-]+(?: [\w-]+)?(?: on [a-h][1-8])? (?:now )?(?:eyes|adds its weight to|joins the fight for|fights for) [^—;:,]*\.$/i],
];

const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z…])/).map((x) => x.trim()).filter(Boolean);
const tally = new Map([['teaching', 0], ['filler', 0], ['hedge', 0], ['rule', 0], ['description', 0], ['misplaced', 0]]);
const examples = new Map();
let turns = 0; let words = 0; let silent = 0;
for (const f of files) {
  const r = JSON.parse(readFileSync(f, 'utf8'));
  for (const t of r.turns) {
    if (typeof t.ply !== 'number') continue;
    turns += 1;
    const said = [...new Set((t.lines ?? []).map((x) => (typeof x === 'string' ? x : x.text ?? '')))];
    // The voice reads the page's line again with SAN spoken out ("Knight to d7"):
    // one utterance, so keep the first of each pair by its first words' shape.
    const seen = new Set();
    const utterances = said.filter((s) => {
      const key = s.replace(/[^a-z]/gi, '').toLowerCase().slice(0, 12);
      if (seen.has(key)) return false; seen.add(key); return true;
    });
    if (!utterances.length) silent += 1;
    for (const u of utterances) {
      for (const s of sentences(u)) {
        words += s.split(/\s+/).length;
        let type = BAD.find(([, re]) => re.test(s))?.[0] ?? 'teaching';
        tally.set(type, tally.get(type) + 1);
        const ex = examples.get(type) ?? []; if (ex.length < 4) ex.push(`${r.game} ${t.move}: ${s}`); examples.set(type, ex);
      }
    }
  }
}
const total = [...tally.values()].reduce((a, b) => a + b, 0);
console.log(`${files.length} games · ${turns} turns (${silent} silent) · ${total} sentences · ${(words / Math.max(turns, 1)).toFixed(0)} words a turn`);
for (const [k, n] of tally) console.log(`  ${k.padEnd(12)} ${String(n).padStart(4)}  ${(100 * n / Math.max(total, 1)).toFixed(1)}%`);
if (show) for (const [k, ex] of examples) { if (k === 'teaching') continue; console.log(`\n${k}:`); for (const e of ex) console.log(`  ${e}`); }
