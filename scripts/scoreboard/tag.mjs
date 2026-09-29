// Offline measurement: tag each of Naroditsky's per-ply lines with census codes.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
const DIR = process.env.CENSUS_DIR ?? '/tmp/claude-0/g430', OUT = 'scripts/scoreboard/his-tags.json';
const KEY = (process.env.DEEPSEEK_KEY ?? '').trim();
const TAX = readFileSync(`${DIR}/_TAXONOMY.md`, 'utf8');
const only = process.argv[2] ? new Set(JSON.parse(readFileSync(process.argv[2], 'utf8'))) : null;
const tags = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const files = readdirSync(DIR).filter((f) => /^\d{3}-.*\.txt$/.test(f));
const jobs = [];
for (const f of files) {
  const vid = f.slice(4, -4);
  if (only && !only.has(vid)) continue;
  const lines = readFileSync(`${DIR}/${f}`, 'utf8').split('\n');
  const seat = /student black/.test(lines[0]) ? 'black' : 'white';
  const items = [];
  for (const l of lines.slice(1)) {
    const m = l.match(/^ply (\d+) \[[^\]]*\] (.+)$/); if (!m) continue;
    const key = `${vid}:${m[1]}`;
    if (!tags[key]) items.push({ key, ply: +m[1], text: m[2] });
  }
  for (let i = 0; i < items.length; i += 30) jobs.push({ vid, seat, items: items.slice(i, i + 30) });
}
console.log(`jobs ${jobs.length}`);
async function run(job) {
  const body = job.items.map((x, i) => `${i}: ${x.text}`).join('\n');
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', temperature: 0, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: `Classify chess coaching lines. Taxonomy:\n${TAX}\nFor each numbered line give 1-3 codes (existing codes only; X-NARRATION if no teaching). Reply JSON {"tags":{"0":["CODE",...],...}}.` },
          { role: 'user', content: body }] }) });
      const j = await r.json();
      const t = JSON.parse(j.choices[0].message.content).tags;
      job.items.forEach((x, i) => { tags[x.key] = { seat: job.seat, text: x.text, codes: t[String(i)] ?? [] }; });
      return;
    } catch (e) { if (a === 2) console.log('fail', job.vid, e.message); }
  }
}
let done = 0;
const q = [...jobs];
await Promise.all(Array.from({ length: 12 }, async () => { while (q.length) { await run(q.shift()); if (++done % 20 === 0) { writeFileSync(OUT, JSON.stringify(tags)); console.log(`done ${done}/${jobs.length}`); } } }));
writeFileSync(OUT, JSON.stringify(tags)); console.log(`total tagged ${Object.keys(tags).length}`);
