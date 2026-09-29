// Tag every line Learn spoke on the tape with the census taxonomy — the SAME
// classifier and prompt his lines went through, so both sides are measured alike.
//   DEEPSEEK_KEY=… node scripts/scoreboard/tag-ours.mjs <tape.json> <out.json>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [TAPE, OUT] = process.argv.slice(2);
const KEY = (process.env.DEEPSEEK_KEY ?? '').trim();
const TAX = readFileSync(new URL('./taxonomy.md', import.meta.url), 'utf8');
const tape = JSON.parse(readFileSync(TAPE, 'utf8'));
const tags = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const texts = [...new Set(Object.values(tape).flatMap((g) => Object.values(g.plies).flat()))].filter((t) => !tags[t]);
const jobs = []; for (let i = 0; i < texts.length; i += 30) jobs.push(texts.slice(i, i + 30));
console.log(`lines ${texts.length}, jobs ${jobs.length}`);
async function run(batch) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', temperature: 0, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: `Classify chess coaching lines. Taxonomy:\n${TAX}\nFor each numbered line give 1-3 codes (existing codes only; X-NARRATION if no teaching). Reply JSON {"tags":{"0":["CODE",...],...}}.` },
          { role: 'user', content: batch.map((t, i) => `${i}: ${t}`).join('\n') }] }) });
      const t = JSON.parse((await r.json()).choices[0].message.content).tags;
      batch.forEach((x, i) => { tags[x] = t[String(i)] ?? []; });
      return;
    } catch (e) { if (a === 2) console.log('fail', e.message); }
  }
}
const q = [...jobs];
await Promise.all(Array.from({ length: 12 }, async () => { while (q.length) await run(q.shift()); }));
writeFileSync(OUT, JSON.stringify(tags)); console.log(`tagged ${Object.keys(tags).length}`);
