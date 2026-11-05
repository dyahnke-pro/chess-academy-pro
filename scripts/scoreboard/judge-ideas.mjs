// THE IDEA YARDSTICK (David 2026-11-05: "forget the wording. Let's gage based
// on idea"). On his own games replayed through today's Learn, a judge reads,
// for each Learn turn (the student's move and the coach's reply), HIS OWN
// WORDS at those two moves and lists the chess ideas he gives — then checks
// each one against what the app did on that turn:
//   SAID   — a line the app spoke gives the same chess point (any wording);
//   HELD   — only a line the app computed and did not speak gives it (what a
//            better decider could have picked);
//   PART   — a related fact, not his point;
//   NO     — nothing the app had carries it.
// It also flags any spoken line that says the OPPOSITE of him (CONTRA).
//
// His words are reference only (plagiarism guard): read from the bank outside
// the repo, sent to the judge, and never written to the report — the report
// keeps his ideas as the judge's one-line summaries.
//
//   DEEPSEEK_KEY=… BANK_DIR=<bank> node scripts/scoreboard/judge-ideas.mjs <out.json> <learn-replay.json …>
//   JUDGE_MODEL=deepseek-reasoner for the second read.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { TEACHING_MOVE_LIST } from '../../src/services/teachingMoves.ts';

const [OUT, ...FILES] = process.argv.slice(2);
const BANK = process.env.BANK_DIR;
const KEY = (process.env.DEEPSEEK_KEY ?? '').trim();
const MODEL = process.env.JUDGE_MODEL ?? 'deepseek-chat';
if (!OUT || !FILES.length || !BANK || !KEY) { console.error('usage: DEEPSEEK_KEY=… BANK_DIR=… node judge-ideas.mjs <out.json> <replay.json …>'); process.exit(2); }
const TAX = readFileSync(new URL('./taxonomy.md', import.meta.url), 'utf8');
// The codes are the one list in code (`teachingMoves.ts`, held to the
// taxonomy file by its test); the file gives the judge their definitions.
const CODES = new Set([...TEACHING_MOVE_LIST, 'X-NARRATION']);
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

const SYSTEM = `You compare a chess coach app with a grandmaster teaching the same game.
You get one moment of the game: the student's move and the opponent's reply, the board after them, the GRANDMASTER'S OWN WORDS around those two moves (an automatic transcript of him thinking out loud while he played — messy, and words may bleed in from neighbouring moves), the lines the APP SPOKE, and the lines the app COMPUTED but did not speak.
1. List the chess IDEAS the grandmaster gives about THESE two moves or the position they make — each one a short, concrete chess point in your own words (a plan, a threat, why a move is played or ruled out, what a reply would be met with, an assessment…). Leave out chat, greetings and pure move-calling. If he gives none, return an empty list.
2. For each idea, the verdict: SAID if a line the app spoke gives the same chess point (any wording); HELD if only a line the app computed but did not speak gives it; PART if the app has a related fact but not his point; NO if nothing the app had carries it. Also give the idea one teaching-move code from this taxonomy:
${TAX}
3. CONTRA: list any line the app SPOKE that says the opposite of a point he makes (quote the app line, and say which of his ideas it contradicts).
Reply JSON: {"ideas":[{"idea":"…","code":"…","verdict":"SAID|HELD|PART|NO","by":"the app line that carries it, or empty"}],"contra":[{"app":"…","his":"…"}]}`;

function bankWords(vid) {
  const f = `${BANK}/${vid}.json`;
  if (!existsSync(f)) return null;
  const b = JSON.parse(readFileSync(f, 'utf8'));
  // The live game only: the analysis begins at the first move the voiced file
  // re-anchors (its moves aligned one for one with the bank's).
  const vf = `data/video-narration-voiced/${vid}.json`;
  const voiced = existsSync(vf) ? JSON.parse(readFileSync(vf, 'utf8')).moves : [];
  const byPly = new Map();
  for (let i = 0; i < b.moves.length; i += 1) {
    if (voiced[i]?.reanchor) break;
    const m = b.moves[i];
    if (m.said?.trim() && !byPly.has(m.ply)) byPly.set(m.ply, m.said.trim());
  }
  return byPly;
}

