// THE BANTER FILTER, PASS 2 — cut banter out of long run-on sentences.
// Older transcripts have no punctuation, so one "sentence" can run 60 words
// and carry both chess and stream talk ("…bishop g4 seems like a great
// improvement even to bishop f5 thank you … for the prime"). Pass 1
// (strip-banter.mjs) keeps such a sentence whole; this pass asks for the banter
// PHRASES inside it, copied exactly, checks each one really is in the text, and
// cuts only those. Nothing is ever rewritten — words are only removed.
//
// The transcripts are REFERENCE ONLY (plagiarism guard): input and output stay
// outside the repo.
//
//   DEEPSEEK_KEY=… IN_DIR=<pass-1 dir> OUT_DIR=<out dir> node scripts/scoreboard/cut-banter-spans.mjs [videoId …]
//
// Resumable (a video already in OUT_DIR is skipped); one progress line per video.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';

const IN = process.env.IN_DIR;
const OUT = process.env.OUT_DIR;
const KEY = (process.env.DEEPSEEK_KEY ?? '').trim();
if (!IN || !OUT || !KEY) { console.error('IN_DIR, OUT_DIR and DEEPSEEK_KEY are required'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const LONG = 25;

const only = process.argv.slice(2);
const files = readdirSync(IN).filter((f) => f.endsWith('.json') && !f.startsWith('_') && (only.length === 0 || only.includes(f.replace(/\.json$/, ''))));

const SYSTEM = `Each numbered passage is a stretch of a grandmaster's live-stream speech while he plays chess (automatic transcript, often unpunctuated). Some passages carry banter mixed into the chess.
For each passage, copy out EXACTLY, word for word, every phrase that is banter: greetings and sign-offs, who the opponent is (name, rating, reputation), chat and viewers (thanks, subs, primes, donations, names of viewers being thanked, answering chat about things other than the position), tournament standings, stream logistics, jokes or personal talk unrelated to the position.
Never copy chess talk (moves, ideas, plans, evaluations, the engine, trades, his doubts about a move, advice). A viewer's question ABOUT THE POSITION is chess: copy only the viewer's name and "asks", never the question. Copy the shortest exact phrase that removes the banter. If a passage has none, give an empty list.
Reply JSON {"cut":{"0":["exact phrase", ...],"1":[],...}}.`;

async function ask(batch) {
  const body = batch.map((s, i) => `${i}: ${s}`).join('\n');
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', temperature: 0, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: SYSTEM }, { role: 'user', content: body }] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const c = JSON.parse((await r.json()).choices[0].message.content).cut ?? {};
      return batch.map((_, i) => (Array.isArray(c[String(i)]) ? c[String(i)].filter((x) => typeof x === 'string') : []));
    } catch (e) {
      if (a === 3) { console.log(`batch failed (${e.message}) — left as is`); return batch.map(() => []); }
      await new Promise((res) => setTimeout(res, 2000 * (a + 1)));
    }
  }
  return batch.map(() => []);
}

function sentences(text) {
  return String(text).replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

/** Cut each phrase that is really in the passage (case-insensitive); never
 *  more than the phrase, never a phrase that is not there. */
function cut(passage, phrases) {
  let out = passage; let removed = 0;
  for (const p of phrases) {
    const q = p.trim();
    if (q.split(/\s+/).length < 2) continue;
    const at = out.toLowerCase().indexOf(q.toLowerCase());
    if (at < 0) continue;
    out = `${out.slice(0, at)} ${out.slice(at + q.length)}`;
    removed += q.split(/\s+/).length;
  }
  return { text: out.replace(/\s+/g, ' ').trim(), removed };
}

const reportPath = `${OUT}/_report.json`;
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : {};

async function run(f) {
  const vid = f.replace(/\.json$/, '');
  if (existsSync(`${OUT}/${f}`)) return;
  const bank = JSON.parse(readFileSync(`${IN}/${f}`, 'utf8'));
  const parts = bank.moves.map((m) => sentences(m.said ?? ''));
  const long = [];
  parts.forEach((ss, mi) => ss.forEach((s, si) => { if (s.split(/\s+/).length > LONG) long.push({ mi, si, s }); }));
  let removed = 0; const sample = [];
  for (let i = 0; i < long.length; i += 20) {
    const batch = long.slice(i, i + 20);
    const res = await ask(batch.map((x) => x.s));
    batch.forEach((x, k) => {
      const c = cut(x.s, res[k]);
      if (c.removed) { removed += c.removed; parts[x.mi][x.si] = c.text; if (sample.length < 8) sample.push(...res[k].slice(0, 2)); }
    });
  }
  const moves = bank.moves.map((m, i) => ({ ...m, said: parts[i].join(' ') }));
  writeFileSync(`${OUT}/${f}`, JSON.stringify({ ...bank, moves }));
  report[vid] = { long: long.length, removedWords: removed, sample };
  writeFileSync(reportPath, JSON.stringify(report));
  console.log(`${vid}: ${long.length} long sentences, cut ${removed} words`);
}

const q = [...files];
await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) await run(q.shift()); }));
const r = Object.values(report);
console.log(`DONE ${r.length} videos — cut ${r.reduce((n, x) => n + x.removedWords, 0)} words from ${r.reduce((n, x) => n + x.long, 0)} long sentences`);
