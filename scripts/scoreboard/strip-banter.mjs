// THE BANTER FILTER (David 2026-11-05: "Can we have it ignore random banter not
// related to the game?"). His transcripts mix the chess with stream talk —
// "GG, next game, I'm playing Predke, he's 2680" — and the tagger counted that
// as teaching. Before anything learns from his words or is scored against
// them, every sentence is sorted: about the game on the board (kept) or
// banter (dropped). Unsure is kept: a dropped teaching sentence is lost for
// good, a kept stray one only adds noise.
//
// The transcripts are REFERENCE ONLY (plagiarism guard): input and output both
// live outside the repo; this script carries no word of his.
//
//   DEEPSEEK_KEY=… BANK_DIR=<bank> CLEAN_DIR=<out dir> node scripts/scoreboard/strip-banter.mjs [videoId …]
//
// Resumable: a video already in CLEAN_DIR is skipped. One progress line per
// video; a report of what was dropped goes to CLEAN_DIR/_report.json.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';

const BANK = process.env.BANK_DIR;
const OUT = process.env.CLEAN_DIR;
const KEY = (process.env.DEEPSEEK_KEY ?? '').trim();
if (!BANK || !OUT || !KEY) { console.error('BANK_DIR, CLEAN_DIR and DEEPSEEK_KEY are required'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const only = process.argv.slice(2);
const files = readdirSync(BANK).filter((f) => f.endsWith('.json') && (only.length === 0 || only.includes(f.replace(/\.json$/, ''))));

const SYSTEM = `You sort sentences from a grandmaster's live stream while he plays chess. For each numbered sentence answer KEEP or DROP.
The sentences are CONSECUTIVE speech (an automatic transcript, sometimes unpunctuated, so a sentence can be a fragment of the one before or after). Read each one with its neighbours: a fragment that continues or finishes a chess thought is KEEP.
KEEP — anything about the chess: the moves, the position, ideas, plans, threats, evaluations (his or the engine's: "computer gives you quality", "it's winning"), material and trades ("trading on our own terms"), candidate moves, what the opponent wants, how he chose a move, doubts about a move ("am I crazy?"), lessons and advice (including advice on using the clock), opening names and theory, and his reaction to the game ("I blundered the pawn", "this is winning").
DROP — banter not about the game on the board: greetings and sign-offs ("GG", "next game", "let's go"), who the opponent is (name, rating, title, reputation, past results), chat and viewers (questions from chat, subs, donations, thanks), tournament score, standings or prizes, stream logistics, jokes or personal talk unrelated to the position, and bare clock status that teaches nothing ("I have 30 seconds").
A sentence that mixes both is KEEP. DROP only what is clearly banter; when unsure, KEEP.
Reply JSON {"v":{"0":"KEEP","1":"DROP",...}}.`;

function sentences(text) {
  return String(text).replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

async function sort(batch) {
  const body = batch.map((s, i) => `${i}: ${s}`).join('\n');
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', temperature: 0, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: SYSTEM }, { role: 'user', content: body }] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const v = JSON.parse((await r.json()).choices[0].message.content).v ?? {};
      return batch.map((_, i) => v[String(i)] !== 'DROP');
    } catch (e) {
      if (a === 3) { console.log(`batch failed (${e.message}) — kept as is`); return batch.map(() => true); }
      await new Promise((res) => setTimeout(res, 2000 * (a + 1)));
    }
  }
  return batch.map(() => true);
}

const reportPath = `${OUT}/_report.json`;
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : {};

async function clean(f) {
  const vid = f.replace(/\.json$/, '');
  if (existsSync(`${OUT}/${f}`)) return;
  const bank = JSON.parse(readFileSync(`${BANK}/${f}`, 'utf8'));
  const all = [];
  bank.moves.forEach((m, idx) => sentences(m.said ?? '').forEach((s) => all.push({ idx, s })));
  const keep = [];
  for (let i = 0; i < all.length; i += 40) keep.push(...await sort(all.slice(i, i + 40).map((x) => x.s)));
  const kept = new Map();
  let wordsIn = 0; let wordsOut = 0; const dropped = [];
  all.forEach((x, i) => {
    const w = x.s.split(/\s+/).length; wordsIn += w;
    if (keep[i]) { wordsOut += w; kept.set(x.idx, [...(kept.get(x.idx) ?? []), x.s]); } else dropped.push(x.s);
  });
  const moves = bank.moves.map((m, idx) => ({ ...m, said: (kept.get(idx) ?? []).join(' ') }));
  writeFileSync(`${OUT}/${f}`, JSON.stringify({ ...bank, moves }));
  report[vid] = { sentences: all.length, dropped: dropped.length, wordsIn, wordsOut, droppedSample: dropped.slice(0, 12) };
  writeFileSync(reportPath, JSON.stringify(report));
  console.log(`${vid}: ${all.length} sentences, dropped ${dropped.length} (${wordsIn - wordsOut} of ${wordsIn} words)`);
}

const q = [...files];
await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) await clean(q.shift()); }));
const r = Object.values(report);
console.log(`DONE ${r.length} videos — dropped ${r.reduce((n, x) => n + x.dropped, 0)} of ${r.reduce((n, x) => n + x.sentences, 0)} sentences, ${r.reduce((n, x) => n + x.wordsIn - x.wordsOut, 0)} of ${r.reduce((n, x) => n + x.wordsIn, 0)} words`);