async function judge(payload) {
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, ...(MODEL === 'deepseek-chat' ? { temperature: 0, response_format: { type: 'json_object' } } : {}),
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: payload + (MODEL === 'deepseek-chat' ? '' : '\n\nReply with the JSON only.') }] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = (await r.json()).choices[0].message.content;
      const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
      return { ideas: (j.ideas ?? []).map((x) => ({ ...x, code: CODES.has(x.code) ? x.code : null })), contra: j.contra ?? [] };
    } catch (e) {
      if (a === 3) { console.log(`judge failed: ${e.message}`); return null; }
      await new Promise((res) => setTimeout(res, 2000 * (a + 1)));
    }
  }
  return null;
}

const jobs = [];
for (const file of FILES) {
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const words = bankWords(r.game);
  if (!words) { console.log(`no bank for ${r.game}`); continue; }
  for (const t of r.turns) {
    const key = `${r.game}:${t.ply}`;
    const his = [words.get(t.ply), words.get(t.ply + 1)].filter(Boolean).join(' … ');
    if (!his || done[key]) continue;
    // The replay DICTATES the coach's moves ("play Bxf7+"): the page's
    // acknowledgement of that typed line is the harness, not the coach.
    const harness = (x) => /^Got it — after your move, they play /.test(x);
    const spoken = [...new Set([...(t.lines ?? []), ...(t.everything ?? []).flatMap((row) => row.lines.filter((l) => l.said).map((l) => l.text))])].filter((x) => !harness(x));
    const said = new Set(spoken);
    const held = [...new Set((t.everything ?? []).flatMap((row) => row.lines.filter((l) => !l.said).map((l) => l.text)))].filter((x) => !said.has(x));
    const move = t.move.replace(/^\d+\.+/, '');
    jobs.push({ key, game: r.game, ply: t.ply, payload: [
      `Student plays ${r.seat}. The student's move: ${t.move}. The opponent's reply: ${t.reply ?? '(none)'}.`,
      `GRANDMASTER'S WORDS: ${his}`,
      `APP SPOKE:\n${spoken.map((x) => `- ${x}`).join('\n') || '(nothing)'}`,
      `APP COMPUTED, NOT SPOKEN:\n${held.map((x) => `- ${x}`).join('\n') || '(nothing)'}`,
    ].join('\n\n'), spoken: spoken.length, held: held.length, move });
  }
}
console.log(`${jobs.length} turns to judge with ${MODEL}`);
let n = 0;
const q = [...jobs];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (q.length) {
    const j = q.shift();
    const v = await judge(j.payload);
    if (v) done[j.key] = { game: j.game, ply: j.ply, move: j.move, spoken: j.spoken, held: j.held, ...v };
    if (++n % 20 === 0) { writeFileSync(OUT, JSON.stringify(done)); console.log(`judged ${n}/${jobs.length}`); }
  }
}));
writeFileSync(OUT, JSON.stringify(done));

// THE SCORE
const rows = Object.values(done);
const ideas = rows.flatMap((r) => r.ideas);
const c = (v) => ideas.filter((i) => i.verdict === v).length;
const pct = (x) => `${(100 * x / Math.max(ideas.length, 1)).toFixed(1)}%`;
console.log(`\n${rows.length} turns · ${ideas.length} of his ideas · SAID ${c('SAID')} (${pct(c('SAID'))}) · HELD ${c('HELD')} (${pct(c('HELD'))}) · PART ${c('PART')} (${pct(c('PART'))}) · NO ${c('NO')} (${pct(c('NO'))})`);
console.log(`the ceiling (SAID + HELD): ${pct(c('SAID') + c('HELD'))} · lines that contradict him: ${rows.reduce((s, r) => s + r.contra.length, 0)}`);
const byCode = new Map();
for (const i of ideas) { const k = i.code ?? '?'; const e = byCode.get(k) ?? { n: 0, SAID: 0, HELD: 0, PART: 0, NO: 0 }; e.n += 1; e[i.verdict] = (e[i.verdict] ?? 0) + 1; byCode.set(k, e); }
console.log(`\n${'his idea, by teaching move'.padEnd(26)}${'n'.padStart(4)}${'said'.padStart(6)}${'held'.padStart(6)}${'part'.padStart(6)}${'no'.padStart(6)}`);
for (const [k, e] of [...byCode.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`${k.padEnd(26)}${String(e.n).padStart(4)}${String(e.SAID).padStart(6)}${String(e.HELD).padStart(6)}${String(e.PART).padStart(6)}${String(e.NO).padStart(6)}`);
}
