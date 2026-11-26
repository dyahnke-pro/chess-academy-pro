#!/usr/bin/env node
// Wikibooks "Chess Opening Theory" -> data/sources/wikibooks/wikibooks-notes.json
// REFERENCE ONLY (training/measurement data, never spoken, never shipped):
// the idea sheets score what the theory narrator says against what a written
// opening page says at the same position. Public CC BY-SA pages; slow on purpose.
import { mkdirSync, writeFileSync } from 'node:fs';
const API = 'https://en.wikibooks.org/w/api.php';
const UA = 'chess-academy-research/1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(params, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${API}?${new URLSearchParams({ format: 'json', ...params })}`, { headers: { 'User-Agent': UA } });
    if (r.ok) return r.json();
    await sleep(5000 * (i + 1));
  }
  throw new Error('rate limited');
}
const titles = [];
let cont = {};
do {
  const d = await get({ action: 'query', list: 'allpages', apprefix: 'Chess Opening Theory/', aplimit: '500', ...cont });
  titles.push(...d.query.allpages.map((p) => p.title));
  cont = d.continue ?? null;
  await sleep(1500);
} while (cont);
console.error(`${titles.length} pages`);
const notes = [];
for (let i = 0; i < titles.length; i += 40) {
  const batch = titles.slice(i, i + 40);
  const d = await get({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|') });
  for (const p of Object.values(d.query.pages)) {
    const text = p.revisions?.[0]?.slots?.main?.['*'] ?? '';
    const last = p.title.split('/').slice(1);
    const sans = [];
    for (const seg of last) { const m = seg.match(/^\d+\.(?:\.\.)?\s*(\S+)$/); if (m) sans.push(m[1]); }
    notes.push({ title: p.title, lineSan: sans, text });
  }
  console.error(`${notes.length}/${titles.length}`);
  await sleep(2000);
}
mkdirSync('data/sources/wikibooks', { recursive: true });
writeFileSync('data/sources/wikibooks/wikibooks-notes.json', JSON.stringify(notes));
console.error('done');
