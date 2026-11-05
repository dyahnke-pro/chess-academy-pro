// L1 of the Learn matrix (PLAN.md § PHASE 2 REDESIGN): tag HIS OWN WORDS, move
// by move, with the teaching moves he makes (taxonomy.md). The source is the
// bank of his transcripts aligned to the moves of each game — not our voiced
// notes, which are our rewrite (David 2026-11-04: "i want to make sure that
// the matrix is learning from his real games, not our truncated notes").
//
// The transcripts are REFERENCE ONLY (plagiarism guard): they stay outside the
// repo, and the file this writes carries only keys and codes — never a word of
// his.
//
//   DEEPSEEK_KEY=… BANK_DIR=<dir of {videoId, moves:[{ply, line, fen, said}]}>
//     node scripts/scoreboard/tag-bank.mjs [out.json]
//
// Keys are `${videoId}:${index in the bank's move list}` (a ply can come up
// twice: once in the game, once in his analysis after it).
// Resumable: keys already in the output are skipped; the file is saved every
// 20 jobs and a progress line printed.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { TEACHING_MOVE_LIST } from '../../src/services/teachingMoves.ts';

const BANK = process.env.BANK_DIR;
if (!BANK) { console.error('BANK_DIR is required'); process.exit(2); }
const OUT = process.argv[2] ?? 'scripts/scoreboard/his-bank-tags.json';
const KEY = (process.env.DEEPSEEK_KEY ?? process.env.VITE_DEEPSEEK_API_KEY ?? '').trim();
if (!KEY) { console.error('DEEPSEEK_KEY is required'); process.exit(2); }
const TAX = readFileSync(new URL('./taxonomy.md', import.meta.url), 'utf8');
// The codes are the one list in code (`teachingMoves.ts`, held to the
// taxonomy file by its test); the file gives the judge their definitions.
const CODES = new Set([...TEACHING_MOVE_LIST, 'X-NARRATION']);
const VOICED = 'data/video-narration-voiced';

const tags = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const jobs = [];
for (const f of readdirSync(BANK).filter((x) => x.endsWith('.json'))) {
  const bank = JSON.parse(readFileSync(`${BANK}/${f}`, 'utf8'));
  const vid = bank.videoId;
  const vf = `${VOICED}/${vid}.json`;
  const seat = existsSync(vf) ? JSON.parse(readFileSync(vf, 'utf8')).studentSide : null;
  if (seat !== 'white' && seat !== 'black') continue;
  const items = [];
  // The game first, then (in most videos) his analysis afterwards: the voiced
  // file marks the first move he re-anchors to an earlier board (`reanchor`,
  // its moves aligned one for one with the bank's). The live game is how he
  // thinks out loud while he plays (Learn); the analysis is his post-game
  // review (Review). A take-back inside the game is not a re-anchor.
  const voicedMoves = existsSync(vf) ? JSON.parse(readFileSync(vf, 'utf8')).moves : [];
  let segment = 'game';
  bank.moves.forEach((m, idx) => {
    if (voicedMoves[idx]?.reanchor) segment = 'analysis';
    const said = String(m.said ?? '').trim();
    const key = `${vid}:${idx}`;
    if (!said || tags[key]) return;
    const mover = m.ply % 2 === 1 ? 'white' : 'black';
    items.push({ key, ply: m.ply, segment, seat, mover: mover === seat ? 'his' : 'theirs', move: (m.line ?? []).slice(-1)[0] ?? '', said });
  });
  for (let i = 0; i < items.length; i += 25) jobs.push(items.slice(i, i + 25));
}
console.log(`jobs ${jobs.length} (${jobs.reduce((n, j) => n + j.length, 0)} moves), codes ${CODES.size}`);

const SYSTEM = `You label a chess coach's spoken words with the TEACHING MOVES he makes. The words are an automatic transcript of a grandmaster thinking out loud while he plays (messy, no punctuation, and words may bleed in from the moves either side).
Taxonomy:
${TAX}
For each numbered item give the 1-4 codes for the teaching moves the words actually MAKE (existing codes only; X-NARRATION when they teach nothing). Reply JSON {"tags":{"0":["CODE",...],...}}.`;

async function run(job) {
  const body = job.map((x, i) => `${i}: [the move just played: ${x.move}, by ${x.mover === 'his' ? 'him' : 'his opponent'}] ${x.said}`).join('\n');
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', temperature: 0, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: SYSTEM }, { role: 'user', content: body }] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = JSON.parse((await r.json()).choices[0].message.content).tags ?? {};
      job.forEach((x, i) => {
        const codes = (t[String(i)] ?? []).filter((c) => CODES.has(c));
        tags[x.key] = { ply: x.ply, segment: x.segment, seat: x.seat, mover: x.mover, move: x.move, codes: codes.length ? codes : ['X-NARRATION'] };
      });
      return;
    } catch (e) {
      if (a === 3) console.log(`fail ${job[0].key}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 2000 * (a + 1)));
    }
  }
}

let done = 0;
const q = [...jobs];
await Promise.all(Array.from({ length: 12 }, async () => {
  while (q.length) {
    await run(q.shift());
    if (++done % 20 === 0) { writeFileSync(OUT, JSON.stringify(tags)); console.log(`done ${done}/${jobs.length}`); }
  }
}));
writeFileSync(OUT, JSON.stringify(tags));
console.log(`total tagged ${Object.keys(tags).length}`);
